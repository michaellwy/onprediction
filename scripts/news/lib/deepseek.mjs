/**
 * Minimal DeepSeek chat caller (OpenAI-compatible) for the news pipeline.
 * Standalone copy of the pattern in scripts/scanner/lib/ai-ranker.mjs so the
 * news pipeline stays decoupled from the scanner's curation logic.
 */

const ENDPOINT = "https://api.deepseek.com/v1/chat/completions";

export async function callDeepSeek(system, user, { model = "deepseek-chat", temperature = 0, maxTokens = 8192 } = {}) {
  if (!process.env.DEEPSEEK_API_KEY) throw new Error("DEEPSEEK_API_KEY not set");
  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${process.env.DEEPSEEK_API_KEY}`,
    },
    body: JSON.stringify({
      model,
      max_tokens: maxTokens,
      temperature,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    }),
  });
  if (!res.ok) throw new Error(`DeepSeek ${res.status}: ${(await res.text()).slice(0, 200)}`);
  return (await res.json()).choices?.[0]?.message?.content || "";
}

/** Tolerant JSON-array extraction — strips code fences, salvages truncation. */
export function parseJsonArray(text) {
  let c = text.replace(/^```(?:json)?\s*/gm, "").replace(/```\s*$/gm, "").trim();
  let m = c.match(/\[[\s\S]*\]/);
  if (!m) {
    const s = c.indexOf("["), lb = c.lastIndexOf("}");
    if (s !== -1 && lb !== -1) m = [c.slice(s, lb + 1) + "]"];
  }
  if (!m) return [];
  try { return JSON.parse(m[0]); } catch { return []; }
}
