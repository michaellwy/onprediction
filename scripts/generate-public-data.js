const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const outDir = path.join(root, "public", "api");

// Ensure public/api directory exists
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

// Articles — drop fetch_status field
const articles = JSON.parse(
  fs.readFileSync(path.join(root, "articles_database.json"), "utf-8")
);
const sanitized = articles
  .filter((a) => a.title && a.url && a.fetch_status !== "unpublished")
  .map(({ fetch_status, ...rest }) => rest);

fs.writeFileSync(
  path.join(outDir, "articles.json"),
  JSON.stringify(sanitized, null, 2)
);
console.log(`Generated public/api/articles.json (${sanitized.length} articles)`);

// Concepts
const concepts = fs.readFileSync(
  path.join(root, "concept_definitions.json"),
  "utf-8"
);
fs.writeFileSync(path.join(outDir, "concepts.json"), concepts);
console.log("Generated public/api/concepts.json");
