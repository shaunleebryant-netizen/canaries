#!/usr/bin/env node
/**
 * Countries (ETF) — thin wrapper around the Canary RelRSI daily engine (scan-fish-v3.mjs).
 * Scans data/etf-country-universe.json → data/etf-country-alerts.json
 * (combined 🙂/🐟 and/or 🥵/💀 prints for single-country ETFs; owner 2026-10-06).
 */
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const engine = join(ROOT, "scripts/scan-fish-v3.mjs");
const universe = join(ROOT, "data/etf-country-universe.json");

const extra = process.argv.slice(2);
const r = spawnSync(
  process.execPath,
  [engine, "--universe", universe, "--out-prefix", "etf-country", ...extra],
  { stdio: "inherit", cwd: ROOT }
);
process.exit(r.status ?? 1);
