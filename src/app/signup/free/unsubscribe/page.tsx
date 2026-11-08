"use client";

import { useState, type FormEvent } from "react";

export default function UnsubscribePage() {
  const [email, setEmail] = useState("");
  const [msg, setMsg] = useState("");

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/preview/unsubscribe", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email }),
    });
    const data = (await res.json().catch(() => ({}))) as { sent?: boolean; error?: string };
    setMsg(!res.ok ? data.error || "Could not update" : data.sent ? "Unexpected send" : "Consent cleared. No email was sent.");
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-14">
      <h1 className="text-2xl font-semibold text-white">Unsubscribe</h1>
      <p className="mt-2 text-sm text-slate-400">Clears the optional product-note consent stored for this preview. No email is sent.</p>
      <form onSubmit={onSubmit} className="mt-6 space-y-3">
        <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="w-full rounded-xl border border-white/15 bg-slate-950 px-3 py-2 text-white" />
        <button className="rounded-xl bg-white/10 px-4 py-2 text-sm text-white" type="submit">Unsubscribe</button>
      </form>
      {msg ? <p className="mt-3 text-sm text-slate-300">{msg}</p> : null}
    </div>
  );
}
