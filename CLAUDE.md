# OnPrediction — Claude Code Instructions

## What This Project Is
A curated prediction market knowledge hub and community forum — a static Next.js site that indexes articles (papers, blogs, podcasts, tweets) about prediction markets, tagged with concepts and organized by category/difficulty. Includes a forum for prediction market practitioners with posts, comments, upvotes, and user profiles.

## Tech Stack
- **Next.js 15** (static export) + **React 19** + **TypeScript 5**
- **Tailwind CSS 3** + Radix UI primitives + Framer Motion
- **Supabase** for auth (Google/Twitter OAuth), upvotes, forum, and user profiles
- Deployed on **Vercel** (static)

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

src/
  app/
    layout.tsx              # Root layout (SERVER COMPONENT — do not make client)
    page.tsx                # Home — server wrapper with metadata + JSON-LD
    concepts/page.tsx       # Concepts — server wrapper with metadata + JSON-LD
    saved/page.tsx          # Bookmarks — server wrapper (noindex)
    forum/page.tsx          # Forum index — server wrapper with metadata
    forum/new/page.tsx      # Create new forum post (noindex)
    forum/post/page.tsx     # Individual post (uses ?id= query param)
  components/
    HomeContent.tsx         # Client component — article list with filters/search/sort
    ConceptsContent.tsx     # Client component — concept graph & index
    JsonLd.tsx              # JSON-LD structured data helper
    forum/ForumPageContent.tsx  # Client component — forum post list
    # + ArticleCard, Header, FilterSidebar, etc.
  lib/
    siteConfig.ts           # Centralized site name, URL, author, locale
    articles.ts             # Article loading & helpers
    concepts.ts             # Concept clusters, graph data, definitions
    filters.ts              # Filter logic
    bookmarks.ts            # Bookmark utilities
  types/
    article.ts              # Article type + enums (Category, Difficulty, etc.)
    concept.ts              # Concept types
    forum.ts                # ForumPost, ForumComment, ForumSortOption types
  contexts/AuthContext.tsx   # Supabase auth provider + user profile management
  hooks/                    # useFilters, useBookmarks, useUpvotes, useForumPosts, etc.

scripts/
  sync-concept-definitions.js  # Extracts concepts from articles DB → JSON
  generate-sitemap.js          # Generates public/sitemap.xml
  generate-feed.js             # Generates public/feed.xml (RSS 2.0)
  generate-public-data.js      # Generates public/api/articles.json & concepts.json
  generate-llms-full.js        # Generates public/llms-full.txt

public/
  robots.txt                # Crawl rules + sitemap pointer
  llms.txt                  # AI agent discoverability (static)
  # Generated at build time:
  sitemap.xml, feed.xml, llms-full.txt, api/articles.json, api/concepts.json

articles/                   # PDF storage (~61 files)

supabase/
  migrations/               # SQL migrations for Supabase schema
  config.toml               # Supabase CLI config (project ref: saavnuixlyaovzwmmznr)
```

## Forum
- Uses **query params** (`/forum/post?id=<uuid>`) not dynamic routes — static export doesn't support dynamic routes
- Author names are **denormalized** at write time from `user_profiles.display_name`
- Profile updates cascade to all existing posts/comments
- Nav order: **Forum, Articles, Concepts** (Articles at `/` is default landing page)
- Dependencies: `react-markdown`, `remark-gfm`, `rehype-sanitize`
- Supabase tables: `forum_posts`, `forum_comments`, `forum_post_upvotes`, `forum_comment_upvotes`, `user_profiles`

## Data Schema (articles_database.json)
Each article has: `id`, `url`, `title`, `author`, `author_twitter`, `source_type`, `publish_date` (YYYY-MM-DD), `primary_category`, `content_type`, `difficulty`, `concepts[]`, `platforms_mentioned[]`, `editorial_blurb`, `fetch_status`

**Categories:** Fundamentals, Design, Microstructure, Platforms, Applications, Business, Commentary
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
- **Build pipeline**: `prebuild` runs 4 scripts (sitemap, feed, data, llms) before `next build`. All output goes to `public/` so Next.js copies it to `out/`
- **noindex pages**: `/saved` and `/forum/new` are excluded from indexing via `robots` metadata
