import assert from "node:assert/strict";
import { test } from "node:test";
import {
  DEFAULT_CHART_LAYERS,
  hoverReadoutMarks,
  latestVisibleMarks,
  parseChartLayers,
  vannaStatusForYmd,
  type MarkKind,
} from "./chartLayers";

const MARKS: Record<MarkKind, { emoji: string; label: string }> = {
  fish: { emoji: "🐟", label: "Fish" },
  smile: { emoji: "🙂", label: "Smiley" },
  mfi: { emoji: "💵", label: "MFI washout" },
  m20: { emoji: "📈", label: "Monthly trend turned up" },
  fairy: { emoji: "🧚", label: "Bottom Zone" },
  sweat: { emoji: "🥵", label: "Sweaty" },
  skull: { emoji: "💀", label: "Skull" },
};

test("event marks default on and Vanna & Charm defaults off", () => {
  assert.deepEqual(DEFAULT_CHART_LAYERS, {
    fish: true,
    smile: true,
    mfi: true,
    fairy: true,
    m20: true,
    sweat: true,
    skull: true,
    vanna: false,
  });
});

test("stored layers keep unknown keys out and fill missing ones from the defaults", () => {
  const layers = parseChartLayers({ fish: false, vanna: true, unknown: true, fairy: true, mfi: "yes" });
  assert.equal(layers.fish, false);
  assert.equal(layers.vanna, true);
  assert.equal(layers.fairy, true);
  assert.equal(layers.mfi, true);
  assert.equal(layers.smile, true);
  assert.equal("unknown" in layers, false);
});

test("latest row and hover drop marks the member turned off", () => {
  const layers = { ...DEFAULT_CHART_LAYERS, fish: false, smile: false };
  const latest = latestVisibleMarks(
    [
      [10, "fish"],
      [12, "smile"],
      [20, "sweat"],
      [30, "fish"],
      [40, "mfi"],
    ],
    layers
  );
  assert.deepEqual(latest, [
    { kind: "mfi", off: 40 },
    { kind: "sweat", off: 20 },
  ]);

  const hover = hoverReadoutMarks(["fish", "mfi"], "2026-09-03", layers, MARKS);
  assert.deepEqual(hover, ["💵 MFI washout"]);
});

test("Vanna calendar is the same read for every ticker and stays out of the hover until it is on", () => {
  const dates = ["2026-09-02", "2026-09-03", "2026-09-16", "2026-09-17", "2026-10-01", "2026-10-21", "2026-10-22"];
  const expect = ["ON_HOLIDAY", "SUPPORTIVE", "SUPPORTIVE", "ON_HOLIDAY", "SUPPORTIVE", "SUPPORTIVE", "ON_HOLIDAY"];
  assert.deepEqual(dates.map(vannaStatusForYmd), expect);
  assert.deepEqual(dates.map(vannaStatusForYmd), expect);

  const off = hoverReadoutMarks(["fish"], "2026-09-03", DEFAULT_CHART_LAYERS, MARKS);
  assert.deepEqual(off, ["🐟 Fish"]);

  const on = hoverReadoutMarks(["fish"], "2026-09-17", { ...DEFAULT_CHART_LAYERS, vanna: true }, MARKS);
  assert.deepEqual(on, ["🐟 Fish", "🪟 On holiday"]);
});
