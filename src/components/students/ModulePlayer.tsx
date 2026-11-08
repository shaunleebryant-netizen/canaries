"use client";
import { useEffect, useRef, useState } from "react";
import { DOWNLOADS, MODULES, empty, load, save, unlocked, type Progress } from "./data";

const fmt = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

export function ModulePlayer({ n }: { n: number }) {
  const i = n - 1;
  const m = MODULES[i];
  const [p, setP] = useState<Progress>(empty());
  const [ready, setReady] = useState(false);
  const v = useRef<HTMLVideoElement>(null);
  const maxSeen = useRef(0);
  const [t, setT] = useState(0);
  const [dur, setDur] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [blocked, setBlocked] = useState(false);
  const [answer, setAnswer] = useState<number | null>(null);

  useEffect(() => { setP(load()); setReady(true); }, []);
  const update = (fn: (q: Progress) => void) => setP((old) => { const q = { video: [...old.video], quiz: [...old.quiz] }; fn(q); save(q); return q; });

  if (!m) return <div className="p-10 text-center">Module not found. <a className="text-amber-400 underline" href="/students">Back</a></div>;
  if (!ready) return <div className="min-h-[60vh]" />;
  if (!unlocked(p, i)) return (
    <div className="mx-auto max-w-xl px-4 py-24 text-center">
      <p className="text-4xl">🔒</p>
      <h1 className="mt-4 text-2xl font-semibold text-white">Module {n} is locked</h1>
      <p className="mt-2 text-slate-400">Finish the video and quiz in Module {n - 1} first.</p>
      <a href={`/students/module/${n - 1}`} className="mt-6 inline-block rounded-full bg-amber-400 px-6 py-3 text-sm font-semibold text-slate-950">Go to Module {n - 1}</a>
    </div>
  );

  const watched = p.video[i];
  const pct = dur ? Math.min(100, (maxSeen.current / dur) * 100) : 0;

  const onTime = () => {
    const el = v.current!; 
    if (!watched && el.currentTime > maxSeen.current + 1.5) { el.currentTime = maxSeen.current; setBlocked(true); return; }
    maxSeen.current = Math.max(maxSeen.current, el.currentTime);
    setT(el.currentTime);
    if (!watched && el.duration && maxSeen.current / el.duration >= 0.95) update((q) => { q.video[i] = true; });
  };
  const seekTo = (s: number) => {
    const el = v.current!; 
    if (!watched && s > maxSeen.current) { setBlocked(true); s = maxSeen.current; }
    el.currentTime = Math.max(0, s);
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <a href="/students" className="text-xs text-slate-400 hover:text-amber-300">← Student portal</a>
      <p className="mt-4 text-sm font-medium uppercase tracking-widest text-amber-400">Module {n} of 8</p>
      <h1 className="mt-1 text-3xl font-semibold text-white">{m.t}</h1>
      <p className="mt-2 text-slate-400">{m.d}</p>

      <div className="mt-6 overflow-hidden rounded-2xl border border-white/10 bg-black">
        <div className="relative">
          <video ref={v} src="/students/sample-lesson.mp4" className="w-full select-none" playsInline
            controlsList="nodownload noplaybackrate" disablePictureInPicture onContextMenu={(e) => e.preventDefault()}
            onLoadedMetadata={(e) => setDur(e.currentTarget.duration)} onTimeUpdate={onTime}
            onSeeking={() => { const el = v.current!; if (!watched && el.currentTime > maxSeen.current + 1.5) { el.currentTime = maxSeen.current; setBlocked(true); } }}
            onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)} onEnded={() => setPlaying(false)} />
          <div className="pointer-events-none absolute right-3 top-3 rounded bg-black/50 px-2 py-1 text-[10px] text-white/60">student@example.com · Canary Foundations</div>
        </div>
        <div className="flex items-center gap-3 bg-slate-900 px-4 py-3">
          <button onClick={() => (playing ? v.current?.pause() : v.current?.play())} className="w-20 rounded-full bg-amber-400 py-1.5 text-xs font-semibold text-slate-950">{playing ? "Pause" : "Play"}</button>
          <button onClick={() => seekTo((v.current?.currentTime || 0) - 10)} className="rounded-full border border-white/20 px-3 py-1.5 text-xs text-white">⟲ 10s</button>
          <div className="relative h-2 flex-1 cursor-pointer rounded-full bg-slate-700"
            onClick={(e) => { const r = e.currentTarget.getBoundingClientRect(); seekTo(((e.clientX - r.left) / r.width) * dur); }}>
            <div className="absolute h-2 rounded-full bg-slate-500" style={{ width: `${watched ? 100 : pct}%` }} title="Watched so far" />
            <div className="absolute h-2 rounded-full bg-amber-400" style={{ width: `${dur ? (t / dur) * 100 : 0}%` }} />
          </div>
          <span className="w-24 text-right text-xs tabular-nums text-slate-400">{fmt(t)} / {fmt(dur)}</span>
        </div>
        <div className="bg-slate-900 px-4 pb-3 text-xs">
          {watched ? <span className="text-emerald-400">✓ Lesson watched, so you can now rewatch freely and take the quiz.</span>
            : blocked ? <span className="text-amber-300">Skipping ahead is turned off. Watch the lesson through to unlock the quiz ({Math.floor(pct)}% watched, 95% needed).</span>
            : <span className="text-slate-400">Watch at least 95% to unlock the quiz. Pause and rewind are fine; skipping ahead is off. ({Math.floor(pct)}% watched)</span>}
        </div>
      </div>
      <p className="mt-2 text-[11px] text-slate-500">Prototype uses a 20-second sample clip in place of the real lesson.</p>

      <div className="mt-8 grid gap-6 md:grid-cols-[1.6fr_1fr]">
        <section className={`rounded-2xl border p-6 ${watched ? "border-white/10 bg-slate-900/60" : "border-white/5 bg-slate-900/20 opacity-60"}`}>
          <h2 className="text-xs font-semibold uppercase tracking-widest text-amber-400">Module {n} quiz {watched ? "" : "· 🔒 locked"}</h2>
          {!watched ? <p className="mt-3 text-sm text-slate-400">Unlocks when you finish the video.</p>
            : p.quiz[i] ? <p className="mt-3 text-sm text-emerald-400">✓ Quiz passed. (Prototype: 1 sample question; the real quiz is about 12 questions, marked on the server.)</p>
            : (
              <div className="mt-3 text-sm">
                <p className="text-white">Sample question: Before you enter a trade, what should you decide first?</p>
                {["Where my stop goes and how much I'm risking", "How much profit I'll make", "What the latest tip says"].map((o, k) => (
                  <label key={k} className="mt-2 flex cursor-pointer items-center gap-2 text-slate-300">
                    <input type="radio" name="q" checked={answer === k} onChange={() => setAnswer(k)} /> {o}
                  </label>
                ))}
                <button disabled={answer === null} onClick={() => { if (answer === 0) update((q) => { q.quiz[i] = true; }); else alert("Not quite. Have another go."); }}
                  className="mt-4 rounded-full bg-amber-400 px-5 py-2 text-xs font-semibold text-slate-950 disabled:opacity-40">Submit</button>
              </div>
            )}
          <div className="mt-6 flex justify-between border-t border-white/5 pt-4 text-sm">
            {n > 1 ? <a href={`/students/module/${n - 1}`} className="text-slate-400 hover:text-amber-300">← Module {n - 1}</a> : <span />}
            {n < 8 ? (p.quiz[i] ? <a href={`/students/module/${n + 1}`} className="rounded-full bg-amber-400 px-5 py-2 font-semibold text-slate-950">Next: Module {n + 1} →</a>
              : <span className="rounded-full border border-white/10 px-5 py-2 text-slate-500">🔒 Next module</span>)
              : p.quiz[i] && <a href="/students" className="rounded-full bg-amber-400 px-5 py-2 font-semibold text-slate-950">Back to portal →</a>}
          </div>
        </section>

        <section className="rounded-2xl border border-white/10 bg-slate-900/60 p-6">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-amber-400">Downloads</h2>
          <ul className="mt-4 space-y-2">
            {DOWNLOADS.map((d) => (
              <li key={d.t} className="flex items-center justify-between rounded-lg bg-slate-950/60 px-3 py-2 text-sm">
                <span className="text-slate-200">M{n} {d.t}</span>
                <button onClick={() => alert("Placeholder: real PDFs come after module sign-off.")} className="text-xs text-amber-400 hover:text-amber-300">{d.f} ↓</button>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-[11px] text-slate-500">Placeholder files. Real PDFs will be watermarked with the student's name.</p>
        </section>
      </div>
    </div>
  );
}
