"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import { StickySidebar } from "@/components/StickySidebar";

/**
 * Decide | Scan layout (members). With `collapsible` (owner t581u, approved t583s2392; MEMBERS_DECIDE_COLLAPSE,
 * default ON) members can hide the Decide column: desktop → an amber edge tab (sticky, mid-height) and full-width scanners;
 * mobile → a one-line bar so the scanners move up. Remembered in localStorage. Visibility is CSS-driven
 * from <html data-decide="collapsed"> (set by an inline script before paint), so there is no flash
 * and no hydration mismatch. Without `collapsible` it renders exactly the old layout.
 */
const KEY = "canary.decideCollapsed";

const LIGHT_DOT: Record<string, string> = {
  green: "bg-emerald-400",
  amber: "bg-amber-400",
  red: "bg-red-400",
};

export function DecideLayout({
  collapsible,
  light,
  sidebarClassName,
  theme,
  regime,
  scan,
  children,
}: {
  collapsible: boolean;
  light?: string | null;
  sidebarClassName: string;
  theme?: string;
  regime?: string;
  scan: ReactNode;
  children: ReactNode;
}) {
  const [collapsed, setCollapsed] = useState(false);
  useEffect(() => {
    if (!collapsible) return;
    setCollapsed(document.documentElement.getAttribute("data-decide") === "collapsed");
  }, [collapsible]);
  const set = useCallback((next: boolean) => {
    setCollapsed(next);
    if (next) document.documentElement.setAttribute("data-decide", "collapsed");
    else document.documentElement.removeAttribute("data-decide");
    try {
      localStorage.setItem(KEY, next ? "1" : "0");
    } catch {
      /* ignore */
    }
  }, []);

  if (!collapsible) {
    return (
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:gap-5">
        <StickySidebar className={sidebarClassName} theme={theme} regime={regime}>
          {children}
        </StickySidebar>
        {scan}
      </div>
    );
  }

  const key = typeof light === "string" ? light.trim().toLowerCase() : "";
  const dot = LIGHT_DOT[key] ?? "bg-slate-500";
  const lightLabel = LIGHT_DOT[key] ? key.charAt(0).toUpperCase() + key.slice(1) : "Neutral";

  // Desktop edge tab (owner 2026-10-09, v2 8:15 PM): tall slim amber (#f59e0b) handle beside the top of the
  // main scanner box (strip/rail pt-20 ≈ tabs row), sticky 120px from the viewport top while scrolling.
  // Owner 2026-10-10: thinner (12px) and fully inside the 20px column gap (4px clear each side), so it no
  // longer covers the Risk Guidance score range bar or the scanner box.
  const TAB =
    "pointer-events-auto sticky top-[120px] flex h-20 w-3 items-center justify-center rounded-md bg-[#f59e0b] text-sm font-bold leading-none text-slate-950 shadow-[0_2px_10px_rgba(0,0,0,0.45)] ring-1 ring-black/20 transition hover:shadow-[0_0_0_3px_rgba(245,158,11,0.25),0_0_22px_rgba(245,158,11,0.6)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-200";

  return (
    <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:gap-5" data-decide-layout>
      <script
        // Before paint: apply the saved choice so the page never flashes the other state.
        dangerouslySetInnerHTML={{
          __html: `try{if(localStorage.getItem(${JSON.stringify(KEY)})==="1")document.documentElement.setAttribute("data-decide","collapsed")}catch(e){}`,
        }}
      />
      <div data-decide-panel className="relative w-full shrink-0 lg:w-[340px] lg:self-stretch">
        {/* Mobile: full-width toggle above the panel (no edge tab). */}
        <button
          type="button"
          onClick={() => set(true)}
          aria-expanded={!collapsed}
          aria-label="Hide Decide panel"
          className="mb-2 flex w-full items-center gap-2 rounded-xl border border-canary-gold/25 bg-slate-900/80 px-3 py-2 text-left text-xs shadow-sm transition hover:border-canary-gold/50 lg:hidden"
        >
          <span className={`h-3 w-3 shrink-0 rounded-full ${dot}`} aria-hidden />
          <span className="font-bold uppercase tracking-[0.15em] text-canary-gold">Risk Guidance</span>
          <span className="text-slate-400">· {lightLabel}</span>
          <span className="ml-auto font-medium text-slate-300">Hide ▴</span>
        </button>
        <StickySidebar
          // No `relative` here: StickySidebar sets an inline `top` for desktop sticky.
          className={`${sidebarClassName.replace(/\blg:w-\[340px\]\s?/, "")} lg:w-full`}
          theme={theme}
          regime={regime}
        >
          {children}
        </StickySidebar>
        {/* Desktop: edge strip as tall as the row, inside the 20px gap right of the column (4px clear of the panel and of the scanner box); the tab inside is sticky. */}
        <div className="pointer-events-none absolute inset-y-0 -right-[16px] z-20 hidden w-3 pt-20 lg:block">
          <button
            type="button"
            onClick={() => set(true)}
            aria-expanded={!collapsed}
            aria-label="Hide Decide panel"
            title="Hide Decide panel"
            className={TAB}
          >
            <span aria-hidden className="-mt-px">‹</span>
          </button>
        </div>
      </div>

      {/* Collapsed (hidden unless collapsed, globals.css): mobile one-line bar / desktop edge tab at the left. */}
      <div data-decide-rail className="w-full shrink-0 lg:w-3 lg:self-stretch lg:pt-20">
        <button
          type="button"
          onClick={() => set(false)}
          aria-expanded={collapsed}
          aria-label="Show Decide panel"
          className="group flex w-full items-center gap-2 rounded-xl border border-canary-gold/25 bg-slate-900/80 px-3 py-2 text-left shadow-sm transition hover:border-canary-gold/50 lg:hidden"
        >
          <span className={`h-3 w-3 shrink-0 rounded-full ${dot} shadow-[0_0_0_3px_rgba(255,255,255,0.06)]`} aria-hidden />
          <span className="text-xs font-bold uppercase tracking-[0.15em] text-canary-gold">Risk Guidance</span>
          <span className="text-xs text-slate-400">· {lightLabel}</span>
          <span className="ml-auto text-[11px] font-medium text-slate-300 group-hover:text-canary-gold">Show ▾</span>
        </button>
        <button
          type="button"
          onClick={() => set(false)}
          aria-expanded={collapsed}
          aria-label="Show Decide panel"
          title="Show Decide panel"
          className={`${TAB} hidden lg:flex`}
        >
          <span aria-hidden className="-mt-px">›</span>
        </button>
      </div>

      {scan}
    </div>
  );
}
