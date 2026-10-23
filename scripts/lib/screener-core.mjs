/**
 * Shared screener builder (Sector + Country screeners). Extracted from build-sector-screener.mjs 2026-10-14;
 * logic unchanged. Yahoo daily closes (2y) for each ETF + SPY: 1D/1W/1M/3M/YTD, vs SPY 1M/3M,
 * calendar-month returns + ranks (1 = best) for 12 complete months + month-to-date.
 * Fewer than minOk rows → exit 1 WITHOUT writing (previous file kept). Nothing is invented.
 */
import { ROOT, pool, writeJson, nzNowIso } from "./scan-common.mjs";
import { yahooDaily } from "./decide-series.mjs";
import { resolve } from "node:path";

export async function buildScreener({ label, list, outFile, minOk, extra = {} }) {
const pct = (a, b) => (a != null && b ? +(((a / b) - 1) * 100).toFixed(2) : null);

const series = {};
const failed = [];
await pool([...list.map((s) => s[0]), "SPY"], 3, async (sym) => {
  const r = await yahooDaily(sym, { range: "2y" });
  if (r.error) failed.push(r.error); else series[sym] = r.bars;
});
const spy = series.SPY;
if (!spy) throw new Error("SPY missing: " + failed.join("; "));
const asOf = spy.at(-1).date;
const year = asOf.slice(0, 4);
const curMonth = asOf.slice(0, 7);

// month keys: 12 complete months + current (MTD)
const months = [];
{ let [y, m] = curMonth.split("-").map(Number);
  for (let i = 0; i < 13; i++) { months.unshift(`${y}-${String(m).padStart(2, "0")}`); m--; if (!m) { m = 12; y--; } } }

function stats(bars) {
  if (!bars || bars.at(-1).date !== asOf) return null;
  const c = bars.map((b) => b.close), n = c.length - 1;
  const lastBefore = (pred) => { for (let i = n; i >= 0; i--) if (pred(bars[i].date)) return c[i]; return null; };
  const ytdBase = lastBefore((d) => d < `${year}-01-01`);
  const monthEnd = {};
  for (const b of bars) monthEnd[b.date.slice(0, 7)] = b.close; // last close of each month
  const monthly = months.map((mk) => {
    const prevKeys = Object.keys(monthEnd).filter((k) => k < mk).sort();
    const prev = prevKeys.length ? monthEnd[prevKeys.at(-1)] : null;
    return monthEnd[mk] != null && prev ? pct(monthEnd[mk], prev) : null;
  });
  return {
    last: +c[n].toFixed(2),
    r1d: pct(c[n], c[n - 1]), r1w: pct(c[n], c[n - 5]), r1m: pct(c[n], c[n - 21]),
    r3m: pct(c[n], c[n - 63]), ytd: pct(c[n], ytdBase), monthly,
  };
}
const spyS = stats(spy);
const rows = [];
for (const [sym, name] of list) {
  const s = stats(series[sym]);
  if (!s) { if (series[sym]) failed.push(`${sym} stale (last bar ${series[sym].at(-1).date})`); continue; }
  rows.push({ symbol: sym, name, ...s,
    rs1m: s.r1m != null ? +(s.r1m - spyS.r1m).toFixed(2) : null,
    rs3m: s.r3m != null ? +(s.r3m - spyS.r3m).toFixed(2) : null });
}
// monthly ranks
const monthRanks = months.map((_, mi) => {
  const vals = rows.filter((r) => r.monthly[mi] != null).sort((a, b) => b.monthly[mi] - a.monthly[mi]);
  return Object.fromEntries(vals.map((r, i) => [r.symbol, i + 1]));
});
for (const r of rows) r.ranks = monthRanks.map((m) => m[r.symbol] ?? null);

if (rows.length < minOk) {
  console.error(`${label}: only ${rows.length}/${list.length} (${failed.join("; ") || "stale bars"}); previous file kept`);
  process.exit(1);
}
writeJson(resolve(ROOT, process.env.SCREENER_OUT || outFile), {
  ...extra,
  asOf, builtAt: nzNowIso(), source: "Yahoo Finance daily closes (price only, no dividends)",
  months, currentMonthPartial: true,
  spy: { r1d: spyS.r1d, r1w: spyS.r1w, r1m: spyS.r1m, r3m: spyS.r3m, ytd: spyS.ytd, monthly: spyS.monthly },
  rows, failed,
});
console.log(`${label} asOf ${asOf}: ${rows.length}/${list.length}; failed: ${failed.join("; ") || "none"}`);
}
