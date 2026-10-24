#!/usr/bin/env node
/**
 * PRIVATE (owner page only): save the raw Cboe delayed chains for the scan universe to
 * data/private/raw/<session>/<TICKER>.json.gz so the Options Scanner can be re-run offline
 * (`scan-options-scanner.mjs --from-raw <session>`). Same polite pacing as the scanner. Never published.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { gzipSync } from "node:zlib";
import { join } from "node:path";
import { OPTIONS_SCAN_CONFIG } from "./lib/options-scan-config.mjs";
import { ROOT, YAHOO_UA, loadTickerList, FISH_UNIVERSE_PATH, sleep } from "./lib/scan-common.mjs";
import { OPTIONS_SCAN_ENABLED, OPTIONS_SCAN_PAUSED_REASON } from "./lib/options-scan-switch.mjs";

if (!OPTIONS_SCAN_ENABLED) {
  console.log(`${OPTIONS_SCAN_PAUSED_REASON}: OPTIONS_SCAN_ENABLED is not "true", so no Cboe requests were made.`);
  process.exit(0);
}

const F = OPTIONS_SCAN_CONFIG.fetch;
const NO = new Set(OPTIONS_SCAN_CONFIG.noOptions);
const tickers = loadTickerList(FISH_UNIVERSE_PATH).filter((t) => !NO.has(t));
const tmp = join(ROOT, "data/private/raw/_incoming");
mkdirSync(tmp, { recursive: true });
const sessions = {};
let ok = 0;
for (const t of tickers) {
  let body = null;
  for (const wait of [0, ...F.BACKOFF_MS]) {
    if (wait) await sleep(wait);
    try {
      const r = await fetch(`https://cdn.cboe.com/api/global/delayed_quotes/options/${encodeURIComponent(t)}.json`, { headers: { "User-Agent": YAHOO_UA, Accept: "application/json" } });
      if (r.status === 429 || r.status >= 500) continue;
      if (r.ok) body = await r.text();
      break;
    } catch { /* retry */ }
  }
  if (body) {
    try {
      const s = (JSON.parse(body).data?.last_trade_time || "").slice(0, 10);
      sessions[s] = (sessions[s] || 0) + 1;
      writeFileSync(join(tmp, `${t}.json.gz`), gzipSync(body));
      ok++;
    } catch { /* bad json */ }
  }
  process.stdout.write(body ? "." : "x");
  await sleep(F.GAP_MS);
}
const session = Object.entries(sessions).sort((a, b) => b[1] - a[1])[0]?.[0];
console.log(`\ncaptured ${ok}/${tickers.length} · sessions ${JSON.stringify(sessions)}`);
if (session) {
  const { renameSync, existsSync, rmSync } = await import("node:fs");
  const dest = join(ROOT, "data/private/raw", session);
  if (existsSync(dest)) rmSync(dest, { recursive: true });
  renameSync(tmp, dest);
  console.log(`saved → data/private/raw/${session}`);
}
