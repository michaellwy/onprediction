/**
 * Coverage enrichment: for a live story, find OTHER outlets reporting the SAME
 * development and attach them as sources — so a story that landed single-sourced
 * (often from a denylisted republish) gains breadth and a credible lead.
 *
 * Pipeline per story: search Google News by the headline → dedupe vs the outlets
 * already on the story → LLM verify each candidate is the same development (the
 * Orca-misclustering guard: a shared topic is NOT enough) → resolve real URLs and
 * fetch the would-be lead's text → if a more-reputable outlet appears, promote it
 * to lead and re-headline from its richer coverage (via updateStoryText).
 *
 * Used by enrich-coverage.mjs (batch/backfill) and ingest.mjs (new stories).
 */
import { searchGoogleNews } from "./google-news.mjs";
import { ddgSearch } from "./web-search.mjs";
import { fetchArticleText } from "./article-text.mjs";
import { callDeepSeek, parseJsonArray } from "./deepseek.mjs";
import { hostOf } from "./http.mjs";
import { isSpamDomain, rankOrUnranked } from "./source-reputation.mjs";
import { updateStoryText } from "./evaluate.mjs";
import { attachCoverage } from "./store.mjs";

const MAX_CANDIDATES = 12;

const VERIFY_SYS = `You verify whether candidate news articles report the SAME specific development as a REFERENCE story.

SAME development = the same single announcement, filing, lawsuit, funding round, product launch, hack, ruling, partnership or report — same named entities and the same key facts. A candidate that merely shares a company, a topic, or the broader theme is NOT the same development. Two different lawsuits, a funding round vs. an IPO report, a launch vs. a volume milestone — all DIFFERENT.

You get the REFERENCE story (headline + summary) and a numbered list of CANDIDATES (headline + outlet). For each candidate decide if it reports the SAME development.

Return ONLY a JSON array, one object per candidate: [{"id": <number>, "same": true|false}]. Default to false when unsure.`;

/** Normalize an outlet name for dedupe against a story's existing outlets. */
const normName = (s) => (s || "").toLowerCase().replace(/[^a-z0-9]/g, "");

/**
 * Find verified additional coverage for a story. Returns an array of
 * { outlet, url (resolved), title, published_at, text, rank } for outlets not
 * already on the story. Network + one LLM call; no DB writes.
 */
export async function findCoverage(story) {
  const existingNames = new Set([
    normName(story.lead_source),
    ...(story.sources || []).map((s) => normName(s.outlet || hostOf(s.url))),
  ]);
  const existingHosts = new Set([
    hostOf(story.lead_url),
    ...(story.sources || []).map((s) => hostOf(s.url)),
  ]);

  // 1. Gather candidates from BOTH retrieval paths, in parallel:
  //    - Google News RSS (broad outlet coverage, but the top wires limit their
  //      Google News syndication so Reuters/Bloomberg/AP rarely appear)
  //    - DuckDuckGo HTML (keyless web search — reaches those wires, real URLs)
  //    Search the headline (precise) AND a key-entity query (recall — wires title
  //    the same event differently than our rewrite). The LLM verify step guards
  //    precision downstream, so broadening recall here is safe.
  const queries = [story.headline];
  const ents = (story.platforms || []).filter(Boolean).slice(0, 2);
  if (ents.length) queries.push(ents.join(" "));

  const results = await Promise.all([
    ...queries.map((q) => searchGoogleNews(q)),
    ...queries.map((q) => ddgSearch(q)),
  ]);

  // Dedupe by outlet name, keeping whichever variant ranks better (a real outlet
  // over a syndication), and drop outlets already on the story.
  const byName = new Map();
  for (const it of results.flat()) {
    const name = normName(it.source || hostOf(it.url));
    if (!name || existingNames.has(name)) continue;
    const prev = byName.get(name);
    if (!prev || rankOrUnranked(it.url, it.source) < rankOrUnranked(prev.url, prev.source)) byName.set(name, it);
  }
  // Rank candidates by reputation so the cap keeps the most credible ones.
  const candidates = [...byName.values()]
    .sort((a, b) => rankOrUnranked(a.url, a.source) - rankOrUnranked(b.url, b.source))
    .slice(0, MAX_CANDIDATES);
  if (!candidates.length) return [];

  // 2. LLM verify each candidate is the SAME development (title-level, strict).
  const list = candidates.map((c, i) => `${i} | ${c.title} | ${c.source || hostOf(c.url)}`).join("\n");
  const user = `REFERENCE STORY:\nheadline: ${story.headline}\nsummary: ${story.summary || ""}\n\nCANDIDATES:\n${list}`;
  let verdicts = [];
  try { verdicts = parseJsonArray(await callDeepSeek(VERIFY_SYS, user)); } catch (e) { console.error(`  verify failed: ${e.message}`); }
  const sameIdx = new Set(verdicts.filter((v) => v && v.same === true).map((v) => Number(v.id)));
  const matched = candidates.filter((_, i) => sameIdx.has(i));
  if (!matched.length) return [];

  // 3. Resolve real URLs + fetch text (one call each). Drop spam domains and any
  //    that resolve onto an outlet/host already on the story.
  const out = [];
  for (const m of matched) {
    const { url, text } = await fetchArticleText(m.url);
    const realUrl = url || m.url;
    if (isSpamDomain(realUrl)) continue;
    const host = hostOf(realUrl);
    if (existingHosts.has(host)) continue;
    out.push({
      outlet: m.source || host,
      url: realUrl,
      title: m.title,
      published_at: m.published_at ? new Date(m.published_at).toISOString() : null,
      text: text || "",
      rank: rankOrUnranked(realUrl, m.source),
    });
  }
  return out;
}

/**
 * Enrich one story. With apply=false returns a plan (no writes); with apply=true
 * commits via attachCoverage. Promotes the most-reputable new outlet to lead and,
 * when that outlet has richer text, rewrites the headline/summary in house style.
 */
export async function enrichStory(story, { apply = false } = {}) {
  const found = await findCoverage(story);
  if (!found.length) return { added: 0, promote: null, changed: false, sources: [] };

  // A new outlet that out-ranks the current lead becomes the lead; re-headline
  // from its text if we have it (Reuters/AP coverage is usually richer than the
  // single-source blurb the story opened with).
  const leadRank = rankOrUnranked(story.lead_url, story.lead_source);
  const promote = found.filter((s) => s.rank < leadRank).sort((a, b) => a.rank - b.rank)[0] || null;
  let update = { changed: false };
  if (promote) {
    // Re-headline from the richest text we actually fetched, most-reputable first
    // (the top wire is often bot-walled, so fall back to the next-best coverage).
    const texts = found.filter((s) => s.text).sort((a, b) => a.rank - b.rank).map((s) => s.text).slice(0, 3);
    if (texts.length) update = await updateStoryText(story, texts);
  }

  const sources = found.map(({ text, rank, ...s }) => s); // store rows don't carry text/rank
  const common = {
    added: sources.length,
    promote: promote?.outlet || null,
    leadUrl: promote?.url || null,
    changed: !!update.changed,
    newHeadline: update.changed ? update.headline : null,
    newSummary: update.changed ? update.summary : null,
    sources,
  };
  if (!apply) return common;
  const res = await attachCoverage(story, sources, update);
  return { ...common, ...res };
}
