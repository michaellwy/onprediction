#!/usr/bin/env node

/**
 * Extract a punchy 8-14 word pull quote per article for use in social share
 * cards. Reads articles_database.json, asks DeepSeek to compose a zinger from
 * title + blurb + concepts, writes the result back as `share_quote`.
 *
 * Idempotent: skips any article that already has `share_quote` set, unless
 * --force is passed.
 *
 * Usage:
 *   node scripts/extract-share-quotes.mjs            # incremental
 *   node scripts/extract-share-quotes.mjs --force    # regenerate all
 *   node scripts/extract-share-quotes.mjs --id 187   # one article
 */

import { readFileSync, writeFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, "..");

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

const FORCE = process.argv.includes("--force");
const idArg = process.argv.indexOf("--id");
const ONLY_ID = idArg !== -1 ? Number(process.argv[idArg + 1]) : null;

const SYSTEM_PROMPT = `You compose punchy pull-quote lines for social share cards. Given an article's title, editorial summary, and concepts, produce a single sentence (8 to 14 words) that captures the sharpest claim or tension in the piece.

Rules:
- One sentence only. No quotation marks around it.
- Active voice, plain words. Match a smart, curator voice.
- No filler: drop "this article", "the author argues", "the piece explores".
- Don't restate the title.
- No em dashes. No semicolons.
- Lowercase the first word unless it's a proper noun.
- Avoid AI-tells: "robust", "showcase", "delve", "tapestry", "underscore".
- Output the sentence and nothing else. No preamble, no labels, no explanation.`;

async function composeQuote(article) {
  const userPrompt = `Title: ${article.title}
Author: ${article.author || "unknown"}
Source: ${article.source_type || "article"}
Concepts: ${(article.concepts || []).join(", ")}

Editorial summary:
${article.editorial_blurb || ""}`;

  const response = await fetch("https://api.deepseek.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.DEEPSEEK_API_KEY}`
    },
    body: JSON.stringify({
      model: "deepseek-chat",
      max_tokens: 80,
      temperature: 0.4,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userPrompt }
      ]
    })
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`DeepSeek ${response.status}: ${err}`);
  }
  const data = await response.json();
  let quote = (data.choices?.[0]?.message?.content || "").trim();
  // Strip surrounding quotes if the model adds them.
  quote = quote.replace(/^["'"“]+/, "").replace(/["'"”]+$/, "");
  // Replace em/en dashes with a period or comma depending on context.
  // Prefer period if surrounding text looks like two clauses, else a comma.
  quote = quote.replace(/\s*[—–]\s*/g, ". ");
  // Collapse the rare "X. they" case where the period is mid-thought — turn into ", "
  quote = quote.replace(/\.\s+([a-z])/g, ", $1");
  // Strip trailing period (cards look cleaner without).
  quote = quote.replace(/[.,]+$/, "");
  // Collapse double spaces.
  quote = quote.replace(/\s{2,}/g, " ").trim();
  return quote;
}

async function main() {
  const dbPath = join(repoRoot, "articles_database.json");
  const articles = JSON.parse(readFileSync(dbPath, "utf-8"));

  let updated = 0;
  let skipped = 0;
  let failed = 0;

  for (let i = 0; i < articles.length; i++) {
    const a = articles[i];
    if (ONLY_ID != null && a.id !== ONLY_ID) continue;
    if (!FORCE && a.share_quote) {
      skipped += 1;
      continue;
    }
    try {
      const quote = await composeQuote(a);
      if (!quote) throw new Error("empty response");
      a.share_quote = quote;
      updated += 1;
      console.log(`[${a.id}] ${quote}`);
      // Persist progress every 10 articles so a crash doesn't lose all work.
      if (updated % 10 === 0) {
        writeFileSync(dbPath, JSON.stringify(articles, null, 2));
      }
    } catch (e) {
      failed += 1;
      console.error(`[${a.id}] FAILED:`, e.message);
    }
  }

  writeFileSync(dbPath, JSON.stringify(articles, null, 2));
  console.log(`\nDone. updated=${updated} skipped=${skipped} failed=${failed}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
