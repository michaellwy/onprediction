#!/usr/bin/env node
/**
 * Enrich published stories with additional outlet coverage (see lib/enrich.mjs).
 *
 *   node scripts/news/enrich-coverage.mjs                 # dry-run, most recent 20
 *   node scripts/news/enrich-coverage.mjs --apply         # commit changes
 *   node scripts/news/enrich-coverage.mjs --limit 50      # widen the window
 *   node scripts/news/enrich-coverage.mjs --id <uuid>     # one story
 *   node scripts/news/enrich-coverage.mjs --thin --apply  # only single-source / denylisted-lead stories
 *
 * Dry-run prints the planned additions (new outlets, promoted lead, re-headline)
 * without writing. --apply commits, then remember to refresh the SSR seed:
 *   node scripts/generate-news-seed.js
 */
import { readFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { enrichStory } from "./lib/enrich.mjs";
import { isSpamDomain, reputationRank } from "./lib/source-reputation.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..", "..");
const envPath = join(ROOT, ".env.local");
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, "utf-8").split("\n")) {
    const t = line.trim(); if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("="); if (i === -1) continue;
    const k = t.slice(0, i).trim(); if (!process.env[k]) process.env[k] = t.slice(i + 1).trim();
  }
}
const SUPA = process.env.NEXT_PUBLIC_SUPABASE_URL, KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPA || !KEY) throw new Error("Missing Supabase creds in .env.local");

const args = process.argv.slice(2);
const APPLY = args.includes("--apply");
const THIN = args.includes("--thin");
const idArg = (() => { const i = args.indexOf("--id"); return i !== -1 ? args[i + 1] : null; })();
const limit = (() => { const i = args.indexOf("--limit"); return i !== -1 ? Number(args[i + 1]) : 20; })();

async function fetchStories() {
  const sel = "id,slug,headline,summary,why_it_matters,lead_url,lead_source,outlet_count,published_at,platforms";
  const q = idArg
    ? `${SUPA}/rest/v1/news_stories?select=${sel}&id=eq.${idArg}`
    : `${SUPA}/rest/v1/news_stories?select=${sel}&status=eq.published&order=published_at.desc&limit=${limit}`;
  const res = await fetch(q, { headers: { apikey: KEY, Authorization: `Bearer ${KEY}` } });
  if (!res.ok) throw new Error(await res.text());
  const rows = await res.json();
  // Attach each story's existing sources so enrichment dedupes against them.
  for (const s of rows) {
    const r = await fetch(`${SUPA}/rest/v1/news_story_sources?select=outlet,url&story_id=eq.${s.id}`, { headers: { apikey: KEY, Authorization: `Bearer ${KEY}` } });
    s.sources = r.ok ? await r.json() : [];
  }
  return rows;
}

/** A story "needs" enrichment most when it is single-source or led by a denylisted/unranked outlet. */
function isThin(s) {
  if ((s.outlet_count || 1) <= 1) return true;
  if (isSpamDomain(s.lead_url)) return true;
  return reputationRank(s.lead_url, s.lead_source) == null; // not on the allowlist
}

const all = await fetchStories();
const stories = THIN ? all.filter(isThin) : all;
console.error(`${APPLY ? "Enriching" : "Planning (dry-run)"} ${stories.length}${THIN ? " thin" : ""} stories${idArg ? "" : ` of ${all.length} fetched`}...\n`);

let touched = 0, addedTotal = 0, promoted = 0, reheadlined = 0;
for (const s of stories) {
  try {
    const r = await enrichStory(s, { apply: APPLY });
    if (r.added > 0) {
      touched++; addedTotal += r.added; if (r.promote) promoted++; if (r.changed) reheadlined++;
      console.log(`• ${s.headline.slice(0, 70)}`);
      console.log(`    +${r.added} outlet(s): ${r.sources.map((x) => x.outlet).join(", ")}`);
      if (r.promote) console.log(`    ↑ lead → ${r.promote}`);
      if (r.changed && r.newHeadline) console.log(`    ✎ re-headline → ${r.newHeadline.slice(0, 80)}`);
    } else {
      console.log(`· ${s.headline.slice(0, 70)} — no new coverage`);
    }
  } catch (e) {
    console.error(`✗ ${s.headline.slice(0, 60)}: ${e.message}`);
  }
}

console.log(`\n${APPLY ? "Applied" : "Planned"}: ${touched} stories enriched, ${addedTotal} outlets added, ${promoted} leads promoted, ${reheadlined} re-headlined.`);
if (APPLY && touched) console.log(`Refresh the SSR seed:  node scripts/generate-news-seed.js`);
else if (!APPLY && touched) console.log(`Re-run with --apply to commit.`);
