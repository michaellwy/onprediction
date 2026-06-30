/**
 * Supabase persistence for the news pipeline (service-role; bypasses RLS).
 * Upserts stories by cluster_key (update-not-duplicate for ongoing stories)
 * and tracks dedup history in news_seen.
 */

import { createClient } from "@supabase/supabase-js";
import { djb2 } from "./google-news.mjs";
import { rankOrUnranked } from "./source-reputation.mjs";

function client() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not set");
  return createClient(url, key, { auth: { persistSession: false } });
}

/** Wipe all news data (for a clean backfill/seed). */
export async function resetNews() {
  const sb = client();
  await sb.from("news_story_sources").delete().neq("id", "00000000-0000-0000-0000-000000000000");
  await sb.from("news_stories").delete().neq("id", "00000000-0000-0000-0000-000000000000");
  await sb.from("news_seen").delete().neq("url_hash", "");
  await sb.from("news_raw_items").delete().neq("url_hash", "");
}

/** Wipe only the derived stories (keeps the raw-item cache). Used by build. */
export async function resetStories() {
  const sb = client();
  await sb.from("news_story_sources").delete().neq("id", "00000000-0000-0000-0000-000000000000");
  await sb.from("news_stories").delete().neq("id", "00000000-0000-0000-0000-000000000000");
}

// ---------- Raw-item cache (durable; written by harvest, read by build) ----------

/** Insert new raw items (existing url_hash left untouched). */
export async function upsertRawItems(items) {
  if (!items.length) return;
  const sb = client();
  const rows = items.map((it) => ({
    url_hash: djb2(it.url),
    url: it.url,
    title: it.title,
    source: it.source || null,
    source_type: it.source_type || null,
    published_at: it.published_at ? new Date(it.published_at).toISOString() : null,
    broke_day: it.broke_day || null,
  }));
  for (let i = 0; i < rows.length; i += 500) {
    await sb.from("news_raw_items").upsert(rows.slice(i, i + 500), { onConflict: "url_hash", ignoreDuplicates: true });
  }
}

/** All cached raw items — for a full re-gate when the gate's INCLUDE rules
 *  broaden (so previously-rejected items can be reconsidered). */
export async function getAllRawItems() {
  const sb = client();
  const out = [];
  let from = 0;
  for (;;) {
    const { data, error } = await sb.from("news_raw_items")
      .select("url_hash,url,title,source,source_type,published_at,broke_day").range(from, from + 999);
    if (error) throw new Error(error.message);
    out.push(...(data || []));
    if (!data || data.length < 1000) break;
    from += 1000;
  }
  return out.map((r) => ({ ...r, id: r.url_hash }));
}

/**
 * Currently on-topic raw items (any score) — the cheap re-gate candidates.
 * A stricter gate can only DEMOTE; items already off-topic stay off-topic, so
 * re-scoring them is wasted work. Re-gate just these.
 */
export async function getOnTopicRawItems() {
  const sb = client();
  const out = [];
  let from = 0;
  for (;;) {
    const { data, error } = await sb.from("news_raw_items")
      .select("url_hash,url,title,source,source_type,published_at,broke_day").eq("on_topic", true).range(from, from + 999);
    if (error) throw new Error(error.message);
    out.push(...(data || []));
    if (!data || data.length < 1000) break;
    from += 1000;
  }
  return out.map((r) => ({ ...r, id: r.url_hash }));
}

/** Raw items not yet gated. */
export async function getUngatedRawItems() {
  const sb = client();
  const out = [];
  let from = 0;
  for (;;) {
    const { data, error } = await sb.from("news_raw_items").select("url_hash,url,title,source,source_type,published_at,broke_day").is("gate_score", null).range(from, from + 999);
    if (error) throw new Error(error.message);
    out.push(...(data || []));
    if (!data || data.length < 1000) break;
    from += 1000;
  }
  return out.map((r) => ({ ...r, id: r.url_hash }));
}

/** Persist gate results. updates: [{url_hash, on_topic, gate_score}]. */
export async function setGateResults(updates) {
  const sb = client();
  for (let i = 0; i < updates.length; i += 50) {
    const chunk = updates.slice(i, i + 50);
    await Promise.all(chunk.map((u) =>
      sb.from("news_raw_items").update({ on_topic: u.on_topic, gate_score: u.gate_score }).eq("url_hash", u.url_hash)
    ));
  }
}

/** On-topic items above the gate bar that still need article text. */
export async function getOnTopicNeedingText(min) {
  const sb = client();
  const out = [];
  let from = 0;
  for (;;) {
    const { data, error } = await sb.from("news_raw_items")
      .select("url_hash,url").eq("on_topic", true).gte("gate_score", min).is("article_text", null).range(from, from + 999);
    if (error) throw new Error(error.message);
    out.push(...(data || []));
    if (!data || data.length < 1000) break;
    from += 1000;
  }
  return out;
}

/** Persist fetched article text + resolved URL. */
export async function setArticleText(url_hash, resolved_url, text) {
  const sb = client();
  await sb.from("news_raw_items").update({ resolved_url, article_text: text }).eq("url_hash", url_hash);
}

/** On-topic items above the gate bar (the clustering/build input). */
export async function getOnTopicItems(min) {
  const sb = client();
  const out = [];
  let from = 0;
  for (;;) {
    const { data, error } = await sb.from("news_raw_items")
      .select("url_hash,url,resolved_url,title,source,source_type,published_at,broke_day,gate_score,article_text,cluster_key")
      .eq("on_topic", true).gte("gate_score", min).range(from, from + 999);
    if (error) throw new Error(error.message);
    out.push(...(data || []));
    if (!data || data.length < 1000) break;
    from += 1000;
  }
  return out.map((r) => ({ ...r, id: r.url_hash, score: r.gate_score }));
}

/** Persist cluster assignment. updates: [{url_hash, cluster_key}]. */
export async function setClusterKeys(updates) {
  const sb = client();
  for (let i = 0; i < updates.length; i += 200) {
    const chunk = updates.slice(i, i + 200);
    await Promise.all(chunk.map((u) => sb.from("news_raw_items").update({ cluster_key: u.cluster_key }).eq("url_hash", u.url_hash)));
  }
}

/** Return the subset of items whose URLs have not been seen before. */
export async function filterUnseen(items) {
  const sb = client();
  const hashes = items.map((it) => djb2(it.url));
  const seen = new Set();
  // chunk the IN query to stay under limits
  for (let i = 0; i < hashes.length; i += 500) {
    const chunk = hashes.slice(i, i + 500);
    const { data } = await sb.from("news_seen").select("url_hash").in("url_hash", chunk);
    for (const row of data || []) seen.add(row.url_hash);
  }
  return items.filter((it) => !seen.has(djb2(it.url)));
}

/** Record raw item URLs as seen so future runs skip them. */
export async function markSeen(items) {
  if (!items.length) return;
  const sb = client();
  const rows = items.map((it) => ({ url_hash: djb2(it.url) }));
  for (let i = 0; i < rows.length; i += 500) {
    await sb.from("news_seen").upsert(rows.slice(i, i + 500), { onConflict: "url_hash", ignoreDuplicates: true });
  }
}

/**
 * Upsert a story and its sources. If a story with the same cluster_key already
 * exists, merge in any new outlets and bump outlet_count instead of duplicating.
 */
async function upsertStory(sb, story, status) {
  const { data: existing } = await sb
    .from("news_stories").select("id, outlet_count").eq("cluster_key", story.cluster_key).maybeSingle();

  const base = {
    slug: story.slug,
    headline: story.headline,
    summary: story.summary,
    why_it_matters: story.why_it_matters,
    primary_category: story.primary_category,
    tags: story.tags,
    platforms: story.platforms,
    lead_url: story.lead_url,
    lead_source: story.lead_source,
    score: story.score,
    importance: story.importance,
    cluster_key: story.cluster_key,
    broke_on: story.broke_on,
    status,
  };

  let storyId;
  if (existing) {
    storyId = existing.id;
    await sb.from("news_stories").update(base).eq("id", storyId);
  } else {
    // Order the feed by when the story actually broke (real timestamp from the
    // source when available — keeps date AND time), not insert time. The final
    // `new Date()` fallback only reaches undatable stories, which the ingest
    // publishable() check already routes to below_bar — so it never dates a
    // FEED-VISIBLE story as "today".
    const publishedAt = story.published_at
      ? new Date(story.published_at).toISOString()
      : (story.broke_on ? `${story.broke_on}T12:00:00Z` : new Date().toISOString());
    const { data, error } = await sb
      .from("news_stories")
      .insert({ ...base, outlet_count: story.outlet_count, published_at: publishedAt })
      .select("id").single();
    if (error) throw new Error(`insert story failed: ${error.message}`);
    storyId = data.id;
  }

  // upsert sources (unique on story_id+url)
  const srcRows = story.sources.map((s) => ({
    story_id: storyId,
    outlet: s.outlet,
    url: s.url,
    title: s.title ?? null,
    published_at: s.published_at ? new Date(s.published_at).toISOString() : null,
  }));
  await sb.from("news_story_sources").upsert(srcRows, { onConflict: "story_id,url", ignoreDuplicates: true });

  // refresh outlet_count from actual distinct sources
  const { count } = await sb.from("news_story_sources").select("*", { count: "exact", head: true }).eq("story_id", storyId);
  if (typeof count === "number") await sb.from("news_stories").update({ outlet_count: count }).eq("id", storyId);

  return storyId;
}

// ---------- Incremental match-or-create (live pipeline) ----------

/**
 * Published stories recent enough that an incoming item could belong to one.
 * Keyed on last_activity_at (bumped on every append) so an ongoing story stays
 * in the matching window as long as coverage keeps landing.
 */
export async function getActiveStories(hours = 48) {
  const sb = client();
  const cutoff = new Date(Date.now() - hours * 3600e3).toISOString();
  const { data, error } = await sb
    .from("news_stories")
    .select("id, cluster_key, slug, headline, summary, why_it_matters, primary_category, tags, platforms, outlet_count, score, published_at, last_activity_at")
    .eq("status", "published")
    .gte("last_activity_at", cutoff)
    .order("last_activity_at", { ascending: false });
  if (error) throw new Error(error.message);
  return data || [];
}

/**
 * Recent stories (published AND hidden) for the semantic dedup pass. Includes
 * hidden ones so a development the editor already hid isn't silently recreated
 * as a fresh story. Keyed on published_at so it spans a story's break date.
 */
export async function getRecentStoriesForDedup(days = 10) {
  const sb = client();
  const cutoff = new Date(Date.now() - days * 864e5).toISOString();
  const { data, error } = await sb
    .from("news_stories")
    .select("id, cluster_key, headline, summary, status, lead_url, lead_source, platforms, tags")
    .in("status", ["published", "hidden"])
    .gte("published_at", cutoff)
    .order("published_at", { ascending: false })
    .limit(500);
  if (error) throw new Error(error.message);
  return data || [];
}

/**
 * Append new outlet sources to an existing story and bump its activity clock so
 * it stays matchable. If `update` is supplied (a material new-info rewrite),
 * refresh headline/summary/why_it_matters in place. `published_at` is NEVER
 * touched here: it is the story's true break date (earliest source), and a
 * stream of follow-up/syndicated coverage must not re-date a week-old saga to
 * "now" and float it back to the top of the feed. Freshness for the matching
 * window is tracked separately by `last_activity_at`. A genuinely new
 * development is a separate story (the assign/dedup stage splits it out).
 * If one of the incoming sources is more reputable than the current lead, it is
 * promoted to lead (so a late Reuters pickup replaces an SEO republish). The
 * slug is intentionally left unchanged (it is a permalink).
 */
export async function appendToStory(story, sources, update) {
  const sb = client();
  const storyId = story.id;
  const srcRows = (sources || []).map((s) => ({
    story_id: storyId,
    outlet: s.outlet,
    url: s.url,
    title: s.title ?? null,
    published_at: s.published_at ? new Date(s.published_at).toISOString() : null,
  }));
  if (srcRows.length) {
    await sb.from("news_story_sources").upsert(srcRows, { onConflict: "story_id,url", ignoreDuplicates: true });
  }

  const nowIso = new Date().toISOString();
  const patch = { last_activity_at: nowIso };
  const { count } = await sb.from("news_story_sources").select("*", { count: "exact", head: true }).eq("story_id", storyId);
  if (typeof count === "number") patch.outlet_count = count;

  // Promote a more-reputable incoming source to lead.
  const leadRank = rankOrUnranked(story.lead_url, story.lead_source);
  const better = (sources || [])
    .map((s) => ({ s, r: rankOrUnranked(s.url, s.outlet) }))
    .filter((x) => x.r < leadRank)
    .sort((a, b) => a.r - b.r)[0];
  if (better) { patch.lead_url = better.s.url; patch.lead_source = better.s.outlet; }

  if (update && update.changed) {
    patch.headline = update.headline;
    patch.summary = update.summary;
    if (update.why_it_matters) patch.why_it_matters = update.why_it_matters;
    // NOTE: published_at is deliberately left unchanged — see the doc comment.
    // The story keeps its real break date even when its text is updated.
  }
  await sb.from("news_stories").update(patch).eq("id", storyId);
  return { outlet_count: typeof count === "number" ? count : null, promotedLead: !!better };
}

/**
 * Attach extra outlet coverage to an existing story (coverage enrichment).
 * Like appendToStory, it upserts sources, recomputes outlet_count and promotes a
 * more-reputable incoming source to lead. UNLIKE appendToStory it does NOT bump
 * published_at or last_activity_at: enriching a historical story must not
 * resurface it to the top of the feed or re-open its match window. Slug (the
 * permalink) is left unchanged even when the headline is rewritten.
 * Returns { outlet_count, promotedLead, leadSource }.
 */
export async function attachCoverage(story, sources, update) {
  const sb = client();
  const storyId = story.id;
  const srcRows = (sources || []).map((s) => ({
    story_id: storyId,
    outlet: s.outlet,
    url: s.url,
    title: s.title ?? null,
    published_at: s.published_at ? new Date(s.published_at).toISOString() : null,
  }));
  if (srcRows.length) {
    await sb.from("news_story_sources").upsert(srcRows, { onConflict: "story_id,url", ignoreDuplicates: true });
  }

  const patch = {};
  const { count } = await sb.from("news_story_sources").select("*", { count: "exact", head: true }).eq("story_id", storyId);
  if (typeof count === "number") patch.outlet_count = count;

  const leadRank = rankOrUnranked(story.lead_url, story.lead_source);
  const better = (sources || [])
    .map((s) => ({ s, r: rankOrUnranked(s.url, s.outlet) }))
    .filter((x) => x.r < leadRank)
    .sort((a, b) => a.r - b.r)[0];
  if (better) { patch.lead_url = better.s.url; patch.lead_source = better.s.outlet; }

  if (update && update.changed) {
    patch.headline = update.headline;
    patch.summary = update.summary;
    if (update.why_it_matters) patch.why_it_matters = update.why_it_matters;
  }
  if (Object.keys(patch).length) await sb.from("news_stories").update(patch).eq("id", storyId);
  return { outlet_count: typeof count === "number" ? count : null, promotedLead: !!better, leadSource: better?.s.outlet || story.lead_source };
}

/** Persist the evaluated stories. Returns the published rows that were inserted (new). */
export async function storeStories({ published, belowBar }) {
  const sb = client();
  const newlyPublished = [];
  for (const s of published) {
    const { data: pre } = await sb.from("news_stories").select("id").eq("cluster_key", s.cluster_key).maybeSingle();
    const storyId = await upsertStory(sb, s, "published");
    if (!pre) newlyPublished.push({ ...s, id: storyId });
  }
  for (const s of belowBar) await upsertStory(sb, s, "below_bar");
  return newlyPublished;
}
