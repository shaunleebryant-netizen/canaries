import assert from "node:assert/strict";
import { test } from "node:test";
import { archiveFromNotes } from "./compositeArchive";
import { fishForScanner, lastTradingSessions, datedPrintsForScanner, exhaustionForScanner, withholdsForRedComposite } from "./scannerWindow";

const calendar = [
  "2026-10-16",
  "2026-10-19",
  "2026-10-20",
  "2026-10-21",
  "2026-10-22",
  "2026-10-23",
];

const archive = archiveFromNotes([
  "2026-10-19 scripted Decide (x): S=-0.671 RED.",
  "2026-10-20 scripted Decide (x): S=-0.298 AMBER.",
  "2026-10-21 scripted Decide (x): S=-0.138 AMBER.",
  "2026-10-22 scripted Decide (x): S=-0.535 RED.",
  "2026-10-23 scripted Decide (x): S=-0.535 RED.",
]);

test("five trading sessions include the pack date and skip the weekend", () => {
  const sessions = lastTradingSessions(calendar, "2026-10-23", 5);
  assert.deepEqual(sessions, ["2026-10-19", "2026-10-20", "2026-10-21", "2026-10-22", "2026-10-23"]);
  assert.equal(sessions.includes("2026-10-16"), false);
  assert.equal(sessions.includes("2026-10-17"), false);
  assert.deepEqual(lastTradingSessions(calendar, "2026-10-19", 5), ["2026-10-16", "2026-10-19"]);
});

test("amber and green marks print, red and missing scores do not, and a later red close keeps an older amber mark", () => {
  const sessions = lastTradingSessions(calendar, "2026-10-23", 5);
  const { rows, missingDate } = fishForScanner(
    [
      { ticker: "AMBER", signal: "smile" as const, asOf: "2026-11-06", smileAsOf: "2026-10-21" },
      { ticker: "RED", signal: "fish" as const, asOf: "2026-10-23", fishAsOf: "2026-10-23" },
      { ticker: "OLD", signal: "smile" as const, asOf: "2026-10-23", smileAsOf: "2026-10-16" },
      { ticker: "NODATE", signal: "fish" as const, asOf: "2026-10-21" },
      { ticker: "BOTH", signal: "both" as const, asOf: "2026-10-23", smileAsOf: "2026-10-20", fishAsOf: "2026-10-23" },
    ],
    archive,
    sessions,
  );
  assert.deepEqual(rows.map((r) => [r.ticker, r.signal, r.asOf]), [
    ["AMBER", "smile", "2026-10-21"],
    ["BOTH", "smile", "2026-10-20"],
  ]);
  assert.equal(missingDate, 1);
});

test("a file asOf inside the window does not promote a stale mark date", () => {
  const sessions = lastTradingSessions(calendar, "2026-10-23", 5);
  const kept = datedPrintsForScanner(
    [
      { asOf: "2026-10-21", fileAsOf: "2026-11-06" },
      { asOf: "2026-10-16", fileAsOf: "2026-10-23" },
      { asOf: "", fileAsOf: "2026-10-21" },
    ],
    "mfi",
    archive,
    sessions,
  );
  assert.deepEqual(kept.rows.map((r) => r.asOf), ["2026-10-21"]);
  assert.equal(kept.missingDate, 1);
});

test("skull and sweaty stay visible on a red close and on a missing score", () => {
  const sessions = ["2026-10-20", "2026-10-21", "2026-10-22", "2026-10-23"];
  const { rows } = exhaustionForScanner(
    [
      { signal: "skull" as const, asOf: "2026-11-06", skullAsOf: "2026-10-23" },
      { signal: "exhaustion" as const, asOf: "2026-11-06", exhaustionAsOf: "2026-10-20" },
    ],
    sessions,
  );
  assert.deepEqual(rows.map((r) => [r.signal, r.asOf]), [
    ["skull", "2026-10-23"],
    ["exhaustion", "2026-10-20"],
  ]);
  assert.equal(withholdsForRedComposite("skull"), false);
  assert.equal(withholdsForRedComposite("sweaty"), false);
  assert.equal(withholdsForRedComposite("bearish"), false);
  assert.equal(withholdsForRedComposite("baby-bulls"), false);
  assert.equal(withholdsForRedComposite("fish"), true);
});

test("sweaty and skull use their own dates and ignore the file asOf", () => {
  const sessions = lastTradingSessions(calendar, "2026-10-23", 5);
  const { rows, missingDate } = exhaustionForScanner(
    [
      { signal: "skull" as const, signals: ["exhaustion" as const, "skull" as const], asOf: "2026-11-06", exhaustionAsOf: "2026-10-15", skullAsOf: "2026-10-23" },
      { signal: "exhaustion" as const, asOf: "2026-10-23" },
    ],
    sessions,
  );
  assert.equal(rows.length, 1);
  assert.deepEqual(rows[0].signals, ["skull"]);
  assert.equal(rows[0].asOf, "2026-10-23");
  assert.equal(missingDate, 1);
});
