import type Stripe from "stripe";
import { type D1Database, getUserByCustomer, getUserById, nowSec } from "./db";
import { planForPriceId } from "./plans";
import { handleIndicatorPaid } from "./indicatorDelivery";

type SubLike = {
  id: string;
  customer: string | { id: string };
  status: string;
  cancel_at_period_end?: boolean;
  canceled_at?: number | null;
  ended_at?: number | null;
  current_period_end?: number;
  metadata?: Record<string, string>;
  items?: { data?: Array<{ price?: { id?: string }; current_period_end?: number }> };
};

const idOf = (x: unknown): string | null =>
  typeof x === "string" ? x : x && typeof x === "object" && "id" in x ? String((x as { id: string }).id) : null;

async function resolveUserId(db: D1Database, meta: Record<string, string> | undefined, customer: string | null) {
  const metaUid = meta?.user_id;
  if (metaUid && (await getUserById(db, metaUid))) return metaUid;
  if (customer) {
    const u = await getUserByCustomer(db, customer);
    if (u) return u.id;
  }
  return null;
}

export async function upsertSubscription(db: D1Database, sub: SubLike, userIdHint?: string | null) {
  const customer = idOf(sub.customer) as string;
  const userId = userIdHint ?? (await resolveUserId(db, sub.metadata, customer));
  if (!userId) return { ok: false as const, reason: "no matching user" };
  const item = sub.items?.data?.[0];
  const priceId = item?.price?.id ?? null;
  // API 2025-02-24.acacia: top-level current_period_end; newer APIs moved it to items.
  const periodEnd = sub.current_period_end ?? item?.current_period_end ?? null;
  const plan = sub.metadata?.plan || planForPriceId(priceId);
  const now = nowSec();
  await db
    .prepare(
      `INSERT INTO subscriptions (id, user_id, stripe_customer_id, plan, price_id, status, current_period_end,
         cancel_at_period_end, canceled_at, ended_at, created_at, updated_at, past_due_since)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CASE WHEN ? = 'past_due' THEN ? ELSE NULL END)
       ON CONFLICT(id) DO UPDATE SET status=excluded.status, current_period_end=excluded.current_period_end,
         cancel_at_period_end=excluded.cancel_at_period_end, canceled_at=excluded.canceled_at,
         ended_at=excluded.ended_at, price_id=COALESCE(excluded.price_id, subscriptions.price_id),
         plan=CASE WHEN excluded.plan='unknown' THEN subscriptions.plan ELSE excluded.plan END,
         past_due_since=CASE WHEN excluded.status='past_due' THEN COALESCE(subscriptions.past_due_since, excluded.updated_at) ELSE NULL END,
         updated_at=excluded.updated_at`,
    )
    .bind(
      sub.id, userId, customer, plan, priceId, sub.status, periodEnd,
      sub.cancel_at_period_end ? 1 : 0, sub.canceled_at ?? null, sub.ended_at ?? null, now, now,
      sub.status, now,
    )
    .run();
  await db
    .prepare("UPDATE users SET stripe_customer_id = COALESCE(stripe_customer_id, ?), updated_at = ? WHERE id = ?")
    .bind(customer, now, userId)
    .run();
  return { ok: true as const, userId };
}

/**
 * Apply a VERIFIED Stripe event to D1. Idempotent on event id.
 * `fetchSubscription` retrieves the full subscription for checkout.session.completed
 * when a real Stripe client is available (mock mode sends customer.subscription.created instead).
 */
export async function processStripeEvent(
  db: D1Database,
  event: Stripe.Event,
  fetchSubscription?: (id: string) => Promise<SubLike | null>,
): Promise<{ duplicate: boolean; summary: string }> {
  const seen = await db.prepare("SELECT id FROM stripe_events WHERE id = ?").bind(event.id).first();
  if (seen) return { duplicate: true, summary: "duplicate event ignored" };

  let userId: string | null = null;
  let subscriptionId: string | null = null;
  let amount: number | null = null;
  let currency: string | null = null;
  let summary = "ignored";
  const obj = event.data.object as unknown as Record<string, unknown>;

  switch (event.type) {
    case "checkout.session.completed": {
      const s = obj as unknown as Stripe.Checkout.Session;
      if (s.metadata?.kind === "indicator") {
        amount = s.amount_total ?? null;
        currency = s.currency ?? null;
        // Only act once the money has actually arrived (card payments are 'paid' immediately).
        summary = s.payment_status === "paid" ? await handleIndicatorPaid(db, s as never) : `indicator checkout not paid (${s.payment_status})`;
        break;
      }
      const customer = idOf(s.customer);
      subscriptionId = idOf(s.subscription);
      amount = s.amount_total ?? null;
      currency = s.currency ?? null;
      userId = await resolveUserId(db, { user_id: s.client_reference_id || s.metadata?.user_id || "" }, customer);
      if (userId && customer) {
        await db
          .prepare("UPDATE users SET stripe_customer_id = ?, updated_at = ? WHERE id = ?")
          .bind(customer, nowSec(), userId)
          .run();
      }
      if (userId && subscriptionId && fetchSubscription) {
        const full = await fetchSubscription(subscriptionId);
        if (full) await upsertSubscription(db, full, userId);
      }
      summary = userId ? `checkout completed (${s.metadata?.plan ?? "plan?"})` : "checkout completed: no matching user";
      break;
    }
    case "customer.subscription.created":
    case "customer.subscription.updated":
    case "customer.subscription.deleted": {
      const sub = obj as unknown as SubLike;
      subscriptionId = sub.id;
      if (event.type === "customer.subscription.deleted") sub.status = "canceled";
      const r = await upsertSubscription(db, sub);
      userId = r.ok ? r.userId : null;
      summary = r.ok
        ? `subscription ${event.type.split(".").pop()}: status=${sub.status} cancel_at_period_end=${Boolean(sub.cancel_at_period_end)}`
        : `subscription event: ${r.reason}`;
      break;
    }
    case "invoice.payment_failed": {
      const inv = obj as unknown as Record<string, unknown> & {
        subscription?: unknown;
        parent?: { subscription_details?: { subscription?: unknown } };
        customer?: unknown;
        amount_due?: number;
        currency?: string;
      };
      subscriptionId = idOf(inv.subscription) ?? idOf(inv.parent?.subscription_details?.subscription);
      amount = inv.amount_due ?? null;
      currency = inv.currency ?? null;
      const customer = idOf(inv.customer);
      userId = customer ? (await getUserByCustomer(db, customer))?.id ?? null : null;
      if (subscriptionId) {
        // past_due => 7-day grace from past_due_since, then locked (see access.ts).
        // Mark past_due now so the grace clock starts even if subscription.updated is delayed.
        await db
          .prepare(
            "UPDATE subscriptions SET last_payment_failed_at = ?, status = CASE WHEN status IN ('active','trialing') THEN 'past_due' ELSE status END, past_due_since = CASE WHEN status IN ('active','trialing','past_due') THEN COALESCE(past_due_since, ?) ELSE past_due_since END, updated_at = ? WHERE id = ?",
          )
          .bind(nowSec(), nowSec(), nowSec(), subscriptionId)
          .run();
      }
      summary = "invoice payment failed";
      break;
    }
    default:
      summary = `unhandled type ${event.type}`;
  }

  await db
    .prepare(
      `INSERT OR IGNORE INTO stripe_events (id, type, livemode, stripe_created, received_at, user_id, subscription_id, amount, currency, summary)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(event.id, event.type, event.livemode ? 1 : 0, event.created, nowSec(), userId, subscriptionId, amount, currency, summary)
    .run();
  return { duplicate: false, summary };
}
