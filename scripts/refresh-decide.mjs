#!/usr/bin/env node
/**
 * Decide — scripted nightly points score (audit P2, owner-approved 2026-09-25).
 *
 * Replaces the weekly Scorekeeper hold of state.json and the old partial
 * `yahooRescoreFormulaSeats` path. Scorekeeper now fills ONLY FINRA and any
 * input whose feed failed (via /home/box/canaries/decide-fills.json).
 *
 * Weights: locked Option B (data/weights.md, roster.md) — unchanged, read from
 * the previous state.json rows and checked against LOCKED_WEIGHTS below.
 * Composite S = Σ w·s over all 13 inputs. Light bands unchanged:
 *   Green S ≥ 0.6 · Amber −0.3 ≤ S < 0.6 · Red S < −0.3
 * Veto (owner lock 2026-09-19): VIX/VIX3M ≥ 1.00 AND A–D sick AND MMTH sick
 *   → cannot be green.
 *
 * Rubric in code: see RULES below and docs/ops/decide-scripted.md.
 *
 * Writes (unless --dry-run):
 *   data/state.prev.json            previous state.json (saved before overwrite)
 *   data/state.json                 new scored state (+ mirror)
 *   data/regime-history.json        Regime v2 pill + prior-day state (+ mirror)
 *   data/canary-sparklines.json     10-session lines from the same series (+ mirror)
 *
 * Usage: node scripts/refresh-decide.mjs --session-date YYYY-MM-DD [--dry-run]
 *          [--pack-mark MARK]   e.g. VERIFIED_FRI_POSTCLOSE_2026-09-25 (Mine gate);
 *                               default SCRIPTED_<date>[_PARTIAL_HELD].
 *                               Refused (exit 2) if any input is held.
 * Exit 0 ok (held inputs listed in needsFill), 2 fatal.
 */
import { copyFileSync, existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { ROOT, MIRROR_DIR, mirrorData, nzNowIso, parseCommonArgs, writeJson } from "./lib/scan-common.mjs";
import {
  align,
  fmt,
  jp30Continuous,
  loadTs,
  pointsScore,
  sign,
  signed,
  smaSeries,
  trendStats,
  tvDaily,
  yahooDaily,
} from "./lib/decide-series.mjs";

const DATA = join(ROOT, "data");
const FILLS_PATH = join(MIRROR_DIR, "decide-fills.json");
export const RULES_VERSION = "decide-points-v1-2026-09-25";

/** Locked Option B weights (weights.md / roster.md). Sum = 1. */
export const LOCKED_WEIGHTS = {
  "cyclical-defensive": 0.0935,
  "xlf-kre": 0.0765,
  "vix-vix3m": 0.1135,
  "nyse-ad": 0.085,
  "pct-above-200dma": 0.0935,
  "es1-jp30": 0.0595,
  "sp-top-50": 0.068,
  sp600: 0.068,
  rsp: 0.068,
  "vix-vvix": 0.0565,
  "finra-margin": 0.068,
  "qqq-sma20": 0.08,
  "hyg-ief-sma20": 0.07,
};

const lightFor = (S) => (S >= 0.6 ? "green" : S >= -0.3 ? "amber" : "red");

function readJson(p) {
  return JSON.parse(readFileSync(p, "utf8"));
}

function trendText(st, d = 2) {
  return `${fmt(st.value, d)} vs SMA20 ${fmt(st.sma20, d)} (SMA20 5d slope ${signed(st.slope5, d + 1)}, 9d chg ${signed(st.chg9, d)})`;
}

function pointsWhy(st, score, { inverse = false } = {}) {
  const side = st.value > st.sma20 ? "above" : st.value < st.sma20 ? "below" : "on";
  const agree = Math.abs(score) === 2 ? "slope + 9d change agree → ±2" : "slope/9d change do not both agree → ±1";
  return `${side} SMA20${inverse ? " (inverse input — sign flipped)" : ""}; ${side === "on" ? "→ 0" : agree} → ${score > 0 ? "+" : ""}${score}.`;
}

// ---------------------------------------------------------------------------
// RULES — one per input. Each returns { score, lastReading, rationale, read,
// evidence, vsSma20, vs9d, statusHint?, flags? } from the fetched series.
// ---------------------------------------------------------------------------
const RULES = {
  // rubric: ratio vs SMA20 (+1 / −1; "+2 if clearly rising through SMA20")
  // → owner points rule makes "clearly" concrete.
  "cyclical-defensive": ({ cycdef }) => {
    const st = trendStats(cycdef.bars);
    const score = pointsScore(st);
    return {
      score,
      st,
      source: "Yahoo (XLK+XLY)/(XLP+XLU) daily closes",
      lastReading: `${fmt(st.value, 4)} ${st.value >= st.sma20 ? ">" : "<"} SMA20 ${fmt(st.sma20, 4)}`,
      rationale: `Ratio ${trendText(st, 4)}: ${pointsWhy(st, score)}`,
      read: score > 0 ? "Cyclicals lead defensives above the 20-day average." : score < 0 ? "Defensives lead cyclicals; the ratio sits under its 20-day average." : "Cyclicals vs defensives sits on its 20-day average.",
    };
  },
  // rubric: each leg vs its own SMA20; both above → risk-on, both below →
  // risk-off, mixed → 0. ±2 only when both legs score ±2 on the points rule.
  "xlf-kre": ({ xlf, kre }) => {
    const a = trendStats(xlf.bars);
    const b = trendStats(kre.bars);
    const pa = pointsScore(a);
    const pb = pointsScore(b);
    const da = sign(pa);
    const db = sign(pb);
    let score = 0;
    if (da === db && da !== 0) score = Math.abs(pa) === 2 && Math.abs(pb) === 2 ? 2 * da : da;
    const legs = `XLF ${fmt(a.value)} ${da > 0 ? ">" : "<"} SMA20 ${fmt(a.sma20)} · KRE ${fmt(b.value)} ${db > 0 ? ">" : "<"} SMA20 ${fmt(b.sma20)}`;
    return {
      score,
      st: { date: a.date, value: a.value, sma20: a.sma20, slope5: a.slope5, chg9: a.chg9 },
      source: "Yahoo XLF, KRE daily closes",
      extraEvidence: { kre: b, xlfPoints: pa, krePoints: pb },
      lastReading: legs,
      rationale: `${legs}. Leg points XLF ${pa > 0 ? "+" : ""}${pa}, KRE ${pb > 0 ? "+" : ""}${pb}; ${score === 0 ? "legs split → 0" : `both ${da > 0 ? "above" : "below"} → ${score > 0 ? "+" : ""}${score}`}.`,
      read: score > 0 ? "Banks and regionals sit above their 20-day averages." : score < 0 ? "Banks and regionals sit under their 20-day averages." : "Banks and regionals are split around their 20-day averages.",
      vsSma20: score > 0 ? "above" : score < 0 ? "below" : "mixed",
    };
  },
  // rubric (owner lock Option B): <0.91 SAFE · 0.91–0.95 CAUTION · ≥0.96 DANGER
  // → +2 / 0 / −2 (the rubric's band names; same mapping as the held 9/23 +2).
  "vix-vix3m": ({ vixratio, bandFromMediumRatio }) => {
    const st = trendStats(vixratio.bars);
    const r = st.value;
    const band = bandFromMediumRatio(r);
    const score = band === "SAFE" ? 2 : band === "DANGER" ? -2 : 0;
    return {
      score,
      st,
      source: "Yahoo ^VIX ÷ ^VIX3M daily closes",
      lastReading: `${fmt(r, 4)} (VIX ${fmt(vixratio.vix)} / VIX3M ${fmt(vixratio.vix3m)}) · ${band}`,
      rationale: `Ratio ${fmt(r, 4)} → ${band} (<0.91 SAFE +2 · 0.91–0.95 CAUTION 0 · ≥0.96 DANGER −2) → ${score > 0 ? "+" : ""}${score}.`,
      read: band === "SAFE" ? "Vol curve is in healthy contango (SAFE)." : band === "CAUTION" ? "Vol curve is flattening (CAUTION)." : "Front vol is at or above 3-month vol (DANGER).",
      statusHint: band,
      band,
      mediumRatio: r,
      vsSma20: null,
    };
  },
  // rubric (owner lock 2026-09-19): SMA20 of the NSHF series vs 0; magnitude
  // "can lean ±2" → points rule applied to the SMA20 line itself (5d slope of
  // the SMA20 and its 9d change both agree with the side of 0).
  "nyse-ad": ({ nshf }) => {
    const smaLine = smaSeries(nshf.bars);
    const n = smaLine.length;
    const cur = smaLine[n - 1].close;
    const slope5 = cur - smaLine[n - 6].close;
    const chg9 = cur - smaLine[n - 10].close;
    const dir = sign(cur);
    let score = dir;
    if (dir !== 0 && sign(slope5) === dir && sign(chg9) === dir) score = 2 * dir;
    const raw = nshf.bars[nshf.bars.length - 1];
    return {
      score,
      st: { date: raw.date, value: raw.close, sma20: cur, slope5, chg9 },
      source: "TradingView guest INDEX:NSHF daily (SMA20 vs 0)",
      lastReading: `NSHF SMA20 ${fmt(cur)} ${cur >= 0 ? ">" : "<"} 0 (raw close ${fmt(raw.close, 0)})`,
      rationale: `NSHF SMA20 ${fmt(cur)} ${dir > 0 ? "above" : dir < 0 ? "below" : "at"} 0; SMA20 5d slope ${signed(slope5)}, 9d chg ${signed(chg9)} ${Math.abs(score) === 2 ? "agree → ±2" : "do not both agree → ±1"} → ${score > 0 ? "+" : ""}${score}. Raw print is cross-check only.`,
      read: score > 0 ? "NYSE internals’ 20-day average sits above zero." : score < 0 ? (score === -2 ? "NYSE internals’ 20-day average remains well below zero." : "NYSE internals’ 20-day average sits below zero.") : "NYSE internals’ 20-day average sits at zero.",
      vsSma20: dir > 0 ? "above 0" : "below 0",
    };
  },
  // rubric: >65 CONTRARIAN_HOT (lean 0 to −1 → 0) · 50–65 healthy +1 ·
  // <50 bearish −1 · ≤37 CONTRARIAN_WASHED (contrarian risk-on → +1).
  // ±2 inside the healthy / bearish bands when the points rule on MMTH is ±2
  // in the same direction.
  "pct-above-200dma": ({ mmth }) => {
    const st = trendStats(mmth.bars);
    const v = st.value;
    const p = pointsScore(st);
    let score;
    const flags = [];
    if (v > 65) {
      score = 0;
      flags.push("CONTRARIAN_HOT");
    } else if (v <= 37) {
      score = 1;
      flags.push("CONTRARIAN_WASHED");
    } else if (v >= 50) {
      score = p === 2 ? 2 : 1;
    } else {
      score = p === -2 ? -2 : -1;
    }
    const band = v > 65 ? "hot >65" : v <= 37 ? "washed ≤37" : v >= 50 ? "healthy 50–65" : "bearish <50";
    return {
      score,
      st,
      flags,
      source: "TradingView guest INDEX:MMTH daily",
      lastReading: `${fmt(v)}`,
      rationale: `MMTH ${fmt(v)} → ${band}; ${trendText(st)} points ${p > 0 ? "+" : ""}${p}${Math.abs(score) === 2 ? " agrees → ±2" : ""} → ${score > 0 ? "+" : ""}${score}.${flags.length ? ` Flag ${flags.join(", ")}.` : ""}`,
      read: v > 65 ? "Participation is euphoric above 65% — contrarian hot." : v <= 37 ? "Participation is washed out — contrarian risk-on setup." : v >= 50 ? "Participation sits above 50% — healthy by level." : score === -2 ? "Participation sits under 50% and is still falling." : "Participation sits under 50% — mildly sick by level.",
      vsSma20: null,
    };
  },
  // rubric: ES1!/JP30 bond price — rising AND above SMA20 → risk-on; falling
  // AND under SMA20 → risk-off; otherwise 0. "Rising" = 9d change; ±2 when the
  // SMA20 5d slope agrees too.
  "es1-jp30": ({ esjp }) => {
    const rollNote = esjp.rolls?.length
      ? ` JP30 benchmark roll ${esjp.rolls.map((r) => `${r.date} (${fmt(r.from, 3)}→${fmt(r.to, 3)}${r.factor ? `, back-adjusted ×${fmt(r.factor, 4)}` : ""})`).slice(-1).join("")}.`
      : "";
    if (esjp.unverifiedSince) {
      // No yield series to back-adjust a benchmark roll: score 0 until the new bond has enough sessions.
      const st = { date: esjp.bars[esjp.bars.length - 1].date, value: esjp.es / esjp.jp, sma20: null, slope5: null, chg9: null };
      return {
        score: 0,
        st,
        status: "UNVERIFIED",
        heldSince: esjp.unverifiedSince,
        source: "Yahoo ES=F ÷ TradingView guest TVC:JP30 (bond price) daily — benchmark roll, no yield to adjust",
        lastReading: `ES ${fmt(esjp.es)} / JP30 price ${fmt(esjp.jp, 3)} = ${fmt(st.value, 4)}`,
        rationale: `JP30 benchmark bond changed on ${esjp.unverifiedSince} and TVC:JP30Y was unavailable to back-adjust; ${esjp.newBondBars} of 26 new-bond sessions → UNVERIFIED, score 0.`,
        read: "Japan 30y benchmark just rolled to a new bond; this seat sits out until the new bond has enough history.",
        vsSma20: null,
      };
    }
    const st = trendStats(esjp.bars);
    const side = sign(st.value - st.sma20);
    let score = 0;
    if (side !== 0 && sign(st.chg9) === side) score = sign(st.slope5) === side ? 2 * side : side;
    return {
      score,
      st,
      source: `Yahoo ES=F ÷ TradingView guest TVC:JP30 (bond price) daily${esjp.method === "yield-back-adjusted" ? ", roll back-adjusted via TVC:JP30Y" : ""}`,
      lastReading: `ES ${fmt(esjp.es)} / JP30 price ${fmt(esjp.jp, 3)} = ${fmt(st.value, 4)}`,
      extraEvidence: esjp.rolls?.length ? { jp30Rolls: esjp.rolls.slice(-3), jp30Method: esjp.method } : undefined,
      rationale: `Ratio ${trendText(st, 4)}: ${score === 0 ? "side of SMA20 and 9d direction disagree → 0" : `${side > 0 ? "rising and above" : "falling and under"} SMA20${Math.abs(score) === 2 ? " with SMA20 slope agreeing → ±2" : " → ±1"}`} → ${score > 0 ? "+" : ""}${score}.${rollNote}`,
      read: score > 0 ? "US futures leadership remains intact versus Japan 30y bond price." : score < 0 ? "Money is sloshing toward Japan 30y bonds versus US futures." : "US futures versus Japan 30y bond price is mixed.",
    };
  },
  "sp-top-50": ({ xlg }) => priceRule(xlg, "Yahoo XLG daily closes", "XLG", "Mega-cap leadership"),
  sp600: ({ sp600 }) => priceRule(sp600, "Yahoo ^SP600 index daily closes (not SPSM)", "^SP600", "Small-cap index"),
  rsp: ({ rsp }) => priceRule(rsp, "Yahoo RSP daily closes", "RSP", "Equal-weight S&P"),
  // rubric: VIX <19 risk-on (+1) / >19 risk-off (−1); >30 CONTRARIAN_FEAR,
  // <15 CONTRARIAN_COMPLACENT (flags only). ±2 when the inverse points rule on
  // VIX agrees (VIX below/above SMA20 with slope + 9d change agreeing).
  "vix-vvix": ({ vix, vvix }) => {
    const st = trendStats(vix.bars);
    const v = st.value;
    const lvl = v < 19 ? 1 : v > 19 ? -1 : 0;
    const p = pointsScore(st, { inverse: true });
    let score = lvl;
    if (lvl !== 0 && p === 2 * lvl) score = 2 * lvl;
    const flags = [];
    if (v > 30) flags.push("CONTRARIAN_FEAR");
    if (v < 15) flags.push("CONTRARIAN_COMPLACENT");
    const vv = vvix?.bars?.[vvix.bars.length - 1];
    return {
      score,
      st,
      flags,
      // Owner 2026-10-10: VVIX dropped from the member-facing wording (it never changed the score);
      // the VVIX close is still kept in evidence.extra for reference only.
      source: "Yahoo ^VIX daily closes",
      lastReading: `VIX ${fmt(v)}`,
      rationale: `VIX ${fmt(v)} ${lvl > 0 ? "<" : ">"} 19 → ${lvl > 0 ? "risk-on +1" : "risk-off −1"}; inverse points ${p > 0 ? "+" : ""}${p} (${trendText(st)})${Math.abs(score) === 2 ? " agrees → ±2" : ""} → ${score > 0 ? "+" : ""}${score}.${flags.length ? ` Flag ${flags.join(", ")}.` : " Not CONTRARIAN_COMPLACENT (VIX ≥ 15)."}`,
      read: lvl > 0 ? "Spot vol is still risk-on by level." : "Spot vol is risk-off by level (VIX above 19).",
      extraEvidence: vv ? { vvix: vv.close, vvixDate: vv.date } : undefined,
    };
  },
  // rubric: +1 if close above SMA20 else −1 (exact — no ±2)
  "qqq-sma20": ({ qqq }) => {
    const st = trendStats(qqq.bars);
    const score = st.value > st.sma20 ? 1 : -1;
    return {
      score,
      st,
      source: "Yahoo QQQ daily closes",
      lastReading: `QQQ ${fmt(st.value)} ${score > 0 ? ">" : "<"} SMA20 ${fmt(st.sma20, 4)}`,
      rationale: `Close ${score > 0 ? "above" : "below"} SMA20 → ${score > 0 ? "+1" : "−1"} (rubric: ±1 only).`,
      read: score > 0 ? "Nasdaq sits above its 20-day average." : "Nasdaq sits under its 20-day average.",
    };
  },
  "hyg-ief-sma20": ({ hygief }) => {
    const st = trendStats(hygief.bars);
    const score = st.value > st.sma20 ? 1 : -1;
    return {
      score,
      st,
      source: "Yahoo HYG ÷ IEF daily closes",
      lastReading: `ratio ${fmt(st.value, 4)} ${score > 0 ? ">" : "<"} SMA20 ${fmt(st.sma20, 4)}`,
      rationale: `Ratio ${score > 0 ? "above" : "below"} SMA20 → ${score > 0 ? "+1" : "−1"} (rubric: ±1 only).`,
      read: score > 0 ? "Credit risk appetite sits above its 20-day average." : "Credit risk appetite sits under its 20-day average.",
    };
  },
};

function priceRule(series, source, label, noun) {
  const st = trendStats(series.bars);
  const score = pointsScore(st);
  return {
    score,
    st,
    source,
    lastReading: `${label} ${fmt(st.value)} ${st.value >= st.sma20 ? ">" : "<"} SMA20 ${fmt(st.sma20, 4)}`,
    rationale: `${trendText(st)}: ${pointsWhy(st, score)}`,
    read: `${noun} sits ${score > 0 ? "above" : score < 0 ? "under" : "on"} its 20-day average${Math.abs(score) === 2 ? (score > 0 ? " and is rising" : " and is falling") : ""}.`,
  };
}

/**
 * Row-level mirror fields some inputs carry next to `evidence` (read by the UI
 * / regime). They are ALWAYS re-derived from the row's final evidence block so
 * they can never drift from it (09-25 bug: nyse-ad sma20/rawClose and
 * vix-vix3m mediumRatio were carried over from 09-23). A mirror whose source
 * value is missing is deleted rather than left stale.
 */
const ROW_MIRRORS = {
  "nyse-ad": (ev) => ({ sma20: ev?.sma20, rawClose: ev?.value }),
  "vix-vix3m": (ev, row) => ({
    mediumRatio: typeof ev?.value === "number" ? Number(ev.value.toFixed(4)) : undefined,
    band: row.statusHint,
  }),
};

export function syncRowMirrors(row) {
  const f = ROW_MIRRORS[row.id];
  if (!f) return row;
  for (const [k, v] of Object.entries(f(row.evidence, row))) {
    if (v == null || (typeof v === "number" && !Number.isFinite(v))) delete row[k];
    else row[k] = v;
  }
  return row;
}

/** Which fetched series each input needs (for held/needsFill on failure). */
const NEEDS = {
  "cyclical-defensive": ["cycdef"],
  "xlf-kre": ["xlf", "kre"],
  "vix-vix3m": ["vixratio"],
  "nyse-ad": ["nshf"],
  "pct-above-200dma": ["mmth"],
  "es1-jp30": ["esjp"],
  "sp-top-50": ["xlg"],
  sp600: ["sp600"],
  rsp: ["rsp"],
  "vix-vvix": ["vix"],
  "finra-margin": null, // manual (monthly) — Scorekeeper fill only
  "qqq-sma20": ["qqq"],
  "hyg-ief-sma20": ["hygief"],
};

/** Sparkline series per input (same series as the score). */
function sparkFor(id, S) {
  const take = (bars, source) => ({
    dates: bars.slice(-10).map((b) => b.date),
    values: bars.slice(-10).map((b) => Number(b.close.toFixed(6))),
    source,
  });
  switch (id) {
    case "cyclical-defensive": return S.cycdef && take(S.cycdef.bars, "(XLK+XLY)/(XLP+XLU)");
    // Owner 2026-10-10: KRE price (same default line as the Banks chart pop-up), not the XLF/KRE ratio.
    case "xlf-kre": return S.kre && take(S.kre.bars, "KRE");
    case "vix-vix3m": return S.vixratio && take(S.vixratio.bars, "^VIX/^VIX3M");
    case "nyse-ad": return S.nshf && take(smaSeries(S.nshf.bars), "INDEX:NSHF SMA20 (TradingView guest)");
    case "pct-above-200dma": return S.mmth && take(S.mmth.bars, "INDEX:MMTH (TradingView guest)");
    case "es1-jp30": return S.esjp && take(S.esjp.bars, "ES=F / TVC:JP30 bond price (benchmark rolls back-adjusted via TVC:JP30Y)");
    case "sp-top-50": return S.xlg && take(S.xlg.bars, "XLG");
    case "sp600": return S.sp600 && take(S.sp600.bars, "^SP600");
    case "rsp": return S.rsp && take(S.rsp.bars, "RSP");
    case "vix-vvix": return S.vix && take(S.vix.bars, "^VIX");
    case "qqq-sma20": return S.qqq && take(S.qqq.bars, "QQQ");
    case "hyg-ief-sma20": return S.hygief && take(S.hygief.bars, "HYG/IEF");
    default: return null;
  }
}

async function fetchAll(sessionDate) {
  const ysyms = ["XLK", "XLY", "XLP", "XLU", "XLF", "KRE", "^VIX", "^VIX3M", "XLG", "^SP600", "RSP", "^VVIX", "QQQ", "HYG", "IEF", "ES=F"];
  const y = {};
  await Promise.all(ysyms.map(async (s) => (y[s] = await yahooDaily(s, { sessionDate }))));
  const tv = tvDaily(["INDEX:NSHF", "INDEX:MMTH", "TVC:JP30", "TVC:JP30Y"], { bars: 120, sessionDate });
  const errors = {};
  const ok = (x) => x && !x.error;
  // TVC:JP30Y only back-adjusts JP30 benchmark rolls; its absence is handled in jp30Continuous.
  for (const [k, v] of Object.entries({ ...y, ...tv })) if (!ok(v) && k !== "TVC:JP30Y") errors[k] = v.error;

  const S = {};
  const ratio = (syms, f) => (syms.every((s) => ok(y[s])) ? { bars: align(syms.map((s) => y[s].bars), f) } : null);
  S.cycdef = ratio(["XLK", "XLY", "XLP", "XLU"], ([a, b, c, d]) => (a + b) / (c + d));
  S.xlf = ok(y.XLF) ? y.XLF : null;
  S.kre = ok(y.KRE) ? y.KRE : null;
  S.xlfkre = ratio(["XLF", "KRE"], ([a, b]) => a / b);
  S.vixratio = ratio(["^VIX", "^VIX3M"], ([a, b]) => a / b);
  if (S.vixratio) {
    const d = S.vixratio.bars[S.vixratio.bars.length - 1].date;
    S.vixratio.vix = y["^VIX"].bars.find((b) => b.date === d)?.close;
    S.vixratio.vix3m = y["^VIX3M"].bars.find((b) => b.date === d)?.close;
  }
  S.xlg = ok(y.XLG) ? y.XLG : null;
  S.sp600 = ok(y["^SP600"]) ? y["^SP600"] : null;
  S.rsp = ok(y.RSP) ? y.RSP : null;
  S.vix = ok(y["^VIX"]) ? y["^VIX"] : null;
  S.vvix = ok(y["^VVIX"]) ? y["^VVIX"] : null;
  S.qqq = ok(y.QQQ) ? y.QQQ : null;
  S.hygief = ratio(["HYG", "IEF"], ([a, b]) => a / b);
  S.nshf = ok(tv["INDEX:NSHF"]) ? tv["INDEX:NSHF"] : null;
  S.mmth = ok(tv["INDEX:MMTH"]) ? tv["INDEX:MMTH"] : null;
  if (ok(y["ES=F"]) && ok(tv["TVC:JP30"])) {
    const jp = jp30Continuous(tv["TVC:JP30"].bars, ok(tv["TVC:JP30Y"]) ? tv["TVC:JP30Y"].bars : null);
    S.esjp = { bars: align([y["ES=F"].bars, jp.bars], ([a, b]) => a / b), rolls: jp.rolls, method: jp.method, unverifiedSince: jp.unverifiedSince, newBondBars: jp.newBondBars };
    const d = S.esjp.bars[S.esjp.bars.length - 1]?.date;
    S.esjp.es = y["ES=F"].bars.find((b) => b.date === d)?.close;
    S.esjp.jp = tv["TVC:JP30"].bars.find((b) => b.date === d)?.close; // real (unadjusted) quote
  } else S.esjp = null;
  return { S, errors };
}

/** ISO instant of the 16:00 America/New_York close on a YYYY-MM-DD session. */
export function nyCloseIso(ymd) {
  const guess = new Date(`${ymd}T20:00:00.000Z`);
  const hh = Number(
    new Intl.DateTimeFormat("en-US", { timeZone: "America/New_York", hour: "2-digit", hourCycle: "h23" }).format(guess)
  );
  return new Date(guess.getTime() + (16 - hh) * 3600_000).toISOString();
}

function heldSinceOf(prevRow, prevState) {
  return (
    prevRow?.heldSince ||
    prevRow?.evidence?.date ||
    prevRow?.asOf ||
    (typeof prevState?.asOf === "string" ? prevState.asOf.slice(0, 10) : null)
  );
}

/** --pack-mark MARK (or --pack-mark=MARK). Returns null when absent. */
export function parsePackMark(argv) {
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    let v;
    if (a === "--pack-mark") v = argv[i + 1];
    else if (a.startsWith("--pack-mark=")) v = a.slice("--pack-mark=".length);
    else continue;
    if (typeof v !== "string" || !v.trim() || v.startsWith("--")) {
      throw new Error("--pack-mark needs a non-empty value");
    }
    if (/\s/.test(v)) throw new Error(`--pack-mark must not contain spaces: ${JSON.stringify(v)}`);
    return v;
  }
  return null;
}

async function main() {
  const args = parseCommonArgs(process.argv);
  const sessionDate = args.sessionDate;
  if (!sessionDate) {
    console.error("--session-date YYYY-MM-DD required");
    process.exit(2);
  }
  let packMarkArg;
  try {
    packMarkArg = parsePackMark(process.argv);
  } catch (e) {
    console.error(e instanceof Error ? e.message : e);
    process.exit(2);
  }
  const statePath = join(DATA, "state.json");
  const prev = readJson(statePath);
  const fills = existsSync(FILLS_PATH) ? readJson(FILLS_PATH) : {};
  const { bandFromMediumRatio, boardOneLiner, resolveStance, policiesForStance, creditConfirm, delta5d } = loadTs("src/lib/volCurve/computeVolCurve.ts");
  const { computeRegime } = loadTs("src/lib/regime/computeRegime.ts");

  const { S, errors } = await fetchAll(sessionDate);
  const ctx = { ...S, bandFromMediumRatio };

  const needsFill = [];
  const rows = [];
  const evidenceById = {};
  let volRatio = null;
  let volBand = null;
  let volFeed = null; // { vix, vix3m, date } — same bar as volRatio

  for (const prevRow of prev.canaries) {
    const id = prevRow.id;
    const w = LOCKED_WEIGHTS[id];
    if (w == null) throw new Error(`unknown input ${id}`);
    if (Math.abs((prevRow.weightNominal ?? prevRow.weight) - w) > 1e-9) {
      throw new Error(`weight drift on ${id}: ${prevRow.weightNominal} ≠ locked ${w}`);
    }
    const need = NEEDS[id];
    const row = { ...prevRow, weight: w, weightNominal: w, weightEffective: w };
    const canScore = need && need.every((k) => S[k] && ((S[k].bars?.length ?? 0) >= 30 || S[k].unverifiedSince));
    let res = null;
    if (canScore) {
      try {
        res = RULES[id](ctx);
      } catch (e) {
        errors[id] = `rule error: ${e instanceof Error ? e.message : e}`;
        res = null;
      }
    }
    if (res && res.st?.date && res.st.date >= sessionDate) {
      row.score = res.score;
      row.status = res.status || "VERIFIED";
      row.verified = row.status === "VERIFIED";
      row.fresh = true;
      row.heldSince = res.heldSince ?? null;
      row.asOf = res.st.date;
      row.lastReading = res.lastReading;
      row.rationale = res.rationale;
      row.oneSentenceRead = res.read;
      row.vs_SMA20 = res.vsSma20 !== undefined ? res.vsSma20 : res.st.value > res.st.sma20 ? "above" : "below";
      row.vs_9D = `9d chg ${signed(res.st.chg9, 4)}`;
      if (res.statusHint) row.statusHint = res.statusHint;
      else delete row.statusHint;
      row.flags = res.flags?.length ? res.flags : undefined;
      row.evidence = {
        source: res.source,
        date: res.st.date,
        value: Number(res.st.value.toFixed(6)),
        sma20: res.st.sma20 != null ? Number(res.st.sma20.toFixed(6)) : null,
        sma20Slope5: res.st.slope5 != null ? Number(res.st.slope5.toFixed(6)) : null,
        change9: res.st.chg9 != null ? Number(res.st.chg9.toFixed(6)) : null,
        text: `${res.source} · ${res.lastReading} · @ ${res.st.date}`,
        ...(res.extraEvidence ? { extra: res.extraEvidence } : {}),
      };
      if (id === "vix-vix3m") {
        volRatio = res.mediumRatio;
        volBand = res.band;
        volFeed = { vix: S.vixratio.vix, vix3m: S.vixratio.vix3m, date: res.st.date };
      }
    } else {
      // HELD — last value kept, never re-stamped with the pack date.
      const fill = fills[id];
      const heldSince = heldSinceOf(prevRow, prev);
      // >= (not >): a same-session re-run must re-apply the fill it already
      // used, otherwise an already-filled seat flips back to HELD.
      if (fill && fill.asOf && (!heldSince || fill.asOf >= heldSince) && typeof fill.score === "number") {
        row.score = fill.score;
        row.lastReading = fill.lastReading ?? row.lastReading;
        row.rationale = fill.rationale ?? row.rationale;
        if (fill.oneSentenceRead) row.oneSentenceRead = fill.oneSentenceRead;
        row.status = "VERIFIED";
        row.fresh = fill.asOf >= sessionDate;
        row.heldSince = row.fresh ? null : fill.asOf;
        row.asOf = fill.asOf;
        row.evidence = {
          ...(fill.evidence && typeof fill.evidence === "object" ? fill.evidence : {}),
          source: fill.source || "Scorekeeper manual fill (decide-fills.json)",
          date: fill.asOf,
          text: `${fill.source || "Scorekeeper fill"} · ${row.lastReading} · @ ${fill.asOf}`,
        };
      } else {
        row.fresh = false;
        row.heldSince = heldSince;
        row.asOf = heldSince;
        row.status = prevRow.status === "UNVERIFIED" ? "UNVERIFIED" : "HELD";
        row.evidence = {
          ...(prevRow.evidence || {}),
          source: prevRow.evidence?.source || (id === "finra-margin" ? "FINRA margin statistics (manual, monthly)" : "last Scorekeeper/pack value"),
          date: heldSince,
          text: `HELD since ${heldSince} · ${prevRow.lastReading}`,
        };
      }
      if (!row.fresh) {
        const why = need == null ? "manual input (monthly FINRA) — Scorekeeper fill" : need.map((k) => errors[k] || `series ${k} unavailable or not at ${sessionDate}`).join("; ");
        needsFill.push({ id, heldSince: row.heldSince, reason: why });
      }
      if (id === "vix-vix3m") {
        volBand = row.statusHint || null;
      }
    }
    syncRowMirrors(row);
    row.contribution = Number((w * (typeof row.score === "number" ? row.score : 0)).toFixed(6));
    rows.push(row);
    evidenceById[id] = row.evidence;
  }

  const Sraw = rows.reduce((a, r) => a + r.contribution, 0);
  const Scomp = Math.round(Sraw * 1000) / 1000;
  const lightBeforeVeto = lightFor(Scomp);
  const nyse = rows.find((r) => r.id === "nyse-ad");
  const mmth = rows.find((r) => r.id === "pct-above-200dma");
  const inDanger = volRatio != null && volRatio >= 1.0;
  const nyseSick = typeof nyse.score === "number" && nyse.score <= -1;
  const mmthSick = typeof mmth.score === "number" && mmth.score <= -1;
  const vetoTriggered = inDanger && nyseSick && mmthSick;
  const light = lightBeforeVeto === "green" && vetoTriggered ? "amber" : lightBeforeVeto;

  // Regime v2 — locked logic in src/lib/regime/computeRegime.ts; 2-session
  // pill hysteresis. Store prior-day state so same-session reruns are stable.
  const histPath = join(DATA, "regime-history.json");
  const hist = existsSync(histPath) ? readJson(histPath) : { sessions: [] };
  const base = hist.asOf === sessionDate && hist.priorDay ? { ...hist, ...hist.priorDay } : hist;
  const regimeInput = rows.map((r) => (r.id === "vix-vix3m" ? { ...r, band: volBand ?? undefined, mediumRatio: volRatio ?? undefined } : r));
  const reg = computeRegime(regimeInput, { asOf: sessionDate, history: base, mediumRatio: volRatio });
  const priorDay = {
    asOf: base.asOf ?? null,
    stateShown: base.stateShown ?? null,
    pendingState: base.pendingState ?? null,
    pendingCount: base.pendingCount ?? 0,
    daysInState: base.daysInState ?? null,
    lastChangeDate: base.lastChangeDate ?? null,
  };
  const sessions = (base.sessions || []).filter((s) => s.date !== sessionDate);
  sessions.push({ date: sessionDate, C: Scomp, R: reg.R, stateRaw: reg.stateRaw, stateShown: reg.stateShown, spec: reg.spec });
  const newHist = {
    asOf: sessionDate,
    stateShown: reg.stateShown,
    pendingState: reg.pendingState,
    pendingCount: reg.pendingCount,
    daysInState: reg.daysInState,
    lastChangeDate: reg.stateShown !== priorDay.stateShown ? sessionDate : priorDay.lastChangeDate,
    priorDay,
    sessions: sessions.slice(-60),
    note: `${sessionDate} scripted Decide: R=${reg.R} ${reg.stateRaw} (shown ${reg.stateShown}); Spec ${reg.spec} (${reg.specNote}).`,
  };

  const oldS = prev.composite?.S;
  const oldLight = prev.composite?.light;
  const scannedAt = nzNowIso();
  const heldIds = rows.filter((r) => !r.fresh).map((r) => r.id);
  if (packMarkArg && heldIds.length) {
    console.error(`--pack-mark ${packMarkArg} refused: held inputs ${heldIds.join(", ")} (never mark a partial pack). No files written.`);
    process.exit(2);
  }

  // volCurve — every derived field comes from the SAME fresh bar as ratio so
  // mediumRatio / oneLiner / stance / feeds can never drift from it.
  let volCurve = prev.volCurve;
  if (volRatio != null) {
    const pv = prev.volCurve || {};
    const ratio4 = Number(volRatio.toFixed(4));
    const stance = resolveStance({ band: volBand, mediumRatio: volRatio });
    // HYG/IEF feed from the same S.hygief series the hyg-ief-sma20 seat uses
    // (same definition as scripts/refresh-vol-curve.mjs). Kept as-is if the
    // series failed or is not at the vol bar's date.
    let hygIef = pv.feeds?.hygIef;
    const hb = S.hygief?.bars;
    if (hb && hb.length >= 21 && hb[hb.length - 1].date === volFeed?.date) {
      const line = smaSeries(hb);
      const sNow = line[line.length - 1]?.close;
      const sPrev = line[line.length - 2]?.close;
      if (Number.isFinite(sNow)) {
        hygIef = {
          ratio: Number(hb[hb.length - 1].close.toFixed(4)),
          sma20: Number(sNow.toFixed(4)),
          rollingOver: Number.isFinite(sPrev) ? sNow < sPrev : null,
          status: "VERIFIED",
          asOf: hb[hb.length - 1].date,
          source: "Yahoo HYG ÷ IEF daily closes",
        };
      }
    }
    const d5 = S.vixratio?.bars ? delta5d(S.vixratio.bars.map((b) => b.close)) : null;
    const credit = creditConfirm(hygIef, volRatio, d5 != null ? d5 > 0 : null);
    volCurve = {
      ...pv,
      ratio: ratio4,
      mediumRatio: ratio4,
      band: volBand,
      stance,
      policies: policiesForStance(stance),
      oneLiner: boardOneLiner({ stance, mediumRatio: volRatio, credit }),
      feeds: {
        ...(pv.feeds || {}),
        ...(volFeed?.vix != null ? { vix: { value: Number(volFeed.vix.toFixed(2)), status: "VERIFIED", asOf: volFeed.date, source: "Yahoo ^VIX" } } : {}),
        ...(volFeed?.vix3m != null ? { vix3m: { value: Number(volFeed.vix3m.toFixed(2)), status: "VERIFIED", asOf: volFeed.date, source: "Yahoo ^VIX3M" } } : {}),
        ...(hygIef ? { hygIef } : {}),
      },
      asOf: volFeed?.date ?? sessionDate,
      source: "Yahoo ^VIX/^VIX3M",
    };
  }
  const next = {
    ...prev,
    // Session close instant (page shows it in PT); sessionDate is the NY day.
    asOf: nyCloseIso(sessionDate),
    sessionDate,
    sessionPhase: "post-close",
    packMark: packMarkArg ?? (heldIds.length ? `SCRIPTED_${sessionDate}_PARTIAL_HELD` : `SCRIPTED_${sessionDate}`),
    scoring: {
      method: "scripted-nightly-points",
      rulesVersion: RULES_VERSION,
      script: "scripts/refresh-decide.mjs",
      doc: "docs/ops/decide-scripted.md",
      scoredAt: scannedAt,
      fetchErrors: errors,
      scorekeeperFills: "FINRA + failed feeds only (/home/box/canaries/decide-fills.json)",
    },
    needsFill,
    composite: {
      S: Scomp,
      Sunrounded: Number(Sraw.toFixed(6)),
      light,
      lightBeforeVeto,
      bands: { green: "S >= +0.6", amber: "-0.3 <= S < +0.6", red: "S < -0.3" },
      priorPack: {
        sessionDate: prev.sessionDate ?? null,
        S: oldS,
        light: oldLight,
        note: `Previous state.json (${prev.packMark ?? "n/a"}) — saved as state.prev.json`,
      },
    },
    veto: {
      triggered: vetoTriggered,
      rule: "VIX/VIX3M >= 1.00 AND NYSE A-D sick AND MMTH/%above200 sick → light cannot be green",
      ownerLock: "2026-09-19",
      inputs: { seat: "vix-vix3m", vixVix3m: volRatio != null ? Number(volRatio.toFixed(4)) : null, threshold: 1, inDanger, nyseAdSick: nyseSick, mmthSick, band: volBand },
    },
    regimeV2: {
      draft: false,
      asOf: sessionDate,
      R: reg.R,
      stateRaw: reg.stateRaw,
      stateShown: reg.stateShown,
      spec: reg.spec,
      specNote: reg.specNote,
      oneLiner: reg.oneLiner,
      daysInState: reg.daysInState,
      pendingState: reg.pendingState,
      pendingCount: reg.pendingCount,
      votes: reg.votes,
      lights: reg.lights,
      note: `Regime v2 from scripted Decide ${sessionDate}.`,
    },
    volCurve,
    unverified: rows.filter((r) => r.status === "UNVERIFIED").map((r) => r.id),
    notes: [
      `${sessionDate} scripted Decide (${RULES_VERSION}): S=${Scomp} ${light.toUpperCase()}${heldIds.length ? `; held: ${heldIds.join(", ")}` : ""}. Previous S=${oldS} ${String(oldLight).toUpperCase()}.`,
      ...(Array.isArray(prev.notes) ? prev.notes.filter((n) => !/Yahoo re-gate formula seats/.test(n)).slice(0, 10) : []),
    ],
    weightageTable: rows.map((r) => ({
      id: r.id,
      name: r.name,
      score: r.score,
      weightNominal: r.weightNominal,
      weightEffective: r.weightEffective,
      contribution: r.contribution,
      status: r.status,
      fresh: r.fresh,
      heldSince: r.heldSince,
      evidence: r.evidence?.text,
    })),
    canaries: rows,
    packStamp: { sessionDate, refreshedAt: scannedAt, method: "scripted-nightly-points", held: heldIds },
  };
  delete next.packStamp.yahooFormulaSeats;

  // Sparklines — same series as the score; held inputs keep old line + note.
  const oldSpark = existsSync(join(DATA, "canary-sparklines.json")) ? readJson(join(DATA, "canary-sparklines.json")) : { series: {} };
  const spark = { asOf: sessionDate, points: 10, note: "Last 10 sessions of the same series the scripted Decide score uses (Yahoo + TradingView guest). Held inputs keep their old line with a held-since note.", series: {}, emptyNotes: {}, heldSince: {}, fetchErrors: {} };
  for (const r of rows) {
    const s = r.fresh ? sparkFor(r.id, S) : null;
    if (s && s.values.length > 1) {
      spark.series[r.id] = s;
    } else if (r.id === "finra-margin") {
      spark.emptyNotes[r.id] = "FINRA margin debt is monthly (not daily) — no 10-session chart";
    } else if (oldSpark.series?.[r.id]?.values?.length > 1) {
      const o = oldSpark.series[r.id];
      spark.series[r.id] = o;
      const since = oldSpark.heldSince?.[r.id] || o.dates?.[o.dates.length - 1] || oldSpark.asOf;
      spark.heldSince[r.id] = since;
      spark.fetchErrors[r.id] = `held since ${since}`;
    } else {
      spark.emptyNotes[r.id] = `No data source this session — held (${r.heldSince ? `since ${r.heldSince}` : "no prior line"})`;
    }
  }

  const summary = {
    sessionDate,
    packMark: next.packMark,
    volCurve: volCurve ? { ratio: volCurve.ratio, mediumRatio: volCurve.mediumRatio, band: volCurve.band, oneLiner: volCurve.oneLiner, asOf: volCurve.asOf } : null,
    S: Scomp,
    light,
    lightBeforeVeto,
    oldS,
    oldLight,
    veto: vetoTriggered,
    regime: { R: reg.R, raw: reg.stateRaw, shown: reg.stateShown, spec: reg.spec, pending: reg.pendingState, pendingCount: reg.pendingCount },
    needsFill,
    inputs: rows.map((r) => ({ id: r.id, old: prev.canaries.find((p) => p.id === r.id)?.score, new: r.score, fresh: r.fresh, heldSince: r.heldSince, source: r.evidence?.source, reading: r.lastReading })),
    fetchErrors: errors,
  };

  if (!args.dryRun) {
    copyFileSync(statePath, join(DATA, "state.prev.json"));
    writeJson(statePath, next);
    writeJson(histPath, newHist);
    writeJson(join(DATA, "canary-sparklines.json"), spark);
    for (const f of ["state.prev.json", "state.json", "regime-history.json", "canary-sparklines.json"]) mirrorData(f);
    writeJson(join(DATA, "decide-summary.json"), summary);
  }
  console.log(JSON.stringify(summary, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(2);
});
