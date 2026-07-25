import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
const SITE_URL = "https://onprediction.xyz";

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 200;

function escapeXml(s) {
  if (!s) return "";
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function storyUrl(slug) {
  return `${SITE_URL}/news?story=${encodeURIComponent(slug)}`;
}

function renderRss(stories) {
  const items = stories
    .map((s) => {
      const url = storyUrl(s.slug);
      const parts = [s.summary || ""];
      if (s.why_it_matters) parts.push(`Why it matters: ${s.why_it_matters}`);
      if (s.lead_url) {
        parts.push(`Lead source: ${s.lead_source ? `${s.lead_source} — ` : ""}${s.lead_url}`);
      }
      const pubDate = s.published_at ? new Date(s.published_at).toUTCString() : "";
      return `    <item>
      <title>${escapeXml(s.headline)}</title>
      <link>${escapeXml(url)}</link>
      <guid isPermaLink="true">${escapeXml(url)}</guid>
      <description>${escapeXml(parts.filter(Boolean).join("\n\n"))}</description>
      ${pubDate ? `<pubDate>${pubDate}</pubDate>` : ""}
      ${s.primary_category ? `<category>${escapeXml(s.primary_category)}</category>` : ""}
    </item>`;
    })
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>On Prediction — News</title>
    <link>${SITE_URL}/news</link>
    <description>Curated prediction-market news — regulation, platform launches, funding and major market events.</description>
    <language>en-us</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <atom:link href="${SITE_URL}/api/news-feed" rel="self" type="application/rss+xml"/>
${items}
  </channel>
</rss>
`;
}

export default async function handler(req, res) {
  if (req.method !== "GET" && req.method !== "HEAD") {
    return res.status(405).send("Method not allowed");
  }

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    res.setHeader("Cache-Control", "no-store");
    return res.status(500).send("Feed not configured");
  }

  const limit = Math.min(
    MAX_LIMIT,
    Math.max(1, parseInt(req.query.limit, 10) || DEFAULT_LIMIT)
  );
  const category = typeof req.query.category === "string" && req.query.category ? req.query.category : null;
  const platform = typeof req.query.platform === "string" && req.query.platform ? req.query.platform : null;

  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false },
  });
  const { data, error } = await supabase.rpc("get_news_feed", {
    lim: limit,
    off: 0,
    p_category: category,
    p_tag: null,
    p_platform: platform,
  });

  if (error) {
    res.setHeader("Cache-Control", "no-store");
    return res.status(502).send("Feed temporarily unavailable");
  }

  const stories = data || [];
  res.setHeader("Cache-Control", "public, s-maxage=900, stale-while-revalidate=3600");
  res.setHeader("Access-Control-Allow-Origin", "*");

  if (req.query.format === "json") {
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    return res
      .status(200)
      .send(JSON.stringify(stories.map((s) => ({ ...s, onprediction_url: storyUrl(s.slug) }))));
  }

  res.setHeader("Content-Type", "application/rss+xml; charset=utf-8");
  return res.status(200).send(renderRss(stories));
}
