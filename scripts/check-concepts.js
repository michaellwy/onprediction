const articles = require("../articles_database.json");
const defs = require("../concept_definitions.json");

const allConcepts = new Set();
articles.forEach(a => (a.concepts || []).forEach(c => allConcepts.add(c)));

const defKeys = new Set(Object.keys(defs));

const missingDefs = [...allConcepts].filter(c => !defKeys.has(c)).sort();
const unusedDefs = [...defKeys].filter(k => !allConcepts.has(k)).sort();

console.log("=== Concepts in articles MISSING from concept_definitions.json ===");
if (missingDefs.length === 0) console.log("(none)");
else missingDefs.forEach(c => console.log("  - " + c));

console.log("");
console.log("=== Definitions NOT referenced by any article ===");
if (unusedDefs.length === 0) console.log("(none)");
else unusedDefs.forEach(c => console.log("  - " + c));

console.log("");
console.log("Total unique concepts in articles: " + allConcepts.size);
console.log("Total definitions: " + defKeys.size);
