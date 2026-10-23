/**
 * Fetch helper is offline here — reads /tmp/yahoo-regime-raw.json produced by fetch,
 * scores via scoreRegime, writes data/regime-state.json + /home/box/canaries/regime-state.json.
 * DRAFT ONLY — do not deploy.
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "fs";
import {
  scoreRegime,
  SEMIS_BREADTH_PROXY,
  SPEC_TICKERS,
  type StrategicState,
  type RegimeScoreResult,
} from "../src/lib/regime/scoreRegime";

type Pair = [string, number];

interface RawFile {
  series: Record<string, Pair[]>;
  errors: Record<string, string>;
}

interface HistoryFile {
  strategicState?: StrategicState;
  pendingState?: StrategicState | null;
  pendingCount?: number;
  lastStrategicChange?: string | null;
  daysInState?: number;
  asOf?: string;
}

function closes(series: Pair[] | undefined): number[] {
  return (series ?? []).map(([, c]) => c);
}

function dates(series: Pair[] | undefined): string[] {
  return (series ?? []).map(([d]) => d);
}

function spark3m(series: Pair[] | undefined, approxDays = 63): { dates: string[]; values: number[] } {
  const s = series ?? [];
  const slice = s.slice(-approxDays);
  return { dates: slice.map(([d]) => d), values: slice.map(([, v]) => v) };
}

function breadthSeries(
  semis: Record<string, Pair[]>,
  dateIndex: string[]
): number[] {
  // For each date in dateIndex (aligned to SMH or NDX), compute % above SMA10
  // Build per-ticker map date->close
  const maps: Record<string, Map<string, number>> = {};
  for (const t of SEMIS_BREADTH_PROXY) {
    const m = new Map<string, number>();
    for (const [d, c] of semis[t] ?? []) m.set(d, c);
    maps[t] = m;
  }
  // Need rolling windows — use full SMH-aligned dates from longest semis ticker
  const allDates = new Set<string>();
  for (const t of SEMIS_BREADTH_PROXY) {
    for (const [d] of semis[t] ?? []) allDates.add(d);
  }
  const sorted = [...allDates].sort();
  const pctByDate = new Map<string, number>();
  for (let i = 9; i < sorted.length; i++) {
    let ok = 0;
    let n = 0;
    const windowDates = sorted.slice(i - 9, i + 1);
    for (const t of SEMIS_BREADTH_PROXY) {
      const m = maps[t];
      const vals: number[] = [];
      for (const d of windowDates) {
        const v = m.get(d);
        if (v != null) vals.push(v);
      }
      if (vals.length < 10) continue;
      const sma = vals.reduce((a, b) => a + b, 0) / vals.length;
      const px = vals[vals.length - 1];
      n++;
      if (px > sma) ok++;
    }
    if (n > 0) pctByDate.set(sorted[i], (ok / n) * 100);
  }
  return dateIndex.map((d) => pctByDate.get(d)).filter((v): v is number => v != null);
}

function quantumVsQqq(
  spec: Record<string, Pair[]>,
  qqq: Pair[],
  approxDays = 63
): { dates: string[]; values: number[] } {
  const qMap = new Map(qqq.map(([d, c]) => [d, c]));
  const datesAll = qqq.map(([d]) => d);
  const outDates: string[] = [];
  const outVals: number[] = [];
  // ratio of equal-weight basket / QQQ, indexed to 100 at start of window
  const window = datesAll.slice(-approxDays);
  let base: number | null = null;
  for (const d of window) {
    const q = qMap.get(d);
    if (q == null || q === 0) continue;
    const px: number[] = [];
    for (const t of SPEC_TICKERS) {
      const row = (spec[t] ?? []).find(([dd]) => dd === d);
      if (row) px.push(row[1]);
    }
    if (px.length < 4) continue;
    const basket = px.reduce((a, b) => a + b, 0) / px.length;
    const ratio = basket / q;
    if (base == null) base = ratio;
    outDates.push(d);
    outVals.push((ratio / base!) * 100);
  }
  return { dates: outDates, values: outVals };
}

const raw: RawFile = JSON.parse(readFileSync("/tmp/yahoo-regime-raw.json", "utf8"));

const fetchDegraded: string[] = [];
for (const [sym, err] of Object.entries(raw.errors ?? {})) {
  // Ignore legacy VX futures errors — curve now uses ^VIX vs ^VIX3M
  if (sym === "VX=F" || sym.includes(".CBT") || sym.startsWith("VX")) continue;
  fetchDegraded.push(`${sym}: ${err}`);
}
if (!raw.series["^VIX3M"]?.length) {
  fetchDegraded.push("^VIX3M — unavailable; VIX curve proxy degraded");
}

const historyPath = "/home/box/canaries/regime-history.json";
let history: HistoryFile = {};
if (existsSync(historyPath)) {
  history = JSON.parse(readFileSync(historyPath, "utf8"));
}

const semis: Record<string, number[]> = {};
const semisPairs: Record<string, Pair[]> = {};
for (const t of SEMIS_BREADTH_PROXY) {
  if (!raw.series[t]) {
    fetchDegraded.push(t);
    continue;
  }
  semis[t] = closes(raw.series[t]);
  semisPairs[t] = raw.series[t];
}

const spec: Record<string, number[]> = {};
const specPairs: Record<string, Pair[]> = {};
for (const t of SPEC_TICKERS) {
  if (!raw.series[t]) {
    fetchDegraded.push(t);
    continue;
  }
  spec[t] = closes(raw.series[t]);
  specPairs[t] = raw.series[t];
}

const ndxPairs = raw.series["^NDX"];
const asOfDate =
  dates(ndxPairs).at(-1) ??
  dates(raw.series["^VIX"]).at(-1) ??
  new Date().toISOString().slice(0, 10);

const result: RegimeScoreResult = scoreRegime({
  ndx: closes(raw.series["^NDX"]),
  smh: closes(raw.series["SMH"]),
  spx: closes(raw.series["^GSPC"]),
  vix: closes(raw.series["^VIX"]),
  hyg: closes(raw.series["HYG"]),
  qqq: closes(raw.series["QQQ"]),
  semis,
  spec,
  vix3m: closes(raw.series["^VIX3M"]),
  previousState: history.strategicState ?? null,
  pendingState: history.pendingState ?? null,
  pendingCount: history.pendingCount ?? 0,
});

const degraded = [...new Set([...result.degraded, ...fetchDegraded])];

// days in state / last change
let lastStrategicChange = history.lastStrategicChange ?? asOfDate;
let daysInState = history.daysInState ?? 1;
if (history.strategicState && history.strategicState !== result.strategicState) {
  lastStrategicChange = asOfDate;
  daysInState = 1;
} else if (history.asOf && history.asOf !== asOfDate) {
  daysInState = (history.daysInState ?? 1) + 1;
} else if (!history.strategicState) {
  lastStrategicChange = asOfDate;
  daysInState = 1;
}

const ndxSpark = spark3m(raw.series["^NDX"]);
const smhSpark = spark3m(raw.series["SMH"]);
const vixSpark = spark3m(raw.series["^VIX"]);
const breadthVals = breadthSeries(semisPairs, ndxSpark.dates);
const breadthSpark = {
  dates: ndxSpark.dates.slice(-breadthVals.length),
  values: breadthVals.slice(-ndxSpark.dates.length),
};
// align breadth to last N of ndx spark
const bAligned = (() => {
  const fullDates = dates(raw.series["SMH"] ?? raw.series["^NDX"]);
  const fullBreadth = breadthSeries(semisPairs, fullDates);
  // map date->pct from a proper pass
  const maps: Record<string, Map<string, number>> = {};
  for (const t of SEMIS_BREADTH_PROXY) {
    maps[t] = new Map((semisPairs[t] ?? []).map(([d, c]) => [d, c]));
  }
  const allDates = [...new Set(Object.values(maps).flatMap((m) => [...m.keys()]))].sort();
  const pctByDate = new Map<string, number>();
  for (let i = 9; i < allDates.length; i++) {
    let ok = 0,
      n = 0;
    const windowDates = allDates.slice(i - 9, i + 1);
    for (const t of SEMIS_BREADTH_PROXY) {
      const vals: number[] = [];
      for (const d of windowDates) {
        const v = maps[t].get(d);
        if (v != null) vals.push(v);
      }
      if (vals.length < 10) continue;
      const sma = vals.reduce((a, b) => a + b, 0) / 10;
      n++;
      if (vals[vals.length - 1] > sma) ok++;
    }
    if (n) pctByDate.set(allDates[i], (ok / n) * 100);
  }
  const slice = ndxSpark.dates
    .map((d) => ({ d, v: pctByDate.get(d) }))
    .filter((x): x is { d: string; v: number } => x.v != null);
  return { dates: slice.map((x) => x.d), values: slice.map((x) => x.v) };
})();

const qSpark = quantumVsQqq(specPairs, raw.series["QQQ"] ?? []);

const payload = {
  asOf: asOfDate,
  asOfIso: `${asOfDate}T20:00:00.000Z`,
  generatedAt: new Date().toISOString(),
  fixture: false,
  draft: true,
  degraded,
  strategicScore: result.strategicScore,
  strategicState: result.strategicState,
  tacticalLabel: result.tacticalLabel,
  tacticalScore: result.tacticalScore,
  specOn: result.specOn,
  specRs5d: result.specRs5d,
  sizingHint: result.sizingHint,
  daysInState,
  lastStrategicChange,
  lastStrategicChangeState: result.strategicState,
  contributions: result.contributions,
  inputLights: result.inputLights,
  raw: result.raw,
  vixBackwardation2d: result.vixBackwardation2d,
  history: {
    stub: true,
    previousState: result.previousState,
    pendingState: result.pendingState,
    pendingCount: result.pendingCount,
    note: "First draft — synthetic prior = current band when no history file",
  },
  series: {
    ndx: ndxSpark,
    smh: smhSpark,
    vix: vixSpark,
    smhBreadth: bAligned,
    quantumQqq: qSpark,
  },
};

mkdirSync("/workspace/repos/canaries/data", { recursive: true });
mkdirSync("/home/box/canaries", { recursive: true });

const json = JSON.stringify(payload, null, 2);
writeFileSync("/workspace/repos/canaries/data/regime-state.json", json);
writeFileSync("/home/box/canaries/regime-state.json", json);

// persist history stub for next run
writeFileSync(
  historyPath,
  JSON.stringify(
    {
      asOf: asOfDate,
      strategicState: result.strategicState,
      pendingState: result.pendingState,
      pendingCount: result.pendingCount,
      lastStrategicChange,
      daysInState,
    },
    null,
    2
  )
);

console.log("=== REGIME SCORE REPORT ===");
console.log("asOf:", asOfDate);
console.log("strategicScore:", result.strategicScore);
console.log("strategicState:", result.strategicState);
console.log("tactical:", result.tacticalLabel, result.tacticalScore);
console.log("specOn:", result.specOn, "RS5d:", result.specRs5d);
console.log("sizing:", result.sizingHint);
console.log("degraded:", degraded);
console.log("\nContributions:");
for (const c of result.contributions) {
  console.log(
    `  ${c.id.padEnd(14)} ${String(c.contribution).padStart(5)}  [${c.status}]  ${c.raw ?? ""}`
  );
}
console.log("\nWrote data/regime-state.json + /home/box/canaries/regime-state.json");
