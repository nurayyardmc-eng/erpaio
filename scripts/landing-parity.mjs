#!/usr/bin/env node
// Sprint F.6 — landing visual/text parity checker.
//
// Fetches the legacy static landing (/landing.html, /landing-tr.html,
// /landing-ar.html) and the new SSR route (/landing-ssr?lang=…), strips
// everything that legitimately differs between a hand-written static file
// and a React-rendered one (scripts, styles, hydration comments, data-*
// reactroot markers, whitespace), then compares the remaining visible text.
//
// Goal: catch CONTENT drift (a headline that didn't get ported, a missing
// feature card) without drowning in structural noise. It is intentionally
// text-level, not pixel-level — pixels are verified by eye; this guards the
// words.
//
// Usage:
//   node scripts/landing-parity.mjs                # prod
//   BASE_URL=http://localhost:3000 node scripts/landing-parity.mjs
//   node scripts/landing-parity.mjs --verbose      # print first N diff lines
//
// Exit code 0 = parity (or within tolerance), 1 = drift detected.

const BASE_URL = process.env.BASE_URL ?? "https://erpaio.vercel.app";
const VERBOSE = process.argv.includes("--verbose");
// Per-locale tolerance for entirely-missing words. A dropped card or
// headline removes dozens of words, so a small budget still catches real
// regressions while absorbing single-word translation nuances (e.g. an
// Arabic verb authored as "شاهد ويقيم" in the catalog vs a near-synonym
// in the legacy static file). Override with PARITY_MAX_MISSING.
const MAX_MISSING = Number.parseInt(process.env.PARITY_MAX_MISSING ?? "3", 10);

// Each pair: legacy static file ↔ SSR route for the same locale.
const PAIRS = [
  { locale: "en", static: "/landing.html", ssr: "/landing-ssr?lang=en" },
  { locale: "tr", static: "/landing-tr.html", ssr: "/landing-ssr?lang=tr" },
  { locale: "ar", static: "/landing-ar.html", ssr: "/landing-ssr?lang=ar" },
];

async function fetchHtml(path) {
  const url = `${BASE_URL}${path}`;
  const res = await fetch(url, { headers: { "user-agent": "erpaio-parity/1.0" } });
  if (!res.ok) throw new Error(`${url} → HTTP ${res.status}`);
  return res.text();
}

/**
 * Reduce an HTML document to a normalized stream of visible words.
 * Removes <script>/<style>/<head>, HTML comments (incl. hydration
 * markers), all tags, then collapses whitespace and lowercases.
 */
function visibleText(html) {
  return html
    .replace(/<head[\s\S]*?<\/head>/gi, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, " ") // HTML + React hydration comments
    .replace(/<[^>]+>/g, " ") // all remaining tags
    .replace(/&[a-z]+;/gi, " ") // entities (&apos; &amp; etc.)
    // Split on ANY non-letter/non-digit so punctuation that the static
    // HTML glues to words (em-dash "actions—without", smart quotes,
    // arrows →, ©, hyphens) tokenizes identically on both sides. Unicode
    // aware so Türkçe (ç/ş/ğ/ı) + Arabic letters survive.
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim()
    .toLowerCase();
}

/** Multiset of words → for order-insensitive content comparison. */
function wordCounts(text) {
  const counts = new Map();
  for (const w of text.split(" ")) {
    if (!w) continue;
    counts.set(w, (counts.get(w) ?? 0) + 1);
  }
  return counts;
}

/**
 * Words present in `a` but ENTIRELY ABSENT from `b` (count 0).
 *
 * We deliberately tolerate off-by-count differences: a static file and a
 * React render legitimately differ by a word or two (a tech term repeated
 * in an aria-label, a chip rendered once vs mentioned twice in prose).
 * The meaningful regression signal is a word that exists in the legacy
 * page but appears NOWHERE in the SSR page — that means a whole headline,
 * card, or section failed to port. Length-3+ filter drops single Arabic
 * glyphs that fall out of differing text segmentation.
 */
function entirelyMissing(a, b) {
  const out = [];
  for (const [word, count] of a) {
    if (word.length < 3) continue;
    if (!b.has(word)) out.push({ word, expected: count, got: 0 });
  }
  return out;
}

async function checkPair(pair) {
  const [staticHtml, ssrHtml] = await Promise.all([
    fetchHtml(pair.static),
    fetchHtml(pair.ssr),
  ]);
  const staticWords = wordCounts(visibleText(staticHtml));
  const ssrWords = wordCounts(visibleText(ssrHtml));

  const onlyInStatic = entirelyMissing(staticWords, ssrWords);
  const onlyInSsr = entirelyMissing(ssrWords, staticWords);

  return { pair, onlyInStatic, onlyInSsr };
}

async function main() {
  let drift = false;
  for (const pair of PAIRS) {
    process.stdout.write(`\n[${pair.locale}] ${pair.static}  ↔  ${pair.ssr}\n`);
    let result;
    try {
      result = await checkPair(pair);
    } catch (err) {
      console.error(`  ✗ fetch error: ${err.message}`);
      drift = true;
      continue;
    }
    const { onlyInStatic, onlyInSsr } = result;
    if (onlyInStatic.length === 0 && onlyInSsr.length === 0) {
      console.log("  ✓ word-for-word parity");
      continue;
    }
    const within = onlyInStatic.length <= MAX_MISSING && onlyInSsr.length <= MAX_MISSING;
    if (within) {
      console.log(
        `  ~ within tolerance (${onlyInStatic.length} static-only / ${onlyInSsr.length} SSR-only ≤ ${MAX_MISSING})`,
      );
    } else {
      drift = true;
      console.log(`  ✗ drift — ${onlyInStatic.length} words only in static, ${onlyInSsr.length} only in SSR`);
    }
    if (VERBOSE) {
      const fmt = (arr) =>
        arr
          .slice(0, 25)
          .map((d) => `${d.word}(${d.expected}→${d.got})`)
          .join(", ");
      if (onlyInStatic.length) console.log(`    missing in SSR : ${fmt(onlyInStatic)}`);
      if (onlyInSsr.length) console.log(`    extra in SSR   : ${fmt(onlyInSsr)}`);
    } else {
      console.log("    (re-run with --verbose to list the differing words)");
    }
  }

  console.log("");
  if (drift) {
    console.error("Parity check FAILED — content drift between static and SSR landing.");
    process.exit(1);
  }
  console.log("Parity check passed — SSR landing matches static content in all locales.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
