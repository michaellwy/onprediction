/**
 * Validate the taste classifier against the editor's REAL decisions.
 *
 *   node scripts/news/taste-eval.mjs [--hidden N]
 *
 * Ground truth: status='published' = signal (editor kept it),
 * status='hidden' = noise (editor dumped it in the cleanup). We classify both
 * and report how well the classifier reproduces those calls. "uncertain" is
 * counted separately — it is a deferral, not a wrong answer.
 *
 * Headlines that appear verbatim in taste.md are excluded to avoid leakage.
 */
import { readFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { classifyTaste } from "./lib/taste-classifier.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..", "..");
const env = {};
for (const line of readFileSync(join(ROOT, ".env.local"), "utf-8").split("\n")) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m) { env[m[1]] = m[2].trim(); if (!process.env[m[1]]) process.env[m[1]] = m[2].trim(); }
}
const SUPA = env.NEXT_PUBLIC_SUPABASE_URL, KEY = env.SUPABASE_SERVICE_ROLE_KEY;
const hiddenN = (() => { const i = process.argv.indexOf("--hidden"); return i !== -1 ? Number(process.argv[i + 1]) : 80; })();

const tasteExamples = new Set(
  readFileSync(join(__dirname, "taste.md"), "utf-8").split("\n")
    .filter((l) => l.startsWith("- ")).map((l) => l.slice(2).trim().toLowerCase())
);

async function fetchRows(status, limit) {
  const res = await fetch(`${SUPA}/rest/v1/news_stories?select=id,headline,summary&status=eq.${status}&order=score.desc&limit=${limit}`,
    { headers: { apikey: KEY, Authorization: `Bearer ${KEY}` } });
  if (!res.ok) throw new Error(await res.text());
  return (await res.json()).filter((r) => !tasteExamples.has((r.headline || "").toLowerCase()));
}

const published = await fetchRows("published", 500);
const hidden = await fetchRows("hidden", hiddenN);
console.error(`Evaluating ${published.length} published (truth=signal) + ${hidden.length} hidden (truth=noise)...`);

const verdicts = await classifyTaste([...published, ...hidden]);
const tally = (rows) => rows.reduce((a, r) => { const v = verdicts.get(String(r.id)).verdict; a[v] = (a[v] || 0) + 1; return a; }, {});
const p = tally(published), h = tally(hidden);

const pct = (n, d) => d ? `${Math.round((100 * n) / d)}%` : "—";
console.log(`\n=== PUBLISHED (you kept these — want "signal") ===`);
console.log(`  signal:    ${p.signal || 0}  (${pct(p.signal || 0, published.length)})  <- correct`);
console.log(`  uncertain: ${p.uncertain || 0}  (${pct(p.uncertain || 0, published.length)})  <- would go to review`);
console.log(`  noise:     ${p.noise || 0}  (${pct(p.noise || 0, published.length)})  <- WRONG (would've hidden a keeper)`);
console.log(`\n=== HIDDEN (you dumped these — want "noise") ===`);
console.log(`  noise:     ${h.noise || 0}  (${pct(h.noise || 0, hidden.length)})  <- correct`);
console.log(`  uncertain: ${h.uncertain || 0}  (${pct(h.uncertain || 0, hidden.length)})  <- would go to review`);
console.log(`  signal:    ${h.signal || 0}  (${pct(h.signal || 0, hidden.length)})  <- WRONG (would've published junk)`);

console.log(`\n--- Misclassified keepers (published -> noise) ---`);
for (const r of published) if (verdicts.get(String(r.id)).verdict === "noise") console.log(`  "${r.headline.slice(0, 80)}" :: ${verdicts.get(String(r.id)).reason}`);
console.log(`\n--- False signals (hidden -> signal) ---`);
for (const r of hidden) if (verdicts.get(String(r.id)).verdict === "signal") console.log(`  "${r.headline.slice(0, 80)}" :: ${verdicts.get(String(r.id)).reason}`);
