/**
 * Shared helpers for Yahoo-bar scanners (MFI Scan, Weekly Market State,
 * Monthly 20MA). Universe loader = Fish universe ∪ ETF Watch universe
 * (deduped) — the MFI Scan universe.
 */

import { readFileSync, writeFileSync, copyFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
export const ROOT = join(__dirname, "..", "..");
export const FISH_UNIVERSE_PATH = join(ROOT, "data/fish-universe.json");
export const ETF_UNIVERSE_PATH = join(ROOT, "data/etf-watch-universe.json");
export const MIRROR_DIR = "/home/box/canaries";

export const YAHOO_UA =
  "Mozilla/5.0 (compatible; CanaryDashboard/1.0; +https://canarydashboard.com)";

/** Same Yahoo symbol maps as scan-fish-v3.mjs / scan-mfi-washout.mjs */
export const SYMBOL_CANDIDATES = {
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

export function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

export function loadTickerList(path) {
  if (!existsSync(path)) return [];
  const raw = JSON.parse(readFileSync(path, "utf8"));
  const tickers = Array.isArray(raw.tickers) ? raw.tickers : [];
  return tickers.map((t) => String(t).trim()).filter(Boolean);
}

/** MFI Scan universe = fish-universe ∪ etf-watch-universe (deduped). */
export function loadUniverse() {
  const merged = [
    ...loadTickerList(FISH_UNIVERSE_PATH),
    ...loadTickerList(ETF_UNIVERSE_PATH),
  ];
  return [...new Set(merged)];
}

export function nzNowIso() {
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

/** YYYY-MM-DD of a unix-second timestamp in the given IANA zone.
 * Formatter cached per zone (2026-10-07): building one per call over full daily histories
 * (~10k bars × hundreds of tickers) exhausted memory. Output unchanged. */
const YMD_FORMATTERS = new Map();
export function ymdInTz(unixSec, timeZone) {
  let f = YMD_FORMATTERS.get(timeZone);
  if (!f) {
    f = new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" });
    YMD_FORMATTERS.set(timeZone, f);
  }
  return f.format(new Date(unixSec * 1000));
}

/** Monday (YYYY-MM-DD) of the week containing a YYYY-MM-DD date. */
export function mondayOf(ymd) {
  const [y, m, d] = ymd.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d, 12));
  const dow = dt.getUTCDay(); // 0 Sun .. 6 Sat
  const back = (dow + 6) % 7;
  dt.setUTCDate(dt.getUTCDate() - back);
  return dt.toISOString().slice(0, 10);
}

export async function yahooChart(symbol, { interval, range }) {
  const url =
    `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}` +
    `?interval=${interval}&range=${range}&includePrePost=false`;
  const opts = { headers: { "User-Agent": YAHOO_UA, Accept: "application/json" } };
  let res = await fetch(url, opts);
  if (res.status === 429) {
    await sleep(1200);
    res = await fetch(url, opts);
  }
  if (!res.ok) return { error: `HTTP ${res.status}` };
  return { data: await res.json() };
}

/**
 * Fetch Yahoo weekly (1wk) or monthly (1mo) OHLC bars, bucketed by period in
 * the exchange timezone. Yahoo often appends a separate "live" bar stamped
 * with the latest trade time (duplicate of the current period) — it is merged
 * into its period (open=first, high=max, low=min, close=last non-null) so the
 * current in-progress week/month has one bar, like a TradingView chart.
 */
export async function fetchPeriodBars(symbol, { interval, range, minBars }) {
  const got = await yahooChart(symbol, { interval, range });
  if (got.error) return { error: got.error };
  const root = got.data;
  const err = root?.chart?.error;
  const result = root?.chart?.result?.[0];
  if (err || !result) return { error: err?.description ?? "no chart result" };
  const meta = result.meta ?? {};
  const tz = meta.exchangeTimezoneName || "America/New_York";
  const ts = result.timestamp ?? [];
  const q = result.indicators?.quote?.[0] ?? {};
  const byKey = new Map();
  const order = [];
  for (let i = 0; i < ts.length; i++) {
    const t = ts[i];
    const o = q.open?.[i];
    const h = q.high?.[i];
    const l = q.low?.[i];
    const c = q.close?.[i];
    if (t == null || o == null || h == null || l == null || c == null) continue;
    if ([o, h, l, c].some((x) => !Number.isFinite(Number(x)))) continue;
    const day = ymdInTz(t, tz);
    const key = interval === "1mo" ? day.slice(0, 7) : mondayOf(day);
    const prev = byKey.get(key);
    if (!prev) {
      const bar = {
        key,
        t,
        open: Number(o),
        high: Number(h),
        low: Number(l),
        close: Number(c),
        lastDay: day,
      };
      byKey.set(key, bar);
      order.push(key);
    } else {
      prev.high = Math.max(prev.high, Number(h));
      prev.low = Math.min(prev.low, Number(l));
      prev.close = Number(c);
      if (day > prev.lastDay) prev.lastDay = day;
    }
  }
  const bars = order.map((k) => byKey.get(k));
  if (bars.length < minBars) {
    return { error: `too few ${interval} bars (${bars.length} < ${minBars})` };
  }
  const lastTradeDay = meta.regularMarketTime
    ? ymdInTz(meta.regularMarketTime, "America/New_York")
    : bars[bars.length - 1].lastDay;
  return {
    bars,
    yahooSymbol: meta.symbol ?? symbol,
    exchangeTz: tz,
    lastTradeDay,
  };
}

export async function pool(items, n, fn, delayMs = 180) {
  const results = new Array(items.length);
  let i = 0;
  async function worker() {
    while (i < items.length) {
      const idx = i++;
      results[idx] = await fn(items[idx], idx);
      await sleep(delayMs);
    }
  }
  await Promise.all(Array.from({ length: Math.min(n, items.length) }, worker));
  return results;
}

export function writeJson(path, obj) {
  writeFileSync(path, JSON.stringify(obj, null, 2) + "\n");
}

export function mirrorData(name) {
  if (!existsSync(MIRROR_DIR)) return false;
  try {
    copyFileSync(join(ROOT, "data", name), join(MIRROR_DIR, name));
    return true;
  } catch (e) {
    console.warn(`mirror skip ${name}:`, e instanceof Error ? e.message : e);
    return false;
  }
}

export function parseCommonArgs(argv) {
  const out = { limit: 0, sessionDate: null, tickers: null, dryRun: false };
  for (let i = 2; i < argv.length; i++) {
    if (argv[i] === "--limit") out.limit = Number(argv[++i] || 0);
    else if (argv[i] === "--session-date") out.sessionDate = argv[++i];
    else if (argv[i] === "--dry-run") out.dryRun = true;
    else if (argv[i] === "--tickers")
      out.tickers = String(argv[++i] || "")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
  }
  return out;
}
