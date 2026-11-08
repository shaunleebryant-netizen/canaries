import assert from "node:assert/strict";
import { test } from "node:test";
import { archiveFromPoints } from "./compositeArchive";
import { filterChartMarks, ymdFromChartOffset } from "./chartPayload";

const archive = archiveFromPoints(
  [
    { date: "2026-10-21", S: -0.1, light: "amber" },
    { date: "2026-10-23", S: -0.5, light: "red" },
  ],
  "fixture",
);

test("chart offsets use the same UTC day as the lightbox", () => {
  assert.equal(ymdFromChartOffset(20000, 3), new Date(20003 * 86400000).toISOString().slice(0, 10));
});

test("paid charts keep historical marks, including a red or unknown gated mark", () => {
  const amber = Date.parse("2026-10-21T00:00:00Z") / 86400000;
  const red = Date.parse("2026-10-23T00:00:00Z") / 86400000;
  const d0 = amber;
  const marks: [number, string][] = [
    [0, "smile"],
    [red - amber, "fish"],
    [50, "fairy"],
    [1, "sweat"],
    [1, "skull"],
    [1, "m20"],
    [1, "vanna"],
  ];
  const kept = filterChartMarks(marks, d0, archive, "paid");
  assert.deepEqual(kept, [
    [0, "smile"],
    [red - amber, "fish"],
    [50, "fairy"],
    [1, "sweat"],
    [1, "skull"],
    [1, "m20"],
  ]);
});

test("free ETF charts cannot enable locked layers by asking for them", () => {
  const amber = Date.parse("2026-10-21T00:00:00Z") / 86400000;
  const marks: [number, string][] = [
    [0, "smile"],
    [0, "fish"],
    [0, "mfi"],
    [0, "fairy"],
    [0, "sweat"],
    [0, "skull"],
    [0, "m20"],
  ];
  assert.deepEqual(filterChartMarks(marks, amber, archive, "free-etf"), [
    [0, "smile"],
    [0, "m20"],
  ]);
});
