"use client";

import { useState } from "react";

export function StripeStubButton({
  product,
  label,
  endpoint = "/api/stripe/checkout",
  className,
}: {
  product?: string;
  label: string;
  endpoint?: string;
  className?: string;
}) {
  const [toast, setToast] = useState<string | null>(null);

  async function onClick() {
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(product ? { product } : {}),
      });
      const data = await res.json();
      setToast(data.message || (data.stub ? "Stub — Stripe wiring next. No charge." : "Done"));
    } catch {
      setToast("Request failed (stub)");
    }
    setTimeout(() => setToast(null), 4000);
  }

  return (
    <div className={`relative ${className?.includes("w-full") ? "block w-full" : "inline-block"}`}>
      <button
        type="button"
        onClick={onClick}
        className={
          className ||
          "rounded-lg border border-white/20 bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800"
        }
      >
        {label}
      </button>
      {toast ? (
        <div
          role="status"
          className="absolute left-0 top-full z-10 mt-2 w-72 rounded-lg bg-slate-900 px-3 py-2 text-xs text-white shadow-lg ring-1 ring-white/10"
        >
          {toast}
        </div>
      ) : null}
    </div>
  );
}
