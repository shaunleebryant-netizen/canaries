"use client";

/**
 * Canary readings → chart pop-up (owner PREVIEW 2026-10-09 7:09 PM NZ; flag MEMBERS_CANARY_CHARTS,
 * default OFF). Same look as the ticker chart lightbox. Data: members-only
 * /api/members/canary-chart/[id] (scripts/build-canary-charts.mjs). The chart itself is a separate
 * chunk loaded only on open. Education only.
 */
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import dynamic from "next/dynamic";
import type { CanaryChartDoc } from "@/components/CanaryChart";

const CanaryChart = dynamic(() => import("@/components/CanaryChart"), { ssr: false });

export function CanaryChartButton({
  id,
  name,
  how,
  howDetail,
  reading,
  signal,
  signalClass,
  limitedNote,
}: {
  id: string;
  name: string;
  how: string;
  howDetail?: string | null;
  reading: string;
  signal: string;
  signalClass: string;
  limitedNote?: string | null;
}) {
  const [open, setOpen] = useState(false);
  const [view, setView] = useState(0);
  const [mounted, setMounted] = useState(false);
  const [state, setState] = useState<{ doc: CanaryChartDoc | null; error: string | null }>({ doc: null, error: null });
  const triggerRef = useRef<HTMLButtonElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const titleId = useId();
  useEffect(() => setMounted(true), []);
  const close = useCallback(() => {
    setOpen(false);
    requestAnimationFrame(() => triggerRef.current?.focus());
  }, []);
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        close();
      }
    };
    document.addEventListener("keydown", onKey);
    requestAnimationFrame(() => closeRef.current?.focus());
    let live = true;
    if (!limitedNote && !state.doc) {
      fetch(`/api/members/canary-chart/${encodeURIComponent(id)}`, { credentials: "same-origin" })
        .then(async (r) => {
          if (!r.ok) throw new Error(r.status === 404 ? "nodata" : `HTTP ${r.status}`);
          const doc = (await r.json()) as CanaryChartDoc;
          if (live) setState({ doc, error: null });
        })
        .catch((e: unknown) => live && setState({ doc: null, error: e instanceof Error ? e.message : "error" }));
    }
    return () => {
      live = false;
      document.body.style.overflow = prev;
      document.removeEventListener("keydown", onKey);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, close, id, limitedNote]);

  const doc = state.doc;
  const views = doc?.views?.length ? doc.views : null;
  const activeView = views ? views[Math.min(view, views.length - 1)] : null;
  const lineLabel = activeView?.lineLabel ?? doc?.lineLabel ?? "the canary";
  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        aria-label={`Open chart: ${name}`}
        className="mt-1 inline-flex items-center gap-1 rounded border border-amber-500/40 px-1.5 py-0.5 text-[10px] font-semibold text-amber-500 hover:bg-amber-500/10"
      >
        <svg aria-hidden viewBox="0 0 16 16" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="1.6">
          <path d="M1.5 13.5h13M3 10.5l3.2-3.6 2.6 2.2L13 4.5" />
        </svg>
        Chart
      </button>
      {mounted && open
        ? createPortal(
            <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/85 p-2 sm:p-6" onClick={close} role="presentation">
              <div
                role="dialog"
                aria-modal="true"
                aria-labelledby={titleId}
                className="relative flex max-h-[94vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-white/10 bg-slate-950 shadow-2xl"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex shrink-0 items-start justify-between gap-4 border-b border-white/10 px-4 py-3 sm:px-5">
                  <div className="min-w-0">
                    <h2 id={titleId} className="text-base font-semibold text-white sm:text-lg">
                      {name}
                    </h2>
                    <p className="mt-0.5 text-xs text-slate-400">
                      {how}
                      {howDetail ? <span className="text-slate-500"> · {howDetail}</span> : null}
                    </p>
                    {views ? (
                      <div role="group" aria-label="Line shown on the chart" className="mt-1.5 inline-flex overflow-hidden rounded border border-amber-500/40 text-[11px] font-semibold">
                        {views.map((v, k) => (
                          <button
                            key={v.key}
                            type="button"
                            aria-pressed={v === activeView}
                            onClick={() => setView(k)}
                            className={`px-2.5 py-0.5 ${v === activeView ? "bg-amber-500/20 text-amber-400" : "text-slate-400 hover:bg-amber-500/10"}`}
                          >
                            {v.key}
                          </button>
                        ))}
                      </div>
                    ) : null}
                  </div>
                  <button
                    ref={closeRef}
                    type="button"
                    onClick={close}
                    aria-label="Close chart"
                    className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-amber-500/50 text-xl leading-none text-amber-500 hover:bg-amber-500/15"
                  >
                    ×
                  </button>
                </div>
                <div className="relative h-[52vh] min-h-[260px] sm:h-[420px]">
                  {limitedNote ? (
                    <div className="grid h-full place-items-center px-6 text-center text-sm text-slate-400">{limitedNote}</div>
                  ) : doc ? (
                    <CanaryChart doc={doc} view={views ? Math.min(view, views.length - 1) : 0} />
                  ) : (
                    <div className="grid h-full place-items-center text-xs text-slate-500">
                      {state.error ? (state.error === "nodata" ? "No chart history for this canary yet." : "Chart unavailable right now.") : "Loading chart…"}
                    </div>
                  )}
                </div>
                <div className="shrink-0 space-y-1 border-t border-white/10 px-4 py-3 text-xs sm:px-5">
                  <p className="text-slate-300">
                    Now: <span className="tabular-nums">{reading}</span> · <span className={`font-semibold ${signalClass}`}>{signal}</span>
                  </p>
                  {!limitedNote ? (
                    <p className="text-slate-500">
                      White line: {lineLabel}{doc?.refLabel ? ` · dashed amber: its ${doc.refLabel}` : doc?.consts.length ? " · dashed amber: the levels it is checked against" : ""}. Background: green
                      Healthy, grey Neutral, red Warning, replaying the same rule on each past day.
                      {doc?.refNote ? ` ${doc.refNote}` : ""} Daily, ~12 months (opens on ~6). Education only.
                    </p>
                  ) : (
                    <p className="text-slate-500">Education only.</p>
                  )}
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
