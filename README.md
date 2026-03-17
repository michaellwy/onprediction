# On Prediction

A curated prediction market knowledge hub and community forum. Browse 100+ articles, papers, podcasts, and tweets about prediction markets — tagged with concepts and organized by category and difficulty.

**Live at [onprediction.xyz](https://onprediction.xyz)**

## Features

- **Article library** — Curated readings with filters by category, difficulty, source type, and date range. Full-text search, upvotes, and bookmarks.
- **Concept graph** — 70+ prediction market concepts organized into 6 clusters (oracle design, liquidity, information theory, mechanism design, governance, business) with co-occurrence relationships.
- **Community forum** — Discussion space for prediction market practitioners with posts, comments, and upvotes.
- **RSS feed** — Subscribe at `/feed.xml`
- **AI-friendly** — `llms.txt`, public JSON API at `/api/articles.json` and `/api/concepts.json`

## Tech Stack

- **Next.js 15** (static export) + React 19 + TypeScript
- **Tailwind CSS** + Radix UI + Framer Motion
- **Supabase** for auth, upvotes, forum, and user profiles
- Deployed on **Vercel**

## Getting Started

```bash
npm install
npm run dev
```

## Build

```bash
npm run build    # Runs prebuild scripts (sitemap, RSS, API data, llms.txt) then Next.js static export → /out
```

## Adding Articles

See [ADD_ARTICLE_INSTRUCTIONS.md](ADD_ARTICLE_INSTRUCTIONS.md) for the full workflow. In short:

1. Add entry to `articles_database.json`
2. Add row to `prediction-market-reading-list.csv`
3. Run `npm run sync:concepts`
4. Map any new concepts in `src/lib/concepts.ts`

## Project Structure

```
articles_database.json          # Source of truth — all article metadata
prediction-market-reading-list.csv  # Lightweight CSV index
concept_definitions.json        # Concept → definition (synced from DB)
prompt.md                       # Curation schema & field guidelines

src/
  app/                          # Next.js pages (server component wrappers)
  components/                   # UI components (client components)
  lib/                          # Data loading, config, utilities
  types/                        # TypeScript types
  contexts/                     # Auth context
  hooks/                        # React hooks

scripts/                        # Build-time generators (sitemap, RSS, API, llms)
public/                         # Static assets + generated files
supabase/                       # Migrations & config
```

## License

All rights reserved.
