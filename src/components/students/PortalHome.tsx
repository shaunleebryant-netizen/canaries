"use client";
import { useEffect, useState } from "react";
import { MODULES, MOCK_BOOKINGS, MOCK_HOURS, empty, load, reset, unlocked, type Progress } from "./data";

export function PortalHome() {
  const [p, setP] = useState<Progress>(empty());
  useEffect(() => setP(load()), []);
  const done = MODULES.filter((_, i) => p.video[i] && p.quiz[i]).length;
  const quizzes = p.quiz.filter(Boolean).length;
  const next = MODULES.findIndex((_, i) => !(p.video[i] && p.quiz[i]));
  const checks = [
    { t: "All 8 module quizzes passed", ok: quizzes === 8, s: `${quizzes} / 8` },
    { t: "At least 8 hours with Shaun (stamped by Shaun)", ok: MOCK_HOURS >= 8, s: `${MOCK_HOURS} / 8 hrs` },
    { t: "Practical exam on a demo account (marked by Shaun)", ok: false, s: "Not started" },
  ];
  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-medium uppercase tracking-widest text-amber-400">Canary Foundations · Student portal</p>
          <h1 className="mt-2 text-3xl font-semibold text-white">Welcome back, Student</h1>
        </div>
        {next >= 0 && (
          <a href={`/students/module/${next + 1}`} className="rounded-full bg-amber-400 px-6 py-3 text-sm font-semibold text-slate-950 hover:bg-amber-300">
            Continue · Module {next + 1}
          </a>
        )}
      </div>

      <div className="mt-8 rounded-2xl border border-white/10 bg-slate-900/60 p-6">
        <div className="flex justify-between text-sm"><span className="text-slate-300">Course progress</span><span className="text-amber-400">{done} / 8 modules</span></div>
        <div className="mt-3 h-2 rounded-full bg-slate-800"><div className="h-2 rounded-full bg-amber-400 transition-all" style={{ width: `${(done / 8) * 100}%` }} /></div>
      </div>

      <div className="mt-8 grid gap-6 md:grid-cols-[1.6fr_1fr]">
        <section>
          <h2 className="text-xs font-semibold uppercase tracking-widest text-amber-400">Modules</h2>
          <ol className="mt-4 space-y-3">
            {MODULES.map((m, i) => {
              const open = unlocked(p, i);
              const complete = p.video[i] && p.quiz[i];
              const status = complete ? "Complete" : p.video[i] ? "Quiz next" : open ? "Ready" : "Locked";
              const inner = (
                <div className={`flex items-center gap-4 rounded-xl border p-4 ${open ? "border-white/10 bg-slate-900/60 hover:border-amber-400/60" : "border-white/5 bg-slate-900/20 opacity-50"}`}>
                  <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-full text-sm font-semibold ${complete ? "bg-emerald-500 text-slate-950" : open ? "bg-amber-400 text-slate-950" : "bg-slate-800 text-slate-500"}`}>
                    {complete ? "✓" : open ? i + 1 : "🔒"}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-white">Module {i + 1}: {m.t}</p>
                    <p className="truncate text-xs text-slate-400">{m.d}</p>
                  </div>
                  <span className="text-xs text-slate-400">{status}</span>
                </div>
              );
              return <li key={i}>{open ? <a href={`/students/module/${i + 1}`}>{inner}</a> : inner}</li>;
            })}
          </ol>
          <button onClick={() => { reset(); setP(empty()); }} className="mt-4 text-xs text-slate-500 underline hover:text-slate-300">Reset demo progress</button>
        </section>

        <aside className="space-y-6">
          <section className="rounded-2xl border border-white/10 bg-slate-900/60 p-6">
            <h2 className="text-xs font-semibold uppercase tracking-widest text-amber-400">Certificate checklist</h2>
            <p className="mt-1 text-xs text-slate-400">Issued by Canary Dashboard Pte. Ltd.</p>
            <ul className="mt-4 space-y-3">
              {checks.map((c) => (
                <li key={c.t} className="flex gap-3 text-sm">
                  <span className={c.ok ? "text-emerald-400" : "text-slate-600"}>{c.ok ? "✓" : "○"}</span>
                  <span className="flex-1 text-slate-300">{c.t}<span className="block text-xs text-slate-500">{c.s}</span></span>
                </li>
              ))}
            </ul>
            <button disabled className="mt-5 w-full cursor-not-allowed rounded-full border border-white/10 py-2 text-xs text-slate-500">Download certificate (locked)</button>
          </section>

          <section className="rounded-2xl border border-white/10 bg-slate-900/60 p-6">
            <h2 className="text-xs font-semibold uppercase tracking-widest text-amber-400">My classes with Shaun</h2>
            <ul className="mt-4 space-y-3">
              {MOCK_BOOKINGS.map((b) => (
                <li key={b.when} className="rounded-lg bg-slate-950/60 p-3 text-sm">
                  <p className="text-white">{b.when}</p>
                  <p className="text-xs text-slate-400">{b.what} · <span className={b.status === "Confirmed" ? "text-emerald-400" : "text-amber-300"}>{b.status}</span></p>
                  <div className="mt-2 flex gap-3 text-xs"><button className="text-slate-400 underline hover:text-amber-300">Reschedule</button><button className="text-slate-400 underline hover:text-rose-300">Cancel</button></div>
                </li>
              ))}
            </ul>
            <a href="/bookings" className="mt-4 block rounded-full bg-amber-400 py-2 text-center text-sm font-semibold text-slate-950 hover:bg-amber-300">Book a class</a>
          </section>
        </aside>
      </div>
      <p className="mt-10 text-xs text-slate-500">Education only. Not personalised financial advice or a recommendation to buy or sell any security.</p>
    </div>
  );
}
