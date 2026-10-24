#!/usr/bin/env node
/**
 * ETF Watch — thin wrapper around the Canary RelRSI daily engine (scan-fish-v3.mjs).
 * Scans data/etf-watch-universe.json → data/etf-watch-alerts.json
 * (combined 🙂/🐟 and/or 🥵/💀 prints for ETFs/indexes/metals/uranium).
 */
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const engine = join(ROOT, "scripts/scan-fish-v3.mjs");
const universe = join(ROOT, "data/etf-watch-universe.json");

const extra = process.argv.slice(2);
const r = spawnSync(
  process.execPath,
  [engine, "--universe", universe, "--out-prefix", "etf-watch", ...extra],
  { stdio: "inherit", cwd: ROOT }
);
process.exit(r.status ?? 1);
