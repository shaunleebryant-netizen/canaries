#!/usr/bin/env node
/**
 * Export the members ledger (D1 = source of truth) to CSV files.
 *
 *   node scripts/members-export-csv.mjs                # LOCAL D1 (test mode, .wrangler/state)
 *   node scripts/members-export-csv.mjs --remote       # after ship day: remote D1 (needs binding in wrangler.jsonc)
 *   OUT_DIR=/workspace/exports node scripts/members-export-csv.mjs
 *
 * Writes signups.csv, subscriptions.csv, payments.csv, events.csv, member_events.csv.
 * Google Sheet mirror: deferred (owner decision) — these CSVs can be imported manually.
 */
import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

const remote = process.argv.includes("--remote");
const config = remote ? "wrangler.jsonc" : "wrangler.members-local.jsonc";
const stamp = new Date().toISOString().slice(0, 10);
const OUT = process.env.OUT_DIR || path.join("exports", `members-${remote ? "remote" : "local"}-${stamp}`);

const Q = {
  signups:
    "SELECT u.id AS user_id, u.email, datetime(u.created_at,'unixepoch') AS signed_up_utc, u.stripe_customer_id, s.plan, s.status, datetime(s.current_period_end,'unixepoch') AS period_end_utc, s.cancel_at_period_end FROM users u LEFT JOIN subscriptions s ON s.user_id = u.id ORDER BY u.created_at",
  subscriptions: "SELECT * FROM subscriptions ORDER BY created_at",
  payments:
    "SELECT id AS event_id, type, datetime(stripe_created,'unixepoch') AS at_utc, user_id, subscription_id, amount, currency, livemode, summary FROM stripe_events WHERE type IN ('checkout.session.completed','invoice.payment_failed','invoice.paid','invoice.payment_succeeded') ORDER BY stripe_created",
  events:
    "SELECT id AS event_id, type, datetime(stripe_created,'unixepoch') AS at_utc, user_id, subscription_id, amount, currency, livemode, summary FROM stripe_events ORDER BY stripe_created",
  member_events: "SELECT id, user_id, type, datetime(at,'unixepoch') AS at_utc, detail FROM member_events ORDER BY id",
};

const esc = (v) => {
  const s = v === null || v === undefined ? "" : String(v);
  const safe = /^[=+\-@]/.test(s) ? `'${s}` : s;
  return /[",\n]/.test(safe) || safe !== s ? `"${safe.replace(/"/g, '""')}"` : safe;
};

mkdirSync(OUT, { recursive: true });
for (const [name, sql] of Object.entries(Q)) {
  const out = execFileSync(
    "npx",
    ["wrangler", "d1", "execute", "canary-members", remote ? "--remote" : "--local", "-c", config, "--json", "--command", sql],
    { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] },
  );
  const rows = JSON.parse(out)[0]?.results ?? [];
  const cols = rows.length ? Object.keys(rows[0]) : [];
  const csv = rows.length ? [cols.join(","), ...rows.map((r) => cols.map((c) => esc(r[c])).join(","))].join("\n") + "\n" : "";
  writeFileSync(path.join(OUT, `${name}.csv`), csv);
  console.log(`${name}.csv  ${rows.length} rows`);
}
console.log(`-> ${OUT}`);
