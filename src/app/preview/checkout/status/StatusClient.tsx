"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const OUTCOMES = [
  { id: "paid", label: "Simulate verified payment" },
  { id: "pending", label: "Simulate pending" },
  { id: "failed", label: "Simulate failed" },
  { id: "cancelled", label: "Simulate cancelled" },
] as const;

export function StatusClient({ checkoutId, returnTab }: { checkoutId: string; returnTab: string }) {
  const router = useRouter();
  const [message, setMessage] = useState("No payment has been confirmed. The dashboard stays locked.");
  const [busy, setBusy] = useState(false);

  async function run(outcome: (typeof OUTCOMES)[number]["id"]) {
    setBusy(true);
    setMessage("Checking the simulated record…");
    const res = await fetch("/api/preview/checkout/simulate", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ checkoutId, outcome }),
    });
    const data = (await res.json().catch(() => ({}))) as { tier?: string; backupStatus?: string };
    if (!res.ok) {
      setMessage("The simulated checkout did not apply.");
      setBusy(false);
      return;
    }
    if (outcome !== "paid") {
      setMessage("This outcome does not unlock the dashboard.");
      setBusy(false);
      return;
    }
    for (let i = 0; i < 8; i++) {
      const ent = await fetch("/api/preview/entitlement");
      const body = (await ent.json().catch(() => ({}))) as { tier?: string };
      if (body.tier === "paid") {
        router.push(`/members?tab=${encodeURIComponent(returnTab)}`);
        router.refresh();
        return;
      }
      await new Promise((r) => setTimeout(r, 400));
    }
    setMessage(
      data.tier === "paid"
        ? "The record is paid, and the page is still waiting to refresh."
        : "Payment is not confirmed, so the tab stays locked.",
    );
    setBusy(false);
  }

  return (
    <div className="mt-6 space-y-3">
      <p className="text-sm text-slate-300">{message}</p>
      <div className="flex flex-wrap gap-2">
        {OUTCOMES.map((o) => (
          <button
            key={o.id}
            type="button"
            disabled={busy}
            onClick={() => void run(o.id)}
            className={
              o.id === "paid"
                ? "rounded-xl bg-canary-gold px-4 py-2 text-sm font-semibold text-slate-950 disabled:opacity-60"
                : "rounded-xl border border-white/15 px-4 py-2 text-sm text-slate-200 disabled:opacity-60"
            }
          >
            {o.label}
          </button>
        ))}
      </div>
      <p className="text-xs text-slate-500">Backup status is separate. A pending backup does not block access and is not shown as finished.</p>
    </div>
  );
}
