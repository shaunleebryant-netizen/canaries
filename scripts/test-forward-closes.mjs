/**
 * node scripts/test-forward-closes.mjs
 * Forward closes are later session closes, not a performance summary.
 */
import assert from "node:assert/strict";
import { forwardCloses } from "./lib/forward-closes.mjs";

const bars = Array.from({ length: 25 }, (_, i) => ({
  asOf: `2026-01-${String(i + 1).padStart(2, "0")}`,
  close: 100 + i,
}));

assert.deepEqual(forwardCloses(bars, "2026-01-01"), [105, 110, 120]);
assert.deepEqual(forwardCloses(bars, "2026-01-20"), [124, null, null]);
assert.equal(forwardCloses(bars, "2026-02-01"), null);
assert.equal(forwardCloses([], "2026-01-01"), null);

const chartBars = [
  { time: "2026-06-25", close: 275.15 },
  ...Array.from({ length: 20 }, (_, i) => ({ time: `2026-06-${26 + i}`, close: 280 + i })),
];
const fwd = forwardCloses(chartBars, "2026-06-25");
assert.equal(fwd[0], 284);
assert.equal(fwd[1], 289);
assert.equal(fwd[2], 299);

console.log("forward closes ok");
