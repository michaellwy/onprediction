/**
 * News evaluation pipeline (fresh — NOT the scanner's article curation).
 * Stages: on-topic gate + score  →  single global clustering  →  per-story
 * analysis (summary, "why it matters", category, concept tags, platforms).
 */

import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { callDeepSeek, parseJsonArray } from "./deepseek.mjs";
import { hostOf, djb2 } from "./google-news.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO = join(__dirname, "..", "..", "..");

// News-native beats (single word). Distinct from the article taxonomy — news
// clusters differently. Concept tags (below) remain the cross-link to articles.
export const CATEGORIES = [
  "Regulation", "Funding", "Platforms", "Markets", "Security", "Adoption", "Opinion",
];
const CATEGORY_GUIDE = `- Regulation: laws, lawsuits, court rulings, CFTC/state actions, policy, bans
- Funding: fundraises, valuations, IPO talk, M&A, revenue/financial milestones
- Platforms: product launches, new venues, features, platform/company moves
- Markets: market activity — notable odds, volume records, what the markets are pricing
- Security: hacks, fraud, insider trading, manipulation, integrity issues
- Adoption: partnerships, integrations, sports/brand deals, mainstream uptake
- Opinion: commentary, analysis, op-eds, explainer takes`;

// Concept vocabulary (names) from the synced definitions file.
const conceptNames = Object.keys(
  JSON.parse(readFileSync(join(REPO, "concept_definitions.json"), "utf-8"))
);

// Mirror of conceptNameToSlug() in src/lib/concepts.ts
function conceptNameToSlug(name) {
  return name.toLowerCase().replace(/[()]/g, "").replace(/[^a-z0-9-]+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
}
const conceptSlugSet = new Set(conceptNames.map(conceptNameToSlug));

function slugify(s) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "").slice(0, 60);
}

// Canonical names for common aliases so the auto-grown platform vocabulary stays
// clean. Unknown platforms pass through (lightly title-cased) so new entrants
// auto-populate without code changes.
const PLATFORM_CANON = {
  polymarket: "Polymarket", kalshi: "Kalshi", predictit: "PredictIt", metaculus: "Metaculus",
  manifold: "Manifold", "manifold markets": "Manifold", draftkings: "DraftKings", "draft kings": "DraftKings",
  dkex: "DraftKings", fanduel: "FanDuel", coinbase: "Coinbase", robinhood: "Robinhood",
  "crypto.com": "Crypto.com", cboe: "Cboe", cme: "CME", "cme group": "CME",
  "charles schwab": "Charles Schwab", schwab: "Charles Schwab", prophetx: "ProphetX", novig: "Novig",
  myriad: "Myriad", limitless: "Limitless", "rain trade": "Rain Trade", sportradar: "Sportradar",
  tradeweb: "Tradeweb", chainlink: "Chainlink", "good judgment": "Good Judgment",
};

export function normalizePlatforms(arr) {
  const out = [];
  const seen = new Set();
  for (const raw of Array.isArray(arr) ? arr : []) {
    if (!raw || typeof raw !== "string") continue;
    const key = raw.trim().toLowerCase();
    if (!key) continue;
    const canon = PLATFORM_CANON[key] || raw.trim().replace(/\b\w/g, (c) => c.toUpperCase());
    const dedup = canon.toLowerCase();
    if (seen.has(dedup)) continue;
    seen.add(dedup);
    out.push(canon);
  }
  return out;
}

const STOPWORDS = new Set("the a an of to in on for and or as is are be over with at by from new report says source amid its his her their this that into out up".split(" "));
function headlineTokens(h) {
  return new Set((h || "").toLowerCase().replace(/[^a-z0-9 ]+/g, " ").split(/\s+/).filter((w) => w.length > 2 && !STOPWORDS.has(w)));
}
function jaccard(a, b) {
  if (!a.size || !b.size) return 0;
  let inter = 0;
  for (const t of a) if (b.has(t)) inter++;
  return inter / (a.size + b.size - inter);
}

const leadOf = (members) => members.slice().sort((a, b) => (b.score || 0) - (a.score || 0))[0];

/**
 * Deterministic backstop to the LLM merge: collapse clusters whose lead
 * headlines are near-identical (high token overlap). Conservative threshold so
 * it only kills true duplicates, not distinct developments of a story.
 */
function collapseClusters(clusters, threshold = 0.7) {
  const accepted = [];
  for (const c of [...clusters].sort((a, b) => (leadOf(b.members).score || 0) - (leadOf(a.members).score || 0))) {
    const toks = headlineTokens(leadOf(c.members).title);
    const hit = accepted.find((a) => jaccard(a._toks, toks) >= threshold);
    if (hit) hit.members.push(...c.members);
    else accepted.push({ ...c, _toks: toks });
  }
  return accepted.map(({ _toks, ...c }) => c);
}

export const GATE_MIN = 5;
// No hard daily cap — anything that clears the meaningful-news bar publishes.
export const PUBLISH_MIN_SCORE = 7;

const GATE_SYS = `You curate a news feed about the PREDICTION-MARKET INDUSTRY for its builders, researchers and investors (Polymarket, Kalshi, PredictIt, Metaculus, Manifold, Polymarket/Kalshi-style event-contract venues, and the companies/regulators around them).

The test: is this news ABOUT the prediction-market industry itself, or does it merely USE a prediction market as a data point?

For each item return JSON {id, on_topic (bool), score (1-10)}.

on_topic = TRUE only if the story is about the industry itself:
- A platform's business: funding, valuations, IPO, M&A, launches, new products/features, revenue, partnerships, people moves, companies entering or building in prediction markets. A person or company taking a stake, equity, board seat or advisory role in a prediction-market platform IS industry news (e.g. "Trump Jr. takes a stake in Kalshi").
- Regulation, legal action, lawsuits, policy, bans, enforcement targeting prediction markets / event contracts.
- Market mechanism, oracle, settlement, resolution disputes, or integrity issues (hacks, fraud, insider trading ON these platforms).
- Aggregate industry metrics: total trading-volume records, open-interest milestones, a platform launching a notable new market category.

on_topic = FALSE (reject these even if a prediction market is named):
- The hook is prediction-market ODDS about an EXTERNAL event — elections, sports, macro/Fed, crypto prices, crypto legislation, geopolitics. e.g. "Polymarket gives X a 41% chance", "race to replace Keir Starmer", "Galaxy Digital cuts CLARITY Act odds", "Galaxy bet $10M on the CLARITY Act passing", "bettors wager on Taylor Swift". The market is a barometer for some OTHER story, not the subject. Legislation that is not specifically about prediction markets (e.g. the crypto market-structure CLARITY Act) is NOT industry news even when a PM bet on it is mentioned.
- NOT NEWS: historical / evergreen / academic / trivia ("Iowa Electronic Markets beat polls in the 1980s"), explainers, how-to, "what is a prediction market".
- Generic crypto / sports-betting / finance not about the PM industry; promo-code / affiliate / referral spam; single-game odds churn.

score (only meaningful when on_topic): 1-10 news value — regulation, lawsuits, funding, launches, security incidents, major industry moves = high; thin or low-effort = low.

Respond ONLY a JSON array.`;

const CLUSTER_SYS = `You are given prediction-market news headlines. Group together the ones that report the SAME underlying development — the same single announcement, filing, lawsuit, funding round, hack, ruling, or report — even when the wording differs or outlets reported it on different days (some report late). Group reworded or follow-up coverage of the same event together. But do NOT group different events that merely share a company, regulator, or theme: two different state lawsuits are TWO stories, a funding round and an IPO-talks report are TWO stories, a hack and a regulatory probe are TWO stories. Examples of ONE story: "Trump Jr. takes a stake in Kalshi" + "Kalshi grants Trump Jr. shares" + "Trump Jr. set for Kalshi windfall". Return ONLY a JSON array of groups: [{"label":"short-story-slug","ids":["id1","id2",...]}]. Every id appears in exactly one group.`;

const MERGE_SYS = `You are given preliminary prediction-market story groups, each with an index and a representative headline. Merge groups that report the SAME underlying development (same single lawsuit, same funding round, same hack, same ruling, same announcement) — including the same story reworded or reported on different days. Do NOT merge different events that merely share a company, regulator, or theme: different lawsuits, different regulatory actions, a raise vs an IPO report, a hack vs a probe are SEPARATE stories. Return ONLY a JSON array where each element is an array of indices that belong together, e.g. [[0,4],[1],[2,7]]. Every index appears exactly once.`;

const ANALYZE_SYS = `You write entries for a prediction-market news feed read by sharp insiders. For each story (you get the original headline + an excerpt of the actual article) return JSON with:
- "id": echo the story id exactly
- "headline": REWRITE as a clean factual sentence. STRICT rules:
  - LEAD WITH THE PREDICTION-MARKET COMPANY/PLATFORM as the grammatical subject, FIRST (Polymarket, Kalshi, Novig, DraftKings, Cboe, Coinbase, Metaculus, etc.). The PM entity opens the headline. e.g. NOT "Ex-Kalshi Attorney Heads Legal at Novig" but "Novig hired a former Kalshi and CFTC attorney to lead legal affairs". If the actor is a regulator/court acting on a platform, you may lead with the regulator (e.g. "The CFTC is investigating Polymarket"), but a PM company must appear early.
  - Sentence case: capitalize only the first word and proper nouns/acronyms (CFTC, Kalshi, S&P, IPO, DOJ). Do NOT title-case every word.
  - NEVER start with a quote and NEVER use a colon hook (no "'An Absolute Mess:' ..."). NO colons. NO semicolons. NO em dashes. NO quotation marks in the headline.
  - Plain simple words, no jargon, no corporate-speak, no clickbait. Active voice. Name the exact actor. Lead with the exact number when the excerpt has it (never "millions"/"a windfall" if the precise figure is available).
  - Examples: "Novig hired a former Kalshi and CFTC attorney to lead legal affairs" / "Kalshi is raising at a $40 billion valuation" / "Polymarket paid influencers over $350,000 to promote odds without disclosure" / "Cboe partnered with Charles Schwab to launch S&P 500 prediction contracts".
- "summary": ONE paragraph of 2-3 complete sentences (a single string, NOT a list/array) written FOR A PREDICTION-MARKET PRACTITIONER. It must ADD substance BEYOND the headline — never just restate it. Pull the specific details a sharp PM reader wants from the article excerpt: for a fundraise, who is LEADING the round, the new valuation, and the prior round's size/valuation/leads; for an investigation/lawsuit, what SPECIFICALLY is alleged, which entity/jurisdiction, and the regulatory status; for a launch/deal, what exactly ships, the real numbers (volume, users, dollars), and the counterparties. Use ONLY facts in the excerpt; never invent figures. NEVER write meta-statements about the source ("the article excerpt is unavailable", "no specific details can be provided", "according to the headline") — if you genuinely lack details, write a tight factual sentence from what the headline conveys instead, but never an apology or an excuse. Plain, confident, conversational. Do NOT use em dashes. Do NOT use "not X, but Y" phrasing.
- "why_it_matters": ONE plain sentence on why it matters for how prediction markets work.
- "category": EXACTLY ONE of [${CATEGORIES.join(", ")}]:
${CATEGORY_GUIDE}
- "tags": 1-4 concept tags chosen ONLY from this allowed list (verbatim): ${conceptNames.join("; ")}
- "platforms": array of company/platform names central to the story — prediction-market venues AND adjacent firms entering the space (e.g. Polymarket, Kalshi, PredictIt, Metaculus, Manifold, DraftKings, FanDuel, Coinbase, Robinhood, Crypto.com, Cboe, CME, Charles Schwab, ProphetX, Novig). Use the canonical company name. [] if none.
Respond ONLY with a JSON array, no prose.`;

/** STAGE: gate + score. Returns ALL items annotated with {on_topic, gate_score}. */
export async function gateScoreAll(items) {
  const map = new Map();
  for (let off = 0; off < items.length; off += 30) {
    const batch = items.slice(off, off + 30);
    const list = batch.map((it) => `ID:${it.id} | ${it.title.slice(0, 150)}`).join("\n");
    try {
      for (const s of parseJsonArray(await callDeepSeek(GATE_SYS, `Score these ${batch.length} items:\n\n${list}`)))
        map.set(String(s.id), s);
    } catch (e) { console.error(`  gate batch failed: ${e.message}`); }
    console.error(`  gated ${Math.min(off + 30, items.length)}/${items.length}`);
  }
  return items.map((it) => {
    const g = map.get(it.id) || {};
    return { ...it, on_topic: g.on_topic !== false, gate_score: g.score ?? 0 };
  });
}

/** STAGE: cluster on-topic items into distinct stories. Returns [{cluster_key, members}]. */
export async function clusterItems(kept) {
  const byId = new Map(kept.map((k) => [k.id, k]));

  // Pass 1: batch clustering
  const prelim = []; // [{ label, members:[item] }]
  for (let off = 0; off < kept.length; off += 150) {
    const batch = kept.slice(off, off + 150);
    const list = batch.map((it) => `${it.id} ${it.title.slice(0, 120)}`).join("\n");
    try {
      for (const g of parseJsonArray(await callDeepSeek(CLUSTER_SYS, `Headlines:\n${list}`))) {
        const members = (g.ids || []).map((id) => byId.get(String(id))).filter(Boolean);
        if (members.length) prelim.push({ label: g.label, members });
      }
    } catch (e) { console.error(`  cluster batch failed: ${e.message}`); }
  }

  // Pass 2: iterative chunked merge. A single merge call over hundreds of
  // representatives is unreliable (the LLM can lump everything into one group),
  // and a plain chunked pass misses duplicates that land in different chunks.
  // So: sort by a headline signature (similar stories become adjacent and share
  // a chunk), merge in safe small chunks, and repeat a few rounds to propagate
  // cross-chunk merges. A guard rejects any chunk whose merge swallows >70% of
  // it, so collapse can never run away.
  console.error(`  clustering: ${prelim.length} preliminary clusters`);
  const leadOf = (p) => p.members.slice().sort((a, b) => (b.score || 0) - (a.score || 0))[0];
  const sigOf = (p) => [...headlineTokens(leadOf(p).title)].sort().slice(0, 4).join(" ");
  const CHUNK = 40;
  let clusters = prelim;
  for (let round = 0; round < 4 && clusters.length > 2; round++) {
    clusters.sort((a, b) => sigOf(a).localeCompare(sigOf(b)));
    const next = [];
    for (let off = 0; off < clusters.length; off += CHUNK) {
      const chunk = clusters.slice(off, off + CHUNK);
      if (chunk.length <= 2) { next.push(...chunk); continue; }
      const reps = chunk.map((p, i) => `${i} ${leadOf(p).title.slice(0, 110)}`).join("\n");
      let groups = [];
      try { groups = parseJsonArray(await callDeepSeek(MERGE_SYS, `Groups:\n${reps}`)); } catch (e) { console.error(`  merge chunk failed: ${e.message}`); }
      const valid = Array.isArray(groups) && groups.length && groups.every((g) => Array.isArray(g) && g.length);
      const maxGroup = valid ? Math.max(...groups.map((g) => g.length)) : 0;
      if (valid && maxGroup < chunk.length * 0.4) {
        const used = new Set();
        for (const idxs of groups) {
          const members = idxs.flatMap((i) => { used.add(i); return chunk[i]?.members || []; });
          if (members.length) next.push({ label: chunk[idxs[0]]?.label, members });
        }
        chunk.forEach((p, i) => { if (!used.has(i)) next.push(p); });
      } else {
        next.push(...chunk);
      }
    }
    console.error(`  merge round ${round + 1}: ${clusters.length} -> ${next.length}`);
    const converged = next.length >= clusters.length;
    clusters = next;
    if (converged) break;
  }

  // Collapse near-duplicate clusters, then assign a stable cluster_key.
  const collapsed = collapseClusters(clusters);
  console.error(`  distinct clusters: ${collapsed.length}`);
  return collapsed.map((c) => {
    const seen = new Set();
    const members = c.members.filter((m) => (seen.has(m.url) ? false : seen.add(m.url)));
    const lead = members.slice().sort((a, b) => (b.score || 0) - (a.score || 0))[0];
    const cluster_key = `${slugify(c.label || lead.title)}-${djb2(lead.url).slice(0, 4)}`;
    return { cluster_key, members };
  });
}

/**
 * Build story metadata from a cluster's members (no LLM).
 * Commentary/newsletter sources (source_type "commentary") are DISCOVERY-ONLY:
 * they help cluster a story but are never the lead and never shown as a source.
 * Returns null if the cluster has no citable (press/regulatory) source.
 */
export function shapeStory(members) {
  const seen = new Set();
  const all = members.filter((m) => (seen.has(m.url) ? false : seen.add(m.url)));
  const citable = all.filter((m) => m.source_type !== "commentary");
  if (!citable.length) return null; // only newsletter coverage — can't cite, drop

  citable.sort((a, b) => String(a.broke_day).localeCompare(String(b.broke_day)));
  const lead = citable.slice().sort((a, b) => (b.score || 0) - (a.score || 0))[0];
  const urlOf = (m) => m.resolved_url || m.url;
  const score = Math.max(...citable.map((m) => m.score || 0));
  const outlet_count = new Set(citable.map((m) => hostOf(urlOf(m)))).size;
  const pubTimes = citable.map((m) => (m.published_at ? Date.parse(m.published_at) : null)).filter((t) => t);
  const published_at = pubTimes.length ? new Date(Math.min(...pubTimes)).toISOString() : null;
  // Use the richest article text available across the cluster's citable members,
  // not just the lead's (the lead outlet is often bot-blocked while a sibling has text).
  const textMember = citable
    .filter((m) => (m.article_text || "").length > 200)
    .sort((a, b) => b.article_text.length - a.article_text.length)[0];
  return {
    cluster_key: lead.cluster_key,
    headline: lead.title,
    lead_url: urlOf(lead),
    lead_url_hash: lead.url_hash,
    lead_source: lead.source || hostOf(urlOf(lead)),
    article_text: textMember?.article_text || lead.article_text || "",
    score,
    outlet_count,
    importance: score + Math.min(outlet_count, 12) * 0.4,
    broke_on: citable[0].broke_day,
    published_at,
    sources: citable.map((m) => ({ outlet: m.source || hostOf(urlOf(m)), url: urlOf(m), published_at: m.published_at })),
  };
}

/**
 * STAGE: interpretation. Rewrites headline, writes bullet summary, tags, etc.
 * Uses each story's cached `article_text` (set from the raw-item cache) — does
 * NOT fetch anything. This is the only stage re-run when tuning wording/tone.
 */
export async function analyzeStories(stories) {
  if (!stories.length) return stories;
  const map = new Map();
  for (let off = 0; off < stories.length; off += 6) {
    const batch = stories.slice(off, off + 6);
    const list = batch.map((s) =>
      `id: ${s.cluster_key}\n  original headline: ${s.headline}\n  article excerpt: ${s.article_text ? s.article_text.slice(0, 3500) : "(unavailable — use the headline only, keep bullets minimal)"}`
    ).join("\n\n");
    try { for (const a of parseJsonArray(await callDeepSeek(ANALYZE_SYS, `Stories:\n\n${list}`, { maxTokens: 4096 }))) map.set(String(a.id), a); }
    catch (e) { console.error(`  analyze batch failed: ${e.message}`); }
    console.error(`  analyzed ${Math.min(off + 6, stories.length)}/${stories.length}`);
  }
  return stories.map((s) => {
    const a = map.get(s.cluster_key) || {};
    const tags = (a.tags || []).map((t) => conceptNameToSlug(t)).filter((slug) => conceptSlugSet.has(slug));
    const category = CATEGORIES.includes(a.category) ? a.category : null;
    const headline = typeof a.headline === "string" && a.headline.trim() ? a.headline.trim() : s.headline;
    let summary = (Array.isArray(a.summary) ? a.summary.filter(Boolean).join(" ") : (a.summary || "")).replace(/\s*[—–]\s*/g, ", ").trim();
    // Never surface a meta-excuse summary — drop it (card then shows headline + sources only).
    if (/excerpt|unavailable|no specific details|not provided|according to the headline|article does not|does not (specify|mention|provide)/i.test(summary)) summary = "";
    const { article_text, ...rest } = s;
    return {
      ...rest,
      headline,
      slug: `${slugify(headline)}-${djb2(s.lead_url).slice(0, 6)}`,
      summary,
      why_it_matters: a.why_it_matters || null,
      primary_category: category,
      tags,
      platforms: normalizePlatforms(a.platforms),
    };
  });
}
