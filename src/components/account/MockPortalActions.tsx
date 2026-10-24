"use client";

import { useState } from "react";

const ACTIONS: Array<{ action: string; label: string }> = [
  { action: "cancel_auto_renew", label: "Turn off auto-renew" },
  { action: "resume_auto_renew", label: "Turn auto-renew back on" },
  { action: "period_end", label: "Simulate: paid term ends (subscription.deleted)" },
  { action: "renewal_failed", label: "Simulate: renewal payment fails" },
  { action: "clock_past_grace", label: "Simulate: 8 days pass (grace over)" },
];

export function MockPortalActions() {
  const [msg, setMsg] = useState("");
  async function run(action: string) {
    setMsg("…");
    const res = await fetch("/api/account/mock/event", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    const j = await res.json().catch(() => ({}));
    setMsg(res.ok ? `Sent: ${(j.results || []).map((r: { type: string; status: number }) => `${r.type} → ${r.status}`).join(", ")}` : j.error || "error");
  }
  return (
    <div className="mt-6 flex flex-col gap-3">
      {ACTIONS.map((a) => (
        <button
          key={a.action}
          onClick={() => run(a.action)}
          className="rounded-xl border border-white/20 bg-white/5 px-4 py-3 text-left text-sm text-white hover:bg-white/10"
        >
          {a.label}
        </button>
      ))}
      {msg ? <p className="text-xs text-slate-300" data-testid="mock-portal-msg">{msg}</p> : null}
      <a href="/account" className="mt-2 text-sm text-canary-gold underline">
        ← Return to account
      </a>
    </div>
  );
}
