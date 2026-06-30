#!/usr/bin/env node
/**
 * Incremental live-feed ingest — the whole news pipeline in one cheap pass.
 * Replaces the old harvest + build split. Designed to run on a short cron
 * (~every 20 min). Each run does work proportional to the HANDFUL OF NEW ITEMS,
 * never the whole archive:
 *
 *   scrape recent  →  keep only new URLs  →  spam pre-gate  →  AI on-topic gate
 *   →  fetch article text  →  match each new item against the last ~48h of live
 *   stories: append its outlet (and rewrite the story in place if it adds real
 *   new info), or open a brand-new story.
 *
 * There is no global re-clustering and no full rebuild of the stories table, so
 * the run stays fast no matter how much history has accumulated.
 *
 *   node scripts/news/ingest.mjs [--since YYYY-MM-DD] [--broadcast] [--deploy]
 */

import { readFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

import { fetchGoogleNews, fetchGoogleNewsRange, hostOf } from "./lib/google-news.mjs";
import { fetchFederalRegister, fetchCFTC, fetchCommentaryFeeds } from "./lib/extra-sources.mjs";
import {
  gateScoreAll, shapeStory, analyzeStories, makeClusterKey,
  assignToStories, updateStoryText, findDuplicateStory, GATE_MIN, PUBLISH_MIN_SCORE,
} from "./lib/evaluate.mjs";
import { classifyTaste } from "./lib/taste-classifier.mjs";
import { preGateFilter } from "./lib/heuristic-filter.mjs";
import { enrichStory } from "./lib/enrich.mjs";
import { fetchArticleText, mapPool } from "./lib/article-text.mjs";
import {
  upsertRawItems, getUngatedRawItems, setGateResults, setArticleText,
  getActiveStories, getRecentStoriesForDedup, appendToStory, attachCoverage, storeStories,
} from "./lib/store.mjs";
import { sendTelegramMessage, escapeHtml } from "../scanner/lib/telegram.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const BROADCAST = args.includes("--broadcast");
const DEPLOY = args.includes("--deploy");
const sinceIdx = args.indexOf("--since");
const SINCE = sinceIdx !== -1 ? args[sinceIdx + 1] : null;

const envPath = join(__dirname, "..", "..", ".env.local");
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, "utf-8").split("\n")) {
    const t = line.trim(); if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("="); if (i === -1) continue;
    const k = t.slice(0, i).trim(); if (!process.env[k]) process.env[k] = t.slice(i + 1).trim();
  }
}

const todayYmd = new Date().toISOString().slice(0, 10);
const urlOf = (m) => m.resolved_url || m.url;

function dedupeByUrl(items) {
  const seen = new Set(); const out = [];
  for (const it of items) {
    const key = hostOf(it.url) + "|" + it.title.toLowerCase().slice(0, 55);
    if (seen.has(it.url) || seen.has(key)) continue;
    seen.add(it.url); seen.add(key); out.push(it);
  }
  return out;
}

// Significant tokens (4+ chars) of a story's headline + summary, for cheaply
// shortlisting dedup candidates before the LLM same-event check.
function sigTokens(s) {
  return new Set((`${s.headline} ${s.summary || ""}`.toLowerCase().match(/[a-z0-9$]{4,}/g) || []));
}
function dedupShortlist(story, recent, { min = 3, cap = 8 } = {}) {
  const a = sigTokens(story);
  const plats = new Set((story.platforms || []).map((p) => p.toLowerCase()));
  return recent
    .map((c) => {
      const b = sigTokens(c);
      let overlap = 0;
      for (const t of a) if (b.has(t)) overlap++;
      // A shared platform is a strong hint even with few shared words.
      const platShare = (c.platforms || []).some((p) => plats.has(p.toLowerCase()));
      return { c, score: overlap + (platShare ? 2 : 0) };
    })
    .filter((x) => x.score >= min)
    .sort((a, b) => b.score - a.score)
    .slice(0, cap)
    .map((x) => x.c);
}

function buildDigest(stories) {
  const lines = ["<b>📊 Prediction Market News</b>", ""];
  for (const s of stories) {
    lines.push(`<b>${escapeHtml(s.headline)}</b>`);
    for (const b of (s.summary || "").split("\n").filter(Boolean)) lines.push(`• ${escapeHtml(b)}`);
    lines.push(`<a href="${s.lead_url}">${escapeHtml(s.lead_source || hostOf(s.lead_url))}</a>`);
    lines.push("");
  }
  lines.push("<i>more on onprediction.xyz/news</i>");
  return lines.join("\n");
}

async function main() {
  const mode = SINCE ? `${SINCE} → ${todayYmd}` : "recent window";
  console.error(`=== Ingest (${mode}) ===`);

  // 1. Scrape the recent surface. Window size only affects how far back a
  //    late-indexed item can still be admitted — it does NOT add cost, because
  //    everything already seen is dropped before any AI runs.
  const rangeDays = SINCE ? Math.round((Date.parse(todayYmd) - Date.parse(SINCE)) / 864e5) + 1 : 2;
  const [google, fedReg, cftc, commentary] = await Promise.all([
    SINCE ? fetchGoogleNewsRange(SINCE, todayYmd) : fetchGoogleNews(2),
    fetchFederalRegister(rangeDays),
    fetchCFTC(rangeDays),
    fetchCommentaryFeeds(rangeDays),
  ]);
  const scraped = dedupeByUrl([...google, ...fedReg, ...cftc, ...commentary]);
  const { kept, dropped } = preGateFilter(scraped);
  console.error(`Scraped ${scraped.length} unique (google:${google.length} fedreg:${fedReg.length} cftc:${cftc.length} commentary:${commentary.length}); pre-gate dropped ${dropped.length} spam, ${kept.length} kept.`);
  await upsertRawItems(kept);

  // 2. Only genuinely-new URLs (no gate verdict yet) cost anything downstream.
  const ungated = await getUngatedRawItems();
  if (!ungated.length) { console.error("No new items — feed already up to date."); return finish([]); }
  console.error(`Gating ${ungated.length} new items...`);
  const gated = await gateScoreAll(ungated);
  await setGateResults(gated.map((g) => ({ url_hash: g.url_hash, on_topic: g.on_topic, gate_score: g.gate_score })));
  const onTopic = gated.filter((g) => g.on_topic && (g.gate_score || 0) >= GATE_MIN);
  console.error(`${onTopic.length} new on-topic items clear the gate.`);
  if (!onTopic.length) return finish([]);

  // 3. Fetch article text for the new on-topic items (cache it back). Also read
  //    each article's OWN publish date from the page and use it as the story's
  //    date — the Google News pubDate is the index/syndication time, not the
  //    byline date, so trust the article itself when it states one.
  let got = 0, dated = 0;
  await mapPool(onTopic, 6, async (it) => {
    const { url, text, published } = await fetchArticleText(it.url);
    it.resolved_url = url || it.url;
    it.article_text = text || "";
    it.score = it.gate_score;
    if (text) got++;
    if (published) {
      it.published_at = new Date(published).toISOString();
      it.broke_day = it.published_at.slice(0, 10);
      dated++;
    }
    await setArticleText(it.url_hash, url, text);
  });
  console.error(`  got text for ${got}/${onTopic.length}; real publish date for ${dated}/${onTopic.length}`);

  // 4. Match each new item against the live window: existing story or new group.
  //    7-day window: hacks, lawsuits and fundraises keep drawing follow-up
  //    coverage for days, so a still-active story should absorb it, not fork.
  const active = await getActiveStories(24 * 7);
  console.error(`Matching ${onTopic.length} items against ${active.length} active stories...`);
  const assign = await assignToStories(onTopic, active);

  const groups = new Map(); // group key -> items[]
  for (const it of onTopic) {
    const g = assign.get(String(it.id)) || `new:solo-${it.id}`; // model dropped it → own story
    if (!groups.has(g)) groups.set(g, []);
    groups.get(g).push(it);
  }

  // 5. Apply: append-to-existing (with optional in-place update) or shape-new.
  const newStories = [];
  let appended = 0, updated = 0;
  for (const [key, members] of groups) {
    const m = /^S(\d+)$/.exec(key);
    const story = m ? active[Number(m[1])] : null;
    if (story) {
      const sources = members.map((it) => ({ outlet: it.source || hostOf(urlOf(it)), url: urlOf(it), title: it.title ?? null, published_at: it.published_at }));
      const upd = await updateStoryText(story, members.map((it) => it.article_text));
      const res = await appendToStory(story, sources, upd);
      appended++; if (upd.changed) updated++;
      console.error(`  + ${members.length} outlet(s) → "${story.headline.slice(0, 60)}"${upd.changed ? " [updated]" : ""}${res.promotedLead ? " [lead promoted]" : ""}`);
    } else {
      const leadUrl = urlOf(members.slice().sort((a, b) => (b.score || 0) - (a.score || 0))[0]);
      const clusterKey = makeClusterKey(key.replace(/^new:/, ""), leadUrl);
      for (const it of members) it.cluster_key = clusterKey;
      const shaped = shapeStory(members);
      if (shaped) newStories.push(shaped);
    }
  }

  // 6. Interpret, dedup, taste-gate, then persist the new stories.
  let newlyPublished = [];
  if (newStories.length) {
    // 6a. Interpret first (clean headline + summary) so dedup and taste both read
    //     the rewritten text, not raw source titles.
    const analyzed = await analyzeStories(newStories);

    // 6b. Semantic dedup: the cluster step matches raw items against the live
    //     7-day window only. Here we re-check each SHAPED story against recent
    //     stories (published AND hidden) for the SAME development — catching
    //     re-framings the text matcher misses, and events already hidden. A match
    //     folds the new sources into the existing story instead of creating a dup.
    const recent = await getRecentStoriesForDedup(10);
    const fresh = [];
    let deduped = 0;
    for (const s of analyzed) {
      const shortlist = dedupShortlist(s, recent);
      const idx = shortlist.length ? await findDuplicateStory(s, shortlist) : -1;
      if (idx >= 0) {
        const match = shortlist[idx];
        try { await attachCoverage(match, s.sources, { changed: false }); } catch (e) { console.error(`  fold failed: ${e.message}`); }
        deduped++;
        console.error(`  deduped "${s.headline.slice(0, 50)}" → existing ${match.status} story "${match.headline.slice(0, 45)}"`);
      } else {
        fresh.push(s);
      }
    }

    // 6c. Taste gate: confident NOISE (metric churn, rehash, roundup, opinion) is
    //     held even if it clears the score bar. Signal/uncertain proceed.
    const taste = fresh.length
      ? await classifyTaste(fresh.map((s) => ({ id: s.cluster_key, headline: s.headline, summary: s.summary })))
      : new Map();

    // A story with NO determinable date (no source pubDate and no page date) is
    // held below the bar rather than published with a fabricated "today" stamp —
    // it would otherwise jump to the top of the feed claiming to have just broken.
    const publishable = (s) =>
      (s.score || 0) >= PUBLISH_MIN_SCORE && !s.spam_only
      && taste.get(s.cluster_key)?.verdict !== "noise"
      && !!(s.published_at || s.broke_on);
    const published = fresh.filter(publishable);
    const belowBar = fresh.filter((s) => !publishable(s));
    newlyPublished = await storeStories({ published, belowBar });
    const heldNoise = belowBar.filter((s) => taste.get(s.cluster_key)?.verdict === "noise").length;
    const heldJunk = belowBar.filter((s) => (s.score || 0) >= PUBLISH_MIN_SCORE && s.spam_only).length;
    console.error(`Opened ${published.length} new stories (${deduped} deduped into existing, ${belowBar.length} below bar: ${heldNoise} taste-noise, ${heldJunk} junk-only).`);

    // Enrich each new story with additional outlet coverage: more outlets and,
    // when a more-reputable wire is found, promote it to lead + re-headline.
    // Best-effort — failures never block the run. Sync the in-memory copy so the
    // Telegram broadcast reflects any promoted lead / rewritten headline.
    for (const s of newlyPublished) {
      try {
        const r = await enrichStory(s, { apply: true });
        if (r.added) {
          if (r.promote && r.leadUrl) { s.lead_source = r.promote; s.lead_url = r.leadUrl; }
          if (r.changed) { if (r.newHeadline) s.headline = r.newHeadline; if (r.newSummary) s.summary = r.newSummary; }
          console.error(`  enriched "${s.headline.slice(0, 50)}": +${r.added} outlet(s)${r.promote ? `, lead → ${r.promote}` : ""}${r.changed ? " [re-headlined]" : ""}`);
        }
      } catch (e) { console.error(`  enrich failed: ${e.message}`); }
    }
  }
  console.error(`Appended to ${appended} existing stories (${updated} materially updated).`);
  return finish(newlyPublished);
}

async function finish(newlyPublished) {
  // Broadcast only genuinely-new published stories so a 20-min cron never spams.
  if (BROADCAST && newlyPublished.length && process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_BROADCAST_CHAT_ID) {
    try {
      await sendTelegramMessage(buildDigest(newlyPublished.slice(0, 8)), {
        chatId: process.env.TELEGRAM_BROADCAST_CHAT_ID, botToken: process.env.TELEGRAM_BOT_TOKEN,
      });
      console.error(`Broadcast ${newlyPublished.length} new stories.`);
    } catch (e) { console.error(`Telegram failed: ${e.message}`); }
  }
  if (DEPLOY && process.env.VERCEL_DEPLOY_HOOK_URL) {
    try { await fetch(process.env.VERCEL_DEPLOY_HOOK_URL, { method: "POST" }); console.error("Deploy hook pinged."); }
    catch (e) { console.error(`Deploy hook failed: ${e.message}`); }
  }
}

main().catch((e) => { console.error("FATAL", e); process.exit(1); });
