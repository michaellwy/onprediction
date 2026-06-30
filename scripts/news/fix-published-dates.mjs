#!/usr/bin/env node
/**
 * One-off correction: reset each story's `published_at` to its TRUE break date,
 * undoing the old appendToStory bug that re-stamped week-old sagas to "now"
 * whenever follow-up coverage arrived.
 *
 *   node scripts/news/fix-published-dates.mjs            # dry-run (show diffs)
 *   node scripts/news/fix-published-dates.mjs --apply    # write the corrections
 *
 * Break date = breakDate() over the story's source timestamps (the SAME
 * bulk-of-coverage logic shapeStory now uses), NOT the raw earliest source — so
 * a stale early outlier (DraftKings' Jun-1 item) or a generic-pre-coverage block
 * (the ADI launch sources under the Kalshi/ADI story) doesn't drag the date too
 * far back. Only stories whose stored date differs from the computed break date
 * by more than an hour are touched. last_activity_at is left alone.
 */

import { readFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { createClient } from "@supabase/supabase-js";
import { breakDate } from "./lib/evaluate.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = join(__dirname, "..", "..", ".env.local");
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, "utf-8").split("\n")) {
    const t = line.trim(); if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("="); if (i === -1) continue;
    const k = t.slice(0, i).trim(); if (!process.env[k]) process.env[k] = t.slice(i + 1).trim();
  }
}

const APPLY = process.argv.includes("--apply");
// --earlier-only: only pull bumped stories BACK to their break date (the safe
// direction). Skip "move later" corrections (min-pollution / merged clusters).
const EARLIER_ONLY = process.argv.includes("--earlier-only");
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

const stories = [];
for (let from = 0; ; from += 1000) {
  const { data, error } = await sb.from("news_stories")
    .select("id, headline, status, published_at").range(from, from + 999);
  if (error) throw new Error(error.message);
  stories.push(...(data || []));
  if (!data || data.length < 1000) break;
}

let fixed = 0, skipped = 0;
for (const s of stories) {
  const { data: src } = await sb.from("news_story_sources")
    .select("published_at").eq("story_id", s.id).not("published_at", "is", null);
  const times = (src || []).map((r) => Date.parse(r.published_at)).filter(Boolean);
  if (!times.length) { skipped++; continue; }
  const target = breakDate(times); // bulk-of-coverage date
  if (!target) { skipped++; continue; }
  const stored = Date.parse(s.published_at);
  const real = Date.parse(target);
  // Only correct when the stored date differs from the break date by > 1h.
  if (Math.abs(stored - real) <= 3600e3) { skipped++; continue; }
  if (EARLIER_ONLY && real >= stored) { skipped++; continue; } // skip move-later
  fixed++;
  const dir = stored > real ? "←" : "→";
  console.log(`${s.published_at.slice(0, 16)} ${dir} ${target.slice(0, 16)}  [${s.status}] ${s.headline.slice(0, 60)}`);
  if (APPLY) {
    const { error } = await sb.from("news_stories")
      .update({ published_at: target }).eq("id", s.id);
    if (error) console.error(`  update failed: ${error.message}`);
  }
}

console.log(`\n${APPLY ? "Corrected" : "Would correct"} ${fixed} stories; ${skipped} left as-is.`);
if (!APPLY) console.log("Re-run with --apply to write. Then: node scripts/generate-news-seed.js");
