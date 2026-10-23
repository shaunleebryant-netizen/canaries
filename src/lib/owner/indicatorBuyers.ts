/**
 * Owner-only indicator buyers ledger (owner 2026-10-14). Source: D1 indicator_orders (+ grant tasks).
 * Lists every order that has been paid (status paid / granted / refunded). "pending" = paid but
 * TradingView access not yet granted. Used by /owner/indicators and its CSV export.
 */
import type { D1Database } from "@/lib/members/db";

export type BuyerRow = {
  order_id: string;
  email: string;
  tv_username: string;
  script_name: string;
  price_cents: number;
  currency: string;
  status: string;
  paid_at: number | null;
  granted_at: number | null;
  email_status: string | null;
  stripe_session_id: string | null;
};

export const buyerStatus = (s: string) => (s === "paid" ? "pending" : s);

export async function listBuyers(db: D1Database): Promise<BuyerRow[]> {
  const r = await db
    .prepare(
      `SELECT o.id AS order_id, o.email, o.tv_username, o.script_name, o.price_cents, o.currency, o.status,
              o.paid_at, o.granted_at, t.email_status, o.stripe_session_id
         FROM indicator_orders o LEFT JOIN indicator_grant_tasks t ON t.order_id = o.id
        WHERE o.status IN ('paid','granted','refunded') AND o.is_test = 0
        ORDER BY (o.status = 'paid') DESC, COALESCE(o.paid_at, o.created_at) DESC`,
    )
    .all<BuyerRow>();
  return r.results ?? [];
}

export async function markGranted(db: D1Database, orderId: string, now: number): Promise<boolean> {
  const r = await db
    .prepare("UPDATE indicator_orders SET status = 'granted', granted_at = ?, updated_at = ? WHERE id = ? AND status = 'paid'")
    .bind(now, now, orderId)
    .run();
  await db
    .prepare("UPDATE indicator_grant_tasks SET status = 'done', done_at = ?, updated_at = ? WHERE order_id = ? AND status = 'open'")
    .bind(now, now, orderId)
    .run();
  return Boolean((r as { meta?: { changes?: number } }).meta?.changes);
}

/** DD/MM/YYYY in NZ time. */
export function nzDate(sec: number | null): string {
  if (!sec) return "";
  const p = new Intl.DateTimeFormat("en-GB", { timeZone: "Pacific/Auckland", day: "2-digit", month: "2-digit", year: "numeric" });
  return p.format(new Date(sec * 1000));
}

export const usd = (cents: number) => `US$${(cents / 100).toFixed(2)}`;

const cell = (v: unknown) => {
  let s = v == null ? "" : String(v);
  if (/^[=+\-@\t\r]/.test(s)) s = "'" + s; // formula-injection guard
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export const BUYER_CSV_HEADER = ["order_id", "email", "tradingview_username", "product", "amount_usd", "status", "paid_date", "granted_date", "email_status", "stripe_session_id"];

export function buyersCsv(rows: BuyerRow[]): string {
  const lines = [BUYER_CSV_HEADER.join(",")];
  for (const b of rows)
    lines.push(
      [b.order_id, b.email, b.tv_username, b.script_name, (b.price_cents / 100).toFixed(2), buyerStatus(b.status), nzDate(b.paid_at), nzDate(b.granted_at), b.email_status ?? "", b.stripe_session_id ?? ""]
        .map(cell)
        .join(","),
    );
  return lines.join("\n") + "\n";
}
