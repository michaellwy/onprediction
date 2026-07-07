#!/usr/bin/env node
/**
 * Week packet for the newsletter — assembles the raw material for one issue so
 * the writing starts from a briefing, never a blank page. It does NOT write
 * the letter: selection beyond the score sort, the Thread and every take are
 * the editor's job (that judgment is the product).
 *
 *   node scripts/newsletter/week-packet.mjs [--days 7] [--end YYYY-MM-DD] [--out path]
 *
 * For each published story in the window it attaches:
 *   - Rhymes: older stories from news_stories (published + hidden) that share
 *     tags/platforms/tokens — the "last time this happened" candidates.
 *   - Library: articles from articles_database.json whose concepts overlap the
 *     story's tags — the theory the week just made current again.
 * Plus: a Thread-candidate shortlist, a ledger of the rest, non-US items
 * (Around the Map), and the week's tag/category counts.
 */

import { readFileSync, mkdirSync, writeFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { createClient } from "@supabase/supabase-js";

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

const args = process.argv.slice(2);
const flag = (name, dflt) => { const i = args.indexOf(name); return i !== -1 ? args[i + 1] : dflt; };
const DAYS = Number(flag("--days", 7));
const END = flag("--end", new Date().toISOString().slice(0, 10));
const endMs = Date.parse(`${END}T23:59:59Z`);
const startIso = new Date(endMs - DAYS * 864e5).toISOString();
const endIso = new Date(endMs).toISOString();

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

// ---------- matching helpers (same token heuristics the pipeline dedup uses) ----------

const tokens = (s) => new Set((String(s || "").toLowerCase().match(/[a-z0-9$]{4,}/g) || []));
function overlap(a, b) { let n = 0; for (const t of a) if (b.has(t)) n++; return n; }
const share = (a, b) => (a || []).some((x) => (b || []).map((y) => y.toLowerCase()).includes(x.toLowerCase()));

// Concept name → slug, matching src/lib and the pipeline's convention.
const conceptSlug = (name) =>
  String(name || "").toLowerCase().replace(/[()]/g, "").replace(/[^a-z0-9-]+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");

// Older stories that plausibly report an earlier beat of the same saga.
function rhymesFor(story, archive) {
  const a = tokens(`${story.headline} ${story.summary || ""}`);
  return archive
    .map((c) => {
      const score = overlap(a, tokens(`${c.headline} ${c.summary || ""}`))
        + (share(story.tags, c.tags) ? 2 : 0)
        + (share(story.platforms, c.platforms) ? 2 : 0);
      return { c, score };
    })
    .filter((x) => x.score >= 5)
    .sort((x, y) => y.score - x.score)
    .slice(0, 3);
}

// Library pieces whose concepts overlap the story's tags (plus a token assist).
function libraryFor(story, articles) {
  const a = tokens(`${story.headline} ${story.summary || ""}`);
  const storyTags = new Set(story.tags || []);
  return articles
    .map((art) => {
      let conceptHits = 0;
      for (const c of art.concepts || []) if (storyTags.has(conceptSlug(c))) conceptHits++;
      const score = conceptHits * 3 + overlap(a, tokens(`${art.title} ${art.editorial_blurb || ""}`));
      return { art, score, conceptHits };
    })
    .filter((x) => x.score >= 4)
    .sort((x, y) => y.score - x.score)
    .slice(0, 3);
}

const NON_US = /\b(hong kong|singapore|macau|taiwan|japan|korea|india|china|asia|europe|european|eu|uk|britain|british|australia|canada|brazil|(?<!new )mexico|africa|middle east|dubai|uae)\b/i;

const fmtDate = (iso) => (iso ? iso.slice(0, 10) : "undated");

// ---------- main ----------

async function main() {
  const { data: week, error: e1 } = await sb
    .from("news_stories")
    .select("id,slug,headline,summary,why_it_matters,primary_category,tags,platforms,lead_url,lead_source,score,outlet_count,importance,published_at")
    .eq("status", "published")
    .gte("published_at", startIso).lte("published_at", endIso)
    .order("importance", { ascending: false });
  if (e1) throw new Error(e1.message);

  const { data: archive, error: e2 } = await sb
    .from("news_stories")
    .select("id,slug,headline,summary,tags,platforms,lead_url,lead_source,published_at,status")
    .in("status", ["published", "hidden"])
    .lt("published_at", startIso)
    .order("published_at", { ascending: false })
    .limit(500);
  if (e2) throw new Error(e2.message);

  const articles = JSON.parse(readFileSync(join(ROOT, "articles_database.json"), "utf-8")).articles
    ?? JSON.parse(readFileSync(join(ROOT, "articles_database.json"), "utf-8"));

  const threadCandidates = week.slice(0, 5);
  const ledger = week.slice(5);
  const map = week.filter((s) => NON_US.test(`${s.headline} ${s.summary || ""}`));

  const tagCount = new Map(), catCount = new Map();
  for (const s of week) {
    for (const t of s.tags || []) tagCount.set(t, (tagCount.get(t) || 0) + 1);
    if (s.primary_category) catCount.set(s.primary_category, (catCount.get(s.primary_category) || 0) + 1);
  }
  const top = (m, n) => [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, n).map(([k, v]) => `${k} (${v})`).join(", ");

  const L = [];
  L.push(`# Week Packet — ${fmtDate(startIso)} → ${END}`);
  L.push("");
  L.push(`${week.length} published stories. Categories: ${top(catCount, 8) || "—"}. Top tags: ${top(tagCount, 8) || "—"}.`);
  L.push("");
  L.push(`> Working notes, not the letter. Pick ONE Thread, cut the ledger to 5–8, write the takes.`);
  L.push("");

  L.push(`## Thread candidates`);
  for (const s of threadCandidates) {
    L.push("");
    L.push(`### ${s.headline}`);
    L.push(`*${s.primary_category || "—"} · score ${s.score} · ${s.outlet_count} outlet(s) · ${fmtDate(s.published_at)} · [${s.lead_source}](${s.lead_url})*`);
    if (s.summary) L.push(`\n${s.summary}`);
    if (s.why_it_matters) L.push(`\n**Why it matters:** ${s.why_it_matters}`);
    const rhymes = rhymesFor(s, archive);
    if (rhymes.length) {
      L.push(`\n**Rhymes (older stories):**`);
      for (const { c, score } of rhymes) L.push(`- ${fmtDate(c.published_at)} — ${c.headline} ([${c.lead_source}](${c.lead_url}), match ${score}${c.status === "hidden" ? ", hidden" : ""})`);
    }
    const lib = libraryFor(s, articles);
    if (lib.length) {
      L.push(`\n**From the Library:**`);
      for (const { art, score } of lib) L.push(`- [#${art.id} ${art.title}](https://onprediction.xyz/articles/${art.id}) — ${art.author} (match ${score})`);
    }
  }

  if (ledger.length) {
    L.push("");
    L.push(`## Ledger (the rest of the week)`);
    for (const s of ledger) L.push(`- ${fmtDate(s.published_at)} — **${s.headline}** ([${s.lead_source}](${s.lead_url}))${s.why_it_matters ? ` — ${s.why_it_matters}` : ""}`);
  }

  if (map.length) {
    L.push("");
    L.push(`## Around the Map (non-US mentions)`);
    for (const s of map) L.push(`- ${fmtDate(s.published_at)} — ${s.headline} ([${s.lead_source}](${s.lead_url}))`);
  }

  L.push("");
  L.push(`## Issue skeleton`);
  L.push(["1. **The Thread** — hand-written, 400–600 words, one development read against the rhymes + library above.",
    "2. **The Ledger** — 5–8 items, one clause of 'so what' each.",
    "3. **Rhymes** — 2–3 explicit then-vs-now links.",
    "4. **From the Library** — one article the week made current again.",
    "5. **Around the Map** — the non-US beat."].join("\n"));
  L.push("");

  const outPath = flag("--out", join(__dirname, "packets", `${END}.md`));
  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, L.join("\n"));
  console.error(`Packet: ${week.length} stories, ${threadCandidates.length} thread candidates, ${map.length} map items.`);
  console.log(outPath);
}

main().catch((e) => { console.error("FATAL", e); process.exit(1); });
