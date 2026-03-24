const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");

const articles = JSON.parse(
  fs.readFileSync(path.join(root, "articles_database.json"), "utf-8")
);
const concepts = JSON.parse(
  fs.readFileSync(path.join(root, "concept_definitions.json"), "utf-8")
);

const valid = articles
  .filter((a) => a.title && a.url && a.fetch_status !== "unpublished")
  .sort((a, b) => (b.publish_date || "").localeCompare(a.publish_date || ""));

const context = {
  articles: valid.map((a) => ({
    id: a.id,
    title: a.title,
    author: a.author || "Unknown",
    url: a.url,
    date: a.publish_date || null,
    category: a.primary_category || null,
    difficulty: a.difficulty || null,
    type: a.content_type || a.source_type || "Article",
    concepts: a.concepts || [],
    blurb: a.editorial_blurb || null,
  })),
  concepts: Object.fromEntries(
    Object.entries(concepts)
      .filter(([, def]) => def)
      .sort(([a], [b]) => a.localeCompare(b))
  ),
};

const outDir = path.join(root, "public", "api");
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

fs.writeFileSync(
  path.join(outDir, "ask-context.json"),
  JSON.stringify(context, null, 0)
);
console.log(
  `Generated public/api/ask-context.json (${valid.length} articles, ${Object.keys(context.concepts).length} concepts)`
);
