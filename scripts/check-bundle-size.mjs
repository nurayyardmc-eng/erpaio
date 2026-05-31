#!/usr/bin/env node
// Sprint F.1 — bundle size regression gate.
//
// Walks the .next/static/chunks directory after `next build` and asserts
// the total client JS payload stays under BUNDLE_BUDGET_KB. Fails CI if
// exceeded so a single careless heavy import (moment/lodash/charts) is
// caught at PR review instead of in production Lighthouse drops.
//
// Usage:
//   node scripts/check-bundle-size.mjs
// Env vars:
//   BUNDLE_BUDGET_KB — total chunk budget in kilobytes (default 6000 KB)
//   BUNDLE_VERBOSE   — set to "1" to print every chunk size

import { readdir, stat } from "node:fs/promises";
import { join } from "node:path";

const CHUNKS_DIR = ".next/static/chunks";
// Default budget calibrated 2026-05-31 at ~1700 KB. Headroom ~2x for
// healthy feature growth; override via BUNDLE_BUDGET_KB when intentional.
const BUDGET_KB = Number.parseInt(process.env.BUNDLE_BUDGET_KB ?? "3500", 10);
const VERBOSE = process.env.BUNDLE_VERBOSE === "1";

async function walk(dir) {
  let total = 0;
  const entries = await readdir(dir, { withFileTypes: true });
  const sizes = [];
  for (const entry of entries) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      const sub = await walk(path);
      total += sub.total;
      sizes.push(...sub.sizes);
    } else if (entry.name.endsWith(".js")) {
      const s = await stat(path);
      total += s.size;
      sizes.push({ path, bytes: s.size });
    }
  }
  return { total, sizes };
}

try {
  const { total, sizes } = await walk(CHUNKS_DIR);
  const totalKb = Math.round(total / 1024);

  if (VERBOSE) {
    sizes
      .sort((a, b) => b.bytes - a.bytes)
      .slice(0, 20)
      .forEach((s) => {
        console.log(`  ${(s.bytes / 1024).toFixed(1).padStart(8)} KB  ${s.path}`);
      });
  }

  console.log(`Total client chunks: ${totalKb} KB (${sizes.length} files)`);
  console.log(`Budget:              ${BUDGET_KB} KB`);

  if (totalKb > BUDGET_KB) {
    console.error(`::error::Bundle size ${totalKb} KB exceeds budget ${BUDGET_KB} KB`);
    console.error("Increase BUNDLE_BUDGET_KB after intentional growth, or split routes.");
    process.exit(1);
  }
  console.log(`✓ Bundle within budget (${BUDGET_KB - totalKb} KB headroom)`);
} catch (err) {
  if (err && err.code === "ENOENT") {
    console.error(`::error::${CHUNKS_DIR} not found — did \`next build\` run first?`);
    process.exit(1);
  }
  throw err;
}
