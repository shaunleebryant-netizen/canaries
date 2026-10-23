import { StripeStubButton } from "@/components/StripeStubButton";
import { MEMBERS_FREE_LINE, MEMBERS_FREE_LINE_ONE, SUPPORT_EMAIL, findIndicator } from "@/lib/indicatorCatalog";
import { getMembersDb } from "@/lib/members/db";
import { indicatorCheckoutEnabled } from "@/lib/members/indicatorDelivery";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Checkout",
  robots: { index: false, follow: false },
};

/** Stripe step (stub). Stripe is not live: confirms the saved order and says payments are coming soon. */
export default async function IndicatorCheckoutPage({
  searchParams,
}: {
  searchParams: Promise<{ order?: string; script?: string; paid?: string; error?: string }>;
}) {
  const { order, script, paid, error } = await searchParams;
  const live = indicatorCheckoutEnabled();
  let saved: { script_id: string; status: string } | null = null;
  if (order && /^[0-9a-f-]{36}$/i.test(order)) {
    try {
      const db = await getMembersDb();
      saved = await db
        .prepare("SELECT script_id, status FROM indicator_orders WHERE id = ?")
        .bind(order)
        .first<{ script_id: string; status: string }>();
    } catch {
      saved = null;
    }
  }
  const product = findIndicator(saved?.script_id ?? script);

  if (live && saved) {
    const isPaid = paid === "1" || saved.status === "paid" || saved.status === "granted";
    return (
      <div className="mx-auto max-w-xl px-4 py-16">
        <p className="text-xs font-semibold uppercase tracking-widest text-canary-gold">Payment</p>
        <h1 className="mt-3 text-3xl font-semibold text-white">{isPaid ? "You're in" : "Complete your purchase"}</h1>
        <div className="mt-6 rounded-2xl border border-white/15 bg-slate-900/60 p-6 text-sm leading-relaxed text-slate-200">
          {isPaid ? (
            <p>
              Thanks! We&apos;re adding your TradingView account to the invite-only scripts. You&apos;ll get access within a
              few hours; look under Indicators → Invite-only scripts on any chart.
            </p>
          ) : (
            <p>
              {product ? `${product.name}: ` : ""}
              {product?.priceLabel ?? "US$99"} one-off (USD). You&apos;ll pay securely on Stripe.
            </p>
          )}
          {error ? <p className="mt-3 text-amber-300">Payments are briefly unavailable. Please try again shortly.</p> : null}
          <p className="mt-3 font-mono text-xs text-slate-400">Reference: {order!.slice(0, 8)}</p>
        </div>
        {!isPaid ? (
          <form action="/api/indicators/pay" method="post" className="mt-6">
            <input type="hidden" name="order" value={order} />
            <button className="w-full rounded-xl bg-canary-gold px-4 py-3 text-sm font-semibold text-slate-950 hover:bg-yellow-400">
              Pay {product?.priceLabel ?? "US$99"} with card →
            </button>
          </form>
        ) : null}
        <p className="mt-6 text-xs text-slate-500">Education only. Not financial advice.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-xl px-4 py-16">
      <p className="text-xs font-semibold uppercase tracking-widest text-canary-gold">Payment</p>
      <h1 className="mt-3 text-3xl font-semibold text-white">Payments coming soon</h1>
      <div
        data-testid="stripe-stub"
        className="mt-6 rounded-2xl border border-amber-400/30 bg-amber-500/10 p-6 text-sm leading-relaxed text-amber-50"
      >
        {saved ? (
          <p>
            We&apos;ve saved your details{product ? ` for ${product.name}` : ""}. Card payments
            aren&apos;t switched on yet, so nothing has been charged. We&apos;ll email you when you
            can complete your purchase.
          </p>
        ) : (
          <p>
            Card payments aren&apos;t switched on yet, so nothing has been charged. If you filled in
            the form, we&apos;ve saved your details and will email you when you can complete your purchase.
          </p>
        )}
        {saved ? (
          <p className="mt-3 font-mono text-xs text-amber-200/80">Reference: {order!.slice(0, 8)}</p>
        ) : null}
      </div>
      <div className="mt-6">
        <StripeStubButton
          product="tv_indicators"
          label={`Pay ${product?.priceLabel ?? "US$99"} with card (coming soon)`}
          className="w-full rounded-xl border border-white/15 bg-slate-900 px-4 py-3 text-sm font-medium text-slate-300 hover:bg-slate-800"
        />
      </div>
      <p className="mt-4 text-sm font-medium text-canary-amber">{product?.separate ? MEMBERS_FREE_LINE_ONE : MEMBERS_FREE_LINE}</p>
      <p className="mt-6 text-sm text-slate-400">
        Questions? Email{" "}
        <a href={`mailto:${SUPPORT_EMAIL}`} className="text-slate-200 underline">
          {SUPPORT_EMAIL}
        </a>
        .
      </p>
      <a href="/indicators" className="mt-6 inline-block text-sm text-slate-400 hover:text-canary-amber">
        ← Back to indicators
      </a>
    </div>
  );
}
