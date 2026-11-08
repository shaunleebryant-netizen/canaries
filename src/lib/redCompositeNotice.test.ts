/**
 * Node test runner: npx --yes tsx --test src/lib/redCompositeNotice.test.ts
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  AMBER_COMPOSITE_WARNING,
  isAmberCompositeLight,
  isRedCompositeLight,
  RED_COMPOSITE_WARNING,
} from "./redCompositeNotice";

describe("composite light helpers", () => {
  it("matches red regardless of capitalisation", () => {
    assert.equal(isRedCompositeLight("red"), true);
    assert.equal(isRedCompositeLight("Red"), true);
    assert.equal(isRedCompositeLight(" RED "), true);
    assert.equal(isRedCompositeLight("amber"), false);
    assert.equal(isRedCompositeLight("green"), false);
    assert.equal(isRedCompositeLight(null), false);
  });

  it("matches amber regardless of capitalisation", () => {
    assert.equal(isAmberCompositeLight("amber"), true);
    assert.equal(isAmberCompositeLight("Amber"), true);
    assert.equal(isAmberCompositeLight(" AMBER "), true);
    assert.equal(isAmberCompositeLight("red"), false);
    assert.equal(isAmberCompositeLight("green"), false);
    assert.equal(isAmberCompositeLight("yellow"), false);
    assert.equal(isAmberCompositeLight(null), false);
  });

  it("keeps the two notices distinct", () => {
    assert.match(RED_COMPOSITE_WARNING, /red/i);
    assert.match(AMBER_COMPOSITE_WARNING, /amber/i);
    assert.match(AMBER_COMPOSITE_WARNING, /cautious/i);
    assert.match(AMBER_COMPOSITE_WARNING, /half the account/i);
    assert.equal(RED_COMPOSITE_WARNING.includes("half the account"), false);
    assert.equal(AMBER_COMPOSITE_WARNING.includes("Risk-Off"), false);
  });
});
