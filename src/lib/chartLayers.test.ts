import assert from "node:assert/strict";
import { test } from "node:test";
import {
  DEFAULT_CHART_LAYERS,
  FREE_ETF_LOCKED,
  clampChartLayers,
  hoverReadoutMarks,
  latestVisibleMarks,
  parseChartLayers,
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

test("Smiley and monthly trend start on; other layers start off", () => {
  assert.equal(DEFAULT_CHART_LAYERS.smile, true);
  assert.equal(DEFAULT_CHART_LAYERS.m20, true);
  assert.equal(DEFAULT_CHART_LAYERS.fish, false);
  assert.equal("vanna" in DEFAULT_CHART_LAYERS, false);
});

test("stored layers keep unknown keys out and fill missing ones from the defaults", () => {
  const layers = parseChartLayers({ fish: true, vanna: true, unknown: true, fairy: true, mfi: "yes" });
  assert.equal(layers.fish, true);
  assert.equal(layers.fairy, true);
  assert.equal(layers.mfi, false);
  assert.equal(layers.smile, true);
  assert.equal("vanna" in layers, false);
  assert.equal("unknown" in layers, false);
});

test("latest row and hover drop marks the member turned off", () => {
  const layers = { ...DEFAULT_CHART_LAYERS, fish: false, smile: false, mfi: true, sweat: true };
  const latest = latestVisibleMarks(
    [
      [10, "fish"],
      [12, "smile"],
      [20, "sweat"],
      [30, "fish"],
      [40, "mfi"],
    ],
    layers,
  );
  assert.deepEqual(latest, [
    { kind: "mfi", off: 40 },
    { kind: "sweat", off: 20 },
  ]);

  const hover = hoverReadoutMarks(["fish", "mfi"], "2026-09-03", layers, MARKS);
  assert.deepEqual(hover, ["💵 MFI washout"]);
});

test("a free ETF chart cannot turn locked layers on from saved choices", () => {
  const forced = clampChartLayers({ ...DEFAULT_CHART_LAYERS, fish: true, skull: true, smile: true }, "free-etf");
  for (const id of FREE_ETF_LOCKED) assert.equal(forced[id], false);
  assert.equal(forced.smile, true);
  assert.equal(forced.m20, true);
});
