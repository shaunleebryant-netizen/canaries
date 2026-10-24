#!/usr/bin/env node
/**
 * Full-pack local refresh — one shared sessionDate/asOf for every live box.
 *
 * Owner locks:
 * - Any website ship must refresh ALL live boxes on one shared as-of.
 *   Never partial staggered box refreshes.
 * - Token cut = scripting, not staggered boxes.
 * - This command prepares data locally + mirrors under /home/box/canaries/.
 * - Ship/deploy is a separate step (owner yes). Never invent scores/prints.
 *
 * Steps: 1 Vol curve (Yahoo) · 2 Decide scripted points score (+ Regime v2,
 * sparklines) · 4 Liquidity · 5 Vanna/Charm · 6 Fish/Sweaty · 6b ETF/Countries/Crypto ·
 * 7 MFI · 7b IBD · 7c Weekly state + Monthly 20MA · 8 Main Scanner ·
 * 8b Commentary (reads the new S) · 9 private owner Options Scanner (never blocks the pack;
 *   PAUSED by default since 2026-09-28, see scripts/lib/options-scan-switch.mjs: zero Cboe requests).
 * Held data is never stamped with the pack as-of (held:true + heldSince).
 *
 * Usage:
 *   npm run refresh:full-pack
 *   node scripts/refresh-full-pack.mjs [--session-date YYYY-MM-DD] [--allow-gaps]
 *
 * Exit codes:
 *   0 — all scripted boxes refreshed; no hard gaps
 *   1 — hard gaps (a scripted public step failed)
 *   2 — usage / fatal setup error
 */

import { spawnSync } from "node:child_process";
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { OPTIONS_SCAN_ENABLED, OPTIONS_SCAN_PAUSED_REASON, OPTIONS_SCAN_PAUSED_SINCE } from "./lib/options-scan-switch.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const DATA = join(ROOT, "data");
const MIRROR = "/home/box/canaries";
function parseArgs(argv) {
  const out = { sessionDate: null, allowGaps: false };
  for (let i = 2; i < argv.length; i++) {
    if (argv[i] === "--session-date") out.sessionDate = argv[++i];
    else if (argv[i] === "--allow-gaps") out.allowGaps = true;
    else if (argv[i] === "--help" || argv[i] === "-h") out.help = true;
  }
  return out;
}

function nyToday() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const g = (t) => parts.find((p) => p.type === t)?.value;
  return `${g("year")}-${g("month")}-${g("day")}`;
}

function nzNowIso() {
  const d = new Date();
  const parts = new Intl.DateTimeFormat("en-NZ", {
    timeZone: "Pacific/Auckland",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(d);
  const g = (t) => parts.find((p) => p.type === t)?.value;
  const asUtc = Date.UTC(
    Number(g("year")),
    Number(g("month")) - 1,
    Number(g("day")),
    Number(g("hour")),
    Number(g("minute")),
    Number(g("second"))
  );
  const diffMin = Math.round((asUtc - d.getTime()) / 60000);
  const sign = diffMin >= 0 ? "+" : "-";
  const abs = Math.abs(diffMin);
  const hh = String(Math.floor(abs / 60)).padStart(2, "0");
  const mm = String(abs % 60).padStart(2, "0");
  return `${g("year")}-${g("month")}-${g("day")}T${g("hour")}:${g("minute")}:${g("second")}${sign}${hh}:${mm}`;
}

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function writeJson(path, obj) {
  writeFileSync(path, JSON.stringify(obj, null, 2) + "\n");
}

function runNode(relScript, args = []) {
  const script = join(ROOT, relScript);
  console.log(`\n>>> node ${relScript} ${args.join(" ")}`.trim());
  const r = spawnSync(process.execPath, [script, ...args], {
    cwd: ROOT,
    encoding: "utf8",
    timeout: 900_000,
  });
  if (r.stdout) process.stdout.write(r.stdout);
  if (r.stderr) process.stderr.write(r.stderr);
  return r.status ?? 1;
}

function mirror(name) {
  const src = join(DATA, name);
  if (!existsSync(src) || !existsSync(MIRROR)) return false;
  try {
    copyFileSync(src, join(MIRROR, name));
    return true;
  } catch (e) {
    console.warn(`mirror skip ${name}:`, e instanceof Error ? e.message : e);
    return false;
  }
}

/**
 * Stamp pack session metadata. Audit P3: the pack as-of is only stamped onto a
 * file whose own data asOf reached the session. Held data keeps its own asOf
 * and gets held:true + heldSince instead (UI shows "held since YYYY-MM-DD").
 */
function stampPackMeta(obj, sessionDate, scannedAt, extra = {}) {
  const own = typeof obj.asOf === "string" ? obj.asOf.slice(0, 10) : null;
  const held = own != null && own < sessionDate;
  return {
    ...obj,
    sessionDate,
    ...(held ? { packAsOf: undefined, held: true, heldSince: own } : { packAsOf: sessionDate, held: false, heldSince: null }),
    packScannedAt: scannedAt,
    ...extra,
  };
}

async function main() {
  const args = parseArgs(process.argv);
  if (args.help) {
    console.log(`Usage: node scripts/refresh-full-pack.mjs [--session-date YYYY-MM-DD] [--allow-gaps]`);
    process.exit(0);
  }

  const sessionDate = args.sessionDate || nyToday();
  const scannedAt = nzNowIso();
  const steps = [];
  const gaps = [];
  const scripted = [];

  console.log("═══════════════════════════════════════════════════════════");
  console.log(" FULL-PACK REFRESH (local only — does not deploy)");
  console.log(` sessionDate / asOf : ${sessionDate}`);
  console.log(` scannedAt (PT/NZ)  : ${scannedAt}`);
  console.log("═══════════════════════════════════════════════════════════");

  // --- 1) Vol curve — Yahoo ^VIX / ^VIX3M (audit P3; was a stamp of hand-typed TV prints)
  let volReport = null;
  {
    const code = runNode("scripts/refresh-vol-curve.mjs", ["--session-date", sessionDate]);
    steps.push({ box: "Vol curve", ok: code === 0, via: "refresh-vol-curve.mjs" });
    const vol = existsSync(join(DATA, "vol-curve-stub.json")) ? readJson(join(DATA, "vol-curve-stub.json")) : null;
    if (vol) {
      volReport = {
        asOf: vol.asOf,
        vix: vol.feeds?.vix?.value ?? null,
        vix3m: vol.feeds?.vix3m?.value ?? null,
        ratio: vol.computed?.mediumRatio ?? null,
        band: vol.computed?.band ?? null,
        held: Boolean(vol.held),
        heldSince: vol.heldSince ?? null,
      };
      scripted.push({
        box: "Vol curve",
        file: "data/vol-curve-stub.json",
        action: `Yahoo VIX ${volReport.vix} / VIX3M ${volReport.vix3m} → ${volReport.ratio} ${volReport.band} @ ${vol.asOf}`,
        asOf: vol.asOf,
      });
    }
    if (code !== 0 || !vol || vol.held) {
      gaps.push({ box: "Vol curve", reason: `refresh-vol-curve.mjs exit ${code}${vol?.heldSince ? ` — held since ${vol.heldSince}` : ""}` });
    }
  }

  // --- 2) Decide — scripted nightly points score (audit P2). Writes state.json
  //         (+ state.prev.json), regime-history.json (Regime v2 pill + prior
  //         day) and canary-sparklines.json. Scorekeeper fills only FINRA and
  //         failed feeds via /home/box/canaries/decide-fills.json.
  let decideReport = null;
  {
    const code = runNode("scripts/refresh-decide.mjs", ["--session-date", sessionDate]);
    steps.push({ box: "Decide/composite (state.json)", ok: code === 0, via: "refresh-decide.mjs" });
    if (code === 0) {
      decideReport = readJson(join(DATA, "decide-summary.json"));
      for (const f of ["state.json", "state.prev.json", "regime-history.json", "canary-sparklines.json"]) mirror(f);
      scripted.push({
        box: "Decide/composite (state.json)",
        file: "data/state.json",
        action: `scripted points score S=${decideReport.S} ${String(decideReport.light).toUpperCase()} (prev S=${decideReport.oldS} ${String(decideReport.oldLight).toUpperCase()})`,
        held: decideReport.needsFill.map((n) => `${n.id} (held since ${n.heldSince})`),
      });
      scripted.push({
        box: "Market Regime v2",
        file: "data/regime-history.json",
        action: `R=${decideReport.regime.R} ${decideReport.regime.raw} (shown ${decideReport.regime.shown}) · Spec ${decideReport.regime.spec}`,
      });
      scripted.push({
        box: "Canary sparklines",
        file: "data/canary-sparklines.json",
        action: "10-session lines from the Decide series",
      });
    } else {
      gaps.push({ box: "Decide/composite", reason: `refresh-decide.mjs exit ${code} — state.json left as-is (held)` });
    }
  }

  // --- 4) Liquidity (volume breadth) — real refresh (Yahoo → TV guest → cached history)
  {
    const code = runNode("scripts/refresh-volume-breadth.mjs", [
      "--session-date",
      sessionDate,
    ]);
    steps.push({
      box: "Liquidity (volume breadth)",
      ok: code === 0,
      via: "refresh-volume-breadth.mjs",
    });
    if (code === 0) {
      const vb = join(DATA, "volume-breadth-stub.json");
      if (existsSync(vb)) {
        const doc = readJson(vb);
        writeJson(vb, stampPackMeta(doc, sessionDate, scannedAt));
        mirror("volume-breadth-stub.json");
        mirror("volume-breadth-tv-history.json");
        scripted.push({
          box: "Liquidity (volume breadth)",
          file: "data/volume-breadth-stub.json",
          action: `refreshed asOf=${doc.asOf} regime=${doc.regime} via ${doc.source || "refresh-volume-breadth"}`,
          asOf: doc.asOf,
        });
        if (doc.asOf && doc.asOf < sessionDate) {
          gaps.push({
            box: "Liquidity (volume breadth)",
            reason: `Latest UVOL/DVOL bar ${doc.asOf} < sessionDate ${sessionDate} (feed lag/holiday — not invented)`,
          });
        }
      }
    } else {
      gaps.push({
        box: "Liquidity (volume breadth)",
        reason: `refresh-volume-breadth.mjs exit ${code}`,
      });
    }
  }

  // --- 5) Vanna & Charm — calendar rule (computed live in app); write stamp file for pack parity
  {
    const vannaPath = join(DATA, "vanna-charm-pack.json");
    // Mirror classify logic lightly for the stamp file
    const [y, m, d] = sessionDate.split("-").map(Number);
    const first = new Date(Date.UTC(y, m - 1, 1, 12));
    const firstDow = first.getUTCDay();
    const nth = (weekday, n) =>
      1 + ((weekday - firstDow + 7) % 7) + (n - 1) * 7;
    const start = nth(4, 1); // Thu
    const end = nth(3, 3); // Wed
    const status = d >= start && d <= end ? "SUPPORTIVE" : "ON_HOLIDAY";
    writeJson(vannaPath, {
      sessionDate,
      asOf: sessionDate,
      packScannedAt: scannedAt,
      status,
      window: { start, end },
      note: "NY calendar rule (1st Thu → 3rd Wed). Live UI also computes this; stamp for pack parity.",
    });
    mirror("vanna-charm-pack.json");
    scripted.push({
      box: "Vanna & Charm",
      file: "data/vanna-charm-pack.json",
      action: `calendar ${status}`,
    });
  }

  // --- 6) Fish + Sweaty (Canary RelRSI daily; config src/lib/canaryTopsBottomsConfig.mjs)
  {
    const code = runNode("scripts/scan-fish-v3.mjs");
    steps.push({ box: "Fish + Sweaty", ok: code === 0, via: "scan-fish-v3.mjs" });
    if (code === 0) {
      for (const name of ["fish-alerts.json", "exhaustion-alerts.json"]) {
        const doc = readJson(join(DATA, name));
        writeJson(
          join(DATA, name),
          stampPackMeta(doc, sessionDate, scannedAt, {
            method: doc.method || "yahoo-1d-canary-tops-bottoms-daily",
            note:
              (doc.note || "") +
              ` · full-pack session ${sessionDate} · Canary RelRSI daily`,
          })
        );
        mirror(name);
      }
      const fish = readJson(join(DATA, "fish-alerts.json"));
      const exh = readJson(join(DATA, "exhaustion-alerts.json"));
      scripted.push({
        box: "Fish",
        file: "data/fish-alerts.json",
        count: (fish.signals || []).length,
        method: fish.method,
      });
      scripted.push({
        box: "Sweaty",
        file: "data/exhaustion-alerts.json",
        count: (exh.signals || []).length,
        method: exh.method,
      });
    } else {
      gaps.push({ box: "Fish/Sweaty", reason: `scan-fish-v3.mjs exit ${code}` });
    }
  }

  // --- 6b) ETF Watch + Crypto Watch (Canary RelRSI combined, same config)
  for (const watch of [
    {
      box: "ETF Watch",
      script: "scripts/scan-etf-watch.mjs",
      file: "etf-watch-alerts.json",
      label: "ETF Watch Canary RelRSI daily",
    },
    {
      // Owner 2026-10-06: ETF box split into Sector ETFs (etf-watch) + Countries (etf-country).
      box: "Countries",
      script: "scripts/scan-etf-country.mjs",
      file: "etf-country-alerts.json",
      label: "Countries (ETF) Canary RelRSI daily",
    },
    {
      box: "Crypto Watch",
      script: "scripts/scan-crypto-watch.mjs",
      file: "crypto-watch-alerts.json",
      label: "Crypto Watch Canary RelRSI daily (UTC candles for spot crypto)",
    },
  ]) {
    const code = runNode(watch.script);
    steps.push({ box: watch.box, ok: code === 0, via: watch.script });
    if (code === 0) {
      const doc = readJson(join(DATA, watch.file));
      writeJson(
        join(DATA, watch.file),
        stampPackMeta(doc, sessionDate, scannedAt, {
          method: doc.method || "yahoo-1d-canary-tops-bottoms-daily",
          note:
            (doc.note || "") +
            ` · full-pack session ${sessionDate} · ${watch.label}`,
        })
      );
      mirror(watch.file);
      scripted.push({
        box: watch.box,
        file: `data/${watch.file}`,
        count: (doc.signals || []).length,
        method: doc.method,
      });
    } else {
      gaps.push({
        box: watch.box,
        reason: `${watch.script} exit ${code}`,
      });
    }
  }

  // --- 7) MFI Scan — MFI Washout v6.1 (owner t577u 2026-10-07; v6 + depth & 🐟/🙂 gates; MFI_ENGINE=v6 rolls back)
  {
    const code = runNode("scripts/scan-mfi-washout.mjs", ["--session-date", sessionDate]);
    steps.push({ box: "MFI Scan", ok: code === 0, via: "scan-mfi-washout.mjs" });
    if (code === 0) {
      const name = "money-flow-alerts.json";
      const doc = readJson(join(DATA, name));
      writeJson(
        join(DATA, name),
        stampPackMeta(doc, sessionDate, scannedAt, {
          method: doc.method || "yahoo-1d-mfi-washout-v6.1",
          note:
            (doc.note || "") +
            ` · full-pack session ${sessionDate} · ${doc.engine || "MFI Washout v6.1"}`,
        })
      );
      mirror(name);
      scripted.push({
        box: "MFI Scan",
        file: "data/" + name,
        count: (doc.signals || []).length,
        method: doc.method,
      });
    } else {
      gaps.push({
        box: "MFI Scan",
        reason: `scan-mfi-washout.mjs exit ${code}`,
      });
    }
  }

  // --- 7b) IBD Setups (Minervini + IBD-style RS vs SPY)
  {
    const code = runNode("scripts/scan-ibd-setups.mjs");
    steps.push({ box: "IBD Setups", ok: code === 0, via: "scan-ibd-setups.mjs" });
    if (code === 0) {
      const name = "ibd-setups-alerts.json";
      const doc = readJson(join(DATA, name));
      writeJson(
        join(DATA, name),
        stampPackMeta(doc, sessionDate, scannedAt, {
          method: doc.method || "yahoo-1d-minervini-ibd-rs-vs-spy",
          note:
            (doc.note || "") +
            ` · full-pack session ${sessionDate} · Minervini+RS daily setup==true`,
        })
      );
      mirror(name);
      scripted.push({
        box: "IBD Setups",
        file: "data/" + name,
        count: (doc.signals || []).length,
        method: doc.method,
      });
    } else {
      gaps.push({
        box: "IBD Setups",
        reason: `scan-ibd-setups.mjs exit ${code}`,
      });
    }
  }

  // --- 7c) Weekly Market State (Weekly State + Bullish & Strong boxes) and
  //          Monthly 20MA — universe = MFI Scan universe (fish ∪ ETF Watch)
  for (const scan of [
    {
      box: "Weekly Market State (Weekly State + Bullish & Strong)",
      script: "scripts/scan-market-state.mjs",
      file: "market-state.json",
      method: "yahoo-1wk-market-state-ema9-12-16-21-ohlc4",
      label: "weekly market state (ohlc4 EMA 9/12/16/21, current week included)",
      count: (doc) =>
        doc.counts
          ? `bull ${doc.counts.bull} / bear ${doc.counts.bear} / down ${doc.counts.down}`
          : null,
    },
    {
      box: "Monthly 20MA",
      script: "scripts/scan-monthly-20ma.mjs",
      file: "monthly-20ma-alerts.json",
      method: "yahoo-1mo-sma20-cross-above",
      label: "monthly close cross above SMA20",
      count: (doc) => (doc.signals || []).length,
    },
  ]) {
    const code = runNode(scan.script, ["--session-date", sessionDate]);
    steps.push({ box: scan.box, ok: code === 0, via: scan.script });
    if (code === 0) {
      const doc = readJson(join(DATA, scan.file));
      writeJson(
        join(DATA, scan.file),
        stampPackMeta(doc, sessionDate, scannedAt, {
          method: doc.method || scan.method,
          note:
            (doc.note || "") + ` · full-pack session ${sessionDate} · ${scan.label}`,
        })
      );
      mirror(scan.file);
      scripted.push({
        box: scan.box,
        file: "data/" + scan.file,
        count: scan.count(doc),
        method: doc.method,
        asOf: doc.asOf,
        failed: (doc.failed || []).length,
      });
      if (doc.asOf && doc.asOf < sessionDate) {
        gaps.push({
          box: scan.box,
          reason: `Latest Yahoo bar ${doc.asOf} < sessionDate ${sessionDate} (feed lag/holiday — not invented)`,
        });
      }
    } else {
      gaps.push({ box: scan.box, reason: `${scan.script} exit ${code}` });
    }
  }

  // --- 8) Main Scanner — Bullish Setups + Bearish Setups (≥2 conditions each)
  //         Rules: src/lib/setupsCore.mjs (same code as the members page).
  //         Writes data/setups-history.json (added dates carried run-to-run).
  let mainScannerReport = null;
  {
    const code = runNode("scripts/refresh-setups-history.mjs", [
      "--session-date",
      sessionDate,
    ]);
    steps.push({
      box: "Main Scanner (Bullish Setups + Bearish Setups)",
      ok: code === 0,
      via: "refresh-setups-history.mjs",
    });
    if (code === 0) {
      const hist = readJson(join(DATA, "setups-history.json"));
      const list = (side) =>
        Object.entries(hist[side] || {})
          .map(([ticker, h]) => ({
            ticker,
            count: h.count,
            conditions: h.conditions,
            added: h.added,
          }))
          .sort(
            (a, b) =>
              b.count - a.count ||
              String(b.added).localeCompare(String(a.added)) ||
              a.ticker.localeCompare(b.ticker)
          );
      mainScannerReport = {
        asOf: hist.asOf,
        bullishSetups: list("bullish"),
        bearishSetups: list("bearish"),
        excludedFromBullish: hist.excludedFromBullish ?? [],
      };
      scripted.push({
        box: "Bullish Setups",
        file: "data/setups-history.json (derived)",
        count: mainScannerReport.bullishSetups.length,
        action:
          "≥2 conditions incl. ≥1 timing print (🐟 Fish / 😊 Smiley / 🤑 MFI≤20 within 14 calendar days of sessionDate); 🟢 weekly bull, 📈 Monthly 20MA cross and IBD setup count toward the total but cannot qualify alone; tickers that also meet Bearish Setups are left out",
      });
      scripted.push({
        box: "Bearish Setups",
        file: "data/setups-history.json (derived)",
        count: mainScannerReport.bearishSetups.length,
        action:
          "≥2 conditions incl. ≥1 timing print (😡 MFI≥80 / 🥵 Sweaty / 💀 Skull within 14 calendar days of sessionDate); 🔴 weekly bear counts toward the total",
      });
    } else {
      gaps.push({
        box: "Main Scanner (Bullish/Bearish Setups)",
        reason: `refresh-setups-history.mjs exit ${code}`,
      });
    }
  }

  // --- 8b) Commentary — regenerate from live state + vol + liquidity + quotes (does NOT change Decide S)
  {
    const code = runNode("scripts/refresh-commentary.mjs", [
      "--session-date",
      sessionDate,
    ]);
    steps.push({ box: "Commentary", ok: code === 0, via: "refresh-commentary.mjs" });
    if (code === 0) {
      const name = "commentary.json";
      const doc = readJson(join(DATA, name));
      writeJson(join(DATA, name), stampPackMeta(doc, sessionDate, scannedAt));
      mirror(name);
      scripted.push({
        box: "Commentary",
        file: "data/" + name,
        action: `headline: ${doc.headline || "(none)"}`,
      });
    } else {
      gaps.push({
        box: "Commentary",
        reason: `refresh-commentary.mjs exit ${code}`,
      });
    }
  }

  // --- 8c) Members Signal History (History tab; owner approved 2026-10-07). Adds this session's
  //     🐟 / 🙂 / 💵 marks to data/signal-history.json (idempotent), refreshes price now, tags
  //     left-universe tickers, prunes to the 6-month window. NON-FATAL: a failure keeps the previous
  //     file and is logged as a warning, never a gap (the pack and deploy carry on).
  let signalHistoryReport = null;
  {
    let code = 1;
    try {
      code = runNode("scripts/update-signal-history.mjs", ["--session-date", sessionDate]);
    } catch (e) {
      console.warn("  signal history step threw:", e instanceof Error ? e.message : e);
    }
    steps.push({ box: "Signal History (members History tab)", ok: code === 0, via: "update-signal-history.mjs", optional: true });
    if (code === 0) {
      try {
        const doc = readJson(join(DATA, "signal-history.json"));
        signalHistoryReport = { ok: true, asOf: doc.asOf, windowStart: doc.windowStart, rows: (doc.rows || []).length, lastRun: doc.lastRun ?? null };
        scripted.push({
          box: "Signal History",
          file: "data/signal-history.json",
          count: (doc.rows || []).length,
          action: `+${doc.lastRun?.added ?? 0} marks, −${doc.lastRun?.pruned ?? 0} pruned · ${doc.windowStart} → ${doc.asOf}`,
        });
      } catch (e) {
        signalHistoryReport = { ok: false, warning: `read failed: ${e instanceof Error ? e.message : e}` };
      }
    } else {
      signalHistoryReport = { ok: false, warning: `update-signal-history.mjs exit ${code} — previous history kept` };
      console.warn(`  WARNING (non-fatal): Signal History not updated (exit ${code}); previous file kept, pack continues.`);
    }
  }

  // --- 8d) Ticker chart lightbox data (owner approved t583s2392 2026-10-08). One small JSON per ticker
  //     (12 months daily OHLCV + our marks, same engine ports as the boxes) → public/_chartdata/,
  //     served members-only via /api/members/chart/[ticker] (direct hits 404 in worker-entry.mjs).
  //     NON-FATAL: a failure keeps the previous files and is logged as a warning, never a gap.
  let tickerChartsReport = null;
  {
    let code = 1;
    try {
      code = runNode("scripts/build-ticker-charts.mjs", ["--session-date", sessionDate]);
    } catch (e) {
      console.warn("  ticker charts step threw:", e instanceof Error ? e.message : e);
    }
    steps.push({ box: "Ticker charts (members lightbox)", ok: code === 0, via: "build-ticker-charts.mjs", optional: true });
    if (code === 0) {
      try {
        const idx = JSON.parse(readFileSync(join(ROOT, "public/_chartdata/index.json"), "utf8"));
        const n = Object.keys(idx.tickers || {}).length;
        tickerChartsReport = { ok: true, tickers: n, builtAt: idx.builtAt };
        scripted.push({ box: "Ticker charts", file: "public/_chartdata/", count: n, action: `${n} ticker chart files` });
      } catch (e) {
        tickerChartsReport = { ok: false, warning: `index read failed: ${e instanceof Error ? e.message : e}` };
      }
    } else {
      tickerChartsReport = { ok: false, warning: `build-ticker-charts.mjs exit ${code} — previous chart files kept` };
      console.warn(`  WARNING (non-fatal): ticker charts not rebuilt (exit ${code}); previous files kept, pack continues.`);
    }
  }

  // --- 8d2) Canary chart pop-up data (owner approved 2026-10-09 7:25 PM NZ). Replays each canary's
  //     scoring rule per day over ~12 months (same Yahoo / TradingView inputs as the scoring) →
  //     public/_chartdata/canary/<id>.json + index.json, served members-only via
  //     /api/members/canary-chart/[id] (direct /_chartdata/* hits 404 in worker-entry.mjs).
  //     NON-FATAL: a failure keeps the previous files and is logged as a warning, never a gap.
  let canaryChartsReport = null;
  {
    let code = 1;
    try {
      code = runNode("scripts/build-canary-charts.mjs", ["--session-date", sessionDate]);
    } catch (e) {
      console.warn("  canary charts step threw:", e instanceof Error ? e.message : e);
    }
    steps.push({ box: "Canary charts (members pop-up)", ok: code === 0, via: "build-canary-charts.mjs", optional: true });
    if (code === 0) {
      try {
        const idx = JSON.parse(readFileSync(join(ROOT, "public/_chartdata/canary/index.json"), "utf8"));
        const n = Array.isArray(idx.charted) ? idx.charted.length : 0;
        canaryChartsReport = { ok: true, canaries: n, asOf: idx.asOf ?? null };
        scripted.push({ box: "Canary charts", file: "public/_chartdata/canary/", count: n, action: `${n} canary chart files` });
      } catch (e) {
        canaryChartsReport = { ok: false, warning: `canary index read failed: ${e instanceof Error ? e.message : e}` };
      }
    } else {
      canaryChartsReport = { ok: false, warning: `build-canary-charts.mjs exit ${code} — previous canary chart files kept` };
      console.warn(`  WARNING (non-fatal): canary charts not rebuilt (exit ${code}); previous files kept, pack continues.`);
    }
  }

  // --- 8e) Insider Buying sub scanner (owner approved 2026-10-09, t595u). SEC EDGAR Form 4
  //     (named User-Agent, <= 5 req/s, filings cached by accession under /home/box/canaries/cache/
  //     edgar-form4) → data/insider-buying.json → members Sub Scanners "Insider Buying" box.
  //     Members only; NOT a Bullish Setups condition. NON-FATAL: a failure keeps the previous file
  //     and is logged as a warning, never a gap (the pack and deploy carry on).
  let insiderBuyingReport = null;
  {
    let code = 1;
    try {
      code = runNode("scripts/scan-insider-buying.mjs", ["--session-date", sessionDate]);
    } catch (e) {
      console.warn("  insider buying step threw:", e instanceof Error ? e.message : e);
    }
    steps.push({ box: "Insider Buying (members sub scanner)", ok: code === 0, via: "scan-insider-buying.mjs", optional: true });
    if (code === 0) {
      try {
        const doc = readJson(join(DATA, "insider-buying.json"));
        const n = (doc.signals || []).length;
        insiderBuyingReport = { ok: true, asOf: doc.asOf, qualifying: n, tickers: (doc.signals || []).map((x) => x.ticker), filingsChecked: doc.filingsChecked, requests: doc.fetch?.requests ?? null };
        scripted.push({ box: "Insider Buying", file: "data/insider-buying.json", count: n, action: `${n} qualifying · ${doc.filingsChecked} Form 4s checked` });
        mirror("insider-buying.json");
      } catch (e) {
        insiderBuyingReport = { ok: false, warning: `read failed: ${e instanceof Error ? e.message : e}` };
      }
    } else {
      insiderBuyingReport = { ok: false, warning: `scan-insider-buying.mjs exit ${code} — previous file kept` };
      console.warn(`  WARNING (non-fatal): Insider Buying not refreshed (exit ${code}); previous file kept, pack continues.`);
    }
    // 8e-ii) Past insider buys (3 months) — owner 2026-10-10, members Insiders tab. The full scan above
    // already rewrites data/insider-history.json (90-day buys + % since from this pack's closes). If the
    // scan failed, re-price the previous history from tonight's closes (no network) so "% since" still
    // moves. Non-fatal.
    let histCode = code === 0 ? 0 : 1;
    if (code !== 0) {
      try {
        histCode = runNode("scripts/scan-insider-buying.mjs", ["--prices-only", "--session-date", sessionDate]);
      } catch (e) {
        console.warn("  insider history re-price threw:", e instanceof Error ? e.message : e);
      }
    }
    try {
      const h = readJson(join(DATA, "insider-history.json"));
      insiderBuyingReport = { ...(insiderBuyingReport || {}), history: { ok: histCode === 0, asOf: h.asOf, buys: (h.buys || []).length, priced: h.priced ?? null, repricedOnly: code !== 0 } };
      if (histCode === 0) {
        scripted.push({ box: "Past insider buys (3 months)", file: "data/insider-history.json", count: (h.buys || []).length, action: `${(h.buys || []).length} buys since ${h.windowStart} · % since re-priced` });
        mirror("insider-history.json");
      }
    } catch (e) {
      console.warn("  WARNING (non-fatal): insider history not readable:", e instanceof Error ? e.message : e);
    }
  }

  // --- 8e3) Fundamentals for the Main Scanner columns (owner approved 2026-10-10: Bullish / Bearish
  //     Setups P/E · EPS g y/y · EV/EBITDA). SEC EDGAR company facts (cached; re-fetched only when
  //     submissions show a new 10-K/10-Q/20-F/40-F/6-K) + this pack's closes → data/fundamentals.json.
  //     Runs after Insider Buying so the shared submissions cache is warm. docs/ops/full-pack-refresh.md.
  //     NON-FATAL: a failure keeps the previous file and is logged as a warning, never a gap.
  let fundamentalsReport = null;
  {
    let code = 1;
    try {
      code = runNode("scripts/build-fundamentals.mjs", ["--session-date", sessionDate]);
    } catch (e) {
      console.warn("  fundamentals step threw:", e instanceof Error ? e.message : e);
    }
    steps.push({ box: "Fundamentals (Main Scanner columns)", ok: code === 0, via: "build-fundamentals.mjs", optional: true });
    if (code === 0) {
      try {
        const doc = readJson(join(DATA, "fundamentals.json"));
        fundamentalsReport = { ok: true, asOf: doc.asOf, counts: doc.counts, fetch: doc.fetch };
        scripted.push({
          box: "Fundamentals",
          file: "data/fundamentals.json",
          count: doc.counts?.stocks ?? 0,
          action: `P/E ${doc.counts?.pe?.value} · EPS g ${doc.counts?.epsGrowth?.value} · EV/EBITDA ${doc.counts?.evEbitda?.value} · SEC ${doc.fetch?.secRequests} req · ${doc.fetch?.seconds}s`,
        });
        mirror("fundamentals.json");
        // Growth Score (owner approved 2026-10-10; same step, own file; previous file kept if it failed).
        try {
          const gs = readJson(join(DATA, "growth-score.json"));
          if (gs.asOf === doc.asOf) {
            fundamentalsReport.growthScore = { asOf: gs.asOf, counts: gs.counts };
            scripted.push({ box: "Growth Score", file: "data/growth-score.json", count: gs.counts?.ranked ?? 0, action: `${gs.counts?.scored} scored · ${gs.counts?.ranked} ranked · Danger ${gs.counts?.danger}` });
          } else {
            fundamentalsReport.growthScore = { ok: false, warning: `growth-score.json is from ${gs.asOf} (kept from a previous run)` };
            console.warn(`  WARNING (non-fatal): growth-score.json not refreshed (still ${gs.asOf}).`);
          }
          mirror("growth-score.json");
        } catch (e) {
          fundamentalsReport.growthScore = { ok: false, warning: `growth-score.json unreadable: ${e instanceof Error ? e.message : e}` };
        }
      } catch (e) {
        fundamentalsReport = { ok: false, warning: `read failed: ${e instanceof Error ? e.message : e}` };
      }
    } else {
      fundamentalsReport = { ok: false, warning: `build-fundamentals.mjs exit ${code} — previous file kept` };
      console.warn(`  WARNING (non-fatal): fundamentals not refreshed (exit ${code}); previous file kept, pack continues.`);
    }
  }

  // --- 8f) X Rumours (owner approved 2026-10-10; members Stocks tab row under Insider Buying).
  //     The pack makes NO X reads: X is only reachable through the agent's x MCP connector, so the
  //     routine agent runs the X step itself (docs/ops/x-rumours-refresh.md, ~25 reads) AFTER this
  //     pack and before deploy. Here we only refresh what needs no X: "Move since" from Yahoo closes,
  //     the 10-session expiry and the SEC submissions re-check that can upgrade Reported → Confirmed.
  //     NON-FATAL: a failure keeps the previous data/x-rumours.json and is logged as a warning.
  let xRumoursReport = null;
  if (existsSync(join(DATA, "x-rumours.json"))) {
    let code = 1;
    try {
      code = runNode("scripts/x-rumours-ingest.mjs", ["--refresh-only", "--session-date", sessionDate]);
    } catch (e) {
      console.warn("  x rumours step threw:", e instanceof Error ? e.message : e);
    }
    steps.push({ box: "X Rumours (refresh move/expiry/SEC; X step is the agent's)", ok: code === 0, via: "x-rumours-ingest.mjs --refresh-only", optional: true });
    if (code === 0) {
      try {
        const doc = readJson(join(DATA, "x-rumours.json"));
        const n = (doc.rows || []).length;
        xRumoursReport = { ok: true, asOf: doc.asOf, rows: n, counts: doc.counts ?? null, secRequests: doc.secRequests ?? null, xReadsLastAgentRun: doc.xReads ?? null };
        scripted.push({ box: "X Rumours", file: "data/x-rumours.json", count: n, action: `${n} rows refreshed (move since, expiry, SEC re-check); agent X step still to run` });
        mirror("x-rumours.json");
      } catch (e) {
        xRumoursReport = { ok: false, warning: `read failed: ${e instanceof Error ? e.message : e}` };
      }
    } else {
      xRumoursReport = { ok: false, warning: `x-rumours-ingest.mjs --refresh-only exit ${code} — previous file kept` };
      console.warn(`  WARNING (non-fatal): X Rumours not refreshed (exit ${code}); previous file kept, pack continues.`);
    }
  } else {
    xRumoursReport = { ok: false, warning: "data/x-rumours.json missing — run the agent X step (docs/ops/x-rumours-refresh.md)" };
  }

  // --- 8g) Sector Screener (owner approved t693u 2026-10-14; members ETFs tab, top box).
  //     Yahoo daily closes for the 11 SPDR sectors + SPY → data/sector-screener.json (~3 s, $0).
  //     NON-FATAL: the script exits 1 without writing if < 9 sectors come back, so the previous
  //     file is kept and the pack continues.
  let sectorScreenerReport = null;
  {
    let code = 1;
    try {
      code = runNode("scripts/build-sector-screener.mjs", []);
    } catch (e) {
      console.warn("  sector screener step threw:", e instanceof Error ? e.message : e);
    }
    steps.push({ box: "Sector Screener (members ETFs tab)", ok: code === 0, via: "build-sector-screener.mjs", optional: true });
    if (code === 0) {
      try {
        const doc = readJson(join(DATA, "sector-screener.json"));
        const n = (doc.rows || []).length;
        sectorScreenerReport = { ok: true, asOf: doc.asOf, sectors: n, failed: doc.failed ?? [] };
        scripted.push({ box: "Sector Screener", file: "data/sector-screener.json", count: n, action: `${n}/11 sectors, close ${doc.asOf}` });
        mirror("sector-screener.json");
      } catch (e) {
        sectorScreenerReport = { ok: false, warning: `read failed: ${e instanceof Error ? e.message : e}` };
      }
    } else {
      sectorScreenerReport = { ok: false, warning: `build-sector-screener.mjs exit ${code} — previous file kept` };
      console.warn(`  WARNING (non-fatal): Sector Screener not refreshed (exit ${code}); previous file kept, pack continues.`);
    }
  }

  // --- 8h) Country Screener — REMOVED (owner t697u 2026-10-14). Script kept on disk, not run.
  const countryScreenerReport = { ok: true, skipped: "removed by owner t697u 2026-10-14" };


  // --- 8i) Indicator buyers backup (owner approved 2026-10-14). Read-only SELECT on remote D1 ->
  //     /workspace/backups/indicator-buyers/indicator-buyers-YYYY-MM-DD.csv + latest.csv (OUTSIDE the repo,
  //     never deployed/committed). NON-FATAL. The agent then mirrors latest.csv to the owner's private
  //     Google Sheet "Canary Indicator Buyers" (docs/ops/full-pack-refresh.md, step 8i).
  let indicatorBuyersReport = null;
  {
    let code = 1;
    try {
      code = runNode("scripts/export-indicator-buyers.mjs", []);
    } catch (e) {
      console.warn("  indicator buyers backup threw:", e instanceof Error ? e.message : e);
    }
    steps.push({ box: "Indicator buyers backup (private CSV)", ok: code === 0, via: "export-indicator-buyers.mjs", optional: true });
    indicatorBuyersReport = code === 0
      ? { ok: true, dir: "/workspace/backups/indicator-buyers", latest: "/workspace/backups/indicator-buyers/latest.csv" }
      : { ok: false, warning: `export-indicator-buyers.mjs exit ${code} — previous backup kept` };
    if (code !== 0) console.warn(`  WARNING (non-fatal): indicator buyers backup failed (exit ${code}); pack continues.`);
  }

  // --- 9) Private owner Options Scanner (/owner). Cboe delayed data is personal-use only,
  //     so it never appears on public/member pages. A failure here NEVER blocks the public pack:
  //     scan-options-scanner.mjs keeps the last reading (held:true, heldSince) and we only note it.
  let privateOptions = null;
  if (!OPTIONS_SCAN_ENABLED) {
    // PAUSED (owner 2026-09-28): zero Cboe requests. Keep the last scan, mark it paused for /owner.
    const name = "private/options-scan.json";
    const doc = existsSync(join(DATA, name)) ? readJson(join(DATA, name)) : null;
    if (doc && !doc.paused) {
      doc.paused = true;
      doc.pausedSince = OPTIONS_SCAN_PAUSED_SINCE;
      doc.pausedReason = OPTIONS_SCAN_PAUSED_REASON;
      writeJson(join(DATA, name), doc);
    }
    privateOptions = { ok: false, paused: true, reason: OPTIONS_SCAN_PAUSED_REASON, lastScanSession: doc?.asOfSession ?? null };
    console.log(`  (private) ${OPTIONS_SCAN_PAUSED_REASON}: step 9 skipped, no Cboe requests. Last scan ${doc?.asOfSession ?? "none"} kept.`);
  } else {
    const code = runNode("scripts/scan-options-scanner.mjs", ["--session-date", sessionDate]);
    const name = "private/options-scan.json"; // gitignored, server-only
    const doc = existsSync(join(DATA, name)) ? readJson(join(DATA, name)) : null;
    if (code === 0 && doc && doc.asOfSession === sessionDate) {
      writeJson(join(DATA, name), stampPackMeta(doc, sessionDate, scannedAt, { note: `full-pack session ${sessionDate} · private owner page` }));
      privateOptions = { ok: true, asOfSession: sessionDate, counts: doc.counts ?? null, stacks: doc.stacks ? { aggressive: doc.stacks.aggressive.total, swing: doc.stacks.swing.total, repeat: doc.stacks.repeat.building ? "building" : doc.stacks.repeat.total } : null, historySessions: doc.historyInfo?.sessions ?? null };
    } else {
      // Crash / wrong session without the script writing a held doc: mark the last reading held here.
      if (doc && doc.asOfSession && doc.asOfSession !== sessionDate && !doc.held) {
        doc.held = true;
        doc.heldSince = doc.asOfSession;
        doc.lastAttempt = { at: scannedAt, reasons: [`scan exit ${code} for session ${sessionDate}`] };
        writeJson(join(DATA, name), doc);
      }
      privateOptions = { ok: false, held: true, heldSince: doc?.heldSince ?? doc?.asOfSession ?? null, exit: code, reasons: doc?.lastAttempt?.reasons ?? null };
      console.warn(`  (private) Options Scanner held${privateOptions.heldSince ? ` since ${privateOptions.heldSince}` : ""} — public pack not affected`);
    }
    // Not mirrored/published anywhere public on purpose.
  }

  // --- Manifest
  const manifest = {
    sessionDate,
    packScannedAt: scannedAt,
    scripted,
    decide: decideReport
      ? {
          S: decideReport.S,
          light: decideReport.light,
          oldS: decideReport.oldS,
          oldLight: decideReport.oldLight,
          regime: decideReport.regime,
          inputs: decideReport.inputs,
        }
      : null,
    // Inputs held this session (failed feed or manual) — Scorekeeper fills these.
    needsFill: decideReport ? decideReport.needsFill : ["decide step failed — all inputs held"],
    volCurve: volReport,
    archived: {
      date: "2026-09-25",
      folder: "archive/regime-engine-2026-09-25/",
      files: ["data/regime-state.json", "data/regime-stub.json", "scripts/compute-regime.ts", "src/lib/regime/scoreRegime.ts"],
    },
    mainScanner: mainScannerReport,
    signalHistory: signalHistoryReport,
    tickerCharts: tickerChartsReport,
    canaryCharts: canaryChartsReport,
    insiderBuying: insiderBuyingReport,
    fundamentals: fundamentalsReport,
    xRumours: xRumoursReport,
    sectorScreener: sectorScreenerReport,
    countryScreener: countryScreenerReport,
    indicatorBuyers: indicatorBuyersReport,
    privateOwnerPage: { optionsScanner: privateOptions },
    gaps,
    steps,
    mirrors: MIRROR,
    ownerLocks: [
      "Never partial box refreshes — one shared as-of",
      "Never invent scores/prints",
      "Ship/deploy still needs owner yes (this command is local prepare + mirror)",
    ],
  };
  writeJson(join(DATA, "full-pack-manifest.json"), manifest);
  mirror("full-pack-manifest.json");

  console.log("\n═══════════════════════════════════════════════════════════");
  console.log(" SCRIPTTED BOXES");
  for (const s of scripted) {
    console.log(`  ✓ ${s.box} — ${s.file}${s.count != null ? ` (${s.count})` : ""}`);
  }
  console.log("\n GAPS (FAIL LOUDLY — do not ship as complete without owner eyes)");
  if (!gaps.length) {
    console.log("  (none)");
  } else {
    for (const g of gaps) {
      console.error(`  ✗ ${g.box}`);
      console.error(`      ${g.reason}`);
      if (g.file) console.error(`      file: ${g.file}`);
    }
  }
  console.log("═══════════════════════════════════════════════════════════");
  console.log(`Manifest: data/full-pack-manifest.json`);

  if (gaps.length && !args.allowGaps) {
    console.error(
      `\nFULL-PACK INCOMPLETE: ${gaps.length} gap(s). Re-run with --allow-gaps only if owner accepts the listed held/stale boxes.`
    );
    process.exit(1);
  }
  if (gaps.length && args.allowGaps) {
    console.warn(`\nProceeding with --allow-gaps (${gaps.length} gap(s) recorded).`);
  }
  console.log("\nFull-pack prepare done (local + mirrors). Deploy is separate.");
}

main().catch((e) => {
  console.error(e);
  process.exit(2);
});
