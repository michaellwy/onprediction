/**
 * Google News RSS fetcher for the news pipeline.
 * Normalized item shape (shared by all sources):
 *   { id, title, url, source, source_type, published_at, broke_day, text }
 */

import { UA, djb2, hostOf, ymd, decode, fetchText } from "./http.mjs";

// Re-export for back-compat with modules that imported these from here.
export { djb2, hostOf };

// Queries that define the prediction-market news surface.
const QUERIES = ['"prediction market"', "Polymarket", "Kalshi"];

const GN_BASE = "https://news.google.com/rss/search";
const gnUrl = (q) => `${GN_BASE}?q=${encodeURIComponent(q)}&hl=en-US&gl=US&ceid=US:en`;

// Normalize a parsed Google News RSS entry into the shared item shape. Google
// appends " - Outlet" to titles; strip it into `source`.
function toItem(it, broke_day) {
  const m = it.title.match(/^(.*) - ([^-]+)$/);
  return {
    id: djb2(it.link),
    title: m ? m[1] : it.title,
    url: it.link,
    source: it.source || (m ? m[2].trim() : ""),
    source_type: "press",
    published_at: it.pubDate ? Date.parse(it.pubDate) : null,
    broke_day,
    text: "",
  };
}

function parseGoogleRss(xml) {
  const out = [];
  for (const b of xml.split(/<item\b/i).slice(1)) {
    const seg = b.slice(0, b.search(/<\/item>/i));
    const pick = (t) => {
      const m = seg.match(new RegExp(`<${t}[^>]*>([\\s\\S]*?)</${t}>`, "i"));
      return m ? decode(m[1].replace(/<!\[CDATA\[|\]\]>/g, "").trim()) : "";
    };
    out.push({ title: pick("title"), link: pick("link"), pubDate: pick("pubDate"), source: pick("source") });
  }
  return out;
}

/**
 * Fetch recent Google News items for the prediction-market surface in RELEVANCE
 * mode (no date operators), then filter client-side to the last `days` days.
 *
 * Why relevance mode: adding after:/before: operators flips Google News from
 * relevance ranking to a recency dump that surfaces the promo-code / single-game
 * odds-churn long tail (~64% junk vs ~20% for a plain relevance query on the
 * same term/window — measured). This mirrors the clean results the Google News
 * website shows. The ~100-result-per-query cap is irrelevant here: genuine
 * industry news always ranks well inside the top 100; the tail we forgo is spam.
 * The backfill (fetchGoogleNewsRange) still uses per-day windowing because
 * reaching back weeks genuinely needs to beat the cap.
 */
export async function fetchGoogleNews(days = 2) {
  const cutoff = Date.now() - days * 864e5;
  const items = [];
  for (const q of QUERIES) {
    try {
      for (const it of parseGoogleRss(await fetchText(gnUrl(q), { "User-Agent": UA }))) {
        if (!it.link || !it.title) continue;
        const ts = it.pubDate ? Date.parse(it.pubDate) : null;
        if (ts && !Number.isNaN(ts) && ts < cutoff) continue; // older than the window
        const broke_day = ts && !Number.isNaN(ts) ? ymd(new Date(ts)) : ymd(new Date());
        items.push(toItem(it, broke_day));
      }
    } catch (e) {
      console.error(`  google_news "${q}" failed: ${e.message}`);
    }
  }
  return items;
}

/**
 * Fetch Google News across an explicit inclusive date range [startYmd, endYmd].
 * Used by the backfill to seed the site.
 */
export async function fetchGoogleNewsRange(startYmd, endYmd) {
  const dayList = [];
  const d = new Date(startYmd + "T00:00:00Z");
  const end = new Date(endYmd + "T00:00:00Z");
  while (d <= end) { dayList.push(ymd(d)); d.setUTCDate(d.getUTCDate() + 1); }
  return fetchGoogleNewsDays(dayList);
}

async function fetchGoogleNewsDays(dayList) {
  const items = [];
  for (let di = 0; di < dayList.length; di++) {
    const day = dayList[di];
    const dayAfter = new Date(day + "T00:00:00Z"); dayAfter.setUTCDate(dayAfter.getUTCDate() + 1);
    const next = dayList[di + 1] || ymd(dayAfter);
    for (const q of QUERIES) {
      const gq = `${q} after:${day} before:${next}`;
      try {
        for (const it of parseGoogleRss(await fetchText(gnUrl(gq), { "User-Agent": UA }))) {
          if (!it.link || !it.title) continue;
          items.push(toItem(it, day));
        }
      } catch (e) {
        console.error(`  google_news "${gq}" failed: ${e.message}`);
      }
    }
  }
  return items;
}
