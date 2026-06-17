# Fix OnPrediction Daily Scanner — Revised Plan

**Date:** 2026-05-17
**Status:** Plan (no execution)

---

## Overview

Replace the 4-source architecture (RSS + arXiv API + HN + Twitter) with 2 sources (RSS + Twitter), route everything through Hermes cron delivery, and use `deepseek-v4-flash` for ranking.

---

## Changes

### 1. Drop arXiv API module — replace with RSS category feeds

**File:** `scripts/scanner/lib/sources/arxiv.mjs` → **delete** (or gut it, the module is no longer imported)

**File:** `scripts/scanner/config.json` → add arXiv RSS category feeds to `sources.rss.feeds`

arXiv RSS endpoint (`rss.arxiv.org/rss/<category>`) works from the VPS (confirmed 200). Add categories where PM papers actually appear:

- `cs.GT` — game theory, mechanism design (most PM papers land here)
- `econ.GN` — general economics, market design
- `cs.AI` — AI/ML forecasting
- `cs.MA` — multiagent systems
- `q-fin.GN` — quantitative finance
- `physics.soc-ph` — physics & society (crowd wisdom, opinion dynamics papers)
- `stat.AP` — applied statistics
- `cs.SI` — social & information networks

Each feed will get filtered through the same `PM_KEYWORDS` check the RSS source already uses. The RSS keyword list already covers what we need.

arXiv items get `source_name: "arXiv"` (they'll appear in reports as arXiv).

### 2. Drop HN module entirely

**File:** `scripts/scanner/lib/sources/hackernews.mjs` → **delete**

**File:** `scripts/scanner/scheduled-scan.mjs` → remove `fetchHackerNews` import and call

### 3. Fix AI ranker — use `deepseek-v4-flash`

**File:** `scripts/scanner/config.json` → change `ai_ranking.model` from `"deepseek-v4-pro"` to `"deepseek-v4-flash"`

**Rationale:** Flash is faster and cheaper. Ranking tweets and blog snippets into 1-10 is a classification task, not deep reasoning. This is the single biggest lever for reducing runtime.

### 4. Route Telegram delivery through Hermes cron

**Current flow:** Scanner calls Telegram API directly via `sendDigest()` using `TELEGRAM_BOT_TOKEN` + `TELEGRAM_CHAT_ID` from `.env.local`. If the API call fails, the scan reports success to Hermes cron but the user gets nothing.

**New flow:** Scanner outputs its digest as stdout (plain text or structured format). Hermes cron delivers this to the origin chat automatically. The scanner's own Telegram API calls are removed.

**File:** `scripts/scanner/scheduled-scan.mjs` — replace `sendDigest(topPicks, stats)` with `console.log(generateDigestText(topPicks, stats))`

**File:** `scripts/scanner/lib/telegram.mjs` — can be kept as a utility for formatting, but the `sendDigest` function gets replaced with a `formatDigest` function that returns text instead of calling the API.

**Risk:** Telegram HTML formatting (bold, links) needs to work with the cron delivery format. Hermes cron delivers the agent's final response as text — if we use HTML tags, they need to render properly in Telegram. The current format uses `<b>`, `<a href>`, `<i>` tags which are Telegram HTML parse_mode compatible.

### 5. Two-tier scoring — top picks + promising

**File:** `scripts/scanner/config.json` — threshold remains `min_score_threshold: 6`, add `promising_threshold: 4` and `max_promising: 10`

**File:** `scripts/scanner/scheduled-scan.mjs` — the digest shows:
- Top Picks (≥6/10, capped at 5) — what goes in the Telegram message
- Promising (4-5.9/10, capped at 10) — listed below top picks in Telegram with "(near miss)" indicator

This recovers borderline items without diluting the daily digest. The Telegram message stays focused but the user can see what's simmering.

### 6. Standardize lookback at 72h

**File:** `scripts/scanner/scheduled-scan.mjs` — change `const lookbackHours = 48;` to `const lookbackHours = 72;`

This fixes the weekend content gap (Friday evening content won't expire by Sunday scan).

**File:** `scripts/scanner/config.json` — confirm RSS lookback is also 72h (it's already 72h in config — `sources.rss.lookback_hours: 72`). Twitter lookback can stay at 24h (Twitter volume is high enough).

### 7. Add per-feed RSS logging

**File:** `scripts/scanner/lib/sources/rss.mjs` — log per-feed results (items found, items after PM-keyword filter, items after lookback). Not visible to the user, but shows in the scan output for debugging.

### 8. Remove engagement-based sorting from AI ranker

**File:** `scripts/scanner/lib/ai-ranker.mjs` — remove the `engagementScore` sort. arXiv/RSS items with 0 engagement get buried behind viral Twitter threads. Sort by nothing (preserve original order, which is roughly chronological).

---

## Files Changed Summary

| File | Action | What |
|------|--------|------|
| `config.json` | Edit | model → deepseek-v4-flash, add promising_threshold, add arXiv RSS feeds, remove HN config |
| `scheduled-scan.mjs` | Edit | Remove HN import, remove Telegram API send, add formatDigest, add promising tier, change lookback |
| `lib/sources/arxiv.mjs` | **Delete** | Replaced by arXiv RSS feeds in the RSS source |
| `lib/sources/hackernews.mjs` | **Delete** | Dropped |
| `lib/sources/rss.mjs` | Edit | Add arXiv RSS feed support, add per-feed logging |
| `lib/ai-ranker.mjs` | Edit | Remove engagement sort, change model (via config) |
| `lib/telegram.mjs` | Edit | Replace sendDigest with formatDigest (returns string) |
| `lib/output.mjs` | No change | Already works with our output format |
| `lib/dedup.mjs` | No change | Already dedups by URL |

---

## Execution Order

1. Edit `config.json` — model, thresholds, remove HN, add arXiv RSS feeds
2. Edit `rss.mjs` — add per-feed logging
3. Delete `hackernews.mjs` and `arxiv.mjs`
4. Edit `scheduled-scan.mjs` — remove HN/arXiv imports, remove sendDigest, add formatDigest, change lookback
5. Edit `telegram.mjs` — replace sendDigest with formatDigest
6. Edit `ai-ranker.mjs` — remove engagement sort
7. Test: run `node scripts/scanner/scheduled-scan.mjs` manually
8. Verify Telegram delivery via Hermes cron output
9. Update the Hermes cron timeout if runtime still too close to 300s

---

## Decisions Made

- **arXiv RSS categories:** cs.GT, econ.GN, cs.AI, q-fin.GN (start with 4 most likely)
- **Telegram format:** Plain markdown with links (`[title](url)`), good spacing, clean layout. No HTML.
