#!/usr/bin/env node
/**
 * Bodies-only bullish engulfing, unfinished-bar drops, and the Bullish Setups
 * star (daily within the session window OR weekly within the week window = one).
 */
import assert from "node:assert/strict";
import {
  isBullishEngulfing,
  trimDailyBars,
  trimWeeklyBars,
  engulfingHits,
  majorityDates,
  weekFriday,
} from "./scan-engulfing.mjs";
import { computeMainScanner, BULLISH_TIMING_IDS } from "../src/lib/setupsCore.mjs";

const bar = (open, close, extra = {}) => ({ open, close, ...extra });

assert.equal(
  isBullishEngulfing(bar(10, 8), bar(7.5, 11)),
  true,
  "green body covers the red body and is larger"
);
assert.equal(
  isBullishEngulfing(bar(10, 8), bar(8, 10)),
  false,
  "equal bodies are not a strict engulf"
);
assert.equal(
  isBullishEngulfing(bar(10, 8), bar(8.5, 12)),
  false,
  "gap above the red close is not engulfing"
);
assert.equal(
  isBullishEngulfing(bar(10, 8, { high: 15, low: 1 }), bar(7, 11, { high: 11, low: 6 })),
  true,
  "wicks are ignored"
);
assert.equal(isBullishEngulfing(bar(8, 10), bar(9, 12)), false, "prior bar must be red");
assert.equal(isBullishEngulfing(bar(10, 8), bar(9, 7)), false, "current bar must be green");
assert.equal(isBullishEngulfing(bar(10, 10), bar(9, 12)), false, "doji is not red");
assert.equal(
  isBullishEngulfing(bar(10, 8), bar(8, 10.01)),
  true,
  "equal open with a higher close is a larger body"
);
assert.equal(
  isBullishEngulfing(bar(10, 8), bar(7.5, 10)),
  true,
  "equal close with a lower open is a larger body"
);
assert.equal(
  isBullishEngulfing(bar(10, 8), bar(7, 9.5)),
  false,
  "green close must reach the red open"
);

const formingWeek = trimWeeklyBars(
  [
    { key: "2026-10-19", lastDay: "2026-10-23", open: 1, close: 1, t: 1 },
    { key: "2026-10-26", lastDay: "2026-10-28", open: 1, close: 1, t: 2 },
  ],
  { nowSec: 0, tradingPeriod: null, sessionDate: null, nyToday: "2026-10-28" }
);
assert.equal(formingWeek.length, 1);
assert.equal(formingWeek[0].key, "2026-10-19");

const closedWeek = trimWeeklyBars(
  [
    { key: "2026-10-19", lastDay: "2026-10-23", open: 1, close: 1, t: 1 },
    { key: "2026-10-26", lastDay: "2026-10-30", open: 1, close: 1, t: 2 },
  ],
  { nowSec: 0, tradingPeriod: null, sessionDate: null, nyToday: "2026-10-31" }
);
assert.equal(closedWeek.length, 2);
assert.equal(weekFriday("2026-10-26"), "2026-10-30");

const fridaySession = trimWeeklyBars(
  [
    { key: "2026-10-26", lastDay: "2026-10-30", open: 1, close: 1, t: 2 },
  ],
  {
    nowSec: 1_000,
    tradingPeriod: { regular: { start: 100, end: 5_000 } },
    sessionDate: null,
    nyToday: "2026-10-30",
  }
);
assert.equal(fridaySession.length, 0, "Friday before the close is still forming");

const mondayStamped = trimWeeklyBars(
  [
    { key: "2026-10-26", lastDay: "2026-10-26", open: 10, close: 9, t: 1 },
    { key: "2026-11-02", lastDay: "2026-11-03", open: 9, close: 8, t: 2 },
  ],
  { nowSec: 0, tradingPeriod: null, sessionDate: null, nyToday: "2026-11-04" }
);
assert.deepEqual(
  mondayStamped.map((b) => b.key),
  ["2026-10-26"],
  "Yahoo weeks are stamped Monday; a past Friday is still a completed week"
);

const pinned = trimWeeklyBars(
  [
    { key: "2026-10-19", lastDay: "2026-10-23", open: 1, close: 1, t: 1 },
    { key: "2026-10-26", lastDay: "2026-10-30", open: 1, close: 1, t: 2 },
  ],
  { nowSec: 0, tradingPeriod: null, sessionDate: "2026-10-28", nyToday: "2026-11-02" }
);
assert.deepEqual(pinned.map((b) => b.key), ["2026-10-19"]);

const daily = trimDailyBars(
  [
    { t: 10, open: 1, close: 1, asOf: "2026-10-29" },
    { t: 20, open: 1, close: 1, asOf: "2026-10-30" },
  ],
  {
    nowSec: 500,
    isCrypto: false,
    tradingPeriod: { regular: { start: 100, end: 9_000 } },
    sessionDate: null,
    nyToday: "2026-10-30",
  }
);
assert.deepEqual(daily.map((b) => b.asOf), ["2026-10-29"]);

const sessions = ["2026-10-27", "2026-10-28", "2026-10-29", "2026-10-30", "2026-11-02"];
const hits = engulfingHits(
  [
    { open: 10, close: 12, asOf: "2026-10-26" },
    { open: 12, close: 9, asOf: "2026-10-27" },
    { open: 8, close: 13, asOf: "2026-10-28" },
    { open: 13, close: 14, asOf: "2026-11-02" },
  ],
  new Set(sessions),
  (b) => b.asOf
);
assert.equal(hits.length, 1);
assert.equal(hits[0].asOf, "2026-10-28");
assert.equal(hits[0].barsSince, 1);
assert.ok(hits[0].bodyRatio > 1);
assert.ok(hits[0].pctFromClose > 0);

assert.deepEqual(
  majorityDates([
    ["2026-10-28", "2026-10-29"],
    ["2026-10-28", "2026-10-29"],
    ["2026-10-27"],
  ]).slice(-5),
  ["2026-10-28", "2026-10-29"]
);

assert.ok(BULLISH_TIMING_IDS.includes("engulf"));
assert.equal(BULLISH_TIMING_IDS.includes("engulf") && !["mfi_ob", "sweaty", "skull", "weekly_bear"].includes("engulf"), true);

const scanned = computeMainScanner({
  asOf: "2026-11-03",
  engulfing: {
    dailySessions: ["2026-10-28", "2026-10-29", "2026-10-30", "2026-10-31", "2026-11-03"],
    weeklySessions: ["2026-10-17", "2026-10-24", "2026-10-31"],
    daily: [
      { ticker: "AAA", asOf: "2026-11-03" },
      { ticker: "BBB", asOf: "2026-10-01" },
      { ticker: "OLD", asOf: "2026-10-20" },
    ],
    weekly: [
      { ticker: "AAA", asOf: "2026-10-31" },
      { ticker: "CCC", asOf: "2026-10-17" },
    ],
  },
  marketStates: [{ ticker: "AAA", state: "bull", weeksInState: 4, sinceWeek: "2026-10-06" }],
  monthly20: [{ ticker: "CCC", month: "2026-11", cross: "this_month", pctAbove: 1.2 }],
});

const aaa = scanned.bullish.find((r) => r.ticker === "AAA");
assert.ok(aaa, "engulfing plus weekly green qualifies");
assert.deepEqual(
  aaa.conditions.map((c) => c.id),
  ["engulf", "weekly_bull"]
);
const engulf = aaa.conditions.find((c) => c.id === "engulf");
assert.equal(engulf.source, "daily+weekly");
assert.equal(engulf.since, "2026-10-31");
assert.equal(aaa.count, 2);

assert.equal(scanned.bullish.some((r) => r.ticker === "BBB"), false);
assert.equal(scanned.conditionsByTicker.BBB, undefined);

const ccc = scanned.bullish.find((r) => r.ticker === "CCC");
assert.ok(ccc, "weekly engulfing is a timing print and can pair with monthly");
assert.equal(ccc.conditions.filter((c) => c.id === "engulf").length, 1);

assert.equal(scanned.bearish.some((r) => r.conditions.some((c) => c.id === "engulf")), false);

const windowed = computeMainScanner({
  asOf: "2026-10-27",
  engulfing: {
    dailySessions: ["2026-10-20", "2026-10-21", "2026-10-22", "2026-10-23", "2026-10-24", "2026-10-27"],
    weeklySessions: [],
    daily: [
      { ticker: "OLD", asOf: "2026-10-20" },
      { ticker: "NEW", asOf: "2026-10-27" },
    ],
    weekly: [],
  },
  marketStates: [
    { ticker: "OLD", state: "bull", weeksInState: 2, sinceWeek: "2026-10-13" },
    { ticker: "NEW", state: "bull", weeksInState: 2, sinceWeek: "2026-10-13" },
  ],
});
assert.equal(windowed.bullish.some((r) => r.ticker === "OLD"), false, "older than the last 5 sessions does not count");
assert.ok(windowed.bullish.some((r) => r.ticker === "NEW"));

console.log("engulfing tests ok");
