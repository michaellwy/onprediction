#!/usr/bin/env node
/**
 * STAGE 2 — Build (cheap; re-run freely).
 * Reads the cached raw items (news_raw_items) and runs ONLY the interpretation
 * layer: shape clusters into stories, rewrite headlines + bullets + tags, and
 * rebuild news_stories. No scraping, no URL decoding, no article fetching, no
 * re-gating. This is what you re-run when tuning wording/tone.
 *
 *   node scripts/news/build.mjs [--broadcast] [--deploy]
 */

import { readFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

import { shapeStory, analyzeStories, PUBLISH_MIN_SCORE, GATE_MIN } from "./lib/evaluate.mjs";
import { getOnTopicItems, resetStories, storeStories, setArticleText } from "./lib/store.mjs";
import { hostOf } from "./lib/google-news.mjs";
import { fetchArticleText, mapPool } from "./lib/article-text.mjs";
import { sendTelegramMessage, escapeHtml } from "../scanner/lib/telegram.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const BROADCAST = args.includes("--broadcast");
const DEPLOY = args.includes("--deploy");

const envPath = join(__dirname, "..", "..", ".env.local");
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, "utf-8").split("\n")) {
    const t = line.trim(); if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("="); if (i === -1) continue;
    const k = t.slice(0, i).trim(); if (!process.env[k]) process.env[k] = t.slice(i + 1).trim();
  }
}

function buildDigest(stories) {
  const lines = ["<b>📊 Prediction Market News</b>", ""];
  for (const s of stories) {
    lines.push(`<b>${escapeHtml(s.headline)}</b>`);
    for (const b of (s.summary || "").split("\n").filter(Boolean)) lines.push(`• ${escapeHtml(b)}`);
    lines.push(`<a href="${s.lead_url}">${escapeHtml(s.lead_source || hostOf(s.lead_url))}</a>`);
    lines.push("");
  }
  lines.push("<i>more on onprediction.xyz/news</i>");
  return lines.join("\n");
}

async function main() {
  // 1. Group cached on-topic items by cluster_key
  const items = (await getOnTopicItems(GATE_MIN)).filter((it) => it.cluster_key);
  const groups = new Map();
  for (const it of items) {
    if (!groups.has(it.cluster_key)) groups.set(it.cluster_key, []);
    groups.get(it.cluster_key).push(it);
  }
  console.error(`Read ${items.length} cached items in ${groups.size} clusters`);

  // 2. Shape (drops clusters with no citable source) + filter to the publish bar
  const stories = [...groups.values()].map((members) => shapeStory(members)).filter(Boolean);
  const toPublish = stories.filter((s) => (s.score || 0) >= PUBLISH_MIN_SCORE).sort((a, b) => b.importance - a.importance);
  console.error(`Shaped ${stories.length} citable stories; publishing ${toPublish.length} (score>=${PUBLISH_MIN_SCORE})`);

  // 2b. Self-heal: fetch article text for any publishable story still missing it,
  // so the summary is never an "excerpt unavailable" excuse. Cache it back.
  const missing = toPublish.filter((s) => !s.article_text);
  if (missing.length) {
    console.error(`Fetching missing article text for ${missing.length} stories...`);
    let got = 0;
    await mapPool(missing, 6, async (s) => {
      const { url, text } = await fetchArticleText(s.lead_url);
      if (text) {
        s.article_text = text;
        if (url) s.lead_url = url;
        if (s.lead_url_hash) await setArticleText(s.lead_url_hash, url, text);
        got++;
      }
    });
    console.error(`  recovered text for ${got}/${missing.length}`);
  }

  // 3. Interpretation layer (uses cached article_text)
  const analyzed = await analyzeStories(toPublish);

  // 4. Rebuild the derived stories table
  await resetStories();
  await storeStories({ published: analyzed, belowBar: [] });
  console.error(`Built ${analyzed.length} stories.`);

  // 5. Optional: broadcast today's new stories
  if (BROADCAST) {
    const today = new Date().toISOString().slice(0, 10);
    const fresh = analyzed.filter((s) => s.broke_on === today);
    if (fresh.length && process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_BROADCAST_CHAT_ID) {
      try {
        await sendTelegramMessage(buildDigest(fresh.slice(0, 8)), {
          chatId: process.env.TELEGRAM_BROADCAST_CHAT_ID, botToken: process.env.TELEGRAM_BOT_TOKEN,
        });
        console.error(`Broadcast ${fresh.length} today's stories.`);
      } catch (e) { console.error(`Telegram failed: ${e.message}`); }
    }
  }

  // 6. Optional: refresh the static snapshot
  if (DEPLOY && process.env.VERCEL_DEPLOY_HOOK_URL) {
    try { await fetch(process.env.VERCEL_DEPLOY_HOOK_URL, { method: "POST" }); console.error("Deploy hook pinged."); }
    catch (e) { console.error(`Deploy hook failed: ${e.message}`); }
  }
}

main().catch((e) => { console.error("FATAL", e); process.exit(1); });
