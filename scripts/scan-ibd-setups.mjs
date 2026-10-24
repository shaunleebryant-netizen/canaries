#!/usr/bin/env node
/**
 * IBD Setups Scan — Minervini + IBD-style RS on Yahoo **daily** (1d) bars only.
 * Owner Pine (reference / chart study): data/ibd-minervini-rs-setup.pine
 *
 * Box prints when the **latest daily** bar has setup == true (full PASS):
 *   maOk && nearHigh && offLow && rsOk
 * Not only the one-bar transition (setup and not setup[1]).
 *
 * Defaults match Pine inputs:
 *   SMA 50/150/200; rising = MA > MA[21]; require 50>150>200 stack
 *   nearHigh ≤25% below 52w high (252); offLow ≥30% above 52w low
 *   RS: weighted 40/20/20/20 at 63/126/189/252 vs SPY; f_rsRating ≥ 70
 *
 * Soft-fail thin history / 404 like other scanners. Never invent prints.
 *
 * Usage:
 *   node scripts/scan-ibd-setups.mjs
 *   node scripts/scan-ibd-setups.mjs --limit 15
 */

import { readFileSync, writeFileSync, copyFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const UNIVERSE_PATH = join(ROOT, "data/fish-universe.json");
const OUT_PATH = join(ROOT, "data/ibd-setups-alerts.json");
const MIRROR_DIR = "/home/box/canaries";

const YAHOO_UA =
  "Mozilla/5.0 (compatible; CanaryDashboard/1.0; +https://canarydashboard.com)";

const METHOD = "yahoo-1d-minervini-ibd-rs-vs-spy";
const TZ = "America/New_York";
const CONCURRENCY = 4;
const DELAY_MS = 180;
const RANGE = "2y"; // ~1y+ needed: SMA200+21 + 252 lookback
const BENCH = "SPY";

const LEN50 = 50;
const LEN150 = 150;
const LEN200 = 200;
const SLOPE_LEN = 21;
const REQUIRE_STACK = true;
const NEAR_HIGH_PCT = 25.0;
const OFF_LOW_PCT = 30.0; // Minervini Trend Template: ≥30% above the 52-week low (owner 2026-09-26; was 25)
const LEN52 = 252;
const RS_MIN = 70;
const Q1 = 63;
const Q2 = 126;
const Q3 = 189;
const Q4 = 252;
const MIN_BARS = Math.max(LEN200 + SLOPE_LEN, LEN52, Q4) + 5; // ~278

/** Same Yahoo symbol maps as scan-fish-v3.mjs / scan-mfi-washout.mjs */
const SYMBOL_CANDIDATES = {
  BTCUSD: ["BTC-USD"],
  ETHUSD: ["ETH-USD"],
  SOLUSD: ["SOL-USD"],
  BNBUSD: ["BNB-USD"],
  XRPUSD: ["XRP-USD"],
  TOTAL: ["TOTAL", "TOTAL.D", "^CMC200"],
  XAUUSD: ["GC=F", "XAUUSD=X"],
  XAGUSD: ["SI=F", "XAGUSD=X"],
  SPX: ["^GSPC"],
  SP600: ["^SP600"],
};

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function parseArgs(argv) {
  const out = { limit: 0 };
  for (let i = 2; i < argv.length; i++) {
    if (argv[i] === "--limit") out.limit = Number(argv[++i] || 0);
  }
  return out;
}

function nyParts(unixSec) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(unixSec * 1000));
  const g = (t) => parts.find((p) => p.type === t)?.value;
  return {
    y: Number(g("year")),
    m: Number(g("month")),
    d: Number(g("day")),
    h: Number(g("hour")),
    min: Number(g("minute")),
  };
}

function ymd(p) {
  return `${p.y}-${String(p.m).padStart(2, "0")}-${String(p.d).padStart(2, "0")}`;
}

function nzNowIso() {
  const d = new Date();
  const parts = new Intl.DateTimeFormat("en-NZ", {
    timeZone: "Pacific/Auckland",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(d);
  const g = (t) => parts.find((p) => p.type === t)?.value;
  const asUtc = Date.UTC(
    Number(g("year")),
    Number(g("month")) - 1,
    Number(g("day")),
    Number(g("hour")),
    Number(g("minute")),
    Number(g("second"))
  );
  const diffMin = Math.round((asUtc - d.getTime()) / 60000);
  const sign = diffMin >= 0 ? "+" : "-";
  const abs = Math.abs(diffMin);
  const hh = String(Math.floor(abs / 60)).padStart(2, "0");
  const mm = String(abs % 60).padStart(2, "0");
  return `${g("year")}-${g("month")}-${g("day")}T${g("hour")}:${g("minute")}:${g("second")}${sign}${hh}:${mm}`;
}

async function yahooChart(symbol, { interval, range }) {
  const url =
    `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}` +
    `?interval=${interval}&range=${range}&includePrePost=false`;
  const res = await fetch(url, {
    headers: { "User-Agent": YAHOO_UA, Accept: "application/json" },
  });
  if (res.status === 429) {
    await sleep(1200);
    const retry = await fetch(url, {
      headers: { "User-Agent": YAHOO_UA, Accept: "application/json" },
    });
    if (!retry.ok) return { error: `HTTP ${retry.status}` };
    return { data: await retry.json() };
  }
  if (!res.ok) return { error: `HTTP ${res.status}` };
  return { data: await res.json() };
}

/** Yahoo daily OHLCV only — interval hardcoded to 1d (owner lock). */
async function fetchDaily(symbol) {
  const got = await yahooChart(symbol, { interval: "1d", range: RANGE });
  if (got.error) return { error: got.error };
  const root = got.data;
  const err = root?.chart?.error;
  const result = root?.chart?.result?.[0];
  if (err || !result) return { error: err?.description ?? "no chart result" };
  const ts = result.timestamp ?? [];
  const q = result.indicators?.quote?.[0] ?? {};
  const highs = q.high ?? [];
  const lows = q.low ?? [];
  const closes = q.close ?? [];
  const volumes = q.volume ?? [];
  const bars = [];
  for (let i = 0; i < ts.length; i++) {
    const t = ts[i];
    const h = highs[i];
    const l = lows[i];
    const c = closes[i];
    const v = volumes[i];
    if (t == null || h == null || l == null || c == null) continue;
    if ([h, l, c].some((x) => Number.isNaN(Number(x)))) continue;
    const p = nyParts(t);
    bars.push({
      t,
      high: Number(h),
      low: Number(l),
      close: Number(c),
      volume: v == null || Number.isNaN(Number(v)) ? 0 : Number(v),
      asOf: ymd(p),
    });
  }
  if (bars.length < MIN_BARS) {
    return { error: `too few daily bars (${bars.length} < ${MIN_BARS})` };
  }
  return { bars, yahooSymbol: result.meta?.symbol ?? symbol };
}

/** Simple SMA series; null until enough bars. */
function smaSeries(values, length) {
  const n = values.length;
  const out = new Array(n).fill(null);
  if (n < length) return out;
  let sum = 0;
  for (let i = 0; i < n; i++) {
    sum += values[i];
    if (i >= length) sum -= values[i - length];
    if (i >= length - 1) out[i] = sum / length;
  }
  return out;
}

/**
 * Pine f_weightedPerf — 40/20/20/20 at n1/n2/n3/n4 bars back.
 * Returns null if any lookback missing.
 */
function weightedPerf(closes, i, n1, n2, n3, n4) {
  const c = closes[i];
  if (c == null || c === 0) return null;
  const need = Math.max(n1, n2, n3, n4);
  if (i < need) return null;
  const c1 = closes[i - n1];
  const c2 = closes[i - n2];
  const c3 = closes[i - n3];
  const c4 = closes[i - n4];
  if ([c1, c2, c3, c4].some((x) => x == null || x === 0)) return null;
  const p1 = c / c1 - 1;
  const p2 = c / c2 - 1;
  const p3 = c / c3 - 1;
  const p4 = c / c4 - 1;
  return 0.4 * p1 + 0.2 * p2 + 0.2 * p3 + 0.2 * p4;
}

/**
 * Pine f_rsRating(rel100) — piecewise map to 1–99.
 */
function fRsRating(rel100) {
  if (rel100 == null || Number.isNaN(rel100)) return null;
  const x = rel100;
  let r;
  if (x >= 200.0) r = 99.0;
  else if (x >= 155.0) r = 92.0 + ((x - 155.0) * 7.0) / 45.0;
  else if (x >= 135.0) r = 85.0 + ((x - 135.0) * 7.0) / 20.0;
  else if (x >= 122.0) r = 80.0 + ((x - 122.0) * 5.0) / 13.0;
  else if (x >= 110.0) r = 70.0 + ((x - 110.0) * 10.0) / 12.0;
  else if (x >= 100.0) r = 55.0 + ((x - 100.0) * 15.0) / 10.0;
  else if (x >= 92.0) r = 40.0 + ((x - 92.0) * 15.0) / 8.0;
  else if (x >= 80.0) r = 25.0 + ((x - 80.0) * 15.0) / 12.0;
  else if (x >= 60.0) r = 10.0 + ((x - 60.0) * 15.0) / 20.0;
  else if (x >= 40.0) r = 3.0 + ((x - 40.0) * 7.0) / 20.0;
  else r = 1.0;
  return Math.round(Math.max(1.0, Math.min(99.0, r)));
}

/**
 * Evaluate latest-bar setup for one bar series vs precomputed benchW by asOf.
 * Returns hit object or null (not setup); throws soft error via { error }.
 */
function evaluateSetup(bars, benchWByAsOf) {
  const closes = bars.map((b) => b.close);
  const highs = bars.map((b) => b.high);
  const lows = bars.map((b) => b.low);
  const i = bars.length - 1;

  const sma50 = smaSeries(closes, LEN50);
  const sma150 = smaSeries(closes, LEN150);
  const sma200 = smaSeries(closes, LEN200);

  const s50 = sma50[i];
  const s150 = sma150[i];
  const s200 = sma200[i];
  if (s50 == null || s150 == null || s200 == null) {
    return { error: "SMA unavailable on latest bar" };
  }
  if (i < SLOPE_LEN) return { error: "insufficient slope lookback" };
  const s50p = sma50[i - SLOPE_LEN];
  const s150p = sma150[i - SLOPE_LEN];
  const s200p = sma200[i - SLOPE_LEN];
  if (s50p == null || s150p == null || s200p == null) {
    return { error: "SMA slope unavailable" };
  }

  const rise50 = s50 > s50p;
  const rise150 = s150 > s150p;
  const rise200 = s200 > s200p;

  // 52w high/low over last LEN52 bars including i
  if (i + 1 < LEN52) return { error: "insufficient 52w history" };
  let hi52 = -Infinity;
  let lo52 = Infinity;
  for (let k = i - LEN52 + 1; k <= i; k++) {
    if (highs[k] > hi52) hi52 = highs[k];
    if (lows[k] < lo52) lo52 = lows[k];
  }

  const dClose = closes[i];
  const aboveAll = dClose > s50 && dClose > s150 && dClose > s200;
  const allRising = rise50 && rise150 && rise200;
  const stacked = s50 > s150 && s150 > s200;
  const maOk = aboveAll && allRising && (REQUIRE_STACK ? stacked : true);

  const pctBelowHigh = hi52 > 0 ? ((hi52 - dClose) / hi52) * 100.0 : null;
  const pctAboveLow = lo52 > 0 ? ((dClose - lo52) / lo52) * 100.0 : null;
  const nearHigh =
    pctBelowHigh != null && !Number.isNaN(pctBelowHigh) && pctBelowHigh <= NEAR_HIGH_PCT;
  const offLow =
    pctAboveLow != null && !Number.isNaN(pctAboveLow) && pctAboveLow >= OFF_LOW_PCT;

  const stockW = weightedPerf(closes, i, Q1, Q2, Q3, Q4);
  const asOf = bars[i].asOf;
  // Align bench to same calendar date (or latest SPY bar on/before asOf)
  let benchW = benchWByAsOf.get(asOf);
  if (benchW == null) {
    // fall back: nearest prior asOf key
    let best = null;
    for (const [d, w] of benchWByAsOf) {
      if (d <= asOf && (best == null || d > best)) best = d;
    }
    if (best != null) benchW = benchWByAsOf.get(best);
  }
  if (stockW == null || benchW == null || Number.isNaN(stockW) || Number.isNaN(benchW)) {
    return { error: "weighted RS unavailable (stock or SPY)" };
  }
  if (1.0 + benchW === 0) return { error: "benchW degenerate" };

  const rel100 = ((1.0 + stockW) / (1.0 + benchW)) * 100.0;
  const rsRating = fRsRating(rel100);
  const rsOk =
    rsRating != null && rsRating >= RS_MIN && stockW != null && benchW != null;

  const setup = maOk && nearHigh && offLow && rsOk;

  return {
    asOf,
    setup,
    maOk,
    nearHigh,
    offLow,
    rsOk,
    rsRating,
    rel100: Number(rel100.toFixed(2)),
    pctBelowHigh:
      pctBelowHigh != null ? Number(pctBelowHigh.toFixed(2)) : null,
    pctAboveLow: pctAboveLow != null ? Number(pctAboveLow.toFixed(2)) : null,
    stockW: Number(stockW.toFixed(6)),
    benchW: Number(benchW.toFixed(6)),
  };
}

/** Precompute SPY weighted perf by asOf for RS alignment. */
function buildBenchMap(bars) {
  const closes = bars.map((b) => b.close);
  const map = new Map();
  for (let i = 0; i < bars.length; i++) {
    const w = weightedPerf(closes, i, Q1, Q2, Q3, Q4);
    if (w != null) map.set(bars[i].asOf, w);
  }
  return map;
}

async function scanTicker(ticker, benchWByAsOf) {
  const candidates = SYMBOL_CANDIDATES[ticker] ?? [ticker];
  let lastErr = "no candidates";
  for (const sym of candidates) {
    const daily = await fetchDaily(sym);
    if (daily.error) {
      lastErr = `${sym}: ${daily.error}`;
      continue;
    }
    const ev = evaluateSetup(daily.bars, benchWByAsOf);
    if (ev.error) {
      lastErr = `${sym}: ${ev.error}`;
      continue;
    }
    return {
      ok: true,
      ticker,
      yahoo: daily.yahooSymbol,
      barsDaily: daily.bars.length,
      latestAsOf: ev.asOf,
      eval: ev,
      hit: ev.setup
        ? {
            asOf: ev.asOf,
            rsRating: ev.rsRating,
            pctBelowHigh: ev.pctBelowHigh,
            pctAboveLow: ev.pctAboveLow,
            note: `RS ${ev.rsRating} · ${ev.pctBelowHigh?.toFixed?.(1) ?? ev.pctBelowHigh}% below 52w high · ${ev.pctAboveLow?.toFixed?.(1) ?? ev.pctAboveLow}% above 52w low`,
          }
        : null,
    };
  }
  return { ok: false, ticker, error: lastErr };
}

async function pool(items, n, fn) {
  const results = new Array(items.length);
  let i = 0;
  async function worker() {
    while (i < items.length) {
      const idx = i++;
      results[idx] = await fn(items[idx], idx);
      await sleep(DELAY_MS);
    }
  }
  await Promise.all(Array.from({ length: Math.min(n, items.length) }, worker));
  return results;
}

function writeJson(path, obj) {
  writeFileSync(path, JSON.stringify(obj, null, 2) + "\n");
}

function loadUniverse() {
  const raw = JSON.parse(readFileSync(UNIVERSE_PATH, "utf8"));
  const tickers = Array.isArray(raw.tickers) ? raw.tickers : [];
  return [...new Set(tickers.map((t) => String(t).trim()).filter(Boolean))];
}

async function main() {
  const args = parseArgs(process.argv);
  let tickers = loadUniverse();
  const universeCount = tickers.length;
  if (args.limit > 0) tickers = tickers.slice(0, args.limit);

  console.log(
    `IBD Setups · universe ${universeCount} · running ${tickers.length} · ${METHOD} · daily only · bench ${BENCH}`
  );

  const benchDaily = await fetchDaily(BENCH);
  if (benchDaily.error) {
    console.error(`FATAL: cannot load benchmark ${BENCH}: ${benchDaily.error}`);
    process.exit(1);
  }
  const benchWByAsOf = buildBenchMap(benchDaily.bars);
  console.log(
    `benchmark ${BENCH}: ${benchDaily.bars.length} daily bars · wPerf dates ${benchWByAsOf.size}`
  );

  let done = 0;
  const rows = await pool(tickers, CONCURRENCY, async (ticker) => {
    const r = await scanTicker(ticker, benchWByAsOf);
    done += 1;
    const tag = r.ok
      ? `ok 1D=${r.barsDaily}${r.hit ? ` SETUP RS=${r.hit.rsRating}@${r.hit.asOf}` : r.eval ? ` wait RS=${r.eval.rsRating}` : ""}`
      : `FAIL ${r.error}`;
    if (done % 10 === 0 || !r.ok || r.hit) {
      console.log(`[${done}/${tickers.length}] ${ticker} ${tag}`);
    }
    return r;
  });

  const failed = [];
  const signals = [];
  let scannedCount = 0;
  let lastAsOf = "1970-01-01";

  for (const r of rows) {
    if (!r.ok) {
      failed.push({ ticker: r.ticker, error: r.error });
      continue;
    }
    scannedCount += 1;
    if (r.latestAsOf > lastAsOf) lastAsOf = r.latestAsOf;
    if (r.hit) {
      signals.push({
        ticker: r.ticker,
        asOf: r.hit.asOf,
        timeframe: "1D",
        rsRating: r.hit.rsRating,
        pctBelowHigh: r.hit.pctBelowHigh,
        pctAboveLow: r.hit.pctAboveLow,
        note: r.hit.note,
      });
    }
  }

  // Strongest RS first, then ticker
  signals.sort((a, b) => {
    if (a.asOf !== b.asOf) return a.asOf < b.asOf ? 1 : -1;
    if (b.rsRating !== a.rsRating) return (b.rsRating ?? 0) - (a.rsRating ?? 0);
    return a.ticker.localeCompare(b.ticker);
  });

  const scannedAt = nzNowIso();
  const asOf = lastAsOf === "1970-01-01" ? scannedAt.slice(0, 10) : lastAsOf;

  const doc = {
    asOf,
    scannedAt,
    universeCount,
    scannedCount,
    failed: failed.map((f) => f.ticker),
    failedDetail: failed,
    signals,
    method: METHOD,
    note:
      "IBD Setups — latest daily Minervini MA/52w template + IBD-style RS ≥70 vs SPY (Yahoo 1d). RS is IBD-style vs SPY approximation, not official IBD percentile. Prints where setup==true (full PASS), not only the on-transition. Never invented.",
  };

  writeJson(OUT_PATH, doc);

  if (existsSync(MIRROR_DIR)) {
    try {
      copyFileSync(OUT_PATH, join(MIRROR_DIR, "ibd-setups-alerts.json"));
      if (existsSync(UNIVERSE_PATH)) {
        copyFileSync(UNIVERSE_PATH, join(MIRROR_DIR, "fish-universe.json"));
      }
    } catch (e) {
      console.warn("mirror skip:", e instanceof Error ? e.message : e);
    }
  }

  console.log("\n=== IBD Setups summary ===");
  console.log(
    `universe ${universeCount}  scanned ${scannedCount}  failed ${failed.length}`
  );
  console.log(`SETUP prints (setup==true): ${signals.length}`);
  if (signals.length) {
    console.log(
      "sample:",
      signals
        .slice(0, 12)
        .map((s) => `${s.ticker} RS${s.rsRating}@${s.asOf}`)
        .join(" | ")
    );
  }
  if (failed.length) {
    console.log(
      "failed:",
      failed.map((f) => `${f.ticker} (${f.error})`).join(" | ")
    );
  }
  console.log(`wrote ${OUT_PATH}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
