/**
 * arXiv API content source.
 * Searches for recent prediction market research papers via the arXiv API.
 * Returns ContentItem[].
 */

import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ARXIV_API_BASE = "https://export.arxiv.org/api/query";

// arXiv's all: search is permissive — even narrow queries like "polymarket" can
// surface unrelated papers. Require an explicit PM keyword in title+abstract.
const ARXIV_PM_KEYWORDS = [
  "prediction market", "prediction markets",
  "polymarket", "kalshi", "metaculus", "manifold", "augur",
  "futarchy", "information aggregation market",
  "event contract", "decision market", "outcome market",
];

function isArxivPMRelevant(title, summary) {
  const hay = `${title} ${summary}`.toLowerCase();
  return ARXIV_PM_KEYWORDS.some(kw => hay.includes(kw));
}

/**
 * Fetch papers from arXiv for configured queries.
 * @returns {Promise<Array<ContentItem>>}
 */
export async function fetchArxiv() {
  const config = JSON.parse(
    readFileSync(join(__dirname, "..", "..", "config.json"), "utf-8")
  );
  const { queries = [], max_results: maxResults = 10, lookback_days: lookbackDays = 7 } =
    config.sources.arxiv || {};

  if (!queries.length) return [];

  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - lookbackDays);

  const seenIds = new Set();
  const results = [];

  for (const query of queries) {
    if (results.length >= maxResults) break;

    let xml;
    try {
      const url =
        `${ARXIV_API_BASE}?search_query=all:${encodeURIComponent(query)}` +
        `&start=0&max_results=10&sortBy=submittedDate&sortOrder=descending`;

      xml = await fetchWithRetry(url, query);
      if (xml === null) {
        await sleep(4000);
        continue;
      }
    } catch (err) {
      console.warn(`[arxiv] Query "${query}" failed: ${err.message}`);
      await sleep(4000);
      continue;
    }

    const entries = parseAtomEntries(xml);

    for (const entry of entries) {
      if (results.length >= maxResults) break;

      const arxivId = extractArxivId(entry.id);
      if (!arxivId || seenIds.has(arxivId)) continue;

      const publishedDate = new Date(entry.published);
      if (isNaN(publishedDate.getTime()) || publishedDate < cutoffDate) continue;

      const title = cleanField(entry.title);
      const authors = extractAuthors(entry.authors);
      const fullSummary = cleanField(entry.summary);

      // Pre-AI filter: most arXiv hits on "futarchy", "decision market", etc.
      // are unrelated ML/physics papers. Drop them before they consume AI slots.
      if (!isArxivPMRelevant(title, fullSummary)) continue;

      seenIds.add(arxivId);

      const text = fullSummary.slice(0, 500);

      results.push({
        id: arxivId,
        title,
        url: `https://arxiv.org/abs/${arxivId}`,
        author: authors,
        text,
        published_at: publishedDate.toISOString(),
        source_type: "arxiv",
        source_name: "arXiv",
        engagement: {}
      });
    }

    await sleep(4000);
  }

  return results.slice(0, maxResults);
}

/**
 * Fetch an arXiv URL with retry/backoff on 429 (rate limit) and 503 (server
 * load) — arXiv enforces ~1 req/3s and is stricter during peak hours. The
 * scan fires 6 queries, and unthrottled bursts were getting 429/503'd,
 * silently zeroing the source. Returns the response text, or null if all
 * attempts failed.
 */
async function fetchWithRetry(url, query) {
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const response = await fetch(url);
      if (response.status === 429 || response.status === 503) {
        const backoff = 5000 * attempt;
        console.warn(`[arxiv] Query "${query}" attempt ${attempt} hit ${response.status} — backing off ${backoff / 1000}s`);
        await sleep(backoff);
        continue;
      }
      if (!response.ok) {
        console.warn(`[arxiv] API error for query "${query}": ${response.status}`);
        await sleep(4000);
        return null;
      }
      return await response.text();
    } catch (err) {
      console.warn(`[arxiv] Query "${query}" attempt ${attempt} network error: ${err.message}`);
      if (attempt < 3) await sleep(5000 * attempt);
    }
  }
  console.warn(`[arxiv] Query "${query}" gave up after 3 attempts`);
  return null;
}

// --- XML Parsing ---

/**
 * Parse Atom XML into entry objects with raw field values.
 * @param {string} xml - Full Atom feed XML
 * @returns {Array<{id: string, title: string, published: string, summary: string, authors: string[]}>}
 */
function parseAtomEntries(xml) {
  const entries = [];
  const entryRegex = /<entry[\s>][\s\S]*?<\/entry>/gi;
  let match;

  while ((match = entryRegex.exec(xml)) !== null) {
    const block = match[0];

    const id = extractField(block, "id");
    const title = extractField(block, "title");
    const published = extractField(block, "published");
    const summary = extractField(block, "summary");

    const authors = [];
    const authorRegex = /<author>[\s\S]*?<\/author>/gi;
    let authorMatch;
    while ((authorMatch = authorRegex.exec(block)) !== null) {
      const name = extractField(authorMatch[0], "name");
      if (name) authors.push(name);
    }

    entries.push({ id, title, published, summary, authors });
  }

  return entries;
}

/**
 * Extract the text content of an XML tag (non-greedy, multiline).
 * @param {string} xml - XML snippet
 * @param {string} tag - Tag name to extract
 * @returns {string}
 */
function extractField(xml, tag) {
  const regex = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i");
  const match = xml.match(regex);
  return match ? match[1].trim() : "";
}

// --- Field Transformers ---

/**
 * Strip HTML tags and collapse whitespace.
 */
function cleanField(text) {
  return text.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
}

/**
 * Extract the base arXiv ID from an arXiv URL.
 * Handles "http://arxiv.org/abs/2306.04305v1" -> "2306.04305"
 * and "http://arxiv.org/abs/cond-mat/0603025" -> "cond-mat/0603025".
 * @param {string} url - The <id> field from the Atom entry
 * @returns {string|null}
 */
function extractArxivId(url) {
  const match = url.match(/\/abs\/(.+?)(?:v\d+)?$/);
  return match ? match[1] : null;
}

/**
 * Format first 2-3 authors as a comma-separated string.
 * @param {string[]} authors
 * @returns {string}
 */
function extractAuthors(authors) {
  if (!authors || authors.length === 0) return "Unknown";
  return authors.slice(0, 3).join(", ");
}

// --- Helpers ---

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
