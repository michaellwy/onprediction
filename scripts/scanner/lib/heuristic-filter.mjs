/**
 * Rule-based pre-filtering to reduce candidates before AI ranking.
 * Eliminates 80-90% of noise at zero cost.
 */

const PM_KEYWORDS = [
  "prediction market", "prediction markets", "polymarket", "kalshi",
  "futarchy", "event contract", "information market", "oracle",
  "forecasting", "LMSR", "scoring rule", "conditional token",
  "betting market", "outcome market", "binary option", "event market",
  "prediction exchange", "augur", "metaculus", "manifold",
  "market resolution", "dispute resolution", "UMA",
  "price discovery", "wisdom of crowds"
];

/**
 * Apply heuristic filters to raw tweets.
 * @param {Array} tweets - Normalized tweet objects
 * @param {Object} config - heuristic_filters from config.json
 * @param {Set} seenIds - Tweet IDs already seen in previous scans
 * @returns {Array} Filtered candidates
 */
export function filterTweets(tweets, config, seenIds) {
  const excludePatterns = (config.exclude_patterns || []).map(
    p => new RegExp(p, "i")
  );

  return tweets.filter(tweet => {
    // 1. Skip already-seen tweets
    if (seenIds.has(tweet.id)) return false;

    // 2. Skip retweets (but keep quote tweets)
    if (tweet.is_retweet) return false;

    // 3. Skip replies to others (keep self-replies = threads)
    if (tweet.is_reply && !tweet.is_self_reply) return false;

    // 4. Skip short tweets (exempt X Articles which have short tweet text but long body)
    const hasXArticle = /x\.com\/\w+\/article\//.test(tweet.text);
    if (!hasXArticle && tweet.text.length < (config.min_length_chars || 80)) return false;

    // 5. Skip spam patterns
    const textLower = tweet.text.toLowerCase();
    if (excludePatterns.some(p => p.test(tweet.text))) return false;

    // 6. For search results, require minimum engagement
    if (tweet.source === "search") {
      if (tweet.metrics.likes < (config.min_likes_for_search || 5)) return false;
    }

    // 7. Check PM keyword relevance (for search results this is implicit,
    //    but for account tweets we check too to filter non-PM posts)
    if (tweet.source === "account") {
      const hasPMKeyword = PM_KEYWORDS.some(kw => textLower.includes(kw.toLowerCase()));
      const hasURL = /https?:\/\/\S+/.test(tweet.text);
      // Account tweets pass if they have a PM keyword OR share a link
      // (linked articles are often PM-relevant even without keywords)
      if (!hasPMKeyword && !hasURL) return false;
    }

    return true;
  });
}

/**
 * Extract URLs from tweet text.
 */
export function extractUrls(text) {
  const matches = text.match(/https?:\/\/[^\s)]+/g);
  return matches || [];
}

/**
 * Deduplicate tweets sharing the same URL.
 * Keeps the one with highest engagement.
 */
export function deduplicateByUrl(tweets) {
  const urlMap = new Map();
  const noUrlTweets = [];

  for (const tweet of tweets) {
    const urls = extractUrls(tweet.text);
    if (urls.length === 0) {
      noUrlTweets.push(tweet);
      continue;
    }

    // Use first non-twitter URL as key, or first URL if all are twitter
    const externalUrl = urls.find(u => !u.includes("x.com") && !u.includes("twitter.com"));
    const key = externalUrl || urls[0];

    const existing = urlMap.get(key);
    if (!existing || tweet.metrics.likes > existing.metrics.likes) {
      urlMap.set(key, tweet);
    }
  }

  return [...noUrlTweets, ...urlMap.values()];
}
