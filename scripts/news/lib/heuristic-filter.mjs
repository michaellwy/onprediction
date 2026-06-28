/**
 * Zero-cost pre-gate filter for the news harvest.
 *
 * Google News still leaks sportsbook promo spam and single-game odds churn into
 * the harvest (heavily so in the date-windowed backfill, lightly in the daily
 * relevance fetch). These have unmistakable title signatures, so a regex kills
 * them before the DeepSeek gate ever sees them — saving tokens and noise.
 *
 * Tuned for PRECISION: it only drops items that are obviously off-topic from the
 * title alone, so genuine industry news is never at risk. Anything that survives
 * is still judged by the LLM gate. Only `press` items are filtered; regulatory
 * and commentary sources are curated upstream and pass through untouched.
 */

const SPAM_PATTERNS = [
  // Affiliate / promo-code spam
  /\bpromo codes?\b/i,
  /\b(invite|referral|sign[- ]?up) code\b/i,
  /\bbonus(es)?\b/i,
  /\bclaim \$?\d/i,
  /\bsign[- ]?up (bonus|offer)\b/i,
  /\bbest\b.*\b(promos|bonuses|offers)\b/i,
  /\bbetting offers?\b/i,
  // Single-game odds churn
  /\bodds update\b/i,
  /\bfirst[- ]look\b/i,
  // team-vs-team lines that carry betting context (won't hit "Polymarket vs Kalshi").
  // A bare "Game \d" is intentionally NOT a standalone rule: it kills real stories
  // ("Kalshi volume hits record high ... Game 4") for marginal recall the LLM gate
  // already covers. It only triggers here alongside explicit betting context.
  /\bvs\.?\s.+\b(odds|picks|promo|bonus|game \d|series winner|moneyline|spread)\b/i,
  // Auto-generated crypto price-ticker pages
  /\b(btc|eth|sol|xrp|doge|crypto)\s+price\b/i,
  /\bprice on \w+\.?\s+\d+\b/i,
];

/** True if a title looks like promo/odds-churn spam. */
export function isNewsSpam(title) {
  return SPAM_PATTERNS.some((re) => re.test(title || ""));
}

/**
 * Partition harvested items into kept + dropped. Drops obvious spam press items;
 * non-press sources (regulatory, commentary) always pass.
 * @returns {{ kept: Array, dropped: Array }}
 */
export function preGateFilter(items) {
  const kept = [];
  const dropped = [];
  for (const it of items) {
    if (it.source_type === "press" && isNewsSpam(it.title)) dropped.push(it);
    else kept.push(it);
  }
  return { kept, dropped };
}
