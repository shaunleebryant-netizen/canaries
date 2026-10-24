"use client";
import { useCallback, useEffect, useState } from "react";

const LS = "canary.watchlist";
/** Starred tickers. Signed-in accounts mode → /api/members/watchlist (D1); stub/preview → localStorage. */
export function useWatchlist() {
  const [list, setList] = useState<string[]>([]);
  const [server, setServer] = useState(false);
  useEffect(() => {
    let off = false;
    fetch("/api/members/watchlist").then(async (r) => {
      if (off) return;
      if (r.ok) { setServer(true); setList((await r.json()).tickers ?? []); }
      else { try { setList(JSON.parse(localStorage.getItem(LS) || "[]")); } catch { /* ignore */ } }
    }).catch(() => {});
    const on = (e: Event) => setList((e as CustomEvent<string[]>).detail);
    window.addEventListener("canary-watchlist", on);
    return () => { off = true; window.removeEventListener("canary-watchlist", on); };
  }, []);
  const toggle = useCallback(async (t: string) => {
    const has = list.includes(t);
    const next = has ? list.filter((x) => x !== t) : [t, ...list];
    setList(next);
    window.dispatchEvent(new CustomEvent("canary-watchlist", { detail: next }));
    if (server) {
      await fetch(has ? `/api/members/watchlist?ticker=${encodeURIComponent(t)}` : "/api/members/watchlist", {
        method: has ? "DELETE" : "POST", headers: { "content-type": "application/json" }, body: has ? undefined : JSON.stringify({ ticker: t }),
      }).catch(() => {});
    } else localStorage.setItem(LS, JSON.stringify(next));
  }, [list, server]);
  return { list, toggle, server };
}

export function StarButton({ t, wl }: { t: string; wl: ReturnType<typeof useWatchlist> }) {
  const on = wl.list.includes(t);
  return (
    <button type="button" data-star={t} aria-pressed={on} aria-label={on ? `Remove ${t} from watchlist` : `Add ${t} to watchlist`}
      onClick={(e) => { e.stopPropagation(); e.preventDefault(); wl.toggle(t); }}
      className={`rounded px-1 text-base leading-none ${on ? "text-canary-gold" : "text-slate-500 hover:text-slate-200"}`}>{on ? "★" : "☆"}</button>
  );
}
