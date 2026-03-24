const fs = require("fs");
const path = require("path");

const SITE_URL = "https://onprediction.xyz";
const concepts = require("../concept_definitions.json");

function conceptNameToSlug(name) {
  return name
    .toLowerCase()
    .replace(/[()]/g, "")
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

const conceptPages = Object.keys(concepts).map((name) => ({
  loc: `/concepts/${conceptNameToSlug(name)}`,
  changefreq: "monthly",
  priority: "0.6",
}));

const pages = [
  { loc: "/", changefreq: "weekly", priority: "1.0" },
  { loc: "/concepts", changefreq: "monthly", priority: "0.8" },
  { loc: "/forum", changefreq: "daily", priority: "0.7" },
  ...conceptPages,
];

const today = new Date().toISOString().split("T")[0];

const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${pages
  .map(
    (p) => `  <url>
    <loc>${SITE_URL}${p.loc}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>${p.changefreq}</changefreq>
    <priority>${p.priority}</priority>
  </url>`
  )
  .join("\n")}
</urlset>
`;

fs.writeFileSync(path.join(__dirname, "..", "public", "sitemap.xml"), xml);
console.log("Generated public/sitemap.xml");
