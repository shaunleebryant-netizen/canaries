/**
 * Pack figures for the ticker lightbox. Fish-universe companies only.
 * Canary Score: data/growth-score.json.
 * YoY / QoQ EPS and Yahoo avg target: data/fundamentals.json (`eg` or `g`, `eq`, `tm` / `ao`),
 * the same fields the universe table reads.
 * Non-companies (ETFs, metals, crypto) are excluded the same way as scripts/build-fundamentals.mjs.
 */
import fishUniverse from "../../data/fish-universe.json";
import { pickFundamentals } from "@/lib/loadFundamentals";
import { loadGrowthRanking, pickGrowth } from "@/lib/loadGrowthScore";
import { lightboxFundFromRow, type UniverseLightboxPack } from "@/lib/tickerLightboxStats";

const NON_STOCKS = new Set(["GLD", "SLV", "SOXX", "IGV", "CIBR", "URA", "NLR", "XAR"]);

export function isUniverseCompany(ticker: string): boolean {
  const t = ticker.toUpperCase();
  return !NON_STOCKS.has(t) && !/USD$/.test(t);
}

export function loadUniverseLightbox(): UniverseLightboxPack {
  const tickers = ((fishUniverse as { tickers?: string[] }).tickers ?? []).map((t) => String(t).toUpperCase());
  const companies = tickers.filter(isUniverseCompany);
  const raw = pickFundamentals(companies);
  const fundamentals: UniverseLightboxPack["fundamentals"] = {};
  for (const [t, row] of Object.entries(raw)) {
    if (row.k) continue;
    fundamentals[t] = lightboxFundFromRow(row);
  }
  return {
    companies,
    fundamentals,
    growth: pickGrowth(companies),
    growthScored: loadGrowthRanking().length,
  };
}
