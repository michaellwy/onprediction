/**
 * Outlet reputation for the ingest pipeline (lower tier number = more reputable).
 * Reads the SAME tier data as the frontend (src/lib/sourceReputation.json) so the
 * two never drift. Used to pick a story's lead source and to enforce the
 * "hold until a credible outlet covers it" publish bar.
 */

import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const tierData = JSON.parse(readFileSync(join(__dirname, "..", "..", "..", "src", "lib", "sourceReputation.json"), "utf-8"));

const DOMAIN_TIERS = {};
const NAME_TIERS = {};
for (const { tier, domains, names } of tierData.tiers) {
  for (const d of domains) DOMAIN_TIERS[d] = tier;
  for (const n of names) NAME_TIERS[n.toLowerCase()] = tier;
}
const DENYLIST = new Set(tierData.denylist || []);

function hostOf(url) {
  try { return new URL(url).hostname.replace(/^www\./, "").toLowerCase(); } catch { return ""; }
}

/** Reputation tier (1=best) for a source, or null if not on the allowlist. */
export function reputationRank(url, outlet) {
  const host = hostOf(url);
  if (host) {
    for (const d in DOMAIN_TIERS) {
      if (host === d || host.endsWith("." + d)) return DOMAIN_TIERS[d];
    }
  }
  if (outlet && NAME_TIERS[outlet.toLowerCase()] != null) return NAME_TIERS[outlet.toLowerCase()];
  return null;
}

/** A known SEO / content-mill / price-shill / PR-wire / gambling-affiliate domain. */
export function isSpamDomain(url) {
  const host = hostOf(url);
  if (!host) return false;
  for (const d of DENYLIST) if (host === d || host.endsWith("." + d)) return true;
  return false;
}

/** True only when EVERY source is denylisted — the "all junk" case we hold back. */
export function allSpam(sources) {
  const list = (sources || []).filter(Boolean);
  return list.length > 0 && list.every((s) => isSpamDomain(s.url));
}

// Sort order for lead selection: allowlist tiers (1-3) first, then unknown-but-
// legit (99), then denylisted junk (100) last — so a real outlet always leads.
export const UNRANKED = 99;
export const SPAM_RANK = 100;
export const rankOrUnranked = (url, outlet) =>
  reputationRank(url, outlet) ?? (isSpamDomain(url) ? SPAM_RANK : UNRANKED);
