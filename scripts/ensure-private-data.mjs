#!/usr/bin/env node
/**
 * Prebuild: data/private/ is gitignored (Cboe personal-use data must never reach the public repo).
 * If the owner options scan file is missing (fresh clone), write an empty placeholder so the build
 * compiles; the owner page then shows "No options scan yet." Never overwrites real data.
 */
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const file = join(ROOT, "data/private/options-scan.json");
if (!existsSync(file)) {
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, JSON.stringify({ asOf: null, asOfSession: null, placeholder: true, held: false, heldSince: null, unusual: [], leans: [], ivSpikes: [] }, null, 2) + "\n");
  console.log("ensure-private-data: wrote placeholder data/private/options-scan.json");
}

// X Rumours owner audit (scripts/x-rumours-ingest.mjs): placeholder so /owner compiles on a fresh clone.
const xAudit = join(ROOT, "data/private/x-rumours-audit.json");
if (!existsSync(xAudit)) {
  mkdirSync(dirname(xAudit), { recursive: true });
  writeFileSync(xAudit, JSON.stringify({ asOf: null, generatedAt: null, placeholder: true, filtered: [], checks: [] }, null, 2) + "\n");
  console.log("ensure-private-data: wrote placeholder data/private/x-rumours-audit.json");
}
