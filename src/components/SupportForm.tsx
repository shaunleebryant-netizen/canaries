"use client";

import { Honeypot } from "@/components/Honeypot";
import { useState } from "react";

const ISSUE_TYPES = [
  { value: "login", label: "Login" },
  { value: "billing", label: "Billing" },
  { value: "dashboard", label: "Dashboard" },
  { value: "other", label: "Other" },
] as const;

const field =
  "w-full rounded-xl border border-white/15 bg-slate-900/80 px-4 py-3 text-sm text-white outline-none ring-canary-gold placeholder:text-slate-500 focus:ring-2";
const labelCls = "mb-1.5 block text-xs font-medium text-slate-300";

export function SupportForm() {
  const [status, setStatus] = useState<"idle" | "loading" | "ok" | "err">("idle");
  const [message, setMessage] = useState("");

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("loading");
    const form = e.currentTarget;
    const fd = new FormData(form);
    const payload = {
      name: String(fd.get("name") || "").trim(),
      email: String(fd.get("email") || "").trim(),
      issueType: String(fd.get("issueType") || "").trim(),
      message: String(fd.get("message") || "").trim(),
      source: "support",
      hp_field: String(fd.get("hp_field") || ""),
    };

    try {
      const res = await fetch("/api/support", {
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
      setMessage(data.message || "Message saved.");
      form.reset();
    } catch {
      setStatus("err");
      setMessage("Network error");
    }
  }

  return (
    <div className="w-full max-w-lg">
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <Honeypot />
        <div>
          <label className={labelCls} htmlFor="support-name">
            Name
          </label>
          <input
            id="support-name"
            name="name"
            type="text"
            required
            autoComplete="name"
            className={field}
            placeholder="Your name"
          />
        </div>
        <div>
          <label className={labelCls} htmlFor="support-email">
            Email
          </label>
          <input
            id="support-email"
            name="email"
            type="email"
            required
            autoComplete="email"
            className={field}
            placeholder="you@example.com"
          />
        </div>
        <div>
          <label className={labelCls} htmlFor="support-issue">
            Issue type
          </label>
          <select id="support-issue" name="issueType" required className={field} defaultValue="login">
            {ISSUE_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelCls} htmlFor="support-message">
            Message
          </label>
          <textarea
            id="support-message"
            name="message"
            required
            rows={5}
            className={field}
            placeholder="How can we help?"
          />
        </div>
        <button
          type="submit"
          disabled={status === "loading"}
          className="rounded-xl bg-canary-gold px-5 py-3 text-sm font-semibold text-slate-950 hover:bg-yellow-400 disabled:opacity-60"
        >
          {status === "loading" ? "Sending…" : "Send message"}
        </button>
      </form>
      {status === "ok" || status === "err" ? (
        <p
          role="status"
          className={`mt-3 text-sm ${status === "ok" ? "text-emerald-400" : "text-red-400"}`}
        >
          {message}
        </p>
      ) : null}
    </div>
  );
}
