#!/usr/bin/env node
/**
 * Canary New Highs / New Lows — daily-close extremes on the Canary universe (data/fish-universe.json).
 * Owner t775u/t776u (2026-10-26): daily close; 1Y (252) / 2Y (504) highs+lows; ATH/ATL badge only with
 * >=3y (756 bars) history; <1y history = grey "since IPO" only; fresh = no same-window extreme in the
 * prior 20 sessions. Sub Scanner only (not a ★ condition). Education only. Never invented.
 *   node scripts/scan-new-highs-lows.mjs [--limit N]
 */
import { readFileSync, writeFileSync, existsSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const UNIVERSE = join(ROOT, "data/fish-universe.json");
const OUT = join(ROOT, "data/new-highs-lows.json");
// Owner t778u: reuse the daily closes scan-fish-v3.mjs already downloaded this pack (no second Yahoo pass).
const CACHE = join(ROOT, ".cache/daily-closes");
const CACHE_MAX_AGE_MS = 18 * 3600 * 1000;
const RECENT_SESSIONS = 10; // Main Scanner condition window (setupsCore counts prints ≤14 calendar days)
function fromCache(sym) {
  const f = join(CACHE, `${sym.replace(/[^A-Za-z0-9._-]/g, "_")}.json`);
  if (!existsSync(f) || Date.now() - statSync(f).mtimeMs > CACHE_MAX_AGE_MS) return null;
  try {
    const j = JSON.parse(readFileSync(f, "utf8"));
    return { bars: j.d.map((asOf, i) => ({ asOf, close: j.c[i] })), name: null, cached: true };
  } catch { return null; }
}
const UA = "Mozilla/5.0 (compatible; CanaryDashboard/1.0; +https://canarydashboard.com)"; // same as scan-fish-v3
const Y1 = 252, Y2 = 504, Y3 = 756, FRESH = 20;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const limit = Number(process.argv[process.argv.indexOf("--limit") + 1]) || 0;

function nyDate(t) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/New_York", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(t * 1000));
}

async function fetchCloses(sym) {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(sym)}?interval=1d&period1=0&period2=${Math.floor(Date.now() / 1000)}&includePrePost=false`;
  let res = await fetch(url, { headers: { "User-Agent": UA, Accept: "application/json" } });
  for (let a = 1; res.status === 429 && a <= 3; a++) { await sleep(1500 * a); res = await fetch(url, { headers: { "User-Agent": UA, Accept: "application/json" } }); }
  if (!res.ok) return { error: `HTTP ${res.status}` };
  const r = (await res.json())?.chart?.result?.[0];
  if (!r) return { error: "no chart result" };
  const ts = r.timestamp ?? [], c = r.indicators?.quote?.[0]?.close ?? [];
  const bars = [];
  for (let i = 0; i < ts.length; i++) if (c[i] != null && !Number.isNaN(+c[i])) bars.push({ t: ts[i], close: +c[i], asOf: nyDate(ts[i]) });
  const reg = r.meta?.currentTradingPeriod?.regular, now = Date.now() / 1000;
  if (bars.length && reg && now < reg.end && bars.at(-1).t >= reg.start - 43200) bars.pop(); // completed bars only
  return { bars, name: r.meta?.shortName || r.meta?.longName || null };
}

// Is close[i] a new extreme vs the prior `win` closes (win=Infinity → all history)?
function isExt(closes, i, win, dir) {
  const from = win === Infinity ? 0 : Math.max(0, i - win);
  if (i - from < 1) return false;
  let ref = closes[from];
  for (let k = from; k < i; k++) ref = dir > 0 ? Math.max(ref, closes[k]) : Math.min(ref, closes[k]);
  return dir > 0 ? closes[i] > ref : closes[i] < ref;
}
function priorRef(closes, i, win, dir) {
  const from = win === Infinity ? 0 : Math.max(0, i - win);
  const sl = closes.slice(from, i);
  const v = dir > 0 ? Math.max(...sl) : Math.min(...sl);
  const idx = from + sl.lastIndexOf(v);
  return { v, idx };
}

function classify(bars, dir, at = bars.length - 1) {
  const closes = bars.slice(0, at + 1).map((b) => b.close), i = closes.length - 1, n = closes.length;
  let kind = null, win = null;
  if (n < Y1 + 1) {
    if (isExt(closes, i, Infinity, dir)) { kind = "sinceIpo"; win = Infinity; }
  } else if (n >= Y3 && isExt(closes, i, Infinity, dir)) { kind = dir > 0 ? "ATH" : "ATL"; win = Infinity; }
  else if (isExt(closes, i, Y2, dir)) { kind = "2Y"; win = Y2; }
  else if (isExt(closes, i, Y1, dir)) { kind = "1Y"; win = Y1; }
  if (!kind) return null;
  // Freshness: no same-window extreme in the prior FRESH sessions (tested at the 1Y level minimum, or since-IPO).
  const freshWin = kind === "sinceIpo" ? Infinity : Y1;
  for (let k = i - FRESH; k < i; k++) if (k > 0 && isExt(closes, k, freshWin, dir)) return null;
  const ref = priorRef(closes, i, win, dir);
  return {
    kind,
    close: +closes[i].toFixed(2),
    priorExtreme: +ref.v.toFixed(2),
    priorExtremeDate: bars[ref.idx].asOf,
    pctVsPrior: +(((closes[i] / ref.v) - 1) * 100).toFixed(2),
    sessionsSincePrior: i - ref.idx,
    historyBars: n,
    asOf: bars[i].asOf,
  };
}

const raw = JSON.parse(readFileSync(UNIVERSE, "utf8"));
let tickers = [...new Set((raw.tickers ?? raw.groups.flatMap((g) => g.tickers ?? [])).map((t) => String(t).trim()).filter(Boolean))];
const universeCount = tickers.length;
if (limit) tickers = tickers.slice(0, limit);
const highs = [], lows = [], failed = [], recentHighs = [];
let asOf = null, cacheHits = 0;
const lastDates = {}; // session = most common last bar date (crypto/24-7 rows can run a day ahead)
for (const sym of tickers) {
  let got = fromCache(sym);
  if (got) cacheHits++;
  else { got = await fetchCloses(sym); await sleep(120); }
  if (got.error || got.bars.length < 30) { failed.push({ ticker: sym, reason: got.error || "too few bars" }); continue; }
  const last = got.bars.at(-1).asOf; lastDates[last] = (lastDates[last] || 0) + 1;
  const h = classify(got.bars, 1); if (h) highs.push({ ticker: sym, name: got.name, ...h });
  const l = classify(got.bars, -1); if (l) lows.push({ ticker: sym, name: got.name, ...l });
  // Latest fresh new-high print in the last RECENT_SESSIONS sessions (feeds the Main Scanner condition).
  for (let k = got.bars.length - 1; k >= Math.max(0, got.bars.length - RECENT_SESSIONS); k--) {
    const r = classify(got.bars, 1, k);
    if (r) { recentHighs.push({ ticker: sym, kind: r.kind, close: r.close, pctVsPrior: r.pctVsPrior, asOf: r.asOf }); break; }
  }
}
asOf = Object.entries(lastDates).sort((a, b) => b[1] - a[1] || b[0].localeCompare(a[0]))[0]?.[0] ?? null;
// Only today's (session) prints count.
const rank = { ATH: 0, ATL: 0, "2Y": 1, "1Y": 2, sinceIpo: 3 };
const keep = (a) => a.filter((r) => r.asOf === asOf).sort((x, y) => rank[x.kind] - rank[y.kind] || Math.abs(y.pctVsPrior) - Math.abs(x.pctVsPrior));
const out = {
  asOf, scannedAt: new Date().toISOString(), method: "yahoo-1d-close-extremes-v1",
  universePath: "data/fish-universe.json", universeCount, scannedCount: tickers.length - failed.length,
  config: { y1: Y1, y2: Y2, athMinBars: Y3, freshSessions: FRESH, basis: "daily close" },
  note: "New daily-close highs/lows (ATH ≥3y history · 2Y · 1Y · since IPO <1y) on the Canary universe; fresh = no new extreme in the prior 20 sessions. Education only.",
  cacheHits, yahooFetches: tickers.length - cacheHits,
  highs: keep(highs), lows: keep(lows),
  // Main Scanner 🏔️ condition source: latest fresh new-high print per ticker within the last 10 sessions.
  recentHighs: recentHighs.sort((a, b) => b.asOf.localeCompare(a.asOf) || a.ticker.localeCompare(b.ticker)),
  failed,
};
writeFileSync(OUT, JSON.stringify(out, null, 2) + "\n");
console.log(`cache ${cacheHits}/${tickers.length} · recentHighs ${recentHighs.length}`);
console.log(`asOf ${asOf} universe ${universeCount} scanned ${out.scannedCount} highs ${out.highs.length} lows ${out.lows.length} failed ${failed.length}`);
console.log("highs:", out.highs.map((r) => `${r.ticker}(${r.kind})`).join(" "));
console.log("lows:", out.lows.map((r) => `${r.ticker}(${r.kind})`).join(" "));
