#!/usr/bin/env node
/**
 * STAGE 1 — Harvest (expensive; run occasionally).
 * Scrapes sources, gates, decodes Google URLs + fetches article text, and
 * clusters — all persisted to news_raw_items. Incremental: only NEW items are
 * gated, only on-topic items missing text are fetched. The cheap interpretation
 * layer (news:build) reads this cache; tuning wording never re-runs this.
 *
 *   node scripts/news/harvest.mjs [--since 2026-06-01]   (default: last 2 days)
 */

import { readFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

import { fetchGoogleNews, fetchGoogleNewsRange, hostOf } from "./lib/google-news.mjs";
import { fetchFederalRegister, fetchCFTC, fetchCommentaryFeeds } from "./lib/extra-sources.mjs";
import { gateScoreAll, clusterItems, GATE_MIN } from "./lib/evaluate.mjs";
import { preGateFilter } from "./lib/heuristic-filter.mjs";
import { fetchArticleText, mapPool } from "./lib/article-text.mjs";
import {
  upsertRawItems, getAllRawItems, getOnTopicRawItems, getUngatedRawItems, setGateResults,
  getOnTopicNeedingText, setArticleText, getOnTopicItems, setClusterKeys,
} from "./lib/store.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const sinceIdx = args.indexOf("--since");
const SINCE = sinceIdx !== -1 ? args[sinceIdx + 1] : null;

const envPath = join(__dirname, "..", "..", ".env.local");
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, "utf-8").split("\n")) {
    const t = line.trim(); if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("="); if (i === -1) continue;
    const k = t.slice(0, i).trim(); if (!process.env[k]) process.env[k] = t.slice(i + 1).trim();
  }
}

const todayYmd = new Date().toISOString().slice(0, 10);

function dedupeByUrl(items) {
  const seen = new Set(); const out = [];
  for (const it of items) {
    const key = hostOf(it.url) + "|" + it.title.toLowerCase().slice(0, 55);
    if (seen.has(it.url) || seen.has(key)) continue;
    seen.add(it.url); seen.add(key); out.push(it);
  }
  return out;
}

async function main() {
  const RECLUSTER = process.argv.includes("--recluster");
  const REGATE_ALL = process.argv.includes("--regate-all");
  const REGATE = process.argv.includes("--regate") && !REGATE_ALL;
  const mode = RECLUSTER ? "RE-CLUSTER only" : REGATE_ALL ? "FULL RE-GATE" : REGATE ? "RE-GATE on-topic" : SINCE ? `${SINCE} → ${todayYmd}` : "last 2 days";
  console.error(`=== Harvest (${mode}) ===`);

  if (RECLUSTER) {
    // Skip scrape/gate/fetch — just re-cluster the cached on-topic items.
  } else if (REGATE_ALL) {
    // Reconsider ALL items (use when gate INCLUDE rules broaden).
    const all = await getAllRawItems();
    console.error(`Full re-gate of ${all.length} cached items...`);
    const gated = await gateScoreAll(all);
    await setGateResults(gated.map((g) => ({ url_hash: g.url_hash, on_topic: g.on_topic, gate_score: g.gate_score })));
  } else if (REGATE) {
    // Re-gate only currently on-topic items (a stricter gate can only demote;
    // already-rejected items stay rejected, so skip them). No scrape, no re-fetch.
    const candidates = await getOnTopicRawItems();
    console.error(`Re-gating ${candidates.length} on-topic items with the current gate...`);
    const gated = await gateScoreAll(candidates);
    await setGateResults(gated.map((g) => ({ url_hash: g.url_hash, on_topic: g.on_topic, gate_score: g.gate_score })));
  } else {
    // 1. Scrape
    const rangeDays = SINCE ? Math.round((Date.parse(todayYmd) - Date.parse(SINCE)) / 864e5) + 1 : 7;
    const [google, fedReg, cftc, commentary] = await Promise.all([
      SINCE ? fetchGoogleNewsRange(SINCE, todayYmd) : fetchGoogleNews(2),
      fetchFederalRegister(rangeDays),
      fetchCFTC(rangeDays),
      fetchCommentaryFeeds(rangeDays),
    ]);
    const scraped = dedupeByUrl([...google, ...fedReg, ...cftc, ...commentary]);
    const { kept: items, dropped } = preGateFilter(scraped);
    console.error(`Scraped ${scraped.length} unique items (google:${google.length} fedreg:${fedReg.length} cftc:${cftc.length} commentary:${commentary.length})`);
    console.error(`Pre-gate filter dropped ${dropped.length} spam items; ${items.length} sent on to the gate.`);
    await upsertRawItems(items);

    // 2. Gate only NEW (ungated) items
    const ungated = await getUngatedRawItems();
    console.error(`Gating ${ungated.length} new items...`);
    if (ungated.length) {
      const gated = await gateScoreAll(ungated);
      await setGateResults(gated.map((g) => ({ url_hash: g.url_hash, on_topic: g.on_topic, gate_score: g.gate_score })));
    }
  }

  // 3. Fetch article text for on-topic items still missing it
  const needText = await getOnTopicNeedingText(GATE_MIN);
  console.error(`Fetching article text for ${needText.length} items...`);
  let got = 0;
  await mapPool(needText, 6, async (it) => {
    const { url, text } = await fetchArticleText(it.url);
    await setArticleText(it.url_hash, url, text);
    if (text) got++;
  });
  console.error(`  got text for ${got}/${needText.length}`);

  // 4. Cluster all on-topic items, persist cluster_key
  const onTopic = await getOnTopicItems(GATE_MIN);
  console.error(`Clustering ${onTopic.length} on-topic items...`);
  const clusters = await clusterItems(onTopic);
  const updates = [];
  for (const c of clusters) for (const m of c.members) updates.push({ url_hash: m.url_hash, cluster_key: c.cluster_key });
  await setClusterKeys(updates);
  console.error(`Harvest done: ${clusters.length} clusters across ${updates.length} items. Run \`npm run news:build\` to publish.`);
}

main().catch((e) => { console.error("FATAL", e); process.exit(1); });
