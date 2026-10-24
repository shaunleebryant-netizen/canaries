"use client";

import { Honeypot } from "@/components/Honeypot";
import { useState } from "react";

const field =
  "w-full rounded-xl border border-white/15 bg-slate-900/80 px-4 py-3 text-sm text-white outline-none ring-canary-gold placeholder:text-slate-500 focus:ring-2";
const labelCls = "mb-1.5 block text-xs font-medium text-slate-300";

export function IndicatorOrderForm({
  products,
  initialScript,
}: {
  products: { id: string; name: string; priceLabel: string }[];
  initialScript?: string;
}) {
  const [status, setStatus] = useState<"idle" | "loading" | "err">("idle");
  const [message, setMessage] = useState("");

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const tvUsername = String(fd.get("tvUsername") || "").trim().replace(/^@+/, "");
    const email = String(fd.get("email") || "").trim();
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
          script: fd.get("script"),
          tvUsername,
          email,
          note: fd.get("note"),
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
      <div>
        <label htmlFor="script" className={labelCls}>
          {products.length > 1 ? "Indicator" : "You're buying"}
        </label>
        <select id="script" name="script" defaultValue={initialScript || products[0]?.id} className={field}>
          {products.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name} · {p.priceLabel}
            </option>
          ))}
        </select>
      </div>
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
      <div>
        <label htmlFor="note" className={labelCls}>
          Anything we should know? (optional)
        </label>
        <input id="note" name="note" maxLength={500} className={field} />
      </div>
      {status === "err" ? (
        <p role="alert" className="rounded-lg bg-amber-500/10 px-3 py-2 text-sm text-amber-200 ring-1 ring-amber-400/30">
          {message}
        </p>
      ) : null}
      <button
        type="submit"
        disabled={status === "loading"}
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
