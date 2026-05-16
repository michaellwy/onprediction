/**
 * Rule-based pre-filtering to reduce candidates before AI ranking.
 * Eliminates 80-90% of noise at zero cost.
 */

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

    return true;
  });
}
