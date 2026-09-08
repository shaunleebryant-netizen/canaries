"use client";

import { useState } from "react";

export function NewsletterForm() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "ok" | "err">("idle");
  const [message, setMessage] = useState("");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("loading");
    try {
      const res = await fetch("/api/newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
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
    } catch {
      setStatus("err");
      setMessage("Network error");
    }
  }

  return (
    <form onSubmit={onSubmit} className="mx-auto flex w-full max-w-md flex-col gap-3 sm:flex-row">
      <label className="sr-only" htmlFor="newsletter-email">
        Email
      </label>
      <input
        id="newsletter-email"
        type="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="you@example.com"
        className="flex-1 rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none ring-canary-gold focus:ring-2"
      />
      <button
        type="submit"
        disabled={status === "loading"}
        className="rounded-xl bg-slate-900 px-5 py-3 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-60"
      >
        {status === "loading" ? "Saving…" : "Get the weekly letter"}
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
