/**
 * Countries box (owner 2026-10-06) — 🙂/🐟 and/or 🥵/💀 from Canary RelRSI (daily)
 * on single-country ETFs (data/etf-country-universe.json → data/etf-country-alerts.json).
 * Same engine/config as Sector ETFs (etf-watch). Never invent signals.
 */
import countryJson from "../../data/etf-country-alerts.json";
import countryUniverse from "../../data/etf-country-universe.json";
import sectorUniverse from "../../data/etf-watch-universe.json";
import type { EtfWatchAlert, EtfWatchKind } from "@/lib/loadEtfWatchAlerts";

const KINDS = new Set<EtfWatchKind>(["smile", "fish", "exhaustion", "skull"]);

type Doc = {
  asOf?: string | null;
  signals?: EtfWatchAlert[];
  held?: boolean;
  heldSince?: string | null;
};

function isAlert(row: unknown): row is EtfWatchAlert {
  if (!row || typeof row !== "object") return false;
  const r = row as EtfWatchAlert;
  return (
    typeof r.ticker === "string" &&
    typeof r.asOf === "string" &&
    Array.isArray(r.signals) &&
    r.signals.length > 0 &&
    r.signals.every((s) => KINDS.has(s as EtfWatchKind))
  );
}

/** Current Countries list (owner 2026-10-09: top 20). A held/stale alerts file never shows dropped funds. */
const COUNTRY_TICKERS = new Set<string>((countryUniverse as { tickers?: string[] }).tickers ?? []);

export function loadEtfCountryAlerts(): EtfWatchAlert[] {
  const raw = countryJson as Doc;
  return (Array.isArray(raw?.signals) ? raw.signals : []).filter(
    (r) => isAlert(r) && (COUNTRY_TICKERS.size === 0 || COUNTRY_TICKERS.has(r.ticker))
  );
}

/** held-since date when the Countries scan was not refreshed on the pack session. */
export function loadEtfCountryHeldSince(): string | null {
  const raw = countryJson as Doc;
  return raw?.held ? (raw.heldSince ?? raw.asOf ?? null) : null;
}

/** Ticker → country name (e.g. EWJ → Japan). */
export const COUNTRY_NAMES: Record<string, string> =
  (countryUniverse as { names?: Record<string, string> }).names ?? {};

/** Ticker → fund name for the Sector ETFs universe. */
export const SECTOR_ETF_NAMES: Record<string, string> =
  (sectorUniverse as { names?: Record<string, string> }).names ?? {};
