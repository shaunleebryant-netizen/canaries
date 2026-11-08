import assert from "node:assert/strict";
import { test } from "node:test";
import {
  CHART_LAYERS_STORAGE_KEY,
  DEFAULT_CHART_LAYERS,
  FREE_ETF_LOCKED,
  clampChartLayers,
  hoverReadoutMarks,
  latestVisibleMarks,
  parseChartLayers,
  readStoredChartLayers,
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

test("every entitled layer starts on, including marks this ticker may not have", () => {
  for (const id of ["smile", "m20", "fish", "mfi", "fairy", "sweat", "skull"] as const) {
    assert.equal(DEFAULT_CHART_LAYERS[id], true);
  }
  assert.equal("vanna" in DEFAULT_CHART_LAYERS, false);
});

test("a fresh chart is all on, and an explicit toggle is restored on reopen", () => {
  const memory = new Map<string, string>();
  const storage = {
    getItem: (key: string) => memory.get(key) ?? null,
    setItem: (key: string, value: string) => {
      memory.set(key, value);
    },
  };
  const fresh = readStoredChartLayers(storage);
  assert.equal(fresh.fish, true);
  assert.equal(fresh.skull, true);
  storage.setItem(CHART_LAYERS_STORAGE_KEY, JSON.stringify({ ...fresh, fish: false, mfi: false }));
  const reopened = readStoredChartLayers(storage);
  assert.equal(reopened.fish, false);
  assert.equal(reopened.mfi, false);
  assert.equal(reopened.smile, true);
  assert.equal(reopened.fairy, true);
  assert.equal(reopened.sweat, true);
  assert.equal(reopened.skull, true);
  assert.equal(reopened.m20, true);
  const oldKey = readStoredChartLayers({
    getItem: (key: string) => (key === "canary.chartLayers.v2" ? JSON.stringify({ fish: false, smile: false }) : null),
  });
  assert.equal(oldKey.fish, true);
  assert.equal(oldKey.smile, true);
});

test("stored layers keep unknown keys out and fill missing ones from the defaults", () => {
  const layers = parseChartLayers({ fish: true, vanna: true, unknown: true, fairy: true, mfi: "yes" });
  assert.equal(layers.fish, true);
  assert.equal(layers.fairy, true);
  assert.equal(layers.mfi, true);
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
