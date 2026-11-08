import assert from "node:assert/strict";
import { test } from "node:test";
import { leadersAndLaggards, monthBars, monthReturn, performanceOrder, recordedMarks } from "./etfTabPreview";
import type { SectorReturnRow } from "./etfTabPreview";

function row(partial: Partial<SectorReturnRow> & Pick<SectorReturnRow, "symbol">): SectorReturnRow {
  return {
    name: partial.symbol,
    r1d: null,
    r1w: null,
    r1m: null,
    r3m: null,
    ytd: null,
    rs1m: null,
    monthly: [],
    ranks: [],
    ...partial,
  };
}

const rows = [
  row({ symbol: "XLE", r1d: 2.6, r1w: 1, r1m: 10.75, r3m: 4, ytd: 8, rs1m: 3, monthly: [1, 10.75], ranks: [4, 1] }),
  row({ symbol: "XLK", r1d: 0.49, r1m: -5.9, monthly: [2, -5.9], ranks: [1, 11] }),
  row({ symbol: "XLP", r1d: -1.92, r1m: 8.03, monthly: [0, null], ranks: [2, 2] }),
  row({ symbol: "XLY", r1d: -1.66, r1m: 2.52, monthly: [0, 2.52], ranks: [8, 8] }),
];

test("today's leaders and laggards use the recorded day return", () => {
  const { leaders, laggards } = leadersAndLaggards(rows, 2);
  assert.deepEqual(leaders.map((r) => r.symbol), ["XLE", "XLK"]);
  assert.deepEqual(laggards.map((r) => r.symbol), ["XLP", "XLY"]);
});

test("the performance list is today, and a missing month return stays missing", () => {
  assert.deepEqual(performanceOrder(rows).map((r) => r.symbol), ["XLE", "XLK", "XLY", "XLP"]);
  assert.equal(monthReturn(rows[2]), null);
});

test("monthly bars follow this month's rank from best to worst", () => {
  assert.deepEqual(monthBars(rows).map((r) => r.symbol), ["XLE", "XLP", "XLY", "XLK"]);
});

test("signal dates come from the mark field and a missing date is left out", () => {
  assert.deepEqual(
    recordedMarks({ ticker: "XLC", signals: ["smile", "fish"], smileAsOf: "2026-10-22", fishAsOf: "2026-10-23" }),
    [
      { kind: "smile", date: "2026-10-22" },
      { kind: "fish", date: "2026-10-23" },
    ],
  );
  assert.deepEqual(recordedMarks({ ticker: "XLK", signals: ["fish"], smileAsOf: "2026-10-23" }), []);
  assert.deepEqual(recordedMarks(undefined), []);
});
