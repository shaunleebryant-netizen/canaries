#!/usr/bin/env node
/**
 * Main Scanner (Bullish Setups / Bearish Setups) — compute from the current
 * pack data at one as-of, carry forward "added" dates from the previous run,
 * and write data/setups-history.json (+ mirror /home/box/canaries).
 *
 * The members page recomputes the same rules (src/lib/setupsCore.mjs) and reads
 * this history for added dates, so page and report always agree.
 *
 * Usage: node scripts/refresh-setups-history.mjs [--session-date YYYY-MM-DD] [--dry-run]
 */

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { ROOT, writeJson, mirrorData, parseCommonArgs } from "./lib/scan-common.mjs";
import { computeMainScanner, applySetupsHistory } from "../src/lib/setupsCore.mjs";

const DATA = join(ROOT, "data");
const OUT_NAME = "setups-history.json";

function readJson(name, fallback = null) {
  const p = join(DATA, name);
  if (!existsSync(p)) return fallback;
  return JSON.parse(readFileSync(p, "utf8"));
}

const rows = (doc, key = "signals") => (doc && Array.isArray(doc[key]) ? doc[key] : []);

export function loadMainScannerInput(sessionDate) {
  const marketState = readJson("market-state.json");
  const asOf =
    sessionDate ||
    marketState?.sessionDate ||
    readJson("full-pack-manifest.json")?.sessionDate ||
    marketState?.asOf;
  return {
    asOf,
    fish: rows(readJson("fish-alerts.json")),
    etfWatch: rows(readJson("etf-watch-alerts.json")),
    // 💵 print history (+ current rows); setupsCore counts the last 5 trading days only.
    moneyFlow: [
      ...rows(readJson("money-flow-alerts.json"), "prints"),
      ...rows(readJson("money-flow-alerts.json")),
    ],
    mfiSessionDates: readJson("money-flow-alerts.json")?.sessionDates ?? [],
    exhaustion: rows(readJson("exhaustion-alerts.json")),
    ibd: rows(readJson("ibd-setups-alerts.json")),
    marketStates: rows(marketState, "states"),
    monthly20: rows(readJson("monthly-20ma-alerts.json")),
  };
}

function main() {
  const args = parseCommonArgs(process.argv);
  const input = loadMainScannerInput(args.sessionDate);
  if (!input.asOf) {
    console.error("No as-of date (pass --session-date)");
    process.exit(2);
  }
  const prev = readJson(OUT_NAME, null);
  const result = applySetupsHistory(computeMainScanner(input), prev);
  const fmt = (r) =>
    `${r.ticker}(${r.count}:${r.conditions.map((c) => c.id).join("+")} added ${r.added})`;
  console.log(`Main Scanner @ ${result.asOf}`);
  console.log(`Bullish Setups ${result.bullish.length}: ${result.bullish.map(fmt).join(" ")}`);
  console.log(`Bearish Setups ${result.bearish.length}: ${result.bearish.map(fmt).join(" ")}`);
  console.log(`Left out of Bullish (also Bearish): ${result.excludedFromBullish.join(", ") || "(none)"}`);
  if (args.dryRun) return;
  writeJson(join(DATA, OUT_NAME), result.history);
  mirrorData(OUT_NAME);
  console.log(`wrote data/${OUT_NAME}`);

  // Standalone re-run: keep the full-pack manifest's Main Scanner report in
  // step with the history file when it is for the same as-of.
  const man = readJson("full-pack-manifest.json", null);
  if (man && man.sessionDate === result.asOf) {
    const list = (rows) => rows.map((r) => ({ ticker: r.ticker, count: r.count, conditions: r.conditions.map((c) => c.id), added: r.added }));
    man.mainScanner = {
      asOf: result.asOf,
      bullishSetups: list(result.bullish),
      bearishSetups: list(result.bearish),
      excludedFromBullish: result.excludedFromBullish,
    };
    for (const s of man.scripted || []) {
      if (s.box === "Bullish Setups") s.count = result.bullish.length;
      if (s.box === "Bearish Setups") s.count = result.bearish.length;
    }
    writeJson(join(DATA, "full-pack-manifest.json"), man);
    mirrorData("full-pack-manifest.json");
    console.log("updated data/full-pack-manifest.json mainScanner");
  }
}

main();
