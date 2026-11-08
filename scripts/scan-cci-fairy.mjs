#!/usr/bin/env node
/**
 * Canary Bottom Zone 🧚 — owner pt801u Pine "Bottom Zone Finder 🧚 (Sensitive)" with defaults
 * (scripts/lib/cci-fairy.mjs): WVF extreme AND RSI(14) was-oversold (<35) AND bullish close, on a completed
 * daily bar. Canary universe (data/fish-universe.json). Counts as a Bullish Setups ★ timing print. Education only.
 *   node scripts/scan-cci-fairy.mjs [--limit N]
 */
import { readFileSync, writeFileSync, existsSync, statSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { bottomZoneSeries, BZ } from "./lib/cci-fairy.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const UNIVERSE = join(ROOT, "data/fish-universe.json");
const OUT = join(ROOT, "data/cci-fairy.json");
const CACHE = join(ROOT, ".cache/daily-ohlc"); // needs open (bullish close) + H/L, so a small 1y OHLC fetch
const CACHE_MAX_AGE_MS = 18 * 3600 * 1000;
const RECENT_SESSIONS = 5, MIN_BARS = 60;
const UA = "Mozilla/5.0 (compatible; CanaryDashboard/1.0; +https://canarydashboard.com)";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const limit = Number(process.argv[process.argv.indexOf("--limit") + 1]) || 0;
const nyDate = (t) => new Intl.DateTimeFormat("en-CA", { timeZone: "America/New_York", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(t * 1000));
const cf = (s) => join(CACHE, `${s.replace(/[^A-Za-z0-9._-]/g, "_")}.json`);

async function fetchHLC(sym) {
  const f = cf(sym);
  if (existsSync(f) && Date.now() - statSync(f).mtimeMs < CACHE_MAX_AGE_MS) {
    try { return { ...JSON.parse(readFileSync(f, "utf8")), cached: true }; } catch {}
  }
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(sym)}?interval=1d&range=1y&includePrePost=false`;
  let res = await fetch(url, { headers: { "User-Agent": UA, Accept: "application/json" } });
  for (let a = 1; res.status === 429 && a <= 3; a++) { await sleep(1500 * a); res = await fetch(url, { headers: { "User-Agent": UA, Accept: "application/json" } }); }
  if (!res.ok) return { error: `HTTP ${res.status}` };
  const r = (await res.json())?.chart?.result?.[0];
  if (!r) return { error: "no chart result" };
  const ts = r.timestamp ?? [], q = r.indicators?.quote?.[0] ?? {};
  const bars = [];
  for (let i = 0; i < ts.length; i++) {
    const o = q.open?.[i], h = q.high?.[i], l = q.low?.[i], c = q.close?.[i], v = q.volume?.[i];
    if (o != null && h != null && l != null && c != null) bars.push({ t: ts[i], asOf: nyDate(ts[i]), open: +o, high: +h, low: +l, close: +c, volume: v == null ? 0 : +v });
  }
  const reg = r.meta?.currentTradingPeriod?.regular, now = Date.now() / 1000;
  if (bars.length && reg && now < reg.end && bars.at(-1).t >= reg.start - 43200) bars.pop(); // completed bars only
  const doc = { bars, name: r.meta?.shortName || r.meta?.longName || null };
  mkdirSync(CACHE, { recursive: true }); writeFileSync(f, JSON.stringify(doc));
  return doc;
}

const raw = JSON.parse(readFileSync(UNIVERSE, "utf8"));
let tickers = [...new Set((raw.tickers ?? raw.groups.flatMap((g) => g.tickers ?? [])).map((t) => String(t).trim()).filter(Boolean))];
const universeCount = tickers.length;
if (limit) tickers = tickers.slice(0, limit);
const prints = [], failed = [], lastDates = {};
let cacheHits = 0;
for (const sym of tickers) {
  const got = await fetchHLC(sym);
  if (got.cached) cacheHits++; else await sleep(120);
  if (got.error || got.bars.length < MIN_BARS) { failed.push({ ticker: sym, reason: got.error || "too few bars" }); continue; }
  const b = got.bars, z = bottomZoneSeries(b);
  lastDates[b.at(-1).asOf] = (lastDates[b.at(-1).asOf] || 0) + 1;
  for (let i = b.length - 1; i >= Math.max(1, b.length - RECENT_SESSIONS); i--) {
    if (z.sig[i]) {
      prints.push({ ticker: sym, name: got.name, asOf: b[i].asOf, close: +b[i].close.toFixed(2), wvf: +z.wvf[i].toFixed(2), wvfUpper: +z.upper[i].toFixed(2), rsiMin3: +z.rsiMin3[i].toFixed(1), rsiNow: +z.rsi.at(-1).toFixed(1), sessionsAgo: b.length - 1 - i });
      break; // latest print per ticker
    }
  }
}
const asOf = Object.entries(lastDates).sort((a, b) => b[1] - a[1] || b[0].localeCompare(a[0]))[0]?.[0] ?? null;
const signals = prints.filter((p) => !asOf || p.asOf <= asOf).sort((x, y) => y.asOf.localeCompare(x.asOf) || x.rsiMin3 - y.rsiMin3);
const out = {
  asOf, scannedAt: new Date().toISOString(), method: "yahoo-1d-bottom-zone-wvf22-rsi14-v1",
  universePath: "data/fish-universe.json", universeCount, scannedCount: tickers.length - failed.length,
  config: { ...BZ, recentSessions: RECENT_SESSIONS, basis: "completed daily bar" },
  note: "Bottom Zone 🧚: Williams Vix Fix (22) above its 20-bar band (1.5σ) AND RSI(14) dipped under 35 in the last 3 bars AND close above open, within the last 5 sessions on the Canary universe. Study mark, education only. Counts as a Bullish Setups ★ timing print.",
  cacheHits, yahooFetches: tickers.length - cacheHits,
  today: signals.filter((s) => s.asOf === asOf).length,
  signals, failed,
};
writeFileSync(OUT, JSON.stringify(out, null, 2) + "\n");
console.log(`asOf ${asOf} universe ${universeCount} scanned ${out.scannedCount} prints(5d) ${signals.length} today ${out.today} failed ${failed.length} cache ${cacheHits}`);
console.log("signals:", signals.map((s) => `${s.ticker}@${s.asOf}`).join(" "));
