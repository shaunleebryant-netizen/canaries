#!/usr/bin/env node
/**
 * MFI Scan — MFI(14) zone highlights on Yahoo **daily** (1d) bars only.
 * Owner Pine (reference / chart study): data/money-flow-mfi-bottom-finder.pine
 *
 * Box prints only when the **latest daily** MFI reading is:
 *   ≤ 20 → buy zone 🤑  (signal: "mfi_os")
 *   ≥ 80 → sell zone 😡  (signal: "mfi_ob")
 *
 * Does NOT require the full Pine bottomSignal (hook/volume/armed).
 * Soft-fail no-volume / 404 like other scanners. Never invent prints.
 *
 * Usage:
 *   node scripts/scan-money-flow.mjs
 *   node scripts/scan-money-flow.mjs --limit 15
 */

import { readFileSync, writeFileSync, copyFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { loadUniverse } from "./lib/scan-common.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const FISH_UNIVERSE_PATH = join(ROOT, "data/fish-universe.json");
const ETF_UNIVERSE_PATH = join(ROOT, "data/etf-watch-universe.json");
/** @deprecated alias — loadUniverse merges fish ∪ ETF Watch */
const UNIVERSE_PATH = FISH_UNIVERSE_PATH;
const OUT_PATH = join(ROOT, "data/money-flow-alerts.json");
const MIRROR_DIR = "/home/box/canaries";

const YAHOO_UA =
  "Mozilla/5.0 (compatible; CanaryDashboard/1.0; +https://canarydashboard.com)";

const METHOD = "yahoo-1d-mfi14-zone";
const TZ = "America/New_York";
const CONCURRENCY = 4;
const DELAY_MS = 180;
const RANGE = "6mo"; // enough for MFI(14) + warmup
const MFI_LEN = 14;
const OS_LEVEL = 20;
const OB_LEVEL = 80;
const MIN_BARS = MFI_LEN + 5;
/** Keep every 🤑/😡 zone print within this many calendar days of the latest bar. */
const HISTORY_DAYS = 14;

function daysBetween(a, b) {
  const [ay, am, ad] = a.split("-").map(Number);
  const [by, bm, bd] = b.split("-").map(Number);
  return Math.round((Date.UTC(ay, am - 1, ad) - Date.UTC(by, bm - 1, bd)) / 86_400_000);
}

/** Same Yahoo symbol maps as scan-fish-v3.mjs */
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
    return { error: `too few daily bars (${bars.length})` };
  }
  return { bars, yahooSymbol: result.meta?.symbol ?? symbol };
}

/**
 * Pine ta.mfi(hlc3, length) — Money Flow Index on typical price.
 * Returns array of number|null aligned to bars.
 */
function mfiSeries(bars, length) {
  const n = bars.length;
  const out = new Array(n).fill(null);
  if (n < length + 1) return out;

  const tp = bars.map((b) => (b.high + b.low + b.close) / 3);
  const rawMF = bars.map((b, i) => tp[i] * b.volume);

  // Need length positive/negative money-flow sums starting at index `length`
  for (let i = length; i < n; i++) {
    let pos = 0;
    let neg = 0;
    let missingVol = false;
    for (let k = i - length + 1; k <= i; k++) {
      if (bars[k].volume <= 0) missingVol = true;
      const prev = tp[k - 1];
      const cur = tp[k];
      if (cur > prev) pos += rawMF[k];
      else if (cur < prev) neg += rawMF[k];
      // equal TP: neither (Pine/TV behavior)
    }
    if (missingVol) {
      out[i] = null;
      continue;
    }
    if (neg === 0) {
      out[i] = pos === 0 ? 50 : 100;
    } else {
      const ratio = pos / neg;
      out[i] = 100 - 100 / (1 + ratio);
    }
  }
  return out;
}

async function scanTicker(ticker) {
  const candidates = SYMBOL_CANDIDATES[ticker] ?? [ticker];
  let lastErr = "no candidates";
  for (const sym of candidates) {
    const daily = await fetchDaily(sym);
    if (daily.error) {
      lastErr = `${sym}: ${daily.error}`;
      continue;
    }
    const bars = daily.bars;
    // Soft-fail symbols with no usable volume on recent bars
    const recentVol = bars.slice(-MFI_LEN).reduce((s, b) => s + b.volume, 0);
    if (recentVol <= 0) {
      lastErr = `${sym}: no volume (MFI needs volume)`;
      continue;
    }
    const mfi = mfiSeries(bars, MFI_LEN);
    const last = bars.length - 1;
    const latestMfi = mfi[last];
    const asOf = bars[last].asOf;
    if (latestMfi == null || Number.isNaN(latestMfi)) {
      lastErr = `${sym}: MFI unavailable on latest daily bar`;
      continue;
    }
    let hit = null;
    if (latestMfi <= OS_LEVEL) {
      hit = {
        signal: "mfi_os",
        asOf,
        mfi: Number(latestMfi.toFixed(2)),
        note: `MFI=${latestMfi.toFixed(1)} ≤ ${OS_LEVEL} (buy zone)`,
      };
    } else if (latestMfi >= OB_LEVEL) {
      hit = {
        signal: "mfi_ob",
        asOf,
        mfi: Number(latestMfi.toFixed(2)),
        note: `MFI=${latestMfi.toFixed(1)} ≥ ${OB_LEVEL} (sell zone)`,
      };
    }
    // 14-calendar-day daily MFI history + every zone print in that window.
    const history = [];
    const prints = [];
    for (let k = last; k >= 0; k--) {
      if (daysBetween(asOf, bars[k].asOf) > HISTORY_DAYS) break;
      const v = mfi[k];
      if (v == null || Number.isNaN(v)) continue;
      const val = Number(v.toFixed(2));
      history.unshift({ asOf: bars[k].asOf, mfi: val });
      if (v <= OS_LEVEL) prints.unshift({ asOf: bars[k].asOf, signal: "mfi_os", mfi: val });
      else if (v >= OB_LEVEL) prints.unshift({ asOf: bars[k].asOf, signal: "mfi_ob", mfi: val });
    }
    return {
      ok: true,
      ticker,
      yahoo: daily.yahooSymbol,
      barsDaily: bars.length,
      history,
      prints,
      latestAsOf: asOf,
      latestMfi: Number(latestMfi.toFixed(2)),
      hit,
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

async function main() {
  const args = parseArgs(process.argv);
  let tickers = loadUniverse();
  const universeCount = tickers.length;
  if (args.limit > 0) tickers = tickers.slice(0, args.limit);

  console.log(
    `MFI Scan · universe ${universeCount} (fish ∪ ETF Watch) · running ${tickers.length} · ${METHOD} · daily only`
  );

  let done = 0;
  const rows = await pool(tickers, CONCURRENCY, async (ticker) => {
    const r = await scanTicker(ticker);
    done += 1;
    const tag = r.ok
      ? `ok 1D=${r.barsDaily} MFI=${r.latestMfi}${r.hit ? ` ${r.hit.signal}@${r.hit.asOf}` : ""}`
      : `FAIL ${r.error}`;
    if (done % 10 === 0 || !r.ok || r.hit) {
      console.log(`[${done}/${tickers.length}] ${ticker} ${tag}`);
    }
    return r;
  });

  const failed = [];
  const signals = [];
  /** All 🤑/😡 zone prints within HISTORY_DAYS (feeds Main Scanner 14-day rule). */
  const prints = [];
  /** Daily MFI readings within HISTORY_DAYS per ticker. */
  const history = {};
  let scannedCount = 0;
  let lastAsOf = "1970-01-01";
  let buyCount = 0;
  let sellCount = 0;

  for (const r of rows) {
    if (!r.ok) {
      failed.push({ ticker: r.ticker, error: r.error });
      continue;
    }
    scannedCount += 1;
    if (r.latestAsOf > lastAsOf) lastAsOf = r.latestAsOf;
    history[r.ticker] = r.history;
    for (const p of r.prints) {
      prints.push({ ticker: r.ticker, signal: p.signal, asOf: p.asOf, timeframe: "1D", mfi: p.mfi });
    }
    if (r.hit) {
      signals.push({
        ticker: r.ticker,
        signal: r.hit.signal,
        asOf: r.hit.asOf,
        timeframe: "1D",
        mfi: r.hit.mfi,
        note: r.hit.note,
      });
      if (r.hit.signal === "mfi_os") buyCount += 1;
      else sellCount += 1;
    }
  }

  signals.sort((a, b) => {
    if (a.asOf !== b.asOf) return a.asOf < b.asOf ? 1 : -1;
    if (a.signal !== b.signal) return a.signal.localeCompare(b.signal);
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
    historyDays: HISTORY_DAYS,
    prints,
    history,
    method: METHOD,
    note: `MFI Scan — latest daily MFI(14) on hlc3 · ≤${OS_LEVEL} 🤑 / ≥${OB_LEVEL} 😡 · Yahoo 1d only. Universe = fish ∪ ETF Watch (deduped). Zone highlights only (not full Pine bottomSignal). Never invented.`,
  };

  writeJson(OUT_PATH, doc);

  if (existsSync(MIRROR_DIR)) {
    try {
      copyFileSync(OUT_PATH, join(MIRROR_DIR, "money-flow-alerts.json"));
      if (existsSync(FISH_UNIVERSE_PATH)) {
        copyFileSync(FISH_UNIVERSE_PATH, join(MIRROR_DIR, "fish-universe.json"));
      }
      if (existsSync(ETF_UNIVERSE_PATH)) {
        copyFileSync(ETF_UNIVERSE_PATH, join(MIRROR_DIR, "etf-watch-universe.json"));
      }
    } catch (e) {
      console.warn("mirror skip:", e instanceof Error ? e.message : e);
    }
  }

  console.log("\n=== MFI Scan summary ===");
  console.log(
    `universe ${universeCount}  scanned ${scannedCount}  failed ${failed.length}`
  );
  console.log(`🤑 buy-zone (≤${OS_LEVEL}): ${buyCount}  ·  😡 sell-zone (≥${OB_LEVEL}): ${sellCount}`);
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
