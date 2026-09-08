"use client";

import { useState } from "react";

const TIMEZONES = [
  "Asia/Singapore (SGT)",
  "Asia/Hong_Kong (HKT)",
  "Asia/Tokyo (JST)",
  "Australia/Sydney (AEST)",
  "Pacific/Auckland (NZST)",
  "Europe/London (GMT/BST)",
  "America/New_York (ET)",
  "America/Los_Angeles (PT)",
  "Other",
];

const EXPERIENCE = ["None", "<1y", "1–3y", "3–5y", "5y+"];
const LEVELS = ["Beginner", "Intermediate", "Advanced"];
const MARKETS = ["US equities", "Options", "Futures", "Crypto", "FX", "Other"];
const ACCOUNT_BANDS = [
  "<S$10k",
  "10–50k",
  "50–250k",
  "250k–1M",
  "1M+",
  "Prefer not to say",
];
const GOALS = [
  "Learn indicators",
  "Allocation clarity",
  "Join members",
  "Seminar follow-up",
  "Other",
];
const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const WINDOWS = ["Morning SGT", "Afternoon SGT", "Evening SGT"];
const PLATFORMS = ["Zoom", "Google Meet", "Either"];
const HEAR = ["Seminar", "Friend", "Site", "Social", "Other"];

const field =
  "w-full rounded-xl border border-white/15 bg-slate-900/80 px-4 py-3 text-sm text-white outline-none ring-canary-gold placeholder:text-slate-500 focus:ring-2";
const labelCls = "mb-1.5 block text-xs font-medium text-slate-300";

function toggle(list: string[], value: string): string[] {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
}

export function TuitionForm() {
  const [status, setStatus] = useState<"idle" | "loading" | "ok" | "err">("idle");
  const [message, setMessage] = useState("");
  const [markets, setMarkets] = useState<string[]>([]);
  const [days, setDays] = useState<string[]>([]);
  const [windows, setWindows] = useState<string[]>([]);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("loading");
    const fd = new FormData(e.currentTarget);
    const payload = {
      fullName: String(fd.get("fullName") || "").trim(),
      email: String(fd.get("email") || "").trim(),
      mobile: String(fd.get("mobile") || "").trim(),
      timezone: String(fd.get("timezone") || "").trim(),
      experience: String(fd.get("experience") || "").trim(),
      level: String(fd.get("level") || "").trim(),
      markets,
      accountSize: String(fd.get("accountSize") || "").trim(),
      primaryGoal: String(fd.get("primaryGoal") || "").trim(),
      goalDetail: String(fd.get("goalDetail") || "").trim(),
      preferredDays: days,
      timeWindows: windows,
      videoPlatform: String(fd.get("videoPlatform") || "").trim(),
      isMember: String(fd.get("isMember") || "").trim(),
      hearAbout: String(fd.get("hearAbout") || "").trim(),
      consent: fd.get("consent") === "on",
      notes: String(fd.get("notes") || "").trim(),
      source: "tuition",
    };

    if (!markets.length || !days.length || !windows.length) {
      setStatus("err");
      setMessage("Please select markets, preferred days, and time windows.");
      return;
    }
    if (!payload.consent) {
      setStatus("err");
      setMessage("Consent is required.");
      return;
    }

    try {
      const res = await fetch("/api/tuition", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setStatus("err");
        setMessage(data.error || "Something went wrong");
        return;
      }
      setStatus("ok");
      setMessage(data.message || "Saved (stub — no charge, no email).");
      e.currentTarget.reset();
      setMarkets([]);
      setDays([]);
      setWindows([]);
    } catch {
      setStatus("err");
      setMessage("Network error");
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5" id="tuition-form">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className={labelCls} htmlFor="fullName">
            Full name *
          </label>
          <input id="fullName" name="fullName" required className={field} />
        </div>
        <div>
          <label className={labelCls} htmlFor="email">
            Email *
          </label>
          <input id="email" name="email" type="email" required className={field} />
        </div>
        <div>
          <label className={labelCls} htmlFor="mobile">
            Mobile / WhatsApp *
          </label>
          <input
            id="mobile"
            name="mobile"
            type="tel"
            required
            placeholder="+65 …"
            className={field}
          />
        </div>
        <div>
          <label className={labelCls} htmlFor="timezone">
            Timezone *
          </label>
          <select
            id="timezone"
            name="timezone"
            required
            defaultValue="Asia/Singapore (SGT)"
            className={field}
          >
            {TIMEZONES.map((z) => (
              <option key={z} value={z}>
                {z}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelCls} htmlFor="experience">
            Trading experience *
          </label>
          <select id="experience" name="experience" required defaultValue="" className={field}>
            <option value="" disabled>
              Select…
            </option>
            {EXPERIENCE.map((x) => (
              <option key={x} value={x}>
                {x}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelCls} htmlFor="level">
            Self-described level *
          </label>
          <select id="level" name="level" required defaultValue="" className={field}>
            <option value="" disabled>
              Select…
            </option>
            {LEVELS.map((x) => (
              <option key={x} value={x}>
                {x}
              </option>
            ))}
          </select>
        </div>
        <div className="sm:col-span-2">
          <p className={labelCls}>Markets you trade *</p>
          <div className="flex flex-wrap gap-2">
            {MARKETS.map((m) => (
              <label
                key={m}
                className={`cursor-pointer rounded-full px-3 py-1.5 text-xs ring-1 ${
                  markets.includes(m)
                    ? "bg-canary-gold/20 text-canary-gold ring-canary-gold/40"
                    : "bg-slate-900 text-slate-400 ring-white/15"
                }`}
              >
                <input
                  type="checkbox"
                  className="sr-only"
                  checked={markets.includes(m)}
                  onChange={() => setMarkets(toggle(markets, m))}
                />
                {m}
              </label>
            ))}
          </div>
        </div>
        <div>
          <label className={labelCls} htmlFor="accountSize">
            Approximate account size *
          </label>
          <select id="accountSize" name="accountSize" required defaultValue="" className={field}>
            <option value="" disabled>
              Select band…
            </option>
            {ACCOUNT_BANDS.map((x) => (
              <option key={x} value={x}>
                {x}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelCls} htmlFor="primaryGoal">
            Primary goal *
          </label>
          <select id="primaryGoal" name="primaryGoal" required defaultValue="" className={field}>
            <option value="" disabled>
              Select…
            </option>
            {GOALS.map((x) => (
              <option key={x} value={x}>
                {x}
              </option>
            ))}
          </select>
        </div>
        <div className="sm:col-span-2">
          <label className={labelCls} htmlFor="goalDetail">
            Goal detail
          </label>
          <textarea
            id="goalDetail"
            name="goalDetail"
            rows={2}
            placeholder="Optional"
            className={field}
          />
        </div>
        <div className="sm:col-span-2">
          <p className={labelCls}>Preferred days *</p>
          <div className="flex flex-wrap gap-2">
            {DAYS.map((d) => (
              <label
                key={d}
                className={`cursor-pointer rounded-full px-3 py-1.5 text-xs ring-1 ${
                  days.includes(d)
                    ? "bg-canary-gold/20 text-canary-gold ring-canary-gold/40"
                    : "bg-slate-900 text-slate-400 ring-white/15"
                }`}
              >
                <input
                  type="checkbox"
                  className="sr-only"
                  checked={days.includes(d)}
                  onChange={() => setDays(toggle(days, d))}
                />
                {d}
              </label>
            ))}
          </div>
        </div>
        <div className="sm:col-span-2">
          <p className={labelCls}>Preferred time windows *</p>
          <div className="flex flex-wrap gap-2">
            {WINDOWS.map((w) => (
              <label
                key={w}
                className={`cursor-pointer rounded-full px-3 py-1.5 text-xs ring-1 ${
                  windows.includes(w)
                    ? "bg-canary-gold/20 text-canary-gold ring-canary-gold/40"
                    : "bg-slate-900 text-slate-400 ring-white/15"
                }`}
              >
                <input
                  type="checkbox"
                  className="sr-only"
                  checked={windows.includes(w)}
                  onChange={() => setWindows(toggle(windows, w))}
                />
                {w}
              </label>
            ))}
          </div>
        </div>
        <div>
          <label className={labelCls} htmlFor="videoPlatform">
            Video platform preference
          </label>
          <select
            id="videoPlatform"
            name="videoPlatform"
            defaultValue="Either"
            className={field}
          >
            {PLATFORMS.map((x) => (
              <option key={x} value={x}>
                {x}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelCls} htmlFor="isMember">
            Are you a Coherant Canary member?
          </label>
          <select id="isMember" name="isMember" defaultValue="No" className={field}>
            <option value="Yes">Yes</option>
            <option value="No">No</option>
          </select>
        </div>
        <div className="sm:col-span-2">
          <label className={labelCls} htmlFor="hearAbout">
            How did you hear about this?
          </label>
          <select id="hearAbout" name="hearAbout" defaultValue="" className={field}>
            <option value="">Select…</option>
            {HEAR.map((x) => (
              <option key={x} value={x}>
                {x}
              </option>
            ))}
          </select>
        </div>
        <div className="sm:col-span-2">
          <label className={labelCls} htmlFor="notes">
            Notes for Shaun
          </label>
          <textarea
            id="notes"
            name="notes"
            rows={3}
            placeholder="Optional"
            className={field}
          />
        </div>
        <div className="sm:col-span-2">
          <label className="flex items-start gap-3 text-sm text-slate-300">
            <input
              type="checkbox"
              name="consent"
              required
              className="mt-1 h-4 w-4 rounded border-white/20 bg-slate-900 text-canary-gold focus:ring-canary-gold"
            />
            <span>
              I understand this is education only — not financial advice — and tuition is{" "}
              <strong className="text-white">S$115 / hour</strong>. No charge until Shaun confirms
              a session. *
            </span>
          </label>
        </div>
      </div>

      <div className="rounded-xl border border-canary-gold/25 bg-amber-500/10 px-4 py-3 text-sm text-slate-200">
        Pricing reminder: <strong className="text-white">S$115 / hour</strong> · online video call.
        Submit stores the lead locally — <em>no charge</em>, no email send in design mode.
      </div>

      <button
        type="submit"
        disabled={status === "loading"}
        className="w-full rounded-xl bg-canary-gold px-5 py-3 text-sm font-semibold text-slate-950 hover:bg-yellow-400 disabled:opacity-60 sm:w-auto"
      >
        {status === "loading" ? "Saving…" : "Request tuition session"}
      </button>

      {message ? (
        <p
          className={`text-sm ${status === "ok" ? "text-canary-green" : "text-canary-red"}`}
          role="status"
        >
          {message}
        </p>
      ) : null}
    </form>
  );
}
