/**
 * Taste gate for the news feed. Distinct from the on-topic gate in evaluate.mjs:
 * the gate asks "is this about the PM industry?"; this asks "does it match the
 * editor's taste — a discrete event vs. metric churn / commentary / a rehash?".
 *
 * The rubric is scripts/news/taste.md, read verbatim, so taste is tuned by
 * editing that file (no code change). Returns one verdict per story:
 *   { id, verdict: "signal" | "noise" | "uncertain", reason }
 * Auto-publish mapping (ingest): signal -> published, noise -> below_bar,
 * uncertain -> review.
 */
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { callDeepSeek, parseJsonArray } from "./deepseek.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const TASTE = readFileSync(join(__dirname, "..", "taste.md"), "utf-8");

const SYS = `You are the taste editor for a prediction-market news feed. Apply the rubric below EXACTLY. It defines SIGNAL (publish), NOISE (hide) and UNCERTAIN (send to a human). Judge by the rubric, not your own preferences.

${TASTE}

You receive a JSON-style list of stories, each "ID | headline — summary". For EACH story return one object:
{"id": "<echo id>", "verdict": "signal" | "noise" | "uncertain", "reason": "<6 words max>"}

Rules:
- "signal" only when it clearly matches a SIGNAL bullet: a discrete event, named actor, with figures or jurisdiction.
- "noise" when it clearly matches a NOISE bullet: metric churn, roundup, opinion/explainer, duplicate, odds-as-barometer, or fluff.
- "uncertain" when it is genuinely borderline per the UNCERTAIN section. Do NOT use uncertain as a dumping ground — most stories are clearly one or the other.
Respond ONLY with a JSON array, one object per story, every id exactly once.`;

/**
 * Classify stories for taste. Each input needs { id, headline, summary? }.
 * Returns Map<id, { verdict, reason }>. Unscored ids default to "uncertain".
 */
export async function classifyTaste(stories, { batchSize = 15 } = {}) {
  const out = new Map();
  for (let off = 0; off < stories.length; off += batchSize) {
    const batch = stories.slice(off, off + batchSize);
    const list = batch
      .map((s) => `${s.id} | ${String(s.headline).slice(0, 160)}${s.summary ? " — " + String(s.summary).slice(0, 240) : ""}`)
      .join("\n");
    // Retry transient failures (DeepSeek occasionally drops the socket on a big
    // response). Up to 3 attempts before a batch falls through to "uncertain".
    let scored = false;
    for (let attempt = 1; attempt <= 3 && !scored; attempt++) {
      try {
        for (const r of parseJsonArray(await callDeepSeek(SYS, `Stories:\n\n${list}`, { maxTokens: 4096 }))) {
          if (r && r.id != null) {
            const v = ["signal", "noise", "uncertain"].includes(r.verdict) ? r.verdict : "uncertain";
            out.set(String(r.id), { verdict: v, reason: (r.reason || "").slice(0, 80) });
          }
        }
        scored = true;
      } catch (e) {
        console.error(`  taste batch failed (attempt ${attempt}/3): ${e.message}`);
      }
    }
    console.error(`  classified ${Math.min(off + batchSize, stories.length)}/${stories.length}`);
  }
  for (const s of stories) if (!out.has(String(s.id))) out.set(String(s.id), { verdict: "uncertain", reason: "unscored" });
  return out;
}
