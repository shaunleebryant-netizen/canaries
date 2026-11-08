"use client";

import Link from "next/link";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";

/**
 * Public-header "Subscribe" item (owner t943u, 2026-11-02): email-list preferences, not checkout.
 * Same accessible-modal pattern as BookingModalButton. Posts to /api/subscribe (D1 leads, double opt-in).
 */
type Topic = "weekly_setups" | "events" | "product_updates" | "member_alerts" | "course_openings";

const OPTIONS: { key: Topic; label: string; sub: string; membersOnly?: boolean }[] = [
  {
    key: "weekly_setups",
    label: "Weekly setups & market update (bullish and bearish)",
    sub: "The free weekly letter on market conditions, plus a digest of bullish and bearish setups to study.",
  },
  {
    key: "events",
    label: "Future events, seminars & webinars",
    sub: "Dates and seats for upcoming live sessions.",
  },
  {
    key: "product_updates",
    label: "Dashboard product updates",
    sub: "New scanners, layout changes, price changes. Rare, never marketing spam.",
  },
  {
    key: "member_alerts",
    label: "Crypto Fish / MFI / Fairy alerts on stocks and crypto",
    sub: "Indicator condition alerts, for education and your own analysis.",
    membersOnly: true,
  },
  {
    key: "course_openings",
    label: "Course / Foundations openings",
    sub: "When a new cohort or module opens.",
  },
];

type Viewer = { signedIn: boolean; email: string | null; member: boolean };

export function SubscribeNavButton({
  className = "hover:text-canary-gold",
  label = "Subscribe",
}: {
  className?: string;
  label?: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [viewer, setViewer] = useState<Viewer>({ signedIn: false, email: null, member: false });
  const [email, setEmail] = useState("");
  const [picked, setPicked] = useState<Set<Topic>>(new Set());
  const [state, setState] = useState<"idle" | "sending" | "done">("idle");
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const titleId = useId();

  useEffect(() => setMounted(true), []);

  const close = useCallback(() => {
    setOpen(false);
    requestAnimationFrame(() => triggerRef.current?.focus());
  }, []);

  useEffect(() => {
    if (!open) return;
    setState("idle");
    setMsg(null);
    setErr(null);
    fetch("/api/subscribe", { credentials: "same-origin" })
      .then((r) => (r.ok ? r.json() : null))
      .then((v: Viewer | null) => v && setViewer(v))
      .catch(() => {});
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        close();
      }
    };
    document.addEventListener("keydown", onKey);
    requestAnimationFrame(() => closeRef.current?.focus());
    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener("keydown", onKey);
    };
  }, [open, close]);

  const toggle = (k: Topic) =>
    setPicked((s) => {
      const n = new Set(s);
      if (n.has(k)) n.delete(k);
      else n.add(k);
      return n;
    });

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErr(null);
    const topics = [...picked].filter((t) => viewer.member || t !== "member_alerts");
    if (!topics.length) return setErr("Pick at least one option.");
    if (!viewer.signedIn && !email.trim()) return setErr("Please enter your email.");
    setState("sending");
    try {
      const hp = (e.currentTarget.elements.namedItem("hp_field") as HTMLInputElement | null)?.value ?? "";
      const r = await fetch("/api/subscribe", {
        method: "POST",
        headers: { "content-type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ email: email.trim(), topics, hp_field: hp }),
      });
      const j = (await r.json().catch(() => ({}))) as { ok?: boolean; message?: string; error?: string };
      if (!r.ok || !j.ok) {
        setState("idle");
        return setErr(j.error || "Something went wrong. Please try again.");
      }
      setState("done");
      setMsg(j.message || "Saved.");
    } catch {
      setState("idle");
      setErr("Network error. Please try again.");
    }
  }

  return (
    <>
      <button ref={triggerRef} type="button" onClick={() => setOpen(true)} aria-haspopup="dialog" className={className}>
        {label}
      </button>
      {mounted && open
        ? createPortal(
            <div
              className="fixed inset-0 z-[100] flex items-center justify-center bg-black/85 p-3 sm:p-6"
              onClick={close}
              role="presentation"
            >
              <div
                role="dialog"
                aria-modal="true"
                aria-labelledby={titleId}
                className="relative flex max-h-[92vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-white/10 bg-slate-950 shadow-2xl"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex shrink-0 items-start justify-between gap-4 border-b border-white/10 px-5 py-4">
                  <div>
                    <h2 id={titleId} className="text-lg font-semibold text-white">
                      What do you want by email?
                    </h2>
                    <p className="mt-0.5 text-xs text-slate-400">
                      Pick any. Education only, unsubscribe any time. Membership is separate, on{" "}
                      <Link href="/signup" onClick={close} className="text-canary-gold hover:underline">
                        Join
                      </Link>
                      .
                    </p>
                  </div>
                  <button
                    ref={closeRef}
                    type="button"
                    onClick={close}
                    aria-label="Close"
                    className="rounded-lg px-2 py-1 text-lg leading-none text-slate-400 hover:bg-white/5 hover:text-white"
                  >
                    ×
                  </button>
                </div>
                <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
                  {state === "done" ? (
                    <div className="space-y-4">
                      <p className="text-sm text-emerald-300">{msg}</p>
                      <button
                        type="button"
                        onClick={close}
                        className="rounded-lg bg-canary-gold px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-yellow-400"
                      >
                        Close
                      </button>
                    </div>
                  ) : (
                    <form onSubmit={submit} className="space-y-4" noValidate>
                      <fieldset className="space-y-2">
                        <legend className="sr-only">Email topics</legend>
                        {OPTIONS.map((o) => {
                          const locked = o.membersOnly && !viewer.member;
                          return (
                            <label
                              key={o.key}
                              className={`flex gap-3 rounded-xl border border-white/10 p-3 ${
                                locked ? "cursor-not-allowed opacity-50" : "cursor-pointer hover:border-canary-gold/40"
                              }`}
                            >
                              <input
                                type="checkbox"
                                className="mt-1 h-4 w-4 shrink-0 accent-yellow-400"
                                checked={!locked && picked.has(o.key)}
                                disabled={locked}
                                onChange={() => toggle(o.key)}
                              />
                              <span className="min-w-0">
                                <span className="block text-sm font-medium text-white">
                                  {o.label}
                                  {o.membersOnly ? (
                                    <span className="ml-2 rounded bg-white/10 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-slate-300">
                                      Members only
                                    </span>
                                  ) : null}
                                </span>
                                <span className="mt-0.5 block text-xs text-slate-400">{o.sub}</span>
                                {locked ? (
                                  <Link
                                    href="/signup"
                                    onClick={close}
                                    className="mt-1 inline-block text-xs text-canary-gold hover:underline"
                                  >
                                    Join to unlock
                                  </Link>
                                ) : null}
                              </span>
                            </label>
                          );
                        })}
                      </fieldset>
                      {viewer.signedIn ? (
                        <p className="text-xs text-slate-400">
                          Sending to <span className="text-slate-200">{viewer.email}</span>
                        </p>
                      ) : (
                        <label className="block">
                          <span className="text-xs text-slate-300">Email</span>
                          <input
                            type="email"
                            required
                            autoComplete="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="mt-1 w-full rounded-lg border border-white/10 bg-slate-900 px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:border-canary-gold focus:outline-none"
                            placeholder="you@example.com"
                          />
                        </label>
                      )}
                      <input type="text" name="hp_field" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden />
                      {err ? <p className="text-xs text-rose-300">{err}</p> : null}
                      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                        <button
                          type="button"
                          onClick={close}
                          className="rounded-lg px-4 py-2 text-sm text-slate-300 hover:bg-white/5 hover:text-white"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          disabled={state === "sending"}
                          className="rounded-lg bg-canary-gold px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-yellow-400 disabled:opacity-60"
                        >
                          {state === "sending" ? "Saving…" : "Subscribe"}
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}

/** Shorter labels for the compact hero form (same topic keys as the lightbox). */
const SHORT: Record<Topic, string> = {
  weekly_setups: "Weekly setups, bullish & bearish + market update",
  events: "Future events & seminars",
  product_updates: "Dashboard product updates",
  member_alerts: "Crypto Fish / MFI / Fairy alerts",
  course_openings: "Course / Foundations openings",
};

/**
 * Owner 2026-11-02 (t970u): inline topic checkboxes in the hero box, same topics and
 * same /api/subscribe POST as the lightbox. Members-only alerts greyed for non-members.
 */
export function SubscribeInlineForm() {
  const [viewer, setViewer] = useState<Viewer>({ signedIn: false, email: null, member: false });
  const [email, setEmail] = useState("");
  const [picked, setPicked] = useState<Set<Topic>>(new Set(["weekly_setups"]));
  const [state, setState] = useState<"idle" | "sending" | "done">("idle");
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/subscribe", { credentials: "same-origin" })
      .then((r) => (r.ok ? r.json() : null))
      .then((v: Viewer | null) => v && setViewer(v))
      .catch(() => {});
  }, []);

  const toggle = (k: Topic) =>
    setPicked((s) => {
      const n = new Set(s);
      if (n.has(k)) n.delete(k);
      else n.add(k);
      return n;
    });

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErr(null);
    const topics = [...picked].filter((t) => viewer.member || t !== "member_alerts");
    if (!topics.length) return setErr("Pick at least one option.");
    if (!viewer.signedIn && !email.trim()) return setErr("Please enter your email.");
    setState("sending");
    try {
      const hp = (e.currentTarget.elements.namedItem("hp_field") as HTMLInputElement | null)?.value ?? "";
      const r = await fetch("/api/subscribe", {
        method: "POST",
        headers: { "content-type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ email: email.trim(), topics, hp_field: hp }),
      });
      const j = (await r.json().catch(() => ({}))) as { ok?: boolean; message?: string; error?: string };
      if (!r.ok || !j.ok) {
        setState("idle");
        return setErr(j.error || "Something went wrong. Please try again.");
      }
      setState("done");
      setMsg(j.message || "Saved.");
    } catch {
      setState("idle");
      setErr("Network error. Please try again.");
    }
  }

  if (state === "done") return <p className="mt-5 text-sm text-emerald-300">{msg}</p>;

  return (
    <form onSubmit={submit} className="mt-4 space-y-3" noValidate>
      <fieldset className="space-y-1.5">
        <legend className="sr-only">Email topics</legend>
        {OPTIONS.map((o) => {
          const locked = o.membersOnly && !viewer.member;
          return (
            <label
              key={o.key}
              className={`flex items-start gap-2.5 rounded-lg px-2 py-1.5 text-sm ${
                locked ? "cursor-not-allowed text-slate-500" : "cursor-pointer text-slate-200 hover:bg-white/5"
              }`}
            >
              <input
                type="checkbox"
                className="mt-0.5 h-4 w-4 shrink-0 accent-yellow-400"
                checked={!locked && picked.has(o.key)}
                disabled={locked}
                onChange={() => toggle(o.key)}
              />
              <span>
                {SHORT[o.key]}
                {locked ? (
                  <>
                    {" "}
                    <Link href="/signup" className="whitespace-nowrap text-xs text-canary-gold/80 hover:underline">
                      members only
                    </Link>
                  </>
                ) : null}
              </span>
            </label>
          );
        })}
      </fieldset>
      <input type="text" name="hp_field" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden />
      <div className="flex items-center gap-2">
        {viewer.signedIn ? (
          <p className="min-w-0 flex-1 truncate text-xs text-slate-400">
            Sending to <span className="text-slate-200">{viewer.email}</span>
          </p>
        ) : (
          <input
            type="email"
            required
            autoComplete="email"
            aria-label="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="min-w-0 flex-1 rounded-lg border border-white/10 bg-slate-900 px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:border-canary-gold focus:outline-none"
            placeholder="you@example.com"
          />
        )}
        <button
          type="submit"
          disabled={state === "sending"}
          className="shrink-0 rounded-lg bg-canary-gold px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-yellow-400 disabled:opacity-60"
        >
          {state === "sending" ? "Saving…" : "Subscribe"}
        </button>
      </div>
      {err ? <p className="text-xs text-rose-300">{err}</p> : null}
    </form>
  );
}
