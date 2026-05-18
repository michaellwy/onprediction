---
name: migration
description: Create and apply a Supabase migration for OnPrediction. Use when adding tables, columns, indexes, RLS policies, or RPC functions to the Supabase project (ref saavnuixlyaovzwmmznr). Codifies the timestamp format, file location, and apply command.
allowed-tools: Read, Write, Edit, Bash(ls supabase/migrations/*), Bash(date *), Bash(supabase db push *), Bash(supabase migration *), Glob, Grep
disable-model-invocation: true
---

Create a new Supabase migration for OnPrediction. The user invokes this with `/migration <short description>` — for example: `/migration relax article view dedup window`.

## Steps

1. **Check the migrations directory** — `ls supabase/migrations/` and note the highest existing timestamp. New filenames follow the convention `YYYYMMDDHHMMSS_<snake_case_description>.sql`.

2. **Generate the timestamp** — use the next round value above the highest existing one (the project uses `YYYYMMDD000000` for daily migrations, not the literal current time). If today already has a migration, increment by one day.

3. **Write the migration file** — `supabase/migrations/<timestamp>_<snake_description>.sql`. Conventions:
   - Leading comment block explaining *why* the change exists (commit message rots, the SQL file doesn't).
   - Use `IF NOT EXISTS` / `IF EXISTS` guards for idempotency.
   - Wrap RLS policy changes carefully — `DROP POLICY IF EXISTS <name> ON <table>;` before recreating.
   - For RPCs: `CREATE OR REPLACE FUNCTION ... SECURITY DEFINER` (anonymous tables block direct reads — RPCs are how clients get aggregated data).
   - Grant execute to `anon, authenticated` for RPCs that should be callable from the browser.

4. **Confirm with the user before applying** — show the migration file path and contents. Migrations apply to production directly; there is no preview database. Wait for explicit "apply it" before step 5.

5. **Apply the migration** — run `supabase db push` from the project root. The DB connection string is in `.env.local` under `SUPABASE_DB_URL` (see `reference_supabase_db.md` in memory). If the command fails for missing CLI auth, tell the user to run `supabase login` themselves rather than trying to auth from this session.

6. **Verify** — for table or column changes, suggest a follow-up read from the affected table to confirm. For RPC changes, suggest invoking the RPC once with test args.

## Notes

- **Don't edit existing migrations.** Even if they haven't been applied yet — write a new one. The migration history is append-only.
- **RLS by default.** Every new table should have RLS enabled. Default policies should be restrictive; expose data via `SECURITY DEFINER` RPCs.
- **Anonymous insert is OK** for `article_views` and similar fire-and-forget telemetry. Anonymous reads almost never are.
- **Schema mismatches with the app** — if the migration changes a table the app reads, also update the TypeScript types in `src/types/` and any hook in `src/hooks/` that uses the affected fields. The user is responsible for keeping these in sync; flag it as a follow-up if you can't see the app-side touchpoint.

## Example file shape

```sql
-- 20260518000000_add_share_quote_index.sql
-- Speeds up the share-quote backfill query in extract-share-quotes.mjs
-- by avoiding a full table scan when filtering NULL share_quote rows.

CREATE INDEX IF NOT EXISTS idx_articles_share_quote_null
  ON articles (id)
  WHERE share_quote IS NULL;
```
