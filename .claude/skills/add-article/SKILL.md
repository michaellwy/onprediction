---
name: add-article
description: Add a new article to the OnPrediction prediction market reading list. Use when the user provides a URL or PDF to add to the database.
allowed-tools: Read, Edit, Bash(npm run sync:concepts), Bash(twitter *), WebFetch, Glob, Grep
---

Add the article provided in $ARGUMENTS to the OnPrediction database.

## Steps

1. **Check for duplicates** — search `articles_database.json` for the URL. If it exists, stop and tell the user which article ID it matches.

2. **Fetch the content** — choose the right method:
   - **X/Twitter URLs** (`x.com` or `twitter.com`): Use `twitter` CLI (see "Twitter/X Content Extraction" section below)
   - **Other URLs**: Use `WebFetch`
   - **PDFs**: Use `Read` for files in `/articles/`

3. **Determine next ID** — check the last entry in `articles_database.json`.

4. **Add to `articles_database.json`** — analyze content and populate all fields per the schema below. Set `fetch_status` to `"web"` (URL) or `"pdf"` (PDF).

5. **Add to `prediction-market-reading-list.csv`** — format: `ID,Title,Date (D/M/YYYY),Author,URL`

6. **Write definitions for NEW: concepts** — before running sync, open `concept_definitions.json` and add a definition for every concept prefixed with `NEW:`. Use 1-2 sentences: what the concept is and why it matters in prediction markets. Do NOT leave a definition as an empty string `""`.

7. **Run `npm run sync:concepts`**

8. **Check concept cluster mapping** — verify any new concepts appear in `src/lib/concepts.ts` `conceptToCluster`. If missing, add them with the appropriate cluster.

9. **Build, commit, push, and merge** — after all changes are in place:
   ```bash
   npm run build                  # Verify build passes
   git add articles_database.json prediction-market-reading-list.csv concept_definitions.json src/lib/concepts.ts
   git commit -m "Add article(s) [ID range]: [short description]"
   git checkout -b add-articles-[ID range]
   git push -u origin add-articles-[ID range]
   gh pr create --title "Add article(s) [ID range]: [short description]" --body "[summary]"
   gh pr merge [PR#] --squash
   git checkout main && git pull
   ```
   If pushing fails, check if on a feature branch; if on `main`, create a branch first. Never commit directly to main.

## JSON Schema

```json
{
  "id": 0,
  "url": "",
  "title": "",
  "author": "",
  "author_twitter": "",
  "source_type": "",
  "publish_date": "YYYY-MM-DD",
  "primary_category": "",
  "content_type": "",
  "difficulty": "",
  "concepts": [],
  "platforms_mentioned": [],
  "editorial_blurb": "",
  "fetch_status": ""
}
```

## Taxonomy

**Primary Category (pick 1):** Fundamentals, Design, Microstructure, Platforms, Applications, Business, Regulation, Commentary

**Difficulty:** None, Some, Extensive

**Content Type:** Research Paper, Opinion, Editorial, Analysis, Tutorial, Explainer, Case Study, Twitter Thread, Interview, Podcast, Video

**Source Type:** Blog, Substack, Academic Paper, News Article, Company Blog, Twitter, Podcast, YouTube, Forum Post, Documentation

### Content/Source Consistency
- Twitter source → never Research Paper
- Podcast source → Podcast content type
- YouTube source → Video content type
- Academic Paper source → typically Research Paper

## Concept Rules

- Max **5 concepts** per article — don't pad with generic ones
- **Default budget: 0 `NEW:` concepts per article.** Adding even one should feel rare
- Use canonical forms from `concept_definitions.json` when possible
- Prefer specific over generic (e.g., "LMSR" over "scoring rules")
- Only include "information aggregation" or "price discovery" if genuinely central
- Order: NEW concepts first → specific → generic last

### When NOT to add a `NEW:` concept

A concept is **not** new-worthy just because the exact phrase isn't in `concept_definitions.json`. Before adding `NEW:`, all of the following must hold:

1. **It is not a basic finance/trading term.** Generic concepts from traditional finance — algorithmic trading, high-frequency trading, maker-taker fees, limit orders, leverage, volatility, slippage, funding rates, perpetuals, liquidations, etc. — do **not** warrant entries, even if the piece discusses them in depth. Map them to prediction-market-specific concepts that capture the underlying dynamic (market making, adverse selection, toxic flow, liquidity provision, execution quality, retail flow, bid-ask spread, order book) or omit them entirely.
2. **It is not a synonym or near-synonym of an existing entry.** Read `concept_definitions.json` first and look for overlap.
3. **It names something specific to prediction markets or a genuinely novel framing from the piece.** Examples of concepts that *did* clear this bar: "semantic tick size", "corruption value multiple", "minimum viable liquidity", "info finance", "LOX (log-odds excess lateness)". Each captures something you cannot find well-explained in a finance textbook.
4. **You can imagine it being the primary concept of 3+ future articles.** One-off framings don't belong in the taxonomy.

If in doubt, use existing concepts or include fewer than 5 concepts. A 3-concept article with tight existing concepts is better than a 5-concept article padded with a weak `NEW:` entry.

### Concept selection workflow

1. Read the piece and list its core ideas in plain language
2. Open `concept_definitions.json` and match each idea to the closest existing entry
3. Only consider `NEW:` for ideas that clearly fail the four tests above
4. Prefer 3-4 strong existing concepts over 5 concepts that include a weak new one

## Platform Rules

- Only include platforms **meaningfully discussed**, not just mentioned
- Use canonical names; prefix new platforms with `NEW:`
- Empty array if article is general/theoretical

## Editorial Blurb Rules

2-3 sentences. Direct and factual. Answer: "Why should I read this?"

**No:** em dashes, "Not X but Y" constructions, superlatives about quality, banned words (thought-provoking, rigorous, compelling, essential reading, deep dive, etc.)

## Title

Always use **Title Case** regardless of original styling.

## Concept Clusters (for `src/lib/concepts.ts`)

- **oracle** — oracle design, dispute resolution, UMA, corruption value, resolution criteria
- **liquidity** — market making, adverse selection, arbitrage, hedging, spreads, liquidity provision
- **information** — information aggregation, wisdom of crowds, calibration, forecasting
- **mechanism** — scoring rules, LMSR, incentive compatibility, derivatives, AMM, conditional tokens
- **governance** — futarchy, token voting, decision markets, impact markets
- **business** — network effects, platform competition, regulatory arbitrage, elections

## Twitter/X Content Extraction

When the URL matches `x.com` or `twitter.com`, use `twitter` CLI (twitter-cli) to extract content. It talks directly to Twitter's internal GraphQL API using your browser cookies.

### URLs formats and which command to use

- **Tweet** (`x.com/user/status/<id>` or `twitter.com/user/status/<id>`): `twitter tweet <id-or-url> --json`
- **X Article** (`x.com/i/article/<id>` or `x.com/<user>/article/<id>`): `twitter article <id-or-url> --json`
- **Thread**: `twitter tweet <first-tweet-url-or-id> --json` — the reply chain from the same author is included in the output

### Output mapping

`twitter tweet <id> --json` returns a structured envelope:

```yaml
ok: true
data:
  id: "1234567890"
  author:
    name: "Display Name"
    screenName: "handle"        # without @
  text: "Tweet body text..."
  createdAt: "2026-01-15T10:30:00.000Z"
  replyCount: 5
  metrics: { likes: 120, retweets: 34, replies: 5 }
  media: [...]
  isThread: true                # if thread with replies from same author
  thread:                       # array of reply tweets from same author
    - id: "..."
      text: "..."
      createdAt: "..."
```

For X Articles, `twitter article <id> --json` adds `articleTitle` and `articleText` (markdown) fields.

### Map to article fields:
- `author` → `data.author.name`
- `author_twitter` → `@` + `data.author.screenName`
- `publish_date` → `data.createdAt` (convert to YYYY-MM-DD)
- `source_type` → `"Twitter"`
- `content_type` → `"Twitter Thread"` if `isThread` or `thread` has multiple posts, otherwise `"Opinion"` or `"Analysis"`
- For X Articles, `content_type` → `"Analysis"` or `"Explainer"` depending on depth
- Use `data.text` (and `thread[].text` / `articleText` if applicable) to determine `concepts`, `editorial_blurb`, `primary_category`, etc.

### If extraction fails
- `not_authenticated` / `AUTH_NEEDED`: Ask user to log into x.com in Chrome/Arc/Firefox and retry
- `not_found`: The tweet/article may be deleted or the ID is wrong — ask user to verify the URL
- `rate_limited`: Wait 5 minutes and retry
- Other errors: Tell the user and ask them to paste the tweet text directly
