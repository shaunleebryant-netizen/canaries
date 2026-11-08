"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { UniverseGroup, UniverseStockRow } from "@/lib/tickerUniverse";
import { UniverseStockTable } from "@/components/UniverseStockTable";
import { freeUniversePlaceholder } from "@/lib/freeUniversePlaceholder";

/**
 * "Ticker Universe" button + accessible modal (owner 2026-10-06).
 * Lists every ticker we scan, grouped and A–Z, with counts. Public-safe (no signals).
 */
export function TickerUniverseButton({
  groups = [],
  stocks,
  locked = false,
  label = "Ticker Universe",
  className = "inline-block rounded-xl border border-canary-gold/40 px-4 py-2 text-sm font-medium text-canary-gold hover:bg-canary-gold/10",
}: {
  groups?: UniverseGroup[];
  /** Owner t1010u: when given, the Stocks group renders as a filterable / sortable table. */
  stocks?: UniverseStockRow[];
  /** Free preview: placeholder rows only. Real universe rows are not passed in. */
  locked?: boolean;
  label?: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const titleId = useId();
  const source: UniverseGroup[] = locked ? freeUniversePlaceholder() : groups;
  const total = source.reduce((n, g) => n + g.items.length, 0);
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState<string>(stocks?.length ? "stocks" : "all");
  const q = query.trim().toUpperCase();
  const shownGroups = source
    .filter((g) => tab === "all" || g.id === tab)
    .map((g) => ({ ...g, items: q ? g.items.filter((i) => i.ticker.toUpperCase().includes(q) || (i.name ?? "").toUpperCase().includes(q)) : g.items }));
  const table = !locked && !!stocks?.length && tab === "stocks";

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
                className={`relative flex max-h-[88vh] w-full ${stocks?.length ? "max-w-6xl" : "max-w-3xl"} flex-col overflow-hidden rounded-2xl border border-white/10 bg-slate-950 shadow-2xl`}
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex shrink-0 items-start justify-between gap-4 border-b border-white/10 px-5 py-4">
                  <div>
                    <h2 id={titleId} className="text-lg font-semibold text-white">
                      Ticker Universe
                    </h2>
                    <p className="mt-0.5 text-xs text-slate-400">
                      {locked ? "The ticker list is reserved for members." : `${total} tickers we scan, A–Z by group. Education only.`}
                    </p>
                    {/* Owner 2026-10-09: why the list is curated + how to check other stocks. Amber link, never yellow. */}
                    <p className="mt-2 max-w-prose text-xs leading-relaxed text-slate-400">
                      We only scan stocks we&apos;ve checked to be leaders in their field or sector, so we can
                      focus on the best. Think of it like picking the best players for a soccer team. Want to
                      check a stock that isn&apos;t here? Open it on TradingView and load{" "}
                      <a href="/indicators" className="font-medium text-amber-500 underline-offset-2 hover:text-amber-400 hover:underline">
                        our indicators
                      </a>{" "}
                      there (US$99 one-time payment; free for members).
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
                <div className="flex shrink-0 flex-wrap items-center gap-2 border-b border-white/10 px-5 py-2.5">
                  <input
                    type="search"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search ticker or name"
                    aria-label="Search the ticker universe"
                    className="w-44 rounded-md border border-white/15 bg-slate-900 px-2 py-1 text-xs text-white placeholder:text-slate-500 focus:border-canary-gold/60 focus:outline-none"
                  />
                  {[{ id: "all", label: "All", n: total }, ...source.map((g) => ({ id: g.id, label: g.label, n: g.items.length }))].map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      aria-pressed={tab === c.id}
                      onClick={() => setTab(c.id)}
                      className={`rounded-full border px-2.5 py-0.5 text-[11px] transition ${tab === c.id ? "border-canary-gold/70 bg-canary-gold/15 text-canary-gold" : "border-white/15 text-slate-300 hover:border-canary-gold/50"}`}
                    >
                      {c.label}{locked ? null : <span className="text-slate-500"> {c.n}</span>}
                    </button>
                  ))}
                </div>
                <div className="relative min-h-0 flex-1 overflow-y-auto px-5 py-4" data-testid="ticker-universe-list">
                  {locked ? (
                    <div className="pointer-events-none absolute inset-x-5 top-4 select-none blur-md" aria-hidden inert>
                      {freeUniversePlaceholder().map((g) => (
                        <section key={g.id} className="mb-6">
                          <h3 className="text-xs font-semibold uppercase tracking-widest text-canary-gold">{g.label}</h3>
                          <ul className="mt-2 grid grid-cols-3 gap-x-3 gap-y-1 text-sm sm:grid-cols-6">
                            {g.items.map((item, index) => (
                              <li key={`${g.id}-${index}`} className="truncate text-slate-500">{item.ticker}</li>
                            ))}
                          </ul>
                        </section>
                      ))}
                    </div>
                  ) : null}
                  {locked ? (
                    <div className="relative z-10 mx-auto my-8 w-full max-w-sm rounded-2xl border border-canary-gold/40 bg-slate-950/95 p-5 text-center shadow-xl">
                      <p className="text-lg font-semibold text-white">Upgrade to view this list</p>
                      <p className="mt-2 text-sm leading-relaxed text-slate-300">The ticker universe is reserved for members.</p>
                      <form action="/api/account/checkout" method="post" className="mt-4">
                        <input type="hidden" name="tab" value="stocks" />
                        <input type="hidden" name="plan" value="launch_annual" />
                        <button type="submit" className="w-full rounded-xl bg-canary-gold px-4 py-3 text-sm font-semibold text-slate-950">
                          Upgrade to Founding Member
                        </button>
                      </form>
                    </div>
                  ) : null}
                  {!locked && table ? <UniverseStockTable rows={stocks!} query={query} /> : null}
                  {!locked && !table && shownGroups.every((g) => !g.items.length) ? (
                    <p className="text-xs text-slate-400">No match. If you can&apos;t find a stock, it may not have made our list (see above).</p>
                  ) : null}
                  {locked || table ? null : shownGroups.filter((g) => g.items.length).map((g) => (
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
