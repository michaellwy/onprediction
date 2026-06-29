# OnPrediction — Claude Code Instructions

## What This Project Is
A curated prediction market knowledge hub and community forum — a static Next.js site that indexes articles (papers, blogs, podcasts, tweets) about prediction markets, tagged with concepts and organized by category/difficulty. Includes a forum for prediction market practitioners with posts, comments, upvotes, and user profiles.

## Tech Stack
- **Next.js 15** (static export) + **React 19** + **TypeScript 5**
- **Tailwind CSS 3** + Radix UI primitives + Framer Motion
- **Supabase** for auth (Google/Twitter OAuth), upvotes, forum, and user profiles
- **Vercel** serverless functions for AI Q&A (`api/ask.ts`)
- **Claude Haiku** for "Ask the Library" AI-powered Q&A
- Deployed on **Vercel** (static + serverless)

## Key Commands
```bash
npm run dev           # Dev server
npm run build         # Static build → /out (runs prebuild scripts first)
npm run lint          # Next.js linter
npm run sync:concepts # Sync concept_definitions.json from articles DB
node scripts/scanner/scheduled-scan.mjs  # Run daily content scout (requires OpenCLI + Node 22)
npm run generate:sitemap  # Generate public/sitemap.xml
npm run generate:feed     # Generate public/feed.xml (RSS 2.0)
npm run generate:data     # Generate public/api/articles.json & concepts.json
npm run generate:llms     # Generate public/llms-full.txt
npm run generate:og       # Generate per-article OG share cards in public/og/
npm run extract:quotes    # Backfill share_quote field via DeepSeek (--id N or --force)
```

## Critical Rules

### Root Layout is a Server Component
**Never add `"use client"` to `src/app/layout.tsx`.** CSS imports break in client component layouts in Next.js 15, causing a completely unstyled page. Child components can individually be `"use client"`.

### Page Components are Server Components
All `page.tsx` files are **server components** that export `metadata` and render a client content component. Interactive logic lives in the extracted `*Content.tsx` client components. This split enables Next.js metadata exports and pre-rendered HTML for SEO.

### Adding Articles
Use the `/add-article` skill (`.claude/skills/add-article/SKILL.md`) — it codifies every step. Required updates:
1. `articles_database.json` — full metadata (see `prompt.md` for schema)
2. `prediction-market-reading-list.csv` — `ID,Title,Date (D/M/YYYY),Author,URL`
3. `npm run sync:concepts`
4. Map any new concepts to clusters in `src/lib/concepts.ts` → `conceptToCluster`
5. `npm run extract:quotes -- --id <NEW_ID>` (populates `share_quote` via DeepSeek)
6. `npm run generate:og -- --id <NEW_ID>` (writes `public/og/article-<NEW_ID>.png`)
7. Commit `public/og/article-<NEW_ID>.png` along with the DB updates

Steps 5–6 are required for the Telegram broadcast and social share previews to work for the new article. The `/add-article` skill handles them automatically.

### Concepts
- Max **5 concepts per article**
- Prefix genuinely new concepts with `NEW:` and place first in array
- Prefer specific over generic concepts
- Always use **Title Case** for article titles

## Project Structure
```
articles_database.json      # Source of truth — all article metadata
prediction-market-reading-list.csv  # Lightweight CSV index
concept_definitions.json    # Concept name → definition (synced from DB)
prompt.md                   # Curation schema & field guidelines
ADD_ARTICLE_INSTRUCTIONS.md # Step-by-step for adding articles

api/
  ask.ts                    # Vercel serverless function — AI Q&A endpoint

src/
  app/
    layout.tsx              # Root layout (SERVER COMPONENT — do not make client)
    page.tsx                # Home — server wrapper with metadata + JSON-LD
    ask/page.tsx            # Ask the Library — AI Q&A page
    concepts/page.tsx       # Concepts index — server wrapper with metadata + JSON-LD
    concepts/[slug]/page.tsx # Individual concept page (SSG via generateStaticParams)
    saved/page.tsx          # Bookmarks — server wrapper (noindex)
    forum/page.tsx          # Discussions — server wrapper with metadata
    forum/new/page.tsx      # Create new forum post (noindex)
    forum/post/page.tsx     # Individual post (uses ?id= query param)
    articles/[id]/page.tsx  # OG-metadata shell — redirects to /?article={id}
  components/
    HomeContent.tsx         # Client component — article list with filters/search/sort
    ConceptsContent.tsx     # Client component — concept graph & index
    AskContent.tsx          # Client component — AI Q&A chat interface
    ArticleDiscussionPanel.tsx # Slide-out panel for article discussions
    JsonLd.tsx              # JSON-LD structured data helper
    forum/ForumPageContent.tsx  # Client component — discussions with tabs
    forum/DiscussionFeedCard.tsx # Recent discussion feed item
    forum/DiscussionTabs.tsx    # Recent Activity / General Posts tab switcher
    # + ArticleCard, Header, FilterSidebar, etc.
  lib/
    siteConfig.ts           # Centralized site name, URL, author, locale
    articles.ts             # Article loading & helpers
    concepts.ts             # Concept clusters, graph data, definitions, slug utilities
    filters.ts              # Filter logic
    bookmarks.ts            # Bookmark utilities
  types/
    article.ts              # Article type + enums (Category, Difficulty, etc.)
    concept.ts              # Concept types + ConceptPageData
    forum.ts                # ForumPost, ForumComment, DiscussionFeedItem types
  contexts/AuthContext.tsx   # Supabase auth provider + user profile management
  hooks/                    # useFilters, useBookmarks, useUpvotes, useArticleViews,
                            # useForumPosts, useArticleDiscussion,
                            # useArticleCommentCounts, useRecentDiscussions,
                            # useAskLibrary, etc.

scripts/
  sync-concept-definitions.js  # Extracts concepts from articles DB → JSON
  generate-sitemap.js          # Generates public/sitemap.xml (includes concept pages)
  generate-feed.js             # Generates public/feed.xml (RSS 2.0)
  generate-public-data.js      # Generates public/api/articles.json & concepts.json
  generate-llms-full.js        # Generates public/llms-full.txt
  generate-ask-context.js      # Generates public/api/ask-context.json for AI Q&A
  generate-og-images.mjs       # Satori + resvg-js → public/og/article-{id}.png (per article)
  extract-share-quotes.mjs     # DeepSeek → share_quote field in articles_database.json
  broadcast-new-articles.mjs   # Diffs HEAD vs HEAD~1, posts new articles to TG channel
  og-assets/                   # Vendored WOFF fonts for OG card rendering
  scanner/
    scheduled-scan.mjs          # Daily scout: runs all sources, AI-ranks, sends Telegram digest
    config.json                 # Source configs, API keys, AI ranking params, filter rules
    lib/sources/rss.mjs         # RSS feed fetcher (10 curated PM blogs, PM-keyword filtered against full text)
    lib/sources/arxiv.mjs       # arXiv API for research papers (pre-AI PM-keyword gate)
    lib/sources/hackernews.mjs  # HN Algolia search for PM-related posts
    lib/sources/twitter-browser.mjs  # agent-browser X.com scrape, uses saved session AGENT_BROWSER_SESSION_NAME=onprediction-x
    lib/ai-ranker.mjs           # DeepSeek API scoring (1-10) with summaries
    lib/telegram.mjs            # HTML-formatted Telegram digest with inline links
    lib/heuristic-filter.mjs    # Slop removal (spam patterns, min engagement)
    lib/dedup.mjs               # 90-day seen-item tracking
    lib/output.mjs              # Markdown report generation

public/
  robots.txt                # Crawl rules + sitemap pointer
  llms.txt                  # AI agent discoverability (static)
  og/article-{id}.png       # Per-article OG share cards (committed, regenerated by prebuild)
  # Generated at build time:
  sitemap.xml, feed.xml, llms-full.txt,
  api/articles.json, api/concepts.json, api/ask-context.json,
  og/article-{id}.png

articles/                   # PDF storage (~61 files)

supabase/
  migrations/               # SQL migrations for Supabase schema
  config.toml               # Supabase CLI config (project ref: saavnuixlyaovzwmmznr)
```

## Individual Concept Pages
- Route: `/concepts/[slug]` using `generateStaticParams()` (works with static export since all concepts known at build time)
- Slug utilities in `src/lib/concepts.ts`: `conceptNameToSlug()`, `slugToConceptName()`, `getAllConceptSlugs()`, `getConceptPageData()`
- Each page has: unique metadata, JSON-LD `DefinedTerm`, sr-only content, related concepts, tagged articles
- Concept tags on article cards and concept index link to individual pages
- All concept pages included in sitemap

## Article-Anchored Discussions
- `forum_posts.article_id` column links a post to an article (NULL = standalone post)
- Lazy thread creation: `forum_posts` row created on first comment via `useArticleDiscussion` hook
- Unique partial index ensures one thread per article
- `ArticleDiscussionPanel` slide-out drawer on article cards
- Forum page redesigned with "Recent Activity" / "General Posts" tabs
- RPCs: `get_article_comment_counts()`, `get_recent_discussions()`
- Supabase tables: `forum_posts` (extended), `forum_comments`, upvotes, `user_profiles`

## Article View Tracking (Impression-based)
- Tracks **viewport impressions**, not click-to-expand. A card counts when ≥50% in view for 2 continuous seconds (IntersectionObserver + setTimeout, fire-once via useRef in `ArticleCard.tsx`)
- `article_views` Supabase table; server-side dedup via 1-hour cooldown on `created_at` (`supabase/migrations/20260407000000_relax_article_view_dedup.sql`)
- Anti-spam stack: sessionStorage dedup → in-flight Set → server 1-hour cooldown
- Viewer identity: authenticated `user.id` or localStorage UUID (`onprediction-viewer-id`)
- RPCs: `record_article_view(p_article_id, p_viewer_id)`, `get_article_view_counts()`
- RLS: anonymous insert allowed, no direct reads (data only via `security definer` RPCs)
- Hook: `useArticleViews` in `src/hooks/useArticleViews.ts` (exposes `viewCounts` Map + `recordView`)
- View counts shown pre-expansion on article cards (eye icon); upvote counts shown alongside (arrow icon, emerald)
- Sort option: "Most Viewed" (`views-desc`) in SortDropdown
- Bookmark button lives in expanded card area only, next to Discuss button

## Ask the Library (AI Q&A)
- Vercel serverless function at `api/ask.ts` (excluded from tsconfig, runs on Vercel only)
- Uses Claude Haiku with full corpus context (~96KB `ask-context.json`) in system prompt
- Streamed SSE responses with article citations
- Rate limited: **1/day anonymous** (by IP), **10/day authenticated** (by user ID)
- Hardened against prompt injection (system prompt refusal rules, input sanitization, 300 char limit)
- Usage tracked in `ask_usage` Supabase table
- Env vars (Vercel): `ANTHROPIC_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
- Test locally with `vercel dev` (not `next dev` — serverless functions need Vercel runtime)

## Telegram Broadcast Channel
- Public channel `@onprediction_reads` (https://t.me/onprediction_reads) auto-posts on every new article merged to main
- Workflow: `.github/workflows/broadcast-new-articles.yml` — triggers on push to main when `articles_database.json` changes (uses `fetch-depth: 2` for the HEAD vs HEAD~1 diff)
- Script: `scripts/broadcast-new-articles.mjs` — diffs current vs `HEAD~1`, posts only newly-added IDs. Message format: bold title, link to `/articles/{id}`, 3-4 conversational lowercase bullets from `editorial_blurb`, italic "more on onprediction.xyz" footer. Supports `--dry-run`.
- Bot lib: `scripts/scanner/lib/telegram.mjs` exposes `sendTelegramMessage(html, { chatId, botToken })` — also used by the daily scout digest (different `chatId`)
- Required secrets in GitHub Actions: `TELEGRAM_BOT_TOKEN`, `TELEGRAM_BROADCAST_CHAT_ID`. Hero CTA in `HeroBanner.tsx` hardcodes the channel URL.

## Per-Article Share Cards
- Goal: every article share (Telegram, X, anywhere) renders a unique branded preview card
- `share_quote` field on each article in `articles_database.json` — 8-14 word AI-composed pull quote (DeepSeek via `scripts/extract-share-quotes.mjs`)
- `public/og/article-{id}.png` — 1200x630 PNG generated at build time via Satori + resvg-js (`scripts/generate-og-images.mjs`). Layout: title, pull quote with orange left rule, author + source, category pill, brand mark. Skip-if-unchanged via `public/og/article-{id}.hash` sidecars (gitignored)
- Fonts vendored at `scripts/og-assets/` (Source Sans 3 + Playfair Display Italic, static WOFF — Satori does NOT support variable fonts)
- `/articles/[id]/page.tsx` — minimal SSG redirect shell. Exports per-article OpenGraph + Twitter metadata pointing at the OG PNG. Renders `<meta http-equiv="refresh">` + JS `window.location.replace` to bounce humans to `/?article={id}` (homepage with that card expanded). `robots: noindex, follow`. NOT in sitemap.
- Share button on ArticleCard uses `/articles/{id}` URL via `src/lib/share.ts`; Telegram broadcast links the same way — recipients get the preview, then land on the homepage card
- Pipeline runs in prebuild on every Vercel deploy (idempotent via hash sidecars)

## News Feed (`/news`) & Taste Curation
- Separate from the curated article reading list. Supabase-backed (`news_stories` table), AI-ingested from Google News + Federal Register + CFTC + commentary feeds. Read at runtime via the `get_news_feed` RPC (`src/hooks/useNews.ts`); `public/api/news.json` (latest 60, via `scripts/generate-news-seed.js`) is the build-time first-paint seed.
- **`news_stories.status`** gates visibility: `published` (in feed + search + seed), `hidden` (manually curated out — reversible, still in DB), `below_bar` (auto-held by ingest: all-spam-sourced or under `PUBLISH_MIN_SCORE`). The read RLS policy + every RPC only expose `published`.
- **Pipeline** (`scripts/news/ingest.mjs`, designed for a ~20-min cron): scrape recent → spam pre-gate → AI on-topic gate + score (`lib/evaluate.mjs`, DeepSeek) → fetch text → match-or-create against the live 7-day window → publish stories clearing `PUBLISH_MIN_SCORE` (7) that aren't all-spam. `.github/workflows/news-ingest.yml` exists but is NOT active (uncommitted, on `news-feed` branch — scheduled workflows only fire from the default branch).
- **Source reputation** (`src/lib/sourceReputation.json`, read by BOTH frontend `sourceReputation.ts` and pipeline `lib/source-reputation.mjs`): `tiers` allowlist (1=best) picks the lead source; `denylist` of SEO/content-mill/affiliate domains — a story is held only when EVERY source is denylisted.

### Taste curation tooling (`scripts/news/`)
Signal-vs-noise is a SEPARATE judgment from the on-topic gate: many on-topic, high-scoring stories (volume-record churn, opinion, roundups, dupes) are noise. The editor's taste lives in **`scripts/news/taste.md`** (read verbatim as the classifier rubric — edit the prose to retune; no code change). Core rule: *a specific event by a named entity with figures/jurisdiction = signal; a trend/metric/opinion/rehash = noise.*
- `lib/taste-classifier.mjs` — `classifyTaste(stories)` → `{verdict: signal|noise|uncertain, reason}` per story (DeepSeek, retries transient failures).
- `taste-review.mjs` — classify the hidden backlog into buckets; `--publish-signal` flips the signal bucket to `published`. Writes `taste-review.json`.
- `taste-eval.mjs` — validates the classifier against real decisions. NOTE: `status='hidden'` is NOT a clean "noise" label — the backlog was bulk-hidden as a reset and is mostly unreviewed-but-good, so treat hidden as unlabeled, not negative.
- `export-review.mjs` / `apply-review.mjs` — manual review path: export published stories to an editable TSV/CSV, mark `keep`/`hide` + optional `down`/`deny` source action, apply back (hides stories + edits `sourceReputation.json`).
- **After any status change, re-run `node scripts/generate-news-seed.js`** to refresh the SSR seed. Curation via the service-role key + Supabase REST (`SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_SUPABASE_URL` in `.env.local`).
- News DB migrations: `supabase/migrations/20260627*` + later `news_*`.

## Forum (Legacy)
- Uses **query params** (`/forum/post?id=<uuid>`) not dynamic routes
- Author names are **denormalized** at write time from `user_profiles.display_name`
- Profile updates cascade to all existing posts/comments
- Nav order: **Forum, Articles, Concepts, Ask** (Articles at `/` is default landing page)
- Dependencies: `react-markdown`, `remark-gfm`, `rehype-sanitize`

## Data Schema (articles_database.json)
Each article has: `id`, `url`, `title`, `author`, `author_twitter`, `source_type`, `publish_date` (YYYY-MM-DD), `primary_category`, `content_type`, `difficulty`, `concepts[]`, `platforms_mentioned[]`, `editorial_blurb`, `share_quote`, `fetch_status`

**Categories:** Fundamentals, Design, Microstructure, Platforms, Applications, Business, Regulation, Commentary
**Difficulty:** None, Some, Extensive
**Content Types:** Opinion, Research Paper, Explainer, Analysis, Case Study, Podcast

## Concept Clusters (in concepts.ts)
- **oracle** — Oracle design, dispute resolution, UMA, corruption value
- **liquidity** — Market making, adverse selection, arbitrage, hedging, spreads
- **information** — Information aggregation, wisdom of crowds, calibration, forecasting
- **mechanism** — Scoring rules, LMSR, incentive compatibility, derivatives
- **governance** — Futarchy, token voting, decision markets, impact markets
- **business** — Network effects, platform competition, regulatory arbitrage, elections

## SEO & Discoverability
- **Site config** (`src/lib/siteConfig.ts`): Single source of truth for site URL, name, author — update here when custom domain is acquired
- **Metadata**: Every `page.tsx` exports Next.js `Metadata` with title, description, OG, Twitter tags. Title template: `%s | On Prediction`
- **JSON-LD**: `WebSite` schema in root layout; `ItemList` on home page; `DefinedTermSet` on concepts page
- **Pre-rendered content**: Home page and concepts page include `sr-only` content (article titles, concept definitions) visible to crawlers
- **Build pipeline**: `prebuild` runs 6 scripts (sitemap, feed, data, llms, ask-context, og-images) before `next build`. All output goes to `public/` so Next.js copies it to `out/`
- **Concept pages**: 80+ individual concept pages at `/concepts/[slug]` with unique metadata and JSON-LD `DefinedTerm`
- **noindex pages**: `/saved` and `/forum/new` are excluded from indexing via `robots` metadata
