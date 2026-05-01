#!/usr/bin/env node

/**
 * Standalone Twitter browser scout — run by launchd.
 * Fetches tweets via agent-browser, AI-ranks them, sends a mini-digest to Telegram.
 * Designed to complement the GitHub Actions daily scout (which handles RSS/HN/arXiv).
 */

import { readFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

import { fetchTwitterBrowser } from "./lib/sources/twitter-browser.mjs";
import { rankCandidates } from "./lib/ai-ranker.mjs";
import { sendDigest } from "./lib/telegram.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));

// --- Load .env.local ---
const envPath = join(__dirname, "..", "..", ".env.local");
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

const config = JSON.parse(readFileSync(join(__dirname, "config.json"), "utf-8"));

async function main() {
  const startTime = Date.now();
  console.log(`Twitter scout starting (${new Date().toISOString()})...`);

  const items = await fetchTwitterBrowser();
  console.log(`Twitter browser: ${items.length} items`);

  if (items.length === 0) {
    console.log("No tweets found. Exiting.");
    return;
  }

  console.log(`Ranking with AI...`);
  const { topPicks, nearMisses } = await rankCandidates(items, config.ai_ranking);
  console.log(`AI-ranked: ${topPicks.length} above threshold, ${nearMisses.length} near-misses`);

  const stats = {
    sources: { twitter_browser: { raw: items.length, filtered: items.length } },
    total_raw: items.length,
    total_filtered: items.length,
    results: topPicks.length,
    near_misses: nearMisses.map(m => ({
      title: m.title || m.text?.slice(0, 80) || "Untitled",
      url: m.url,
      score: m.score,
      skip_reason: m.skip_reason
    })),
    lookbackHours: config.sources?.twitter_browser?.lookback_hours || 24,
    duration_sec: ((Date.now() - startTime) / 1000).toFixed(1)
  };

  if (topPicks.length > 0) {
    console.log(`Sending to Telegram...`);
    await sendDigest(topPicks, stats);
    console.log(`Telegram sent!`);
  } else {
    console.log(`No results above threshold.`);
    // Still send a "nothing found" message
    try {
      const token = process.env.TELEGRAM_BOT_TOKEN;
      const chatId = process.env.TELEGRAM_CHAT_ID;
      if (token && chatId) {
        await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: chatId,
            text: `Twitter scout: scanned ${items.length} tweets, none met quality threshold.`
          })
        });
      }
    } catch (_) {}
  }

  console.log(`Done in ${stats.duration_sec}s.`);
}

main().catch(async (err) => {
  console.error("Twitter scout failed:", err);
  try {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;
    if (token && chatId) {
      await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          text: `Twitter scout failed: ${err.message}`
        })
      });
    }
  } catch (_) {}
  process.exit(1);
});
