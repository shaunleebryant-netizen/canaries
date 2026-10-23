import { NextResponse } from "next/server";
import { clean, guardFormPost, isBot, normalizeEmail } from "@/lib/leads";
import { nowSec } from "@/lib/members/db";
import { findOrderable, normalizeTvUsername } from "@/lib/indicatorCatalog";

export const dynamic = "force-dynamic";

/**
 * Indicator buy form -> D1 `indicator_orders` (status 'pending_payment').
 * Collects the TradingView username (needed to grant invite-only access) + email before the
 * Stripe step. Stripe is not live: the response sends the buyer to the checkout stub.
 * Does NOT charge, does NOT send email, does NOT add the buyer to the letter list.
 */
export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid body" }, { status: 400 });
  }
  const guard = await guardFormPost(request, "indicator_order", 6);
  if ("error" in guard) {
    return NextResponse.json({ ok: false, error: guard.error }, { status: guard.status });
  }

  const product = findOrderable(clean(body.script, 40)); // bundle, or Vanna & Charm on its own (owner 2026-10-10)
  if (isBot(body)) {
    return NextResponse.json({ ok: true, next: `/indicators/checkout?script=${product?.id ?? ""}` });
  }
  if (!product) {
    return NextResponse.json({ ok: false, error: "Please choose an indicator." }, { status: 400 });
  }
  const tvUsername = normalizeTvUsername(body.tvUsername);
  if (!tvUsername) {
    return NextResponse.json(
      { ok: false, error: "Please enter your TradingView username (letters, numbers and underscores)." },
      { status: 400 },
    );
  }
  const email = normalizeEmail(body.email);
  if (!email) {
    return NextResponse.json({ ok: false, error: "Please enter a valid email address." }, { status: 400 });
  }
  const note = clean(body.note, 500) || null;

  const id = crypto.randomUUID();
  const now = nowSec();
  await guard.db
    .prepare(
      "INSERT INTO indicator_orders (id, script_id, script_name, tradingview_url, price_cents, currency, tv_username, email, status, is_test, note, ip_hash, created_at, updated_at) " +
        "VALUES (?, ?, ?, ?, ?, 'usd', ?, ?, 'pending_payment', 0, ?, ?, ?, ?)",
    )
    .bind(id, product.id, product.name, product.tradingViewUrl, product.priceCents, tvUsername, email, note, guard.ipH, now, now)
    .run();
  console.log(`[indicators] order saved script=${product.id} order=${id.slice(0, 8)} status=pending_payment`);

  return NextResponse.json({
    ok: true,
    orderId: id,
    status: "pending_payment",
    next: `/indicators/checkout?order=${id}&script=${product.id}`,
  });
}
