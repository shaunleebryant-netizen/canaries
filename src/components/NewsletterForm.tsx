"use client";

import { useState } from "react";

export function NewsletterForm({
  source = "weekly_letter",
  buttonLabel = "Get the weekly letter",
  showName = false,
  showNote = false,
  helperText,
}: {
  source?: string;
  buttonLabel?: string;
  showName?: boolean;
  showNote?: boolean;
  helperText?: string;
}) {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [note, setNote] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "ok" | "err">("idle");
  const [message, setMessage] = useState("");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("loading");
    try {
      const res = await fetch("/api/newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          name: showName ? name : undefined,
          note: showNote ? note : undefined,
          source,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setStatus("err");
        setMessage(data.error || "Something went wrong");
        return;
      }
      setStatus("ok");
      setMessage(data.message || "Saved (stub — no email sent).");
      setEmail("");
      setName("");
      setNote("");
    } catch {
      setStatus("err");
      setMessage("Network error");
    }
  }

  return (
    <div className="mx-auto w-full max-w-md">
      <form
        onSubmit={onSubmit}
        className="flex w-full flex-col gap-3 sm:flex-row sm:flex-wrap"
      >
        {showName ? (
          <>
            <label className="sr-only" htmlFor={`${source}-name`}>
              Name
            </label>
            <input
              id={`${source}-name`}
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
              className="w-full rounded-xl border border-white/15 bg-slate-900/80 px-4 py-3 text-sm text-white outline-none ring-canary-gold placeholder:text-slate-500 focus:ring-2 sm:basis-full"
            />
          </>
        ) : null}
        <label className="sr-only" htmlFor={`${source}-email`}>
          Email
        </label>
        <input
          id={`${source}-email`}
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          className="flex-1 rounded-xl border border-white/15 bg-slate-900/80 px-4 py-3 text-sm text-white outline-none ring-canary-gold placeholder:text-slate-500 focus:ring-2"
        />
        {showNote ? (
          <>
            <label className="sr-only" htmlFor={`${source}-note`}>
              Note
            </label>
            <textarea
              id={`${source}-note`}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Friends / private signup note (optional)"
              rows={2}
              className="w-full rounded-xl border border-white/15 bg-slate-900/80 px-4 py-3 text-sm text-white outline-none ring-canary-gold placeholder:text-slate-500 focus:ring-2 sm:basis-full"
            />
          </>
        ) : null}
        <button
          type="submit"
          disabled={status === "loading"}
          className="rounded-xl bg-canary-gold px-5 py-3 text-sm font-semibold text-slate-950 hover:bg-yellow-400 disabled:opacity-60"
        >
          {status === "loading" ? "Saving…" : buttonLabel}
        </button>
        {message ? (
          <p
            className={`basis-full text-sm ${status === "ok" ? "text-canary-green" : "text-canary-red"}`}
            role="status"
          >
            {message}
          </p>
        ) : null}
      </form>
      {helperText ? (
        <p className="mt-3 text-xs leading-relaxed text-slate-500">{helperText}</p>
      ) : null}
    </div>
  );
}
