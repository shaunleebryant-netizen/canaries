"use client";

import { useState } from "react";

type Field = { name: string; label: string; type: string; autoComplete?: string };

/** Small JSON-posting form used by the members account pages (accounts mode only). */
export function AccountForm({
  endpoint,
  fields,
  submitLabel,
  hidden = {},
  successMessage,
}: {
  endpoint: string;
  fields: Field[];
  submitLabel: string;
  hidden?: Record<string, string>;
  successMessage?: string;
}) {
  const [values, setValues] = useState<Record<string, string>>({});
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [link, setLink] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setInfo("");
    setBusy(true);
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...hidden, ...values }),
      });
      const j = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        error?: string;
        next?: string;
        message?: string;
        testModeResetLink?: string;
        testModeVerifyLink?: string;
      };
      if (!res.ok || j.ok === false) {
        setError(j.error || "Something went wrong.");
        return;
      }
      if (j.testModeResetLink) setLink(j.testModeResetLink);
      if (j.testModeVerifyLink) setLink(j.testModeVerifyLink);
      if (j.next) {
        window.location.assign(j.next);
        return;
      }
      setInfo(j.message || successMessage || "Done.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="mt-6 flex w-full flex-col gap-3">
      {fields.map((f) => (
        <label key={f.name} className="flex flex-col gap-1 text-sm font-medium text-slate-300">
          {f.label}
          <input
            name={f.name}
            type={f.type}
            autoComplete={f.autoComplete}
            value={values[f.name] || ""}
            onChange={(e) => setValues((v) => ({ ...v, [f.name]: e.target.value }))}
            className="rounded-xl border border-white/15 bg-slate-900/80 px-4 py-3 text-sm text-white outline-none focus:ring-2 focus:ring-canary-gold"
            required
          />
        </label>
      ))}
      {error ? <p className="text-sm text-canary-red">{error}</p> : null}
      {info ? <p className="text-sm text-emerald-300">{info}</p> : null}
      {link ? (
        <div className="rounded-xl border border-amber-400/40 bg-amber-500/10 p-3 text-xs text-amber-200">
          <p className="font-semibold">TEST MODE — email sending is stubbed; no email was sent.</p>
          <a href={link} className="mt-1 block break-all underline">
            {link}
          </a>
        </div>
      ) : null}
      <button
        type="submit"
        disabled={busy}
        className="rounded-xl bg-canary-gold px-4 py-3 text-sm font-semibold text-slate-950 hover:bg-yellow-400 disabled:opacity-60"
      >
        {busy ? "Please wait…" : submitLabel}
      </button>
    </form>
  );
}
