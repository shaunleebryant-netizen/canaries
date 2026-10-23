#!/usr/bin/env node
/**
 * Weekly Market State — owner Pine ported exactly on Yahoo **weekly** (1wk) bars.
 *
 *   src = ohlc4 = (o+h+l+c)/4
 *   f  = ta.ema(src, 9)    m1 = ta.ema(src, 12)
 *   m2 = ta.ema(src, 16)   sl = ta.ema(src, 21)
 *   down = ((f < m1) != (f < sl)) or ((m2 < sl) != (f < sl))
 *   bear = not down and f < sl
 *   bull = not down and not bear
 *   Background: bull = white, bear = blue, down = black (indecision).
 *
 * ta.ema = alpha 2/(n+1), seeded with SMA of the first n values (TradingView).
 * Includes the current in-progress week (as TradingView's weekly chart does) —
 * the state can flip before the week closes.
 *
 * Writes data/market-state.json: every scanned ticker's current state and
 * weeksInState (consecutive weeks incl. current). Boxes derived at render:
 *   Weekly State  — bull/bear with weeksInState ≤ 3
 *   Bullish & Strong — all bull, sorted by weeksInState desc
 *
 * Universe = MFI Scan universe (fish ∪ ETF Watch, deduped). Fetch failures are
 * skipped and counted — never invented.
 *
 * Usage:
 *   node scripts/scan-market-state.mjs [--limit N] [--tickers SPY,QQQ] [--dry-run]
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

const OUT_NAME = "market-state.json";
const OUT_PATH = join(ROOT, "data", OUT_NAME);
const METHOD = "yahoo-1wk-market-state-ema9-12-16-21-ohlc4";
const LEN = { fast: 9, mid1: 12, mid2: 16, slow: 21 };
const RANGE = "3y";
const MIN_BARS = LEN.slow; // state defined once EMA21 exists (as on TV)

/** TradingView ta.ema: SMA seed over first n values, then alpha = 2/(n+1). */
export function emaTV(values, n) {
  const out = new Array(values.length).fill(null);
  if (values.length < n) return out;
  const alpha = 2 / (n + 1);
  let sum = 0;
  for (let i = 0; i < n; i++) sum += values[i];
  let prev = sum / n;
  out[n - 1] = prev;
  for (let i = n; i < values.length; i++) {
    prev = alpha * values[i] + (1 - alpha) * prev;
    out[i] = prev;
  }
  return out;
}

export function stateSeries(bars) {
  const src = bars.map((b) => (b.open + b.high + b.low + b.close) / 4);
  const f = emaTV(src, LEN.fast);
  const m1 = emaTV(src, LEN.mid1);
  const m2 = emaTV(src, LEN.mid2);
  const sl = emaTV(src, LEN.slow);
  const states = bars.map((_, i) => {
    if (f[i] == null || m1[i] == null || m2[i] == null || sl[i] == null) return null;
    const fLtSl = f[i] < sl[i];
    const down = (f[i] < m1[i]) !== fLtSl || (m2[i] < sl[i]) !== fLtSl;
    const bear = !down && fLtSl;
    return down ? "down" : bear ? "bear" : "bull";
  });
  return { states, f, m1, m2, sl };
}

const r2 = (x) => (x == null ? null : Number(x.toFixed(4)));

async function scanTicker(ticker) {
  const candidates = SYMBOL_CANDIDATES[ticker] ?? [ticker];
  let lastErr = "no candidates";
  for (const sym of candidates) {
    const got = await fetchPeriodBars(sym, {
      interval: "1wk",
      range: RANGE,
      minBars: MIN_BARS,
    });
    if (got.error) {
      lastErr = `${sym}: ${got.error}`;
      continue;
    }
    const { bars } = got;
    const { states, f, m1, m2, sl } = stateSeries(bars);
    const last = bars.length - 1;
    const state = states[last];
    if (!state) {
      lastErr = `${sym}: state undefined on latest week`;
      continue;
    }
    let weeks = 0;
    let i = last;
    while (i >= 0 && states[i] === state) {
      weeks += 1;
      i -= 1;
    }
    const prevState = i >= 0 ? states[i] : null;
    return {
      ok: true,
      ticker,
      yahoo: got.yahooSymbol,
      state,
      weeksInState: weeks,
      /** True when the run reaches the first defined bar (count is a floor). */
      historyCapped: prevState == null,
      prevState,
      sinceWeek: bars[last - weeks + 1].key,
      weekOf: bars[last].key,
      asOf: got.lastTradeDay,
      close: r2(bars[last].close),
      emaFast: r2(f[last]),
      emaMid1: r2(m1[last]),
      emaMid2: r2(m2[last]),
      emaSlow: r2(sl[last]),
      barsWeekly: bars.length,
      recent: states.slice(-6),
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
    `Weekly Market State · universe ${universeCount} (fish ∪ ETF Watch) · running ${tickers.length} · ${METHOD}`
  );

  let done = 0;
  const rows = await pool(tickers, 4, async (ticker) => {
    const r = await scanTicker(ticker);
    done += 1;
    if (done % 25 === 0 || !r.ok || args.tickers) {
      console.log(
        `[${done}/${tickers.length}] ${ticker} ` +
          (r.ok
            ? `${r.state} x${r.weeksInState} (prev ${r.prevState}) wk ${r.weekOf} close ${r.close} f=${r.emaFast} m1=${r.emaMid1} m2=${r.emaMid2} sl=${r.emaSlow} recent=${r.recent.join(",")}`
            : `FAIL ${r.error}`)
      );
    }
    return r;
  });

  const failed = rows.filter((r) => !r.ok).map((r) => ({ ticker: r.ticker, error: r.error }));
  const ok = rows.filter((r) => r.ok);
  let asOf = "1970-01-01";
  let weekOf = "1970-01-01";
  for (const r of ok) {
    if (r.asOf > asOf) asOf = r.asOf;
    if (r.weekOf > weekOf) weekOf = r.weekOf;
  }
  const scannedAt = nzNowIso();
  const counts = { bull: 0, bear: 0, down: 0 };
  for (const r of ok) counts[r.state] += 1;

  const states = ok
    .map(({ ok: _ok, recent: _recent, ...rest }) => rest)
    .sort((a, b) => a.ticker.localeCompare(b.ticker));

  const doc = {
    asOf: asOf === "1970-01-01" ? scannedAt.slice(0, 10) : asOf,
    weekOf,
    scannedAt,
    universeCount,
    scannedCount: ok.length,
    failed: failed.map((f) => f.ticker),
    failedDetail: failed,
    counts,
    method: METHOD,
    note:
      "Weekly Market State — owner Pine on Yahoo 1wk: ohlc4 EMAs 9/12/16/21 (TV ta.ema). bull=white, bear=blue, down=black. Current in-progress week included (can flip before week close). Universe = fish ∪ ETF Watch (deduped). Never invented.",
    states,
  };

  console.log("\n=== Weekly Market State summary ===");
  console.log(
    `universe ${universeCount}  scanned ${ok.length}  failed ${failed.length}  bull ${counts.bull}  bear ${counts.bear}  down ${counts.down}  weekOf ${weekOf}  asOf ${doc.asOf}`
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
