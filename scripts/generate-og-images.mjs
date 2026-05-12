#!/usr/bin/env node

/**
 * Generate per-article social share cards (1200x630 PNG) using Satori +
 * resvg-js. Reads articles_database.json, outputs public/og/article-{id}.png.
 *
 * Layout: variant A — title-led, pull quote underneath with left rule, author +
 * source bottom-left, onprediction.xyz bottom-right, brand mark top-left,
 * category pill top-right.
 *
 * Run with `--force` to regenerate everything; otherwise it skips files that
 * exist and whose source hash hasn't changed.
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { createHash } from "crypto";

import satori from "satori";
import { Resvg } from "@resvg/resvg-js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, "..");
const FORCE = process.argv.includes("--force");
const idArg = process.argv.indexOf("--id");
const ONLY_ID = idArg !== -1 ? Number(process.argv[idArg + 1]) : null;

const OUT_DIR = join(repoRoot, "public", "og");
mkdirSync(OUT_DIR, { recursive: true });

const sansRegular = readFileSync(join(__dirname, "og-assets", "SourceSans3-Regular.woff"));
const sansBold = readFileSync(join(__dirname, "og-assets", "SourceSans3-Bold.woff"));
const sansExtraBold = readFileSync(join(__dirname, "og-assets", "SourceSans3-ExtraBold.woff"));
const serifItalic = readFileSync(join(__dirname, "og-assets", "PlayfairDisplay-Italic.woff"));

const ORANGE = "#ea580c";
const BG = "#0a0a0a";
const FG = "#ffffff";
const MUTED = "#aaaaaa";
const DIMMER = "#888888";

function sourceLabel(article) {
  try {
    const u = new URL(article.url);
    return u.hostname.replace(/^www\./, "");
  } catch {
    return article.source_type || "";
  }
}

function hashOf(article) {
  const h = createHash("sha1");
  h.update(article.title || "");
  h.update("|");
  h.update(article.share_quote || "");
  h.update("|");
  h.update(article.author || "");
  h.update("|");
  h.update(article.primary_category || "");
  h.update("|");
  h.update(article.url || "");
  h.update("|v2");
  return h.digest("hex").slice(0, 12);
}

function el(type, style, children) {
  return { type, props: { style: style || {}, children: children == null ? "" : children } };
}

function buildTree(article) {
  const category = (article.primary_category || "").toUpperCase();
  const quote = article.share_quote || "";
  const author = article.author || "anonymous";
  const source = sourceLabel(article);

  const brandRow = el(
    "div",
    { display: "flex", alignItems: "center" },
    [
      el("div", {
        width: 22,
        height: 22,
        backgroundColor: ORANGE,
        borderRadius: 5,
        transform: "rotate(45deg)",
        marginRight: 16,
      }),
      el(
        "div",
        { fontSize: 20, fontWeight: 700, letterSpacing: "-0.01em", display: "flex" },
        "On Prediction"
      ),
    ]
  );

  const topRowChildren = [brandRow];
  if (category) {
    topRowChildren.push(
      el(
        "div",
        {
          fontSize: 14,
          fontWeight: 600,
          letterSpacing: "0.18em",
          color: ORANGE,
          padding: "8px 16px",
          border: `1px solid rgba(234, 88, 12, 0.4)`,
          borderRadius: 999,
          display: "flex",
        },
        category
      )
    );
  }
  const topRow = el(
    "div",
    { display: "flex", alignItems: "center", justifyContent: "space-between" },
    topRowChildren
  );

  const titleSize = article.title && article.title.length > 60 ? 58 : 72;
  const middleChildren = [
    el(
      "div",
      {
        fontSize: titleSize,
        fontWeight: 800,
        letterSpacing: "-0.025em",
        lineHeight: 1.05,
        marginBottom: quote ? 32 : 0,
        color: FG,
        display: "flex",
      },
      article.title || ""
    ),
  ];
  if (quote) {
    middleChildren.push(
      el(
        "div",
        {
          display: "flex",
          borderLeft: `3px solid ${ORANGE}`,
          paddingLeft: 22,
          fontFamily: "Serif",
          fontStyle: "italic",
          fontSize: 28,
          lineHeight: 1.35,
          color: "#c4c4c4",
          maxWidth: 950,
        },
        `“${quote}”`
      )
    );
  }
  const middle = el(
    "div",
    { display: "flex", flexDirection: "column", maxWidth: 1050 },
    middleChildren
  );

  const authorChildren = [el("div", { display: "flex" }, author)];
  if (source) {
    authorChildren.push(el("div", { color: "#555555", margin: "0 12px", display: "flex" }, "·"));
    authorChildren.push(el("div", { color: MUTED, display: "flex" }, source));
  }
  const bottomRow = el(
    "div",
    { display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 19, fontWeight: 500 },
    [
      el("div", { display: "flex", alignItems: "center", color: "#cccccc" }, authorChildren),
      el("div", { color: DIMMER, display: "flex" }, "onprediction.xyz"),
    ]
  );

  return el(
    "div",
    {
      width: 1200,
      height: 630,
      backgroundColor: BG,
      backgroundImage:
        "radial-gradient(circle at 100% 0%, rgba(234, 88, 12, 0.22) 0%, rgba(234, 88, 12, 0) 55%)",
      display: "flex",
      flexDirection: "column",
      justifyContent: "space-between",
      padding: "56px 64px",
      fontFamily: "Sans",
      color: FG,
    },
    [topRow, middle, bottomRow]
  );
}

async function renderOne(article) {
  const tree = buildTree(article);
  const svg = await satori(tree, {
    width: 1200,
    height: 630,
    fonts: [
      { name: "Sans", data: sansRegular, weight: 400, style: "normal" },
      { name: "Sans", data: sansBold, weight: 700, style: "normal" },
      { name: "Sans", data: sansExtraBold, weight: 800, style: "normal" },
      { name: "Serif", data: serifItalic, weight: 500, style: "italic" },
    ],
  });
  const resvg = new Resvg(svg, { fitTo: { mode: "width", value: 1200 } });
  return resvg.render().asPng();
}

async function main() {
  const dbPath = join(repoRoot, "articles_database.json");
  const articles = JSON.parse(readFileSync(dbPath, "utf-8"));

  let rendered = 0;
  let skipped = 0;
  let failed = 0;
  const start = Date.now();

  for (const article of articles) {
    if (ONLY_ID != null && article.id !== ONLY_ID) continue;

    const pngPath = join(OUT_DIR, `article-${article.id}.png`);
    const hashPath = join(OUT_DIR, `article-${article.id}.hash`);
    const hash = hashOf(article);

    if (!FORCE && existsSync(pngPath) && existsSync(hashPath)) {
      const existing = readFileSync(hashPath, "utf-8").trim();
      if (existing === hash) {
        skipped += 1;
        continue;
      }
    }

    try {
      const png = await renderOne(article);
      writeFileSync(pngPath, png);
      writeFileSync(hashPath, hash);
      rendered += 1;
      if (rendered % 20 === 0) console.log(`  ${rendered} rendered…`);
    } catch (e) {
      failed += 1;
      console.error(`[${article.id}] FAILED:`, e.message);
    }
  }

  const ms = Date.now() - start;
  console.log(`\nDone in ${(ms / 1000).toFixed(1)}s. rendered=${rendered} skipped=${skipped} failed=${failed}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
