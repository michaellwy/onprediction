#!/usr/bin/env node
/**
 * One-shot duplicate consolidation for the news feed.
 *
 * The backfill seeded weeks of history in one batch, so a single ongoing story
 * (e.g. "Meta builds a prediction-market app") fragmented across many clusters.
 * Steady-state runs only add ~10-20 items so this rarely happens live — but when
 * it does, this collapses it. It dedups on the CLEAN rewritten headlines (much
 * easier than the raw source titles), keeps the highest-importance story in each
 * group, folds the others' sources into it, and deletes the rest.
 *
 *   node scripts/news/consolidate.mjs            (apply)
 *   node scripts/news/consolidate.mjs --dry-run  (show groups, change nothing)
 */

import { readFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { createClient } from "@supabase/supabase-js";
import { callDeepSeek, parseJsonArray } from "./lib/deepseek.mjs";

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

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

const DEDUP_SYS = `You are given prediction-market news headlines, each with an index. Group ONLY the ones that report the SAME underlying development — the same single announcement, deal, launch, lawsuit, funding round, hack, ruling or report — even when worded differently or reported on different days.

Be STRICT. The same company doing DIFFERENT things is DIFFERENT stories. Surface-similar wording is NOT enough — the EVENT must be the same.

DO NOT GROUP (these are separate, even though they share a company/person):
- "Kalshi added India to restricted jurisdictions" vs "Kalshi added agricultural contracts" — different actions
- "Mansour downplayed Polymarket" vs "Mansour donated to a congressman" — different events
- "Kalshi integrated StarCompliance" vs "Kalshi integrated Anthropic's Claude" — different partners/products
- a platform's UMA settlement dispute vs an unrelated "traders give X a 64% chance" odds line
- two different lawsuits, a funding round vs an IPO report, a hack vs a regulatory probe, a product launch vs a separate partnership

When in doubt, do NOT group. Only merge headlines you are confident describe the exact same event.

Return ONLY a JSON array of groups, each an array of indices that are the same story, e.g. [[0,4,9],[2,7]]. Include a group ONLY if it has 2+ members (drop singletons). Every index appears in at most one group.`;

async function main() {
  // Pull all published stories, richest first so the keeper is the top one.
  const { data: stories, error } = await sb
    .from("news_stories").select("id,headline,importance,score,outlet_count")
    .eq("status", "published").order("importance", { ascending: false });
  if (error) throw new Error(error.message);
  console.error(`Loaded ${stories.length} published stories.`);

  // Sort by headline so same-entity variants land in the same batch.
  const sorted = [...stories].sort((a, b) => a.headline.localeCompare(b.headline));

  // LLM dedup in batches (clean headlines → reliable grouping).
  const groups = []; // each: array of story objects
  const BATCH = 120;
  for (let off = 0; off < sorted.length; off += BATCH) {
    const batch = sorted.slice(off, off + BATCH);
    const list = batch.map((s, i) => `${i}. ${s.headline}`).join("\n");
    try {
      for (const g of parseJsonArray(await callDeepSeek(DEDUP_SYS, `Headlines:\n${list}`, { maxTokens: 4096 }))) {
        const members = (Array.isArray(g) ? g : []).map((i) => batch[i]).filter(Boolean);
        if (members.length >= 2) groups.push(members);
      }
    } catch (e) { console.error(`  batch ${off} failed: ${e.message}`); }
    console.error(`  scanned ${Math.min(off + BATCH, sorted.length)}/${sorted.length}`);
  }

  console.error(`\nFound ${groups.length} duplicate groups (${groups.reduce((n, g) => n + g.length - 1, 0)} stories to fold).`);
  for (const g of groups) {
    const [keep, ...drop] = g.slice().sort((a, b) => (b.importance || 0) - (a.importance || 0));
    console.error(`\n  KEEP  [imp ${(keep.importance || 0).toFixed(1)}] ${keep.headline}`);
    for (const d of drop) console.error(`  fold  ${d.headline}`);
  }

  if (DRY) { console.error("\n(dry run — no changes)"); return; }
  if (!groups.length) { console.error("Nothing to consolidate."); return; }

  let folded = 0;
  for (const g of groups) {
    const [keep, ...drop] = g.slice().sort((a, b) => (b.importance || 0) - (a.importance || 0));
    const dropIds = drop.map((d) => d.id);

    // Gather every source across the group, dedup by url, re-home on the keeper.
    const { data: srcs } = await sb.from("news_story_sources").select("outlet,url,title,published_at").in("story_id", [keep.id, ...dropIds]);
    const seen = new Set();
    const merged = (srcs || []).filter((s) => (seen.has(s.url) ? false : seen.add(s.url)));

    await sb.from("news_story_sources").delete().in("story_id", [keep.id, ...dropIds]);
    await sb.from("news_story_sources").upsert(merged.map((s) => ({ story_id: keep.id, outlet: s.outlet, url: s.url, title: s.title ?? null, published_at: s.published_at })), { onConflict: "story_id,url", ignoreDuplicates: true });
    await sb.from("news_stories").delete().in("id", dropIds);
    await sb.from("news_stories").update({ outlet_count: merged.length }).eq("id", keep.id);
    folded += dropIds.length;
  }
  console.error(`\nConsolidated: folded ${folded} stories into ${groups.length} keepers. Run \`node scripts/generate-news-seed.js\` to refresh the snapshot.`);
}

main().catch((e) => { console.error("FATAL", e); process.exit(1); });
