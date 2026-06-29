#!/usr/bin/env node
/**
 * Backfill existing published headlines to the journalistic HEADLINE PRESENT
 * tense (completed events in the simple present: "Kalshi raises $40bn", not
 * "raised"). Changes ONLY the verb tense — every entity, number, name and the
 * word order are preserved. Already-present/future headlines pass through.
 *
 *   node scripts/news/fix-headline-tense.mjs            # dry-run (before → after)
 *   node scripts/news/fix-headline-tense.mjs --apply    # commit, then regen the seed
 *
 * After --apply:  node scripts/generate-news-seed.js
 */
import { readFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { callDeepSeek, parseJsonArray } from "./lib/deepseek.mjs";

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
const APPLY = process.argv.includes("--apply");

const SYS = `You convert news headlines to the journalistic HEADLINE PRESENT tense. This is a TENSE-ONLY edit.

RULES:
- Change a completed-event past-tense main verb to the simple present: "raised" → "raises", "sued" → "sues", "launched" → "launches", "paid" → "pays", "lost" → "loses", "filed" → "files", "partnered" → "partners", "hired" → "hires", "won" → "wins", "granted" → "grants", "approved" → "approves", "added" → "adds".
- Genuinely ongoing action stays present continuous ("is investigating" stays).
- A still-future event uses "to" + verb ("will raise" → "to raise").
- Change NOTHING ELSE: keep every company, person, number, dollar figure, jurisdiction, date and the exact word order. Do not reword, shorten, re-punctuate or restyle. Do not touch subordinate-clause verbs unless leaving them creates a tense clash with the new main verb.
- If a headline is ALREADY present/future tense, return it UNCHANGED.

You get a numbered list "id | headline". Return ONLY a JSON array: [{"id": <number>, "headline": "<present-tense headline>"}]. Every id exactly once.`;

async function fetchAll() {
  const rows = [];
  for (let off = 0; ; off += 1000) {
    const res = await fetch(`${SUPA}/rest/v1/news_stories?select=id,headline&status=eq.published&order=published_at.desc&limit=1000&offset=${off}`,
      { headers: { apikey: KEY, Authorization: `Bearer ${KEY}` } });
    if (!res.ok) throw new Error(await res.text());
    const batch = await res.json();
    rows.push(...batch);
    if (batch.length < 1000) break;
  }
  return rows;
}

const stories = await fetchAll();
console.error(`Checking ${stories.length} published headlines...\n`);

const changes = [];
for (let off = 0; off < stories.length; off += 20) {
  const batch = stories.slice(off, off + 20);
  const list = batch.map((s, i) => `${i} | ${s.headline}`).join("\n");
  let arr = [];
  try { arr = parseJsonArray(await callDeepSeek(SYS, `Headlines:\n\n${list}`, { maxTokens: 3000 })); }
  catch (e) { console.error(`  batch failed: ${e.message}`); }
  for (const r of arr) {
    const idx = Number(r.id);
    const s = batch[idx];
    const next = (r.headline || "").trim();
    if (s && next && next !== s.headline) changes.push({ id: s.id, before: s.headline, after: next });
  }
  console.error(`  checked ${Math.min(off + 20, stories.length)}/${stories.length}`);
}

console.log(`\n${changes.length} headlines to convert${APPLY ? "" : " (dry-run)"}:\n`);
for (const c of changes) {
  console.log(`  − ${c.before}`);
  console.log(`  + ${c.after}\n`);
}

if (APPLY && changes.length) {
  for (const c of changes) {
    const res = await fetch(`${SUPA}/rest/v1/news_stories?id=eq.${c.id}`, {
      method: "PATCH",
      headers: { apikey: KEY, Authorization: `Bearer ${KEY}`, "Content-Type": "application/json", Prefer: "return=minimal" },
      body: JSON.stringify({ headline: c.after }),
    });
    if (!res.ok) { console.error(`  patch failed for ${c.id}: ${res.status}`); }
  }
  console.log(`Applied ${changes.length} headline fixes. Now refresh the seed:  node scripts/generate-news-seed.js`);
} else if (changes.length) {
  console.log(`Re-run with --apply to commit.`);
}
