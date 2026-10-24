#!/usr/bin/env node
/**
 * Daily Drive sync export (owner request 2026-09-28). READ-ONLY: SELECTs on the REMOTE D1
 * canary-members database; writes three CSVs for the Drive connector to upload:
 *
 *   letter-subscribers.csv  <- leads (tagged "letter") + lead_submissions (note)   [Sheet tab: Signups]
 *   paid-members.csv        <- subscriptions JOIN users (+ stripe_events livemode)  [Sheet tab: Members]
 *   support-requests.csv    <- support_requests                                    [Sheet tab: Support]
 *   bookings.csv            <- bookings (+ legacy lead_submissions source 'tuition') [Sheet tab: Bookings]
 *
 * Never exported: password hashes, verify/unsubscribe token hashes, ip hashes, sessions.
 * (Stripe customer/subscription ids are exported because the Members tab has those columns;
 * they are identifiers, not secrets.) Header rows are always written, even when empty.
 *
 *   npm run export:drive [-- --dir <folder>]     default /workspace/exports/drive-sync/
 */
import { join } from "node:path";
import { SUPPORT_HEADER, d1Select, nz, supportRows, utc, writeCsv } from "./lib/d1-csv.mjs";

const args = process.argv.slice(2);
const di = args.indexOf("--dir");
const DIR = di >= 0 ? args[di + 1] : "/workspace/exports/drive-sync";

// Columns match the "Canary Members" Google Sheet tabs (Signups / Members) so rows paste/sync
// straight in. Support requests have no tab there yet; they get their own CSV.

// Signups tab <- leads tagged "letter" (status as stored: pending = not yet confirmed,
// verified = confirmed, unsubscribed). note = latest letter-form note, if any.
const LETTER_HEADER = ["signup_id", "email", "name", "source", "signed_up_utc", "signed_up_nzt", "consent", "note", "status", "converted_to_member", "store"];
const letter = d1Select(
  "SELECT l.id, l.email, l.name, l.source, l.created_at, l.consent, l.status, " +
    "(SELECT json_extract(ls.payload, '$.note') FROM lead_submissions ls WHERE ls.lead_id = l.id AND ls.source = 'letter' " +
    " AND json_extract(ls.payload, '$.note') IS NOT NULL ORDER BY ls.id DESC LIMIT 1) AS note, " +
    "EXISTS (SELECT 1 FROM users u JOIN subscriptions s ON s.user_id = u.id WHERE u.email = l.email " +
    " AND s.status IN ('active','trialing','past_due')) AS converted " +
    "FROM leads l WHERE l.tags LIKE '%\"letter\"%' ORDER BY l.created_at",
).map((r) => [
  r.id, r.email, r.name ?? "", r.source, utc(r.created_at), nz(r.created_at), r.consent ? "yes" : "no",
  r.note ?? "", r.status === "verified" ? "confirmed" : r.status, r.converted ? "yes" : "no", "d1",
]);

// Members tab <- subscriptions JOIN users. founding = launch_annual plan (first-100 $600/yr rate,
// same rule as countLaunchMembers); founding_number = order of launch_annual subscriptions by start.
// livemode comes from the latest Stripe webhook event for that subscription.
const PAID_HEADER = ["member_id", "email", "plan", "status", "start_date_utc", "current_period_end_utc", "cancel_at_period_end", "founding_member", "founding_number", "stripe_customer_id", "stripe_subscription_id", "livemode", "updated_utc"];
const paid = d1Select(
  "SELECT s.id, s.user_id, u.email, s.plan, s.status, s.created_at, s.current_period_end, s.cancel_at_period_end, " +
    "s.stripe_customer_id, s.updated_at, " +
    "CASE WHEN s.plan = 'launch_annual' THEN (SELECT COUNT(*) FROM subscriptions s2 WHERE s2.plan = 'launch_annual' " +
    " AND (s2.created_at < s.created_at OR (s2.created_at = s.created_at AND s2.id <= s.id))) END AS founding_number, " +
    "(SELECT e.livemode FROM stripe_events e WHERE e.subscription_id = s.id ORDER BY e.stripe_created DESC LIMIT 1) AS livemode " +
    "FROM subscriptions s LEFT JOIN users u ON u.id = s.user_id ORDER BY s.created_at",
).map((r) => [
  r.user_id, r.email ?? "", r.plan, r.status, utc(r.created_at), utc(r.current_period_end),
  r.cancel_at_period_end ? "yes" : "no", r.plan === "launch_annual" ? "yes" : "no", r.founding_number ?? "",
  r.stripe_customer_id, r.id, r.livemode === null || r.livemode === undefined ? "" : r.livemode ? "yes" : "no",
  utc(r.updated_at),
]);

// Bookings tab (owner approved 2026-10-09, t595u) <- D1 `bookings` (migration 0007, /bookings form)
// plus any legacy /tuition requests (lead_submissions source 'tuition', answers in payload JSON).
// is_test rows are skipped. Sorted oldest first so new rows append at the bottom of the tab.
const BOOKINGS_HEADER = ["booking_id", "created_at_utc", "created_at_nz", "type", "name", "email", "timezone", "preferred_times", "topic", "organisation", "event_name", "event_date", "event_location", "audience_size", "message", "from", "status", "store"];
let bookingRows = [];
try {
  bookingRows = d1Select(
    "SELECT id, created_at, booking_type, name, email, timezone, preferred_times, topic, organisation, event_name, " +
      "event_date, event_location, audience_size, message, origin, status FROM bookings WHERE is_test = 0 ORDER BY created_at, id",
  ).map((r) => ({
    at: r.created_at,
    row: [
      r.id, utc(r.created_at), nz(r.created_at), r.booking_type === "speaking" ? "speaking" : "class", r.name, r.email,
      r.timezone ?? "", r.preferred_times ?? "", r.topic ?? "", r.organisation ?? "", r.event_name ?? "", r.event_date ?? "",
      r.event_location ?? "", r.audience_size ?? "", r.message ?? "", r.origin ?? "", r.status, "d1-bookings",
    ],
  }));
} catch (e) {
  // Table missing = migration 0007 not applied yet. Keep the rest of the sync going.
  console.error(`bookings: skipped (${String(e?.message ?? e).split("\n")[0]}). Apply migrations/members/0007_bookings.sql.`);
}
const legacyTuition = d1Select(
  "SELECT ls.id, ls.created_at, ls.payload, l.email, l.name FROM lead_submissions ls JOIN leads l ON l.id = ls.lead_id " +
    "WHERE ls.source = 'tuition' ORDER BY ls.created_at, ls.id",
).map((r) => {
  let p = {};
  try { p = JSON.parse(r.payload || "{}") ?? {}; } catch { p = {}; }
  const list = (v) => (Array.isArray(v) ? v.join(" / ") : v ?? "");
  const times = [list(p.preferredDays), list(p.timeWindows)].filter(Boolean).join("; ");
  const msg = [p.primaryGoal && `Goal: ${p.primaryGoal}`, p.goalDetail, p.notes, p.mobile && `Mobile: ${p.mobile}`]
    .filter(Boolean).join(" | ");
  return {
    at: r.created_at,
    row: [
      `tuition-${r.id}`, utc(r.created_at), nz(r.created_at), "class", r.name ?? "", r.email, p.timezone ?? "", times,
      "", "", "", "", "", "", msg, "tuition", "new", "d1-tuition",
    ],
  };
});
const bookings = [...bookingRows, ...legacyTuition].sort((a, b) => a.at - b.at).map((x) => x.row);

const out = {
  "letter-subscribers.csv": writeCsv(join(DIR, "letter-subscribers.csv"), LETTER_HEADER, letter),
  "paid-members.csv": writeCsv(join(DIR, "paid-members.csv"), PAID_HEADER, paid),
  "support-requests.csv": writeCsv(join(DIR, "support-requests.csv"), SUPPORT_HEADER, supportRows()),
  "bookings.csv": writeCsv(join(DIR, "bookings.csv"), BOOKINGS_HEADER, bookings),
};
for (const [f, n] of Object.entries(out)) console.log(`${f}: ${n} row(s)`);
console.log(`-> ${DIR}`);
