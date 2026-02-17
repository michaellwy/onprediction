# Adding New Articles to the Database

## Files That MUST Be Updated

Every new article requires updates to **both** of these files:

1. **`articles_database.json`** — full article metadata (JSON)
2. **`prediction-market-reading-list.csv`** — lightweight index (CSV)

After updating both, run `npm run sync:concepts` to sync any new concept definitions.

---

## When User Provides a New Link

1. **Fetch the content** using `WebFetch` with the URL
2. **Determine the next article ID** by checking the last entry in `articles_database.json`
3. **Add entry to `articles_database.json`** — analyze content and populate all fields (refer to `prompt.md` for schema and field options). Set `fetch_status` to `"web"`.
4. **Add entry to `prediction-market-reading-list.csv`** with format:
   ```
   ID,Title,Date (D/M/YYYY),Author,URL
   ```
5. **Run `npm run sync:concepts`** — this auto-populates any missing concept definitions in `concept_definitions.json`

## When User Adds a New PDF

1. **Find the PDF** in `/articles/` folder (pattern: `{ID}-{title}.pdf`)
2. **Read the PDF** using the Read tool (it supports PDFs natively)
3. **Determine article ID** from the PDF filename prefix
4. **Add entry to `articles_database.json`** — analyze content and populate all fields (refer to `prompt.md` for schema and field options). Set `fetch_status` to `"pdf"`.
5. **Add entry to `prediction-market-reading-list.csv`** with format:
   ```
   ID,Title,Date (D/M/YYYY),Author,URL
   ```
6. **Run `npm run sync:concepts`** — this auto-populates any missing concept definitions in `concept_definitions.json`

## Concept Handling

- Use existing concepts from the database when possible (check `concept_definitions.json`)
- If a genuinely new concept is needed, add it to the article's `concepts` array — `npm run sync:concepts` will detect it and prompt for a definition
- After syncing, verify the new concept appears in `src/lib/concepts.ts` `conceptToCluster` mapping; if not, add it manually with the appropriate cluster

## Reference

For JSON schema, field options, validation rules, and editorial blurb guidelines, see `prompt.md`.
