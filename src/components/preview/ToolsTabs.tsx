"use client";
import { useEffect, useState } from "react";
import { ZoomImage } from "@/components/preview/ZoomImage";

export type ToolTab = { tab: string; t: string; d: string; src: string };

/** Homepage Tools: tabs + one big screenshot (owner t1016u, option A). Auto-rotates until touched; off for reduced motion. */
export function ToolsTabs({ tools }: { tools: ToolTab[] }) {
  const [i, setI] = useState(0);
  const [auto, setAuto] = useState(true);
  useEffect(() => {
    if (!auto) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) { setAuto(false); return; }
    const id = window.setInterval(() => setI((n) => (n + 1) % tools.length), 7000);
    return () => window.clearInterval(id);
  }, [auto, tools.length]);
  const x = tools[i];
  const pick = (n: number) => { setAuto(false); setI(n); };
  return (
    <div className="mt-12" onPointerDown={() => setAuto(false)} onFocusCapture={() => setAuto(false)}>
      <div role="tablist" aria-label="Dashboard features" className="flex flex-wrap justify-center gap-2">
        {tools.map((tl, n) => (
          <button key={tl.tab} type="button" role="tab" aria-selected={n === i} aria-controls="tools-panel"
            onClick={() => pick(n)}
            className={`rounded-full border px-4 py-1.5 text-sm font-medium transition ${n === i ? "border-canary-gold bg-canary-gold/15 text-canary-gold" : "border-white/10 text-slate-400 hover:border-white/30 hover:text-white"}`}>
            {tl.tab}
          </button>
        ))}
      </div>
      <div id="tools-panel" role="tabpanel" aria-label={x.t} className="mx-auto mt-8 max-w-5xl overflow-hidden rounded-2xl border border-white/10 bg-slate-900/50">
        <p className="border-b border-white/5 px-6 py-4 text-center text-sm text-slate-300">
          <span className="font-semibold text-white">{x.t}</span> — {x.d}
        </p>
        <div className="flex h-[22rem] items-center justify-center bg-slate-950 p-4 md:h-[34rem]">
          <ZoomImage key={x.src} src={x.src} alt={x.t} />
        </div>
      </div>
    </div>
  );
}
