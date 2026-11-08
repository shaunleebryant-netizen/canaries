import assert from "node:assert/strict";
import { test } from "node:test";
import { expandSignalHistory, formatHorizonPct, type SignalHistoryPayload } from "./signalHistoryShared";

test("a missing forward close stays pending and is not shown as zero", () => {
  assert.equal(formatHorizonPct(null), "pending");
  assert.equal(formatHorizonPct(Number.NaN), "pending");
  assert.equal(formatHorizonPct(0), "+0.0%");
  const payload: SignalHistoryPayload = {
    asOf: "2026-10-23",
    windowStart: "2026-10-01",
    sessions: 1,
    markCount: 1,
    rows: [["2026-10-21", "QQQ", "f", 100, [null, 110, null]]],
    tickers: { QQQ: ["Invesco QQQ", "sector", 112, "2026-10-23", 0] },
  };
  const [row] = expandSignalHistory(payload);
  assert.equal(row.fwd[0], null);
  assert.equal(row.fwd[1], 110);
  assert.equal(formatHorizonPct(row.fwd[0] == null ? null : 0), "pending");
  const five = ((row.fwd[1]! - row.priceAtSignal) / row.priceAtSignal) * 100;
  assert.equal(formatHorizonPct(five), "+10.0%");
});
