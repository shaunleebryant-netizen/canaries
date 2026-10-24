"use client";

import { useEffect, useId, useState } from "react";
import { Honeypot } from "@/components/Honeypot";

/**
 * Bookings form (owner approved 2026-10-09, t595u). Replaces TuitionForm. Two types:
 * a 1-to-1 class (canaries / indicators) or a speaking request for an event.
 * Posts to /api/bookings -> D1 `bookings`. No payment, no email. Amber accents (never yellow).
 */
export type BookingType = "class" | "speaking";

const TYPES: { id: BookingType; label: string; hint: string }[] = [
  { id: "class", label: "1-to-1 class (canaries / indicators)", hint: "Online video call with Shaun" },
  { id: "speaking", label: "Speaking at my event", hint: "Talk, panel or workshop" },
];
const TOPICS = ["Canaries", "Indicators", "Other"];

const field =
  "w-full rounded-xl border border-white/15 bg-slate-900/80 px-4 py-3 text-sm text-white outline-none ring-amber-400 placeholder:text-slate-500 focus:ring-2";
const labelCls = "mb-1.5 block text-xs font-medium text-slate-300";

export function BookingForm({
  initialType = "class",
  origin = "bookings",
}: {
  initialType?: BookingType;
  origin?: "bookings" | "members";
}) {
  const uid = useId();
  const id = (k: string) => `${uid}-${k}`;
  const [type, setType] = useState<BookingType>(initialType);
  const [timezone, setTimezone] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "ok" | "err">("idle");
  const [message, setMessage] = useState("");

  // Timezone is filled in automatically from the browser; the person can still edit it.
  useEffect(() => {
    try {
      setTimezone((tz) => tz || Intl.DateTimeFormat().resolvedOptions().timeZone || "");
    } catch {
      /* leave blank */
    }
  }, []);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    const s = (k: string) => String(fd.get(k) || "").trim();
    const payload = {
      type,
      name: s("name"),
      email: s("email"),
      timezone: timezone.trim(),
      preferredTimes: s("preferredTimes"),
      message: s("message"),
      topic: s("topic"),
      organisation: s("organisation"),
      eventName: s("eventName"),
      eventDate: s("eventDate"),
      eventLocation: s("eventLocation"),
      audienceSize: s("audienceSize"),
      origin,
      hp_field: String(fd.get("hp_field") || ""),
    };
    setStatus("loading");
    setMessage("");
    try {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) {
        setStatus("err");
        setMessage(data.error || "Something went wrong. Please try again.");
        return;
      }
      setStatus("ok");
      setMessage(data.message || "Thanks — your booking request is saved.");
      form.reset();
    } catch {
      setStatus("err");
      setMessage("Network error. Please try again.");
    }
  }

  if (status === "ok") {
    return (
      <div
        role="status"
        className="rounded-2xl border border-amber-400/30 bg-amber-500/10 p-5 text-sm leading-relaxed text-amber-50"
      >
        {message}
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="relative space-y-5" id={origin === "members" ? "booking-form-members" : "booking-form"}>
      <Honeypot />

      <fieldset>
        <legend className={labelCls}>What would you like to book? *</legend>
        <div className="grid gap-2 sm:grid-cols-2" role="radiogroup">
          {TYPES.map((t) => {
            const on = type === t.id;
            return (
              <label
                key={t.id}
                className={`cursor-pointer rounded-xl px-4 py-3 text-sm ring-1 transition ${
                  on
                    ? "bg-amber-500/15 text-amber-100 ring-amber-400/60"
                    : "bg-slate-900 text-slate-300 ring-white/15 hover:ring-white/30"
                }`}
              >
                <input
                  type="radio"
                  name="type"
                  value={t.id}
                  checked={on}
                  onChange={() => setType(t.id)}
                  className="sr-only"
                />
                <span className="block font-semibold">{t.label}</span>
                <span className="mt-0.5 block text-xs text-slate-400">{t.hint}</span>
              </label>
            );
          })}
        </div>
      </fieldset>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className={labelCls} htmlFor={id("name")}>Name *</label>
          <input id={id("name")} name="name" required maxLength={100} autoComplete="name" className={field} />
        </div>
        <div>
          <label className={labelCls} htmlFor={id("email")}>Email *</label>
          <input id={id("email")} name="email" type="email" required autoComplete="email" className={field} />
        </div>

        {type === "class" ? (
          <div className="sm:col-span-2">
            <label className={labelCls} htmlFor={id("topic")}>Topic *</label>
            <select id={id("topic")} name="topic" required defaultValue="Canaries" className={field}>
              {TOPICS.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
        ) : (
          <>
            <div>
              <label className={labelCls} htmlFor={id("organisation")}>Organisation *</label>
              <input id={id("organisation")} name="organisation" required maxLength={150} autoComplete="organization" className={field} />
            </div>
            <div>
              <label className={labelCls} htmlFor={id("eventName")}>Event name *</label>
              <input id={id("eventName")} name="eventName" required maxLength={150} className={field} />
            </div>
            <div>
              <label className={labelCls} htmlFor={id("eventDate")}>Event date</label>
              <input id={id("eventDate")} name="eventDate" type="date" className={field} />
            </div>
            <div>
              <label className={labelCls} htmlFor={id("eventLocation")}>City, or Online *</label>
              <input id={id("eventLocation")} name="eventLocation" required maxLength={120} placeholder="e.g. Singapore, or Online" className={field} />
            </div>
            <div className="sm:col-span-2">
              <label className={labelCls} htmlFor={id("audienceSize")}>Audience size</label>
              <input id={id("audienceSize")} name="audienceSize" maxLength={40} placeholder="e.g. 50–100" className={field} />
            </div>
          </>
        )}

        <div>
          <label className={labelCls} htmlFor={id("timezone")}>Your timezone</label>
          <input
            id={id("timezone")}
            name="timezone"
            value={timezone}
            onChange={(e) => setTimezone(e.target.value)}
            maxLength={80}
            placeholder="e.g. Asia/Singapore"
            className={field}
          />
        </div>
        <div>
          <label className={labelCls} htmlFor={id("preferredTimes")}>Preferred dates / times *</label>
          <input
            id={id("preferredTimes")}
            name="preferredTimes"
            required
            maxLength={500}
            placeholder={type === "class" ? "e.g. weekday evenings, from 20 Oct" : "e.g. any time that suits the event"}
            className={field}
          />
        </div>
        <div className="sm:col-span-2">
          <label className={labelCls} htmlFor={id("message")}>Message</label>
          <textarea
            id={id("message")}
            name="message"
            rows={3}
            maxLength={2000}
            placeholder={type === "class" ? "What would you like to cover? (optional)" : "Tell Shaun about the event and audience (optional)"}
            className={field}
          />
        </div>
      </div>

      <p className="text-xs text-slate-400">
        No payment is taken now. Shaun replies by email to confirm a time. Education only, not
        financial advice.
      </p>

      <button
        type="submit"
        disabled={status === "loading"}
        className="w-full rounded-xl bg-amber-500 px-5 py-3 text-sm font-semibold text-slate-950 hover:bg-amber-400 disabled:opacity-60 sm:w-auto"
      >
        {status === "loading" ? "Saving…" : type === "class" ? "Request a class" : "Request a speaking booking"}
      </button>

      {status === "err" && message ? (
        <p className="text-sm text-canary-red" role="alert">
          {message}
        </p>
      ) : null}
    </form>
  );
}
