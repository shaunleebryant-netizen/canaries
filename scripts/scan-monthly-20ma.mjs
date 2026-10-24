#!/usr/bin/env node
/**
 * Monthly 20MA — crosses above the 20-month SMA on Yahoo **monthly** (1mo) bars.
 *
 *   sma20 = SMA(close, 20) on monthly closes
 *   "this month": current (in-progress) month close > sma20
 *                 AND prior month close <= prior-month sma20
 *   "last month": last completed month crossed (close > its sma20 and the
 *                 month before was <= its sma20) AND the current month is still
 *                 above its sma20 — so early-month runs are not empty.
 *   aboveSma20: every scanned ticker whose current month close > sma20
 *               (feeds Multi-week Warriors filter; not invented).
 *
 * Current month = Yahoo's in-progress monthly bar as of the latest session.
 * Yahoo's duplicate "live" bar is merged into its month (see scan-common).
 *
 * Universe = MFI Scan universe (fish ∪ ETF Watch, deduped). Fetch failures are
 * skipped and counted — never invented.
 *
 * Usage:
 *   node scripts/scan-monthly-20ma.mjs [--limit N] [--tickers SPY,QQQ] [--dry-run]
 */

import { join } from "node:path";
import {
  ROOT,
  SYMBOL_CANDIDATES,
  loadUniverse,
  fetchPeriodBars,
  pool,
  writeJson,
  mirrorData,
  nzNowIso,
  parseCommonArgs,
} from "./lib/scan-common.mjs";

const OUT_NAME = "monthly-20ma-alerts.json";
const OUT_PATH = join(ROOT, "data", OUT_NAME);
const METHOD = "yahoo-1mo-sma20-cross-above";
const LEN = 20;
const RANGE = "5y";
const MIN_BARS = LEN + 1; // need prior-month SMA20

function smaAt(closes, i, n) {
  if (i < n - 1) return null;
  let s = 0;
  for (let k = i - n + 1; k <= i; k++) s += closes[k];
  return s / n;
}

const r2 = (x) => (x == null ? null : Number(x.toFixed(4)));

async function scanTicker(ticker) {
  const candidates = SYMBOL_CANDIDATES[ticker] ?? [ticker];
  let lastErr = "no candidates";
  for (const sym of candidates) {
    const got = await fetchPeriodBars(sym, {
      interval: "1mo",
      range: RANGE,
      minBars: MIN_BARS,
    });
    if (got.error) {
      lastErr = `${sym}: ${got.error}`;
      continue;
    }
    const { bars } = got;
    const closes = bars.map((b) => b.close);
    const i = bars.length - 1;
    const cur = { close: closes[i], sma: smaAt(closes, i, LEN) };
    const prev = { close: closes[i - 1], sma: smaAt(closes, i - 1, LEN) };
    const prev2 =
      i - 2 >= 0 ? { close: closes[i - 2], sma: smaAt(closes, i - 2, LEN) } : null;
    let cross = null;
    if (cur.sma != null && prev.sma != null && cur.close > cur.sma && prev.close <= prev.sma) {
      cross = "this_month";
    } else if (
      prev2 &&
      prev2.sma != null &&
      prev.sma != null &&
      cur.sma != null &&
      prev.close > prev.sma &&
      prev2.close <= prev2.sma &&
      cur.close > cur.sma
    ) {
      cross = "last_month";
    }
    return {
      ok: true,
      ticker,
      yahoo: got.yahooSymbol,
      month: bars[i].key,
      asOf: got.lastTradeDay,
      barsMonthly: bars.length,
      close: cur.close,
      sma20: cur.sma,
      prevClose: prev.close,
      prevSma20: prev.sma,
      cross,
    };
  }
  return { ok: false, ticker, error: lastErr };
}

async function main() {
  const args = parseCommonArgs(process.argv);
  let tickers = args.tickers ?? loadUniverse();
  const universeCount = loadUniverse().length;
  if (args.limit > 0) tickers = tickers.slice(0, args.limit);

  console.log(
    `Monthly 20MA · universe ${universeCount} (fish ∪ ETF Watch) · running ${tickers.length} · ${METHOD}`
  );

  let done = 0;
  const rows = await pool(tickers, 4, async (ticker) => {
    const r = await scanTicker(ticker);
    done += 1;
    if (done % 25 === 0 || !r.ok || r.cross || args.tickers) {
      console.log(
        `[${done}/${tickers.length}] ${ticker} ` +
          (r.ok
            ? `${r.month} close ${r.close?.toFixed(2)} sma20 ${r.sma20?.toFixed(2)} prev ${r.prevClose?.toFixed(2)}/${r.prevSma20?.toFixed(2)}${r.cross ? ` CROSS ${r.cross}` : ""}`
            : `FAIL ${r.error}`)
      );
    }
    return r;
  });

  const failed = rows.filter((r) => !r.ok).map((r) => ({ ticker: r.ticker, error: r.error }));
  const ok = rows.filter((r) => r.ok);
  let asOf = "1970-01-01";
  let month = "1970-01";
  for (const r of ok) {
    if (r.asOf > asOf) asOf = r.asOf;
    if (r.month > month) month = r.month;
  }
  const scannedAt = nzNowIso();
  const signals = ok
    .filter((r) => r.cross)
    .map((r) => ({
      ticker: r.ticker,
      signal: "cross_above_sma20",
      cross: r.cross,
      month: r.month,
      asOf: r.asOf,
      timeframe: "1M",
      close: r2(r.close),
      sma20: r2(r.sma20),
      pctAbove: Number((((r.close - r.sma20) / r.sma20) * 100).toFixed(2)),
      prevClose: r2(r.prevClose),
      prevSma20: r2(r.prevSma20),
    }))
    .sort((a, b) => {
      if (a.cross !== b.cross) return a.cross === "this_month" ? -1 : 1;
      return a.pctAbove - b.pctAbove || a.ticker.localeCompare(b.ticker);
    });

  // Currently above 20-month SMA (close > sma20) — Multi-week Warriors membership gate.
  const aboveSma20 = ok
    .filter((r) => r.sma20 != null && r.close > r.sma20)
    .map((r) => ({
      ticker: r.ticker,
      close: r2(r.close),
      sma20: r2(r.sma20),
      pctAbove: Number((((r.close - r.sma20) / r.sma20) * 100).toFixed(2)),
      asOf: r.asOf,
      month: r.month,
    }))
    .sort((a, b) => a.ticker.localeCompare(b.ticker));

  const doc = {
    asOf: asOf === "1970-01-01" ? scannedAt.slice(0, 10) : asOf,
    month,
    scannedAt,
    universeCount,
    scannedCount: ok.length,
    failed: failed.map((f) => f.ticker),
    failedDetail: failed,
    method: METHOD,
    note:
      "Monthly 20MA — Yahoo 1mo closes vs SMA20 of monthly close. Cross above on the current (in-progress) month, or on the last completed month while the current month is still above. aboveSma20 = every scanned name currently close > sma20 (Multi-week Warriors filter). Universe = fish ∪ ETF Watch (deduped). Never invented.",
    signals,
    aboveSma20,
  };

  console.log("\n=== Monthly 20MA summary ===");
  console.log(
    `universe ${universeCount}  scanned ${ok.length}  failed ${failed.length}  hits ${signals.length} (this month ${signals.filter((s) => s.cross === "this_month").length}, last month ${signals.filter((s) => s.cross === "last_month").length})  aboveSma20 ${aboveSma20.length}  month ${month}  asOf ${doc.asOf}`
  );
  if (failed.length) {
    console.log("failed:", failed.map((f) => `${f.ticker} (${f.error})`).join(" | "));
  }
  if (args.dryRun) {
    console.log("dry run — not written");
    return;
  }
  writeJson(OUT_PATH, doc);
  mirrorData(OUT_NAME);
  console.log(`wrote ${OUT_PATH}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
