"use client";

import { useState } from "react";

export function NewsletterForm({
  source = "weekly_letter",
  buttonLabel = "Get the weekly letter",
  showName = false,
}: {
  source?: string;
  buttonLabel?: string;
  showName?: boolean;
}) {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
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
    } catch {
      setStatus("err");
      setMessage("Network error");
    }
  }

  return (
    <form
      onSubmit={onSubmit}
      className="mx-auto flex w-full max-w-md flex-col gap-3 sm:flex-row sm:flex-wrap"
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
  );
}
