import assert from "node:assert/strict";
import { test } from "node:test";
import { CANARY_GROUPS, canaryGroupIds, groupCanaryRows } from "./canaryGroups";

const EXPECTED = [
  "nyse-ad",
  "pct-above-200dma",
  "sp600",
  "rsp",
  "cyclical-defensive",
  "sp-top-50",
  "qqq-sma20",
  "es1-jp30",
  "xlf-kre",
  "vix-vix3m",
  "vix-vvix",
  "hyg-ief-sma20",
  "finra-margin",
];

test("the 13 macro canaries are grouped 4, 4, and 5 exactly once", () => {
  const ids = canaryGroupIds();
  assert.deepEqual(CANARY_GROUPS.map((group) => group.ids.length), [4, 4, 5]);
  assert.equal(ids.length, 13);
  assert.equal(new Set(ids).size, 13);
  assert.deepEqual(ids, EXPECTED);
  assert.deepEqual(
    CANARY_GROUPS.map((group) => group.subtitle),
    [
      "Is the wider market participating?",
      "What is driving the market?",
      "Are conditions supportive or strained?",
    ],
  );
});

test("grouping keeps each card object and leaves an unlisted id out of the three sections", () => {
  const rows = EXPECTED.map((id) => ({ id, score: id.length }));
  const extra = { id: "not-a-canary", score: 0 };
  const grouped = groupCanaryRows([...rows.slice(6), extra, ...rows.slice(0, 6)]);
  assert.deepEqual(
    grouped.sections.map((section) => section.rows.map((row) => row.id)),
    [EXPECTED.slice(0, 4), EXPECTED.slice(4, 8), EXPECTED.slice(8)],
  );
  assert.equal(grouped.sections[0].rows[0], rows[0]);
  assert.deepEqual(grouped.rest, [extra]);
});
