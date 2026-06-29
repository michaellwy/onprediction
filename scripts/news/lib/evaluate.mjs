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
import { reputationRank, rankOrUnranked, isSpamDomain } from "./source-reputation.mjs";

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

/** Stable per-story key. New incremental stories mint one from a label + lead url. */
export function makeClusterKey(label, leadUrl) {
  return `${slugify(label || "story")}-${djb2(leadUrl).slice(0, 4)}`;
}

// Summary normalization shared by the new-story analyzer and the in-place
// updater: join arrays, swap em/en dashes for commas, and DROP meta-excuse
// summaries (so a card never says "the excerpt is unavailable").
function cleanSummary(raw) {
  let s = (Array.isArray(raw) ? raw.filter(Boolean).join(" ") : (raw || "")).replace(/\s*[—–]\s*/g, ", ").trim();
  if (/excerpt|unavailable|no specific details|not provided|according to the headline|article does not|does not (specify|mention|provide)/i.test(s)) s = "";
  return s;
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

const ANALYZE_SYS = `You write entries for a prediction-market news feed read by sharp insiders. For each story (you get the original headline + an excerpt of the actual article) return JSON with:
- "id": echo the story id exactly
- "headline": REWRITE as a clean factual sentence. STRICT rules:
  - LEAD WITH THE PREDICTION-MARKET COMPANY/PLATFORM as the grammatical subject, FIRST (Polymarket, Kalshi, Novig, DraftKings, Cboe, Coinbase, Metaculus, etc.). The PM entity opens the headline. e.g. NOT "Ex-Kalshi Attorney Heads Legal at Novig" but "Novig hires a former Kalshi and CFTC attorney to lead legal affairs". If the actor is a regulator/court acting on a platform, you may lead with the regulator (e.g. "The CFTC investigates Polymarket"), but a PM company must appear early.
  - TENSE: use the journalistic HEADLINE PRESENT — write completed events in the simple present, never the past ("Kalshi raises $40 billion" NOT "Kalshi raised $40 billion"; "New Mexico sues Kalshi" NOT "New Mexico sued Kalshi"; "Polymarket loses $3 million in a hack" NOT "lost"). Use present continuous for genuinely ongoing action ("The CFTC is investigating Polymarket"). Use "to" + verb for the still-future ("Kalshi to raise at a $40 billion valuation"). NEVER use past tense ("-ed") for the main verb.
  - Sentence case: capitalize only the first word and proper nouns/acronyms (CFTC, Kalshi, S&P, IPO, DOJ). Do NOT title-case every word.
  - NEVER start with a quote and NEVER use a colon hook (no "'An Absolute Mess:' ..."). NO colons. NO semicolons. NO em dashes. NO quotation marks in the headline.
  - Plain simple words, no jargon, no corporate-speak, no clickbait. Active voice. Name the exact actor. Lead with the exact number when the excerpt has it (never "millions"/"a windfall" if the precise figure is available).
  - Examples (note present tense): "Novig hires a former Kalshi and CFTC attorney to lead legal affairs" / "Kalshi raises at a $40 billion valuation" / "Polymarket pays influencers over $350,000 to promote odds without disclosure" / "Cboe partners with Charles Schwab to launch S&P 500 prediction contracts" / "New Mexico sues Kalshi over sports event contracts".
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
  const urlOf = (m) => m.resolved_url || m.url;
  // Lead with the MOST REPUTABLE outlet (Reuters/Bloomberg over an SEO republish),
  // breaking ties by gate score. So the headline, share link and broadcast all
  // point at the best available source, not whichever the gate scored highest.
  const lead = citable.slice().sort((a, b) =>
    (rankOrUnranked(urlOf(a), a.source) - rankOrUnranked(urlOf(b), b.source)) || ((b.score || 0) - (a.score || 0))
  )[0];
  const score = Math.max(...citable.map((m) => m.score || 0));
  const outlet_count = new Set(citable.map((m) => hostOf(urlOf(m)))).size;
  // Best (lowest) reputation tier across the cluster. null = no allowlisted outlet
  // covers it yet → held below the bar until a credible one does.
  const ranks = citable.map((m) => reputationRank(urlOf(m), m.source)).filter((r) => r != null);
  const best_rank = ranks.length ? Math.min(...ranks) : null;
  // Held only when EVERY source is a known junk domain — one real outlet (even a
  // niche one not on the allowlist) is enough to publish.
  const spam_only = citable.every((m) => isSpamDomain(urlOf(m)));
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
    best_rank,
    spam_only,
    broke_on: citable[0].broke_day,
    published_at,
    sources: citable.map((m) => ({ outlet: m.source || hostOf(urlOf(m)), url: urlOf(m), title: m.title ?? null, published_at: m.published_at })),
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
    const summary = cleanSummary(a.summary);
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

// ---------- Incremental match-or-create (replaces global re-clustering) ----------

const ASSIGN_SYS = `You triage incoming prediction-market news against the stories already live on the feed.

You are given:
A) EXISTING active stories, each as "[S<n>] headline".
B) NEW incoming items, each as "<id> | title".

For every NEW item decide which single underlying development it reports:
- If it is the SAME development as an existing story (same announcement, filing, lawsuit, funding round, hack, ruling, or report — even reworded or a follow-up), assign that story's S-tag (e.g. "S2").
- If two or more NEW items report the same development as EACH OTHER and no existing story covers it, give them a SHARED key "new:<short-slug>".
- Otherwise give the item its own unique "new:<short-slug>".

Sharing a company, regulator, or theme is NOT the same story: two different lawsuits are two stories; a funding round and an IPO report are two stories; a hack and a regulatory probe are two stories.

Return ONLY a JSON array, one object per NEW item: [{"id":"<id>","group":"S2"}, {"id":"<id>","group":"new:kalshi-raise"}]. Every NEW id appears exactly once.`;

/**
 * Assign each new on-topic item to an existing active story or a new group.
 * Returns Map<itemId, group> where group is "S<index>" (index into
 * activeStories) or "new:<slug>". Items sharing a "new:" group form one story.
 */
export async function assignToStories(newItems, activeStories) {
  const out = new Map();
  if (!newItems.length) return out;
  const sList = activeStories.length
    ? activeStories.map((s, i) => `[S${i}] ${s.headline}`).join("\n")
    : "(none yet)";
  // Low daily volume — one call handles a normal run. Chunk only as a backstop;
  // a chunk can't see another chunk's "new:" groups, but per-run new-item counts
  // are small enough that this rarely splits same-event coverage.
  for (let off = 0; off < newItems.length; off += 60) {
    const batch = newItems.slice(off, off + 60);
    const list = batch.map((it) => `${it.id} | ${it.title.slice(0, 140)}`).join("\n");
    try {
      for (const a of parseJsonArray(await callDeepSeek(ASSIGN_SYS, `EXISTING active stories:\n${sList}\n\nNEW items:\n${list}`))) {
        if (a && a.id != null && typeof a.group === "string" && a.group.trim()) out.set(String(a.id), a.group.trim());
      }
    } catch (e) { console.error(`  assign batch failed: ${e.message}`); }
  }
  return out;
}

const DUP_SYS = `You decide whether a NEW prediction-market news story reports the SAME specific development as one of several EXISTING stories.

SAME development = the same single announcement, filing, lawsuit, funding round, product launch, hack, ruling, report or milestone — even when reworded, re-framed, or written from a different angle (e.g. "users lose $3M in a frontend hack" and "platform confirms third-party breach, will refund after phishing attack" are the SAME hack; "revenue tops $1B" and "annualized revenue surpassed $1 billion" are the SAME milestone). Sharing only a company, a topic, or the broader theme is NOT the same development — two different lawsuits, a funding round vs. an IPO report, a hack vs. a regulatory probe are all DIFFERENT.

You get the NEW story (headline + summary) and a numbered list of EXISTING stories. Return ONLY a JSON array with one object: [{"match": <index of the SAME development, or -1 if none>}]. Default to -1 when unsure.`;

/**
 * Semantic same-event check used by the ingest dedup pass. Returns the index of
 * the matching candidate (into `candidates`) or -1. One DeepSeek call.
 */
export async function findDuplicateStory(story, candidates) {
  if (!candidates || !candidates.length) return -1;
  const list = candidates
    .map((c, i) => `[${i}] ${c.headline}${c.summary ? " — " + String(c.summary).slice(0, 180) : ""}`)
    .join("\n");
  const user = `NEW story:\nheadline: ${story.headline}\nsummary: ${story.summary || ""}\n\nEXISTING stories:\n${list}`;
  try {
    const arr = parseJsonArray(await callDeepSeek(DUP_SYS, user, { maxTokens: 200 }));
    const m = Array.isArray(arr) ? arr[0] : null;
    const idx = m && Number.isInteger(m.match) ? m.match : -1;
    return idx >= 0 && idx < candidates.length ? idx : -1;
  } catch (e) {
    console.error(`  dedup check failed: ${e.message}`);
    return -1;
  }
}

const UPDATE_SYS = `A prediction-market news story is already live on the feed. New coverage just arrived. Decide whether the new coverage adds MATERIAL new information (new facts, figures, named parties, a fresh development) or merely repeats what is already known.

You get the CURRENT story (headline + summary) and EXCERPTS from the new coverage.

Return ONLY a JSON array with exactly one object:
[{"changed": true|false, "headline": "...", "summary": "...", "why_it_matters": "..."}]
- changed=false when the new coverage adds nothing material. Omit the other fields.
- changed=true when it adds material info: rewrite the headline and summary to fold in the new facts. Keep the feed's strict style: lead with the prediction-market company as the grammatical subject; HEADLINE PRESENT TENSE (completed events in the simple present, e.g. "Kalshi raises $40 billion" NOT "raised"; present continuous only for ongoing action; "to" + verb for the future) — never past tense ("-ed") for the main verb; sentence case; NO colons, semicolons, em dashes or quotation marks in the headline; summary is ONE 2-3 sentence paragraph that adds substance (never a meta-excuse like "the excerpt is unavailable"). Use ONLY facts present in the current story or the new excerpts. Never invent figures.`;

/**
 * Decide whether newly-arrived coverage materially updates an existing story,
 * and if so produce the rewritten headline/summary. Pure interpretation — no
 * DB writes. Returns {changed:false} or {changed:true, headline, summary, why_it_matters?}.
 */
export async function updateStoryText(story, newTexts) {
  const excerpts = (newTexts || [])
    .filter((t) => (t || "").length > 80)
    .map((t, i) => `[${i + 1}] ${t.slice(0, 2500)}`)
    .join("\n\n");
  if (!excerpts) return { changed: false }; // nothing new to learn from
  const user = `CURRENT story:\nheadline: ${story.headline}\nsummary: ${story.summary || ""}\n\nNEW coverage excerpts:\n${excerpts}`;
  try {
    const arr = parseJsonArray(await callDeepSeek(UPDATE_SYS, user, { maxTokens: 1400 }));
    const obj = Array.isArray(arr) ? arr[0] : null;
    if (obj && obj.changed && typeof obj.headline === "string" && obj.headline.trim()) {
      const summary = cleanSummary(obj.summary);
      if (!summary) return { changed: false };
      return {
        changed: true,
        headline: obj.headline.trim(),
        summary,
        why_it_matters: typeof obj.why_it_matters === "string" && obj.why_it_matters.trim() ? obj.why_it_matters.trim() : null,
      };
    }
  } catch (e) { console.error(`  update-story call failed: ${e.message}`); }
  return { changed: false };
}
