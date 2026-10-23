#!/usr/bin/env node
/**
 * Country Screener PREVIEW (owner t695u 2026-10-14; flag MEMBERS_COUNTRY_SCREENER, default OFF).
 * Full-pack step 8h (non-fatal, owner approved t696u 2026-10-14). Same top-20 list as the Countries box (data/etf-country-universe.json).
 * Fewer than 18 of 20 (<90%) → exit 1 WITHOUT writing, previous data/country-screener.json kept.
 * Returns are USD price returns of US-listed ETFs (include currency moves; dividends excluded).
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { ROOT } from "./lib/scan-common.mjs";
import { buildScreener } from "./lib/screener-core.mjs";

const u = JSON.parse(readFileSync(join(ROOT, "data/etf-country-universe.json"), "utf8"));
const list = u.tickers.map((t) => [t, u.names?.[t] ?? t]);
await buildScreener({
  label: "country-screener", list, outFile: "data/country-screener.json",
  minOk: Math.ceil(list.length * 0.9), extra: { universeAsOf: u.asOf, currency: "USD" },
});
