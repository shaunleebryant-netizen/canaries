import assert from "node:assert/strict";
import { test } from "node:test";
import { applyBackupAttempt, backupOutcomeAfterSheetPush, marketingOptIn, outboxIdsCoveredBySnapshot, successQueryGrantsAccess } from "./membershipBackup";

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

test("the Canary Members sheet push is the only completed backup", () => {
  const missing = backupOutcomeAfterSheetPush({ pushed: false, credentialMissing: true, attempts: 4 });
  assert.equal(missing.complete, false);
  assert.equal(missing.status, "pending");
  assert.equal(missing.attempts, 4);
  assert.equal(missing.unresolved, "GOOGLE_SERVICE_ACCOUNT_JSON");
  const failedPush = backupOutcomeAfterSheetPush({ pushed: false, credentialMissing: false, attempts: 5 });
  assert.equal(failedPush.status, "pending");
  assert.equal(failedPush.attempts, 6);
  assert.equal(failedPush.complete, false);
  const again = backupOutcomeAfterSheetPush({ pushed: true, credentialMissing: false, attempts: failedPush.attempts });
  assert.deepEqual(again, { status: "synced", attempts: 7, complete: true, unresolved: null });
});

test("only outbox rows present at the snapshot can be marked synced", () => {
  const snapshotAt = 1_700_000_000;
  const covered = outboxIdsCoveredBySnapshot(
    [
      { id: "before", status: "pending", created_at: snapshotAt },
      { id: "old-failed", status: "failed", created_at: snapshotAt - 10 },
      { id: "during", status: "pending", created_at: snapshotAt + 1 },
      { id: "already", status: "synced", created_at: snapshotAt - 5 },
    ],
    snapshotAt,
  );
  assert.deepEqual(covered, ["before", "old-failed"]);
});

test("backup retry stays pending, then fails, and success is the only synced state", () => {
  assert.deepEqual(applyBackupAttempt(0, false), { status: "pending", attempts: 1 });
  assert.deepEqual(applyBackupAttempt(3, false), { status: "pending", attempts: 4 });
  assert.deepEqual(applyBackupAttempt(4, false), { status: "failed", attempts: 5 });
  assert.deepEqual(applyBackupAttempt(2, true), { status: "synced", attempts: 3 });
});
