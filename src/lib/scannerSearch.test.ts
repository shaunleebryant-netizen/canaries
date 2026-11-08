import assert from "node:assert/strict";
import { test } from "node:test";
import { searchScannerMembership } from "./scannerSearch";

const groups = [
  { id: "fish", label: "Fish", rows: [{ ticker: "rdw", name: "Redwire" }, { ticker: "rdw" }] },
  { id: "bear", label: "Bearish", rows: [{ ticker: "RDW" }] },
  { id: "mfi", label: "MFI", rows: [{ ticker: "AAPL" }] },
];
const universe = [
  { ticker: "RDW", name: "Redwire Corporation" },
  { ticker: "AAPL", name: "Apple" },
  { ticker: "MSFT", name: "Microsoft" },
];

test("scanner search lists current groups and does not invent an off-list symbol", () => {
  const hit = searchScannerMembership(groups, universe, "rdw");
  assert.equal(hit.hits.length, 1);
  assert.deepEqual(hit.hits[0].groups.map((g) => g.label), ["Fish", "Bearish"]);
  assert.equal(hit.hits[0].name, "Redwire");
  assert.deepEqual(hit.groupCounts.map((g) => g.count), [1, 1]);
  assert.equal(hit.outsideCuratedList, false);

  const curated = searchScannerMembership(groups, universe, "microsoft");
  assert.equal(curated.hits.length, 0);
  assert.equal(curated.curatedOnly[0]?.ticker, "MSFT");
  assert.equal(curated.outsideCuratedList, false);

  const outside = searchScannerMembership(groups, universe, "zzzz");
  assert.equal(outside.hits.length, 0);
  assert.equal(outside.outsideCuratedList, true);
  assert.deepEqual(outside.curatedOnly, []);
});
