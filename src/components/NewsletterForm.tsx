"use client";

import { useState } from "react";
import { Honeypot } from "@/components/Honeypot";

/**
 * Free weekly letter signup (double opt-in). Posts to /api/newsletter, which stores the
 * address as `pending`; a confirmation link is emailed before anything else is sent
 * (only once email sending is switched on).
 */
export function NewsletterForm({
  source = "letter",
  buttonLabel = "Send me the letter",
  showFoundingOption = true,
}: {
  source?: "letter" | "seminar";
  buttonLabel?: string;
  showFoundingOption?: boolean;
}) {
  const [status, setStatus] = useState<"idle" | "loading" | "ok" | "err">("idle");
  const [message, setMessage] = useState("");
  const id = `nl-${source}`;

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    if (fd.get("consent") !== "on") {
      setStatus("err");
      setMessage("Please tick the box to confirm you'd like the letter.");
      return;
    }
    setStatus("loading");
    try {
      const res = await fetch("/api/newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: String(fd.get("email") || "").trim(),
          source,
          consent: true,
          founding_interest: fd.get("founding_interest") === "on",
          hp_field: String(fd.get("hp_field") || ""),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) {
        setStatus("err");
        setMessage(data.error || "Something went wrong. Please try again.");
        return;
      }
      setStatus("ok");
      setMessage(data.message || "Thanks, you're signed up.");
      form.reset();
    } catch {
      setStatus("err");
      setMessage("Network error. Please try again.");
    }
  }

  return (
    <form onSubmit={onSubmit} className="relative mx-auto w-full max-w-md text-left" noValidate={false}>
      <Honeypot />
      <div className="flex flex-col gap-3 sm:flex-row">
        <label className="sr-only" htmlFor={`${id}-email`}>
          Email address
        </label>
        <input
          id={`${id}-email`}
          name="email"
          type="email"
          required
          autoComplete="email"
          inputMode="email"
          placeholder="you@example.com"
          className="min-w-0 flex-1 rounded-xl border border-white/15 bg-slate-900/80 px-4 py-3 text-sm text-white outline-none ring-canary-gold placeholder:text-slate-500 focus:ring-2"
        />
        <button
          type="submit"
          disabled={status === "loading"}
          className="shrink-0 rounded-xl bg-canary-gold px-5 py-3 text-sm font-semibold text-slate-950 hover:bg-yellow-400 disabled:opacity-60"
        >
          {status === "loading" ? "Sending…" : buttonLabel}
        </button>
      </div>

      {showFoundingOption ? (
        <label className="mt-4 flex items-start gap-2.5 text-sm text-slate-300">
          <input
            type="checkbox"
            name="founding_interest"
            className="mt-0.5 h-4 w-4 shrink-0 rounded border-white/20 bg-slate-900 accent-canary-gold"
          />
          <span>Also tell me when founding member spots are running out.</span>
        </label>
      ) : null}

      <label className="mt-3 flex items-start gap-2.5 text-sm text-slate-300">
        <input
          type="checkbox"
          name="consent"
          required
          className="mt-0.5 h-4 w-4 shrink-0 rounded border-white/20 bg-slate-900 accent-canary-gold"
        />
        <span>
          Yes, email me the free weekly Canary letter. I can unsubscribe any time with one
          click.
        </span>
      </label>

      <p className="mt-3 text-xs leading-relaxed text-slate-500">
        We&apos;ll email you a link to confirm first. We only use your address for the letter
        and Canary Dashboard news. Education only, not investment advice.
      </p>

      {message ? (
        <p
          role="status"
          className={`mt-3 text-sm ${status === "ok" ? "text-canary-green" : "text-canary-red"}`}
        >
          {message}
        </p>
      ) : null}
    </form>
  );
}
