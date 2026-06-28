/**
 * Shared HTTP + RSS helpers for the news pipeline sources.
 * Dependency-free (native fetch + regex XML parse).
 */

export const UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36";

export function djb2(str) {
  let h = 5381;
  for (let i = 0; i < str.length; i++) h = ((h << 5) + h + str.charCodeAt(i)) >>> 0;
  return h.toString(36);
}

export function hostOf(url) {
  try { return new URL(url).hostname.replace(/^www\./, ""); } catch { return ""; }
}

export const ymd = (d) => d.toISOString().slice(0, 10);

export function decode(s) {
  return s
    .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, d) => String.fromCharCode(+d));
}

export async function fetchText(url, headers = {}) {
  const r = await fetch(url, { headers: { "User-Agent": UA, ...headers }, signal: AbortSignal.timeout(20000) });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.text();
}

export async function fetchJson(url, headers = {}) {
  const r = await fetch(url, { headers: { "User-Agent": UA, Accept: "application/json", ...headers }, signal: AbortSignal.timeout(20000) });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.json();
}

/** Parse RSS/Atom <item>/<entry> blocks into {title, link, pubDate, source, text}. */
export function parseRss(xml) {
  const out = [];
  const blocks = xml.split(/<item\b|<entry\b/i).slice(1);
  for (const b of blocks) {
    const seg = b.slice(0, b.search(/<\/item>|<\/entry>/i));
    const pick = (t) => {
      const m = seg.match(new RegExp(`<${t}[^>]*>([\\s\\S]*?)</${t}>`, "i"));
      return m ? decode(m[1].replace(/<!\[CDATA\[|\]\]>/g, "").trim()) : "";
    };
    // Atom <link href="..."/> fallback
    let link = pick("link");
    if (!link) { const m = seg.match(/<link[^>]*href="([^"]+)"/i); if (m) link = decode(m[1]); }
    out.push({
      title: pick("title"),
      link,
      pubDate: pick("pubDate") || pick("published") || pick("updated") || pick("dc:date"),
      source: pick("source"),
      text: (pick("description") || pick("content:encoded") || pick("summary") || "").replace(/<[^>]+>/g, " ").slice(0, 400),
    });
  }
  return out;
}
