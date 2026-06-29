// Reputation ranking for news outlets. Lower number = more reputable.
// Used to order a story's sources and filter out low-quality / SEO outlets.
// Tier data lives in sourceReputation.json — the single source of truth shared
// with the ingest pipeline (scripts/news/lib/source-reputation.mjs).

import tierData from "./sourceReputation.json";

const DOMAIN_TIERS: Record<string, number> = {};
const NAME_TIERS: Record<string, number> = {};

for (const { tier, domains, names } of tierData.tiers) {
  for (const d of domains) DOMAIN_TIERS[d] = tier;
  for (const n of names) NAME_TIERS[n.toLowerCase()] = tier;
}

function hostOf(url: string): string {
  try { return new URL(url).hostname.replace(/^www\./, "").toLowerCase(); } catch { return ""; }
}

/** Reputation tier (1=best) for a source, or null if not on the allowlist. */
export function reputationRank(url: string, outlet?: string | null): number | null {
  const host = hostOf(url);
  if (host) {
    for (const d in DOMAIN_TIERS) {
      if (host === d || host.endsWith("." + d)) return DOMAIN_TIERS[d];
    }
  }
  if (outlet && NAME_TIERS[outlet.toLowerCase()] != null) return NAME_TIERS[outlet.toLowerCase()];
  return null;
}

export interface RankedSource { outlet: string | null; url: string; rank: number }

/** Filter to reputable sources, dedupe by host, sort most-reputable first. */
export function rankSources(sources: { outlet: string | null; url: string }[]): RankedSource[] {
  const seen = new Set<string>();
  const out: RankedSource[] = [];
  for (const s of sources) {
    const rank = reputationRank(s.url, s.outlet);
    if (rank == null) continue;
    const host = hostOf(s.url) || s.url;
    if (seen.has(host)) continue;
    seen.add(host);
    out.push({ ...s, rank });
  }
  return out.sort((a, b) => a.rank - b.rank);
}
