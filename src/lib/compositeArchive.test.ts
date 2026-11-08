import assert from "node:assert/strict";
import { test } from "node:test";
import { archiveFromNotes, archiveFromPoints, colourOn } from "./compositeArchive";

const NOTES = [
  "2026-10-23 scripted Decide (decide-points-v1-2026-09-25): S=-0.535 RED; held: finra-margin. Previous S=-0.535 RED.",
  "2026-10-22 scripted Decide (decide-points-v1-2026-09-25): S=-0.535 RED; held: finra-margin. Previous S=-0.138 AMBER.",
  "2026-10-21 scripted Decide (decide-points-v1-2026-09-25): S=-0.138 AMBER; held: finra-margin. Previous S=-0.298 AMBER.",
  "2026-10-16 scripted Decide (decide-points-v1-2026-09-25): S=-0.915 RED. Previous S=-0.915 RED.",
  "2026-10-16 scripted Decide (decide-points-v1-2026-09-25): S=-0.915 RED. Previous S=-0.36 RED.",
];

test("pack notes become a dated archive without filling gaps", () => {
  const archive = archiveFromNotes(NOTES);
  assert.deepEqual(
    archive.points.map((p) => [p.date, p.light]),
    [
      ["2026-10-16", "red"],
      ["2026-10-21", "amber"],
      ["2026-10-22", "red"],
      ["2026-10-23", "red"],
    ],
  );
  assert.equal(colourOn(archive, "2026-10-20"), "unknown");
  assert.equal(colourOn(archive, "2026-11-06"), "unknown");
});

test("a date whose log disagrees with itself is unknown", () => {
  const archive = archiveFromNotes([
    "2026-10-21 scripted Decide (x): S=-0.138 AMBER.",
    "2026-10-21 scripted Decide (x): S=0.700 GREEN.",
  ]);
  assert.deepEqual(archive.points, []);
  assert.deepEqual(archive.conflicts, ["2026-10-21"]);
  assert.equal(colourOn(archive, "2026-10-21"), "unknown");
});

test("an older non-red close stays non-red when a later close is red", () => {
  const archive = archiveFromPoints(
    [
      { date: "2026-10-21", S: -0.138, light: "amber" },
      { date: "2026-10-23", S: -0.535, light: "red" },
    ],
    "fixture",
  );
  assert.equal(colourOn(archive, "2026-10-21"), "amber");
  assert.equal(colourOn(archive, "2026-10-23"), "red");
});
