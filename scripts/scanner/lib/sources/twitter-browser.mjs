/**
 * Twitter/X content source with three-tier fallback:
 *   1. agent-browser CLI (saved X session, highest yield — returns recent tweets)
 *   2. Firecrawl v2 API (search + scrape; works when credits available)
 *   3. ddgs (DuckDuckGo via Python library, free, no key) — last resort
 *
 * Tier 1 is the only path that reliably returns tweets within the lookback
 * window (Firecrawl free-tier credits exhaust quickly; DDG doesn't index
 * recent tweets deeply). Tier 2/3 activate when agent-browser is unavailable
 * or X requires login.
 *
 * Reads config from config.json sources.twitter_browser:
 *   - search_queries: array of search queries
 *   - max_tweets_per_query: cap per query (default 20)
 *   - lookback_hours: filter by recency (default 24)
 */

import { readFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import https from "https";
import { execFile } from "child_process";
import { promisify } from "util";

const execFileAsync = promisify(execFile);
const __dirname = dirname(fileURLToPath(import.meta.url));
const FIRECRAWL_HOST = "api.firecrawl.dev";
const FIRECRAWL_PATH = "/v2";
const SESSION_NAME = process.env.AGENT_BROWSER_SESSION_NAME || "onprediction-x";
// Hermes installs agent-browser under its own venv — fall back to PATH otherwise.
const HERMES_AGENT_BROWSER = "/usr/local/lib/hermes-agent/node_modules/.bin/agent-browser";

// ---------------------------------------------------------------------------
// Config
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

// ---------------------------------------------------------------------------
// Tier 1: agent-browser (X search via saved session)
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

/** Resolve the agent-browser binary (hermes venv first, then PATH). */
function resolveAgentBinary() {
  if (existsSync(HERMES_AGENT_BROWSER)) return HERMES_AGENT_BROWSER;
  return "agent-browser";
}

/**
 * Run an agent-browser command asynchronously.
 * Returns stdout trimmed. Throws on non-zero exit or timeout.
 * Always passes --session-name so cron-context invocations inherit the saved X login.
 */
async function agent(args, timeout) {
  timeout = timeout || 30000;
  const fullArgs = ["--session-name", SESSION_NAME, ...args];
  const { stdout } = await execFileAsync(resolveAgentBinary(), fullArgs, {
    timeout: timeout,
    encoding: "utf-8",
    maxBuffer: 8 * 1024 * 1024,
    env: { ...process.env, AGENT_BROWSER_SESSION_NAME: SESSION_NAME },
    windowsHide: true,
  });
  return stdout.trim();
}

/** Check whether agent-browser CLI is installed. */
async function isAgentAvailable() {
  try {
    await execFileAsync(resolveAgentBinary(), ["--version"], {
      timeout: 5000,
      encoding: "utf-8",
    });
    return true;
  } catch (err) {
    return false;
  }
}

/** Navigate to a URL, then wait for tweet articles to render. */
async function navigateTo(url) {
  await agent(["open", url], 12000);
  try {
    await agent(["wait", "article"], 8000);
  } catch (_) {
    try { await agent(["wait", "3000"], 5000); } catch (_) {}
  }
}

/** Evaluate JavaScript in the browser page context. Returns null on failure. */
async function pageEval(js) {
  try {
    const raw = await agent(["eval", js], 15000);
    return decodeEvalResult(raw);
  } catch (_) {
    return null;
  }
}

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

/**
 * Detect whether X is showing a login/signup wall that prevents search.
 * Cached after first successful check.
 */
let _loginChecked = false;

async function isLoginRequired() {
  if (_loginChecked) return false;
  try {
    const url = await agent(["get", "url"], 5000);
    if (url.indexOf("/i/flow/login") !== -1 || url.indexOf("login") !== -1) {
      return true;
    }
    const hasLoginWall = await pageEval(
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

/** Extract tweet data from the current search results page. */
async function extractTweetsFromPage() {
  try {
    const raw = await agent(["eval", EXTRACT_TWEETS_JS], 20000);
    const tweets = decodeEvalResult(raw);
    if (!Array.isArray(tweets)) return [];
    return tweets;
  } catch (_) {
    return [];
  }
}

/** Navigate to an X Article URL, extract title + body, close the tab. */
async function extractXArticleContent(articleUrl) {
  try {
    await agent(["tab", "new"], 10000);
    try { await agent(["wait", "500"], 3000); } catch (_) {}
    await navigateTo(articleUrl);
    const content = await extractXArticleBody();
    try { await agent(["tab", "close"], 10000); } catch (_) {}
    return content;
  } catch (err) {
    try { await agent(["tab", "close"], 5000); } catch (_) {}
    return { title: "", body: "" };
  }
}

/** Extract title and body text from the current page. */
async function extractXArticleBody() {
  try {
    const raw = await agent(["eval", EXTRACT_XARTICLE_JS], 20000);
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

/** Build a ContentItem from a raw tweet object and optional X Article content. */
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

/**
 * Tier 1: fetch tweets via agent-browser (saved X session).
 * Never throws. Returns { status: "ok"|"login"|"unavailable", items }.
 */
async function fetchViaAgentBrowser() {
  if (!(await isAgentAvailable())) {
    console.warn("[twitter-browser] agent-browser CLI not found — Tier 1 unavailable");
    return { status: "unavailable", items: [] };
  }

  const cfg = getTwitterConfig();
  const queries = cfg.search_queries || [];
  const maxPerQuery = cfg.max_tweets_per_query ?? 20;
  const lookbackHours = cfg.lookback_hours ?? 24;

  if (!queries.length) {
    console.warn("[twitter-browser] No search_queries configured in config.json sources.twitter_browser");
    return { status: "ok", items: [] };
  }

  // Hard overall deadline so the browser tier can never hang the scheduled scan
  const deadline = Date.now() + 150000; // 2.5 min
  const cutoff = new Date(Date.now() - lookbackHours * 3600000);
  const allItems = [];
  const seenIds = new Set();
  let loginDetected = false;

  for (const query of queries) {
    if (loginDetected || Date.now() > deadline) break;

    const queryItems = [];

    try {
      const searchUrl =
        "https://x.com/search?q=" +
        encodeURIComponent(query) +
        "&f=live&src=typed_query";

      await navigateTo(searchUrl);

      // Check for login wall before attempting extraction
      if (await isLoginRequired()) {
        console.warn(
          "[twitter-browser] X requires login to search. " +
          "Log into X in a browser profile that agent-browser can reuse " +
          "(e.g. via --profile or --session-name). Skipping all queries."
        );
        loginDetected = true;
        break;
      }

      // Extract tweets from the page
      const tweets = await extractTweetsFromPage();
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
        if (Date.now() > deadline) break;
        var xt = xArticleTweets[k];
        var content = await extractXArticleContent(xt.articleUrl);
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
  try {
    await agent(["close"], 5000);
  } catch (_) {}

  if (Date.now() > deadline) {
    console.warn("[twitter-browser] Overall deadline reached — returned early");
  }

  return { status: loginDetected ? "login" : "ok", items: allItems };
}

// ---------------------------------------------------------------------------
// Tier 2/3: Firecrawl v2 API with ddgs fallback
// ---------------------------------------------------------------------------

/** HTTPS request helper (avoids Node fetch bugs in module context). */
function httpsRequest(method, pathname, bodyData, timeoutMs) {
  return new Promise((resolve, reject) => {
    const body = bodyData ? JSON.stringify(bodyData) : null;
    const apiKey = process.env.FIRECRAWL_API_KEY;

    const options = {
      hostname: FIRECRAWL_HOST,
      path: FIRECRAWL_PATH + pathname,
      method,
      headers: {
        "Content-Type": "application/json",
      },
      timeout: timeoutMs || 15000,
    };

    if (apiKey) {
      options.headers["Authorization"] = `Bearer ${apiKey}`;
    }

    if (body) {
      options.headers["Content-Length"] = Buffer.byteLength(body);
    }

    const req = https.request(options, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(data) });
        } catch {
          resolve({ status: res.statusCode, body: data });
        }
      });
    });

    req.on("error", (err) => reject(err));
    req.on("timeout", () => {
      req.destroy();
      reject(new Error("Request timeout"));
    });

    if (body) req.write(body);
    req.end();
  });
}

/** Search Firecrawl for X.com content matching a query. */
async function firecrawlSearch(searchQuery, limit) {
  const { status, body } = await httpsRequest("POST", "/search", {
    query: `site:x.com ${searchQuery}`,
    limit: Math.min(limit, 20),
  });

  if (status !== 200) {
    const msg = typeof body === "object" ? JSON.stringify(body) : String(body);
    throw new Error(`Firecrawl search returned ${status}: ${msg}`);
  }

  return (body.data && body.data.web) || [];
}

/** Scrape an individual X.com tweet URL via Firecrawl for rich metadata. */
async function firecrawlScrape(tweetUrl) {
  try {
    const { status, body } = await httpsRequest("POST", "/scrape", {
      url: tweetUrl,
    }, 20000);

    if (status !== 200) return null;
    return body.data || null;
  } catch {
    return null;
  }
}

/** Fallback search using ddgs Python library (no API key, works from VPS). */
async function ddgsSearch(searchQuery, limit) {
  const safeQuery = searchQuery.replace(/'/g, "'\\''");
  const script = [
    "import sys, json;",
    "from ddgs import DDGS;",
    "try:",
    "  with DDGS() as ddgs:",
    `    results = list(ddgs.text('site:x.com ${safeQuery}', max_results=${limit}));`,
    "    out = [];",
    '    for r in results:',
    "      url = r.get('link', r.get('href', ''));",
    "      if '/status/' in url:",
    "        out.append({'url': url, 'title': r.get('title', ''), 'description': r.get('body', '')});",
    "    print(json.dumps(out));",
    "except Exception as e:",
    "    print(json.dumps({'error': str(e)}));",
    "    sys.exit(1);",
  ].join("\n");

  try {
    const { stdout } = await execFileAsync("python3", ["-c", script], {
      timeout: 15000,
      maxBuffer: 1024 * 1024,
      encoding: "utf-8",
    });
    const parsed = JSON.parse(stdout.trim());
    if (parsed.error) throw new Error(parsed.error);
    return parsed;
  } catch (err) {
    throw new Error(`ddgs search failed: ${err.message}`);
  }
}

/** Twitter Snowflakes encode the creation time in bits 22+. Epoch: 2010-11-04. */
const TWITTER_EPOCH = 1288834974657;

function snowflakeToDate(tweetId) {
  const id = BigInt(tweetId);
  return new Date(Number(id >> 22n) + TWITTER_EPOCH);
}

/** Derive a tweet's publishedAt from the Snowflake ID. Returns ISO string or null. */
function derivePublishedAt(tweetId) {
  try {
    const d = snowflakeToDate(tweetId);
    if (isNaN(d.getTime())) return null;
    if (d.getTime() < TWITTER_EPOCH || d.getTime() > Date.now() + 86400000) return null;
    return d.toISOString();
  } catch {
    return null;
  }
}

/** Parse tweet data from a Firecrawl search result as fallback. */
function parseSearchResult(item) {
  const url = item.url || "";
  const idMatch = url.match(/\/status\/(\d+)/);
  if (!idMatch) return null;

  const handleMatch = url.match(/x\.com\/(\w+)\/status/);
  const author = handleMatch ? handleMatch[1] : "";

  let publishedAt = null;
  if (item.date) {
    publishedAt = item.date;
  } else if (item.description) {
    const dateMatch = item.description.match(/Posted:\s*([^\n]+)/i);
    if (dateMatch) publishedAt = dateMatch[1].trim();
  }
  if (!publishedAt) {
    publishedAt = derivePublishedAt(idMatch[1]);
  }

  return {
    id: idMatch[1],
    author: author,
    text: item.description || "",
    url: url,
    likes: 0,
    retweets: 0,
    publishedAt: publishedAt,
  };
}

/** Build a ContentItem from a ddgs/Firecrawl search tweet object. */
function buildSearchContentItem(tweet) {
  let title = tweet.text ? tweet.text.split("\n")[0].slice(0, 120).trim() : "";
  let text = (tweet.text || "").slice(0, 500);

  return {
    id: tweet.id,
    title: title,
    url: tweet.url,
    author: tweet.author
      ? tweet.author.indexOf("@") === 0
        ? tweet.author
        : "@" + tweet.author
      : "",
    text: text,
    published_at: tweet.publishedAt,
    source_type: "twitter",
    source_name: "Twitter",
    engagement: {
      likes: tweet.likes || 0,
      shares: tweet.retweets || 0,
      comments: 0,
    },
  };
}

/**
 * Tier 2/3: fetch tweets via Firecrawl v2, falling back to ddgs on ANY
 * Firecrawl failure (429 rate limit, 402 insufficient credits, 401, timeouts).
 * Never throws. Returns an array of ContentItem objects (possibly empty).
 */
async function fetchViaFirecrawl() {
  const cfg = getTwitterConfig();
  const queries = cfg.search_queries || [];
  const maxPerQuery = cfg.max_tweets_per_query ?? 20;
  const lookbackHours = cfg.lookback_hours ?? 24;

  if (!queries.length) return [];

  const cutoff = new Date(Date.now() - lookbackHours * 3600000);
  const allItems = [];
  const seenIds = new Set();
  let usedFallback = false;

  for (const query of queries) {
    if (allItems.length >= maxPerQuery) break;

    let results;
    try {
      results = await firecrawlSearch(query, maxPerQuery * 2);
      console.warn(
        `[twitter-firecrawl] Query "${query}": ${results.length} search results`
      );
    } catch (err) {
      // Any Firecrawl failure → ddgs. Free, no key, works from VPS IPs.
      console.warn(`[twitter-firecrawl] Search failed for "${query}": ${err.message} — using ddgs`);
      usedFallback = true;
      try {
        results = await ddgsSearch(query, maxPerQuery * 2);
        console.warn(
          `[twitter-firecrawl] ddgs fallback for "${query}": ${results.length} results`
        );
      } catch (ddgsErr) {
        console.warn(`[twitter-firecrawl] ddgs fallback also failed for "${query}": ${ddgsErr.message}`);
        continue;
      }
    }

    // Filter to individual tweet URLs (/status/)
    const tweetUrls = results
      .map((r) => r.url || "")
      .filter((u) => u.includes("/status/"))
      .slice(0, maxPerQuery);

    // Scrape individual tweets for rich data (skip when using ddgs fallback — no Firecrawl credits left)
    const resultsMap = new Map(results.map((r) => [r.url, r]));
    let scrapedTweets;
    if (usedFallback) {
      scrapedTweets = tweetUrls.map((url) => {
        const searchItem = resultsMap.get(url);
        const parsed = searchItem ? parseSearchResult(searchItem) : null;
        if (parsed && !parsed.publishedAt) {
          parsed.publishedAt = derivePublishedAt(parsed.id);
        }
        if (parsed) return parsed;
        const idMatch = url.match(/\/status\/(\d+)/);
        const handleMatch = url.match(/x\.com\/(\w+)\/status/);
        if (!idMatch) return null;
        return {
          id: idMatch[1],
          author: handleMatch ? handleMatch[1] : "",
          text: (searchItem && searchItem.title) || "",
          url,
          likes: 0,
          retweets: 0,
          publishedAt: derivePublishedAt(idMatch[1]),
        };
      }).filter(Boolean);
    } else {
      const scrapePromises = tweetUrls.map(async (url) => {
        try {
          const scrapeData = await firecrawlScrape(url);
          const parsed = parseTweetScrape(scrapeData);
          if (parsed) return parsed;

          const searchItem = resultsMap.get(url);
          return searchItem ? parseSearchResult(searchItem) : null;
        } catch {
          const searchItem = resultsMap.get(url);
          return searchItem ? parseSearchResult(searchItem) : null;
        }
      });
      scrapedTweets = (await Promise.all(scrapePromises)).filter(Boolean);
    }

    // Build ContentItems with dedup + lookback filter
    for (const tweet of scrapedTweets) {
      if (seenIds.has(tweet.id)) continue;
      if (allItems.length >= maxPerQuery) break;

      if (!tweet.publishedAt) continue;
      const published = new Date(tweet.publishedAt);
      if (isNaN(published.getTime()) || published < cutoff) continue;

      seenIds.add(tweet.id);
      allItems.push(buildSearchContentItem(tweet));
    }
  }

  if (usedFallback) {
    console.warn(
      `[twitter-firecrawl] Used ddgs fallback (Firecrawl failed). ` +
      `Total: ${allItems.length} items`
    );
  }

  console.warn(`[twitter-firecrawl] Total: ${allItems.length} items`);
  return allItems;
}

/** Parse Firecrawl scrape markdown into a structured tweet object. */
function parseTweetScrape(scrapeData) {
  if (!scrapeData || !scrapeData.markdown) return null;

  const md = scrapeData.markdown;

  const urlMatch = md.match(/URL:\s*(https?:\/\/[^\s]+)/);
  const url = urlMatch ? urlMatch[1].replace(/\\/g, "") : "";

  const idMatch = url.match(/\/status\/(\d+)/);
  if (!idMatch) return null;
  const tweetId = idMatch[1];

  const authorMatch = md.match(/@(\w+)/);
  const handle = authorMatch ? authorMatch[1] : "";

  const tsMatch = md.match(/Posted:\s*([^\n]+)/);
  const publishedAt = tsMatch ? tsMatch[1].trim() : derivePublishedAt(tweetId);

  const likesMatch = md.match(/Likes:\s*([\d,.]+)/);
  const retweetsMatch = md.match(/Retweets:\s*([\d,.]+)/);
  const likes = likesMatch ? parseInt(likesMatch[1].replace(/,/g, "")) || 0 : 0;
  const retweets = retweetsMatch ? parseInt(retweetsMatch[1].replace(/,/g, "")) || 0 : 0;

  const textMatch = md.match(/## Post\n+([\s\S]*)/);
  let text = textMatch ? textMatch[1].trim() : "";

  text = text.replace(/\\([#_*\[\]()])/g, "$1");

  const junkIdx = text.search(/\n\nSee new posts|Sign up|Get the app/i);
  if (junkIdx > 0) text = text.slice(0, junkIdx).trim();

  return {
    id: tweetId,
    author: handle,
    text: text,
    url: url,
    likes: likes,
    retweets: retweets,
    publishedAt: publishedAt,
  };
}

// ---------------------------------------------------------------------------
// Main export — tiered dispatcher
// ---------------------------------------------------------------------------

/**
 * Fetch tweets from X.com.
 * Tier 1: agent-browser (saved session). If it runs successfully, trust its
 * result (even 0 items — ddgs/Firecrawl won't do better for recency).
 * If the browser tier is unavailable or X requires login, fall back to
 * Firecrawl → ddgs.
 *
 * Never throws. Returns an array of ContentItem objects (possibly empty).
 *
 * @returns {Promise<Array>} Array of ContentItem objects
 */
export async function fetchTwitterBrowser() {
  const browserResult = await fetchViaAgentBrowser();

  if (browserResult.status === "ok") {
    return browserResult.items;
  }

  if (browserResult.status === "login") {
    console.warn("[twitter-browser] X login required — falling back to Firecrawl/ddgs");
  } else {
    console.warn("[twitter-browser] agent-browser unavailable — falling back to Firecrawl/ddgs");
  }

  return fetchViaFirecrawl();
}
