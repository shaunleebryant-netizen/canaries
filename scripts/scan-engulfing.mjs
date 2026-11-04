#!/usr/bin/env node
/**
 * Bullish Engulfing — classic bodies-only pattern on completed Yahoo bars.
 *
 * Daily and weekly, one file. Universe = data/fish-universe.json (all tickers).
 *
 * A hit needs two consecutive completed bars:
 *   prior bar red  (close < open)
 *   latest bar green (close > open)
 *   green open ≤ red close
 *   green close ≥ red open
 *   green body strictly larger than the red body
 * Wicks are ignored. There is no prior-downtrend filter.
 *
 * Unfinished bars are dropped. Daily: the in-progress session (same idea as
 * Fish / MFI). Weekly: the forming week until Friday's regular close.
 *
 * The file keeps recent hits only: the last 5 completed daily sessions and the
 * last 3 completed weeks (majority calendar across the names that scanned).
 * asOf is the last completed daily session. weeklyAsOf is the Friday of the
 * last completed week.
 *
 * Usage:
 *   node scripts/scan-engulfing.mjs [--limit N] [--tickers AAPL,MSFT]
 *       [--session-date YYYY-MM-DD] [--dry-run]
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import {
  ROOT,
  FISH_UNIVERSE_PATH,
  SYMBOL_CANDIDATES,
  yahooChart,
  fetchPeriodBars,
  ymdInTz,
  pool,
  writeJson,
  mirrorData,
  nzNowIso,
  parseCommonArgs,
} from "./lib/scan-common.mjs";

const OUT_NAME = "engulfing-alerts.json";
const OUT_PATH = join(ROOT, "data", OUT_NAME);
export const METHOD = "yahoo-1d-1wk-bullish-engulfing-bodies";
export const DAILY_SESSIONS = 5;
export const WEEKLY_WEEKS = 3;
const CONCURRENCY = 4;

function addDays(ymd, n) {
  const [y, m, d] = ymd.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + n, 12));
  return dt.toISOString().slice(0, 10);
}

export function weekFriday(mondayKey) {
  return addDays(mondayKey, 4);
}

function minutesInTz(unixSec, timeZone) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(unixSec * 1000));
  const h = Number(parts.find((p) => p.type === "hour")?.value);
  const m = Number(parts.find((p) => p.type === "minute")?.value);
  return h * 60 + m;
}

function rPrice(x) {
  if (!Number.isFinite(x)) return null;
  return Number(x.toFixed(Math.abs(x) >= 1 ? 2 : 4));
}
function rPct(x) {
  return Number.isFinite(x) ? Number(x.toFixed(2)) : null;
}
function rRatio(x) {
  return Number.isFinite(x) ? Number(x.toFixed(2)) : null;
}

/** Classic bodies-only bullish engulfing. Wicks are not read. */
export function isBullishEngulfing(prev, curr) {
  if (!prev || !curr) return false;
  const po = Number(prev.open);
  const pc = Number(prev.close);
  const co = Number(curr.open);
  const cc = Number(curr.close);
  if (![po, pc, co, cc].every(Number.isFinite)) return false;
  const red = po - pc;
  const green = cc - co;
  if (!(pc < po)) return false;
  if (!(cc > co)) return false;
  if (!(co <= pc)) return false;
  if (!(cc >= po)) return false;
  if (!(green > red)) return false;
  return true;
}

/**
 * Drop the in-progress daily session. `sessionDate` also drops anything after
 * that closed session (pack pin).
 */
export function trimDailyBars(bars, { nowSec, isCrypto, tradingPeriod, sessionDate, nyToday }) {
  const byDate = new Map();
  for (const b of bars) byDate.set(b.asOf, b);
  let out = [...byDate.values()].sort((a, b) => a.t - b.t);
  if (out.length) {
    const last = out[out.length - 1];
    let drop = false;
    if (isCrypto) {
      drop = last.asOf === ymdInTz(nowSec, "UTC");
    } else {
      const reg = tradingPeriod?.regular;
      if (reg && nowSec < reg.end && last.t >= reg.start - 43200) drop = true;
      else if (
        !reg &&
        nyToday &&
        last.asOf === nyToday &&
        minutesInTz(nowSec, "America/New_York") < 16 * 60 + 5
      ) {
        drop = true;
      }
    }
    if (drop) out.pop();
  }
  if (sessionDate) out = out.filter((b) => b.asOf <= sessionDate);
  return out;
}

/**
 * True when this week has not had Friday's regular close yet.
 * Yahoo stamps 1wk bars on Monday, so lastDay is not the Friday of the week.
 * A week whose Friday is still ahead is forming. On that Friday, the regular
 * session has to be over. A Friday already in the past is complete.
 */
export function weekStillForming({ nowSec, tradingPeriod, nyToday, friday }) {
  if (nyToday && nyToday < friday) return true;
  if (nyToday && nyToday > friday) return false;
  const reg = tradingPeriod?.regular;
  if (reg) return nowSec < reg.end;
  if (!nowSec) return false;
  return minutesInTz(nowSec, "America/New_York") < 16 * 60 + 5;
}

/** Drop the forming week (and any week whose Friday is after sessionDate). */
export function trimWeeklyBars(bars, { nowSec, tradingPeriod, sessionDate, nyToday }) {
  const out = bars.slice();
  while (out.length) {
    const last = out[out.length - 1];
    const friday = weekFriday(last.key);
    const forming = weekStillForming({ nowSec, tradingPeriod, nyToday, friday });
    if (forming || (sessionDate && friday > sessionDate)) out.pop();
    else break;
  }
  return out;
}

/**
 * Engulfing bars whose mark date is in `windowSet`.
 * `dateOf(bar)` is the mark date (daily session, or Friday of the week).
 */
export function engulfingHits(bars, windowSet, dateOf) {
  const hits = [];
  if (!bars || bars.length < 2 || !windowSet?.size) return hits;
  const latestClose = bars[bars.length - 1].close;
  for (let i = 1; i < bars.length; i++) {
    const prev = bars[i - 1];
    const cur = bars[i];
    if (!isBullishEngulfing(prev, cur)) continue;
    const asOf = dateOf(cur);
    if (!windowSet.has(asOf)) continue;
    const red = prev.open - prev.close;
    const green = cur.close - cur.open;
    if (!(red > 0) || !(latestClose > 0)) continue;
    hits.push({
      asOf,
      barsSince: bars.length - 1 - i,
      close: rPrice(cur.close),
      pctFromClose: rPct(((latestClose - cur.close) / cur.close) * 100),
      bodyRatio: rRatio(green / red),
    });
  }
  return hits;
}

/** Dates present on at least half of the scanned names, oldest first. */
export function majorityDates(dateLists, minFrac = 0.5) {
  const lists = dateLists.filter((xs) => xs && xs.length);
  if (!lists.length) return [];
  const counts = new Map();
  for (const xs of lists) {
    for (const d of new Set(xs)) counts.set(d, (counts.get(d) || 0) + 1);
  }
  const need = lists.length * minFrac;
  return [...counts.entries()]
    .filter(([, c]) => c >= need)
    .map(([d]) => d)
    .sort();
}

export function loadFishUniverse(path = FISH_UNIVERSE_PATH) {
  const raw = JSON.parse(readFileSync(path, "utf8"));
  let tickers = Array.isArray(raw.tickers) ? raw.tickers : [];
  if (!tickers.length && Array.isArray(raw.groups)) {
    tickers = raw.groups.flatMap((g) => (Array.isArray(g?.tickers) ? g.tickers : []));
  }
  return [...new Set(tickers.map((t) => String(t).trim()).filter(Boolean))];
}

function candidatesFor(ticker) {
  const mapped = SYMBOL_CANDIDATES[ticker];
  if (mapped) return mapped;
  const dash = ticker.replace(/\./g, "-");
  return dash === ticker ? [ticker] : [dash, ticker];
}

async function fetchDaily(symbol) {
  const got = await yahooChart(symbol, { interval: "1d", range: "6mo" });
  if (got.error) return { error: got.error };
  const root = got.data;
  const err = root?.chart?.error;
  const result = root?.chart?.result?.[0];
  if (err || !result) return { error: err?.description ?? "no chart result" };
  const meta = result.meta ?? {};
  const tz = meta.exchangeTimezoneName || "America/New_York";
  const isCrypto = String(meta.instrumentType || "").toUpperCase() === "CRYPTOCURRENCY";
  const ts = result.timestamp ?? [];
  const q = result.indicators?.quote?.[0] ?? {};
  const bars = [];
  for (let i = 0; i < ts.length; i++) {
    const t = ts[i];
    const o = q.open?.[i];
    const c = q.close?.[i];
    if (t == null || o == null || c == null) continue;
    if (![o, c].every((x) => Number.isFinite(Number(x)))) continue;
    bars.push({
      t,
      open: Number(o),
      close: Number(c),
      asOf: ymdInTz(t, isCrypto ? "UTC" : tz),
    });
  }
  if (bars.length < 2) return { error: `too few daily bars (${bars.length})` };
  return {
    bars,
    isCrypto,
    currentTradingPeriod: meta.currentTradingPeriod ?? null,
    yahooSymbol: meta.symbol ?? symbol,
  };
}

async function fetchSide(ticker, kind) {
  let lastErr = "no candidates";
  for (const sym of candidatesFor(ticker)) {
    try {
      const got =
        kind === "daily"
          ? await fetchDaily(sym)
          : await fetchPeriodBars(sym, { interval: "1wk", range: "2y", minBars: 2 });
      if (got.error) {
        lastErr = `${sym}: ${got.error}`;
        continue;
      }
      return { ok: true, ...got };
    } catch (e) {
      lastErr = `${sym}: ${e instanceof Error ? e.message : e}`;
    }
  }
  return { ok: false, error: lastErr };
}

async function scanTicker(ticker, ctx) {
  const [daily, weekly] = await Promise.all([fetchSide(ticker, "daily"), fetchSide(ticker, "weekly")]);
  const dailyBars = daily.ok
    ? trimDailyBars(daily.bars, {
        nowSec: ctx.nowSec,
        isCrypto: daily.isCrypto,
        tradingPeriod: daily.currentTradingPeriod,
        sessionDate: ctx.sessionDate,
        nyToday: ctx.nyToday,
      })
    : null;
  const weeklyBars = weekly.ok
    ? trimWeeklyBars(weekly.bars, {
        nowSec: ctx.nowSec,
        tradingPeriod: weekly.currentTradingPeriod,
        sessionDate: ctx.sessionDate,
        nyToday: ctx.nyToday,
      })
    : null;
  const ok = Boolean(dailyBars?.length) || Boolean(weeklyBars?.length);
  return {
    ok,
    ticker,
    dailyBars: dailyBars?.length ? dailyBars : null,
    weeklyBars: weeklyBars?.length ? weeklyBars : null,
    dailyError: daily.ok ? null : daily.error,
    weeklyError: weekly.ok ? null : weekly.error,
  };
}

function withTicker(ticker, hits, timeframe) {
  return hits.map((h) => ({ ticker, timeframe, ...h }));
}

async function main() {
  const args = parseCommonArgs(process.argv);
  let tickers = args.tickers ?? loadFishUniverse();
  const universeCount = loadFishUniverse().length;
  if (args.limit > 0) tickers = tickers.slice(0, args.limit);
  const nowSec = Date.now() / 1000;
  const nyToday = ymdInTz(nowSec, "America/New_York");
  const ctx = { nowSec, nyToday, sessionDate: args.sessionDate };

  console.log(
    `Bullish Engulfing · universe ${universeCount} (fish) · running ${tickers.length} · ${METHOD}` +
      (args.sessionDate ? ` · session ≤ ${args.sessionDate}` : "")
  );

  let done = 0;
  const rows = await pool(tickers, CONCURRENCY, async (ticker) => {
    const r = await scanTicker(ticker, ctx);
    done += 1;
    if (done % 25 === 0 || !r.ok) {
      console.log(
        `[${done}/${tickers.length}] ${ticker} ` +
          (r.ok
            ? `daily ${r.dailyBars?.length ?? 0} · weekly ${r.weeklyBars?.length ?? 0}`
            : `FAIL ${r.dailyError || ""} ${r.weeklyError || ""}`.trim())
      );
    }
    return r;
  });

  const scanned = rows.filter((r) => r.ok);
  const failed = rows.filter((r) => !r.ok);
  const dailyLists = scanned.filter((r) => r.dailyBars).map((r) => r.dailyBars.map((b) => b.asOf));
  const weeklyLists = scanned
    .filter((r) => r.weeklyBars)
    .map((r) => r.weeklyBars.map((b) => weekFriday(b.key)));
  const dailySessions = majorityDates(dailyLists).slice(-DAILY_SESSIONS);
  const weeklySessions = majorityDates(weeklyLists).slice(-WEEKLY_WEEKS);
  const dailySet = new Set(dailySessions);
  const weeklySet = new Set(weeklySessions);

  const daily = [];
  const weekly = [];
  for (const r of scanned) {
    if (r.dailyBars) {
      daily.push(
        ...withTicker(r.ticker, engulfingHits(r.dailyBars, dailySet, (b) => b.asOf), "1D")
      );
    }
    if (r.weeklyBars) {
      weekly.push(
        ...withTicker(r.ticker, engulfingHits(r.weeklyBars, weeklySet, (b) => weekFriday(b.key)), "1W")
      );
    }
  }
  const byFreshness = (a, b) =>
    (a.asOf !== b.asOf ? (a.asOf < b.asOf ? 1 : -1) : a.ticker.localeCompare(b.ticker));
  daily.sort(byFreshness);
  weekly.sort(byFreshness);

  const scannedAt = nzNowIso();
  const asOf = dailySessions.length ? dailySessions[dailySessions.length - 1] : null;
  const weeklyAsOf = weeklySessions.length ? weeklySessions[weeklySessions.length - 1] : null;
  const doc = {
    asOf,
    weeklyAsOf,
    scannedAt,
    universeCount,
    scannedCount: scanned.length,
    failed: failed.map((r) => r.ticker),
    failedDetail: failed.map((r) => ({
      ticker: r.ticker,
      daily: r.dailyError,
      weekly: r.weeklyError,
    })),
    method: METHOD,
    dailySessions,
    weeklySessions,
    note:
      "Bullish engulfing — bodies only, on completed Yahoo bars. Prior bar red (close < open), latest bar green (close > open), green open ≤ red close, green close ≥ red open, green body strictly larger than the red body. Wicks ignored. No prior-downtrend filter. Daily drops the in-progress session; weekly drops the forming week until Friday's close. daily = hits in the last 5 completed sessions; weekly = hits in the last 3 completed weeks. asOf = last completed session; weeklyAsOf = Friday of the last completed week. Universe = fish-universe.json. Never invented.",
    daily,
    weekly,
  };

  console.log("\n=== Bullish Engulfing summary ===");
  console.log(
    `universe ${universeCount}  scanned ${scanned.length}  failed ${failed.length}  daily hits ${daily.length}  weekly hits ${weekly.length}  asOf ${asOf}  weeklyAsOf ${weeklyAsOf}`
  );
  if (dailySessions.length) console.log(`daily sessions: ${dailySessions.join(", ")}`);
  if (weeklySessions.length) console.log(`weekly Fridays: ${weeklySessions.join(", ")}`);
  if (failed.length) {
    console.log(
      "failed:",
      failed
        .slice(0, 12)
        .map((r) => `${r.ticker} (${r.dailyError || r.weeklyError})`)
        .join(" | ")
    );
  }

  if (!scanned.length && tickers.length) {
    console.error("No tickers scanned — file left unchanged.");
    process.exit(1);
  }
  if (args.dryRun) {
    console.log("dry run — not written");
    return;
  }
  writeJson(OUT_PATH, doc);
  mirrorData(OUT_NAME);
  console.log(`wrote ${OUT_PATH}`);
}

const invoked =
  process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (invoked) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
