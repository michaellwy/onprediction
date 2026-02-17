# Adding New Articles to the Database

## When User Provides a New Link

1. **Fetch the content** using `WebFetch` with the URL
2. **Determine the next article ID** by checking the last entry in `articles_database.json`
3. **Add entry to CSV** (`Prediction Market Reading list - Sheet1.csv`):
   ```
   ID,Title,Date (DD/MM/YYYY),Author,URL
   ```
4. **Analyze content** and add entry to JSON (refer to `prompt.md` for schema and field options)
5. Set `fetch_status` to `"web"`
6. **Update `concept_definitions.json`** — for any concept prefixed with `NEW:` in the article's `concepts` array, add a corresponding entry to `concept_definitions.json` with a concise one-sentence definition. Keep definitions lowercase-keyed and consistent in style with existing entries.
7. **Strip `NEW:` prefixes** — once the definition is added, remove the `NEW:` prefix from the concept in `articles_database.json` so it becomes a canonical concept.
8. **Update `src/lib/concepts.ts`** — add the new concept to the `conceptToCluster` mapping with the appropriate cluster. This is what the frontend uses to display and categorize concepts.

## When User Adds a New PDF

1. **Find the PDF** in `/articles/` folder (pattern: `{ID}-{title}.pdf`)
2. **Extract text** using pdfplumber:
   ```python
   import pdfplumber
   with pdfplumber.open(filepath) as pdf:
       for page in pdf.pages:
           text = page.extract_text()
   ```
3. **Determine article ID** from the PDF filename prefix
4. **Add entry to CSV** with extracted metadata
5. **Analyze content** and add entry to JSON (refer to `prompt.md` for schema and field options)
6. Set `fetch_status` to `"pdf"`
7. **Update `concept_definitions.json`** — for any concept prefixed with `NEW:` in the article's `concepts` array, add a corresponding entry to `concept_definitions.json` with a concise one-sentence definition. Keep definitions lowercase-keyed and consistent in style with existing entries.
8. **Strip `NEW:` prefixes** — once the definition is added, remove the `NEW:` prefix from the concept in `articles_database.json` so it becomes a canonical concept.
9. **Update `src/lib/concepts.ts`** — add the new concept to the `conceptToCluster` mapping with the appropriate cluster. This is what the frontend uses to display and categorize concepts.

## Reference

For JSON schema, field options, validation rules, and editorial blurb guidelines, see `prompt.md`.
