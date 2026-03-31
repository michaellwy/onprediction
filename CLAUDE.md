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
npm run generate:sitemap  # Generate public/sitemap.xml
npm run generate:feed     # Generate public/feed.xml (RSS 2.0)
npm run generate:data     # Generate public/api/articles.json & concepts.json
npm run generate:llms     # Generate public/llms-full.txt
```

## Critical Rules

### Root Layout is a Server Component
**Never add `"use client"` to `src/app/layout.tsx`.** CSS imports break in client component layouts in Next.js 15, causing a completely unstyled page. Child components can individually be `"use client"`.

### Page Components are Server Components
All `page.tsx` files are **server components** that export `metadata` and render a client content component. Interactive logic lives in the extracted `*Content.tsx` client components. This split enables Next.js metadata exports and pre-rendered HTML for SEO.

### Adding Articles
Every new article requires updates to **both** files, then a sync:
1. `articles_database.json` — full metadata (see `prompt.md` for schema)
2. `prediction-market-reading-list.csv` — `ID,Title,Date (D/M/YYYY),Author,URL`
3. Run `npm run sync:concepts`
4. Map any new concepts to clusters in `src/lib/concepts.ts` → `conceptToCluster`

See `ADD_ARTICLE_INSTRUCTIONS.md` for full details.

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

public/
  robots.txt                # Crawl rules + sitemap pointer
  llms.txt                  # AI agent discoverability (static)
  # Generated at build time:
  sitemap.xml, feed.xml, llms-full.txt,
  api/articles.json, api/concepts.json, api/ask-context.json

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

## Article View Tracking
- Tracks card expansions as a passive engagement metric (no auth required)
- `article_views` Supabase table with unique constraint on `(article_id, viewer_id, view_date)`
- Anti-spam: sessionStorage dedup → in-flight dedup → DB unique constraint
- Viewer identity: authenticated `user.id` or localStorage UUID (`onprediction-viewer-id`)
- RPCs: `record_article_view(p_article_id, p_viewer_id)`, `get_article_view_counts()`
- RLS: anonymous insert allowed, no direct reads (data only via `security definer` RPCs)
- Hook: `useArticleViews` in `src/hooks/useArticleViews.ts`
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

## Forum (Legacy)
- Uses **query params** (`/forum/post?id=<uuid>`) not dynamic routes
- Author names are **denormalized** at write time from `user_profiles.display_name`
- Profile updates cascade to all existing posts/comments
- Nav order: **Forum, Articles, Concepts, Ask** (Articles at `/` is default landing page)
- Dependencies: `react-markdown`, `remark-gfm`, `rehype-sanitize`

## Data Schema (articles_database.json)
Each article has: `id`, `url`, `title`, `author`, `author_twitter`, `source_type`, `publish_date` (YYYY-MM-DD), `primary_category`, `content_type`, `difficulty`, `concepts[]`, `platforms_mentioned[]`, `editorial_blurb`, `fetch_status`

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
- **Build pipeline**: `prebuild` runs 5 scripts (sitemap, feed, data, llms, ask-context) before `next build`. All output goes to `public/` so Next.js copies it to `out/`
- **Concept pages**: 80+ individual concept pages at `/concepts/[slug]` with unique metadata and JSON-LD `DefinedTerm`
- **noindex pages**: `/saved` and `/forum/new` are excluded from indexing via `robots` metadata
