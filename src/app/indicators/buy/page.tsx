import { IndicatorOrderForm } from "@/components/IndicatorOrderForm";
import {
  INDICATOR_PRODUCTS,
  MEMBERS_FREE_LINE_ONE,
  SUPPORT_EMAIL,
  findOrderableMany,
} from "@/lib/indicatorCatalog";

export const metadata = {
  alternates: { canonical: "/indicators/buy" },
  title: "Buy indicators",
  robots: { index: false, follow: true },
};

export default async function IndicatorBuyPage({
  searchParams,
}: {
  searchParams: Promise<{ script?: string }>;
}) {
  const { script } = await searchParams;
  // Owner 2026-11-02: every live indicator is offered; ?script= (one id or "a,b") only pre-ticks.
  const preselected = findOrderableMany(script).filter((p) => p.id !== "bundle");
  const initial = preselected.length ? preselected.map((p) => p.id) : [INDICATOR_PRODUCTS[0].id];
  return (
    <div className="mx-auto max-w-xl px-4 py-14">
      <a href="/indicators" className="text-sm text-slate-400 hover:text-canary-amber">
        ← All indicators
      </a>
      <h1 className="mt-4 text-3xl font-semibold text-white">Buy indicators</h1>
      <p className="mt-3 text-sm leading-relaxed text-slate-300">
        Invite-only TradingView script — we add access to your username. Enter username and email, then pay.
        Pick one or more below — US$99 each, one-off, lifetime email support.
      </p>
      <p className="mt-3 text-sm font-medium text-canary-amber">
        {MEMBERS_FREE_LINE_ONE} Already a member? Email{" "}
        <a href={`mailto:${SUPPORT_EMAIL}`} className="underline">
          {SUPPORT_EMAIL}
        </a>{" "}
        with your TradingView username.
      </p>
      <div className="mt-8 rounded-2xl border border-white/10 bg-slate-900/60 p-6">
        <IndicatorOrderForm
          products={INDICATOR_PRODUCTS.map((p) => ({
            id: p.id,
            name: p.name,
            priceLabel: p.priceLabel,
            priceCents: p.priceCents,
          }))}
          initialSelected={initial}
        />
      </div>
    </div>
  );
}
