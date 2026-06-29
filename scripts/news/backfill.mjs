#!/usr/bin/env node
/**
 * ONE-TIME backfill — reconcile the orphaned backlog into stories.
 *
 * The pipeline switch (batch harvest+build → incremental ingest) left a large
 * set of already-gated, already-clustered on-topic items that never got built
 * into stories, because the new ingest only processes brand-new (ungated) URLs.
 * This walks the cached on-topic items, groups them by the cluster_key the old
 * harvest already assigned (NO re-clustering, no scraping, no AI gate), shapes
 * each cluster, and publishes the ones that clear the bar. Idempotent: stories
 * are upserted by cluster_key, so re-running just refreshes them.
 *
 * Run once after migrating, then rely on `news:ingest`. Follow with
 * `node scripts/news/consolidate.mjs` to merge any fragmented clusters.
 *
 *   node scripts/news/backfill.mjs [--dry-run]
 */

import { readFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

import { shapeStory, analyzeStories, PUBLISH_MIN_SCORE, GATE_MIN } from "./lib/evaluate.mjs";
import { getOnTopicItems, storeStories } from "./lib/store.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DRY = process.argv.includes("--dry-run");

const envPath = join(__dirname, "..", "..", ".env.local");
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, "utf-8").split("\n")) {
    const t = line.trim(); if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("="); if (i === -1) continue;
    const k = t.slice(0, i).trim(); if (!process.env[k]) process.env[k] = t.slice(i + 1).trim();
  }
}

async function main() {
  // 1. Group all cached on-topic items by the cluster_key already on them.
  const items = (await getOnTopicItems(GATE_MIN)).filter((it) => it.cluster_key);
  const groups = new Map();
  for (const it of items) {
    if (!groups.has(it.cluster_key)) groups.set(it.cluster_key, []);
    groups.get(it.cluster_key).push(it);
  }
  console.error(`Backfill: ${items.length} cached on-topic items in ${groups.size} clusters.`);

  // 2. Shape, then keep clusters that clear the value bar and aren't junk-only.
  const shaped = [...groups.values()].map((members) => shapeStory(members)).filter(Boolean);
  const toPublish = shaped
    .filter((s) => (s.score || 0) >= PUBLISH_MIN_SCORE && !s.spam_only)
    .sort((a, b) => b.importance - a.importance);
  const heldJunk = shaped.filter((s) => (s.score || 0) >= PUBLISH_MIN_SCORE && s.spam_only).length;
  console.error(`Shaped ${shaped.length} citable clusters; ${toPublish.length} publishable (${heldJunk} junk-only held, rest below score bar).`);

  if (DRY) {
    console.error("\n(dry run) top 30 that would publish:");
    for (const s of toPublish.slice(0, 30)) console.error(`  imp ${(s.importance || 0).toFixed(1)} [${s.lead_source}] ${s.headline.slice(0, 70)}`);
    return;
  }

  // 3. Interpret (headline/summary/tags) and upsert by cluster_key.
  const analyzed = await analyzeStories(toPublish);
  const newlyPublished = await storeStories({ published: analyzed, belowBar: [] });
  console.error(`\nBackfilled ${analyzed.length} stories (${newlyPublished.length} newly published).`);
  console.error("Now run `node scripts/news/consolidate.mjs` to merge any fragmented clusters.");
}

main().catch((e) => { console.error("FATAL", e); process.exit(1); });
