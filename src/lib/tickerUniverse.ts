/**
 * Public ticker universe for the "Ticker Universe" pop-up (owner 2026-10-06).
 * Public-safe: tickers (and fund/country names where kept locally) only — no signals,
 * no options data. Sources: data/fish-universe.json (stocks), etf-watch-universe.json
 * (Sector ETFs), etf-country-universe.json (Countries), crypto-watch-universe.json (Crypto).
 */
import fishUniverse from "../../data/fish-universe.json";
import sectorUniverse from "../../data/etf-watch-universe.json";
import countryUniverse from "../../data/etf-country-universe.json";
import cryptoUniverse from "../../data/crypto-watch-universe.json";

export type UniverseItem = { ticker: string; name?: string };
export type UniverseGroup = { id: string; label: string; items: UniverseItem[] };

type U = {
  tickers?: string[];
  groups?: { tickers?: string[] }[];
  names?: Record<string, string>;
};

function itemsOf(u: U): UniverseItem[] {
  const raw = Array.isArray(u.tickers) && u.tickers.length
    ? u.tickers
    : (u.groups ?? []).flatMap((g) => g.tickers ?? []);
  const uniq = [...new Set(raw.map((t) => String(t).trim()).filter(Boolean))];
  uniq.sort((a, b) => a.localeCompare(b));
  return uniq.map((ticker) => (u.names?.[ticker] ? { ticker, name: u.names[ticker] } : { ticker }));
}

export function loadTickerUniverse(): UniverseGroup[] {
  return [
    { id: "stocks", label: "Stocks", items: itemsOf(fishUniverse as U) },
    { id: "sector-etfs", label: "Sector ETFs", items: itemsOf(sectorUniverse as U) },
    { id: "countries", label: "Countries", items: itemsOf(countryUniverse as U) },
    { id: "crypto", label: "Crypto", items: itemsOf(cryptoUniverse as U) },
  ];
}

/* ---------- Stock table rows (owner t1010u): Canary Score + fundamentals, server-built ---------- */
import type { GrowthRow } from "@/lib/loadGrowthScore";
import { pickGrowth } from "@/lib/loadGrowthScore";
import { loadAllFundamentals } from "@/lib/loadFundamentals";

export interface UniverseStockRow extends GrowthRow {
  t: string;
  name?: string;
  /** P/E (TTM). */
  pe?: number | null;
  /** EPS growth y/y (TTM) and q/q, fractions. */
  eg?: number | null;
  eq?: number | null;
  /** Analyst average target (only when more than 5 opinions) and implied gap vs last close. */
  tm?: number | null;
  ao?: number | null;
  tu?: number | null;
}

export function loadUniverseStockRows(): UniverseStockRow[] {
  const items = itemsOf(fishUniverse as U);
  const gs = pickGrowth(items.map((i) => i.ticker));
  const fu = loadAllFundamentals();
  return items.map(({ ticker: t, name }) => {
    const f = fu[t];
    const showT = f?.tm != null && (f.ao ?? 0) > 5;
    return {
      ...(gs[t] ?? { gs: null }),
      t,
      ...(name ? { name } : {}),
      pe: f?.pe ?? null,
      eg: f?.g ?? null,
      eq: f?.qq ?? null,
      tm: showT ? f!.tm! : null,
      ao: f?.ao ?? null,
      tu: showT && f!.p ? f!.tm! / f!.p - 1 : null,
    };
  });
}
