import { IndicatorOrderForm } from "@/components/IndicatorOrderForm";
import {
  BUNDLE_PRICE_LINE,
  INDICATOR_BUNDLE,
  INDICATOR_PRODUCTS,
  MEMBERS_FREE_LINE,
  MEMBERS_FREE_LINE_ONE,
  SEPARATE_INDICATORS,
  SUPPORT_EMAIL,
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
  // ?script=vanna-charm buys Vanna & Charm on its own (owner 2026-10-10); every other / legacy ?script=
  // lands on the bundle (owner 2026-10-09).
  const { script } = await searchParams;
  const separate = SEPARATE_INDICATORS.find((p) => p.id === script);
  const selected = separate ?? INDICATOR_BUNDLE;
  return (
    <div className="mx-auto max-w-xl px-4 py-14">
      <a href="/indicators" className="text-sm text-slate-400 hover:text-canary-amber">
        ← All indicators
      </a>
      <h1 className="mt-4 text-3xl font-semibold text-white">Buy {selected.name}</h1>
      {separate ? (
        <p className="mt-3 text-sm leading-relaxed text-slate-300">
          {separate.name} is sold on its own, separately from the Canary RelRSI + MFI Washout bundle.
          It&apos;s an invite-only TradingView script, so access is added by hand to your TradingView
          username. Tell us your username and email, then continue to payment. {separate.priceLabel}{" "}
          one-off, with lifetime email support.
        </p>
      ) : (
        <p className="mt-3 text-sm leading-relaxed text-slate-300">
          {INDICATOR_PRODUCTS.map((p) => p.name).join(" and ")} come together as one bundle. They&apos;re
          invite-only TradingView scripts, so access is added by hand to your TradingView username. Tell
          us your username and email, then continue to payment. {BUNDLE_PRICE_LINE}, with lifetime email
          support.
        </p>
      )}
      <p className="mt-3 text-sm font-medium text-canary-amber">
        {separate ? MEMBERS_FREE_LINE_ONE : MEMBERS_FREE_LINE} Already a member? Email{" "}
        <a href={`mailto:${SUPPORT_EMAIL}`} className="underline">
          {SUPPORT_EMAIL}
        </a>{" "}
        with your TradingView username.
      </p>
      <div className="mt-8 rounded-2xl border border-white/10 bg-slate-900/60 p-6">
        <IndicatorOrderForm
          products={[{ id: selected.id, name: selected.name, priceLabel: selected.priceLabel }]}
          initialScript={selected.id}
        />
      </div>
      <p className="mt-6 text-xs text-slate-500">
        Questions first? Email{" "}
        <a href={`mailto:${SUPPORT_EMAIL}`} className="text-slate-300 underline">
          {SUPPORT_EMAIL}
        </a>
        . Your details are only used to add your access and support you.
      </p>
    </div>
  );
}
