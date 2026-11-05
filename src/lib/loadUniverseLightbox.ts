/**
 * Pack figures for the ticker lightbox. Fish-universe companies only.
 * Canary Score: data/growth-score.json. YoY EPS: data/fundamentals.json (`g` / `gw`).
 * Non-companies (ETFs, metals, crypto) are excluded the same way as scripts/build-fundamentals.mjs.
 * QoQ EPS and the Yahoo average target are not in the pack, so those cells stay empty.
 */
import fishUniverse from "../../data/fish-universe.json";
import { pickFundamentals } from "@/lib/loadFundamentals";
import { loadGrowthRanking, pickGrowth } from "@/lib/loadGrowthScore";
import type { LightboxFundSnap, UniverseLightboxPack } from "@/lib/tickerLightboxStats";

const NON_STOCKS = new Set(["GLD", "SLV", "SOXX", "IGV", "CIBR", "URA", "NLR", "XAR"]);

export function isUniverseCompany(ticker: string): boolean {
  const t = ticker.toUpperCase();
  return !NON_STOCKS.has(t) && !/USD$/.test(t);
}

export function loadUniverseLightbox(): UniverseLightboxPack {
  const tickers = ((fishUniverse as { tickers?: string[] }).tickers ?? []).map((t) => String(t).toUpperCase());
  const companies = tickers.filter(isUniverseCompany);
  const raw = pickFundamentals(companies);
  const fundamentals: Record<string, LightboxFundSnap> = {};
  for (const [t, row] of Object.entries(raw)) {
    if (row.k) continue;
    fundamentals[t] = {
      g: row.g,
      gw: row.gw,
      ...(row.n ? { n: row.n } : {}),
      ...(row.fe ? { fe: row.fe } : {}),
    };
  }
  return {
    companies,
    fundamentals,
    growth: pickGrowth(companies),
    growthScored: loadGrowthRanking().length,
  };
}
