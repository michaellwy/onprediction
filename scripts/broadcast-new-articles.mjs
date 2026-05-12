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
  // Lowercase only the first character. Preserve internal capitals (names,
  // acronyms like UMA, LMSR, MetaDAO).
  if (s.length > 0) s = s[0].toLowerCase() + s.slice(1);
  return s;
}

function buildMessage(article) {
  const title = escapeHtml(article.title || "Untitled");
  const url = escapeHtml(article.url || "");
  const link = url
    ? `<a href="${url}">read it →</a>`
    : "";

  const sentences = splitSentences(article.editorial_blurb || "").slice(0, 3);
  const bullets = sentences.map((s) => `&gt; ${escapeHtml(toBulletLine(s))}`);

  const concepts = Array.isArray(article.concepts) ? article.concepts.slice(0, 3) : [];
  if (concepts.length > 0) {
    bullets.push(`&gt; tagged: ${escapeHtml(concepts.join(", "))}`);
  }

  let msg = `<b>${title}</b>`;
  if (link) msg += `\n${link}`;
  if (bullets.length > 0) msg += `\n\n${bullets.join("\n")}`;
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
