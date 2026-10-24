#!/usr/bin/env node
/**
 * PROPOSED nightly backup of indicator buyers (owner 2026-10-14). Read-only SELECT on remote D1.
 * Writes OUTSIDE the repo by default so buyer emails can never be deployed or committed:
 *   /workspace/backups/indicator-buyers/indicator-buyers-YYYY-MM-DD.csv  (+ latest.csv)
 * Not wired into refresh-full-pack.mjs yet (owner to approve; optional Drive upload after).
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { d1Select } from "./lib/d1-csv.mjs";

const OUT = process.env.OUT_DIR || "/workspace/backups/indicator-buyers";
let rows;
try {
  rows = d1Select(
  "SELECT o.id, o.email, o.tv_username, o.script_name, o.price_cents, o.status, o.paid_at, o.granted_at, t.email_status, o.stripe_session_id FROM indicator_orders o LEFT JOIN indicator_grant_tasks t ON t.order_id = o.id WHERE o.status IN ('paid','granted','refunded') AND o.is_test = 0 ORDER BY o.paid_at",
  );
} catch {
  // 0008 grant-task table not on remote yet: fall back to orders only.
  try {
    rows = d1Select("SELECT o.id, o.email, o.tv_username, o.script_name, o.price_cents, o.status, o.paid_at, o.granted_at, NULL AS email_status, o.stripe_session_id FROM indicator_orders o WHERE o.status IN ('paid','granted','refunded') AND o.is_test = 0 ORDER BY o.paid_at");
  } catch (e) {
  // e.g. table 0008 not applied yet / wrangler auth: non-fatal, previous backup kept.
  console.warn(`[indicator-buyers] export failed: ${e instanceof Error ? e.message.split("\n")[0] : e}`);
  process.exit(1);
  }
}
const d = (s) => (s ? new Intl.DateTimeFormat("en-GB", { timeZone: "Pacific/Auckland", day: "2-digit", month: "2-digit", year: "numeric" }).format(new Date(s * 1000)) : "");
const cell = (v) => { let s = v == null ? "" : String(v); if (/^[=+\-@\t\r]/.test(s)) s = "'" + s; return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
const lines = [["order_id", "email", "tradingview_username", "product", "amount_usd", "status", "paid_date", "granted_date", "email_status", "stripe_session_id"].join(",")];
for (const r of rows) lines.push([r.id, r.email, r.tv_username, r.script_name, (r.price_cents / 100).toFixed(2), r.status === "paid" ? "pending" : r.status, d(r.paid_at), d(r.granted_at), r.email_status, r.stripe_session_id].map(cell).join(","));
mkdirSync(OUT, { recursive: true, mode: 0o700 });
const stamp = new Date().toLocaleDateString("en-CA", { timeZone: "Pacific/Auckland" });
writeFileSync(join(OUT, `indicator-buyers-${stamp}.csv`), lines.join("\n") + "\n", { mode: 0o600 });
writeFileSync(join(OUT, "latest.csv"), lines.join("\n") + "\n", { mode: 0o600 });
console.log(`[indicator-buyers] ${rows.length} buyers -> ${OUT}`);
