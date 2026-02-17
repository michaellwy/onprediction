#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const ARTICLES_PATH = path.join(ROOT, "articles_database.json");
const DEFS_PATH = path.join(ROOT, "concept_definitions.json");

// 1. Read articles and extract all unique concepts
const articles = JSON.parse(fs.readFileSync(ARTICLES_PATH, "utf-8"));
const conceptsFromArticles = new Set();

for (const article of articles) {
  for (const raw of article.concepts) {
    const normalized = raw.replace(/^NEW:\s*/i, "").trim();
    conceptsFromArticles.add(normalized);
  }
}

// 2. Read existing definitions
let existing = {};
if (fs.existsSync(DEFS_PATH)) {
  existing = JSON.parse(fs.readFileSync(DEFS_PATH, "utf-8"));
}

// 3. Add missing concepts with empty placeholder
let newCount = 0;
for (const concept of conceptsFromArticles) {
  if (!(concept in existing)) {
    existing[concept] = "";
    newCount++;
  }
}

// 4. Sort keys alphabetically and write back
const sorted = {};
for (const key of Object.keys(existing).sort((a, b) =>
  a.localeCompare(b, undefined, { sensitivity: "base" })
)) {
  sorted[key] = existing[key];
}

fs.writeFileSync(DEFS_PATH, JSON.stringify(sorted, null, 2) + "\n");

// 5. Log summary
const total = Object.keys(sorted).length;
const defined = Object.values(sorted).filter((v) => v !== "").length;
const missing = total - defined;

console.log(
  `${total} concepts total, ${newCount} new, ${defined} defined, ${missing} missing definitions`
);
