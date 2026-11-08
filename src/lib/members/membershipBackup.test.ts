import assert from "node:assert/strict";
import { test } from "node:test";
import { applyBackupAttempt, marketingOptIn, successQueryGrantsAccess } from "./membershipBackup";

test("a success URL does not grant access", () => {
  assert.equal(successQueryGrantsAccess("success"), false);
  assert.equal(successQueryGrantsAccess("cancelled"), false);
  assert.equal(successQueryGrantsAccess(undefined), false);
});

test("marketing consent is stored only for boolean true", () => {
  assert.equal(marketingOptIn(true), true);
  assert.equal(marketingOptIn("true"), false);
  assert.equal(marketingOptIn(1), false);
  assert.equal(marketingOptIn(undefined), false);
});

test("backup retry stays pending, then fails, and success is the only synced state", () => {
  assert.deepEqual(applyBackupAttempt(0, false), { status: "pending", attempts: 1 });
  assert.deepEqual(applyBackupAttempt(3, false), { status: "pending", attempts: 4 });
  assert.deepEqual(applyBackupAttempt(4, false), { status: "failed", attempts: 5 });
  assert.deepEqual(applyBackupAttempt(2, true), { status: "synced", attempts: 3 });
});
