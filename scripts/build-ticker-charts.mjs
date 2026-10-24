#!/usr/bin/env node
/**
 * Ticker lightbox chart data (owner t581u, approved t583s2392 2026-10-08). Runs in the post-close pack
 * as step 8d (refresh-full-pack.mjs), NON-FATAL.
 *
 * One small JSON per ticker: ~12 months of daily OHLCV + our marks on those bars, computed with the
 * SAME engine ports the scanner boxes use, on full daily history (RelRSI needs 500+ bars):
 *   🐟 fish · 🙂 smile · 🥵 exhaustion (sweaty) · 💀 skull — src/lib/canaryTopsBottoms.mjs (Fish /
 *      Sweaty / Sector ETFs / Countries / Crypto boxes, TradingView "Canary RelRSI")
 *   💵 mfi — scripts/lib/mfi-washout-v6.1.mjs (MFI Scan box; stocks + Sector ETFs only, like the box)
 *   📈 m20 — monthly close crosses above its 20-month SMA (Monthly 20MA scan / Bullish Setups 📈),
 *      placed on the first daily close in that month that is above the month's SMA20.
 * Thresholds never leave the server: files hold dates + kinds only.
 *
 * Output: public/_chartdata/<KEY>.json (KEY = ticker with anything outside [A-Z0-9.-] → "_") and
 * public/_chartdata/index.json. These are fetched by the members lightbox via the members-guarded
 * /api/members/chart/[ticker] route (ASSETS binding). Direct public hits are blocked: wrangler.jsonc
 * assets.run_worker_first ["/_chartdata/*"] sends them to worker-entry.mjs, which answers 404.
 * Safety: if > 20% of fetches fail nothing is written (exit 1); otherwise only successful tickers are
 * replaced (atomic per file) and failed tickers keep their previous file.
 *
 * Usage: node scripts/build-ticker-charts.mjs [--tickers SPOT,APP] [--limit N] [--months 12]
 *        [--out-dir path] [--session-date YYYY-MM-DD]
 */
import { mkdirSync, readFileSync, renameSync, unlinkSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { runCanaryTopsBottoms } from "../src/lib/canaryTopsBottoms.mjs";
import { CANARY_TOPS_BOTTOMS, CANARY_TOPS_BOTTOMS_VERSION } from "../src/lib/canaryTopsBottomsConfig.mjs";
import { mfiWashoutV61 } from "./lib/mfi-washout-v6.1.mjs";
import { ROOT, YAHOO_UA, sleep, pool, nzNowIso } from "./lib/scan-common.mjs";

export const CHART_DATA_VERSION = 1;
const YMD_FMT = new Map();
function ymdInTz(unixSec, timeZone) {
  let f = YMD_FMT.get(timeZone);
  if (!f) {
    f = new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" });
    YMD_FMT.set(timeZone, f);
  }
  return f.format(new Date(unixSec * 1000));
}
// Same Yahoo symbol map as scan-fish-v3.mjs / update-signal-history.mjs.
const SYMBOL_CANDIDATES = {
  BTCUSD: ["BTC-USD"], ETHUSD: ["ETH-USD"], SOLUSD: ["SOL-USD"], BNBUSD: ["BNB-USD"], XRPUSD: ["XRP-USD"],
  TRXUSD: ["TRX-USD"], FIGRHELOCUSD: ["FIGRHELOC-USD"], ZECUSD: ["ZEC-USD"], HYPEUSD: ["HYPE32196-USD", "HYPE-USD"],
  DOGEUSD: ["DOGE-USD"], LINKUSD: ["LINK-USD"], XMRUSD: ["XMR-USD"], WBTUSD: ["WBT-USD"], ADAUSD: ["ADA-USD"],
  LEOUSD: ["LEO-USD"], RAINUSD: ["RAIN38341-USD", "RAIN-USD"], XLMUSD: ["XLM-USD"], NEARUSD: ["NEAR-USD"],
  BCHUSD: ["BCH-USD"], UNIUSD: ["UNI7083-USD", "UNI-USD"], DIMEUSD: ["DIME39656-USD", "DIME-USD"],
  TOTAL: ["TOTAL", "TOTAL.D", "^CMC200"], XAUUSD: ["GC=F", "XAUUSD=X"], XAGUSD: ["SI=F", "XAGUSD=X"],
  SPX: ["^GSPC"], SP600: ["^SP600"],
};

export const chartKey = (ticker) => String(ticker).toUpperCase().replace(/[^A-Z0-9.-]/g, "_");

function parseArgs(argv) {
  const o = { tickers: null, limit: 0, months: 12, outDir: join(ROOT, "public/_chartdata"), sessionDate: null };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--tickers") o.tickers = argv[++i].split(",").map((s) => s.trim().toUpperCase()).filter(Boolean);
    else if (a === "--limit") o.limit = Number(argv[++i]);
    else if (a === "--months") o.months = Number(argv[++i]);
    else if (a === "--out-dir") o.outDir = argv[++i];
    else if (a === "--session-date") o.sessionDate = argv[++i];
  }
  return o;
}

const readU = (f) => {
  const d = JSON.parse(readFileSync(join(ROOT, "data", f), "utf8"));
  const t = Array.isArray(d.tickers) && d.tickers.length ? d.tickers : (d.groups || []).flatMap((g) => g.tickers || []);
  return { tickers: [...new Set(t)], names: d.names || {} };
};

async function yahooDailyMax(symbol) {
  const url =
    `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}` +
    `?interval=1d&period1=0&period2=${Math.floor(Date.now() / 1000)}&includePrePost=false`;
  const opts = { headers: { "User-Agent": YAHOO_UA, Accept: "application/json" } };
  let res = await fetch(url, opts);
  if (res.status === 429) {
    await sleep(1500);
    res = await fetch(url, opts);
  }
  if (!res.ok) return { error: `HTTP ${res.status}` };
  return { data: await res.json() };
}

/** Completed daily bars, same rules as scan-fish-v3.mjs / update-signal-history.mjs. */
async function fetchBars(symbol, sessionDate) {
  let got;
  try {
    got = await yahooDailyMax(symbol);
  } catch (e) {
    return { error: e instanceof Error ? e.message : String(e) };
  }
  if (got.error) return { error: got.error };
  const r = got.data?.chart?.result?.[0];
  if (!r) return { error: got.data?.chart?.error?.description || "no result" };
  const meta = r.meta || {};
  const isCrypto = String(meta.instrumentType || "").toUpperCase() === "CRYPTOCURRENCY";
  const tz = isCrypto ? "UTC" : "America/New_York";
  const q = r.indicators?.quote?.[0] || {};
  const byDate = new Map();
  (r.timestamp || []).forEach((t, i) => {
    const [o, h, l, c, v] = [q.open?.[i], q.high?.[i], q.low?.[i], q.close?.[i], q.volume?.[i]];
    if (t == null || o == null || h == null || l == null || c == null) return;
    if (![o, h, l, c].every((x) => Number.isFinite(Number(x)))) return;
    const asOf = ymdInTz(t, tz);
    byDate.set(asOf, { t, open: +o, high: +h, low: +l, close: +c, volume: v == null ? null : +v, asOf });
  });
  let bars = [...byDate.values()].sort((a, b) => a.t - b.t);
  const now = Date.now() / 1000;
  if (bars.length) {
    const last = bars[bars.length - 1];
    if (isCrypto) {
      if (last.asOf === ymdInTz(now, "UTC")) bars.pop();
    } else {
      const reg = meta.currentTradingPeriod?.regular;
      if (reg && now < reg.end && last.t >= reg.start - 43200) bars.pop();
    }
  }
  if (sessionDate) bars = bars.filter((b) => b.asOf <= sessionDate);
  if (bars.length < 70) return { error: `too few bars (${bars.length})` };
  return { bars, name: meta.longName || meta.shortName || null, yahoo: meta.symbol || symbol, isCrypto, currency: meta.currency || null };
}

/** 📈 marks: month close crosses above SMA20 of monthly closes; placed on the first daily close above. */
function monthly20Marks(bars) {
  const months = []; // { ym, first, last } bar indices
  for (let i = 0; i < bars.length; i++) {
    const ym = bars[i].asOf.slice(0, 7);
    if (!months.length || months[months.length - 1].ym !== ym) months.push({ ym, first: i, last: i });
    else months[months.length - 1].last = i;
  }
  const closes = months.map((m) => bars[m.last].close);
  const out = [];
  for (let k = 20; k < months.length; k++) {
    const prevSma = closes.slice(k - 20, k).reduce((s, x) => s + x, 0) / 20;
    if (!(closes[k - 1] <= prevSma)) continue;
    const base = closes.slice(k - 19, k).reduce((s, x) => s + x, 0); // 19 prior closes
    for (let i = months[k].first; i <= months[k].last; i++) {
      // month-to-date: this day's close stands in for the month close
      if (bars[i].close > (base + bars[i].close) / 20) {
        out.push(i);
        break;
      }
    }
  }
  return out;
}

const r6 = (x) => (x == null || !Number.isFinite(x) ? null : Number(x.toPrecision(6)));
const day = (ymd) => Math.round(Date.parse(`${ymd}T00:00:00Z`) / 86400000);

export function buildChartDoc(ticker, got, { months = 12, mfi = true } = {}) {
  const { bars } = got;
  const startYmd = (() => {
    const d = new Date(`${bars[bars.length - 1].asOf}T00:00:00Z`);
    d.setUTCMonth(d.getUTCMonth() - months);
    return d.toISOString().slice(0, 10);
  })();
  const from = Math.max(0, bars.findIndex((b) => b.asOf >= startYmd));
  const marks = [];
  const { events } = runCanaryTopsBottoms(bars, CANARY_TOPS_BOTTOMS);
  for (const e of events) if (e.i >= from) marks.push([e.i, e.kind === "exhaustion" ? "sweat" : e.kind]);
  const hasVolume = bars.slice(-20).some((b) => (b.volume || 0) > 0);
  if (mfi && hasVolume) mfiWashoutV61(bars).bottomSignal.forEach((s, i) => s && i >= from && marks.push([i, "mfi"]));
  for (const i of monthly20Marks(bars)) if (i >= from) marks.push([i, "m20"]);
  marks.sort((a, b) => a[0] - b[0]);
  const win = bars.slice(from);
  const d0 = day(win[0].asOf);
  return {
    v: CHART_DATA_VERSION,
    t: ticker,
    name: got.name,
    yahoo: got.yahoo,
    currency: got.currency,
    asOf: win[win.length - 1].asOf,
    engines: { relRsi: CANARY_TOPS_BOTTOMS_VERSION, mfi: mfi && hasVolume ? "v6.1" : null, m20: "sma20-monthly-cross" },
    // bars: [dayOffset from d0, open, high, low, close, volume]; d0 = days since 1970-01-01 (UTC)
    d0,
    b: win.map((b) => [day(b.asOf) - d0, r6(b.open), r6(b.high), r6(b.low), r6(b.close), hasVolume && b.volume != null ? Number(b.volume.toPrecision(3)) : null]),
    // marks: [dayOffset, kind]  kind ∈ fish | smile | mfi | sweat | skull | m20
    m: marks.map(([i, k]) => [day(bars[i].asOf) - d0, k]),
  };
}

function writeAtomic(path, obj) {
  writeFileSync(`${path}.tmp`, JSON.stringify(obj));
  renameSync(`${path}.tmp`, path);
}

async function main() {
  const a = parseArgs(process.argv);
  const universes = [
    ["stock", readU("fish-universe.json"), true],
    ["sector", readU("etf-watch-universe.json"), true],
    ["country", readU("etf-country-universe.json"), false],
    ["crypto", readU("crypto-watch-universe.json"), false],
  ];
  const jobs = [];
  const seen = new Set();
  for (const [g, u, mfi] of universes) {
    for (const t of u.tickers) {
      if (seen.has(t)) continue;
      seen.add(t);
      jobs.push({ t, g, mfi });
    }
  }
  let list = a.tickers ? a.tickers.map((t) => jobs.find((j) => j.t === t) || { t, g: "other", mfi: false }) : jobs;
  if (a.limit) list = list.slice(0, a.limit);
  mkdirSync(a.outDir, { recursive: true });
  console.log(`Ticker charts · ${list.length} tickers · ${a.months} months → ${a.outDir}`);
  const results = await pool(list, 4, async (job) => {
    let err = "no candidates";
    for (const sym of SYMBOL_CANDIDATES[job.t] || [job.t]) {
      const got = await fetchBars(sym, a.sessionDate);
      if (got.error) {
        err = `${sym}: ${got.error}`;
        continue;
      }
      const doc = buildChartDoc(job.t, got, { months: a.months, mfi: job.mfi });
      return { ok: true, t: job.t, g: job.g, doc };
    }
    return { ok: false, t: job.t, err };
  }, 120);
  const ok = results.filter((r) => r.ok);
  const failed = results.filter((r) => !r.ok);
  if (failed.length / Math.max(1, results.length) > 0.2) {
    console.error(`ABORT: ${failed.length}/${results.length} fetches failed (> 20%). Previous chart files kept.`);
    for (const f of failed.slice(0, 10)) console.error(`failed: ${f.t} (${f.err})`);
    process.exit(1);
  }
  let bytes = 0;
  const indexPath = join(a.outDir, "index.json");
  let index = {};
  try {
    index = JSON.parse(readFileSync(indexPath, "utf8")).tickers ?? {};
  } catch {
    index = {};
  }
  // Drop tickers that left every universe (e.g. owner 2026-10-09 Countries trim) so no stale chart
  // files stay in the index/assets. Only on full runs (a --tickers/--limit run is partial).
  if (!a.tickers && !a.limit) {
    const current = new Set(results.map((r) => r.t));
    for (const [t, m] of Object.entries(index)) {
      if (current.has(t)) continue;
      delete index[t];
      try {
        unlinkSync(join(a.outDir, `${m.k ?? chartKey(t)}.json`));
      } catch {
        /* already gone */
      }
      console.log(`pruned: ${t} (left universe)`);
    }
  }
  for (const r of ok) {
    const key = chartKey(r.t);
    writeAtomic(join(a.outDir, `${key}.json`), r.doc);
    bytes += Buffer.byteLength(JSON.stringify(r.doc));
    index[r.t] = { k: key, g: r.g, asOf: r.doc.asOf, n: r.doc.b.length, marks: r.doc.m.length };
  }
  writeAtomic(indexPath, { v: CHART_DATA_VERSION, builtAt: nzNowIso(), months: a.months, tickers: index });
  console.log(`ok ${ok.length} · failed ${failed.length} · total ${(bytes / 1024).toFixed(0)} KB · avg ${(bytes / Math.max(1, ok.length) / 1024).toFixed(1)} KB`);
  for (const f of failed) console.log(`failed: ${f.t} (${f.err})`);
}

if (process.argv[1] && import.meta.url === new URL(`file://${process.argv[1]}`).href) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
