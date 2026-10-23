import { NextResponse } from "next/server";
import { siteOrigin } from "@/lib/members/config";
import { accountsOr404 } from "@/lib/members/guard";
import { billingBackend, getStripe } from "@/lib/members/stripe";
import { getCurrentUser } from "@/lib/members/session";

export const dynamic = "force-dynamic";

/** Stripe Customer Portal (turn off auto-renew, update card, invoices). */
export async function POST(request: Request) {
  const off = accountsOr404();
  if (off) return off;
  const to = (p: string) => NextResponse.redirect(new URL(p, request.url), 303);
  const cur = await getCurrentUser();
  if (!cur) return to("/account/login?next=/account");
  const backend = billingBackend();
  if (backend === "mock") return to("/account/mock-portal");
  if (backend === "unconfigured") return to("/account?error=stripe_not_configured");
  if (!cur.user.stripe_customer_id) return to("/account?error=no_customer");
  try {
    const portal = await getStripe()!.billingPortal.sessions.create({
      customer: cur.user.stripe_customer_id,
      return_url: `${siteOrigin(request)}/account`,
    });
    return NextResponse.redirect(portal.url, 303);
  } catch (e) {
    console.error("[portal] stripe error", e instanceof Error ? e.message : e);
    return to("/account?error=stripe_error");
  }
}
