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
 * Get { url, text } for a story link. Resolves Google News redirects first.
 * Returns text "" if blocked/paywalled/unparseable.
 */
export async function fetchArticleText(link) {
  let url = link;
  try {
    if (/news\.google\.com\/rss\/articles\//.test(link)) url = await decodeGoogleNewsUrl(link);
  } catch { /* keep original */ }
  try {
    const r = await fetch(url, { headers: { "User-Agent": UA }, redirect: "follow", signal: AbortSignal.timeout(15000) });
    if (!r.ok) return { url, text: "" };
    const text = extractText(await r.text());
    // Keep enough to capture background paragraphs (prior rounds, context, etc.)
    return { url, text: text.length > 200 ? text.slice(0, 6000) : "" };
  } catch {
    return { url, text: "" };
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
