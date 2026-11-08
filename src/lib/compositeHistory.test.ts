import assert from "node:assert/strict";
import { test } from "node:test";
import { closesOnDates, historySegments } from "./compositeHistory";
import { loadCompositeArchive } from "./loadCompositeArchive";
import { loadSpxClosesForDates } from "./loadSpxCloses";

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

test("the pack log and the local SPX file share real October dates", () => {
  const archive = loadCompositeArchive();
  assert.ok(archive.points.length >= 2);
  assert.equal(archive.points[0].date, "2026-10-13");
  assert.equal(archive.points.at(-1)?.date, "2026-10-23");
  const aligned = loadSpxClosesForDates(archive.points.map((p) => p.date));
  assert.equal(aligned.symbol, "SPX");
  assert.equal(aligned.asOf, "2026-11-06");
  assert.ok(aligned.closes.length >= 2);
  for (const row of aligned.closes) {
    assert.ok(archive.points.some((p) => p.date === row.date));
    assert.ok(row.close > 0);
  }
  const covered = new Set(aligned.closes.map((r) => r.date));
  assert.equal(covered.size, aligned.closes.length);
});
