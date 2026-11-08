"use client";

import { Honeypot } from "@/components/Honeypot";
import { useState } from "react";

const field =
  "w-full rounded-xl border border-white/15 bg-slate-900/80 px-4 py-3 text-sm text-white outline-none ring-canary-gold placeholder:text-slate-500 focus:ring-2";
const labelCls = "mb-1.5 block text-xs font-medium text-slate-300";

export function IndicatorOrderForm({
  products,
  initialSelected,
}: {
  products: { id: string; name: string; priceLabel: string; priceCents: number }[];
  initialSelected?: string[];
}) {
  const [selected, setSelected] = useState<string[]>(
    initialSelected?.length ? initialSelected : products[0] ? [products[0].id] : [],
  );
  const toggle = (id: string) =>
    setSelected((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]));
  const chosen = products.filter((p) => selected.includes(p.id));
  const totalCents = chosen.reduce((s, p) => s + p.priceCents, 0);
  const totalLabel = `US$${(totalCents / 100).toFixed(totalCents % 100 ? 2 : 0)}`;
  const [status, setStatus] = useState<"idle" | "loading" | "err">("idle");
  const [message, setMessage] = useState("");

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const tvUsername = String(fd.get("tvUsername") || "").trim().replace(/^@+/, "");
    const email = String(fd.get("email") || "").trim();
    if (!chosen.length) {
      setStatus("err");
      setMessage("Please choose at least one indicator.");
      return;
    }
    if (!/^[A-Za-z0-9_][A-Za-z0-9_.-]{1,39}$/.test(tvUsername)) {
      setStatus("err");
      setMessage("Please enter your TradingView username (letters, numbers and underscores).");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[a-z]{2,24}$/i.test(email)) {
      setStatus("err");
      setMessage("Please enter a valid email address.");
      return;
    }
    setStatus("loading");
    try {
      const res = await fetch("/api/indicators/order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scripts: chosen.map((p) => p.id),
          tvUsername,
          email,
          hp_field: fd.get("hp_field"),
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setStatus("err");
        setMessage(data.error || "Something went wrong. Please try again.");
        return;
      }
      window.location.href = data.next || "/indicators/checkout";
    } catch {
      setStatus("err");
      setMessage("Something went wrong. Please try again.");
    }
  }

  return (
    <form onSubmit={onSubmit} className="relative space-y-5" noValidate>
      <Honeypot />
      <fieldset>
        <legend className={labelCls}>You&apos;re buying</legend>
        <div className="space-y-2">
          {products.map((p) => {
            const on = selected.includes(p.id);
            return (
              <label
                key={p.id}
                className={`flex cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 text-sm ${
                  on ? "border-canary-gold bg-canary-gold/10 text-white" : "border-white/15 bg-slate-900/80 text-slate-300"
                }`}
              >
                <input
                  type="checkbox"
                  name="scripts"
                  value={p.id}
                  checked={on}
                  onChange={() => toggle(p.id)}
                  className="h-4 w-4 accent-yellow-400"
                />
                <span className="flex-1">{p.name}</span>
                <span className="text-slate-400">{p.priceLabel}</span>
              </label>
            );
          })}
        </div>
        <p className="mt-2 text-xs text-slate-400">
          {chosen.length
            ? `${chosen.length} indicator${chosen.length > 1 ? "s" : ""} · ${totalLabel} total, one-off`
            : "Tick at least one indicator."}
        </p>
      </fieldset>
      <div>
        <label htmlFor="tvUsername" className={labelCls}>
          TradingView username <span className="text-amber-300">*</span>
        </label>
        <input
          id="tvUsername"
          name="tvUsername"
          required
          autoComplete="username"
          autoCapitalize="none"
          spellCheck={false}
          maxLength={40}
          placeholder="e.g. canary_trader"
          className={field}
        />
        <p className="mt-1.5 text-xs text-slate-500">
          Exactly as it shows on your TradingView profile. Access is added to this username.
        </p>
      </div>
      <div>
        <label htmlFor="email" className={labelCls}>
          Email <span className="text-amber-300">*</span>
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          maxLength={254}
          placeholder="you@example.com"
          className={field}
        />
        <p className="mt-1.5 text-xs text-slate-500">For your receipt, access confirmation and support.</p>
      </div>
      {status === "err" ? (
        <p role="alert" className="rounded-lg bg-amber-500/10 px-3 py-2 text-sm text-amber-200 ring-1 ring-amber-400/30">
          {message}
        </p>
      ) : null}
      <button
        type="submit"
        disabled={status === "loading" || !chosen.length}
        className="w-full rounded-xl bg-canary-gold px-5 py-3 text-sm font-semibold text-slate-950 hover:bg-amber-300 disabled:opacity-60"
      >
        {status === "loading" ? "Saving…" : "Continue to payment"}
      </button>
      <p className="text-center text-xs text-slate-500">
        No charge is made on this step. Education only, not investment advice.
      </p>
    </form>
  );
}
