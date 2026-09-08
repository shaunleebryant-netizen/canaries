"use client";

import { useState } from "react";

/** Design-mode buy CTA — toast only; never creates a live Stripe charge. */
export function IndicatorBuyButton({
  productId,
  label = "Buy / Get invite",
}: {
  productId: string;
  label?: string;
}) {
  const [toast, setToast] = useState<string | null>(null);

  async function onClick() {
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ product: "tv_indicators", indicator: productId }),
      });
      const data = await res.json();
      setToast(
        data.message ||
          `Stub checkout for ${productId} — no charge. Stripe not wired.`
      );
    } catch {
      setToast(`Stub only — no charge for ${productId}.`);
    }
    setTimeout(() => setToast(null), 4000);
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={onClick}
        className="w-full rounded-xl bg-canary-gold px-4 py-2.5 text-sm font-semibold text-slate-950 hover:bg-yellow-400"
      >
        {label}
      </button>
      {toast ? (
        <div
          role="status"
          className="absolute left-0 right-0 top-full z-10 mt-2 rounded-lg bg-slate-900 px-3 py-2 text-xs text-amber-100 shadow-lg ring-1 ring-amber-400/30"
        >
          {toast}
        </div>
      ) : null}
    </div>
  );
}
