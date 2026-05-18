---
name: prebuild-check
description: Run the full prebuild pipeline locally and diff the generated outputs in public/ against what's committed. Use before pushing changes that touch articles_database.json, concept_definitions.json, or anything that feeds the 6-step prebuild chain. Catches generation regressions that would otherwise only surface on Vercel.
allowed-tools: Bash(npm run prebuild), Bash(git diff *), Bash(git status *), Read
disable-model-invocation: true
---

Run the prebuild pipeline and report what changed in `public/`. The user invokes this with `/prebuild-check`.

## Steps

1. **Snapshot current state** — `git status --short public/ articles_database.json concept_definitions.json` so you know what was already dirty before the run.

2. **Run the pipeline** — `npm run prebuild`. This executes, in order:
   - `generate-sitemap.js` → `public/sitemap.xml`
   - `generate-feed.js` → `public/feed.xml`
   - `generate-public-data.js` → `public/api/articles.json`, `public/api/concepts.json`
   - `generate-llms-full.js` → `public/llms-full.txt`
   - `generate-ask-context.js` → `public/api/ask-context.json`
   - `generate-og-images.mjs` → per-article OG PNGs (skips unchanged via `.hash` sidecars)

3. **Diff the result** — `git diff --stat public/` first for a summary, then `git diff public/` for the detail. For PNGs, only the file presence matters (binary diff is noise).

4. **Report**:
   - List which generated files changed and why (cross-reference with the article(s) the user just touched).
   - Flag any *unexpected* changes — e.g. sitemap entries for articles the user didn't edit, ask-context regenerated when no article changed, OG PNGs regenerating that shouldn't be.
   - If any generator errored, surface the stderr verbatim and stop.

5. **Recommend next step** — usually one of:
   - "Looks clean, ready to commit": list the files to `git add`.
   - "Unexpected diff in X": investigate before committing.
   - "Generator errored": fix the input data, don't commit partial output.

## Notes

- The OG image script is idempotent via `public/og/article-<id>.hash` sidecars. If you see *every* OG PNG regenerating, something invalidated all hashes — investigate before committing 100+ PNGs.
- `ask-context.json` is ~96KB and changes any time an article's title, blurb, or concepts change. A diff here on a non-article PR is suspicious.
- `feed.xml` includes recent articles only; older entries falling off is normal as new ones land.
