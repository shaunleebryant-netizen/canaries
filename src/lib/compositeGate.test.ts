import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { archiveFromNotes, colourOn } from "./compositeArchive";
import { emptyGateCounts, filterSignals, rowDecision, tally, timingDecision } from "./compositeGate";

const archive = archiveFromNotes([
  "2026-10-21 scripted Decide (x): S=-0.138 AMBER.",
  "2026-10-23 scripted Decide (x): S=-0.535 RED.",
  "2026-09-02 scripted Decide (x): S=0.720 GREEN.",
]);

test("red, amber, green and missing closes", () => {
  assert.equal(timingDecision("fish", "2026-10-23", archive), "suppressed");
  assert.equal(timingDecision("smile", "2026-10-21", archive), "eligible");
  assert.equal(timingDecision("fairy", "2026-09-02", archive), "eligible");
  assert.equal(timingDecision("mfi", "2026-04-27", archive), "pending");
  assert.equal(timingDecision("sweat", "2026-10-23", archive), "ungated");
  assert.equal(timingDecision("skull", "2026-10-23", archive), "ungated");
  assert.equal(timingDecision("m20", "2026-04-27", archive), "ungated");
});

test("an older amber mark stays eligible while today's close is red", () => {
  assert.equal(colourOn(archive, "2026-10-23"), "red");
  assert.equal(rowDecision(["fish", "smile"], "2026-10-21", archive), "eligible");
  assert.equal(rowDecision(["fish"], "2026-10-23", archive), "suppressed");
});

test("ETF rows drop gated marks and keep sweaty and skull", () => {
  const kept = filterSignals(["smile", "fish", "exhaustion", "skull"] as const, "2026-10-23", archive);
  assert.deepEqual(kept, ["exhaustion", "skull"]);
  const calm = filterSignals(["smile", "skull"] as const, "2026-09-02", archive);
  assert.deepEqual(calm, ["smile", "skull"]);
});

test("pending is counted separately from suppressed and is not eligible", () => {
  const counts = emptyGateCounts();
  tally(counts, timingDecision("fish", "2026-10-23", archive));
  tally(counts, timingDecision("mfi", "2026-01-01", archive));
  tally(counts, timingDecision("fairy", "2026-09-02", archive));
  assert.equal(counts.raw, 3);
  assert.equal(counts.suppressedRed, 1);
  assert.equal(counts.pendingUnknown, 1);
  assert.equal(counts.eligible, 1);
});

test("snapshot pack log filters the saved signal history without claiming a better result", () => {
  const state = JSON.parse(readFileSync(new URL("../../data/state.json", import.meta.url), "utf8")) as {
    notes?: string[];
  };
  const history = JSON.parse(readFileSync(new URL("../../data/signal-history.json", import.meta.url), "utf8")) as {
    rows?: { d?: string; k?: string }[];
  };
  const saved = archiveFromNotes(state.notes ?? []);
  const counts = emptyGateCounts();
  let incompleteFwd = 0;
  const rawRows = history.rows ?? [];
  for (const row of rawRows) {
    const kind = String(row.k ?? "");
    const decision = timingDecision(kind, String(row.d ?? ""), saved);
    tally(counts, decision);
    const fw = (row as { fw?: (number | null)[] }).fw;
    if (!fw || fw.some((v) => v == null)) incompleteFwd += 1;
  }
  assert.equal(counts.raw, rawRows.length);
  assert.equal(counts.eligible + counts.suppressedRed + counts.pendingUnknown, counts.raw);
  assert.ok(counts.eligible < counts.raw, "dated coverage is incomplete, so not every saved mark is eligible");
  assert.ok(counts.pendingUnknown > 0, "marks outside the pack log stay pending");
  assert.ok(incompleteFwd >= 0);
  assert.equal(colourOn(saved, "2026-11-06"), "unknown");
});
