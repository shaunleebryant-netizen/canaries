"use client";
import { useState } from "react";

const OPTS = [
  { v: "instant", l: "Instant", d: "as soon as the nightly pack finds news" },
  { v: "daily", l: "Daily digest", d: "one email after the nightly pack" },
  { v: "off", l: "Off", d: "no watchlist emails" },
] as const;
export function AlertPrefsToggle({ initial }: { initial: string }) {
  const [mode, setMode] = useState(initial);
  const [msg, setMsg] = useState("");
  async function pick(v: string) {
    const prev = mode; setMode(v); setMsg("Saving…");
    const r = await fetch("/api/account/alert-prefs", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ mode: v }) }).catch(() => null);
    if (r?.ok) setMsg("Saved."); else { setMode(prev); setMsg("Couldn’t save — try again."); }
  }
  return (
    <section id="alert-prefs" className="mt-8 rounded-2xl border border-white/10 p-5">
      <h2 className="text-sm font-semibold text-white">★ Watchlist alerts</h2>
      <p className="mt-1 text-xs text-slate-400">Email when a starred name enters Ideas, hits a Setup or crosses its wrong-if level. Education only.</p>
      <div role="radiogroup" className="mt-3 grid gap-2 sm:grid-cols-3">
        {OPTS.map((o) => (
          <button key={o.v} type="button" role="radio" aria-checked={mode === o.v} onClick={() => pick(o.v)}
            className={`rounded-xl border px-3 py-2 text-left text-xs ${mode === o.v ? "border-canary-gold bg-canary-gold/10 text-white" : "border-white/15 text-slate-300 hover:bg-white/5"}`}>
            <span className="block font-semibold">{o.l}</span><span className="text-slate-400">{o.d}</span>
          </button>
        ))}
      </div>
      <p className="mt-2 text-[11px] text-slate-500" aria-live="polite">{msg || "Default: daily digest."}</p>
    </section>
  );
}
