import assert from "node:assert/strict";
import test from "node:test";
import { gunzipSync } from "node:zlib";
import {
  BUSINESS_TABLES,
  EXCLUDED_TABLES,
  assertTableAllowed,
  buildSnapshot,
  capturedOutboxIds,
  evaluateDriveAck,
  idsReadyToSync,
  packSnapshot,
  projectTable,
  rowsVisibleAtCapture,
  withChecksum,
} from "../../../scripts/lib/drive-backup.mjs";

const snapshotAt = 1_700_000_000;
const capture = {
  kind: "canary-membership-outbox-capture",
  captureId: "capture-1",
  snapshotAt,
  capturedIds: ["bak_evt_old", "bak_evt_failed"],
  outbox: "present",
};

function evidence(
  manifest: { snapshotSha256: string; captureId: string; snapshotAt: number; capturedIds: string[]; acked: boolean },
  packed: { gz: Buffer; sha256: string },
  overrides: Record<string, unknown> = {},
) {
  return {
    capture,
    manifest,
    snapshotBytes: packed.gz,
    verifiedSha256: packed.sha256,
    driveFileId: "1driveSnapshotFileIdAb",
    manifestDriveFileId: "1driveManifestFileIdCd",
    ...overrides,
  };
}

function sample() {
  const discovered = {
    users: {
      columns: ["id", "email", "password_hash"],
      rows: [{ id: "user-1", email: "member@example.com", password_hash: "secret-hash" }],
    },
    marketing_consent: {
      columns: ["email", "opted_in", "updated_at"],
      rows: [{ email: "member@example.com", opted_in: 1, updated_at: snapshotAt }],
    },
    membership_backup_outbox: {
      columns: ["id", "status", "created_at"],
      rows: rowsVisibleAtCapture(
        [
          { id: "bak_evt_old", status: "pending", created_at: snapshotAt },
          { id: "bak_evt_failed", status: "failed", created_at: snapshotAt - 5 },
          { id: "bak_evt_during", status: "pending", created_at: snapshotAt + 5 },
        ],
        snapshotAt,
      ),
    },
    leads: {
      columns: ["id", "email", "verify_token_hash", "unsubscribe_token_hash"],
      rows: [{ id: "lead-1", email: "member@example.com", verify_token_hash: "verify-secret", unsubscribe_token_hash: "unsub-secret" }],
    },
  };
  const built = buildSnapshot(capture, discovered);
  const packed = packSnapshot(built.snapshot);
  const manifest = withChecksum(built.manifest, packed);
  return { built, packed, manifest };
}

test("capture keeps pending and failed rows and leaves a later row pending", () => {
  const ids = capturedOutboxIds(
    [
      { id: "bak_evt_old", status: "pending", created_at: snapshotAt },
      { id: "bak_evt_failed", status: "failed", created_at: snapshotAt - 5 },
      { id: "bak_evt_during", status: "pending", created_at: snapshotAt + 1 },
      { id: "bak_evt_done", status: "synced", created_at: snapshotAt - 20 },
    ],
    snapshotAt,
  );
  assert.deepEqual(ids, ["bak_evt_old", "bak_evt_failed"]);
});

test("export keeps business tables, drops secrets, and does not acknowledge", () => {
  const { built, packed, manifest } = sample();
  const snapshotText = JSON.stringify(built.snapshot);
  const manifestText = JSON.stringify(manifest);
  assert.equal(manifest.acked, false);
  assert.equal(manifest.tables.users.omitted.includes("password_hash"), true);
  assert.equal(snapshotText.includes("secret-hash"), false);
  assert.equal(snapshotText.includes("verify-secret"), false);
  assert.equal(snapshotText.includes("unsub-secret"), false);
  assert.equal(snapshotText.includes("member@example.com"), true);
  assert.equal(manifestText.includes("member@example.com"), false);
  assert.equal(manifest.tables.marketing_consent.present, true);
  assert.equal(manifest.tables.subscriptions.present, false);
  assert.equal(manifest.tables.membership_backup_outbox.count, 2);
  assert.equal(manifest.capturedIds.includes("bak_evt_during"), false);
  assert.equal(BUSINESS_TABLES.includes("marketing_consent"), true);
  assert.equal(BUSINESS_TABLES.includes("membership_backup_outbox"), true);
  for (const name of EXCLUDED_TABLES) assert.equal(manifest.tables[name], undefined);
  assert.equal(manifest.restoreLimits.some((line: string) => line.includes("password reset")), true);
  assert.equal(manifest.restoreLimits.some((line: string) => line.includes("not a full database")), true);
  const decoded = JSON.parse(gunzipSync(packed.gz).toString("utf8"));
  assert.equal(decoded.tables.users.rows[0].password_hash, undefined);
  assert.throws(() => projectTable("sessions", ["id"], []), /refusing/);
  assert.throws(() => assertTableAllowed("d1_migrations"), /refusing/);
});

test("acknowledgement requires the downloaded hash and the matching Drive files", () => {
  const { packed, manifest } = sample();
  assert.equal(evaluateDriveAck(evidence(manifest, packed)).ok, true);
  assert.equal(evaluateDriveAck(evidence(manifest, packed, { driveFileId: "" })).ok, false);
  assert.equal(evaluateDriveAck(evidence(manifest, packed, { manifestDriveFileId: "" })).ok, false);
  const flipped = Buffer.from(packed.gz);
  flipped[0] ^= 0xff;
  assert.equal(evaluateDriveAck(evidence(manifest, packed, { snapshotBytes: flipped })).ok, false);
  assert.equal(evaluateDriveAck(evidence(manifest, packed, { verifiedSha256: "a".repeat(64) })).ok, false);
  const stale = { ...manifest, captureId: "other-capture" };
  assert.equal(evaluateDriveAck(evidence(stale, packed)).ok, false);
  const unrelated = { ...manifest, capturedIds: ["bak_evt_other"] };
  assert.equal(evaluateDriveAck(evidence(unrelated, packed)).ok, false);
  const claimed = { ...manifest, acked: true };
  assert.equal(evaluateDriveAck(evidence(claimed, packed)).ok, false);
});

test("acknowledgement is idempotent and will not sync a row created during export", () => {
  const rows = [
    { id: "bak_evt_old", status: "pending", created_at: snapshotAt },
    { id: "bak_evt_failed", status: "failed", created_at: snapshotAt - 5 },
    { id: "bak_evt_during", status: "pending", created_at: snapshotAt + 5 },
  ];
  const first = idsReadyToSync(rows, capture.capturedIds, snapshotAt);
  assert.deepEqual(first.ready, ["bak_evt_old", "bak_evt_failed"]);
  assert.deepEqual(first.rejected, []);
  const second = idsReadyToSync(
    rows.map((row) => (first.ready.includes(row.id) ? { ...row, status: "synced" } : row)),
    capture.capturedIds,
    snapshotAt,
  );
  assert.deepEqual(second.ready, []);
  assert.deepEqual(second.already, ["bak_evt_old", "bak_evt_failed"]);
  const raced = idsReadyToSync(
    [{ id: "bak_evt_old", status: "pending", created_at: snapshotAt + 1 }],
    ["bak_evt_old"],
    snapshotAt,
  );
  assert.deepEqual(raced.ready, []);
  assert.deepEqual(raced.rejected, ["bak_evt_old"]);
});
