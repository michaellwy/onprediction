/**
 * Mine the hidden backlog for signal using the taste classifier.
 *
 *   node scripts/news/taste-review.mjs                 # classify + report buckets
 *   node scripts/news/taste-review.mjs --publish-signal  # also publish the signal bucket
 *   node scripts/news/taste-review.mjs --limit 60        # cap how many hidden rows to score
 *
 * "signal" -> stories you'd want; with --publish-signal they flip to published.
 * "noise"  -> metric churn / roundup / opinion / dupes; stays hidden (the safe default).
 * "uncertain" -> borderline; left hidden, printed so you can eyeball them.
 *
 * Writes scripts/news/taste-review.json (full verdicts) so a follow-up publish
 * doesn't need to re-classify.
 */
import { readFileSync, writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { classifyTaste } from "./lib/taste-classifier.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..", "..");
const OUT = join(__dirname, "taste-review.json");
const env = {};
for (const line of readFileSync(join(ROOT, ".env.local"), "utf-8").split("\n")) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m) { env[m[1]] = m[2].trim(); if (!process.env[m[1]]) process.env[m[1]] = m[2].trim(); }
}
const SUPA = env.NEXT_PUBLIC_SUPABASE_URL, KEY = env.SUPABASE_SERVICE_ROLE_KEY;
const args = process.argv.slice(2);
const PUBLISH = args.includes("--publish-signal");
const limit = (() => { const i = args.indexOf("--limit"); return i !== -1 ? Number(args[i + 1]) : 1000; })();

async function fetchHidden() {
  const rows = [];
  for (let off = 0; off < limit; off += 1000) {
    const take = Math.min(1000, limit - off);
    const res = await fetch(`${SUPA}/rest/v1/news_stories?select=id,headline,summary,score,published_at&status=eq.hidden&order=score.desc,published_at.desc&limit=${take}&offset=${off}`,
      { headers: { apikey: KEY, Authorization: `Bearer ${KEY}` } });
    if (!res.ok) throw new Error(await res.text());
    const batch = await res.json();
    rows.push(...batch);
    if (batch.length < take) break;
  }
  return rows;
}

const hidden = await fetchHidden();
console.error(`Classifying ${hidden.length} hidden stories...`);
const verdicts = await classifyTaste(hidden);

const buckets = { signal: [], noise: [], uncertain: [] };
for (const r of hidden) buckets[verdicts.get(String(r.id)).verdict].push({ ...r, reason: verdicts.get(String(r.id)).reason });
writeFileSync(OUT, JSON.stringify({ classifiedAt: hidden.length, buckets }, null, 2));

const show = (label, rows) => {
  console.log(`\n=== ${label} (${rows.length}) ===`);
  for (const r of rows) console.log(`  [${r.score}] ${r.headline.slice(0, 88)}  :: ${r.reason}`);
};
show("SIGNAL — would publish", buckets.signal);
show("UNCERTAIN — left hidden, eyeball these", buckets.uncertain);
show("NOISE — stays hidden", buckets.noise);
console.log(`\nSummary: ${buckets.signal.length} signal | ${buckets.uncertain.length} uncertain | ${buckets.noise.length} noise. Verdicts saved to ${OUT}.`);

if (PUBLISH && buckets.signal.length) {
  const ids = buckets.signal.map((r) => r.id);
  for (let i = 0; i < ids.length; i += 100) {
    const chunk = ids.slice(i, i + 100);
    const res = await fetch(`${SUPA}/rest/v1/news_stories?id=in.(${chunk.join(",")})`, {
      method: "PATCH",
      headers: { apikey: KEY, Authorization: `Bearer ${KEY}`, "Content-Type": "application/json", Prefer: "return=minimal" },
      body: JSON.stringify({ status: "published" }),
    });
    if (!res.ok) throw new Error(`publish failed: ${res.status} ${await res.text()}`);
  }
  console.log(`\nPublished ${ids.length} signal stories. Run \`node scripts/generate-news-seed.js\` to refresh the SSR seed.`);
} else if (buckets.signal.length) {
  console.log(`\nRe-run with --publish-signal to publish those ${buckets.signal.length} signal stories.`);
}
