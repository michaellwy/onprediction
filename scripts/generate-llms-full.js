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

let md = `# On Prediction — Full Content Index

> A curated prediction market knowledge hub for builders, investors & researchers.
> Website: https://onprediction.vercel.app

## Articles (${valid.length} total)

`;

for (const a of valid) {
  md += `### ${a.title}\n`;
  md += `- **Author:** ${a.author || "Unknown"}\n`;
  md += `- **Date:** ${a.publish_date || "Unknown"}\n`;
  md += `- **Category:** ${a.primary_category || "Uncategorized"}\n`;
  md += `- **Difficulty:** ${a.difficulty || "None"}\n`;
  md += `- **Type:** ${a.content_type || a.source_type || "Article"}\n`;
  md += `- **URL:** ${a.url}\n`;
  if (a.concepts.length > 0) {
    md += `- **Concepts:** ${a.concepts.join(", ")}\n`;
  }
  if (a.editorial_blurb) {
    md += `\n${a.editorial_blurb}\n`;
  }
  md += "\n";
}

md += `## Concept Definitions (${Object.keys(concepts).length} concepts)\n\n`;

for (const [name, def] of Object.entries(concepts).sort(([a], [b]) =>
  a.localeCompare(b)
)) {
  md += `- **${name}:** ${def || "(no definition yet)"}\n`;
}

fs.writeFileSync(path.join(root, "public", "llms-full.txt"), md);
console.log("Generated public/llms-full.txt");
