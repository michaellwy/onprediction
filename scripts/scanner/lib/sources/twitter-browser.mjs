/**
 * Twitter/X content source that uses the agent-browser CLI to search X.com
 * and extract content without a paid API. Simulates human browsing.
 *
 * Requires agent-browser to be installed locally (npm install -g agent-browser).
 * In CI environments where agent-browser is unavailable, returns gracefully.
 * When X requires login, logs a warning and returns empty.
 *
 * Reads config from config.json sources.twitter_browser:
 *   - search_queries: array of search queries
 *   - max_tweets_per_query: cap per query (default 20)
 *   - lookback_hours: filter by recency (default 24)
 */

import { readFileSync } from "fs";
import { execFileSync } from "child_process";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

const SESSION_NAME = process.env.AGENT_BROWSER_SESSION_NAME || "onprediction-x";

// ---------------------------------------------------------------------------
// Eval JavaScript snippets (run in browser context via agent-browser eval)
// We use eval rather than parsing the accessibility tree snapshot because
// eval gives us direct access to the DOM and structured data, which is
// significantly more reliable than inferring tweet structure from the
// tree-format snapshot text. Snapshot is used for login-wall detection.
// ---------------------------------------------------------------------------

const EXTRACT_TWEETS_JS = `
(() => {
  const results = [];
  const seenUrls = new Set();

  var parseAbbr = function(s) {
    if (!s) return 0;
    var t = s.replace(/,/g, '').trim();
    if (!t || !/^[\\d.]+[KMB]?$/i.test(t)) return 0;
    var n = parseFloat(t.replace(/[KMB]/i, ''));
    if (isNaN(n)) return 0;
    if (/B$/i.test(t)) return Math.round(n * 1e9);
    if (/M$/i.test(t)) return Math.round(n * 1e6);
    if (/K$/i.test(t)) return Math.round(n * 1e3);
    return Math.round(n);
  };

  var articles = document.querySelectorAll('article');
  for (var i = 0; i < articles.length; i++) {
    try {
      var article = articles[i];
      var linkEl = article.querySelector('a[href*="/status/"]');
      if (!linkEl) continue;
      var href = linkEl.getAttribute('href');
      if (!href) continue;

      var match = href.match(/\\/status\\/(\\d+)/);
      if (!match) continue;

      var tweetId = match[1];
      var url = href.indexOf('http') === 0 ? href : 'https://x.com' + href;
      if (seenUrls.has(url)) continue;
      seenUrls.add(url);

      // Author @handle
      var handle = '';
      var userNameEl = article.querySelector('[data-testid="User-Name"]');
      if (userNameEl) {
        var hMatch = (userNameEl.textContent || '').match(/@(\\w+)/);
        if (hMatch) handle = hMatch[1];
      }
      if (!handle) {
        var hMatch2 = (linkEl.textContent || '').match(/@(\\w+)/);
        if (hMatch2) handle = hMatch2[1];
      }

      // Tweet text
      var textEl = article.querySelector('[data-testid="tweetText"]');
      var text = textEl ? (textEl.textContent || '').trim() : '';

      // Timestamp
      var timeEl = article.querySelector('time');
      var publishedAt = timeEl ? timeEl.getAttribute('datetime') : null;

      // Engagement counts
      var replies = 0, retweets = 0, likes = 0;

      var getCount = function(sel) {
        var el = article.querySelector(sel);
        if (!el) return 0;
        var label = el.getAttribute('aria-label') || '';
        if (label) {
          var m = label.match(/([\\d,]+(?:\\.[\\d]+)?[KMB]?)/i);
          if (m) return parseAbbr(m[1]);
        }
        var txt = (el.textContent || '').trim();
        if (!txt) return 0;
        return parseAbbr(txt);
      };

      replies = getCount('[data-testid="reply"]');
      retweets = getCount('[data-testid="retweet"]');
      likes = getCount('[data-testid="like"]');

      // Detect X Article link
      var isXArticle = false;
      var articleUrl = null;
      var allLinks = article.querySelectorAll('a');
      for (var j = 0; j < allLinks.length; j++) {
        var ah = (allLinks[j].getAttribute('href') || '');
        if (ah.indexOf('/article/') !== -1) {
          isXArticle = true;
          articleUrl = ah.indexOf('http') === 0 ? ah : 'https://x.com' + ah;
          break;
        }
      }

      results.push({
        id: tweetId,
        author: handle,
        text: text,
        url: url,
        replies: replies,
        retweets: retweets,
        likes: likes,
        publishedAt: publishedAt,
        isXArticle: isXArticle,
        articleUrl: articleUrl
      });
    } catch (_) {}
  }

  return JSON.stringify(results);
})();
`;

const EXTRACT_XARTICLE_JS = `
(() => {
  var titleEl = document.querySelector('article h1, article h2');
  var title = titleEl ? titleEl.textContent.trim() : '';
  var articleEl = document.querySelector('article');
  var body = articleEl ? articleEl.textContent.trim() : '';
  return JSON.stringify({ title: title, body: body });
})();
`;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

let _config = null;

function getConfig() {
  if (!_config) {
    _config = JSON.parse(
      readFileSync(join(__dirname, "..", "..", "config.json"), "utf-8")
    );
  }
  return _config;
}

function getTwitterConfig() {
  const cfg = getConfig();
  return (cfg.sources && cfg.sources.twitter_browser) || {};
}

/**
 * Run an agent-browser command synchronously.
 * Returns stdout trimmed. Throws on non-zero exit or timeout.
 * Always passes --session-name so cron-context invocations inherit the saved X login.
 */
function agent(args, timeout) {
  timeout = timeout || 30000;
  const fullArgs = ["--session-name", SESSION_NAME, ...args];
  const stdout = execFileSync("agent-browser", fullArgs, {
    timeout: timeout,
    encoding: "utf-8",
    stdio: ["pipe", "pipe", "pipe"],
    env: { ...process.env, AGENT_BROWSER_SESSION_NAME: SESSION_NAME },
    windowsHide: true,
  });
  return stdout.trim();
}

/**
 * Check whether agent-browser CLI is installed.
 * --version doesn't accept --session-name, so invoke directly.
 */
function isAgentAvailable() {
  try {
    execFileSync("agent-browser", ["--version"], {
      timeout: 5000,
      stdio: "ignore",
      windowsHide: true,
    });
    return true;
  } catch (err) {
    return false;
  }
}

// ---------------------------------------------------------------------------
// Page interaction
// ---------------------------------------------------------------------------

/**
 * Navigate to a URL, then wait for a short render buffer.
 * Catches timeouts silently so callers don't crash on slow pages.
 * Skip networkidle — X keeps polling and never goes idle.
 */
function navigateTo(url) {
  agent(["open", url], 12000);
  // Wait for actual tweet articles to render — X loads them async after
  try {
    agent(["wait", "article"], 8000);
  } catch (_) {
    try { agent(["wait", "3000"], 5000); } catch (_) {}
  }
}

/**
 * Evaluate JavaScript in the browser page context via agent-browser eval.
 * Handles agent-browser's double-encoded JSON-stringify semantics.
 */
function pageEval(js) {
  try {
    const raw = agent(["eval", js], 15000);
    return decodeEvalResult(raw);
  } catch (_) {
    return null;
  }
}

/**
 * Detect whether X is showing a login/signup wall that prevents search.
 * Checks both the current URL and the presence of signup-wall text.
 * LOGIN_CACHED: after first successful check, skip re-checking.
 */
let _loginChecked = false;

function isLoginRequired() {
  if (_loginChecked) return false;
  try {
    const url = agent(["get", "url"], 5000);
    if (url.indexOf("/i/flow/login") !== -1 || url.indexOf("login") !== -1) {
      return true;
    }
    const hasLoginWall = pageEval(
      "JSON.stringify(!!document.body.innerText.match(/Happening now|Join today|Create account|Sign in to/))"
    );
    if (hasLoginWall === "true" || hasLoginWall === true) return true;
    _loginChecked = true;
    return false;
  } catch (_) {
    _loginChecked = true;
    return false;  // assume logged in if check fails (avoid infinite retries)
  }
}

/**
 * Extract tweet data from the current search results page using eval.
 * Returns an array of tweet objects (may be empty).
 */
/**
 * Decode an agent-browser eval result. The CLI returns the result already
 * JSON-stringified, so when our eval JS itself does JSON.stringify(...), we
 * get a double-encoded string. First parse gives the inner JSON string;
 * second parse gives the object/array.
 */
function decodeEvalResult(raw) {
  let parsed = JSON.parse(raw);
  if (typeof parsed === "string") {
    try { parsed = JSON.parse(parsed); } catch (_) {}
  }
  return parsed;
}

function extractTweetsFromPage() {
  // Diagnostic probe: distinguish "page didn't load" from "extraction broke"
  try {
    const probe = agent(
      ["eval", "JSON.stringify({url: location.href, n: document.querySelectorAll('article').length})"],
      3000
    );
    console.warn("[twitter-browser] page probe: " + probe);
  } catch (_) {}

  try {
    const raw = agent(["eval", EXTRACT_TWEETS_JS], 20000);
    const tweets = decodeEvalResult(raw);
    if (!Array.isArray(tweets)) return [];
    return tweets;
  } catch (_) {
    return [];
  }
}

// ---------------------------------------------------------------------------
// X Article handling
// ---------------------------------------------------------------------------

/**
 * Navigate to an X Article URL, extract its title and full body text.
 * Opens a new tab, extracts, closes the tab, and returns content.
 * Returns { title: string, body: string } with empty strings on failure.
 */
function extractXArticleContent(articleUrl) {
  try {
    agent(["tab", "new"], 10000);
    try { agent(["wait", "500"], 3000); } catch (_) {}
    navigateTo(articleUrl);
    const content = extractXArticleBody();
    try { agent(["tab", "close"], 10000); } catch (_) {}
    return content;
  } catch (err) {
    try { agent(["tab", "close"], 5000); } catch (_) {}
    return { title: "", body: "" };
  }
}

/**
 * Extract title and body text from the current page.
 */
function extractXArticleBody() {
  try {
    const raw = agent(["eval", EXTRACT_XARTICLE_JS], 20000);
    const parsed = decodeEvalResult(raw);
    if (parsed && typeof parsed === "object") {
      return {
        title: (parsed.title || "").trim(),
        body: (parsed.body || "").trim(),
      };
    }
  } catch (_) {}
  return { title: "", body: "" };
}

// ---------------------------------------------------------------------------
// ContentItem factory
// ---------------------------------------------------------------------------

/**
 * Build a ContentItem from a raw tweet object and optional X Article content.
 */
function buildContentItem(tweet, xArticleContent) {
  let title = "";
  if (xArticleContent && xArticleContent.title) {
    title = xArticleContent.title;
  } else if (tweet.text) {
    title = tweet.text.split("\n")[0].slice(0, 120).trim();
  }

  let text = tweet.text || "";
  if (xArticleContent && xArticleContent.body && xArticleContent.body.length > text.length) {
    text = xArticleContent.body;
  }
  text = text.slice(0, 500);

  return {
    id: tweet.id,
    title: title,
    url: tweet.url,
    author: tweet.author.indexOf("@") === 0 ? tweet.author : "@" + tweet.author,
    text: text,
    published_at: tweet.publishedAt,
    source_type: "twitter",
    source_name: "Twitter",
    engagement: {
      likes: tweet.likes || 0,
      shares: tweet.retweets || 0,
      comments: tweet.replies || 0,
    },
  };
}

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------

/**
 * Fetch tweets and X Articles via browser automation.
 *
 * For each search query:
 *   1. Navigate to X search (live/latest tab)
 *   2. Detect login wall; if present, warn and stop
 *   3. Extract tweet data via page eval
 *   4. For tweets linking to X Articles, navigate and extract the article body
 *   5. Filter by lookback_hours and cap at max_tweets_per_query
 *
 * Never throws. Returns an array of ContentItem objects (possibly empty).
 *
 * @returns {Promise<Array>} Array of ContentItem objects
 */
export async function fetchTwitterBrowser() {
  // Check agent-browser availability
  if (!isAgentAvailable()) {
    console.warn(
      "[twitter-browser] agent-browser CLI not found. " +
      "Skipping Twitter browser source. Install with: npm install -g agent-browser"
    );
    return [];
  }

  const cfg = getTwitterConfig();
  const queries = cfg.search_queries || [];
  const maxPerQuery = cfg.max_tweets_per_query ?? 20;
  const lookbackHours = cfg.lookback_hours ?? 24;

  if (!queries.length) {
    console.warn("[twitter-browser] No search_queries configured in config.json sources.twitter_browser");
    return [];
  }

  // Hard overall timeout: abort after 25s to avoid blocking the scheduled scan
  let timedOut = false;
  const overallTimeout = setTimeout(() => { timedOut = true; }, 25000);

  const cutoff = new Date(Date.now() - lookbackHours * 3600000);
  const allItems = [];
  const seenIds = new Set();
  let loginDetected = false;

  for (const query of queries) {
    if (loginDetected || timedOut) break;

    const queryItems = [];

    try {
      const searchUrl =
        "https://x.com/search?q=" +
        encodeURIComponent(query) +
        "&f=live&src=typed_query";

      navigateTo(searchUrl);

      // Check for login wall before attempting extraction
      if (isLoginRequired()) {
        console.warn(
          "[twitter-browser] X requires login to search. " +
          "Log into X in a browser profile that agent-browser can reuse " +
          "(e.g. via --profile or --session-name). Skipping all queries."
        );
        loginDetected = true;
        break;
      }

      // Extract tweets from the page
      const tweets = extractTweetsFromPage();
      if (!tweets.length) {
        console.warn("[twitter-browser] No tweets found for query: " + JSON.stringify(query));
        continue;
      }

      // Process X Articles linked from these tweets
      const xArticleTweets = tweets.filter(function (t) {
        return t.isXArticle && t.articleUrl;
      });
      const xArticleCache = {};
      for (var k = 0; k < xArticleTweets.length; k++) {
        var xt = xArticleTweets[k];
        var content = extractXArticleContent(xt.articleUrl);
        xArticleCache[xt.id] = content;
      }

      // Build ContentItems, applying dedup, lookback filter, and per-query cap
      for (var m = 0; m < tweets.length; m++) {
        if (queryItems.length >= maxPerQuery) break;

        var tweet = tweets[m];
        if (seenIds.has(tweet.id)) continue;
        if (!tweet.publishedAt) continue;

        var published = new Date(tweet.publishedAt);
        if (isNaN(published.getTime()) || published < cutoff) continue;

        seenIds.add(tweet.id);

        var articleContent = xArticleCache[tweet.id] || null;
        var item = buildContentItem(tweet, articleContent);
        queryItems.push(item);
      }

      console.warn(
        "[twitter-browser] Query " + JSON.stringify(query) + ": " + queryItems.length + " items"
      );
      allItems.push.apply(allItems, queryItems);
    } catch (err) {
      console.warn(
        "[twitter-browser] Error processing query " + JSON.stringify(query) + ": " + err.message
      );
    }
  }

  // Cleanup browser
  clearTimeout(overallTimeout);
  try {
    agent(["close"], 5000);
  } catch (_) {}

  if (timedOut) console.warn("[twitter-browser] Overall timeout reached — returned early");

  return allItems;
}
