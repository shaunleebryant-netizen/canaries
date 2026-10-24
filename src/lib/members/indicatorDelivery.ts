/**
 * Indicator delivery after payment (owner 2026-10-14: invite-only TradingView scripts, NO code
 * attachments). Flow:
 *   /api/indicators/pay  -> Stripe Checkout (mode=payment, metadata.kind="indicator", order_id)
 *   webhook checkout.session.completed -> handleIndicatorPaid():
 *     order -> 'paid', creates an indicator_grant_tasks row ("grant TradingView access"),
 *     sends the "You're in" email (goes through getEmailSender(), so nothing is sent while
 *     EMAIL_SENDING is off).
 * Gate: INDICATOR_CHECKOUT=1 (Worker var). Off by default: /api/indicators/pay 404s.
 */
import { getEmailSender, AUTH_EMAIL_FROM, AUTH_EMAIL_REPLY_TO } from "@/lib/email/sender";
import { priceFromEnv } from "./plans";
import { type D1Database, nowSec } from "./db";

export function indicatorCheckoutEnabled(): boolean {
  return process.env.INDICATOR_CHECKOUT === "1";
}

export function indicatorPriceId(): string | undefined {
  return priceFromEnv("STRIPE_PRICE_TV_INDICATORS");
}

type OrderRow = {
  id: string;
  script_id: string;
  script_name: string;
  tv_username: string;
  email: string;
  status: string;
  price_cents: number;
};

const ddmmyyyy = (sec: number) => {
  const d = new Date(sec * 1000);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(d.getUTCDate())}/${p(d.getUTCMonth() + 1)}/${d.getUTCFullYear()}`;
};

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

export function youreInEmail(o: { scriptName: string; tvUsername: string; amountCents: number; paidAt: number }) {
  const amount = `US$${(o.amountCents / 100).toFixed(2)}`;
  const date = ddmmyyyy(o.paidAt);
  const subject = "You're in: your Canary indicators";
  const text = [
    "Hi,",
    "",
    `Thanks for buying ${o.scriptName} (${amount}, paid ${date}).`,
    `I'm adding your TradingView account (${o.tvUsername}) to the invite-only scripts now. You'll get access within a few hours, and TradingView will notify you when it's done.`,
    "",
    "How to add them to your chart:",
    "1. Log in to TradingView and open any chart (set it to the daily timeframe).",
    "2. Click Indicators at the top of the chart.",
    "3. Open the Invite-only scripts tab.",
    "4. Click each Canary script to add it to your chart.",
    "5. Click the star next to each one to keep them in your Favourites.",
    "",
    "If the scripts don't show up within 24 hours, or that isn't your TradingView username, just reply to this email.",
    "",
    "Shaun",
    "Canary Dashboard",
    "",
    "Education only. These indicators are not financial advice and don't recommend buying or selling anything. Past signals don't guarantee future results. Access is for your personal TradingView account only.",
  ].join("\n");
  const html = `<!doctype html><html><head><meta charset="utf-8"><title>${esc(subject)}</title></head>
<body style="margin:0;background:#f3f4f6;font-family:Arial,Helvetica,sans-serif;color:#1f2937">
<div style="max-width:600px;margin:24px auto;background:#fff;border-radius:8px;overflow:hidden;border:1px solid #e5e7eb">
<div style="background:#0f2340;color:#fff;padding:20px 28px"><div style="font-size:13px;color:#f5b301;letter-spacing:1px">CANARY DASHBOARD</div><div style="font-size:22px;font-weight:bold;margin-top:4px">You're in</div></div>
<div style="padding:24px 28px;font-size:15px;line-height:1.55">
<p>Hi,</p>
<p>Thanks for buying the <b>${esc(o.scriptName)}</b> (${amount}, paid ${date}).</p>
<p>I'm adding your TradingView account <b style="background:#fff3cd;padding:1px 6px;border-radius:4px">${esc(o.tvUsername)}</b> to the invite-only scripts now. You'll get access within a few hours, and TradingView will notify you when it's done.</p>
<h3 style="color:#0f2340;margin:18px 0 8px">How to add them to your chart</h3>
<ol style="padding-left:20px;margin:0 0 18px">
<li>Log in to TradingView and open any chart (set it to the <b>daily</b> timeframe).</li>
<li>Click <b>Indicators</b> at the top of the chart.</li>
<li>Open the <b>Invite-only scripts</b> tab.</li>
<li>Click each Canary script to add it to your chart.</li>
<li>Click the ☆ next to each one to keep them in your Favourites.</li></ol>
<p>If the scripts don't show up within 24 hours, or that isn't your TradingView username, just reply to this email.</p>
<p>Shaun<br><span style="color:#6b7280">Canary Dashboard</span></p>
</div>
<div style="background:#fff8e6;border-top:1px solid #f5d27a;padding:14px 28px;font-size:12px;color:#6b5a1e;line-height:1.5">Education only. These indicators are not financial advice and don't recommend buying or selling anything. Past signals don't guarantee future results. Access is for your personal TradingView account only.</div>
<div style="padding:12px 28px;font-size:11px;color:#9ca3af">Canary Dashboard · canarydashboard.com · All prices in USD</div>
</div></body></html>`;
  return { subject, text, html };
}

/** Called from the verified webhook. Idempotent per order (UNIQUE order_id). */
export async function handleIndicatorPaid(
  db: D1Database,
  s: { id: string; metadata?: Record<string, string> | null; amount_total?: number | null; customer_details?: { email?: string | null } | null },
): Promise<string> {
  const orderId = s.metadata?.order_id;
  if (!orderId) return "indicator paid: no order_id";
  const order = await db.prepare("SELECT * FROM indicator_orders WHERE id = ?").bind(orderId).first<OrderRow>();
  if (!order) return `indicator paid: order ${orderId.slice(0, 8)} not found`;
  const now = nowSec();
  await db
    .prepare(
      "UPDATE indicator_orders SET status = CASE WHEN status IN ('pending_payment','cancelled') THEN 'paid' ELSE status END, stripe_session_id = ?, paid_at = COALESCE(paid_at, ?), updated_at = ? WHERE id = ?",
    )
    .bind(s.id, now, now, orderId)
    .run();
  const existing = await db.prepare("SELECT id FROM indicator_grant_tasks WHERE order_id = ?").bind(orderId).first();
  if (existing) return `indicator paid: task already exists for ${orderId.slice(0, 8)}`;
  const taskId = crypto.randomUUID();
  await db
    .prepare(
      "INSERT OR IGNORE INTO indicator_grant_tasks (id, order_id, script_id, script_name, tv_username, email, status, stripe_session_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, 'open', ?, ?, ?)",
    )
    .bind(taskId, orderId, order.script_id, order.script_name, order.tv_username, order.email, s.id, now, now)
    .run();
  const mail = youreInEmail({
    scriptName: order.script_name,
    tvUsername: order.tv_username,
    amountCents: s.amount_total ?? order.price_cents,
    paidAt: now,
  });
  const r = await getEmailSender().send({
    to: order.email,
    ...mail,
    from: AUTH_EMAIL_FROM,
    replyTo: AUTH_EMAIL_REPLY_TO,
  });
  const emailStatus = r.sent ? "sent" : r.reason === "EMAIL_SENDING is off" ? "off" : `failed:${(r.reason ?? "").slice(0, 80)}`;
  await db.prepare("UPDATE indicator_grant_tasks SET email_status = ? WHERE id = ?").bind(emailStatus, taskId).run();
  return `indicator paid: grant task ${taskId.slice(0, 8)} for TV ${order.tv_username} (email ${emailStatus})`;
}
