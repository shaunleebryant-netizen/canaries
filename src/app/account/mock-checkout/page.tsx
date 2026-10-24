import { notFound, redirect } from "next/navigation";
import { AccountForm } from "@/components/account/AccountForm";
import { stripeMockEnabled } from "@/lib/members/config";
import { PLANS, isPlanId } from "@/lib/members/plans";
import { getCurrentUser } from "@/lib/members/session";

export const dynamic = "force-dynamic";
export const metadata = { title: "MOCK checkout", robots: { index: false } };

/** LOCAL-ONLY stand-in for Stripe-hosted Checkout (STRIPE_MOCK=1, non-production). */
export default async function MockCheckoutPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  if (!stripeMockEnabled()) notFound();
  const cur = await getCurrentUser();
  if (!cur) redirect("/account/login?next=/account");
  const { plan: p } = await searchParams;
  const plan = PLANS[isPlanId(p) ? p : "launch_annual"];
  return (
    <div className="mx-auto max-w-md px-4 py-14">
      <div className="mb-6 rounded-xl border-2 border-dashed border-fuchsia-400 bg-fuchsia-500/10 px-4 py-3 text-center text-sm font-bold uppercase tracking-widest text-fuchsia-200">
        MOCK — not Stripe · local test only · nothing is charged
      </div>
      <p className="text-sm text-slate-400">Canary Dashboard · {cur.user.email}</p>
      <h1 className="mt-2 text-2xl font-semibold text-white">{plan.label}</h1>
      <p className="mt-1 text-lg text-white">{plan.display}</p>
      <p className="mt-1 text-xs text-slate-300">{plan.sub}</p>
      <p className="mt-1 text-xs text-slate-400">{plan.note}</p>
      <AccountForm
        endpoint="/api/account/mock/pay"
        submitLabel="Subscribe (mock)"
        hidden={{ plan: plan.id }}
        fields={[
          { name: "card", label: "Card number (Stripe test card 4242 4242 4242 4242)", type: "text", autoComplete: "off" },
          { name: "exp", label: "Expiry (any future MM/YY)", type: "text", autoComplete: "off" },
          { name: "cvc", label: "CVC (any 3 digits)", type: "text", autoComplete: "off" },
        ]}
      />
      <p className="mt-4 text-xs text-slate-500">
        On success this page posts correctly signed <code>checkout.session.completed</code> and{" "}
        <code>customer.subscription.created</code> test events to <code>/api/stripe/webhook</code>. With real Stripe test
        keys this step is replaced by Stripe-hosted Checkout.
      </p>
    </div>
  );
}
