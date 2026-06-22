#!/usr/bin/env node

/**
 * Broadcast newly-added articles to the public Telegram channel.
 *
 * Diffs articles_database.json against HEAD~1, finds new IDs, and posts one
 * Telegram message per new article. Triggered by GitHub Actions on push to main.
 *
 * Local dry-run: `node scripts/broadcast-new-articles.mjs --dry-run`
 */

import { readFileSync, existsSync } from "fs";
import { execSync } from "child_process";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

import { sendTelegramMessage, escapeHtml } from "./scanner/lib/telegram.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, "..");

// Load .env.local for local dry-run; in CI env vars come from the workflow.
const envPath = join(repoRoot, ".env.local");
if (existsSync(envPath)) {
  const envContent = readFileSync(envPath, "utf-8");
  for (const line of envContent.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    const val = trimmed.slice(eqIdx + 1).trim();
    if (!process.env[key]) process.env[key] = val;
  }
}

const DRY_RUN = process.argv.includes("--dry-run");

function loadCurrent() {
  const content = readFileSync(join(repoRoot, "articles_database.json"), "utf-8");
  return JSON.parse(content);
}

function loadPrevious() {
  try {
    const content = execSync("git show HEAD~1:articles_database.json", {
      cwd: repoRoot,
      encoding: "utf-8",
      maxBuffer: 32 * 1024 * 1024
    });
    return JSON.parse(content);
  } catch (e) {
    console.warn("Could not read HEAD~1 articles_database.json — treating as empty.");
    return [];
  }
}

function findNewArticles(current, previous) {
  const prevIds = new Set(previous.map((a) => a.id));
  return current.filter((a) => !prevIds.has(a.id));
}

function splitSentences(text) {
  if (!text) return [];
  // Split on . ! ? followed by space or end. Keep it simple — blurbs are short.
  return text
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function toBulletLine(sentence) {
  let s = sentence.trim();
  // Strip trailing punctuation.
  s = s.replace(/[.!?]+$/, "");
  // Don't lowercase the first character — the &gt; prefix already signals
  // continuation, and lowercasing can mangle proper nouns like "Terry Lee".
  return s;
}

function buildMessage(article) {
  const title = escapeHtml(article.title || "Untitled");
  const pageUrl = `https://onprediction.xyz/articles/${article.id}`;
  const link = `<a href="${escapeHtml(pageUrl)}">read it →</a>`;

  const sentences = splitSentences(article.editorial_blurb || "").slice(0, 4);
  const bullets = sentences.map((s) => `&gt; ${escapeHtml(toBulletLine(s))}`);

  let msg = `<b>${title}</b>`;
  msg += `\n${link}`;
  if (bullets.length > 0) msg += `\n\n${bullets.join("\n\n")}`;
  msg += `\n\n<i>more on <a href="https://onprediction.xyz">onprediction.xyz</a></i>`;
  return msg;
}

async function main() {
  const current = loadCurrent();
  const previous = loadPrevious();
  const newArticles = findNewArticles(current, previous);

  if (newArticles.length === 0) {
    console.log("No new articles. Nothing to broadcast.");
    return;
  }

  console.log(`Found ${newArticles.length} new article(s): ${newArticles.map((a) => a.id).join(", ")}`);

  // Wait for Vercel deployment so the onprediction.xyz link doesn't 404
  const vercelToken = process.env.VERCEL_TOKEN;
  if (vercelToken) {
    const sha = process.env.GITHUB_SHA;
    if (!sha) {
      console.log("GITHUB_SHA not set — skipping Vercel deployment check");
    } else {
      console.log(`Waiting for Vercel deployment of commit ${sha} to be READY...`);
      const timeout = Date.now() + 180_000; // 3 minutes
      while (Date.now() < timeout) {
        try {
          const res = await fetch(
            `https://api.vercel.com/v1/deployments?project=onprediction&limit=10`,
            { headers: { Authorization: `Bearer ${vercelToken}` } }
          );
          const data = await res.json();
          const match = data.deployments?.find(
            (d) => d.meta?.githubCommitSha === sha && d.state === "READY"
          );
          if (match) {
            console.log(`Deployment ready at https://${match.url}`);
            break;
          }
        } catch (e) {
          console.log(`Vercel API call failed: ${e.message} — retrying...`);
        }
        console.log("Not ready yet, waiting 10s...");
        await new Promise((r) => setTimeout(r, 10_000));
      }
      // If we exit the loop without breaking, deployment isn't ready — proceed anyway
      // (better to send a potentially-broken link than miss broadcasting entirely)
    }
  }

  const chatId = process.env.TELEGRAM_BROADCAST_CHAT_ID;
  const botToken = process.env.TELEGRAM_BOT_TOKEN;

  if (!DRY_RUN && (!chatId || !botToken)) {
    console.error("TELEGRAM_BROADCAST_CHAT_ID or TELEGRAM_BOT_TOKEN missing.");
    process.exit(1);
  }

  let failures = 0;
  for (const article of newArticles) {
    const msg = buildMessage(article);
    if (DRY_RUN) {
      console.log("\n--- DRY RUN ---");
      console.log(msg);
      console.log("--- end ---\n");
      continue;
    }
    try {
      await sendTelegramMessage(msg, { chatId, botToken });
      console.log(`Posted article ${article.id}: ${article.title}`);
    } catch (e) {
      failures += 1;
      console.error(`Failed to post article ${article.id}:`, e.message);
    }
  }

  if (failures > 0) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
