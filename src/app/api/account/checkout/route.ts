import { NextResponse } from "next/server";
import { FIRST_100_CAP, siteOrigin } from "@/lib/members/config";
import { getEntitlement } from "@/lib/members/entitlement";
import { countLaunchMembers, getMembersDb, logMemberEvent, nowSec } from "@/lib/members/db";
import { accountsOr404 } from "@/lib/members/guard";
import { readBody } from "@/lib/members/http";
import { PLANS, priceIdFor, resolvePlan } from "@/lib/members/plans";
import { billingBackend, getStripe } from "@/lib/members/stripe";
import { getCurrentUser } from "@/lib/members/session";

export const dynamic = "force-dynamic";

/** Starts Stripe Checkout (subscription mode). Form POST -> 303 redirect to Stripe (or local mock). */
export async function POST(request: Request) {
  const off = accountsOr404();
  if (off) return off;
  const to = (p: string) => NextResponse.redirect(new URL(p, request.url), 303);
  const cur = await getCurrentUser();
  if (!cur) return to("/account/login?next=/account");
  const db = await getMembersDb();
  if ((await getEntitlement(db, cur.user)).access) return to("/account?already=1"); // paid, admin or comp: never ask to pay

  const b = await readBody(request);
  // Founding while < 100 active founding members; afterwards standard (annual default, monthly on request).
  const plan = resolvePlan(b.plan, (await countLaunchMembers(db)) < FIRST_100_CAP);

  const backend = billingBackend();
  if (backend === "unconfigured") return to("/account?error=stripe_not_configured");
  await logMemberEvent(db, cur.user.id, "checkout_started", `${plan} via ${backend}`);
  if (backend === "mock") return to(`/account/mock-checkout?plan=${plan}`);

  const priceId = priceIdFor(plan);
  if (!priceId) return to(`/account?error=price_missing&env=${PLANS[plan].priceEnv}`);
  try {
    const stripe = getStripe()!;
    let customer = cur.user.stripe_customer_id;
    if (!customer) {
      const c = await stripe.customers.create({ email: cur.user.email, metadata: { user_id: cur.user.id } });
      customer = c.id;
      await db
        .prepare("UPDATE users SET stripe_customer_id = ?, updated_at = ? WHERE id = ?")
        .bind(customer, nowSec(), cur.user.id)
        .run();
    }
    const origin = siteOrigin(request);
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer,
      client_reference_id: cur.user.id,
      line_items: [{ price: priceId, quantity: 1 }],
      metadata: { user_id: cur.user.id, plan },
      subscription_data: { metadata: { user_id: cur.user.id, plan } },
      success_url: `${origin}/account?checkout=success`,
      cancel_url: `${origin}/account?checkout=cancelled`,
    });
    return NextResponse.redirect(session.url!, 303);
  } catch (e) {
    console.error("[checkout] stripe error", e instanceof Error ? e.message : e);
    return to("/account?error=stripe_error");
  }
}
