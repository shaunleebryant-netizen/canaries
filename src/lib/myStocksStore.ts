"use client";

import { useCallback, useSyncExternalStore } from "react";

/**
 * My Stocks watchlist (owner t583u 2026-10-08, approved t583s2392; flag MEMBERS_MY_STOCKS, default ON).
 * Stored in localStorage on this device for now. TODO(accounts): once members auth (accounts mode)
 * is live, move this list to the member's account (D1) and keep localStorage only as a cache.
 * Only tickers from our scanner universe are ever stored (callers validate against it).
 */
const KEY = "canary.myStocks.v1";
const EVENT = "canary:mystocks";
const MAX = 60;

let cache: string[] | null = null;
const EMPTY: string[] = [];

function read(): string[] {
  if (cache) return cache;
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || "[]");
    cache = Array.isArray(raw) ? raw.filter((t): t is string => typeof t === "string").slice(0, MAX) : [];
  } catch {
    cache = [];
  }
  return cache;
}

function write(next: string[]) {
  cache = next.slice(0, MAX);
  try {
    localStorage.setItem(KEY, JSON.stringify(cache));
  } catch {
    /* storage full / private mode: keep in memory */
  }
  window.dispatchEvent(new Event(EVENT));
}

function subscribe(cb: () => void) {
  const onStorage = (e: StorageEvent) => {
    if (e.key === KEY) {
      cache = null;
      cb();
    }
  };
  window.addEventListener(EVENT, cb);
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener(EVENT, cb);
    window.removeEventListener("storage", onStorage);
  };
}

/** Saved tickers, newest first. `allowed` = the universe (anything else is ignored). */
export function useMyStocks(allowed?: Set<string>) {
  const list = useSyncExternalStore(subscribe, read, () => EMPTY);
  const toggle = useCallback(
    (ticker: string) => {
      const t = ticker.trim().toUpperCase();
      if (allowed && !allowed.has(t)) return;
      const cur = read();
      write(cur.includes(t) ? cur.filter((x) => x !== t) : [t, ...cur]);
    },
    [allowed]
  );
  const add = useCallback(
    (ticker: string) => {
      const t = ticker.trim().toUpperCase();
      if (allowed && !allowed.has(t)) return;
      const cur = read();
      if (!cur.includes(t)) write([t, ...cur]);
    },
    [allowed]
  );
  const visible = allowed ? list.filter((t) => allowed.has(t)) : list;
  return { list: visible, toggle, add, has: (t: string) => visible.includes(t.toUpperCase()) };
}
