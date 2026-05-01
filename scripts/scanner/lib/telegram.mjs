/**
 * Send scan results to Telegram — HTML formatting with inline links.
 */

export async function sendDigest(results, stats) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (!token || !chatId) {
    throw new Error("TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID not set in .env.local");
  }

  const now = new Date();
  const dateStr = now.toLocaleDateString("en-US", {
    year: "numeric", month: "long", day: "numeric",
    timeZone: "Asia/Hong_Kong"
  });

  let msg = `<b>OnPrediction Daily Scout</b>\n${dateStr}\n\n`;

  // Source summary
  const sourceLines = [];
  for (const [source, s] of Object.entries(stats.sources || {})) {
    if (s.raw === 0) continue;
    sourceLines.push(`${s.raw} from ${sourceLabel(source)}`);
  }
  if (sourceLines.length > 0) {
    msg += `Scanned ${sourceLines.join(", ")}.\n`;
  }
  msg += `${stats.total_filtered} after dedup · ${stats.results} above threshold`;
  if (stats.duration_sec) msg += ` · ${stats.duration_sec}s`;
  msg += `\n\n`;

  // Top picks
  if (results.length > 0) {
    for (let i = 0; i < results.length; i++) {
      const r = results[i];
      const title = r.title || (r.text ? firstLine(r.text) : "Untitled");
      const author = authorLine(r);
      const tag = sourceTag(r);
      const meta = [scoreBadge(r.score), tag].filter(Boolean).join("  ");

      msg += `<a href="${esc(r.url)}">${esc(title)}</a>\n`;
      msg += `${meta}\n`;
      if (author) msg += `${author}\n`;
      if (r.summary) msg += `${esc(r.summary)}\n`;
      msg += `\n`;
    }
  } else {
    msg += `<i>Nothing met the quality threshold.</i>\n\n`;
  }

  // Near-misses
  if (stats.near_misses && stats.near_misses.length > 0) {
    msg += `<b>Near misses:</b>\n`;
    for (let i = 0; i < Math.min(stats.near_misses.length, 8); i++) {
      const m = stats.near_misses[i];
      const title = truncate(m.title || "Untitled", 120);
      const skip = m.skip_reason ? ` — ${esc(m.skip_reason)}` : "";
      msg += `<a href="${esc(m.url)}">${esc(title)}</a>\n`;
      msg += `${m.score?.toFixed(1)}${skip}\n`;
    }
    msg += `\n`;
  }

  // Truncate
  if (msg.length > 4000) {
    msg = msg.slice(0, 3990) + "\n\n…truncated…";
  }

  const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text: msg,
      parse_mode: "HTML",
      disable_web_page_preview: true
    })
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Telegram API error (${response.status}): ${err}`);
  }

  return true;
}

function esc(text) {
  if (!text) return "";
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function truncate(str, maxLen) {
  if (!str) return "";
  if (str.length <= maxLen) return str;
  return str.slice(0, maxLen - 1) + "…";
}

function firstLine(text) {
  if (!text) return "";
  return text.split("\n")[0];
}

function scoreBadge(score) {
  if (score == null) return "";
  return `${score.toFixed(1)}/10`;
}

function authorLine(r) {
  const name = r.author_handle ? `@${r.author_handle}` : (r.author || "");
  return name ? esc(name) : "";
}

function sourceTag(r) {
  const src = r.source_type || r.source || "";
  const name = r.source_name || "";
  const tags = {
    twitter: "Twitter",
    rss: name || "Blog",
    arxiv: "arXiv",
    hackernews: "HN",
    twitter_browser: "Twitter",
    twitter_xpoz: "Twitter"
  };
  return tags[src] || name || src;
}

function sourceLabel(source) {
  const labels = {
    twitter_xpoz: "Twitter",
    twitter_browser: "Twitter",
    rss: "blogs",
    hackernews: "HN",
    arxiv: "arXiv"
  };
  return labels[source] || source;
}
