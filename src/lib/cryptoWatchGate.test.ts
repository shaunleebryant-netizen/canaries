import assert from "node:assert/strict";
import { test } from "node:test";
import { archiveFromNotes } from "./compositeArchive";
import { cryptoForScanner, lastTradingSessions } from "./scannerWindow";

const calendar = [
  "2026-10-16",
  "2026-10-19",
  "2026-10-20",
  "2026-10-21",
  "2026-10-22",
  "2026-10-23",
];
const sessions = lastTradingSessions(calendar, "2026-10-23", 5);
const archive = archiveFromNotes([
  "2026-10-19 scripted Decide (x): S=-0.671 RED.",
  "2026-10-20 scripted Decide (x): S=0.720 GREEN.",
  "2026-10-21 scripted Decide (x): S=-0.138 AMBER.",
  "2026-10-23 scripted Decide (x): S=-0.535 RED.",
]);

test("crypto bullish marks follow the mark date, and a later red close keeps an earlier green one", () => {
  const { rows, missingDate } = cryptoForScanner(
    [
      { ticker: "GREEN", signals: ["smile"], asOf: "2026-10-23", smileAsOf: "2026-10-20" },
      { ticker: "AMBER", signals: ["fish"], asOf: "2026-10-23", fishAsOf: "2026-10-21" },
      { ticker: "RED", signals: ["smile", "fish"], asOf: "2026-10-20", smileAsOf: "2026-10-23", fishAsOf: "2026-10-23" },
      { ticker: "MISSING", signals: ["mfi"], asOf: "2026-10-22", mfiAsOf: "2026-10-22" },
      { ticker: "FAIRY", signals: ["fairy"], asOf: "2026-10-21", fairyAsOf: "2026-10-20" },
    ],
    archive,
    sessions,
  );
  assert.deepEqual(rows.map((row) => [row.ticker, row.signals, row.asOf]), [
    ["GREEN", ["smile"], "2026-10-20"],
    ["AMBER", ["fish"], "2026-10-21"],
    ["FAIRY", ["fairy"], "2026-10-20"],
  ]);
  assert.equal(missingDate, 0);
  assert.equal(sessions.includes("2026-10-22"), true);
});

test("the file asOf does not keep a stale bullish mark or a weekend print", () => {
  const { rows } = cryptoForScanner(
    [
      { ticker: "STALE", signals: ["smile"], asOf: "2026-10-23", smileAsOf: "2026-10-16" },
      { ticker: "WEEKEND", signals: ["fish"], asOf: "2026-10-20", fishAsOf: "2026-10-17" },
      { ticker: "NODATE", signals: ["fairy"], asOf: "2026-10-21" },
    ],
    archive,
    sessions,
  );
  assert.deepEqual(rows, []);
});

test("warnings stay on a red date and a mixed row drops only the bullish mark", () => {
  const { rows } = cryptoForScanner(
    [
      { ticker: "SWEAT", signals: ["exhaustion"], asOf: "2026-10-16", exhaustionAsOf: "2026-10-19" },
      { ticker: "SKULL", signals: ["skull"], asOf: "2026-10-01", skullAsOf: "2026-10-23" },
      { ticker: "OLDWARN", signals: ["skull"], asOf: "2026-10-23", skullAsOf: "2026-10-16" },
      {
        ticker: "MIXED",
        signals: ["smile", "skull"],
        asOf: "2026-10-20",
        smileAsOf: "2026-10-23",
        skullAsOf: "2026-10-21",
      },
    ],
    archive,
    sessions,
  );
  assert.deepEqual(rows.map((row) => [row.ticker, row.signals, row.asOf]), [
    ["SWEAT", ["exhaustion"], "2026-10-19"],
    ["SKULL", ["skull"], "2026-10-23"],
    ["MIXED", ["skull"], "2026-10-21"],
  ]);
});
