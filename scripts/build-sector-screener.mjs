#!/usr/bin/env node
/**
 * Sector Screener (owner t691u 2026-10-14; APPROVED t693u to ship with the Thu 15 Oct 11:24 AM NZ update;
 * flag MEMBERS_SECTOR_SCREENER, default ON). Runs nightly in the full pack (step 8g, non-fatal).
 * Fewer than 9 of 11 sectors → exit 1 WITHOUT writing, so the previous data/sector-screener.json is kept.
 * Yahoo daily closes (2y) for the 11 SPDR sectors + SPY → data/sector-screener.json:
 * 1D / 1W / 1M / 3M / YTD returns, relative strength vs SPY (1M and 3M excess),
 * calendar-month returns + rank (1 = best of 11) for the last 12 complete months and month-to-date.
 * Returns are price-only (no dividends). Nothing is invented: a missing series is listed in `failed`.
 */
import { buildScreener } from "./lib/screener-core.mjs";

const SECTORS = [
  ["XLK", "Technology"], ["XLY", "Cons. Discretionary"], ["XLC", "Communication"],
  ["XLF", "Financials"], ["XLI", "Industrials"], ["XLE", "Energy"], ["XLB", "Materials"],
  ["XLU", "Utilities"], ["XLP", "Cons. Staples"], ["XLV", "Health Care"], ["XLRE", "Real Estate"],
];
await buildScreener({ label: "sector-screener", list: SECTORS, outFile: "data/sector-screener.json", minOk: 9 });
