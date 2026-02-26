# Adding New Articles to the Database

## Files That MUST Be Updated

Every new article requires updates to **both** of these files:

1. **`articles_database.json`** — full article metadata (JSON)
2. **`prediction-market-reading-list.csv`** — lightweight index (CSV)

After updating both, run `npm run sync:concepts` to sync any new concept definitions.

---

## When User Provides a New Link

1. **Check for duplicates** — search `articles_database.json` for the URL before doing anything else. If the URL already exists, stop and inform the user which article ID it matches.
2. **Fetch the content** using `WebFetch` with the URL
3. **Determine the next article ID** by checking the last entry in `articles_database.json`
4. **Add entry to `articles_database.json`** — analyze content and populate all fields (refer to `prompt.md` for schema and field options). Set `fetch_status` to `"web"`.
5. **Add entry to `prediction-market-reading-list.csv`** with format:
   ```
   ID,Title,Date (D/M/YYYY),Author,URL
   ```
6. **Run `npm run sync:concepts`** — this auto-populates any missing concept definitions in `concept_definitions.json`

## When User Adds a New PDF

1. **Find the PDF** in `/articles/` folder (pattern: `{ID}-{title}.pdf`)
2. **Read the PDF** using the Read tool (it supports PDFs natively)
3. **Determine article ID** from the PDF filename prefix
4. **Check for duplicates** — search `articles_database.json` for the article's URL. If it already exists, stop and inform the user which article ID it matches.
5. **Add entry to `articles_database.json`** — analyze content and populate all fields (refer to `prompt.md` for schema and field options). Set `fetch_status` to `"pdf"`.
6. **Add entry to `prediction-market-reading-list.csv`** with format:
   ```
   ID,Title,Date (D/M/YYYY),Author,URL
   ```
7. **Run `npm run sync:concepts`** — this auto-populates any missing concept definitions in `concept_definitions.json`

## Concept Handling

- Maximum **5 concepts per article** — do not add generic concepts just to fill the list
- If the article introduces a concept not in the canonical list, prefix it with `NEW:` and place it **first** in the array
- Use existing concepts from the database when possible (check `concept_definitions.json`)
- Prefer specific concepts over generic ones — only include "information aggregation" or "price discovery" if they are genuinely central to the article's argument, not just tangentially related
- After adding concepts, run `npm run sync:concepts` — this auto-populates any missing concept definitions in `concept_definitions.json`
- After syncing, verify any new concept appears in `src/lib/concepts.ts` `conceptToCluster` mapping; if not, add it manually with the appropriate cluster

## Title Formatting

Always use **Title Case** for the `title` field and in the CSV — regardless of how the original article stylizes its own title. For example: "How Well Can Large Language Models Predict the Future?" not "How well can large language models predict the future?"

## Reference

For JSON schema, field options, validation rules, and editorial blurb guidelines, see `prompt.md`.
