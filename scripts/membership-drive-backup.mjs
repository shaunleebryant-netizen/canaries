#!/usr/bin/env node
/**
 * Membership business-data snapshot for the private Canary Dashboard Backups Drive folder.
 *
 * This command does not call Google and does not contain credentials. The parent routine
 * uploads the gzip and the manifest, downloads those bytes, and checks the SHA-256.
 * Only `ack` marks outbox rows, and only the ids captured before the snapshot.
 *
 *   node scripts/membership-drive-backup.mjs capture --remote --out exports/membership-drive/run
 *   node scripts/membership-drive-backup.mjs export --remote --capture exports/membership-drive/run/capture.json --out exports/membership-drive/run
 *   node scripts/membership-drive-backup.mjs ack --remote \
 *     --capture exports/membership-drive/run/capture.json \
 *     --manifest exports/membership-drive/run/manifest.json \
 *     --snapshot exports/membership-drive/run/membership-business.json.gz \
 *     --drive-file-id DRIVE_SNAPSHOT_ID \
 *     --manifest-drive-file-id DRIVE_MANIFEST_ID \
 *     --verified-sha256 DOWNLOADED_SHA256
 *
 * The parent keeps the daily 08:01 Pacific/Auckland run and the seven-day Drive retention.
 * A row created after that run stays pending until the next one. This is not a real-time backup.
 * Logs print counts and the checksum only.
 */
import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { chmodSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import {
  BUSINESS_TABLES,
  assertOutboxId,
  buildSnapshot,
  capturedOutboxIds,
  evaluateDriveAck,
  idsReadyToSync,
  packSnapshot,
  rowsVisibleAtCapture,
  withChecksum,
} from "./lib/drive-backup.mjs";

const remote = process.argv.includes("--remote");
const config = process.env.MEMBERS_WRANGLER_CONFIG || "wrangler.jsonc";
const command = process.argv[2];

function arg(name) {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : "";
}

function d1(sql) {
  const out = execFileSync(
    "npx",
    ["wrangler", "d1", "execute", "canary-members", remote ? "--remote" : "--local", "-c", config, "--json", "--command", sql],
    { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] },
  );
  const start = out.indexOf("[");
  return JSON.parse(start >= 0 ? out.slice(start) : out)[0]?.results ?? [];
}

function quoteIdent(name) {
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(name)) throw new Error("refusing a column name");
  return '"' + name + '"';
}

function assertSafeOut(dir) {
  const resolved = path.resolve(dir);
  const root = path.resolve(".");
  for (const banned of ["src", "public", "migrations", "data"]) {
    const base = path.join(root, banned);
    if (resolved === base || resolved.startsWith(base + path.sep)) {
      throw new Error("refusing to write the snapshot inside " + banned);
    }
  }
  return resolved;
}

function writeRestricted(file, body) {
  writeFileSync(file, body, { mode: 0o600 });
  chmodSync(file, 0o600);
}

function prepareOut(dir) {
  const resolved = assertSafeOut(dir);
  mkdirSync(resolved, { recursive: true, mode: 0o700 });
  chmodSync(resolved, 0o700);
  return resolved;
}

function captureRows(snapshotAt) {
  try {
    const rows = d1(
      "SELECT id, status, created_at FROM membership_backup_outbox WHERE status IN ('pending','failed') AND created_at <= " +
        Number(snapshotAt),
    );
    return { outbox: "present", ids: capturedOutboxIds(rows, snapshotAt) };
  } catch {
    return { outbox: "absent", ids: [] };
  }
}

function readCatalog() {
  const present = new Set(d1("SELECT name FROM sqlite_master WHERE type = 'table'").map((row) => row.name));
  const discovered = {};
  for (const name of BUSINESS_TABLES) {
    if (!present.has(name)) continue;
    const info = d1("PRAGMA table_info(" + quoteIdent(name) + ")");
    const columns = info.map((column) => String(column.name));
    const selectList = columns.map(quoteIdent).join(", ");
    const rows = d1("SELECT " + selectList + " FROM " + quoteIdent(name));
    discovered[name] = { columns, rows };
  }
  return discovered;
}

function commandCapture() {
  const out = prepareOut(arg("--out") || path.join("exports", "membership-drive", "capture"));
  const snapshotAt = Math.floor(Date.now() / 1000);
  const found = captureRows(snapshotAt);
  const capture = {
    kind: "canary-membership-outbox-capture",
    captureId: randomUUID(),
    snapshotAt,
    capturedIds: found.ids,
    outbox: found.outbox,
  };
  writeRestricted(path.join(out, "capture.json"), JSON.stringify(capture, null, 2) + "\n");
  console.log("capture: " + found.ids.length + " pending or failed ids; outbox " + found.outbox);
}

function commandExport() {
  const capturePath = arg("--capture");
  if (!capturePath) throw new Error("export requires --capture");
  const capture = JSON.parse(readFileSync(capturePath, "utf8"));
  const out = prepareOut(arg("--out") || path.dirname(capturePath));
  const raw = readCatalog();
  const discovered = {};
  for (const name of BUSINESS_TABLES) {
    if (!raw[name]) continue;
    const rows = name === "membership_backup_outbox" ? rowsVisibleAtCapture(raw[name].rows, capture.snapshotAt) : raw[name].rows;
    discovered[name] = { columns: raw[name].columns, rows };
  }
  const { snapshot, manifest } = buildSnapshot(capture, discovered);
  const packed = packSnapshot(snapshot);
  writeRestricted(path.join(out, "membership-business.json.gz"), packed.gz);
  writeRestricted(path.join(out, "manifest.json"), JSON.stringify(withChecksum(manifest, packed), null, 2) + "\n");
  const counts = Object.values(manifest.tables).reduce((sum, table) => sum + table.count, 0);
  console.log("export: " + counts + " rows across " + BUSINESS_TABLES.length + " business tables; sha256 " + packed.sha256 + "; not acknowledged");
}

function commandAck() {
  const capture = JSON.parse(readFileSync(arg("--capture"), "utf8"));
  const manifest = JSON.parse(readFileSync(arg("--manifest"), "utf8"));
  const snapshotBytes = readFileSync(arg("--snapshot"));
  const decision = evaluateDriveAck({
    capture,
    manifest,
    snapshotBytes,
    verifiedSha256: arg("--verified-sha256"),
    driveFileId: arg("--drive-file-id"),
    manifestDriveFileId: arg("--manifest-drive-file-id"),
  });
  if (!decision.ok) {
    console.error("ack refused: " + decision.errors.join("; "));
    process.exitCode = 2;
    return;
  }
  for (const id of capture.capturedIds) assertOutboxId(id);
  let ready = capture.capturedIds;
  let already = 0;
  if (capture.outbox === "present" && capture.capturedIds.length) {
    const current = d1(
      "SELECT id, status, created_at FROM membership_backup_outbox WHERE id IN (" +
        capture.capturedIds.map((id) => "'" + id.replaceAll("'", "''") + "'").join(",") +
        ")",
    );
    const plan = idsReadyToSync(current, capture.capturedIds, capture.snapshotAt);
    ready = plan.ready;
    already = plan.already.length;
    if (plan.rejected.length) {
      console.error("ack refused: " + plan.rejected.length + " captured ids are no longer eligible");
      process.exitCode = 2;
      return;
    }
  }
  const now = Math.floor(Date.now() / 1000);
  if (ready.length) {
    d1(
      "UPDATE membership_backup_outbox SET status = 'synced', attempts = attempts + 1, last_error = NULL, updated_at = " +
        now +
        " WHERE id IN (" +
        ready.map((id) => "'" + id.replaceAll("'", "''") + "'").join(",") +
        ") AND created_at <= " +
        Number(capture.snapshotAt) +
        " AND status IN ('pending','failed')",
    );
  }
  const receipt = {
    kind: "canary-membership-drive-ack",
    captureId: capture.captureId,
    snapshotAt: capture.snapshotAt,
    marked: ready.length,
    already,
    driveFileId: arg("--drive-file-id"),
    manifestDriveFileId: arg("--manifest-drive-file-id"),
    snapshotSha256: manifest.snapshotSha256,
    ackedAt: now,
  };
  const receiptDir = prepareOut(path.dirname(path.resolve(arg("--manifest"))));
  writeRestricted(path.join(receiptDir, "ack-receipt.json"), JSON.stringify(receipt, null, 2) + "\n");
  console.log("ack: marked " + ready.length + "; already synced " + already);
}

if (command === "capture") commandCapture();
else if (command === "export") commandExport();
else if (command === "ack") commandAck();
else {
  console.log("usage: node scripts/membership-drive-backup.mjs capture|export|ack [--remote] [--out dir] [--capture file]");
  process.exitCode = command ? 1 : 0;
}
