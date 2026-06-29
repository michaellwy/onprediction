/**
 * Apply curation decisions from news-review.tsv (or .csv) back to Supabase + source config.
 *
 *   node scripts/news/apply-review.mjs [path] [--dry-run]
 *
 * Reads news-review.tsv by default; pass a path (e.g. news-review.csv) to use a
 * file you saved from Excel. Delimiter (tab or comma) and quoted fields are
 * auto-detected, so "Save As CSV" from Excel just works.
 *
 * For each row:
 *   decision = hide   -> set news_stories.status = 'hidden' (drops from feed + search)
 *   decision = keep   -> no change
 *   source_action = deny  -> add the row's host to sourceReputation.json denylist
 *   source_action = down  -> demote the host one reputation tier (tier 3 -> unranked)
 *
 * deny/down edit src/lib/sourceReputation.json, which both the frontend and the
 * ingest pipeline read, so future ingests filter accordingly. Commit that file.
 */
import { readFileSync, writeFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const args = process.argv.slice(2);
const DRY = args.includes("--dry-run");
const pathArg = args.find((a) => !a.startsWith("--"));
const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..", "..");
const TSV = pathArg ? (pathArg.startsWith("/") ? pathArg : join(ROOT, pathArg)) : join(ROOT, "news-review.tsv");
const REP = join(ROOT, "src", "lib", "sourceReputation.json");

/** Parse a delimited line honoring "double quotes" (Excel CSV style). */
function parseLine(line, delim) {
  const out = [];
  let cur = "", inQ = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQ) {
      if (ch === '"') { if (line[i + 1] === '"') { cur += '"'; i++; } else inQ = false; }
      else cur += ch;
    } else if (ch === '"') inQ = true;
    else if (ch === delim) { out.push(cur); cur = ""; }
    else cur += ch;
  }
  out.push(cur);
  return out;
}

const env = {};
for (const line of readFileSync(join(ROOT, ".env.local"), "utf-8").split("\n")) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m) env[m[1]] = m[2].trim();
}
const SUPA_URL = env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPA_URL || !KEY) throw new Error("Missing Supabase creds in .env.local");

const raw = readFileSync(TSV, "utf-8").replace(/\r\n/g, "\n").split("\n").filter(Boolean);
const delim = (raw[0].match(/\t/g)?.length || 0) >= (raw[0].match(/,/g)?.length || 0) ? "\t" : ",";
const rows = raw.slice(1).map((l) => {
  const c = parseLine(l, delim);
  return { decision: (c[0] || "").trim().toLowerCase(), source_action: (c[1] || "").trim().toLowerCase(), id: (c[2] || "").trim(), host: (c[7] || "").trim().toLowerCase(), headline: c[8] };
});

// --- 1. Hide stories ---------------------------------------------------------
const toHide = rows.filter((r) => r.decision === "hide" && r.id);
const bad = rows.filter((r) => r.decision && !["keep", "hide"].includes(r.decision));
if (bad.length) console.warn(`! ${bad.length} rows have an unrecognized decision (not keep/hide) — skipped: ${bad.map((b) => b.decision).slice(0, 5).join(", ")}`);

console.log(`Hiding ${toHide.length} stories${DRY ? " (dry-run)" : ""}.`);
if (toHide.length && !DRY) {
  // PATCH in chunks via id=in.(...) filter.
  for (let i = 0; i < toHide.length; i += 100) {
    const ids = toHide.slice(i, i + 100).map((r) => r.id);
    const res = await fetch(`${SUPA_URL}/rest/v1/news_stories?id=in.(${ids.join(",")})`, {
      method: "PATCH",
      headers: { apikey: KEY, Authorization: `Bearer ${KEY}`, "Content-Type": "application/json", Prefer: "return=minimal" },
      body: JSON.stringify({ status: "hidden" }),
    });
    if (!res.ok) throw new Error(`PATCH failed: ${res.status} ${await res.text()}`);
  }
  console.log(`  done.`);
}

// --- 2. Tune source reputation ----------------------------------------------
const denyHosts = [...new Set(rows.filter((r) => r.source_action === "deny" && r.host).map((r) => r.host))];
const downHosts = [...new Set(rows.filter((r) => r.source_action === "down" && r.host).map((r) => r.host))];
const badAction = rows.filter((r) => r.source_action && !["deny", "down"].includes(r.source_action));
if (badAction.length) console.warn(`! ${badAction.length} rows have an unrecognized source_action (not deny/down) — skipped.`);

if (denyHosts.length || downHosts.length) {
  const rep = JSON.parse(readFileSync(REP, "utf-8"));
  const tierOf = (host) => rep.tiers.find((t) => t.domains.some((d) => host === d || host.endsWith("." + d)));

  for (const host of denyHosts) {
    for (const t of rep.tiers) t.domains = t.domains.filter((d) => d !== host); // drop from allowlist
    if (!rep.denylist.includes(host)) { rep.denylist.push(host); console.log(`  deny: + ${host}`); }
    else console.log(`  deny: ${host} already denylisted`);
  }
  for (const host of downHosts) {
    const t = tierOf(host);
    if (!t) { console.warn(`  down: ${host} is not on any allowlist tier (already unranked) — use "deny" to suppress it`); continue; }
    t.domains = t.domains.filter((d) => d !== host);
    const next = rep.tiers.find((x) => x.tier === t.tier + 1);
    if (next) { next.domains.push(host); console.log(`  down: ${host} tier ${t.tier} -> ${t.tier + 1}`); }
    else console.log(`  down: ${host} dropped from tier ${t.tier} -> unranked`);
  }
  rep.denylist.sort();
  if (!DRY) writeFileSync(REP, JSON.stringify(rep, null, 2) + "\n");
  console.log(`Updated ${REP}${DRY ? " (dry-run, not written)" : " — commit this file"}.`);
}

console.log("Done.");
