import assert from "node:assert/strict";
import { test } from "node:test";
import { archiveFromNotes } from "./compositeArchive";
import { closesOnDates, historySegments } from "./compositeHistory";
import { loadCompositeArchive } from "./loadCompositeArchive";
import { loadSpxClosesForDates } from "./loadSpxCloses";

function utcGap(left: string, right: string): number {
  const day = 86400000;
  return Math.round((Date.parse(`${right}T00:00:00Z`) - Date.parse(`${left}T00:00:00Z`)) / day);
}

test("a missing weekday splits the history line and a weekend does not", () => {
  const segments = historySegments([
    { date: "2026-10-15" },
    { date: "2026-10-16" },
    { date: "2026-10-19" },
    { date: "2026-10-21" },
  ]);
  assert.deepEqual(segments.map((s) => s.map((p) => p.date)), [
    ["2026-10-15", "2026-10-16", "2026-10-19"],
    ["2026-10-21"],
  ]);
});

test("benchmark closes attach only to dates that have a bar", () => {
  const closes = closesOnDates(
    [
      { date: "2026-10-13", close: 10 },
      { date: "2026-10-14", close: Number.NaN },
      { date: "2026-10-20", close: 12 },
    ],
    ["2026-10-13", "2026-10-14", "2026-10-15"],
  );
  assert.deepEqual(closes, [{ date: "2026-10-13", close: 10 }]);
});

test("a sparse October log keeps only the recorded dates and the matching closes", () => {
  const archive = archiveFromNotes([
    "2026-10-13 scripted Decide (x): S=0.282 AMBER.",
    "2026-10-23 scripted Decide (x): S=-0.535 RED.",
  ]);
  assert.deepEqual(
    archive.points.map((point) => point.date),
    ["2026-10-13", "2026-10-23"],
  );
  assert.equal(historySegments(archive.points).length, 2);
  const aligned = closesOnDates(
    [
      { date: "2026-10-13", close: 5800 },
      { date: "2026-10-14", close: 5810 },
      { date: "2026-10-23", close: 5700 },
    ],
    archive.points.map((point) => point.date),
  );
  assert.deepEqual(
    aligned.map((row) => row.date),
    ["2026-10-13", "2026-10-23"],
  );
});

test("the pack log on disk stays sparse and SPX closes attach only to those dates", () => {
  const archive = loadCompositeArchive();
  assert.ok(archive.points.length >= 2);
  const dates = archive.points.map((point) => point.date);
  assert.deepEqual(dates, [...dates].sort());
  assert.equal(new Set(dates).size, dates.length);
  for (const point of archive.points) {
    assert.match(point.date, /^\d{4}-\d{2}-\d{2}$/);
    assert.equal(Number.isFinite(point.S), true);
    assert.equal(["red", "amber", "green"].includes(point.light), true);
  }
  const segments = historySegments(archive.points);
  assert.deepEqual(
    segments.flat().map((point) => point.date),
    dates,
  );
  for (const segment of segments) {
    for (let i = 1; i < segment.length; i += 1) {
      const gap = utcGap(segment[i - 1].date, segment[i].date);
      assert.equal(gap === 1 || gap === 3, true);
    }
  }
  for (let i = 1; i < segments.length; i += 1) {
    const gap = utcGap(segments[i - 1][segments[i - 1].length - 1].date, segments[i][0].date);
    assert.equal(gap > 1 && gap !== 3, true);
  }
  const aligned = loadSpxClosesForDates(dates);
  assert.equal(aligned.symbol, "SPX");
  if (aligned.asOf) assert.match(aligned.asOf, /^\d{4}-\d{2}-\d{2}$/);
  const covered = new Set<string>();
  for (const row of aligned.closes) {
    assert.equal(dates.includes(row.date), true);
    assert.equal(row.close > 0, true);
    assert.equal(covered.has(row.date), false);
    covered.add(row.date);
  }
});
