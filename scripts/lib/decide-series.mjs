/**
 * Shared daily-series helpers for the scripted Decide score, the Vol curve
 * step and the canary sparklines. Yahoo daily closes + TradingView guest
 * series (same WebSocket approach as refresh-volume-breadth.py USI:UVOL).
 * Never invents prints: a missing series returns { error }.
 */
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { join } from "node:path";
import { ROOT, yahooChart, ymdInTz } from "./scan-common.mjs";

const require = createRequire(import.meta.url);

/** Load a TS module from src/ (computeVolCurve, computeRegime) via jiti. */
export function loadTs(rel) {
  const jiti = require("jiti")(join(ROOT, "scripts", "lib", "decide-series.mjs"));
  return jiti(join(ROOT, rel));
}

/**
 * Yahoo daily closes [{date, close}] (NY date), capped at sessionDate.
 * If the session-date bar has a null close but meta.regularMarketTime is that
 * session, meta.regularMarketPrice is used (Yahoo lag on the live bar).
 */
export async function yahooDaily(symbol, { range = "6mo", sessionDate } = {}) {
  const got = await yahooChart(symbol, { interval: "1d", range });
  if (got.error) return { error: `${symbol} ${got.error}` };
  const result = got.data?.chart?.result?.[0];
  if (!result) return { error: `${symbol} no chart result` };
  const meta = result.meta ?? {};
  const ts = result.timestamp ?? [];
  const closes = result.indicators?.quote?.[0]?.close ?? [];
  const by = new Map();
  for (let i = 0; i < ts.length; i++) {
    const c = closes[i];
    if (c == null || !Number.isFinite(Number(c))) continue;
    // First bar per NY date wins: futures (ES=F) append a live bar for the
    // NEXT trade date whose timestamp still falls on today's NY evening.
    const d = ymdInTz(ts[i], "America/New_York");
    if (!by.has(d)) by.set(d, Number(c));
  }
  if (meta.regularMarketTime && Number.isFinite(Number(meta.regularMarketPrice))) {
    const d = ymdInTz(meta.regularMarketTime, "America/New_York");
    if (!by.has(d) && (!sessionDate || d <= sessionDate)) {
      // only fill a missing bar for a day Yahoo already lists in timestamps
      const listed = ts.some((t) => ymdInTz(t, "America/New_York") === d);
      if (listed) by.set(d, Number(meta.regularMarketPrice));
    }
  }
  let bars = [...by.entries()]
    .map(([date, close]) => ({ date, close }))
    .sort((a, b) => a.date.localeCompare(b.date));
  if (sessionDate) bars = bars.filter((b) => b.date <= sessionDate);
  if (bars.length < 2) return { error: `${symbol} too few bars` };
  return { bars, symbol: meta.symbol ?? symbol };
}

/** TradingView guest daily closes for several symbols (python helper). */
export function tvDaily(symbols, { bars = 120, sessionDate } = {}) {
  const r = spawnSync(
    "python3",
    [join(ROOT, "scripts", "tv-guest-series.py"), ...symbols, "--bars", String(bars)],
    { cwd: ROOT, encoding: "utf8", timeout: 180_000 }
  );
  const out = {};
  let parsed = null;
  try {
    parsed = JSON.parse(r.stdout || "null");
  } catch {
    parsed = null;
  }
  for (const s of symbols) {
    const row = parsed?.[s];
    if (!row || !row.ok) {
      out[s] = {
        error: `TV ${s}: ${row?.error || (r.stderr || "no output").slice(0, 160)}`,
      };
      continue;
    }
    let b = row.bars.map((x) => ({ date: x.date, close: Number(x.close) }));
    if (sessionDate) b = b.filter((x) => x.date <= sessionDate);
    out[s] = b.length >= 2 ? { bars: b, symbol: s } : { error: `TV ${s}: too few bars` };
  }
  return out;
}

/** Align several [{date, close}] series on common dates and combine. */
export function align(seriesList, combine) {
  const maps = seriesList.map((s) => new Map(s.map((b) => [b.date, b.close])));
  const dates = [...maps[0].keys()].filter((d) => maps.every((m) => m.has(d))).sort();
  const out = [];
  for (const d of dates) {
    const v = combine(maps.map((m) => m.get(d)));
    if (v != null && Number.isFinite(v)) out.push({ date: d, close: v });
  }
  return out;
}

export function smaAt(values, end, n = 20) {
  // mean of values[end-n+1 .. end]
  if (end - n + 1 < 0) return null;
  let s = 0;
  for (let i = end - n + 1; i <= end; i++) s += values[i];
  return s / n;
}

/** SMA20 series aligned to input (null until 20 values). */
export function smaSeries(bars, n = 20) {
  const v = bars.map((b) => b.close);
  const out = [];
  for (let i = 0; i < v.length; i++) {
    const m = smaAt(v, i, n);
    if (m != null) out.push({ date: bars[i].date, close: m });
  }
  return out;
}

export const sign = (x) => (x > 0 ? 1 : x < 0 ? -1 : 0);

/**
 * Stats used by the owner points rule on one series:
 * value, SMA20, SMA20 slope over 5 sessions, 9-session change.
 */
export function trendStats(bars) {
  const v = bars.map((b) => b.close);
  const n = v.length;
  if (n < 26) return null;
  const last = v[n - 1];
  const sma20 = smaAt(v, n - 1);
  const sma20ago5 = smaAt(v, n - 6);
  const slope5 = sma20 - sma20ago5;
  const chg9 = last - v[n - 10];
  return { date: bars[n - 1].date, value: last, sma20, slope5, chg9 };
}

/**
 * Owner points rule: +1 above SMA20 / −1 below; ±2 when the 5-day SMA20 slope
 * and the 9-day change both agree with that side. inverse flips the sign.
 */
export function pointsScore(st, { inverse = false } = {}) {
  if (!st) return null;
  const dir = sign(st.value - st.sma20);
  let s = dir;
  if (dir !== 0 && sign(st.slope5) === dir && sign(st.chg9) === dir) s = 2 * dir;
  return inverse ? -s : s;
}

export function fmt(x, d = 2) {
  if (x == null || !Number.isFinite(x)) return "n/a";
  return Number(x).toFixed(d);
}

export function signed(x, d = 2) {
  if (x == null || !Number.isFinite(x)) return "n/a";
  return `${x >= 0 ? "+" : "−"}${Math.abs(x).toFixed(d)}`;
}

/**
 * TVC:JP30 is the GENERIC Japan 30y benchmark bond PRICE. When the benchmark rolls to a
 * newly issued bond (roughly quarterly, around the 8th–10th of Jan/Apr/Jul/Oct) the quote
 * jumps because the new bond has a different coupon/maturity (e.g. 2026-10-09: new 4.20%
 * Sep-2056, 97.473 → 101.946, +4.59%, while the yield only fell 13.5bp ≈ +2.3% in price).
 * An SMA20 built on the old bond then mis-scores es1-jp30 for ~20 sessions.
 *
 * Fix (owner 2026-10-10, applies from Tue 13 Oct run): back-adjust like a continuous
 * futures contract. For each day, the price move implied by the yield (TVC:JP30Y) is
 * −ModDur·Δy (par-bond modified duration at that yield, 30y semi-annual). A day whose actual
 * price change differs from that by more than `rollResidPct` (default 1.0%; normal days'
 * median |residual| ≈ 0.08%, real rolls 1.6–7.6%) is a ROLL: all earlier prices are multiplied
 * by newPrice / (oldPrice·(1+implied)), so the series carries only the market move.
 * The latest bars stay the real new-bond quotes.
 *
 * Fallback when the yield series is missing: a day-on-day price gap > `gapPct` (default
 * 2.5%) is treated as a possible roll; history before it is dropped and the result carries
 * `unverifiedSince` (roll date) until the new bond has `minBars` (26 = SMA20 + 5d slope +
 * 9d change) sessions, so the seat scores 0 UNVERIFIED instead of a fake −1/+1.
 */
export function jp30Continuous(priceBars, yieldBars, { rollResidPct = 1.0, gapPct = 2.5, minBars = 26 } = {}) {
  const rolls = [];
  if (!priceBars?.length) return { bars: [], rolls, method: "none" };
  if (yieldBars?.length) {
    const ym = new Map(yieldBars.map((b) => [b.date, b.close]));
    const p = priceBars.filter((b) => ym.has(b.date));
    const factor = new Array(p.length).fill(1);
    for (let i = 1; i < p.length; i++) {
      const y0 = ym.get(p[i - 1].date) / 100;
      const dy = ym.get(p[i].date) / 100 - y0;
      const modDur = y0 > 0 ? (1 - Math.pow(1 + y0 / 2, -60)) / y0 : 30;
      const implied = -modDur * dy;
      const actual = p[i].close / p[i - 1].close - 1;
      if (Math.abs(actual - implied) * 100 > rollResidPct) {
        const f = p[i].close / (p[i - 1].close * (1 + implied));
        for (let j = 0; j < i; j++) factor[j] *= f;
        rolls.push({
          date: p[i].date,
          from: p[i - 1].close,
          to: p[i].close,
          priceChgPct: Number((actual * 100).toFixed(3)),
          yieldImpliedPct: Number((implied * 100).toFixed(3)),
          factor: Number(f.toFixed(6)),
        });
      }
    }
    return { bars: p.map((b, i) => ({ date: b.date, close: b.close * factor[i] })), rolls, method: "yield-back-adjusted" };
  }
  // No yield: cut at the last big gap and hold the seat UNVERIFIED until enough new-bond bars.
  let cut = 0;
  for (let i = 1; i < priceBars.length; i++) {
    const chg = Math.abs(priceBars[i].close / priceBars[i - 1].close - 1) * 100;
    if (chg > gapPct) {
      cut = i;
      rolls.push({ date: priceBars[i].date, from: priceBars[i - 1].close, to: priceBars[i].close, priceChgPct: Number((chg).toFixed(3)), yieldImpliedPct: null, factor: null });
    }
  }
  const bars = priceBars.slice(cut);
  const unverifiedSince = cut > 0 && bars.length < minBars ? priceBars[cut].date : null;
  return { bars, rolls, method: cut > 0 ? "gap-cut-no-yield" : "raw-no-yield", unverifiedSince, newBondBars: bars.length };
}
