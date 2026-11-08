"use client";
/**
 * DRAFT (owner t959u 2026-11-02): per-ticker email alert prefs on My Stocks. Default off.
 * Signed-in + migration 0011 → saved to D1 via /api/members/ticker-alerts; otherwise this device
 * (localStorage) with a visible note. Read by scripts/watchlist-alerts.mjs (post-pack email digest, 2026-11-04).
 */
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

export const ALERT_CONDS = [
  { id: "fish", icon: "🐟", label: "Fish", side: "bull" },
  { id: "cci_fairy", icon: "🧚", label: "Fairy", side: "bull" },
  { id: "mfi_os", icon: "💵", label: "MFI washout", side: "bull" },
  { id: "smile", icon: "🙂", label: "Smile", side: "bull" },
  { id: "sweaty", icon: "🥵", label: "Sweaty", side: "bear" },
  { id: "skull", icon: "💀", label: "Skull", side: "bear" },
] as const;
const LS = "canary.tickerAlerts.v1";
const EV = "canary:tickeralerts";
type Prefs = Record<string, string[]>;
let shared: { prefs: Prefs; server: boolean } | null = null;
let loading: Promise<void> | null = null;

function load(): Promise<void> {
  if (loading) return loading;
  loading = fetch("/api/members/ticker-alerts").then(async (r) => {
    if (r.ok) shared = { prefs: (await r.json()).prefs ?? {}, server: true };
    else throw new Error();
  }).catch(() => {
    let p: Prefs = {};
    try { p = JSON.parse(localStorage.getItem(LS) || "{}"); } catch { /* ignore */ }
    shared = { prefs: p, server: false };
  }).finally(() => window.dispatchEvent(new Event(EV)));
  return loading;
}

export function useTickerAlerts() {
  const [, bump] = useState(0);
  useEffect(() => {
    const on = () => bump((n) => n + 1);
    window.addEventListener(EV, on);
    load();
    return () => window.removeEventListener(EV, on);
  }, []);
  const set = useCallback(async (ticker: string, conds: string[]) => {
    if (!shared) return;
    const next = { ...shared.prefs };
    if (conds.length) next[ticker] = conds; else delete next[ticker];
    shared = { ...shared, prefs: next };
    window.dispatchEvent(new Event(EV));
    if (shared.server) {
      const r = await fetch("/api/members/ticker-alerts", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ ticker, conds }) }).catch(() => null);
      if (r?.ok) return;
      shared = { ...shared, server: false }; // fall back to device storage
    }
    try { localStorage.setItem(LS, JSON.stringify(shared.prefs)); } catch { /* ignore */ }
    window.dispatchEvent(new Event(EV));
  }, []);
  return { prefs: shared?.prefs ?? {}, server: shared?.server ?? false, ready: !!shared, set };
}

export function TickerAlertsControl({ ticker, alerts }: { ticker: string; alerts: ReturnType<typeof useTickerAlerts> }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  // Owner 2026-11-02 (t981u): panel was clipped by the My Stocks card's overflow; render it in a
  // body portal with fixed positioning anchored to the button (flips up when there is no room below).
  const [pos, setPos] = useState<{ top?: number; bottom?: number; right: number } | null>(null);
  useLayoutEffect(() => {
    if (!open) return;
    const place = () => {
      const r = ref.current?.getBoundingClientRect();
      if (!r) return;
      const right = Math.max(8, window.innerWidth - r.right);
      const below = window.innerHeight - r.bottom;
      setPos(below < 300 && r.top > below ? { bottom: window.innerHeight - r.top + 4, right } : { top: r.bottom + 4, right });
    };
    place();
    window.addEventListener("scroll", place, true);
    window.addEventListener("resize", place);
    return () => {
      window.removeEventListener("scroll", place, true);
      window.removeEventListener("resize", place);
    };
  }, [open]);
  const cur = alerts.prefs[ticker] ?? [];
  const any = cur.includes("any");
  const on = cur.length > 0;
  useEffect(() => {
    if (!open) return;
    const off = (e: MouseEvent) => { const n = e.target as Node; if (!ref.current?.contains(n) && !panelRef.current?.contains(n)) setOpen(false); };
    document.addEventListener("mousedown", off);
    return () => document.removeEventListener("mousedown", off);
  }, [open]);
  const flip = (id: string) => {
    if (id === "any") return alerts.set(ticker, any ? [] : ["any"]);
    const base = any ? [] : cur;
    alerts.set(ticker, base.includes(id) ? base.filter((c) => c !== id) : [...base, id]);
  };
  const summary = any ? "any" : ALERT_CONDS.filter((c) => cur.includes(c.id)).map((c) => c.icon).join("");
  return (
    <div ref={ref} className="relative shrink-0">
      <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-label={`Email alerts for ${ticker}`}
        className={`rounded-md border px-2 py-1 text-[11px] ${on ? "border-canary-gold/50 text-canary-gold" : "border-white/10 text-slate-400 hover:text-slate-200"}`}>
        {on ? `🔔 ${summary}` : "🔕 Alerts"}
      </button>
      {open && pos && typeof document !== "undefined" ? createPortal(
        <div ref={panelRef} style={{ position: "fixed", ...pos }} className="z-[90] w-64 max-w-[calc(100vw-16px)] rounded-lg border border-white/15 bg-slate-950 p-3 text-xs shadow-xl">
          <p className="font-semibold text-white">Email me when {ticker} prints</p>
          {(["bull", "bear"] as const).map((side) => (
            <fieldset key={side} className="mt-2">
              <legend className={`text-[10px] uppercase tracking-wider ${side === "bull" ? "text-emerald-300" : "text-rose-300"}`}>{side === "bull" ? "Bullish marks" : "Bearish marks"}</legend>
              <div className="mt-1 grid grid-cols-2 gap-1">
                {ALERT_CONDS.filter((c) => c.side === side).map((c) => (
                  <label key={c.id} className={`flex items-center gap-1.5 ${any ? "opacity-50" : ""}`}>
                    <input type="checkbox" checked={any || cur.includes(c.id)} disabled={any} onChange={() => flip(c.id)} />
                    <span>{c.icon} {c.label}</span>
                  </label>
                ))}
              </div>
            </fieldset>
          ))}
          <label className="mt-2 flex items-center gap-1.5 border-t border-white/10 pt-2">
            <input type="checkbox" checked={any} onChange={() => flip("any")} /> <span>Any of these marks</span>
          </label>
          <p className="mt-2 text-[10px] leading-snug text-slate-500">
            One daily digest at most, after the nightly pack. Marks are study prompts, not buy or sell signals.
            {alerts.server ? " Saved to your account." : " Saved on this device for now (draft)."}
          </p>
        </div>
      , document.body) : null}
    </div>
  );
}
