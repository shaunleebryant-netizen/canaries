import { NextResponse } from "next/server";
import { adminEmails } from "@/lib/members/config";
import { getMembersDb } from "@/lib/members/db";
import { accountsOr404 } from "@/lib/members/guard";
import { getCurrentUser } from "@/lib/members/session";

export const dynamic = "force-dynamic";

// Admin ledger CSV. D1 is the source of truth. (Google Sheet mirror deferred.)
const QUERIES: Record<string, string> = {
  signups:
    "SELECT u.id AS user_id, u.email, datetime(u.created_at,'unixepoch') AS signed_up_utc, u.stripe_customer_id, s.plan, s.status, datetime(s.current_period_end,'unixepoch') AS period_end_utc, s.cancel_at_period_end FROM users u LEFT JOIN subscriptions s ON s.user_id = u.id ORDER BY u.created_at",
  subscriptions: "SELECT * FROM subscriptions ORDER BY created_at",
  payments:
    "SELECT id AS event_id, type, datetime(stripe_created,'unixepoch') AS at_utc, user_id, subscription_id, amount, currency, livemode, summary FROM stripe_events WHERE type IN ('checkout.session.completed','invoice.payment_failed','invoice.paid','invoice.payment_succeeded') ORDER BY stripe_created",
  events:
    "SELECT id AS event_id, type, datetime(stripe_created,'unixepoch') AS at_utc, user_id, subscription_id, amount, currency, livemode, summary FROM stripe_events ORDER BY stripe_created",
  member_events: "SELECT id, user_id, type, datetime(at,'unixepoch') AS at_utc, detail FROM member_events ORDER BY id",
};

function toCsv(rows: Record<string, unknown>[]): string {
  if (!rows.length) return "";
  const cols = Object.keys(rows[0]);
  const esc = (v: unknown) => {
    const s = v === null || v === undefined ? "" : String(v);
    // Quote, and neutralise spreadsheet formula injection.
    const safe = /^[=+\-@]/.test(s) ? `'${s}` : s;
    return /[",\n]/.test(safe) || safe !== s ? `"${safe.replace(/"/g, '""')}"` : safe;
  };
  return [cols.join(","), ...rows.map((r) => cols.map((c) => esc(r[c])).join(","))].join("\n") + "\n";
}

export async function GET(request: Request) {
  const off = accountsOr404();
  if (off) return off;
  const cur = await getCurrentUser();
  if (!cur || !adminEmails().includes(cur.user.email.toLowerCase())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const table = new URL(request.url).searchParams.get("table") || "signups";
  const sql = QUERIES[table];
  if (!sql) return NextResponse.json({ error: `table must be one of ${Object.keys(QUERIES).join(", ")}` }, { status: 400 });
  const { results } = await (await getMembersDb()).prepare(sql).all<Record<string, unknown>>();
  return new NextResponse(toCsv(results), {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="canary-members-${table}.csv"`,
      "cache-control": "no-store",
    },
  });
}
