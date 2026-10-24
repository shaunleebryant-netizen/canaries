#!/usr/bin/env node
/**
 * Vol curve (VIX/VIX3M) — scripted pack step (audit P3).
 * Yahoo ^VIX / ^VIX3M daily closes → data/vol-curve-stub.json (+ mirror).
 * Owner-locked VIX/VIX3M-only bands: < 0.91 SAFE · 0.91–0.95 CAUTION · ≥ 0.96 DANGER
 * (bandFromMediumRatio in src/lib/volCurve/computeVolCurve.ts).
 * HYG/IEF stays the optional credit confirm (Yahoo HYG ÷ IEF vs SMA20).
 *
 * On a Yahoo failure the previous file is kept untouched except for
 * held:true + heldSince (never re-stamped with the pack date). Exit 1.
 *
 * Usage: node scripts/refresh-vol-curve.mjs [--session-date YYYY-MM-DD]
 */
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { ROOT, mirrorData, nzNowIso, parseCommonArgs, writeJson } from "./lib/scan-common.mjs";
import { align, loadTs, smaAt, yahooDaily } from "./lib/decide-series.mjs";

const FILE = "vol-curve-stub.json";
const PATH = join(ROOT, "data", FILE);
const HISTORY_POINTS = 20;

async function main() {
  const args = parseCommonArgs(process.argv);
  const sessionDate = args.sessionDate;
  const prev = existsSync(PATH) ? JSON.parse(readFileSync(PATH, "utf8")) : {};

  const [vix, vix3m, hyg, ief] = await Promise.all(
    ["^VIX", "^VIX3M", "HYG", "IEF"].map((s) => yahooDaily(s, { sessionDate }))
  );
  const errs = [vix, vix3m].filter((x) => x.error).map((x) => x.error);
  if (errs.length) {
    const heldSince = prev.heldSince || prev.feeds?.vix?.asOf || prev.asOf || null;
    const held = { ...prev, held: true, heldSince, fetchErrors: errs };
    if (!args.dryRun) {
      writeJson(PATH, held);
      mirrorData(FILE);
    }
    console.error(`vol curve HELD since ${heldSince}: ${errs.join("; ")}`);
    process.exit(1);
  }

  const ratios = align([vix.bars, vix3m.bars], ([a, b]) => (b ? a / b : null));
  const last = ratios[ratios.length - 1];
  const vixLast = vix.bars.find((b) => b.date === last.date);
  const vix3mLast = vix3m.bars.find((b) => b.date === last.date);
  const mediumHistory = ratios.slice(-HISTORY_POINTS).map((r) => Number(r.close.toFixed(4)));

  let hygIef = { status: "PENDING" };
  if (!hyg.error && !ief.error) {
    const hr = align([hyg.bars, ief.bars], ([a, b]) => (b ? a / b : null));
    const v = hr.map((r) => r.close);
    const n = v.length;
    const sma20 = smaAt(v, n - 1);
    const sma20prev = smaAt(v, n - 2);
    if (sma20 != null) {
      hygIef = {
        ratio: Number(v[n - 1].toFixed(4)),
        sma20: Number(sma20.toFixed(4)),
        rollingOver: sma20prev != null ? sma20 < sma20prev : null,
        status: "VERIFIED",
        asOf: hr[n - 1].date,
        source: "Yahoo HYG ÷ IEF daily closes",
      };
    }
  }

  const { computeVolCurve } = loadTs("src/lib/volCurve/computeVolCurve.ts");
  const c = computeVolCurve({
    asOf: last.date,
    vix: vixLast.close,
    vix3m: vix3mLast.close,
    mediumHistory,
    hygIef,
  });

  const doc = {
    draft: false,
    asOf: last.date,
    method: "yahoo-1d-vix-vix3m",
    source: "Yahoo ^VIX / ^VIX3M daily closes (scripted pack step; was hand-typed TV)",
    note: `${last.date} close: Yahoo VIX ${vixLast.close.toFixed(2)} / VIX3M ${vix3mLast.close.toFixed(2)} → ratio ${c.mediumRatio.toFixed(4)} ${c.band}.`,
    feeds: {
      vix: { value: Number(vixLast.close.toFixed(2)), status: "VERIFIED", asOf: last.date, source: "Yahoo ^VIX" },
      vix3m: { value: Number(vix3mLast.close.toFixed(2)), status: "VERIFIED", asOf: last.date, source: "Yahoo ^VIX3M" },
      hygIef,
    },
    mediumHistory,
    mediumHistoryDates: ratios.slice(-HISTORY_POINTS).map((r) => r.date),
    ownerLock: {
      date: "2026-09-19",
      volCurveUi: "VIX/VIX3M stance bands + optional HYG/IEF credit confirm; not a flock score",
      bands: "< 0.91 SAFE · 0.91–0.95 CAUTION · ≥ 0.96 DANGER (VIX/VIX3M only)",
    },
    seedRatio: Number(c.mediumRatio.toFixed(4)),
    computed: {
      band: c.band,
      stance: c.stance,
      mediumRatio: Number(c.mediumRatio.toFixed(4)),
      policies: c.policies,
      oneLiner: c.oneLiner,
    },
    held: false,
    heldSince: null,
    scannedAt: nzNowIso(),
  };
  if (sessionDate && last.date < sessionDate) {
    doc.held = true;
    doc.heldSince = last.date;
    doc.note += ` Latest Yahoo bar ${last.date} < session ${sessionDate} — held, not invented.`;
  }
  if (!args.dryRun) {
    writeJson(PATH, doc);
    mirrorData(FILE);
  }
  console.log(doc.note);
}

main().catch((e) => {
  console.error(e);
  process.exit(2);
});
