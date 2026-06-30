/**
 * Resolve Google News redirect URLs to the real publisher URL and fetch the
 * article body text, so the analyzer can write specific, fact-rich bullets.
 * All best-effort: on any failure returns { url, text: "" } and the pipeline
 * falls back to headline-only.
 */

import { UA, decode } from "./http.mjs";

/** Resolve a news.google.com/rss/articles/<enc> URL to the real article URL. */
export async function decodeGoogleNewsUrl(url) {
  const r = await fetch(url, { headers: { "User-Agent": UA }, signal: AbortSignal.timeout(15000) });
  const html = await r.text();
  const id = html.match(/data-n-a-id="([^"]+)"/)?.[1];
  const sig = html.match(/data-n-a-sg="([^"]+)"/)?.[1];
  const ts = html.match(/data-n-a-ts="([^"]+)"/)?.[1];
  if (!id || !sig || !ts) throw new Error("redirect markers missing");
  const inner = `["garturlreq",[["X","X",["X","X"],null,null,1,1,"US:en",null,1,null,null,null,null,null,0,1],"X","X",1,[1,1,1],1,1,null,0,0,null,0],"${id}",${ts},"${sig}"]`;
  const body = "f.req=" + encodeURIComponent(JSON.stringify([[["Fbv4je", inner, null, "generic"]]]));
  const resp = await fetch("https://news.google.com/_/DotsSplashUi/data/batchexecute", {
    method: "POST",
    headers: { "User-Agent": UA, "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8" },
    body, signal: AbortSignal.timeout(15000),
  });
  const txt = await resp.text();
  const m = txt.match(/https?:\/\/[^"\\]+/);
  if (!m) throw new Error("no url in response");
  return m[0];
}

function extractText(html) {
  return decode(
    html
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
      .replace(/<[^>]+>/g, " ")
  ).replace(/\s+/g, " ").trim();
}

/**
 * The article's OWN publication date, read from the page — JSON-LD datePublished,
 * the standard article/og meta tags, or a <time datetime>. Returns ms epoch, or
 * null if none found / unparseable. Prefer this over the Google News index time,
 * which is the syndication moment rather than the byline date.
 */
function extractPublishedDate(html) {
  const head = html.slice(0, 60000); // dates live in <head>/early JSON-LD
  const patterns = [
    /"datePublished"\s*:\s*"([^"]+)"/i,
    /<meta[^>]+property=["'](?:article:published_time|og:published_time)["'][^>]+content=["']([^"']+)["']/i,
    /<meta[^>]+content=["']([^"']+)["'][^>]+property=["'](?:article:published_time|og:published_time)["']/i,
    /<meta[^>]+itemprop=["']datePublished["'][^>]+content=["']([^"']+)["']/i,
    /<meta[^>]+name=["'](?:parsely-pub-date|publishdate|pubdate|date|sailthru\.date)["'][^>]+content=["']([^"']+)["']/i,
    /<time[^>]+datetime=["']([^"']+)["']/i,
  ];
  for (const re of patterns) {
    const m = head.match(re);
    if (m) {
      const t = Date.parse(m[1]);
      // Sanity window: a real article date, not a bogus 1970 or far-future value.
      if (!Number.isNaN(t) && t > Date.parse("2000-01-01") && t < Date.now() + 864e5) return t;
    }
  }
  return null;
}

/**
 * The article's canonical headline, read from og:title / twitter:title (the clean
 * publisher headline — preferred over a feed title, which some sources truncate
 * with an ellipsis). Returns "" if neither tag is present. The <title> tag is NOT
 * used as a fallback: it usually carries a " | Site" suffix that would need fragile
 * stripping, and a truncated feed title is better kept than a mangled one.
 */
function extractTitle(html) {
  const head = html.slice(0, 60000);
  const patterns = [
    /<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i,
    /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:title["']/i,
    /<meta[^>]+name=["']twitter:title["'][^>]+content=["']([^"']+)["']/i,
  ];
  for (const re of patterns) {
    const m = head.match(re);
    if (m && m[1].trim()) {
      let s = decode(m[1].replace(/\s+/g, " ").trim());
      // Strip a trailing " | Site" / " - Site" suffix some publishers append to
      // og:title (the outlet is already shown separately). Conservative: only a
      // short tail with no sentence punctuation, so real titles stay intact.
      s = s.replace(/\s*[|–—-]\s*[^|–—]{1,30}$/, (suf) => (/[.!?:]/.test(suf) ? suf : "")).trim() || s;
      return s;
    }
  }
  return "";
}

/** A feed title that arrived cropped (trailing ellipsis). */
export function isTruncatedTitle(t) {
  return !!t && /(\.\.\.|…|\s\.\.)\s*$/.test(t.trim());
}

/**
 * Get { url, text, published, title } for a story link. Resolves Google News
 * redirects first. `published` is the article's own publish date (ms epoch) read
 * from the page, or null; `title` is the canonical og:title (or ""). Returns
 * text "" if blocked/paywalled/unparseable.
 */
export async function fetchArticleText(link) {
  let url = link;
  try {
    if (/news\.google\.com\/rss\/articles\//.test(link)) url = await decodeGoogleNewsUrl(link);
  } catch { /* keep original */ }
  try {
    const r = await fetch(url, { headers: { "User-Agent": UA }, redirect: "follow", signal: AbortSignal.timeout(15000) });
    if (!r.ok) return { url, text: "", published: null, title: "" };
    const html = await r.text();
    const published = extractPublishedDate(html);
    const title = extractTitle(html);
    const text = extractText(html);
    // Keep enough to capture background paragraphs (prior rounds, context, etc.)
    return { url, text: text.length > 200 ? text.slice(0, 6000) : "", published, title };
  } catch {
    return { url, text: "", published: null, title: "" };
  }
}

/** Run async fn over items with limited concurrency. */
export async function mapPool(items, limit, fn) {
  const out = new Array(items.length);
  let i = 0;
  async function worker() {
    while (i < items.length) {
      const idx = i++;
      out[idx] = await fn(items[idx], idx);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return out;
}
