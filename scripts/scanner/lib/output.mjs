import { writeFileSync, existsSync, mkdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUTPUT_DIR = join(__dirname, "..", "output");

/**
 * Save results to a markdown file.
 * Returns the file path.
 */
export function saveMarkdown(results, stats, isDryRun) {
  if (!existsSync(OUTPUT_DIR)) mkdirSync(OUTPUT_DIR, { recursive: true });

  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10);
  const timeStr = now.toISOString().slice(11, 16).replace(":", "");
  const filename = `scan-${dateStr}-${timeStr}.md`;
  const filepath = join(OUTPUT_DIR, filename);
  const mode = isDryRun ? " (Dry Run)" : "";

  let md = `# OnPrediction Scan — ${formatDate(now)}${mode}\n\n`;

  if (stats.sources) {
    md += `**Sources:**\n`;
    for (const [source, s] of Object.entries(stats.sources)) {
      md += `- ${source}: ${s.raw} found\n`;
    }
    md += `\n**Total:** ${stats.total_raw} candidates → ${stats.total_filtered} after dedup → ${stats.results} results\n`;
  } else {
    md += `**Scanned:** ${stats.accounts || 0} accounts, ${stats.keywords || 0} keywords  \n`;
    md += `**Found:** ${stats.raw || stats.total_raw} → ${stats.filtered || stats.total_filtered} candidates → ${results.length} results  \n`;
  }

  md += `**Lookback:** ${stats.lookbackHours || "?"} hours  \n`;
  md += `**Duration:** ${stats.duration_sec || "?"}s  \n\n`;
  md += `---\n\n`;

  if (results.length === 0) {
    md += `No results matched the quality threshold this scan.\n\n`;
  }

  // Near-misses
  if (stats.near_misses && stats.near_misses.length > 0) {
    md += `## Near Misses\n\n`;
    for (const m of stats.near_misses) {
      md += `- **${m.title || "Untitled"}** (${m.score?.toFixed(1)}/10)\n`;
      if (m.url) md += `  ${m.url}\n`;
      if (m.skip_reason) md += `  > ${m.skip_reason}\n`;
      md += `\n`;
    }
    md += `---\n\n`;
  }

  for (let i = 0; i < results.length; i++) {
    const r = results[i];
    const scoreStr = r.score != null ? ` (${r.score.toFixed(1)}/10)` : "";
    const author = r.author_handle ? `@${r.author_handle}` : (r.author || "unknown");
    const title = r.title || (r.text ? firstLine(r.text) : "Untitled");
    const sourceInfo = r.source_type
      ? `${r.source_type}${r.source_name ? ` / ${r.source_name}` : ""}`
      : (r.source || "");

    md += `## ${i + 1}. ${author}${scoreStr}\n\n`;
    md += `**${title}**  \n`;
    md += `**Link:** ${r.url}  \n`;

    const eng = r.metrics || r.engagement;
    if (eng) {
      const parts = [];
      if (eng.likes) parts.push(`${eng.likes} likes`);
      if (eng.retweets) parts.push(`${eng.retweets} RTs`);
      if (eng.comments != null) parts.push(`${eng.comments} comments`);
      if (parts.length) md += `**Engagement:** ${parts.join(", ")}  \n`;
    }
    if (sourceInfo) md += `**Source:** ${sourceInfo}  \n`;
    md += `\n`;

    if (r.summary) {
      md += `> ${r.summary}\n\n`;
    }

    if (r.why_include) {
      md += `**Why include:** ${r.why_include}\n\n`;
    }

    // Show content text (truncated)
    const body = r.title ? r.text : r.text; // for tweets, text IS the content
    const displayText = r.title
      ? r.text?.slice(0, 800) || title
      : r.text?.slice(0, 800) || "";
    if (displayText) {
      md += `<details>\n<summary>Content excerpt</summary>\n\n${displayText}\n\n</details>\n\n`;
    }
    md += `---\n\n`;
  }

  writeFileSync(filepath, md);
  return filepath;
}

function firstLine(text) {
  if (!text) return "";
  return text.split("\n")[0];
}

function formatDate(date) {
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric"
  });
}
