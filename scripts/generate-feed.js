const fs = require("fs");
const path = require("path");

const SITE_URL = "https://onprediction.vercel.app";
const articles = JSON.parse(
  fs.readFileSync(path.join(__dirname, "..", "articles_database.json"), "utf-8")
);

// Filter valid articles and sort by date descending
const valid = articles
  .filter((a) => a.title && a.url && a.fetch_status !== "unpublished")
  .sort((a, b) => (b.publish_date || "").localeCompare(a.publish_date || ""));

function escapeXml(s) {
  if (!s) return "";
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

const items = valid
  .map((a) => {
    const pubDate = a.publish_date
      ? new Date(a.publish_date).toUTCString()
      : "";
    return `    <item>
      <title>${escapeXml(a.title)}</title>
      <link>${escapeXml(a.url)}</link>
      <description>${escapeXml(a.editorial_blurb || "")}</description>
      ${pubDate ? `<pubDate>${pubDate}</pubDate>` : ""}
      <category>${escapeXml(a.primary_category || "")}</category>
      <guid isPermaLink="false">${SITE_URL}/?article=${a.id}</guid>
    </item>`;
  })
  .join("\n");

const rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>On Prediction</title>
    <link>${SITE_URL}</link>
    <description>Curated prediction market readings for builders, investors &amp; researchers</description>
    <language>en-us</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <atom:link href="${SITE_URL}/feed.xml" rel="self" type="application/rss+xml"/>
${items}
  </channel>
</rss>
`;

fs.writeFileSync(path.join(__dirname, "..", "public", "feed.xml"), rss);
console.log(`Generated public/feed.xml (${valid.length} articles)`);
