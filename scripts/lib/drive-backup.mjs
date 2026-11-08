import { createHash } from "node:crypto";
import { gzipSync } from "node:zlib";

/** Business tables only. Sessions, auth tokens, rate limits, and the migration ledger are never read. */
export const BUSINESS_TABLES = [
  "users",
  "subscriptions",
  "comp_access",
  "member_watchlist",
  "member_alert_prefs",
  "member_ticker_alerts",
  "member_events",
  "stripe_events",
  "support_requests",
  "indicator_orders",
  "indicator_grant_tasks",
  "bookings",
  "leads",
  "lead_submissions",
  "marketing_consent",
  "membership_backup_outbox",
];

export const EXCLUDED_TABLES = [
  "sessions",
  "email_verifications",
  "password_resets",
  "rate_limits",
  "d1_migrations",
];

const ALLOWED = new Set(BUSINESS_TABLES);
const EXCLUDED = new Set(EXCLUDED_TABLES);

export const RESTORE_LIMITS = [
  "Password hashes are not in this snapshot. A restored account needs a password reset.",
  "Stripe remains the billing source. This file does not replace a Stripe re-sync.",
  "Table shapes and the d1_migrations ledger come from the repository migrations, not from this file.",
  "This is a membership business-data snapshot, not a full database disaster-recovery image.",
];

export function isSecretColumn(name) {
  const column = String(name || "").toLowerCase();
  return column === "password_hash" || column === "token_hash" || column.includes("token_hash") || column.includes("password_hash");
}

export function assertTableAllowed(name) {
  if (EXCLUDED.has(name) || !ALLOWED.has(name)) {
    throw new Error("refusing to export " + name);
  }
}

/** Outbox rows created after the capture stay out of this snapshot. */
export function rowsVisibleAtCapture(rows, snapshotAt) {
  return rows.filter((row) => Number(row.created_at) <= snapshotAt);
}

/** Pending and failed rows that already existed at the capture instant. */
export function capturedOutboxIds(rows, snapshotAt) {
  return rows
    .filter((row) => (row.status === "pending" || row.status === "failed") && Number(row.created_at) <= snapshotAt)
    .map((row) => String(row.id));
}

export function projectTable(name, columns, rows) {
  assertTableAllowed(name);
  const kept = columns.filter((column) => !isSecretColumn(column));
  const omitted = columns.filter((column) => isSecretColumn(column));
  return {
    present: true,
    columns: kept,
    omitted,
    count: rows.length,
    rows: rows.map((row) => {
      const out = {};
      for (const column of kept) out[column] = row[column] ?? null;
      return out;
    }),
  };
}

/**
 * Build the snapshot body and a manifest that has no row payload.
 * capturedIds come only from the earlier capture. Export does not acknowledge anything.
 */
export function buildSnapshot(capture, discovered) {
  if (!capture || capture.kind !== "canary-membership-outbox-capture" || !capture.captureId) {
    throw new Error("export requires a capture file");
  }
  const tables = {};
  const manifestTables = {};
  for (const name of BUSINESS_TABLES) {
    const found = discovered[name];
    if (!found) {
      tables[name] = { present: false, columns: [], omitted: [], count: 0, rows: [] };
      manifestTables[name] = { present: false, columns: [], omitted: [], count: 0 };
      continue;
    }
    const projected = projectTable(name, found.columns, found.rows);
    tables[name] = projected;
    manifestTables[name] = {
      present: true,
      columns: projected.columns,
      omitted: projected.omitted,
      count: projected.count,
    };
  }
  for (const name of Object.keys(discovered)) assertTableAllowed(name);
  const snapshot = {
    kind: "canary-membership-business-snapshot",
    version: 1,
    captureId: capture.captureId,
    snapshotAt: capture.snapshotAt,
    tables,
  };
  const manifest = {
    kind: "canary-membership-business-manifest",
    version: 1,
    captureId: capture.captureId,
    snapshotAt: capture.snapshotAt,
    capturedIds: [...capture.capturedIds],
    outbox: capture.outbox,
    tables: manifestTables,
    excludedTables: EXCLUDED_TABLES,
    restoreLimits: RESTORE_LIMITS,
    acked: false,
    snapshotFile: "membership-business.json.gz",
  };
  return { snapshot, manifest };
}

export function packSnapshot(snapshot) {
  const gz = gzipSync(Buffer.from(JSON.stringify(snapshot)));
  return { gz, sha256: sha256(gz), bytes: gz.length };
}

export function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

export function withChecksum(manifest, packed) {
  return { ...manifest, snapshotSha256: packed.sha256, snapshotBytes: packed.bytes, acked: false };
}

function sameIds(left, right) {
  if (!Array.isArray(left) || !Array.isArray(right) || left.length !== right.length) return false;
  for (let i = 0; i < left.length; i += 1) if (left[i] !== right[i]) return false;
  return true;
}

function driveIdOk(value) {
  return typeof value === "string" && /^[A-Za-z0-9_-]{15,}$/.test(value);
}

/**
 * Evidence check only. A successful export is not evidence.
 * The verified hash is the hash of the bytes downloaded back from Drive.
 */
export function evaluateDriveAck({ capture, manifest, snapshotBytes, verifiedSha256, driveFileId, manifestDriveFileId }) {
  const errors = [];
  if (!capture || capture.kind !== "canary-membership-outbox-capture") errors.push("capture file is missing");
  if (!manifest || manifest.kind !== "canary-membership-business-manifest") errors.push("manifest file is missing");
  if (!driveIdOk(driveFileId)) errors.push("snapshot Drive file id is missing");
  if (!driveIdOk(manifestDriveFileId)) errors.push("manifest Drive file id is missing");
  if (driveIdOk(driveFileId) && driveFileId === manifestDriveFileId) errors.push("snapshot and manifest Drive file ids are the same");
  if (!/^[a-f0-9]{64}$/.test(verifiedSha256 || "")) errors.push("verified sha256 is missing");
  const actual = snapshotBytes ? sha256(snapshotBytes) : "";
  if (!actual || actual !== verifiedSha256) errors.push("downloaded hash does not match the snapshot file");
  if (!manifest || manifest.snapshotSha256 !== actual) errors.push("manifest checksum does not match the snapshot file");
  if (capture && manifest) {
    if (manifest.captureId !== capture.captureId) errors.push("manifest is not for this capture");
    if (manifest.snapshotAt !== capture.snapshotAt) errors.push("manifest time does not match this capture");
    if (!sameIds(manifest.capturedIds, capture.capturedIds)) errors.push("manifest ids do not match this capture");
    if (manifest.acked === true) errors.push("manifest already claims acknowledgement");
  }
  return { ok: errors.length === 0, errors };
}

/** Rows the acknowledgement may update. Already-synced rows are reported and left unchanged. */
export function idsReadyToSync(rows, capturedIds, snapshotAt) {
  const wanted = new Set(capturedIds);
  const ready = [];
  const already = [];
  const rejected = [];
  for (const row of rows) {
    if (!wanted.has(row.id)) continue;
    if (Number(row.created_at) > snapshotAt) {
      rejected.push(row.id);
      continue;
    }
    if (row.status === "synced") already.push(row.id);
    else if (row.status === "pending" || row.status === "failed") ready.push(row.id);
    else rejected.push(row.id);
  }
  return { ready, already, rejected };
}

export function assertOutboxId(id) {
  if (!/^[A-Za-z0-9_.:-]{1,120}$/.test(String(id))) throw new Error("refusing an outbox id");
}
