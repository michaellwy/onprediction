import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

/**
 * Fetch recent Hacker News stories matching prediction market keywords.
 * Uses the free HN Algolia API.
 * @returns {Promise<Array<import("../types").ContentItem>>}
 */
export async function fetchHackerNews() {
  const config = JSON.parse(
    readFileSync(join(__dirname, "..", "..", "config.json"), "utf-8")
  );

  const hnConfig = config.sources.hackernews;
  const keywords = hnConfig.keywords || [];
  const minPoints = hnConfig.min_points ?? 5;
  const maxResults = hnConfig.max_results ?? 10;
  const lookbackHours = hnConfig.lookback_hours ?? 48;

  if (!keywords.length) return [];

  const cutoff = new Date(Date.now() - lookbackHours * 60 * 60 * 1000);
  const seen = new Set();
  const items = [];

  for (const keyword of keywords) {
    try {
      const url = `https://hn.algolia.com/api/v1/search?query=${encodeURIComponent(keyword)}&tags=story&hitsPerPage=20`;
      const res = await fetch(url);
      if (!res.ok) {
        console.warn(`[hackernews] API returned ${res.status} for keyword "${keyword}"`);
        continue;
      }
      const data = await res.json();
      const hits = data.hits || [];

      for (const hit of hits) {
        if (seen.has(hit.objectID)) continue;

        const publishedAt = new Date(hit.created_at);
        if (publishedAt < cutoff) continue;

        const points = hit.points || 0;
        if (points < minPoints) continue;

        seen.add(hit.objectID);

        // Use story URL, falling back to HN discussion URL
        const storyUrl = hit.url || `https://news.ycombinator.com/item?id=${hit.objectID}`;

        items.push({
          id: String(hit.objectID),
          title: hit.title || "",
          url: storyUrl,
          author: hit.author || "",
          text: hit.story_text
            ? hit.story_text
            : `${hit.title || ""} — HN discussion`,
          published_at: hit.created_at,
          source_type: "hackernews",
          source_name: "Hacker News",
          engagement: {
            likes: points,
            shares: 0,
            comments: hit.num_comments || 0,
          },
        });

        if (items.length >= maxResults) break;
      }

      if (items.length >= maxResults) break;

      // 100ms delay between keyword requests
      await new Promise((r) => setTimeout(r, 100));
    } catch (err) {
      console.warn(`[hackernews] Error fetching keyword "${keyword}": ${err.message}`);
    }
  }

  return items.slice(0, maxResults);
}
