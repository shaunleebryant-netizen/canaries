/**
 * Shared helpers for the read-only D1 -> CSV exports (export-support / export-drive).
 * Runs a single SELECT on the REMOTE canary-members database via `wrangler d1 execute --json`.
 */
import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

export const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");

export function d1Select(sql) {
  if (!/^\s*SELECT\b/i.test(sql)) throw new Error("d1Select: SELECT only (exports are read-only)");
  const raw = execFileSync(
    "npx",
    ["wrangler", "d1", "execute", "canary-members", "--remote", "--json", "--command", sql],
    { cwd: ROOT, encoding: "utf8", stdio: ["ignore", "pipe", "inherit"], maxBuffer: 64 * 1024 * 1024 },
  );
  return JSON.parse(raw.slice(raw.indexOf("[")))?.[0]?.results ?? [];
}

export const utc = (sec) => (sec ? new Date(sec * 1000).toISOString() : "");
export const nz = (sec) =>
  sec
    ? new Intl.DateTimeFormat("en-NZ", {
        timeZone: "Pacific/Auckland", year: "numeric", month: "2-digit", day: "2-digit",
        hour: "2-digit", minute: "2-digit", hour12: false,
      }).format(new Date(sec * 1000)) + " NZ"
    : "";

const esc = (v) => {
  const s = v === null || v === undefined ? "" : String(v);
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

/** Writes header + rows (always writes the header, even with zero rows). UTF-8 BOM for Sheets/Excel. */
export function writeCsv(path, header, rows) {
  mkdirSync(dirname(path), { recursive: true });
  const lines = [header.join(","), ...rows.map((r) => r.map(esc).join(","))];
  writeFileSync(path, "\ufeff" + lines.join("\r\n") + "\r\n");
  return rows.length;
}

export const SUPPORT_HEADER = ["id", "created_at_utc", "created_at_nz", "name", "email", "issue_type", "message", "notify_status", "notify_id", "notify_error"];
export function supportRows() {
  return d1Select(
    "SELECT id, created_at, name, email, issue_type, message, notify_status, notify_id, notify_error FROM support_requests ORDER BY id",
  ).map((r) => [r.id, utc(r.created_at), nz(r.created_at), r.name, r.email, r.issue_type, r.message, r.notify_status, r.notify_id, r.notify_error]);
}
