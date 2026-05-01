/**
 * AI-based quality scoring for content candidates.
 * Primary: DeepSeek API (DEEPSEEK_API_KEY).
 * Fallback: Anthropic API (ANTHROPIC_API_KEY).
 * Last resort: local claude CLI.
 */

import { execFile } from "child_process";
import { promisify } from "util";

const execFileAsync = promisify(execFile);

const SYSTEM_PROMPT = `You are a curator for a prediction market knowledge hub called OnPrediction. Your job is to identify content worth reading for prediction market researchers, builders, and designers — people who care about how prediction markets WORK, not how to profit from them.

Score each item 1-10 on these criteria:
- Relevance: How directly related to prediction market design, theory, mechanisms, or platforms?
- Originality: Original insight, analysis, or research vs. reposting common knowledge?
- Depth: Substantive article, thread, or analysis vs. surface-level commentary?
- Signal: Useful for understanding how prediction markets work, not how to trade them?

Overall score = average of the four scores.

For each item, respond with a JSON object. If the item scores 7+ overall, include a "summary" (1-2 sentences describing why this is worth reading) and "why_include" (1 sentence on what makes it stand out). If below 7, just include the score and a brief "skip_reason".

IMPORTANT — what we WANT:
- Long-form articles, research papers, and blog posts about prediction markets
- Analysis or explainers about market mechanisms, oracle design, liquidity, information aggregation
- Case studies of specific markets or platform design decisions
- Commentary on prediction market regulation, governance, or industry dynamics
- X Articles (x.com/username/article/...) with genuine intellectual depth

IMPORTANT — what we DO NOT WANT (score 1-3 automatically):
- Trading tips, strategies, or "how to make money on Polymarket/Kalshi"
- Get-rich-quick content, profit screenshots, "I turned $X into $Y"
- Kelly criterion / bet sizing / bankroll management advice
- Generic crypto/market commentary that mentions prediction markets in passing
- Engagement bait, promotional content, or lifestyle flexing
- News headlines reposted without analysis

CRITICAL — AUTHOR REPUTATION IS NOT A SIGNAL:
- Robin Hanson, Scott Alexander, Zvi Mowshowitz, and other well-known thinkers write about MANY topics. Most of their posts are NOT about prediction markets.
- A post by a "prediction market person" about AI policy, tax reform, parenting, or philosophy is NOT relevant just because of who wrote it.
- Score based on the CONTENT, not the author. If the title and text don't discuss prediction markets, score 1-3.
- Even a high-priority account's tweet is NOT automatically high quality.

Respond ONLY with a JSON array, no other text. Example:
[
  {"id": "123", "score": 8.5, "summary": "Analysis of Polymarket's new AMM design...", "why_include": "Original mechanism design analysis with data"},
  {"id": "456", "score": 2.0, "skip_reason": "Trading strategy / how to profit content"}
]`;

/**
 * Rank candidates using AI.
 * Tries DeepSeek API first, then Anthropic API, then local claude CLI.
 * @param {Array} candidates - Filtered content items
 * @param {Object} config - ai_ranking config
 * @returns {Array} Top-scoring items with AI metadata
 */
export async function rankCandidates(candidates, config) {
  if (candidates.length === 0) return { topPicks: [], nearMisses: [], all: [] };

  const batchSize = config.max_candidates_per_batch || 25;

  // Sort by engagement so the most promising candidates go first
  const sorted = [...candidates].sort((a, b) => {
    const engA = engagementScore(a);
    const engB = engagementScore(b);
    return engB - engA;
  });

  // Process in batches
  const allScored = [];
  for (let offset = 0; offset < sorted.length; offset += batchSize) {
    const batch = sorted.slice(offset, offset + batchSize);
    console.log(`  AI batch ${Math.floor(offset / batchSize) + 1}: scoring ${batch.length} items...`);

    const scored = await scoreBatch(batch, config);
    allScored.push(...scored);
  }

  // Sort by score descending
  allScored.sort((a, b) => b.score - a.score);

  const threshold = config.min_score_threshold || 7;
  const topN = config.top_n_results || 5;
  const topPicks = allScored.filter(item => item.passed).slice(0, topN);
  const nearMisses = allScored.filter(item => !item.passed).slice(0, 10);

  return { topPicks, nearMisses, all: allScored };
}

function engagementScore(item) {
  const eng = item.engagement || item.metrics || {};
  return (eng.likes || 0) + (eng.retweets || eng.shares || 0) * 2 + (eng.comments || eng.replies || 0) * 3;
}

async function scoreBatch(batch, config) {
  // Format items
  const itemList = batch.map((item, i) => {
    const parts = [`${i + 1}. ID: ${item.id}`];
    const author = item.author_handle || item.author || "unknown";
    parts.push(`   Author: ${item.author_handle ? "@" : ""}${author}`);
    if (item.source_type || item.source) {
      parts.push(`   Source: ${item.source_type || item.source}${item.source_name ? ` (${item.source_name})` : ""}`);
    }
    parts.push(`   Title/Text: ${(item.title || item.text || "").slice(0, 250)}`);
    const eng = item.engagement || item.metrics;
    if (eng && (eng.likes || eng.comments || eng.retweets || eng.replies)) {
      parts.push(`   Engagement: ${eng.likes || 0} likes, ${eng.retweets || eng.shares || 0} RT, ${eng.comments || eng.replies || 0} replies`);
    }
    if (item.account_priority) parts.push(`   [${item.account_priority} priority account]`);
    return parts.join("\n");
  }).join("\n\n");

  const userPrompt = `Score these ${batch.length} items:\n\n${itemList}`;

  let text;
  if (process.env.DEEPSEEK_API_KEY) {
    text = await callDeepSeek(userPrompt, config);
  } else if (process.env.ANTHROPIC_API_KEY) {
    text = await callAnthropic(userPrompt, config);
  } else {
    text = await callCLI(userPrompt);
  }

  // Strip markdown code fences if present
  let cleaned = text.replace(/^```(?:json)?\s*/gm, "").replace(/```\s*$/gm, "").trim();

  // Extract JSON array — handle truncated responses by appending missing bracket
  let jsonMatch = cleaned.match(/\[[\s\S]*\]/);
  if (!jsonMatch) {
    // Response may be truncated (no closing ]). Try to salvage.
    const arrStart = cleaned.indexOf("[");
    if (arrStart !== -1) {
      // Find last complete object (ends with })
      const partial = cleaned.slice(arrStart);
      const lastBrace = partial.lastIndexOf("}");
      if (lastBrace !== -1) {
        const salvaged = partial.slice(0, lastBrace + 1) + "]";
        jsonMatch = [salvaged];
        console.warn("AI response was truncated — salvaged partial results");
      }
    }
    if (!jsonMatch) {
      console.error("Failed to parse AI response:", text.slice(0, 300));
      return [];
    }
  }

  let scored;
  try {
    scored = JSON.parse(jsonMatch[0]);
  } catch (e) {
    console.error("JSON parse error:", e.message);
    return [];
  }

  // Merge AI scores back into candidate objects
  const scoreMap = new Map(scored.map(s => [String(s.id), s]));
  const threshold = config.min_score_threshold || 7;

  return batch
    .map(item => {
      const ai = scoreMap.get(item.id);
      if (!ai) return null;
      return {
        ...item,
        score: ai.score,
        passed: ai.score >= threshold,
        summary: ai.summary || null,
        why_include: ai.why_include || null,
        skip_reason: ai.skip_reason || null
      };
    })
    .filter(Boolean);
}

/**
 * Call DeepSeek API (primary path — OpenAI-compatible chat completions).
 */
async function callDeepSeek(userPrompt, config) {
  const response = await fetch("https://api.deepseek.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${process.env.DEEPSEEK_API_KEY}`
    },
    body: JSON.stringify({
      model: config.model || "deepseek-chat",
      max_tokens: config.max_tokens || 8192,
      temperature: 0,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userPrompt }
      ]
    })
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`DeepSeek API error (${response.status}): ${err}`);
  }

  const result = await response.json();
  return result.choices[0]?.message?.content || "";
}

/**
 * Call Claude via the CLI (last resort fallback).
 * Pipes the prompt via stdin to avoid argument length limits.
 */
async function callCLI(userPrompt) {
  const fullPrompt = `${SYSTEM_PROMPT}\n\n${userPrompt}`;
  return new Promise((resolve, reject) => {
    const proc = execFile("claude", ["-p", "--model", "haiku"], {
      maxBuffer: 1024 * 1024,
      timeout: 120_000
    }, (err, stdout, stderr) => {
      if (err) return reject(err);
      resolve(stdout);
    });
    proc.stdin.write(fullPrompt);
    proc.stdin.end();
  });
}

/**
 * Call Claude via the Anthropic API (fallback).
 */
async function callAnthropic(userPrompt, config) {
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": process.env.ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01"
    },
    body: JSON.stringify({
      model: config.model || "claude-haiku-4-5-20251001",
      max_tokens: 4096,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: userPrompt }]
    })
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Anthropic API error (${response.status}): ${err}`);
  }

  const result = await response.json();
  return result.content[0]?.text || "";
}
