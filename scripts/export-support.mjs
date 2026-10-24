#!/usr/bin/env node
/**
 * Export the D1 `support_requests` table (canary-members, REMOTE) to CSV for Google Drive.
 * Owner request 2026-09-28. Read-only (single SELECT). ip_hash is left out on purpose.
 *
 *   npm run export:support [-- --out <path>]
 *   default: /workspace/exports/support/support-requests-latest.csv (+ dated copy, NZ date)
 */
import { copyFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { SUPPORT_HEADER, supportRows, writeCsv } from "./lib/d1-csv.mjs";

const args = process.argv.slice(2);
const oi = args.indexOf("--out");
const OUT = oi >= 0 ? args[oi + 1] : "/workspace/exports/support/support-requests-latest.csv";
const n = writeCsv(OUT, SUPPORT_HEADER, supportRows());
const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Pacific/Auckland" }).format(new Date());
const dated = join(dirname(OUT), `support-requests-${today}.csv`);
if (oi < 0) copyFileSync(OUT, dated);
console.log(`support_requests: ${n} row(s) -> ${OUT}${oi < 0 ? ` (+ ${dated})` : ""}`);
