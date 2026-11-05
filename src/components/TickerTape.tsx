"use client";

import { useEffect, useState } from "react";
import tapeJson from "../../data/ticker-tape.json";
import {
  AMBER_COMPOSITE_WARNING,
  isAmberCompositeLight,
  isRedCompositeLight,
  RED_COMPOSITE_WARNING,
} from "@/lib/redCompositeNotice";

type Tone = "bull" | "bear";

export type TickerTapeGroup = {
  emoji: string;
  label: string;
  tone: Tone | string;
  tickers: string[];
};

type TickerTapeFile = {
  asOf?: string;
  sessionDate?: string;
  S?: number | null;
  light?: string | null;
  warning?: string | null;
  groups?: TickerTapeGroup[];
};

const tape = tapeJson as TickerTapeFile;

/**
 * Sitewide header tape. Groups are baked from data/ticker-tape.json (rebuilt
 * each pack). An optional endpoint can replace groups after mount. A red or
 * amber composite warning is a fixed strip — it does not scroll with the marks.
 * Amber is the strip only; red still has its own members popup elsewhere.
 */
export function TickerTape({ endpoint }: { endpoint?: string }) {
  const [groups, setGroups] = useState<TickerTapeGroup[]>(tape.groups ?? []);
  const [light, setLight] = useState<string | null | undefined>(tape.light);

  useEffect(() => {
    if (!endpoint) return;
    let cancelled = false;
    fetch(endpoint)
      .then((res) => (res.ok ? res.json() : null))
      .then((data: TickerTapeFile | null) => {
        if (cancelled || !data) return;
        if (Array.isArray(data.groups)) setGroups(data.groups);
        if (typeof data.light === "string" || data.light == null) setLight(data.light ?? null);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [endpoint]);

  const visible = groups.filter((g) => Array.isArray(g.tickers) && g.tickers.length > 0);
  const showRedWarning = isRedCompositeLight(light);
  const showAmberWarning = isAmberCompositeLight(light);
  if (!visible.length && !showRedWarning && !showAmberWarning) return null;

  const row = (key: string) => (
    <div className="flex shrink-0 items-center" aria-hidden={key === "b"}>
      {visible.map((g) => (
        <span key={g.emoji} className="flex items-center whitespace-nowrap">
          <span className={g.tone === "bull" ? "text-emerald-400" : "text-rose-400"} title={g.label}>
            {g.emoji}: {g.tickers.join(", ")}
          </span>
          <span className="px-4 text-slate-600">|</span>
        </span>
      ))}
    </div>
  );

  return (
    <div className="border-b border-white/10 bg-slate-900/90">
      {showRedWarning ? (
        <p
          role="status"
          className="border-b border-rose-500/40 bg-rose-950 px-4 py-1.5 text-center text-xs font-semibold leading-snug text-rose-100"
        >
          {RED_COMPOSITE_WARNING}
        </p>
      ) : showAmberWarning ? (
        <p
          role="status"
          className="border-b border-canary-amber/40 bg-amber-950 px-4 py-1.5 text-center text-xs font-semibold leading-snug text-amber-100"
        >
          {AMBER_COMPOSITE_WARNING}
        </p>
      ) : null}
      {visible.length ? (
        <div className="ticker-tape overflow-hidden py-1.5 font-mono text-xs tracking-wide">
          <div className="ticker-track flex w-max">
            {row("a")}
            {row("b")}
          </div>
          <style>{`
        .ticker-track{animation:ticker-scroll 45s linear infinite}
        .ticker-tape:hover .ticker-track{animation-play-state:paused}
        @keyframes ticker-scroll{from{transform:translateX(0)}to{transform:translateX(-50%)}}
        @media (prefers-reduced-motion:reduce){.ticker-track{animation-duration:120s}}
      `}</style>
        </div>
      ) : null}
    </div>
  );
}
