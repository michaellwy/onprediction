#!/usr/bin/env node
/**
 * Manually add ONE story to the news feed by URL — for on-topic stories the
 * Google News scrape surface misses (regional outlets, non-US coverage, e.g.
 * an RTHK story that never ranks in the US-relevance feed). The item runs
 * through the pipeline's own stages (article-text fetch → shape → analyze →
 * semantic dedup vs recent stories → publish → coverage enrichment), so the
 * resulting row is indistinguishable from an ingested one and future ingest
 * runs skip the URL.
 *
 *   node scripts/news/add-story.mjs <url> [--source "Outlet"] [--title "..."]
 *                                   [--date YYYY-MM-DD] [--dry-run]
 *
 * Running this IS the editorial decision, so the on-topic/taste gates do not
 * hold the story; the AI gate still runs to record an honest score, floored
 * at PUBLISH_MIN_SCORE so the story always publishes. If it matches a recent
 * story (same development), its coverage folds in instead of duplicating.
 * After a successful add, re-run `node scripts/generate-news-seed.js`.
 */

import { readFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = join(__dirname, "..", "..", ".env.local");
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, "utf-8").split("\n")) {
    const t = line.trim(); if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("="); if (i === -1) continue;
    const k = t.slice(0, i).trim(); if (!process.env[k]) process.env[k] = t.slice(i + 1).trim();
  }
}

const { djb2, hostOf } = await import("./lib/google-news.mjs");
const { fetchArticleText } = await import("./lib/article-text.mjs");
const {
  gateScoreAll, shapeStory, analyzeStories, makeClusterKey,
  findDuplicateStory, updateStoryText, PUBLISH_MIN_SCORE,
} = await import("./lib/evaluate.mjs");
const {
  upsertRawItems, setGateResults, setArticleText, markSeen, filterUnseen,
  getRecentStoriesForDedup, attachCoverage, storeStories,
} = await import("./lib/store.mjs");
const { enrichStory } = await import("./lib/enrich.mjs");

const args = process.argv.slice(2);
const DRY = args.includes("--dry-run");
const flag = (name) => { const i = args.indexOf(name); return i !== -1 ? args[i + 1] : null; };
const url = args.find((a) => /^https?:\/\//.test(a));
if (!url) { console.error("Usage: node scripts/news/add-story.mjs <url> [--source \"Outlet\"] [--title \"...\"] [--date YYYY-MM-DD] [--dry-run]"); process.exit(1); }

// Same cheap token-overlap shortlist ingest.mjs uses before the LLM same-event check.
function sigTokens(s) {
  return new Set((`${s.headline} ${s.summary || ""}`.toLowerCase().match(/[a-z0-9$]{4,}/g) || []));
}
function dedupShortlist(story, recent, { min = 3, cap = 8 } = {}) {
  const a = sigTokens(story);
  const plats = new Set((story.platforms || []).map((p) => p.toLowerCase()));
  return recent
    .map((c) => {
      const b = sigTokens(c);
      let overlap = 0;
      for (const t of a) if (b.has(t)) overlap++;
      const platShare = (c.platforms || []).some((p) => plats.has(p.toLowerCase()));
      return { c, score: overlap + (platShare ? 2 : 0) };
    })
    .filter((x) => x.score >= min)
    .sort((a, b) => b.score - a.score)
    .slice(0, cap)
    .map((x) => x.c);
}

async function main() {
  console.error(`=== Manual add: ${url} ===`);
  const unseen = await filterUnseen([{ url }]);
  if (!unseen.length) console.error("  note: URL already in news_seen (was scraped before) — continuing anyway.");

  // 1. Fetch the article itself: text, canonical title, byline date.
  const page = await fetchArticleText(url);
  const resolved = page.url || url;
  const title = flag("--title") || page.title;
  if (!title) { console.error("Could not extract a title from the page — pass --title."); process.exit(1); }
  const publishedIso = page.published
    ? new Date(page.published).toISOString()
    : (flag("--date") ? `${flag("--date")}T12:00:00Z` : null);
  if (!publishedIso) { console.error("No publish date on the page — pass --date YYYY-MM-DD (the feed never fabricates 'today')."); process.exit(1); }
  console.error(`  title: ${title}`);
  console.error(`  date: ${publishedIso}  text: ${page.text ? `${page.text.length} chars` : "NONE"}`);

  const hash = djb2(url);
  const item = {
    id: hash, url_hash: hash, url, resolved_url: resolved,
    title,
    source: flag("--source") || hostOf(resolved),
    source_type: "press",
    published_at: publishedIso,
    broke_day: publishedIso.slice(0, 10),
    article_text: page.text || "",
  };

  // 2. Honest score from the real gate; the verdict never blocks a manual add.
  const [gated] = await gateScoreAll([item]);
  item.score = Math.max(gated.gate_score || 0, PUBLISH_MIN_SCORE);
  if (!gated.on_topic) console.error(`  note: gate says off-topic (score ${gated.gate_score}) — publishing anyway (manual override).`);

  // 3. Shape + interpret with the pipeline's own stages.
  item.cluster_key = makeClusterKey(title, resolved);
  const shaped = shapeStory([item]);
  if (!shaped) { console.error("shapeStory returned null — no citable source."); process.exit(1); }
  const [story] = await analyzeStories([shaped]);
  console.error(`  headline: ${story.headline}`);
  console.error(`  category: ${story.primary_category}  score: ${story.score}  tags: ${(story.tags || []).join(", ")}`);

  if (DRY) { console.log(JSON.stringify(story, null, 2)); console.error("Dry run — nothing written."); return; }

  // 4. Cache the raw item + gate verdict + seen mark so ingest never reprocesses it.
  await upsertRawItems([item]);
  await setGateResults([{ url_hash: hash, on_topic: true, gate_score: item.score }]);
  await setArticleText(hash, resolved, item.article_text);
  await markSeen([item]);

  // 5. Same-development check against recent stories — fold rather than duplicate.
  const recent = await getRecentStoriesForDedup(10);
  const shortlist = dedupShortlist(story, recent);
  const idx = shortlist.length ? await findDuplicateStory(story, shortlist) : -1;
  if (idx >= 0) {
    const match = shortlist[idx];
    let upd = { changed: false };
    try { upd = await updateStoryText(match, [`${story.headline}. ${story.summary || ""}`]); }
    catch (e) { console.error(`  fold update-check failed: ${e.message}`); }
    await attachCoverage(match, story.sources, upd);
    console.error(`Folded into existing ${match.status} story "${match.headline}"${upd.changed ? " [re-headlined]" : ""}.`);
    return;
  }

  // 6. Publish, then best-effort coverage enrichment (extra outlets, better lead).
  const [published] = await storeStories({ published: [story], belowBar: [] });
  if (!published) { console.error("Story already existed for this cluster_key — updated in place."); return; }
  try {
    const r = await enrichStory(published, { apply: true });
    if (r.added) console.error(`  enriched: +${r.added} outlet(s)${r.promote ? `, lead → ${r.promote}` : ""}${r.changed ? " [re-headlined]" : ""}`);
  } catch (e) { console.error(`  enrich failed: ${e.message}`); }
  console.error(`Published "${published.headline}" (${published.slug}).`);
  console.error("Now run: node scripts/generate-news-seed.js");
}

main().catch((e) => { console.error("FATAL", e); process.exit(1); });
