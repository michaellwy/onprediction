/**
 * Additional news sources beyond Google News:
 *  - Regulatory primary sources: Federal Register API + CFTC press-release RSS
 *    (catches self-certifications / rulemakings that journalism hasn't written up).
 *  - PM-specific commentary feeds (op-eds / analysis Google News under-ranks).
 *
 * All return the shared normalized item shape:
 *   { id, title, url, source, source_type, published_at, broke_day, text }
 * Used as a DISCOVERY signal — items still go through the same gate/cluster/analyze
 * pipeline, which links to the primary source. We do not republish anyone's write-up.
 */

import { djb2, hostOf, ymd, fetchText, fetchJson, parseRss } from "./http.mjs";

const PM_KEYWORDS = [
  "prediction market", "polymarket", "kalshi", "event contract", "predictit",
  "metaculus", "manifold", "futarchy", "event-contract",
];

function isPmRelevant(text) {
  const t = (text || "").toLowerCase();
  return PM_KEYWORDS.some((k) => t.includes(k));
}

function within(ts, days) {
  if (ts == null || Number.isNaN(ts)) return true; // keep undated; gate will judge
  return ts >= Date.now() - days * 864e5;
}

function mk(item, source, sourceType) {
  const ts = item.pubDate ? Date.parse(item.pubDate) : (item.published_at ?? null);
  return {
    id: djb2(item.url),
    title: item.title,
    url: item.url,
    source,
    source_type: sourceType,
    published_at: Number.isNaN(ts) ? null : ts,
    broke_day: ts && !Number.isNaN(ts) ? ymd(new Date(ts)) : ymd(new Date()),
    text: item.text || "",
  };
}

/** Federal Register documents matching PM/event-contract terms. Keyless JSON API. */
export async function fetchFederalRegister(days = 7) {
  const terms = ["prediction market", "event contracts"];
  const out = [];
  for (const term of terms) {
    const url = `https://www.federalregister.gov/api/v1/documents.json?per_page=20&order=newest&conditions[term]=${encodeURIComponent(term)}`;
    try {
      const j = await fetchJson(url);
      for (const d of j.results || []) {
        const ts = d.publication_date ? Date.parse(d.publication_date) : null;
        if (!within(ts, days)) continue;
        out.push(mk({
          title: d.title,
          url: d.html_url,
          published_at: ts,
          text: (d.abstract || "") + " " + (d.agencies || []).map((a) => a.name).join(", "),
        }, "Federal Register", "regulatory"));
      }
      console.error(`  federal_register "${term}": ${(j.results || []).length} results`);
    } catch (e) { console.error(`  federal_register "${term}" failed: ${e.message}`); }
  }
  return out;
}

/** CFTC press releases (RSS), filtered to PM-relevant items. */
export async function fetchCFTC(days = 14) {
  const candidates = [
    "https://www.cftc.gov/RSS/RSSGP/rssgp.xml",
    "https://www.cftc.gov/RSS/RSSPR/rsspr.xml",
  ];
  const out = [];
  for (const feed of candidates) {
    try {
      const items = parseRss(await fetchText(feed));
      let kept = 0;
      for (const it of items) {
        if (!it.link || !it.title) continue;
        if (!isPmRelevant(`${it.title} ${it.text}`)) continue;
        const ts = it.pubDate ? Date.parse(it.pubDate) : null;
        if (!within(ts, days)) continue;
        out.push(mk({ title: it.title, url: it.link, pubDate: it.pubDate, text: it.text }, "CFTC", "regulatory"));
        kept++;
      }
      console.error(`  cftc ${feed}: ${items.length} items, ${kept} PM-relevant`);
      if (items.length) break; // first working feed is enough
    } catch (e) { console.error(`  cftc ${feed} failed: ${e.message}`); }
  }
  return out;
}

// PM-specific commentary feeds (op-eds / analysis). Broad feeds are keyword-gated.
const COMMENTARY_FEEDS = [
  { url: "https://nexteventhorizon.substack.com/feed", name: "Event Horizon", native: true },
  { url: "https://kalshi.com/blog/feed", name: "Kalshi Blog", native: true },
  { url: "https://thezvi.substack.com/feed", name: "The Zvi" },
  { url: "https://goodjudgment.substack.com/feed", name: "Good Judgment" },
  { url: "https://astralcodexten.substack.com/feed", name: "Astral Codex Ten" },
  { url: "https://marginalrevolution.com/feed", name: "Marginal Revolution" },
];

/** PM commentary/analysis from curated feeds (keyword-gated for the broad ones). */
export async function fetchCommentaryFeeds(days = 7) {
  const out = [];
  for (const feed of COMMENTARY_FEEDS) {
    try {
      const items = parseRss(await fetchText(feed.url));
      let kept = 0;
      for (const it of items) {
        if (!it.link || !it.title) continue;
        // Native PM feeds keep all recent items; broad feeds must mention PM.
        if (!feed.native && !isPmRelevant(`${it.title} ${it.text}`)) continue;
        const ts = it.pubDate ? Date.parse(it.pubDate) : null;
        if (!within(ts, days)) continue;
        out.push(mk({ title: it.title, url: it.link, pubDate: it.pubDate, text: it.text }, feed.name, "commentary"));
        kept++;
      }
      console.error(`  feed ${feed.name}: ${items.length} items, ${kept} kept`);
    } catch (e) { console.error(`  feed ${feed.name} failed: ${e.message}`); }
  }
  return out;
}
