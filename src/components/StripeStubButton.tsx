"use client";

import { useState } from "react";

export function StripeStubButton({
  product,
  label,
  endpoint = "/api/stripe/checkout",
}: {
  product?: string;
  label: string;
  endpoint?: string;
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
      setToast(data.message || (data.stub ? "Stub — no charge." : "Done"));
    } catch {
      setToast("Request failed (stub)");
    }
    setTimeout(() => setToast(null), 4000);
  }

  return (
    <div className="relative inline-block">
      <button
        type="button"
        onClick={onClick}
        className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50"
      >
        {label}
      </button>
      {toast ? (
        <div
          role="status"
          className="absolute left-0 top-full z-10 mt-2 w-64 rounded-lg bg-slate-900 px-3 py-2 text-xs text-white shadow-lg"
        >
          {toast}
        </div>
      ) : null}
    </div>
  );
}
