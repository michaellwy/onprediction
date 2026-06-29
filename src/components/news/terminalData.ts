import type { NewsStory } from "@/types/news";
import { rankSources, type RankedSource } from "@/lib/sourceReputation";
import { hostName } from "@/lib/newsTime";

export type NtTheme = "light" | "dark";
export type NtRange = "24h" | "7d" | "30d" | "all";

export const NT_RANGES: { value: NtRange; label: string; ms: number }[] = [
  { value: "24h", label: "24h", ms: 864e5 },
  { value: "7d", label: "7d", ms: 7 * 864e5 },
  { value: "30d", label: "30d", ms: 30 * 864e5 },
  { value: "all", label: "All", ms: Infinity },
];

/**
 * Reputable sources for a story, ranked. Always non-empty: when nothing clears
 * the reputation allowlist (the single-outlet majority), synthesize the lead
 * source so the board sub-lines and stage list are never sourceless.
 */
export function rankedSourcesFor(story: NewsStory): RankedSource[] {
  const ranked = rankSources([{ outlet: story.lead_source, url: story.lead_url }, ...story.sources]);
  if (ranked.length > 0) return ranked;
  return [{ outlet: story.lead_source ?? hostName(story.lead_url), url: story.lead_url, rank: 99 }];
}

/** Whitespace-normalize a summary, softening em/en dashes into commas. */
export function cleanSummary(summary: string): string {
  return (summary || "").replace(/\s*\n\s*/g, " ").replace(/\s*[—–]\s*/g, ", ").trim();
}

/**
 * Split a (clean) summary into 1-2 balanced paragraphs so long blurbs get a
 * breathing break. Short summaries stay one paragraph. Breaks on the sentence
 * boundary nearest the midpoint.
 */
export function summaryParagraphs(text: string): string[] {
  const sentences = (text.match(/[^.!?]+[.!?]+(?:["')\]]+)?/g) || [text]).map((s) => s.trim()).filter(Boolean);
  if (text.length < 320 || sentences.length < 3) return [text];
  const half = text.length / 2;
  const out: string[] = [];
  let cur = "";
  for (const s of sentences) {
    cur = cur ? `${cur} ${s}` : s;
    if (out.length === 0 && cur.length >= half) { out.push(cur); cur = ""; }
  }
  if (cur) out.push(cur);
  return out.length ? out : [text];
}

// Words kept lowercase in headline case unless they open or close the headline.
// AP style: articles, coordinating conjunctions, and short (<=3 letter)
// prepositions only — prepositions of 4+ letters ("From", "With", "Over") are
// capitalized like principal words.
const MINOR_WORDS = new Set([
  "a", "an", "the", "and", "but", "or", "nor", "for", "yet", "so",
  "as", "at", "by", "in", "of", "off", "on", "to", "up", "via", "per", "vs",
]);

// Already-correct tokens to leave untouched: acronyms (CFTC, WSJ, S&P, IPO),
// numbers/currency ($3, 40bn), and brands with internal caps (DraftKings,
// PredictIt, iOS). Anything with a capital after the first char, or all-caps.
function isLocked(seg: string): boolean {
  return /[A-Z]/.test(seg.slice(1)) || /^[A-Z0-9&.$'%-]+$/.test(seg);
}

function capSegment(seg: string): string {
  if (!seg || isLocked(seg)) return seg;
  return seg.charAt(0).toUpperCase() + seg.slice(1);
}

// Capitalize a whole (possibly hyphenated) word, segment by segment.
const capWord = (w: string) => w.split("-").map(capSegment).join("-");

/**
 * News headline case: principal words capitalized, minor words (articles, short
 * prepositions, conjunctions) lowercased unless first or last, acronyms/brands
 * preserved, and no trailing sentence punctuation. Display-only — the stored
 * headline is unchanged.
 */
export function headlineCase(raw: string): string {
  // Drop trailing sentence punctuation, but keep a trailing acronym dot (U.S.).
  const trimmed = (raw || "").trim().replace(/(?<![A-Z])[.,;:!?]+$/, "");
  const words = trimmed.split(/\s+/);
  const last = words.length - 1;
  return words
    .map((w, i) => {
      if (i !== 0 && i !== last && MINOR_WORDS.has(w.toLowerCase()) && !isLocked(w)) {
        return w.toLowerCase();
      }
      return capWord(w);
    })
    .join(" ");
}
