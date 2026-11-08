"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import type { CompositePoint } from "@/lib/compositeArchive";
import { historySegments } from "@/lib/compositeHistory";
import type { SpxClosePack } from "@/lib/loadSpxCloses";

const W = 640;
const H = 320;
const LEFT = 48;
const RIGHT = 64;
const TOP = 16;
const BOTTOM = 36;

function ymdToUtc(ymd: string): number {
  return Date.parse(`${ymd}T00:00:00Z`);
}

/**
 * Recorded composite history in its own dialog. The score box itself stays a summary.
 * SPX closes come from the local chart file and only on dates that file actually has.
 */
export function CompositeHistoryChart({
  points,
  conflicts = [],
  benchmark,
}: {
  points: CompositePoint[];
  conflicts?: string[];
  benchmark: SpxClosePack;
}) {
  const [open, setOpen] = useState(false);
  const titleId = useId();
  const from = points[0]?.date;
  const to = points.at(-1)?.date;
  const hasBenchmark = benchmark.closes.length > 0;

  return (
    <div className="mt-2 border-t border-white/10 pt-2">
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-md border border-white/15 px-2.5 py-1 text-[11px] font-medium text-slate-200 hover:border-canary-gold/40 hover:text-white"
      >
        View history
      </button>
      {open ? (
        <HistoryDialog
          titleId={titleId}
          points={points}
          conflicts={conflicts}
          benchmark={benchmark}
          hasBenchmark={hasBenchmark}
          from={from}
          to={to}
          onClose={() => setOpen(false)}
        />
      ) : null}
    </div>
  );
}

function HistoryDialog({
  titleId,
  points,
  conflicts,
  benchmark,
  hasBenchmark,
  from,
  to,
  onClose,
}: {
  titleId: string;
  points: CompositePoint[];
  conflicts: string[];
  benchmark: SpxClosePack;
  hasBenchmark: boolean;
  from?: string;
  to?: string;
  onClose: () => void;
}) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const [showSpx, setShowSpx] = useState(hasBenchmark);
  const [hover, setHover] = useState<number | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  const plot = useMemo(() => buildPlot(points, benchmark.closes, showSpx && hasBenchmark), [points, benchmark.closes, showSpx, hasBenchmark]);
  const active = hover != null ? plot.points[hover] : null;

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center p-2 sm:items-center sm:p-6" role="presentation">
      <button type="button" aria-label="Close history" className="absolute inset-0 bg-black/75" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative z-10 flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-white/15 bg-slate-950 shadow-2xl"
      >
        <div className="flex items-start justify-between gap-3 border-b border-white/10 px-4 py-3">
          <div>
            <h2 id={titleId} className="text-base font-semibold text-white">Composite score history</h2>
            <p className="mt-1 text-[11px] leading-snug text-slate-400">
              Recorded pack log{from && to ? `, ${from} to ${to}` : ""}. This is not a full history. Dates without a record are left blank.
              {conflicts.length ? ` Conflicting notes left out: ${conflicts.join(", ")}.` : ""}
            </p>
          </div>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-lg border border-white/15 px-2.5 py-1 text-sm text-slate-300 hover:text-white"
          >
            ✕
          </button>
        </div>
        <div className="flex flex-wrap items-center gap-3 px-4 py-2 text-[11px] text-slate-300">
          <span className="inline-flex items-center gap-1"><i className="inline-block h-2 w-3 rounded-sm bg-rose-500/70" /> Red below −0.3</span>
          <span className="inline-flex items-center gap-1"><i className="inline-block h-2 w-3 rounded-sm bg-amber-400/70" /> Amber −0.3 to +0.6</span>
          <span className="inline-flex items-center gap-1"><i className="inline-block h-2 w-3 rounded-sm bg-emerald-500/70" /> Green +0.6 and above</span>
          <label className="inline-flex items-center gap-1">
            <input
              type="checkbox"
              checked={showSpx && hasBenchmark}
              disabled={!hasBenchmark}
              onChange={(e) => setShowSpx(e.target.checked)}
            />
            SPX close
          </label>
          {!hasBenchmark ? <span className="text-amber-200">SPX close is not in the local chart file for these dates.</span> : null}
        </div>
        {points.length < 2 ? (
          <p className="px-4 py-8 text-sm text-slate-300">No recorded composite series to plot.</p>
        ) : (
          <div className="px-2 pb-2 sm:px-4">
            <svg
              viewBox={`0 0 ${W} ${H}`}
              role="img"
              aria-label="Recorded composite score and optional SPX close"
              className="h-64 w-full touch-pan-y sm:h-80"
              onMouseLeave={() => setHover(null)}
              onMouseMove={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                const x = ((e.clientX - rect.left) / rect.width) * W;
                let best = 0;
                let dist = Infinity;
                plot.points.forEach((p, i) => {
                  const d = Math.abs(p.x - x);
                  if (d < dist) {
                    dist = d;
                    best = i;
                  }
                });
                setHover(best);
              }}
            >
              {plot.bands.map((band) => (
                <rect key={band.id} x={LEFT} y={band.y} width={W - LEFT - RIGHT} height={band.h} fill={band.fill} />
              ))}
              {plot.scoreSegments.map((d, i) => (
                <polyline key={`s${i}`} fill="none" stroke="#eab308" strokeWidth="2" points={d} />
              ))}
              {plot.priceSegments.map((d, i) => (
                <polyline key={`p${i}`} fill="none" stroke="#38bdf8" strokeWidth="1.5" points={d} />
              ))}
              {plot.points.map((p, i) => (
                <circle key={p.date} cx={p.x} cy={p.y} r={hover === i ? 4.5 : 3} fill={p.colour} />
              ))}
              {active ? <line x1={active.x} x2={active.x} y1={TOP} y2={H - BOTTOM} stroke="#94a3b8" strokeDasharray="3 3" /> : null}
              <text x={8} y={TOP + 10} fill="#94a3b8" fontSize="10">Score</text>
              {plot.scoreTicks.map((tick) => (
                <text key={tick.tick} x={LEFT - 6} y={tick.y + 3} fill="#94a3b8" fontSize="10" textAnchor="end">
                  {tick.tick > 0 ? `+${tick.tick}` : tick.tick}
                </text>
              ))}
              {showSpx && hasBenchmark ? <text x={W - 8} y={TOP + 10} fill="#7dd3fc" fontSize="10" textAnchor="end">SPX</text> : null}
              {plot.priceTicks.map((tick) => (
                <text key={tick.tick} x={W - RIGHT + 8} y={tick.y + 3} fill="#7dd3fc" fontSize="10">
                  {Math.round(tick.tick)}
                </text>
              ))}
              <text x={LEFT} y={H - 8} fill="#64748b" fontSize="10">{from}</text>
              <text x={W - RIGHT} y={H - 8} fill="#64748b" fontSize="10" textAnchor="end">{to}</text>
            </svg>
            <p className="min-h-8 px-2 text-[11px] leading-snug text-slate-300" aria-live="polite">
              {active
                ? `${active.date} · score ${active.S.toFixed(3)} · ${active.light}${
                    showSpx && hasBenchmark
                      ? active.close != null
                        ? ` · SPX close ${active.close.toLocaleString("en-US", { maximumFractionDigits: 2 })}`
                        : " · SPX close not in the file"
                      : ""
                  }`
                : "Move across the chart for a date."}
            </p>
            <p className="px-2 pb-2 text-[10px] leading-snug text-slate-500">
              Score uses the left axis. SPX close, when shown, uses its own right-hand scale from {benchmark.source}
              {benchmark.asOf ? ` as of ${benchmark.asOf}` : ""}. The file is newer than this pack log; only closes on the recorded score dates are used.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function buildPlot(points: CompositePoint[], closes: { date: string; close: number }[], showPrice: boolean) {
  const ordered = [...points].sort((a, b) => (a.date < b.date ? -1 : 1));
  const closeByDate = new Map(closes.map((c) => [c.date, c.close]));
  const t0 = ymdToUtc(ordered[0]?.date ?? "1970-01-01");
  const t1 = ymdToUtc(ordered.at(-1)?.date ?? "1970-01-01");
  const span = Math.max(1, t1 - t0);
  const sMin = Math.min(-1, ...ordered.map((p) => p.S));
  const sMax = Math.max(1, ...ordered.map((p) => p.S));
  const sSpan = sMax - sMin || 1;
  const priceVals = ordered.map((p) => closeByDate.get(p.date)).filter((n): n is number => typeof n === "number");
  const pMin = priceVals.length ? Math.min(...priceVals) : 0;
  const pMax = priceVals.length ? Math.max(...priceVals) : 1;
  const pPad = (pMax - pMin) * 0.05 || 1;
  const xOf = (date: string) => LEFT + ((ymdToUtc(date) - t0) / span) * (W - LEFT - RIGHT);
  const yScore = (s: number) => TOP + (1 - (s - sMin) / sSpan) * (H - TOP - BOTTOM);
  const yPrice = (c: number) => TOP + (1 - (c - (pMin - pPad)) / (pMax - pMin + pPad * 2 || 1)) * (H - TOP - BOTTOM);
  const band = (lo: number, hi: number, id: string, fill: string) => {
    const y1 = yScore(Math.min(hi, sMax));
    const y2 = yScore(Math.max(lo, sMin));
    return { id, y: Math.min(y1, y2), h: Math.max(0, Math.abs(y2 - y1)), fill };
  };
  const plotted = ordered.map((p) => ({
    ...p,
    x: xOf(p.date),
    y: yScore(p.S),
    close: closeByDate.get(p.date) ?? null,
    colour: p.light === "green" ? "#34d399" : p.light === "amber" ? "#fbbf24" : "#fb7185",
  }));
  const line = (pts: { x: number; y: number }[]) => pts.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
  return {
    points: plotted,
    bands: [
      band(sMin, -0.3, "red", "rgba(244,63,94,0.16)"),
      band(-0.3, 0.6, "amber", "rgba(251,191,36,0.12)"),
      band(0.6, sMax, "green", "rgba(52,211,153,0.14)"),
    ],
    scoreTicks: [-0.3, 0.6].map((tick) => ({ tick, y: yScore(tick) })),
    priceTicks: showPrice && priceVals.length ? [pMin, pMax].map((tick) => ({ tick, y: yPrice(tick) })) : [],
    scoreSegments: historySegments(plotted).filter((s) => s.length > 1).map(line),
    priceSegments: showPrice
      ? historySegments(plotted).flatMap((segment) => {
          const pieces: { x: number; y: number }[][] = [];
          let current: { x: number; y: number }[] = [];
          for (const point of segment) {
            if (point.close == null) {
              if (current.length > 1) pieces.push(current);
              current = [];
              continue;
            }
            current.push({ x: point.x, y: yPrice(point.close) });
          }
          if (current.length > 1) pieces.push(current);
          return pieces;
        }).map(line)
      : [],
  };
}
