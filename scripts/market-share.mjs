/* ---------------------------------------------------------------------------
   Reads src/data/market-share.csv and prepares it for the chart:
   applies acquisitions, ranks, and cuts to the top ten.
--------------------------------------------------------------------------- */

import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const CSV = join(ROOT, "src", "data", "market-share.csv");

export const SUBJECT = "Bentley's";
export const TOP_N = 10;

function parseCsv(text) {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith("#"));

  const head = lines.shift().split(",");
  const years = head.slice(4);

  const unquote = (s) => s.replace(/^"(.*)"$/, "$1").trim();

  const rows = lines.map((line) => {
    const cells = line.split(",").map(unquote);
    return {
      name: cells[0],
      mergeInto: cells[1] || null,
      color: cells[2] || null,
      feature: cells[3] === "1",
      values: cells.slice(4).map((c) => {
        const n = Number(c);
        if (Number.isNaN(n)) throw new Error(`non-numeric share for ${cells[0]}: "${c}"`);
        return n;
      }),
    };
  });

  return { years, rows };
}

/* A brokerage that was absorbed has its share folded into its acquirer, so
   the acquirer's line is continuous across the deal instead of appearing from
   nowhere. Shares are percentages of the same denominator in any given year,
   so they add. */
function applyMerges(rows) {
  const byName = new Map(rows.map((r) => [r.name, r]));
  const absorbed = new Set();

  for (const row of rows) {
    if (!row.mergeInto) continue;
    const target = byName.get(row.mergeInto);
    if (!target) throw new Error(`merge_into target not found: ${row.mergeInto}`);
    target.values = target.values.map((v, i) => v + row.values[i]);
    absorbed.add(row.name);
  }

  return rows.filter((r) => !absorbed.has(r.name));
}

/* Rank by mean share across the whole window, not by the latest year. Ranking
   on 2025 alone would drop the firms that led the market in 2016 and have
   since left — which is precisely the story this chart is telling. */
function topN(rows, n) {
  const mean = (r) => r.values.reduce((a, b) => a + b, 0) / r.values.length;
  const ranked = [...rows].sort((a, b) => mean(b) - mean(a));
  const kept = ranked.slice(0, n);
  if (!kept.some((r) => r.name === SUBJECT)) {
    throw new Error(`${SUBJECT} not in the top ${n} — check the source data`);
  }
  return kept;
}

/* Zero means "not trading in this market that year", not "held zero percent".
   Null breaks the line instead of drawing a firm along the axis before it
   existed. Interior zeros are kept: a year at zero between two trading years
   is a real gap, not an absence. */
function blankLeadingTrailingZeros(values) {
  const first = values.findIndex((v) => v > 0);
  if (first === -1) return values.map(() => null);
  let last = values.length - 1;
  while (last > first && values[last] === 0) last--;
  return values.map((v, i) => (i < first || i > last ? null : v));
}

export async function loadMarketShare() {
  const { years, rows } = parseCsv(await readFile(CSV, "utf8"));
  const merged = applyMerges(rows);
  const kept = topN(merged, TOP_N);

  const series = kept.map((r) => ({
    name: r.name,
    subject: r.name === SUBJECT,
    feature: r.feature,
    color: r.color,
    values: blankLeadingTrailingZeros(r.values),
  }));

  // Paint order: folded context first, then the featured brokerages, then the
  // subject on top of everything.
  const rank = (s) => (s.subject ? 2 : s.feature ? 1 : 0);
  series.sort((a, b) => rank(a) - rank(b));

  return { years, series, excluded: merged.length - kept.length };
}
