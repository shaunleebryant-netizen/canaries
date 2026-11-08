"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

export function FreeSignupForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [marketing, setMarketing] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/preview/free-signup", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, marketing }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string; sent?: boolean };
      if (!res.ok) {
        setError(data.error || "Could not create the preview account");
        return;
      }
      if (data.sent) {
        setError("This preview must not send email");
        return;
      }
      router.push("/members");
      router.refresh();
    } catch {
      setError("Could not reach the preview signup");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="mt-6 space-y-4">
      <label className="block text-sm text-slate-300">
        Email
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
          className="mt-1 w-full rounded-xl border border-white/15 bg-slate-950 px-3 py-2 text-white"
        />
      </label>
      <label className="flex items-start gap-2 text-sm text-slate-300">
        <input
          type="checkbox"
          checked={marketing}
          onChange={(e) => setMarketing(e.target.checked)}
          className="mt-1 accent-sky-400"
        />
        <span>Send me occasional product notes. Leave this unticked and nothing is stored as consent. This preview does not send email.</span>
      </label>
      {error ? <p className="text-sm text-rose-300">{error}</p> : null}
      <button type="submit" disabled={busy} className="rounded-xl bg-canary-gold px-4 py-2 text-sm font-semibold text-slate-950 disabled:opacity-60">
        {busy ? "Creating…" : "Create a free account"}
      </button>
      <p className="text-xs text-slate-500">
        <a href="/signup/free/unsubscribe" className="underline">Unsubscribe</a> clears that optional consent. No message is sent.
      </p>
    </form>
  );
}
