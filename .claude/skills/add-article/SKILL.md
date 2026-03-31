---
name: add-article
description: Add a new article to the OnPrediction prediction market reading list. Use when the user provides a URL or PDF to add to the database.
allowed-tools: Read, Edit, Bash(npm run sync:concepts), Bash(cd ~/.claude/skills/playwright-skill && node run.js *), WebFetch, Glob, Grep
---

Add the article provided in $ARGUMENTS to the OnPrediction database.

## Steps

1. **Check for duplicates** — search `articles_database.json` for the URL. If it exists, stop and tell the user which article ID it matches.

2. **Fetch the content** — choose the right method:
   - **X/Twitter URLs** (`x.com` or `twitter.com`): Use Playwright to scrape (see "Twitter/X Scraping" section below)
   - **Other URLs**: Use `WebFetch`
   - **PDFs**: Use `Read` for files in `/articles/`

3. **Determine next ID** — check the last entry in `articles_database.json`.

4. **Add to `articles_database.json`** — analyze content and populate all fields per the schema below. Set `fetch_status` to `"web"` (URL) or `"pdf"` (PDF).

5. **Add to `prediction-market-reading-list.csv`** — format: `ID,Title,Date (D/M/YYYY),Author,URL`

6. **Write definitions for NEW: concepts** — before running sync, open `concept_definitions.json` and add a definition for every concept prefixed with `NEW:`. Use 1-2 sentences: what the concept is and why it matters in prediction markets. Do NOT leave a definition as an empty string `""`.

7. **Run `npm run sync:concepts`**

8. **Check concept cluster mapping** — verify any new concepts appear in `src/lib/concepts.ts` `conceptToCluster`. If missing, add them with the appropriate cluster.

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
- Prefix genuinely new concepts with `NEW:` and place first in array
- Use canonical forms from `concept_definitions.json` when possible
- Prefer specific over generic (e.g., "LMSR" over "scoring rules")
- Only include "information aggregation" or "price discovery" if genuinely central
- Order: NEW concepts first → specific → generic last

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

## Twitter/X Scraping

When the URL matches `x.com` or `twitter.com`, use Playwright to extract content because WebFetch cannot render Twitter's JavaScript-heavy pages.

**Step 1:** Write this scraper to `/tmp/pw-tweet-scrape.js` (replace `$TWEET_URL` with the actual URL):

```javascript
const { chromium } = require('playwright');

const TWEET_URL = '$TWEET_URL';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  try {
    // IMPORTANT: Use domcontentloaded, NOT networkidle — Twitter never stops making requests
    await page.goto(TWEET_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForSelector('article[data-testid="tweet"]', { timeout: 15000 });
    await page.waitForTimeout(2000); // Let text hydrate

    const data = await page.evaluate(() => {
      const article = document.querySelector('article[data-testid="tweet"]');
      if (!article) return { error: 'No tweet found' };

      // Author
      const userNameEl = article.querySelector('div[data-testid="User-Name"]');
      const displayName = userNameEl?.querySelector('span')?.textContent || '';
      const handleLinks = userNameEl?.querySelectorAll('a[role="link"]') || [];
      let handle = '';
      for (const a of handleLinks) {
        if (a.textContent?.startsWith('@')) { handle = a.textContent; break; }
      }

      // Tweet text (may be empty for X articles — fallback to allText)
      const tweetTextEl = article.querySelector('div[data-testid="tweetText"]');
      const tweetText = tweetTextEl?.innerText || '';

      // Timestamp
      const timeEl = article.querySelector('time');
      const datetime = timeEl?.getAttribute('datetime') || '';

      // Full article text (captures X long-form articles embedded in the tweet)
      const allText = article.innerText || '';

      return { displayName, handle, tweetText, datetime, allText };
    });

    // For threads: scroll and collect all posts from same author
    const threadPosts = await page.evaluate((authorHandle) => {
      const articles = document.querySelectorAll('article[data-testid="tweet"]');
      const posts = [];
      for (const art of articles) {
        const userEl = art.querySelector('div[data-testid="User-Name"]');
        const links = userEl?.querySelectorAll('a[role="link"]') || [];
        let h = '';
        for (const a of links) {
          if (a.textContent?.startsWith('@')) { h = a.textContent; break; }
        }
        if (h === authorHandle) {
          const textEl = art.querySelector('div[data-testid="tweetText"]');
          if (textEl) posts.push(textEl.innerText);
        }
      }
      return posts;
    }, data.handle);

    if (threadPosts.length > 1) {
      data.threadText = threadPosts.join('\n\n---\n\n');
      data.isThread = true;
      data.tweetCount = threadPosts.length;
    }

    // Use allText as content if tweetText is empty (X articles)
    if (!data.tweetText && data.allText) {
      data.content = data.allText;
    }

    console.log(JSON.stringify(data, null, 2));
  } catch (error) {
    console.error(JSON.stringify({ error: error.message }));
  } finally {
    await browser.close();
  }
})();
```

**Step 2:** Execute:
```bash
cd ~/.claude/skills/playwright-skill && node run.js /tmp/pw-tweet-scrape.js
```

**Step 3:** Map the output to article fields:
- `author` → `displayName`
- `author_twitter` → `handle`
- `publish_date` → `datetime` (convert to YYYY-MM-DD)
- `source_type` → `"Twitter"`
- `content_type` → `"Twitter Thread"` if `isThread`, otherwise `"Opinion"` or `"Analysis"`
- Use `tweetText`, `threadText`, or `content`/`allText` to determine `concepts`, `editorial_blurb`, `primary_category`, etc.

**If scraping fails** (e.g., login wall, timeout), tell the user and ask them to paste the tweet text directly.
