#!/usr/bin/env node
/**
 * Pessimism Board (PREVIEW) — "While peak optimism is hard to catch, peak pessimism is a lot easier."
 * Writes data/pessimism-board.json. Rules: see docs/pessimism-board.md. Education only.
 * Inputs: data/growth-score.json (stocks + Rev Growth + Canary Score), fish/money-flow alerts,
 * Yahoo 1y daily closes (same chart endpoint the scans use), cut at the pack as-of.
 * Does NOT mirror to /home/box/canaries (preview).
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { ROOT, yahooChart, ymdInTz, pool, writeJson, nzNowIso } from "./lib/scan-common.mjs";

const J = (p) => JSON.parse(readFileSync(join(ROOT, p), "utf8"));
const growth = J("data/growth-score.json");
const fish = J("data/fish-alerts.json");
const mfi = J("data/money-flow-alerts.json");
const asOf = fish.asOf;

const R = { offHighMin: 0.25, rsiMax: 35, lookback: 5, minCanaryScore: 40, minRevGrowth: 0 };

function rsiSeries(c, n = 14) {
  const out = new Array(c.length).fill(null);
  let g = 0, l = 0;
  for (let i = 1; i <= n; i++) { const d = c[i] - c[i - 1]; d > 0 ? (g += d) : (l -= d); }
  g /= n; l /= n; out[n] = l === 0 ? 100 : 100 - 100 / (1 + g / l);
  for (let i = n + 1; i < c.length; i++) {
    const d = c[i] - c[i - 1];
    g = (g * (n - 1) + Math.max(d, 0)) / n; l = (l * (n - 1) + Math.max(-d, 0)) / n;
    out[i] = l === 0 ? 100 : 100 - 100 / (1 + g / l);
  }
  return out;
}
const sma = (a, i, n) => a.slice(i - n + 1, i + 1).reduce((s, x) => s + x, 0) / n;
const sd = (a, i, n) => { const m = sma(a, i, n); return Math.sqrt(a.slice(i - n + 1, i + 1).reduce((s, x) => s + (x - m) ** 2, 0) / n); };

const recentDays = (() => { const s = new Set(); return s; })();
const fishBy = new Map(fish.signals.map((s) => [s.ticker, s]));
const mfiBy = new Map(mfi.signals.map((s) => [s.ticker, s]));

const tickers = Object.keys(growth.tickers);
const failed = [];
const rows = (await pool(tickers, 4, async (t) => {
  const got = await yahooChart(t, { interval: "1d", range: "1y&events=split" });
  const res = got.data?.chart?.result?.[0];
  if (!res) { failed.push(t); return null; }
  const ts = res.timestamp ?? [], q = res.indicators?.quote?.[0] ?? {};
  const days = [], c = [], h = [], hr = []; const adj = res.indicators?.adjclose?.[0]?.adjclose ?? [];
  for (let i = 0; i < ts.length; i++) {
    const d = ymdInTz(ts[i], "America/New_York");
    if (d > asOf || q.close?.[i] == null) continue;
    const k = adj[i] != null ? adj[i] / q.close[i] : 1; days.push(d); c.push(+q.close[i] * k); h.push(+(q.high?.[i] ?? q.close[i]) * k); hr.push(+(q.high?.[i] ?? q.close[i]));
  }
  if (c.length < 60) { failed.push(t); return null; }
  const L = c.length - 1, rsi = rsiSeries(c);
  const hi = Math.max(...h), offHigh = 1 - c[L] / hi; const rawClose = +q.close[ts.findIndex((x) => ymdInTz(x, "America/New_York") === days[L])]; const offRaw = 1 - rawClose / Math.max(...hr);
  const win = Array.from({ length: R.lookback }, (_, k) => L - k);
  const minRsi = Math.min(...win.map((i) => rsi[i]));
  const belowBB = win.some((i) => c[i] < sma(c, i, 20) - 2 * sd(c, i, 20));
  const sma20 = sma(c, L, 20);
  const g = growth.tickers[t];
  const sinceDay = days[L - R.lookback + 1];
  const f = fishBy.get(t), m = mfiBy.get(t);
  const fishRecent = f && ((f.fishAsOf && f.fishAsOf >= sinceDay) || (f.smileAsOf && f.smileAsOf >= sinceDay));
  const mfiRecent = m && m.asOf >= sinceDay;
  const emojis = [f?.fishAsOf ? "🐟" : "", f?.smileAsOf ? "🙂" : "", m ? "💵" : ""].join("");
  const reclaim = c[L] > sma20 && win.slice(1).some((i) => c[i] < sma(c, i, 20));
  const turning = [reclaim ? "reclaimed 20d" : null, fishRecent ? "Fish fired" : null, mfiRecent ? "MFI fired" : null].filter(Boolean);
  return { t, close: +rawClose.toFixed(2), high52Adj: +hi.toFixed(2), offHigh: +offHigh.toFixed(4), rsi: +rsi[L].toFixed(1), minRsi5: +minRsi.toFixed(1),
    offHighRaw: +offRaw.toFixed(4), splitCheck: Math.abs(offRaw - offHigh) > 0.05 ? "check" : "ok", smallBase: (g.rg ?? 0) > 3, belowBB, aboveSma20: c[L] > sma20, rg: g.rg ?? null, gs: g.gs ?? null, danger: !!g.d, partial: !!g.pt, emojis, turning };
})).filter(Boolean);

const washed = rows.filter((r) => r.offHigh >= R.offHighMin && (r.minRsi5 <= R.rsiMax || r.belowBB));
const board = washed
  .filter((r) => r.rg != null && r.rg > R.minRevGrowth && r.gs != null && r.gs >= R.minCanaryScore && !r.danger && !r.partial)
  .map((r) => ({ ...r, pess: +(r.offHigh * 100 + Math.max(0, 50 - r.minRsi5) + (r.belowBB ? 5 : 0)).toFixed(1) }))
  .sort((a, b) => b.pess - a.pess || b.gs - a.gs);

writeJson(join(ROOT, "data/pessimism-board.json"), {
  v: 1, asOf, builtAt: nzNowIso(), rules: R,
  method: "Washed out: ≥25% below 52-week high AND (RSI(14) ≤ 35 on any of the last 5 sessions OR a close below the lower Bollinger band (20, 2σ) in the last 5). Healthy: 12-month revenue growth > 0, Canary Score ≥ 40, not Danger, not partial. Rank: % off high + (50 − lowest 5-day RSI) + 5 if below lower band. Turning: close back above the 20-day average after being below it in the last 5 sessions, or Fish/Smile/MFI fired in the last 5 sessions. Education only.",
  counts: { universe: tickers.length, priced: rows.length, washedOut: washed.length, board: board.length },
  failed, rows: board,
});
console.log(`pessimism-board: ${board.length} names (washed ${washed.length}/${rows.length}); failed ${failed.length}`);
