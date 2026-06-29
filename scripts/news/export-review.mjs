/**
 * Export every published news story to an editable TSV for human curation.
 *
 *   node scripts/news/export-review.mjs
 *
 * Writes news-review.tsv at the repo root. Columns:
 *   decision      keep | hide   (pre-filled "keep"; change to "hide" to drop)
 *   source_action (blank) | down | deny   (act on the OUTLET, not just this story)
 *   ...read-only context columns (id, date, score, category, source, host, headline, url)
 *
 * Sorted worst-score-first so likely junk floats to the top. Edit the file,
 * then run scripts/news/apply-review.mjs to push changes back.
 *
 * Re-running preserves prior decisions: if news-review.tsv already exists, the
 * decision/source_action you set on a story (by id) are carried over.
 */
import { readFileSync, writeFileSync, existsSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..", "..");
const OUT = join(ROOT, "news-review.tsv");

// Load Supabase creds from .env.local (KEY=VALUE lines).
const env = {};
for (const line of readFileSync(join(ROOT, ".env.local"), "utf-8").split("\n")) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m) env[m[1]] = m[2].trim();
}
const SUPA_URL = env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPA_URL || !KEY) throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");

const hostOf = (u) => { try { return new URL(u).hostname.replace(/^www\./, "").toLowerCase(); } catch { return ""; } };
const clean = (s) => String(s ?? "").replace(/[\t\r\n]+/g, " ").trim();

// Carry over prior decisions keyed by story id.
const prior = new Map();
if (existsSync(OUT)) {
  const lines = readFileSync(OUT, "utf-8").split("\n");
  for (const line of lines.slice(1)) {
    const c = line.split("\t");
    if (c.length >= 4 && c[2]) prior.set(c[2], { decision: c[0]?.trim() || "keep", source_action: c[1]?.trim() || "" });
  }
}

async function fetchAll() {
  const rows = [];
  const PAGE = 1000;
  for (let off = 0; ; off += PAGE) {
    const res = await fetch(
      `${SUPA_URL}/rest/v1/news_stories?select=id,published_at,score,primary_category,lead_source,lead_url,headline&status=eq.published&order=score.asc&limit=${PAGE}&offset=${off}`,
      { headers: { apikey: KEY, Authorization: `Bearer ${KEY}` } }
    );
    if (!res.ok) throw new Error(`fetch failed: ${res.status} ${await res.text()}`);
    const batch = await res.json();
    rows.push(...batch);
    if (batch.length < PAGE) break;
  }
  return rows;
}

const stories = await fetchAll();
const header = ["decision", "source_action", "id", "date", "score", "category", "source", "host", "headline", "url"];
const lines = [header.join("\t")];
for (const s of stories) {
  const p = prior.get(s.id) || {};
  lines.push([
    p.decision || "keep",
    p.source_action || "",
    s.id,
    (s.published_at || "").slice(0, 10),
    s.score ?? "",
    clean(s.primary_category),
    clean(s.lead_source),
    hostOf(s.lead_url),
    clean(s.headline),
    clean(s.lead_url),
  ].join("\t"));
}
writeFileSync(OUT, lines.join("\n") + "\n");
console.log(`Wrote ${stories.length} stories to ${OUT}`);
console.log(`Sorted worst-score-first. Edit "decision" (keep→hide) and optionally "source_action" (down|deny), then run apply-review.mjs.`);
