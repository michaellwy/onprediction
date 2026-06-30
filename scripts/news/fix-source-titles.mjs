#!/usr/bin/env node
/**
 * One-off: repair coverage-source titles that arrived cropped (trailing ellipsis)
 * from an upstream feed. Re-fetches each affected article and swaps in the
 * canonical og:title. Same logic the live ingest now applies going forward.
 *
 *   node scripts/news/fix-source-titles.mjs           # dry-run
 *   node scripts/news/fix-source-titles.mjs --apply   # write fixes
 */

import { readFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { createClient } from "@supabase/supabase-js";
import { fetchArticleText, isTruncatedTitle } from "./lib/article-text.mjs";

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
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

const rows = [];
for (let from = 0; ; from += 1000) {
  const { data, error } = await sb.from("news_story_sources").select("id,url,title").range(from, from + 999);
  if (error) throw new Error(error.message);
  rows.push(...(data || []));
  if (!data || data.length < 1000) break;
}
const targets = rows.filter((r) => isTruncatedTitle(r.title));
console.log(`${targets.length} truncated source titles.`);

let fixed = 0;
for (const r of targets) {
  const { title } = await fetchArticleText(r.url);
  if (!title || isTruncatedTitle(title)) { console.log(`  ✗ no clean title for ${r.url.slice(0, 60)}`); continue; }
  console.log(`  ${JSON.stringify(r.title)}\n    → ${JSON.stringify(title)}`);
  fixed++;
  if (APPLY) {
    const { error } = await sb.from("news_story_sources").update({ title }).eq("id", r.id);
    if (error) console.error(`    update failed: ${error.message}`);
  }
}
console.log(`\n${APPLY ? "Fixed" : "Would fix"} ${fixed}/${targets.length}.`);
if (!APPLY && fixed) console.log("Re-run with --apply, then: node scripts/generate-news-seed.js");
