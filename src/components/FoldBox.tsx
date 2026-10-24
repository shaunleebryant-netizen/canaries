"use client";
/** UX preview: a dashboard box folded to a one-line summary; tap to open. State per box in localStorage. */
import { useEffect, useState, type ReactNode } from "react";

const KEY = (id: string) => `canary.fold.${id}`;

export function FoldBox({ id, summary, defaultOpen = false, children }: { id: string; summary: ReactNode; defaultOpen?: boolean; children: ReactNode }) {
  const [open, setOpen] = useState(defaultOpen);
  useEffect(() => {
    try {
      const v = localStorage.getItem(KEY(id));
      if (v === "1" || v === "0") setOpen(v === "1");
    } catch { /* ignore */ }
  }, [id]);
  const toggle = () => {
    const next = !open;
    setOpen(next);
    try { localStorage.setItem(KEY(id), next ? "1" : "0"); } catch { /* ignore */ }
  };
  return (
    <div data-fold={id} data-open={open ? "1" : "0"} className="min-w-0">
      <button
        type="button"
        onClick={toggle}
        aria-expanded={open}
        className={`flex w-full items-center justify-between gap-2 rounded-xl border border-white/10 bg-slate-900/70 px-3 py-2.5 text-left text-xs text-slate-200 transition hover:border-amber-500/40 ${open ? "rounded-b-none border-b-0" : ""}`}
      >
        <span className="min-w-0 truncate">{summary}</span>
        <span className="shrink-0 text-amber-400" aria-hidden>{open ? "▾" : "▸"}</span>
      </button>
      {open ? <div className="min-w-0">{children}</div> : null}
    </div>
  );
}
