const fs = require("fs");
const path = require("path");
const { createClient } = require("@supabase/supabase-js");

const root = path.join(__dirname, "..");
const outDir = path.join(root, "public", "api");
const outFile = path.join(outDir, "news.json");

if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

// Load .env.local if present (Vercel injects env directly; local builds need this)
const envPath = path.join(root, ".env.local");
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, "utf-8").split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i === -1) continue;
    const k = t.slice(0, i).trim();
    if (!process.env[k]) process.env[k] = t.slice(i + 1).trim();
  }
}

const SEED_SIZE = 60;

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    if (!fs.existsSync(outFile)) fs.writeFileSync(outFile, "[]\n");
    console.log("generate-news-seed: Supabase env missing — skipped (kept existing snapshot)");
    return;
  }

  try {
    const supabase = createClient(url, key, { auth: { persistSession: false } });
    const { data, error } = await supabase.rpc("get_news_feed", { lim: SEED_SIZE, off: 0 });
    if (error) throw new Error(error.message);
    fs.writeFileSync(outFile, JSON.stringify(data || [], null, 2));
    console.log(`Generated public/api/news.json (${(data || []).length} stories)`);
  } catch (e) {
    if (!fs.existsSync(outFile)) fs.writeFileSync(outFile, "[]\n");
    console.warn(`generate-news-seed: fetch failed (${e.message}) — kept existing snapshot`);
  }
}

main();
