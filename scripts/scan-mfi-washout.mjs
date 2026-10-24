#!/usr/bin/env node
/**
 * MFI Scan (members box) — engine: MFI Washout v6.1 (owner approved t577u 2026-10-07; ships with the
 * 2026-10-08 post-close run). Pine: /home/box/canaries/pine/mfi-washout-v6.1.pine (repo copy
 * data/mfi-washout-v6.1.pine) · port: scripts/lib/mfi-washout-v6.1.mjs = the v6 signal plus two gates
 * (washout depth + a recent 🐟/🙂 from the Canary RelRSI port). Thresholds are PRIVATE.
 * ROLLBACK to plain v6: MFI_ENGINE=v6 npm run scan:mfi (v6 port kept: scripts/lib/mfi-washout-v6.mjs).
 * The old MFI zone scan (≤20 / ≥80) is retired: scripts/archive/mfi-zone-2026-10-06/.
 *
 * Yahoo daily (1d) bars, FULL history (period1=0, like scan-fish-v3): the 🐟/🙂 RelRSI needs 500+ bars,
 * and v6.1 then matches the Backtest history and the TradingView chart.
 * Completed bars only (forming session / crypto UTC candle dropped). --session-date caps bars.
 *
 * Listing rule (same shape as the old box): box rows (`signals`) = tickers whose 💵 bottomSignal
 * (signal id "mfi_os") fired on their latest completed daily bar. `prints` = every fire within the
 * last HISTORY_DAYS (14) calendar days (feeds the Main Scanner 14-day rule, as before).
 * No sell-side signal: the v6 engine has none, so the old 🍒 caution zone is gone.
 *
 * Usage: node scripts/scan-mfi-washout.mjs [--limit N] [--session-date YYYY-MM-DD] [--tickers A,B] [--dry-run] [--out path]
 */

import { join } from "node:path";
import {
  ROOT,
  SYMBOL_CANDIDATES,
  FISH_UNIVERSE_PATH,
  ETF_UNIVERSE_PATH,
  loadUniverse,
  nzNowIso,
  YAHOO_UA,
  sleep,
  pool,
  writeJson,
  mirrorData,
  parseCommonArgs,
  ymdInTz,
} from "./lib/scan-common.mjs";
import { mfiWashoutV6, MFI_WASHOUT_V6_DEFAULTS } from "./lib/mfi-washout-v6.mjs";
import { mfiWashoutV61, MFI_WASHOUT_V61_DEFAULTS } from "./lib/mfi-washout-v6.1.mjs";
import { copyFileSync, existsSync } from "node:fs";

/** v6.1 by default; MFI_ENGINE=v6 rolls back to the plain v6 signal. */
export const ENGINE = process.env.MFI_ENGINE === "v6" ? "v6" : "v6.1";
const ENGINE_LABEL = `MFI Washout ${ENGINE}`;
const runEngine = (bars) => (ENGINE === "v6" ? mfiWashoutV6(bars) : mfiWashoutV61(bars));
const ENGINE_PARAMS =
  ENGINE === "v6"
    ? MFI_WASHOUT_V6_DEFAULTS
    : { ...MFI_WASHOUT_V61_DEFAULTS, relRsi: undefined, relRsiConfig: "src/lib/canaryTopsBottomsConfig.mjs" };

const OUT_NAME = "money-flow-alerts.json";
const OUT_PATH = join(ROOT, "data", OUT_NAME);
export const METHOD = ENGINE === "v6" ? "yahoo-1d-mfi-washout-v6" : "yahoo-1d-mfi-washout-v6.1";
const RANGE = "max";
/** MFI + SMA(20) warm up quickly; the v6.1 🐟/🙂 gate simply never passes before ~500 bars. */
const MIN_BARS = 60;
const HISTORY_DAYS = 14;
const CONCURRENCY = 4;
const CRYPTO = new Set(["BTC-USD", "ETH-USD", "SOL-USD", "BNB-USD", "XRP-USD"]);

function daysBetween(a, b) {
  const [ay, am, ad] = a.split("-").map(Number);
  const [by, bm, bd] = b.split("-").map(Number);
  return Math.round((Date.UTC(ay, am - 1, ad) - Date.UTC(by, bm - 1, bd)) / 86_400_000);
}

/** Full daily history. Yahoo range=max + 1d silently returns quarterly bars, so use period1=0. */
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

export async function fetchDailyBars(symbol, { sessionDate = null } = {}) {
  const got = await yahooDailyMax(symbol);
  if (got.error) return { error: got.error };
  const result = got.data?.chart?.result?.[0];
  const err = got.data?.chart?.error;
  if (err || !result) return { error: err?.description ?? "no chart result" };
  const meta = result.meta ?? {};
  const isCrypto = CRYPTO.has(meta.symbol ?? symbol);
  const tz = isCrypto ? "UTC" : meta.exchangeTimezoneName || "America/New_York";
  const ts = result.timestamp ?? [];
  const q = result.indicators?.quote?.[0] ?? {};
  let bars = [];
  for (let i = 0; i < ts.length; i++) {
    const [t, h, l, c, v] = [ts[i], q.high?.[i], q.low?.[i], q.close?.[i], q.volume?.[i]];
    if (t == null || h == null || l == null || c == null) continue;
    if (![h, l, c].every((x) => Number.isFinite(Number(x)))) continue;
    bars.push({
      t,
      high: Number(h),
      low: Number(l),
      close: Number(c),
      volume: v == null || !Number.isFinite(Number(v)) ? 0 : Number(v),
      asOf: ymdInTz(t, tz),
    });
  }
  // Yahoo can repeat the latest day (live stamp); keep the last row per date.
  const byDate = new Map();
  for (const b of bars) byDate.set(b.asOf, b);
  bars = [...byDate.values()].sort((a, b) => a.t - b.t);
  // Completed bars only.
  const nowSec = Date.now() / 1000;
  if (bars.length) {
    const last = bars[bars.length - 1];
    if (isCrypto) {
      if (last.asOf === ymdInTz(nowSec, "UTC")) bars.pop();
    } else {
      const reg = meta.currentTradingPeriod?.regular;
      if (reg && nowSec < reg.end && last.t >= reg.start - 43200) bars.pop();
    }
  }
  if (sessionDate) bars = bars.filter((b) => b.asOf <= sessionDate);
  if (bars.length < MIN_BARS) return { error: `too few daily bars (${bars.length} < ${MIN_BARS})` };
  return { bars, yahooSymbol: meta.symbol ?? symbol };
}

async function scanTicker(ticker, sessionDate) {
  const candidates = SYMBOL_CANDIDATES[ticker] ?? [ticker];
  let lastErr = "no candidates";
  for (const sym of candidates) {
    const got = await fetchDailyBars(sym, { sessionDate });
    if (got.error) {
      lastErr = `${sym}: ${got.error}`;
      continue;
    }
    const { bars } = got;
    if (bars.slice(-20).reduce((s, b) => s + b.volume, 0) <= 0) {
      lastErr = `${sym}: no volume (MFI needs volume)`;
      continue;
    }
    const { mfi, bottomSignal } = runEngine(bars);
    const last = bars.length - 1;
    const latestAsOf = bars[last].asOf;
    const fires = [];
    for (let k = last; k >= 0; k--) {
      if (daysBetween(latestAsOf, bars[k].asOf) > HISTORY_DAYS) break;
      if (bottomSignal[k]) fires.unshift({ asOf: bars[k].asOf, mfi: Number(mfi[k].toFixed(2)) });
    }
    const recentDates = bars
      .filter((b) => daysBetween(latestAsOf, b.asOf) <= HISTORY_DAYS)
      .map((b) => b.asOf);
    return {
      ok: true,
      ticker,
      yahoo: got.yahooSymbol,
      crypto: CRYPTO.has(got.yahooSymbol),
      recentDates,
      barsDaily: bars.length,
      latestAsOf,
      latestMfi: Number.isFinite(mfi[last]) ? Number(mfi[last].toFixed(2)) : null,
      fires,
    };
  }
  return { ok: false, ticker, error: lastErr };
}

async function main() {
  const args = parseCommonArgs(process.argv);
  const oi = process.argv.indexOf("--out");
  if (oi > 0) args.out = process.argv[oi + 1];
  let tickers = args.tickers?.length ? args.tickers : loadUniverse();
  const universeCount = loadUniverse().length;
  if (args.limit > 0) tickers = tickers.slice(0, args.limit);
  console.log(
    `MFI Scan · ${ENGINE_LABEL} · universe ${universeCount} · running ${tickers.length}` +
      (args.sessionDate ? ` · session ≤ ${args.sessionDate}` : "")
  );

  let done = 0;
  const rows = await pool(tickers, CONCURRENCY, async (t) => {
    const r = await scanTicker(t, args.sessionDate);
    done += 1;
    if (!r.ok || r.fires.length || done % 25 === 0) {
      console.log(
        `[${done}/${tickers.length}] ${t} ` +
          (r.ok ? `ok 1D=${r.barsDaily} MFI=${r.latestMfi}${r.fires.length ? ` 💵 ${r.fires.map((f) => f.asOf).join(",")}` : ""}` : `FAIL ${r.error}`)
      );
    }
    return r;
  });

  const failed = [];
  const signals = [];
  const prints = [];
  let scannedCount = 0;
  let lastAsOf = "1970-01-01";
  for (const r of rows) {
    if (!r.ok) {
      failed.push({ ticker: r.ticker, error: r.error });
      continue;
    }
    scannedCount += 1;
    if (r.latestAsOf > lastAsOf) lastAsOf = r.latestAsOf;
    for (const f of r.fires) {
      prints.push({ ticker: r.ticker, signal: "mfi_os", asOf: f.asOf, timeframe: "1D", mfi: f.mfi });
    }
    const latest = r.fires[r.fires.length - 1];
    if (latest && latest.asOf === r.latestAsOf) {
      signals.push({
        ticker: r.ticker,
        signal: "mfi_os",
        asOf: latest.asOf,
        timeframe: "1D",
        mfi: latest.mfi,
        note: `💵 ${ENGINE_LABEL} fired ${latest.asOf} (MFI ${latest.mfi.toFixed(1)})`,
      });
    }
  }
  // US session calendar for the Main Scanner's "last 5 trading days" MFI rule: dates on which at
  // least half of the non-crypto tickers have a completed daily bar.
  const dateCounts = new Map();
  const equityRows = rows.filter((r) => r.ok && !r.crypto);
  for (const r of equityRows) for (const d of r.recentDates) dateCounts.set(d, (dateCounts.get(d) || 0) + 1);
  const sessionDates = [...dateCounts]
    .filter(([, c]) => c >= equityRows.length / 2)
    .map(([d]) => d)
    .sort();

  signals.sort((a, b) => (a.asOf !== b.asOf ? (a.asOf < b.asOf ? 1 : -1) : a.ticker.localeCompare(b.ticker)));

  const scannedAt = nzNowIso();
  const doc = {
    asOf: lastAsOf === "1970-01-01" ? scannedAt.slice(0, 10) : lastAsOf,
    scannedAt,
    universeCount,
    scannedCount,
    failed: failed.map((f) => f.ticker),
    failedDetail: failed,
    signals,
    historyDays: HISTORY_DAYS,
    sessionDates,
    prints,
    engine: ENGINE_LABEL,
    params: ENGINE_PARAMS,
    method: METHOD,
    note: `MFI Scan — ${ENGINE_LABEL} (owner Pine) 💵 bottomSignal on Yahoo 1d bars (full history), box = fires on the latest completed bar; prints = fires within ${HISTORY_DAYS} calendar days. Universe = fish ∪ ETF Watch (deduped). Never invented.`,
  };
  if (args.out) {
    writeJson(args.out, doc); // testing: write elsewhere, no mirror
  } else if (!args.dryRun) {
    writeJson(OUT_PATH, doc);
    mirrorData(OUT_NAME);
    for (const p of [FISH_UNIVERSE_PATH, ETF_UNIVERSE_PATH]) {
      try {
        if (existsSync(p)) copyFileSync(p, join("/home/box/canaries", p.split("/").pop()));
      } catch {}
    }
  }
  console.log(`\n=== MFI Scan (${ENGINE_LABEL}) summary ===`);
  console.log(`universe ${universeCount}  scanned ${scannedCount}  failed ${failed.length}  as-of ${doc.asOf}`);
  console.log(`💵 box rows: ${signals.length}  ·  prints in ${HISTORY_DAYS}d: ${prints.length}`);
  console.log(signals.map((s) => `${s.ticker}@${s.asOf}(${s.mfi})`).join("  "));
  if (failed.length) console.log("failed:", failed.map((f) => `${f.ticker} (${f.error})`).join(" | "));
  console.log(args.out ? `wrote ${args.out} (test)` : args.dryRun ? "dry run: nothing written" : `wrote ${OUT_PATH}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
