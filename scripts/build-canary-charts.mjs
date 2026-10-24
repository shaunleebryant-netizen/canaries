#!/usr/bin/env node
/**
 * Canary history charts (owner PREVIEW 2026-10-09 7:09 PM NZ; APPROVED 7:25 PM NZ; flag MEMBERS_CANARY_CHARTS,
 * default ON). Runs nightly as full-pack step 8d2 (non-fatal).
 *
 * For each canary seat, rebuild ~12 months of the SAME daily series refresh-decide.mjs scores
 * (Yahoo + TradingView guest via scripts/lib/decide-series.mjs) and replay the SAME rule on every
 * day (prefix of bars) to get the Healthy / Neutral / Warning signal history. Output (members-only,
 * served by /api/members/canary-chart/[id]; direct hits 404 via worker-entry /_chartdata/*):
 *   public/_chartdata/canary/<id>.json + index.json
 * FINRA margin debt is manual + monthly (no stored series) → listed as "limited", not charted.
 * Never invents data: a seat whose inputs fail (or come back short / throw) is skipped, its PREVIOUS
 * file is left in place, and it is noted in index.json "failed". Exits 1 (index untouched) if nothing
 * could be charted. Files are written via tmp + rename.
 *
 *   node scripts/build-canary-charts.mjs [--session-date YYYY-MM-DD]
 */
import { existsSync, mkdirSync, renameSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { ROOT } from "./lib/scan-common.mjs";
import {
  align,
  jp30Continuous,
  loadTs,
  pointsScore,
  sign,
  smaAt,
  smaSeries,
  trendStats,
  tvDaily,
  yahooDaily,
} from "./lib/decide-series.mjs";

const args = process.argv.slice(2);
const sIdx = args.indexOf("--session-date");
const sessionDate = sIdx >= 0 ? args[sIdx + 1] : null;
const OUT = join(ROOT, "public/_chartdata/canary");
const SHOW = 252; // ~12 months of sessions
const MIN_LINE = 150; // shorter than this = bad fetch; keep the previous file instead of a stub
const writeAtomic = (file, text) => {
  writeFileSync(`${file}.tmp`, text);
  renameSync(`${file}.tmp`, file);
};
const { bandFromMediumRatio } = loadTs("src/lib/volCurve/computeVolCurve.ts");

const ysyms = [
  "XLK",
  "XLY",
  "XLP",
  "XLU",
  "XLF",
  "KRE",
  "^VIX",
  "^VIX3M",
  "XLG",
  "^SP600",
  "RSP",
  "QQQ",
  "HYG",
  "IEF",
  "ES=F",
];
const y = {};
await Promise.all(
  ysyms.map(
    async (s) => (y[s] = await yahooDaily(s, { range: "2y", sessionDate })),
  ),
);
const tv = tvDaily(["INDEX:NSHF", "INDEX:MMTH", "TVC:JP30", "TVC:JP30Y"], {
  bars: 330,
  sessionDate,
});
const ok = (x) => x && !x.error && x.bars?.length > 40;
const ok2 = (x) => x && !x.error && x.bars?.length > 1;
const ratio = (syms, f) =>
  syms.every((s) => ok(y[s]))
    ? align(
        syms.map((s) => y[s].bars),
        f,
      )
    : null;

const S = {
  cycdef: ratio(
    ["XLK", "XLY", "XLP", "XLU"],
    ([a, b, c, d]) => (a + b) / (c + d),
  ),
  xlfkre: ratio(["XLF", "KRE"], ([a, b]) => a / b),
  xlf: ok(y.XLF) ? y.XLF.bars : null,
  kre: ok(y.KRE) ? y.KRE.bars : null,
  vixratio: ratio(["^VIX", "^VIX3M"], ([a, b]) => a / b),
  xlg: ok(y.XLG) ? y.XLG.bars : null,
  sp600: ok(y["^SP600"]) ? y["^SP600"].bars : null,
  rsp: ok(y.RSP) ? y.RSP.bars : null,
  vix: ok(y["^VIX"]) ? y["^VIX"].bars : null,
  qqq: ok(y.QQQ) ? y.QQQ.bars : null,
  hygief: ratio(["HYG", "IEF"], ([a, b]) => a / b),
  nshf: ok(tv["INDEX:NSHF"]) ? tv["INDEX:NSHF"].bars : null,
  mmth: ok(tv["INDEX:MMTH"]) ? tv["INDEX:MMTH"].bars : null,
  esjp:
    ok(y["ES=F"]) && ok(tv["TVC:JP30"])
      ? align(
          [
            y["ES=F"].bars,
            // same roll back-adjustment as the Decide score (docs/ops/decide-scripted.md)
            jp30Continuous(tv["TVC:JP30"].bars, ok2(tv["TVC:JP30Y"]) ? tv["TVC:JP30Y"].bars : null).bars,
          ],
          ([a, b]) => a / b,
        )
      : null,
};

const sma20Line = (bars) =>
  bars.map((_, i) =>
    i >= 19
      ? smaAt(
          bars.map((b) => b.close),
          i,
        )
      : null,
  );
const pts = (pre, o) => pointsScore(trendStats(pre), o);
const pm1 = (pre) => {
  const st = trendStats(pre);
  return st ? (st.value > st.sma20 ? 1 : -1) : null;
};

// id → { bars (the plotted line), ref (line or consts), score(prefixIndex) }
const SEATS = {
  "cyclical-defensive": {
    src: "cycdef",
    unit: "ratio",
    lineLabel: "(XLK+XLY) ÷ (XLP+XLU) ratio (rising = growth sectors leading)",
    ref: "sma20",
    score: (pre) => pts(pre),
  },
  // Owner t630u/t631u 2026-10-10: the rule tests each leg against its OWN 20-day average, so plot the
  // legs (KRE default, XLF via toggle), not the XLF/KRE ratio (which rises when regionals lag and
  // read bullish while the status said Warning). Dates = days both legs traded (xlfkre axis).
  "xlf-kre": {
    src: "xlfkre",
    unit: "price",
    ref: "sma20",
    views: [
      { key: "KRE", src: "kre", lineLabel: "KRE price (regional banks)" },
      { key: "XLF", src: "xlf", lineLabel: "XLF price (financials)" },
    ],
    refNote:
      "Warning when XLF and KRE are both under their own 20-day averages, Healthy when both are above, Neutral when they split. Switch KRE / XLF to see each one.",
    score: (pre) => {
      const d = pre[pre.length - 1].date;
      const a = S.xlf.filter((b) => b.date <= d);
      const b = S.kre.filter((x) => x.date <= d);
      const pa = pts(a),
        pb = pts(b);
      if (pa == null || pb == null) return null;
      const da = sign(pa),
        db = sign(pb);
      return da === db && da !== 0
        ? Math.abs(pa) === 2 && Math.abs(pb) === 2
          ? 2 * da
          : da
        : 0;
    },
  },
  "vix-vix3m": {
    src: "vixratio",
    unit: "ratio",
    lineLabel: "VIX ÷ VIX3M ratio",
    refNote: "Lower is calmer: under 0.91 Healthy, 0.91 to 0.96 Neutral, 0.96 or higher Warning.",
    consts: [
      { v: 0.91, label: "0.91 caution" },
      { v: 0.96, label: "0.96 danger" },
    ],
    score: (pre) => {
      const band = bandFromMediumRatio(pre[pre.length - 1].close);
      return band === "SAFE" ? 2 : band === "DANGER" ? -2 : 0;
    },
  },
  "nyse-ad": {
    src: "nshf",
    line: (bars) => smaSeries(bars),
    unit: "20-day average of NYSE net highs",
    lineLabel: "20-day average of NYSE net highs (NSHF)",
    refNote: "Healthy above zero, Warning below.",
    consts: [{ v: 0, label: "zero line" }],
    score: (pre) => {
      const sl = smaSeries(pre);
      const n = sl.length;
      if (n < 10) return null;
      const cur = sl[n - 1].close,
        dir = sign(cur);
      return dir !== 0 &&
        sign(cur - sl[n - 6].close) === dir &&
        sign(cur - sl[n - 10].close) === dir
        ? 2 * dir
        : dir;
    },
  },
  "pct-above-200dma": {
    src: "mmth",
    unit: "% of stocks",
    lineLabel: "% of stocks above their 200-day average",
    refNote:
      "Above 65 reads Neutral (overheated) and 37 or under reads Healthy (washed out, a contrarian buy zone), so the background can turn green while the line is falling.",
    consts: [
      { v: 65, label: "65 hot" },
      { v: 50, label: "50" },
      { v: 37, label: "37 washed out" },
    ],
    score: (pre) => {
      const st = trendStats(pre);
      if (!st) return null;
      const v = st.value,
        p = pointsScore(st);
      return v > 65
        ? 0
        : v <= 37
          ? 1
          : v >= 50
            ? p === 2
              ? 2
              : 1
            : p === -2
              ? -2
              : -1;
    },
  },
  "es1-jp30": {
    src: "esjp",
    unit: "ratio",
    lineLabel: "ES futures ÷ Japan 30y bond price",
    refNote:
      "Healthy when above its average and up over 9 days, Warning when below and down over 9 days, otherwise Neutral.",
    ref: "sma20",
    score: (pre) => {
      const st = trendStats(pre);
      if (!st) return null;
      const side = sign(st.value - st.sma20);
      return side !== 0 && sign(st.chg9) === side
        ? sign(st.slope5) === side
          ? 2 * side
          : side
        : 0;
    },
  },
  "sp-top-50": {
    src: "xlg",
    unit: "XLG",
    lineLabel: "XLG price",
    ref: "sma20",
    score: (pre) => pts(pre),
  },
  sp600: {
    src: "sp600",
    unit: "^SP600",
    lineLabel: "S&P SmallCap 600 index",
    ref: "sma20",
    score: (pre) => pts(pre),
  },
  rsp: { src: "rsp", unit: "RSP", lineLabel: "RSP price", ref: "sma20", score: (pre) => pts(pre) },
  "vix-vvix": {
    src: "vix",
    unit: "VIX",
    lineLabel: "VIX",
    refNote:
      "Lower is calmer: under 19 Healthy, over 19 Warning.",
    consts: [{ v: 19, label: "19" }],
    score: (pre) => {
      const st = trendStats(pre);
      if (!st) return null;
      const lvl = st.value < 19 ? 1 : st.value > 19 ? -1 : 0;
      const p = pointsScore(st, { inverse: true });
      return lvl !== 0 && p === 2 * lvl ? 2 * lvl : lvl;
    },
  },
  "qqq-sma20": { src: "qqq", unit: "QQQ", lineLabel: "QQQ price", ref: "sma20", score: pm1 },
  "hyg-ief-sma20": {
    src: "hygief",
    unit: "ratio",
    lineLabel: "HYG ÷ IEF ratio (rising = more appetite for risk)",
    ref: "sma20",
    score: pm1,
  },
};

mkdirSync(OUT, { recursive: true });
const index = {
  asOf: null,
  built: new Date().toISOString(),
  charted: [],
  limited: {
    "finra-margin":
      "FINRA margin debt is published monthly and entered by hand, so there is no daily history to chart.",
  },
  failed: {},
};
for (const [id, seat] of Object.entries(SEATS)) {
  const bars = S[seat.src];
  if (!bars) {
    index.failed[id] = "inputs unavailable";
    continue;
  }
  try {
    const lineBars = seat.line ? seat.line(bars) : bars;
    if (lineBars.length < MIN_LINE) {
      index.failed[id] =
        `short input (${lineBars.length} bars)${existsSync(join(OUT, `${id}.json`)) ? " — previous file kept" : ""}`;
      continue;
    }
    const refLine = seat.ref === "sma20" ? sma20Line(lineBars) : null;
    const start = Math.max(0, lineBars.length - SHOW);
    // Views: each leg's own close + its own 20-day average (computed on that leg's full series,
    // exactly as trendStats does), looked up on the seat's date axis.
    const viewMaps = (seat.views ?? []).map((v) => {
      const vb = S[v.src];
      if (!vb) throw new Error(`view ${v.key}: inputs unavailable`);
      const sm = sma20Line(vb);
      return {
        ...v,
        close: new Map(vb.map((b) => [b.date, b.close])),
        avg: new Map(vb.map((b, i) => [b.date, sm[i]])),
      };
    });
    const views = viewMaps.map((v) => ({ key: v.key, lineLabel: v.lineLabel, y: [], r: [] }));
    const out = { d: [], y: [], r: refLine || views.length ? [] : null, s: [] };
    const p6 = (x) => (x == null ? null : +x.toPrecision(6));
    for (let i = start; i < lineBars.length; i++) {
      const date = lineBars[i].date;
      const pre = bars.filter((b) => b.date <= date);
      const sc = seat.score(pre);
      out.d.push(date);
      viewMaps.forEach((v, k) => {
        const c = v.close.get(date);
        if (c == null) throw new Error(`view ${v.key}: no close on ${date}`);
        views[k].y.push(p6(c));
        views[k].r.push(p6(v.avg.get(date)));
      });
      if (views.length) {
        out.y.push(views[0].y.at(-1));
        out.r.push(views[0].r.at(-1));
      } else {
        out.y.push(p6(lineBars[i].close));
        if (refLine) out.r.push(p6(refLine[i]));
      }
      out.s.push(sc == null ? null : sign(sc));
    }
    const doc = {
      v: 1,
      id,
      asOf: out.d[out.d.length - 1],
      unit: seat.unit,
      refLabel: seat.ref === "sma20" ? "20-day average" : null,
      consts: seat.consts ?? [],
      refNote: seat.refNote ?? null,
      lineLabel: views.length ? views[0].lineLabel : (seat.lineLabel ?? null),
      ...out,
      ...(views.length ? { views } : {}),
    };
    writeAtomic(join(OUT, `${id}.json`), JSON.stringify(doc));
    index.charted.push(id);
    index.asOf = index.asOf && index.asOf > doc.asOf ? index.asOf : doc.asOf;
    const flips = doc.s.filter((x, i) => i > 0 && x !== doc.s[i - 1]).length;
    console.log(
      `  ${id.padEnd(20)} ${doc.d.length} days to ${doc.asOf} · last signal ${doc.s.at(-1)} · ${flips} flips${views.map((v) => ` · ${v.key} ${v.y.at(-1)} avg ${v.r.at(-1)}`).join("")}`,
    );
  } catch (e) {
    index.failed[id] =
      `error: ${e instanceof Error ? e.message : e}${existsSync(join(OUT, `${id}.json`)) ? " — previous file kept" : ""}`;
  }
}
if (!index.charted.length) {
  console.error(
    `canary charts: nothing charted (${JSON.stringify(index.failed)}); previous files and index kept.`,
  );
  process.exit(1);
}
writeAtomic(join(OUT, "index.json"), JSON.stringify(index, null, 2));
console.log(
  `canary charts: ${index.charted.length} charted, limited ${Object.keys(index.limited).join(", ")}, failed ${JSON.stringify(index.failed)}`,
);
