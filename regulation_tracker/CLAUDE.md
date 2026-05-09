# Prediction Markets Regulation Tracker

## What this is
An autonomous research project that builds structured, source-cited datasets of prediction market regulations worldwide. The data files will power a dashboard (not yet built).

## Project structure
```
program.md          — agent instructions (read this FIRST — contains research loop, source playbook, review loop)
data/               — the 5 output files the agent builds
  01-jurisdictions.md   — 39 jurisdiction blocks (map data)
  02-events.md          — 36 dated events (timeline)
  03-battlegrounds.md   — 10 regulatory themes (analysis)
  04-stakeholders.md    — 19 key actors (players tab)
  05-platforms.md       — 12 platform profiles (comparison)
docs/               — read-only reference material (do NOT modify)
```

## How to work in this repo
- Read `program.md` for the full research loop, Primary Source Search Playbook, and Recursive Review Loop
- The detailed data schema is in `docs/Prediction markets regulations tracker copy.md`
- Only modify files in `data/`
- Commit after each jurisdiction is complete
- Use web search to find and verify primary sources — see playbook in program.md for domain patterns
- Every data point must have an inline source citation WITH a URL — no "Unverified" without a link
- Use Playwright browser automation for .gov sites that return 403 (federalregister.gov, congress.gov)
- After completing work, run the Recursive Review Loop (5 dimensions: accuracy, sources, completeness, richness, organization)

## Reference benchmark
- https://tsimagine-predictive-markets-events.netlify.app/ — Rob Flatley / TS Imagine global map (29 jurisdictions, litigation tracker, timeline, platform comparison). Our dataset should be 10x better in all dimensions: more jurisdictions, primary sources, richer analysis, better organization.

## Current dataset status (as of 2026-03-31)
- P1-P4 jurisdictions complete (US-FED + 14 states + 7 EU + 7 P3 + 8 P4)
- 0 linkless Unverified citations
- Events sorted descending, all with primary sources
- Review loop completed (all 5 dimensions clean)
