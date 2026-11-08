import assert from "node:assert/strict";
import { test } from "node:test";
import {
  accessFromReturn,
  applyFulfillmentEvent,
  emptyLedger,
  markBackupSynced,
  startPreviewCheckout,
  tierFor,
} from "./previewFulfillment";

function pending() {
  return startPreviewCheckout(emptyLedger(), {
    id: "chk_1",
    email: "Free@Example.com",
    plan: "launch_annual",
    amount: 42000,
    priceEnv: "STRIPE_PRICE_DASHBOARD",
    returnTab: "backtest",
    now: "2026-11-08T00:00:00Z",
  });
}

test("a success URL does not unlock a pending checkout", () => {
  const ledger = pending();
  assert.equal(accessFromReturn(ledger, "free@example.com", "success"), "free");
  assert.equal(tierFor(ledger, "free@example.com"), "free");
});

test("a verified paid event unlocks and leaves backup pending", () => {
  const started = pending();
  const { ledger, result } = applyFulfillmentEvent(started, { id: "evt_1", checkoutId: "chk_1", outcome: "paid" }, true);
  assert.equal(result.ok, true);
  assert.equal(result.duplicate, false);
  assert.equal(result.tier, "paid");
  assert.equal(result.backupStatus, "pending");
  assert.equal(ledger.backup[0].status, "pending");
  assert.equal(accessFromReturn(ledger, "free@example.com", undefined), "paid");
});

test("a duplicate event id does not add another backup", () => {
  const started = pending();
  const first = applyFulfillmentEvent(started, { id: "evt_1", checkoutId: "chk_1", outcome: "paid" }, true);
  const second = applyFulfillmentEvent(first.ledger, { id: "evt_1", checkoutId: "chk_1", outcome: "paid" }, true);
  assert.equal(second.result.duplicate, true);
  assert.equal(second.ledger.backup.length, 1);
  assert.equal(second.ledger.events.length, 1);
});

test("failed, cancelled, and pending stay locked", () => {
  for (const outcome of ["failed", "cancelled", "pending"] as const) {
    const { ledger, result } = applyFulfillmentEvent(pending(), { id: `evt_${outcome}`, checkoutId: "chk_1", outcome }, true);
    assert.equal(result.tier, "free");
    assert.equal(result.backupStatus, "none");
    assert.equal(ledger.backup.length, 0);
    assert.equal(accessFromReturn(ledger, "free@example.com", "success"), "free");
  }
});

test("a bad signature does not change the ledger", () => {
  const started = pending();
  const { ledger, result } = applyFulfillmentEvent(started, { id: "evt_x", checkoutId: "chk_1", outcome: "paid" }, false);
  assert.equal(result.error, "bad-signature");
  assert.equal(ledger, started);
  assert.equal(tierFor(ledger, "free@example.com"), "free");
});

test("backup sync does not gate the paid entitlement", () => {
  const paid = applyFulfillmentEvent(pending(), { id: "evt_1", checkoutId: "chk_1", outcome: "paid" }, true).ledger;
  assert.equal(tierFor(paid, "free@example.com"), "paid");
  const synced = markBackupSynced(paid, "chk_1");
  assert.equal(synced.backup[0].status, "synced");
  assert.equal(tierFor(synced, "free@example.com"), "paid");
});
