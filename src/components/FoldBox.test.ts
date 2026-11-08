import assert from "node:assert/strict";
import { test } from "node:test";
import { initialFoldOpen } from "./FoldBox";

test("a stocks scanner starts open and a saved collapse does not apply", () => {
  assert.equal(initialFoldOpen(true, "0", false), true);
  assert.equal(initialFoldOpen(true, "1", false), true);
  assert.equal(initialFoldOpen(true, null, false), true);
});

test("other folded boxes still use a saved choice", () => {
  assert.equal(initialFoldOpen(false, "0", true), false);
  assert.equal(initialFoldOpen(false, "1", true), true);
  assert.equal(initialFoldOpen(false, null, true), false);
});
