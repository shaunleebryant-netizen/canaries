"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { UniverseGroup } from "@/lib/tickerUniverse";

/**
 * "Ticker Universe" button + accessible modal (owner 2026-10-06).
 * Lists every ticker we scan, grouped and A–Z, with counts. Public-safe (no signals).
 */
export function TickerUniverseButton({
  groups,
  label = "Ticker Universe",
  className = "inline-block rounded-xl border border-canary-gold/40 px-4 py-2 text-sm font-medium text-canary-gold hover:bg-canary-gold/10",
}: {
  groups: UniverseGroup[];
  label?: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const titleId = useId();
  const total = groups.reduce((n, g) => n + g.items.length, 0);

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
    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener("keydown", onKey);
    };
  }, [open, close]);

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        className={className}
      >
        {label}
      </button>
      {mounted && open
        ? createPortal(
            <div
              className="fixed inset-0 z-[100] flex items-center justify-center bg-black/85 p-3 sm:p-6"
              onClick={close}
              role="presentation"
              data-testid="ticker-universe-backdrop"
            >
              <div
                role="dialog"
                aria-modal="true"
                aria-labelledby={titleId}
                className="relative flex max-h-[88vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-white/10 bg-slate-950 shadow-2xl"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex shrink-0 items-start justify-between gap-4 border-b border-white/10 px-5 py-4">
                  <div>
                    <h2 id={titleId} className="text-lg font-semibold text-white">
                      Ticker Universe
                    </h2>
                    <p className="mt-0.5 text-xs text-slate-400">
                      {total} tickers we scan, A–Z by group. Education only.
                    </p>
                    {/* Owner 2026-10-09: why the list is curated + how to check other stocks. Amber link, never yellow. */}
                    <p className="mt-2 max-w-prose text-xs leading-relaxed text-slate-400">
                      We only scan stocks we&apos;ve checked to be leaders in their field or sector, so we can
                      focus on the best. Think of it like picking the best players for a soccer team. Want to
                      check a stock that isn&apos;t here? Open it on TradingView and load{" "}
                      <a href="/indicators" className="font-medium text-amber-500 underline-offset-2 hover:text-amber-400 hover:underline">
                        our indicators
                      </a>{" "}
                      there (one bundle, US$99 one-off for both; free for members).
                    </p>
                  </div>
                  <button
                    ref={closeRef}
                    type="button"
                    onClick={close}
                    aria-label="Close ticker universe"
                    className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-canary-gold/50 text-xl leading-none text-canary-gold hover:bg-canary-gold/15"
                  >
                    ×
                  </button>
                </div>
                <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4" data-testid="ticker-universe-list">
                  {groups.map((g) => (
                    <section key={g.id} className="mb-6 last:mb-0" aria-labelledby={`${titleId}-${g.id}`}>
                      <h3
                        id={`${titleId}-${g.id}`}
                        className="text-xs font-semibold uppercase tracking-widest text-canary-gold"
                      >
                        {g.label} <span className="text-slate-500">· {g.items.length}</span>
                      </h3>
                      <ul
                        className={`mt-2 grid gap-x-3 gap-y-1 text-sm ${
                          g.items.some((i) => i.name)
                            ? "grid-cols-1 sm:grid-cols-2"
                            : "grid-cols-3 sm:grid-cols-6"
                        }`}
                        data-group={g.id}
                      >
                        {g.items.map((i) => (
                          <li key={i.ticker} className="truncate text-slate-200">
                            <span className="font-semibold tracking-wide text-white">{i.ticker}</span>
                            {i.name ? <span className="text-slate-400"> · {i.name}</span> : null}
                          </li>
                        ))}
                      </ul>
                    </section>
                  ))}
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
