#!/usr/bin/env node

/**
 * Generate the site-wide social share card (1200x630 PNG) → public/og-image.png,
 * the default OG image referenced by the home, news, ask, concepts and forum
 * pages. Uses the same Satori + resvg-js stack as generate-og-images.mjs.
 *
 * The wordmark is set in Playfair Display — the site's own display face
 * (font-display / the header logotype) — so the card matches the site chrome.
 * No stat counts (they churn) and no logo floating above the title.
 *
 * Usage:
 *   node scripts/generate-site-og.mjs                 # render all variants to a preview dir
 *   node scripts/generate-site-og.mjs --out <dir>     # preview dir override
 *   node scripts/generate-site-og.mjs --write <v1|v2|v3>   # write chosen variant to public/og-image.png
 */

import { readFileSync, writeFileSync, mkdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

import satori from "satori";
import { Resvg } from "@resvg/resvg-js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, "..");
const A = join(__dirname, "og-assets");

// ── Fonts ────────────────────────────────────────────────────────────────
const playfair600 = readFileSync(join(A, "PlayfairDisplay-600.woff"));
const playfair700 = readFileSync(join(A, "PlayfairDisplay-700.woff"));
const sansRegular = readFileSync(join(A, "SourceSans3-Regular.woff"));
const sansBold = readFileSync(join(A, "SourceSans3-Bold.woff"));

const FONTS = [
  { name: "Display", data: playfair600, weight: 600, style: "normal" },
  { name: "Display", data: playfair700, weight: 700, style: "normal" },
  { name: "Sans", data: sansRegular, weight: 400, style: "normal" },
  { name: "Sans", data: sansBold, weight: 700, style: "normal" },
];

// ── Brand palette (from globals.css tokens) ──────────────────────────────
const EMBER = "#df6c20"; // hsl(24 75% 50%) — --primary
const EMBER_DK = "#e27a3e"; // hsl(23 73% 56%) — terminal dark ember
// Warm-paper light
const PAPER = "#fbf8f3";
const INK = "#2c2421"; // hsl(20 15% 15%) — --foreground
const INK_DIM = "#6f645b";
// Situation-room dark
const NIGHT = "#15130e"; // hsl(43 20% 7%) — --nt-surface-0 (dark)
const CREAM = "#ede6d5"; // hsl(42 34% 89%) — --nt-ink (dark)
const CREAM_DIM = "#a99f8c";

const TAGLINE = "The knowledge hub for prediction markets";
const URL = "onprediction.xyz";

function el(type, style, children) {
  return { type, props: { style: style || {}, children: children == null ? "" : children } };
}

// Rounded ember diamond — the LogoMark, as a design accent (never above the title).
function diamond(size, color, extra = {}) {
  return el("div", {
    width: size,
    height: size,
    backgroundColor: color,
    borderRadius: Math.round(size * 0.22),
    transform: "rotate(45deg)",
    display: "flex",
    ...extra,
  });
}

// ── V1 · Warm masthead ───────────────────────────────────────────────────
// The site's real skin: warm paper, left-aligned editorial masthead. Wordmark
// leads; a short ember rule ties into the tagline; the diamond sits quietly in
// the footer, never over the title.
function v1() {
  const main = el("div", { display: "flex", flexDirection: "column", alignItems: "flex-start" }, [
    el("div", {
      fontFamily: "Display",
      fontWeight: 700,
      fontSize: 128,
      lineHeight: 1,
      letterSpacing: "-0.025em",
      color: INK,
      display: "flex",
    }, "On Prediction"),
    el("div", { display: "flex", alignItems: "center", marginTop: 38 }, [
      el("div", { width: 52, height: 3, backgroundColor: EMBER, borderRadius: 2, marginRight: 22, display: "flex" }),
      el("div", { fontFamily: "Sans", fontWeight: 400, fontSize: 33, color: INK_DIM, display: "flex" }, TAGLINE),
    ]),
  ]);

  const footer = el("div", {
    display: "flex", alignItems: "center", justifyContent: "space-between",
  }, [
    el("div", { fontFamily: "Sans", fontWeight: 700, fontSize: 24, letterSpacing: "0.02em", color: EMBER, display: "flex" }, URL),
    diamond(30, EMBER),
  ]);

  return el("div", {
    width: 1200, height: 630, backgroundColor: PAPER,
    backgroundImage: "radial-gradient(circle at 92% 8%, rgba(223,108,32,0.14) 0%, rgba(223,108,32,0) 52%)",
    display: "flex", flexDirection: "column", justifyContent: "space-between",
    padding: "84px 88px", fontFamily: "Sans",
  }, [main, footer]);
}

// ── V2 · Situation room ──────────────────────────────────────────────────
// The /news terminal skin: warm near-black, a full-height ember rail at the
// left edge (the board's signature), cream Playfair wordmark.
function v2() {
  const rail = el("div", {
    position: "absolute", top: 0, left: 0, width: 10, height: 630,
    backgroundColor: EMBER_DK, display: "flex",
  });

  const main = el("div", { display: "flex", flexDirection: "column", alignItems: "flex-start" }, [
    el("div", {
      fontFamily: "Sans", fontWeight: 700, fontSize: 21, letterSpacing: "0.32em",
      color: EMBER_DK, marginBottom: 30, display: "flex",
    }, "KNOWLEDGE HUB"),
    el("div", {
      fontFamily: "Display", fontWeight: 700, fontSize: 132, lineHeight: 1,
      letterSpacing: "-0.025em", color: CREAM, display: "flex",
    }, "On Prediction"),
    el("div", {
      fontFamily: "Sans", fontWeight: 400, fontSize: 32, color: CREAM_DIM, marginTop: 34, display: "flex",
    }, TAGLINE),
  ]);

  const footer = el("div", {
    fontFamily: "Sans", fontWeight: 700, fontSize: 24, letterSpacing: "0.02em", color: EMBER_DK, display: "flex",
  }, URL);

  return el("div", {
    position: "relative", width: 1200, height: 630, backgroundColor: NIGHT,
    backgroundImage: "radial-gradient(circle at 8% 12%, rgba(226,122,62,0.16) 0%, rgba(226,122,62,0) 46%)",
    display: "flex", flexDirection: "column", justifyContent: "space-between",
    padding: "84px 96px", fontFamily: "Sans",
  }, [rail, main, footer]);
}

// ── V3 · Oversized poster ────────────────────────────────────────────────
// Magazine-cover energy: a two-line Playfair wordmark set large, with a giant
// ember diamond bleeding off the right edge as a geometric anchor.
function v3() {
  const bleed = el("div", {
    position: "absolute", top: 150, left: 858, width: 460, height: 460,
    backgroundColor: EMBER, borderRadius: 96, transform: "rotate(45deg)", display: "flex",
  });
  const bleedGlow = el("div", {
    position: "absolute", top: 150, left: 858, width: 460, height: 460,
    backgroundColor: "rgba(223,108,32,0.18)", borderRadius: 130, transform: "rotate(45deg)",
    display: "flex", filter: "blur(2px)",
  });

  const main = el("div", { position: "relative", display: "flex", flexDirection: "column", alignItems: "flex-start" }, [
    el("div", {
      fontFamily: "Sans", fontWeight: 700, fontSize: 20, letterSpacing: "0.3em",
      color: EMBER, marginBottom: 24, display: "flex",
    }, "PREDICTION MARKETS"),
    el("div", {
      fontFamily: "Display", fontWeight: 700, fontSize: 116, lineHeight: 0.96,
      letterSpacing: "-0.03em", color: INK, display: "flex", flexDirection: "column",
    }, [
      el("div", { display: "flex" }, "On"),
      el("div", { display: "flex" }, "Prediction"),
    ]),
  ]);

  const footer = el("div", {
    position: "relative", fontFamily: "Sans", fontWeight: 400, fontSize: 30, color: INK_DIM, display: "flex",
  }, "Curated research and signal");

  return el("div", {
    position: "relative", width: 1200, height: 630, backgroundColor: PAPER,
    display: "flex", flexDirection: "column", justifyContent: "space-between",
    padding: "84px 88px", fontFamily: "Sans", overflow: "hidden",
  }, [bleedGlow, bleed, main, footer]);
}

const VARIANTS = { v1, v2, v3 };

async function render(tree) {
  const svg = await satori(tree, { width: 1200, height: 630, fonts: FONTS });
  return new Resvg(svg, { fitTo: { mode: "width", value: 1200 } }).render().asPng();
}

async function main() {
  const args = process.argv.slice(2);
  const writeIdx = args.indexOf("--write");
  const outIdx = args.indexOf("--out");

  if (writeIdx !== -1) {
    const variant = args[writeIdx + 1];
    if (!VARIANTS[variant]) throw new Error(`Unknown variant "${variant}" (use v1|v2|v3)`);
    const png = await render(VARIANTS[variant]());
    const dest = join(repoRoot, "public", "og-image.png");
    writeFileSync(dest, png);
    console.log(`Wrote ${variant} → ${dest}`);
    return;
  }

  const outDir = outIdx !== -1 ? args[outIdx + 1] : join(repoRoot, ".og-preview");
  mkdirSync(outDir, { recursive: true });
  for (const [name, fn] of Object.entries(VARIANTS)) {
    const png = await render(fn());
    const dest = join(outDir, `site-og-${name}.png`);
    writeFileSync(dest, png);
    console.log(`Wrote ${dest}`);
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
