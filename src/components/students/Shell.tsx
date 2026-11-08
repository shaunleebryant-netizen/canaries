"use client";
import { useEffect, useState, type ReactNode } from "react";
import { isEnrolled, setEnrolled } from "./data";

export function Banner() {
  return (
    <div className="bg-amber-500/90 px-4 py-2 text-center text-xs font-semibold text-slate-950">
      DRAFT PREVIEW · local only · student portal prototype with mock data
    </div>
  );
}

export function StudentGate({ children }: { children: ReactNode }) {
  const [ok, setOk] = useState<boolean | null>(null);
  useEffect(() => setOk(isEnrolled()), []);
  if (ok === null) return <div className="min-h-[60vh] bg-slate-950" />;
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <Banner />
      <div className="border-b border-white/5 bg-slate-900/60 px-4 py-2 text-center text-xs text-slate-400">
        Prototype toggle: viewing as <b className="text-amber-400">{ok ? "enrolled student" : "non-student"}</b> ·{" "}
        <button className="underline hover:text-amber-300" onClick={() => { setEnrolled(!ok); setOk(!ok); }}>
          switch to {ok ? "non-student" : "enrolled student"}
        </button>
      </div>
      {ok ? children : <NotEnrolled />}
    </div>
  );
}

function NotEnrolled() {
  return (
    <section className="mx-auto max-w-2xl px-4 py-24 text-center">
      <p className="text-sm font-medium uppercase tracking-widest text-amber-400">Canary Foundations · Student portal</p>
      <h1 className="mt-3 text-3xl font-semibold text-white md:text-4xl">This area is for enrolled students</h1>
      <p className="mt-4 text-slate-300">
        You're signed in, but your account isn't enrolled in Canary Foundations yet. Enrol to unlock lessons, downloads, quizzes, bookings and your certificate.
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <a href="/learn" className="rounded-full bg-amber-400 px-6 py-3 text-sm font-semibold text-slate-950 hover:bg-amber-300">Apply / enrol</a>
        <a href="/learn#apply" className="rounded-full border border-white/20 px-6 py-3 text-sm font-semibold text-white hover:border-amber-400">Book a free intro call</a>
      </div>
    </section>
  );
}
