#!/usr/bin/env node
/**
 * Daily membership record -> rows for the "Canary Members" Google Sheet.
 *
 * Reads the REAL sources only (never invents rows) and writes one CSV per tab
 * plus a JSON bundle that a sheet writer can paste over each tab:
 *
 *   Signups        founding list / weekly letter / seminar / tuition leads
 *   Members        paid subscriptions (email, plan, status, start date, founding #1-100)
 *   Payments       Stripe payment events recorded by the webhook in D1
 *   Cancellations  cancelled / ended subscriptions
 *   Log            one row per run (what was read, what was skipped, row counts)
 *
 * Sources (each is optional; a missing source is logged, never fatal):
 *   1. Members D1 (binding MEMBERS_DB, database "canary-members"): users, subscriptions,
 *      stripe_events, and the proposed `leads` table for signups. Read with
 *      `wrangler d1 execute` (--remote only once the binding exists in wrangler.jsonc).
 *   2. Stripe API (read-only reconciliation): ONLY if STRIPE_SECRET_KEY is set.
 *      Stripe is not live yet, so today this reads nothing and reports "skipped".
 *      A live key (sk_live_) is also refused unless MEMBERS_ALLOW_LIVE_STRIPE=1.
 *   3. Local JSONL stub files in data/ (dev only; the live Worker cannot write files).
 *
 * Usage:
 *   node scripts/export-members-sheet.mjs                 # local D1 (test mode) + local stub files
 *   node scripts/export-members-sheet.mjs --remote        # remote D1 (after ship day)
 *   node scripts/export-members-sheet.mjs --headers       # print tab headers as JSON and exit
 *   OUT_DIR=/workspace/exports/members-sheet node scripts/export-members-sheet.mjs --remote
 *   GOOGLE_SERVICE_ACCOUNT_JSON=/path/sa.json node scripts/export-members-sheet.mjs --remote --push
 *
 * Output contains member emails: keep it out of git (default OUT_DIR is under /exports,
 * which is gitignored) and never paste it into chat or logs.
 */
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

export const TABS = {
  Signups: [
    "signup_id", "email", "name", "source", "tags", "consent", "status",
    "signed_up_utc", "signed_up_nzt", "verified_utc", "unsubscribed_utc",
    "submissions", "last_submission_utc", "latest_details", "converted_to_member", "store",
  ],
  Members: [
    "member_id", "email", "plan", "status", "start_date_utc", "current_period_end_utc",
    "cancel_at_period_end", "founding_member", "founding_number", "stripe_customer_id",
    "stripe_subscription_id", "livemode", "updated_utc",
  ],
  Payments: [
    "event_id", "date_utc", "type", "email", "member_id", "subscription_id",
    "amount", "currency", "livemode", "summary",
  ],
  Cancellations: [
    "subscription_id", "email", "plan", "founding_number", "status",
    "canceled_at_utc", "ended_at_utc", "cancel_at_period_end", "reason",
  ],
  Log: [
    "run_utc", "run_nzt", "mode", "d1", "leads_table", "stripe", "local_files",
    "signups", "members", "payments", "cancellations", "notes",
  ],
};

if (process.argv.includes("--headers")) {
  console.log(JSON.stringify(TABS, null, 2));
  process.exit(0);
}

const remote = process.argv.includes("--remote");
// Both modes use wrangler.jsonc (MEMBERS_DB binding); --local reads .wrangler/state.
const config = process.env.MEMBERS_WRANGLER_CONFIG || "wrangler.jsonc";
const now = new Date();
const stamp = now.toISOString().slice(0, 10);
const OUT = process.env.OUT_DIR || path.join("exports", `members-sheet-${remote ? "remote" : "local"}-${stamp}`);
const FOUNDING_CAP = Number(process.env.MEMBERS_FIRST_100_CAP || 100);
const notes = [];

const iso = (sec) => (sec ? new Date(Number(sec) * 1000).toISOString() : "");
const nzt = (d) =>
  d ? new Date(d).toLocaleString("en-NZ", { timeZone: "Pacific/Auckland", hour12: false }) + " NZT" : "";

/* ---------- D1 ---------- */
function d1(sql) {
  const out = execFileSync(
    "npx",
    ["wrangler", "d1", "execute", "canary-members", remote ? "--remote" : "--local", "-c", config, "--json", "--command", sql],
    { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] },
  );
  return JSON.parse(out)[0]?.results ?? [];
}

let d1Status = "ok";
let leadsStatus = "missing";
let users = [], subs = [], events = [], leads = [];
try {
  users = d1("SELECT id, email, stripe_customer_id, created_at FROM users ORDER BY created_at");
  subs = d1("SELECT * FROM subscriptions ORDER BY created_at");
  events = d1("SELECT * FROM stripe_events ORDER BY stripe_created");
} catch (e) {
  d1Status = remote ? "not configured (no MEMBERS_DB binding / remote database yet)" : "local D1 not initialised";
  notes.push(`D1 skipped: ${String(e.message || e).split("\n")[0].slice(0, 160)}`);
}
if (d1Status === "ok") {
  try {
    leads = d1(
      "SELECT l.id, l.email, l.name, l.source, l.tags, l.consent, l.status, l.created_at, l.verified_at, l.unsubscribed_at, " +
        "(SELECT COUNT(*) FROM lead_submissions s WHERE s.lead_id = l.id) AS submissions, " +
        "(SELECT MAX(created_at) FROM lead_submissions s WHERE s.lead_id = l.id) AS last_sub_at, " +
        "(SELECT s.source || ': ' || COALESCE(s.payload, '') FROM lead_submissions s WHERE s.lead_id = l.id ORDER BY s.id DESC LIMIT 1) AS latest " +
        "FROM leads l ORDER BY l.created_at",
    );
    leadsStatus = "ok";
  } catch {
    leadsStatus = "missing (proposed table not created yet)";
  }
}

/* ---------- Stripe (read-only, optional) ---------- */
let stripeStatus = "skipped (STRIPE_SECRET_KEY not set; Stripe not live)";
const stripeSubs = [];
const key = process.env.STRIPE_SECRET_KEY || "";
if (key) {
  if (key.startsWith("sk_live_") && process.env.MEMBERS_ALLOW_LIVE_STRIPE !== "1") {
    stripeStatus = "skipped (live key refused without MEMBERS_ALLOW_LIVE_STRIPE=1)";
  } else {
    try {
      let after = "";
      for (let page = 0; page < 20; page++) {
        const url = `https://api.stripe.com/v1/subscriptions?status=all&limit=100${after ? `&starting_after=${after}` : ""}&expand[]=data.customer`;
        const res = await fetch(url, { headers: { Authorization: `Bearer ${key}` } });
        if (!res.ok) throw new Error(`Stripe HTTP ${res.status}`);
        const body = await res.json();
        stripeSubs.push(...body.data);
        if (!body.has_more) break;
        after = body.data[body.data.length - 1].id;
      }
      stripeStatus = `ok (${stripeSubs.length} subscriptions, reconciliation only)`;
    } catch (e) {
      stripeStatus = `error (non-fatal): ${String(e.message || e).slice(0, 120)}`;
    }
  }
}

/* ---------- Local stub files (dev only) ---------- */
const localFiles = [
  ["data/newsletter-signups.json", "weekly_letter"],
  ["data/seminar-signups.json", "singapore_seminar"],
  ["data/tuition-leads.json", "tuition"],
];
let localCount = 0;
const localLeads = [];
for (const [f, src] of localFiles) {
  if (!existsSync(f)) continue;
  for (const line of readFileSync(f, "utf8").split("\n")) {
    if (!line.trim()) continue;
    try {
      const r = JSON.parse(line);
      localLeads.push({ ...r, source: r.source || src, _store: f });
      localCount++;
    } catch { /* skip bad line */ }
  }
}

/* ---------- Build rows ---------- */
const userById = new Map(users.map((u) => [u.id, u]));
const memberEmails = new Set(users.filter((u) => subs.some((s) => s.user_id === u.id)).map((u) => String(u.email).toLowerCase()));

// Founding #: order of first founding (launch_annual) subscription, 1..cap. Historical
// sequence number; the live "first 100" gate itself counts only active subs (db.ts).
const foundingNo = new Map();
subs
  .filter((s) => s.plan === "launch_annual")
  .sort((a, b) => a.created_at - b.created_at)
  .forEach((s, i) => { if (i < FOUNDING_CAP) foundingNo.set(s.id, i + 1); });

const tagList = (t) => {
  try {
    return JSON.parse(t || "[]").join(" ");
  } catch {
    return String(t ?? "");
  }
};
const signups = [
  ...leads.map((l) => ({
    signup_id: l.id, email: l.email, name: l.name ?? "", source: l.source, tags: tagList(l.tags),
    consent: l.consent ? "Y" : "N", status: l.status,
    signed_up_utc: iso(l.created_at), signed_up_nzt: nzt(iso(l.created_at)),
    verified_utc: iso(l.verified_at), unsubscribed_utc: iso(l.unsubscribed_at),
    submissions: l.submissions ?? 0, last_submission_utc: iso(l.last_sub_at),
    latest_details: String(l.latest ?? "").slice(0, 300),
    converted_to_member: memberEmails.has(String(l.email).toLowerCase()) ? "Y" : "N", store: "D1 leads",
  })),
  ...localLeads.map((l, i) => ({
    signup_id: `local-${i + 1}`, email: l.email, name: l.name ?? "", source: l.source, tags: l.source,
    consent: "", status: "local-file", signed_up_utc: l.at ?? "", signed_up_nzt: nzt(l.at),
    verified_utc: "", unsubscribed_utc: "", submissions: 1, last_submission_utc: l.at ?? "",
    latest_details: String(l.note ?? "").slice(0, 300),
    converted_to_member: memberEmails.has(String(l.email).toLowerCase()) ? "Y" : "N", store: l._store,
  })),
];

const members = subs.map((s) => {
  const u = userById.get(s.user_id) || {};
  return {
    member_id: s.user_id, email: u.email ?? "", plan: s.plan, status: s.status,
    start_date_utc: iso(s.created_at), current_period_end_utc: iso(s.current_period_end),
    cancel_at_period_end: s.cancel_at_period_end ? "Y" : "N",
    founding_member: foundingNo.has(s.id) ? "Y" : "N", founding_number: foundingNo.get(s.id) ?? "",
    stripe_customer_id: s.stripe_customer_id, stripe_subscription_id: s.id,
    livemode: "", updated_utc: iso(s.updated_at),
  };
});

const PAY_TYPES = new Set(["checkout.session.completed", "invoice.paid", "invoice.payment_succeeded", "invoice.payment_failed", "charge.refunded"]);
const payments = events
  .filter((e) => PAY_TYPES.has(e.type))
  .map((e) => ({
    event_id: e.id, date_utc: iso(e.stripe_created), type: e.type,
    email: userById.get(e.user_id)?.email ?? "", member_id: e.user_id ?? "",
    subscription_id: e.subscription_id ?? "", amount: e.amount != null ? (e.amount / 100).toFixed(2) : "",
    currency: (e.currency ?? "").toUpperCase(), livemode: e.livemode ? "live" : "test", summary: e.summary ?? "",
  }));

const cancellations = subs
  .filter((s) => s.canceled_at || s.ended_at || s.status === "canceled" || s.cancel_at_period_end)
  .map((s) => ({
    subscription_id: s.id, email: userById.get(s.user_id)?.email ?? "", plan: s.plan,
    founding_number: foundingNo.get(s.id) ?? "", status: s.status,
    canceled_at_utc: iso(s.canceled_at), ended_at_utc: iso(s.ended_at),
    cancel_at_period_end: s.cancel_at_period_end ? "Y" : "N", reason: "",
  }));

if (stripeSubs.length) {
  const known = new Set(subs.map((s) => s.id));
  const missing = stripeSubs.filter((s) => !known.has(s.id)).length;
  if (missing) notes.push(`Stripe has ${missing} subscription(s) not in D1: check the webhook`);
}

const log = [{
  run_utc: now.toISOString(), run_nzt: nzt(now), mode: remote ? "remote" : "local",
  d1: d1Status, leads_table: leadsStatus, stripe: stripeStatus, local_files: `${localCount} rows`,
  signups: signups.length, members: members.length, payments: payments.length,
  cancellations: cancellations.length, notes: notes.join(" | "),
}];

/* ---------- Write ---------- */
const esc = (v) => {
  const s = v === null || v === undefined ? "" : String(v);
  const safe = /^[=+\-@]/.test(s) ? `'${s}` : s; // no formula injection in Sheets
  return /[",\n]/.test(safe) || safe !== s ? `"${safe.replace(/"/g, '""')}"` : safe;
};
const data = { Signups: signups, Members: members, Payments: payments, Cancellations: cancellations, Log: log };
mkdirSync(OUT, { recursive: true });
const bundle = { generated_utc: now.toISOString(), tabs: {} };
for (const [tab, cols] of Object.entries(TABS)) {
  const rows = data[tab].map((r) => cols.map((c) => r[c] ?? ""));
  bundle.tabs[tab] = { headers: cols, rows };
  writeFileSync(path.join(OUT, `${tab}.csv`), [cols.join(","), ...rows.map((r) => r.map(esc).join(","))].join("\n") + "\n");
  console.log(`${tab.padEnd(14)} ${rows.length} rows`);
}
writeFileSync(path.join(OUT, "sheet-bundle.json"), JSON.stringify(bundle, null, 2));
console.log(`d1: ${d1Status} · leads: ${leadsStatus} · stripe: ${stripeStatus}`);
console.log(`-> ${OUT}`);

if (process.argv.includes("--push")) await pushToSheet(bundle);

/* ---------- Google Sheets push (--push) ----------
 * Replaces each data tab (header row + rows) and appends one Log row, via the Sheets API.
 * Needs a Google service account key file (JSON) whose client_email has Editor access to the
 * sheet: GOOGLE_SERVICE_ACCOUNT_JSON=/path/key.json. Sheet: MEMBERS_SHEET_ID (default below).
 * valueInputOption=RAW, so nothing a visitor typed can run as a formula.
 */
async function pushToSheet(b) {
  const { createSign } = await import("node:crypto");
  const sheetId = process.env.MEMBERS_SHEET_ID || "12kYo2BehTgE-7EyNHLze8KNCkkf0v9h61ARO0iFHiJ4";
  const keyPath = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  if (!keyPath || !existsSync(keyPath)) {
    console.error("push: GOOGLE_SERVICE_ACCOUNT_JSON not set / file missing; sheet NOT updated");
    process.exitCode = 2;
    return;
  }
  const sa = JSON.parse(readFileSync(keyPath, "utf8"));
  const b64u = (x) => Buffer.from(x).toString("base64url");
  const iat = Math.floor(Date.now() / 1000);
  const unsigned = `${b64u(JSON.stringify({ alg: "RS256", typ: "JWT" }))}.${b64u(JSON.stringify({
    iss: sa.client_email, scope: "https://www.googleapis.com/auth/spreadsheets",
    aud: "https://oauth2.googleapis.com/token", iat, exp: iat + 3600,
  }))}`;
  const sig = createSign("RSA-SHA256").update(unsigned).sign(sa.private_key).toString("base64url");
  const tokRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion: `${unsigned}.${sig}` }),
  });
  if (!tokRes.ok) throw new Error(`push: token HTTP ${tokRes.status}`);
  const { access_token } = await tokRes.json();
  const api = async (pathAndQuery, body) => {
    const r = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${sheetId}${pathAndQuery}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${access_token}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!r.ok) throw new Error(`push: ${pathAndQuery.split("?")[0]} HTTP ${r.status}`);
    return r.json();
  };
  const dataTabs = ["Signups", "Members", "Payments", "Cancellations"];
  await api("/values:batchClear", { ranges: dataTabs.map((t) => `${t}!A1:ZZ`) });
  await api("/values:batchUpdate", {
    valueInputOption: "RAW",
    data: dataTabs.map((t) => ({ range: `${t}!A1`, values: [b.tabs[t].headers, ...b.tabs[t].rows] })),
  });
  await api("/values:batchUpdate", {
    valueInputOption: "RAW",
    data: [{ range: "Log!A1", values: [b.tabs.Log.headers] }],
  });
  await api("/values/Log!A1:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS", {
    values: b.tabs.Log.rows,
  });
  console.log(`push: sheet ${sheetId} updated (${dataTabs.map((t) => `${t} ${b.tabs[t].rows.length}`).join(", ")}, Log +1)`);
}
