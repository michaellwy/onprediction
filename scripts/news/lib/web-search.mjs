/**
 * Keyless web search via DuckDuckGo's HTML endpoint. Used by coverage enrichment
 * to reach top wires (Reuters, Bloomberg, AP) that limit Google News syndication
 * and so never surface in the Google News RSS results. Returns real publisher
 * URLs directly (no google-redirect resolution needed).
 *
 * Best-effort: DDG occasionally answers 202 (bot challenge); we retry a few times
 * and otherwise return []. Never throws.
 */
import { UA, decode, hostOf } from "./http.mjs";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Clean display names for outlets whose capitalized host root reads badly.
const OUTLET_NAMES = {
  "reuters.com": "Reuters", "bloomberg.com": "Bloomberg", "wsj.com": "WSJ",
  "nytimes.com": "New York Times", "ft.com": "Financial Times", "apnews.com": "AP",
  "cnbc.com": "CNBC", "npr.org": "NPR", "bbc.com": "BBC", "bbc.co.uk": "BBC",
  "theguardian.com": "The Guardian", "axios.com": "Axios", "politico.com": "Politico",
  "theblock.co": "The Block", "coindesk.com": "CoinDesk", "decrypt.co": "Decrypt",
  "businessinsider.com": "Business Insider", "markets.businessinsider.com": "Business Insider",
  "cointelegraph.com": "Cointelegraph", "theinformation.com": "The Information",
  "yahoo.com": "Yahoo Finance", "finance.yahoo.com": "Yahoo Finance", "marketwatch.com": "MarketWatch",
};

/** A presentable outlet name for a real publisher URL. */
export function outletNameFromUrl(url) {
  const host = hostOf(url).replace(/^www\./, "");
  if (OUTLET_NAMES[host]) return OUTLET_NAMES[host];
  const root = host.split(".").slice(-2, -1)[0] || host;
  return root.charAt(0).toUpperCase() + root.slice(1);
}

/**
 * Search DuckDuckGo HTML. Returns [{ url, title, source }] with REAL urls.
 * `limit` caps results; retries the 202 bot-challenge a few times.
 */
export async function ddgSearch(query, { limit = 15 } = {}) {
  const endpoint = "https://html.duckduckgo.com/html/?q=" + encodeURIComponent(query);
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const r = await fetch(endpoint, { headers: { "User-Agent": UA }, signal: AbortSignal.timeout(15000) });
      if (r.status === 202) { await sleep(600 * attempt); continue; } // bot challenge — back off + retry
      if (!r.ok) return [];
      const html = await r.text();
      const out = [];
      for (const m of html.matchAll(/class="result__a"[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/g)) {
        let url = m[1];
        const um = url.match(/[?&]uddg=([^&]+)/);
        if (um) url = decodeURIComponent(um[1]);
        if (!/^https?:\/\//.test(url)) continue;
        const title = decode(m[2].replace(/<[^>]+>/g, "")).replace(/\s+/g, " ").trim();
        if (!title) continue;
        out.push({ url, title, source: outletNameFromUrl(url) });
        if (out.length >= limit) break;
      }
      return out;
    } catch { /* retry */ }
  }
  return [];
}
