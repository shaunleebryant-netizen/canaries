#!/usr/bin/env node
/**
 * PRIVATE (owner page /owner): recompute the three filter stacks in data/private/options-scan.json from the
 * stored contract history with the CURRENT scripts/lib/options-scan-config.mjs — no Cboe fetch. Use after
 * changing a stack threshold. Does not touch the session, held state, leans or IV spikes.
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { OPTIONS_SCAN_CONFIG as C } from "./lib/options-scan-config.mjs";
import { buildStacks } from "./lib/options-stacks.mjs";
import { ROOT } from "./lib/scan-common.mjs";

const OUT = join(ROOT, "data/private/options-scan.json");
const HIST = join(ROOT, "data/private/options-contract-history.json");
if (!existsSync(OUT) || !existsSync(HIST)) {
  console.error("missing data/private/options-scan.json or options-contract-history.json");
  process.exit(1);
}
const out = JSON.parse(readFileSync(OUT, "utf8"));
const chist = JSON.parse(readFileSync(HIST, "utf8"));
const session = out.asOfSession;
if (!session || !chist.sessions[session]) {
  console.error(`no stored history for session ${session}`);
  process.exit(1);
}
out.stacks = buildStacks(chist, session, C);
out.thresholds = C.thresholds;
out.config = { proxies: C.proxies, stacks: C.stacks, history: { KEEP_SESSIONS: C.history.KEEP_SESSIONS } };
out.stacksRebuiltAt = new Date().toISOString();
writeFileSync(OUT, JSON.stringify(out, null, 2) + "\n");
const s = out.stacks;
console.log(`session ${session} · aggressive ${s.aggressive.total} · swing ${s.swing.total} · repeat ${s.repeat.building ? "building" : s.repeat.total}`);
