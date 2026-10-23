#!/usr/bin/env node
/**
 * Bottom Finder + Exhaustion Combo v2.3 — Yahoo daily print filter.
 * Authoritative Pine: data/fish-indicator-bottom-finder-v2.3.pine
 *
 * Keeps the same Pine v2.3 input defaults (the "4H settings"), but runs
 * f_signals() on daily bars only. Emojis print only when they appear on
 * the daily chart — not on 4H — to cut 4H noise on the dashboard boxes.
 *
 * Fetch 1d (~1y, includePrePost=false) → f_signals() with unchanged P.
 *
 * Never invent prints. Soft-fail missing symbols.
 *
 * Usage:
 *   node scripts/scan-fish-v2.3.mjs
 *   node scripts/scan-fish-v2.3.mjs --limit 8
 */

import { readFileSync, writeFileSync, mkdirSync, copyFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const UNIVERSE_PATH = join(ROOT, "data/fish-universe.json");
const FISH_OUT = join(ROOT, "data/fish-alerts.json");
const EXH_OUT = join(ROOT, "data/exhaustion-alerts.json");
const MIRROR_DIR = "/home/box/canaries";

const YAHOO_UA =
  "Mozilla/5.0 (compatible; CanaryDashboard/1.0; +https://canarydashboard.com)";

const METHOD = "yahoo-1d-pine-v2.3-settings-4h-params";
const TZ = "America/New_York";
const RECENT_SESSIONS = 20;
const CONCURRENCY = 4;
const DELAY_MS = 180;
const RANGE = "1y";

// Pine v2.3 input defaults
const P = {
  emaFastLen: 13,
  emaSlowLen: 55,
  rsiLen: 14,
  rsiDeep: 25,
  useTrendDirBottom: true,
  useHook: true,
  rsiHook: 32,
  hookNeedLl: true,
  useDivBot: true,
  divLook: 12,
  lookbackFish: 60,
  fishExitLevel: 30,
  fishMinRiseAmount: 5,
  fishUseRsiMA: true,
  fishRsiMALen: 5,
  fishRequirePriceUp: true,
  fishNeedStrongBar: true,
  fishCooldown: 10,
  rsiWarn: 78,
  useTrendDirTop: true,
  useHookTop: true,
  useDivTop: true,
  detBars: 2,
  detUseRSIMA: true,
  detRsiMALen: 8,
  detMinDrop: 0.5,
  requireRedCandle: true,
};

const SYMBOL_CANDIDATES = {
  BTCUSD: ["BTC-USD"],
  ETHUSD: ["ETH-USD"],
  XAUUSD: ["GC=F", "XAUUSD=X"],
  XAGUSD: ["SI=F", "XAGUSD=X"],
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
  // NZ is UTC+12 in Sep 2026 (NZDT starts late Sep; 22 Sep 2026 is NZST +12)
  const offset = "Pacific/Auckland";
  // Derive offset from the formatted instant vs UTC
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
  void offset;
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

async function fetchHourly(symbol) {
  const got = await yahooChart(symbol, { interval: "60m", range: RANGE });
  if (got.error) return { error: got.error };
  const root = got.data;
  const err = root?.chart?.error;
  const result = root?.chart?.result?.[0];
  if (err || !result) return { error: err?.description ?? "no chart result" };
  const ts = result.timestamp ?? [];
  const q = result.indicators?.quote?.[0] ?? {};
  const opens = q.open ?? [];
  const highs = q.high ?? [];
  const lows = q.low ?? [];
  const closes = q.close ?? [];
  const bars = [];
  for (let i = 0; i < ts.length; i++) {
    const t = ts[i];
    const o = opens[i];
    const h = highs[i];
    const l = lows[i];
    const c = closes[i];
    if (t == null || o == null || h == null || l == null || c == null) continue;
    if ([o, h, l, c].some((x) => Number.isNaN(Number(x)))) continue;
    bars.push({
      t,
      open: Number(o),
      high: Number(h),
      low: Number(l),
      close: Number(c),
    });
  }
  if (bars.length < 80) return { error: `too few 60m bars (${bars.length})` };
  return { bars, yahooSymbol: result.meta?.symbol ?? symbol };
}

async function fetchDaily(symbol) {
  const got = await yahooChart(symbol, { interval: "1d", range: RANGE });
  if (got.error) return { error: got.error };
  const root = got.data;
  const err = root?.chart?.error;
  const result = root?.chart?.result?.[0];
  if (err || !result) return { error: err?.description ?? "no chart result" };
  const ts = result.timestamp ?? [];
  const q = result.indicators?.quote?.[0] ?? {};
  const opens = q.open ?? [];
  const highs = q.high ?? [];
  const lows = q.low ?? [];
  const closes = q.close ?? [];
  const bars = [];
  for (let i = 0; i < ts.length; i++) {
    const t = ts[i];
    const o = opens[i];
    const h = highs[i];
    const l = lows[i];
    const c = closes[i];
    if (t == null || o == null || h == null || l == null || c == null) continue;
    if ([o, h, l, c].some((x) => Number.isNaN(Number(x)))) continue;
    const p = nyParts(t);
    bars.push({
      t,
      open: Number(o),
      high: Number(h),
      low: Number(l),
      close: Number(c),
      asOf: ymd(p),
    });
  }
  if (bars.length < 70) return { error: `too few daily bars (${bars.length})` };
  return { bars, yahooSymbol: result.meta?.symbol ?? symbol };
}

function aggregateNy4h(hourly) {
  const buckets = new Map();
  for (const b of hourly) {
    const p = nyParts(b.t);
    if (!Number.isFinite(p.h)) continue;
    const bucketH = Math.floor(p.h / 4) * 4;
    const key = `${ymd(p)}T${String(bucketH).padStart(2, "0")}`;
    let acc = buckets.get(key);
    if (!acc) {
      acc = {
        key,
        asOf: ymd(p),
        t: b.t,
        open: b.open,
        high: b.high,
        low: b.low,
        close: b.close,
      };
      buckets.set(key, acc);
    } else {
      acc.high = Math.max(acc.high, b.high);
      acc.low = Math.min(acc.low, b.low);
      acc.close = b.close;
      acc.t = b.t;
    }
  }
  return [...buckets.values()].sort((a, b) => a.t - b.t);
}

function emaSeries(src, length) {
  const out = new Array(src.length).fill(null);
  if (src.length < length) return out;
  let sum = 0;
  for (let i = 0; i < length; i++) sum += src[i];
  let prev = sum / length;
  out[length - 1] = prev;
  const k = 2 / (length + 1);
  for (let i = length; i < src.length; i++) {
    prev = src[i] * k + prev * (1 - k);
    out[i] = prev;
  }
  return out;
}

function smaAt(src, i, length) {
  if (i + 1 < length) return null;
  let s = 0;
  for (let k = 0; k < length; k++) {
    const v = src[i - k];
    if (v == null) return null;
    s += v;
  }
  return s / length;
}

/** Wilder RSI matching Pine ta.rsi */
function rsiSeries(closes, length) {
  const out = new Array(closes.length).fill(null);
  if (closes.length <= length) return out;
  let avgGain = 0;
  let avgLoss = 0;
  for (let i = 1; i <= length; i++) {
    const ch = closes[i] - closes[i - 1];
    if (ch > 0) avgGain += ch;
    else avgLoss -= ch;
  }
  avgGain /= length;
  avgLoss /= length;
  out[length] =
    avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss);
  for (let i = length + 1; i < closes.length; i++) {
    const ch = closes[i] - closes[i - 1];
    const gain = ch > 0 ? ch : 0;
    const loss = ch < 0 ? -ch : 0;
    avgGain = (avgGain * (length - 1) + gain) / length;
    avgLoss = (avgLoss * (length - 1) + loss) / length;
    out[i] =
      avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss);
  }
  return out;
}

function lowestPrior(closes, i, n) {
  if (i < 1) return null;
  let m = Infinity;
  const from = Math.max(0, i - n);
  for (let k = from; k < i; k++) m = Math.min(m, closes[k]);
  return m === Infinity ? null : m;
}

function highestPrior(closes, i, n) {
  if (i < 1) return null;
  let m = -Infinity;
  const from = Math.max(0, i - n);
  for (let k = from; k < i; k++) m = Math.max(m, closes[k]);
  return m === -Infinity ? null : m;
}

function lowestIncl(closes, i, n) {
  let m = Infinity;
  const from = Math.max(0, i - n + 1);
  for (let k = from; k <= i; k++) m = Math.min(m, closes[k]);
  return m === Infinity ? null : m;
}

function highestIncl(closes, i, n) {
  let m = -Infinity;
  const from = Math.max(0, i - n + 1);
  for (let k = from; k <= i; k++) m = Math.max(m, closes[k]);
  return m === -Infinity ? null : m;
}

function crossover(a, b, i) {
  if (i < 1) return false;
  const a0 = a[i];
  const a1 = a[i - 1];
  if (a0 == null || a1 == null) return false;
  return a1 <= b && a0 > b;
}

function crossunder(a, b, i) {
  if (i < 1) return false;
  const a0 = a[i];
  const a1 = a[i - 1];
  if (a0 == null || a1 == null) return false;
  return a1 >= b && a0 < b;
}

function fSignals(bars) {
  const n = bars.length;
  const closes = bars.map((b) => b.close);
  const highs = bars.map((b) => b.high);
  const lows = bars.map((b) => b.low);
  const emaF = emaSeries(closes, P.emaFastLen);
  const emaS = emaSeries(closes, P.emaSlowLen);
  const rsi = rsiSeries(closes, P.rsiLen);

  const events = [];
  let lastBottom = null;
  let bottomRSI = null;
  let bottomPrice = null;
  let lastFish = null;
  let skullArmed = false;
  const lowHits = []; // {i, rsi} when close == lowest(close, divLook)
  const highHits = [];

  for (let i = 0; i < n; i++) {
    const r = rsi[i];
    const ef = emaF[i];
    const es = emaS[i];
    if (r == null || ef == null || es == null) continue;

    const hi = highs[i];
    const lo = lows[i];
    const cl = closes[i];
    const barLoc = hi - lo > 0 ? (cl - lo) / (hi - lo) : 0.5;

    const trendDown = P.useTrendDirBottom ? ef < es : true;
    const deep = r < P.rsiDeep && trendDown;

    let hook = P.useHook && crossover(rsi, P.rsiHook, i) && trendDown;
    if (hook && P.hookNeedLl) {
      const ll8 = lowestPrior(closes, i, 8);
      hook = ll8 != null && cl < ll8;
    }

    const loIncl = lowestIncl(closes, i, P.divLook);
    if (loIncl != null && cl === loIncl) lowHits.push({ i, rsi: r });
    const ll = (() => {
      const p = lowestPrior(closes, i, P.divLook);
      return p != null && cl < p;
    })();
    const priorLow = lowHits.length >= 2 ? lowHits[lowHits.length - 2] : null;
    const bullDiv =
      P.useDivBot &&
      ll &&
      priorLow != null &&
      r > priorLow.rsi &&
      r < 40;

    const bottomSignal = deep || hook || bullDiv;

    if (bottomSignal) {
      lastBottom = i;
      bottomRSI = r;
      bottomPrice = cl;
      events.push({
        kind: "smile",
        i,
        asOf: bars[i].asOf,
        rsi: r,
        why: deep ? "deep" : hook ? "hook" : "bullDiv",
      });
    }

    const barsFromBottom =
      lastBottom != null ? i - lastBottom : 999999;
    const inWindow =
      barsFromBottom > 0 && barsFromBottom <= P.lookbackFish;
    const coolOK =
      lastFish == null ? true : i - lastFish >= P.fishCooldown;
    const rsiMA = smaAt(rsi, i, P.fishRsiMALen);
    const rsiMAPrev = smaAt(rsi, i - 1, P.fishRsiMALen);
    const fish =
      inWindow &&
      coolOK &&
      r > P.fishExitLevel &&
      rsi[i - 1] != null &&
      r > rsi[i - 1] &&
      bottomRSI != null &&
      r > bottomRSI + P.fishMinRiseAmount &&
      (P.fishUseRsiMA ? rsiMA != null && rsiMAPrev != null && rsiMA > rsiMAPrev : true) &&
      (P.fishRequirePriceUp ? cl > bottomPrice : true) &&
      (P.fishNeedStrongBar ? barLoc >= 0.5 : true);

    if (fish) {
      lastFish = i;
      events.push({
        kind: "fish",
        i,
        asOf: bars[i].asOf,
        rsi: r,
        why: `fish RSI=${r.toFixed(1)}`,
      });
    }

    const regimeUp = P.useTrendDirTop ? ef > es : true;
    const hotCross = crossover(rsi, P.rsiWarn, i);
    const hotHook =
      P.useHookTop &&
      crossunder(rsi, P.rsiWarn, i) &&
      rsi[i - 1] != null &&
      rsi[i - 1] >= P.rsiWarn;
    const hiIncl = highestIncl(closes, i, P.divLook);
    if (hiIncl != null && cl === hiIncl) highHits.push({ i, rsi: r });
    const hh = (() => {
      const p = highestPrior(closes, i, P.divLook);
      return p != null && cl > p;
    })();
    const priorHigh = highHits.length >= 2 ? highHits[highHits.length - 2] : null;
    const bearDiv =
      P.useDivTop &&
      hh &&
      priorHigh != null &&
      r < priorHigh.rsi &&
      r > 60;
    const exhaustion = regimeUp && (hotCross || hotHook || bearDiv);

    if (exhaustion) {
      skullArmed = true;
      events.push({
        kind: "exhaustion",
        i,
        asOf: bars[i].asOf,
        rsi: r,
        why: hotCross ? "cross78" : hotHook ? "hook78" : "bearDiv",
      });
    }

    let fallSeq = i >= P.detBars;
    for (let k = 0; k < P.detBars; k++) {
      const cur = rsi[i - k];
      const nxt = rsi[i - k - 1];
      if (cur == null || nxt == null) {
        fallSeq = false;
        break;
      }
      const dropOK = P.detMinDrop <= 0 ? true : nxt - cur >= P.detMinDrop;
      if (!(cur < nxt && dropOK)) {
        fallSeq = false;
        break;
      }
    }
    const rsiMADet = smaAt(rsi, i, P.detRsiMALen);
    const det =
      fallSeq && (P.detUseRSIMA ? rsiMADet != null && r < rsiMADet : true);
    const priceFalling = P.requireRedCandle ? i >= 1 && cl < closes[i - 1] : true;
    const skull = skullArmed && det && priceFalling;
    if (skull) {
      skullArmed = false;
      events.push({
        kind: "skull",
        i,
        asOf: bars[i].asOf,
        rsi: r,
        why: `skull RSI=${r.toFixed(1)}`,
      });
    }
  }

  return events;
}

function recentCutoff(bars) {
  const dates = [];
  const seen = new Set();
  for (let i = bars.length - 1; i >= 0; i--) {
    const d = bars[i].asOf;
    if (!seen.has(d)) {
      seen.add(d);
      dates.push(d);
      if (dates.length >= RECENT_SESSIONS) break;
    }
  }
  return dates.length ? dates[dates.length - 1] : "0000-00-00";
}

function lastHits(events, cutoff) {
  const inWin = events.filter((e) => e.asOf >= cutoff);
  const last = (kind) => {
    for (let i = inWin.length - 1; i >= 0; i--) {
      if (inWin[i].kind === kind) return inWin[i];
    }
    return null;
  };
  return {
    smile: last("smile"),
    fish: last("fish"),
    exhaustion: last("exhaustion"),
    skull: last("skull"),
  };
}

async function scanTicker(ticker) {
  const candidates = SYMBOL_CANDIDATES[ticker] ?? [ticker];
  const tried = [];
  let lastErr = "no candidates";
  for (const sym of candidates) {
    tried.push(sym);
    // Same Pine v2.3 defaults (4H settings), evaluated on daily bars only.
    const daily = await fetchDaily(sym);
    if (daily.error) {
      lastErr = `${sym}: ${daily.error}`;
      continue;
    }
    const bars = daily.bars;
    if (bars.length < 70) {
      lastErr = `${sym}: too few daily bars (${bars.length})`;
      continue;
    }
    const events = fSignals(bars);
    const cutoff = recentCutoff(bars);
    const hits = lastHits(events, cutoff);
    return {
      ok: true,
      ticker,
      yahoo: daily.yahooSymbol,
      barsDaily: bars.length,
      cutoff,
      latestAsOf: bars[bars.length - 1].asOf,
      hits,
    };
  }
  return { ok: false, ticker, error: lastErr, tried };
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
    `v2.3 scan · universe ${universeCount} · running ${tickers.length} · daily prints · 4H settings · ${METHOD}`
  );

  let done = 0;
  const rows = await pool(tickers, CONCURRENCY, async (ticker) => {
    const r = await scanTicker(ticker);
    done += 1;
    const tag = r.ok
      ? `ok 1D=${r.barsDaily}`
      : `FAIL ${r.error}`;
    if (done % 10 === 0 || !r.ok) {
      console.log(`[${done}/${tickers.length}] ${ticker} ${tag}`);
    }
    return r;
  });

  const failed = [];
  const fishSignals = [];
  const exhSignals = [];
  let scannedCount = 0;
  let lastAsOf = "1970-01-01";

  for (const r of rows) {
    if (!r.ok) {
      failed.push({ ticker: r.ticker, error: r.error });
      continue;
    }
    scannedCount += 1;
    if (r.latestAsOf > lastAsOf) lastAsOf = r.latestAsOf;

    const { smile, fish, exhaustion, skull } = r.hits;
    if (smile || fish) {
      const asOf =
        smile && fish
          ? smile.asOf >= fish.asOf
            ? smile.asOf
            : fish.asOf
          : (fish ?? smile).asOf;
      const signal = smile && fish ? "both" : fish ? "fish" : "smile";
      const noteBits = [];
      if (smile) noteBits.push(`smile@${smile.asOf} ${smile.why}`);
      if (fish) noteBits.push(`fish@${fish.asOf} RSI=${fish.rsi.toFixed(1)}`);
      fishSignals.push({
        ticker: r.ticker,
        signal,
        asOf,
        timeframe: "1D",
        note: noteBits.join(" · "),
      });
    }
    // One latest top-side print per ticker (🥵 or 💀), not event history.
    // If both occur on the same bar, 💀 wins because it is evaluated after 🥵.
    const topHit =
      exhaustion && skull
        ? skull.i >= exhaustion.i
          ? skull
          : exhaustion
        : (skull ?? exhaustion);
    if (topHit) {
      const isSkull = topHit.kind === "skull";
      exhSignals.push({
        ticker: r.ticker,
        signal: isSkull ? "skull" : "exhaustion",
        asOf: topHit.asOf,
        timeframe: "1D",
        note: isSkull
          ? `💀 ${topHit.why}`
          : `🥵 ${topHit.why} RSI=${topHit.rsi.toFixed(1)}`,
      });
    }
  }

  const rank = { both: 0, fish: 1, smile: 2 };
  fishSignals.sort((a, b) => {
    if (a.asOf !== b.asOf) return a.asOf < b.asOf ? 1 : -1;
    return (rank[a.signal] ?? 9) - (rank[b.signal] ?? 9);
  });
  exhSignals.sort((a, b) => (a.asOf < b.asOf ? 1 : a.asOf > b.asOf ? -1 : 0));

  const scannedAt = nzNowIso();
  const asOf = lastAsOf === "1970-01-01" ? scannedAt.slice(0, 10) : lastAsOf;

  const fishDoc = {
    asOf,
    scannedAt,
    universeCount,
    scannedCount,
    failed: failed.map((f) => f.ticker),
    failedDetail: failed,
    signals: fishSignals,
    method: METHOD,
    note: `Pine v2.3 settings (4H defaults) on daily bars only · last ${RECENT_SESSIONS} sessions · Yahoo 1d. Never invented.`,
  };
  const exhDoc = {
    asOf,
    scannedAt,
    universeCount,
    scannedCount,
    failed: failed.map((f) => f.ticker),
    failedDetail: failed,
    signals: exhSignals,
    method: METHOD,
    note: `Pine v2.3 settings (4H defaults) on daily 🥵/💀 only · last ${RECENT_SESSIONS} sessions · Yahoo 1d. Never invented.`,
  };

  writeJson(FISH_OUT, fishDoc);
  writeJson(EXH_OUT, exhDoc);

  if (existsSync(MIRROR_DIR)) {
    try {
      copyFileSync(FISH_OUT, join(MIRROR_DIR, "fish-alerts.json"));
      copyFileSync(EXH_OUT, join(MIRROR_DIR, "exhaustion-alerts.json"));
    } catch (e) {
      console.warn("mirror skip:", e instanceof Error ? e.message : e);
    }
  }

  const smileN = fishSignals.filter((s) => s.signal === "smile").length;
  const fishN = fishSignals.filter((s) => s.signal === "fish").length;
  const bothN = fishSignals.filter((s) => s.signal === "both").length;
  const hotN = exhSignals.filter((s) => s.signal === "exhaustion").length;
  const skullN = exhSignals.filter((s) => s.signal === "skull").length;

  console.log("\n=== v2.3 scan summary ===");
  console.log(`universe ${universeCount}  scanned ${scannedCount}  failed ${failed.length}`);
  console.log(`🙂/🐟 rows ${fishSignals.length}  (smile ${smileN} · fish ${fishN} · both ${bothN})`);
  console.log(`🥵 rows ${hotN}  💀 rows ${skullN}`);
  if (failed.length) {
    console.log("failed:", failed.map((f) => `${f.ticker} (${f.error})`).join(" | "));
  }
  console.log(`wrote ${FISH_OUT}`);
  console.log(`wrote ${EXH_OUT}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
