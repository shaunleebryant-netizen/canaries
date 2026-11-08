"use client";

import { useState } from "react";
import { Honeypot } from "@/components/Honeypot";

/**
 * Coming-soon landing (owner t766u, 25/10/2026). Collects emails into the same D1 `leads`
 * path as the weekly letter (/api/newsletter, double opt-in) with tags:
 * letter (subscribe), founding_interest, launch_updates.
 */
export function ComingSoon() {
  const [status, setStatus] = useState<"idle" | "loading" | "ok" | "err">("idle");
  const [message, setMessage] = useState("");

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    const consent = fd.get("consent") === "on";
    const founding = fd.get("founding_interest") === "on";
    const launch = fd.get("launch_updates") === "on";
    if (!consent && !founding && !launch) {
      setStatus("err");
      setMessage("Please tick at least one option.");
      return;
    }
    setStatus("loading");
    try {
      const res = await fetch("/api/newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: String(fd.get("email") || "").trim(),
          source: "letter",
          consent,
          founding_interest: founding,
          launch_updates: launch,
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
      setMessage(data.message || "Thanks, you're on the list.");
      form.reset();
    } catch {
      setStatus("err");
      setMessage("Network error. Please try again.");
    }
  }

  const box =
    "mt-0.5 h-4 w-4 shrink-0 rounded border-white/20 bg-slate-900 accent-canary-gold";

  return (
    <main className="flex min-h-[80vh] items-center justify-center px-4 py-16">
      <div className="w-full max-w-xl text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-canary-gold">
          Coming soon
        </p>
        <h1 className="mt-3 text-4xl font-bold text-white sm:text-5xl">Canary Dashboard</h1>
        <p className="mt-4 text-lg text-slate-300">
          Trust numbers, not headlines. Proprietary algorithms to find high probability pivots.
        </p>
        <p className="mt-3 text-base font-medium text-white">
          Launching Jan 2027
        </p>

        <form
          onSubmit={onSubmit}
          className="relative mx-auto mt-8 w-full max-w-md rounded-2xl border border-white/10 bg-slate-900/60 p-5 text-left"
        >
          <Honeypot />
          <label className="sr-only" htmlFor="cs-email">Email address</label>
          <input
            id="cs-email"
            name="email"
            type="email"
            required
            autoComplete="email"
            inputMode="email"
            placeholder="you@example.com"
            className="w-full rounded-xl border border-white/15 bg-slate-900/80 px-4 py-3 text-sm text-white outline-none ring-canary-gold placeholder:text-slate-500 focus:ring-2"
          />
          <fieldset className="mt-4 space-y-3 text-sm text-slate-300">
            <legend className="mb-2 text-sm font-semibold text-white">Keep me posted on:</legend>
            <label className="flex items-start gap-2.5">
              <input type="checkbox" name="launch_updates" defaultChecked className={box} />
              <span>Launch updates: tell me when Canary Dashboard opens.</span>
            </label>
            <label className="flex items-start gap-2.5">
              <input type="checkbox" name="founding_interest" className={box} />
              <span>
                Founding membership: I&apos;m interested in being a founding member. Founding
                discounts are limited, so I want first notice when spots open.
              </span>
            </label>
            <label className="flex items-start gap-2.5">
              <input type="checkbox" name="consent" className={box} />
              <span>Subscribe: email me the free weekly Canary letter. Unsubscribe any time.</span>
            </label>
          </fieldset>
          <button
            type="submit"
            disabled={status === "loading"}
            className="mt-5 w-full rounded-xl bg-canary-gold px-5 py-3 text-sm font-semibold text-slate-950 hover:bg-yellow-400 disabled:opacity-60"
          >
            {status === "loading" ? "Sending…" : "Join the list"}
          </button>
          <p className="mt-3 text-xs leading-relaxed text-slate-500">
            We&apos;ll email you a link to confirm first. We only use your address for Canary
            Dashboard news and the letter. Education only, not investment advice.
          </p>
          {message ? (
            <p role="status" className={`mt-3 text-sm ${status === "ok" ? "text-canary-green" : "text-canary-red"}`}>
              {message}
            </p>
          ) : null}
        </form>

        <p className="mt-8 text-sm text-slate-400">
          Already a member? <a href="/members" className="text-canary-gold hover:underline">Sign in to the dashboard</a>
        </p>
      </div>
    </main>
  );
}
