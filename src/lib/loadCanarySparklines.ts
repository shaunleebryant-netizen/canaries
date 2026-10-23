/**
 * Last ~10 trading-session sparklines per canary seat.
 * Prefer data/canary-sparklines.json; optionally refresh from Yahoo at request time.
 * Never invent — empty seats stay empty with a note.
 */
import stubJson from "../../data/canary-sparklines.json";
import {
  alignedRatio,
  fetchDailyCloses,
  type YahooBar,
} from "./yahooFinance";

export interface CanarySparkSeries {
  dates: string[];
  values: number[];
  source: string;
}

export interface CanarySparklinesPayload {
  asOf: string;
  points: number;
  note: string;
  series: Record<string, CanarySparkSeries>;
  emptyNotes: Record<string, string>;
  /** Inputs whose line was not refreshed this pack (old line kept). */
  heldSince?: Record<string, string>;
  fetchErrors?: Record<string, string>;
  liveRefresh?: boolean;
}

type StubFile = {
  asOf?: string;
  points?: number;
  note?: string;
  series?: Record<
    string,
    { dates?: string[]; values?: number[]; source?: string }
  >;
  emptyNotes?: Record<string, string>;
  heldSince?: Record<string, string>;
  fetchErrors?: Record<string, string>;
};

function fromStub(): CanarySparklinesPayload {
  const stub = stubJson as StubFile;
  const series: Record<string, CanarySparkSeries> = {};
  for (const [id, s] of Object.entries(stub.series ?? {})) {
    if (!s.values || s.values.length < 2) continue;
    series[id] = {
      dates: s.dates ?? [],
      values: s.values,
      source: s.source ?? "",
    };
  }
  return {
    asOf: stub.asOf ?? "",
    points: stub.points ?? 10,
    note:
      stub.note ??
      "Last ~10 trading sessions from Yahoo daily closes. Empty seats have no clean series.",
    series,
    emptyNotes: stub.emptyNotes ?? {},
    heldSince: stub.heldSince ?? {},
    fetchErrors: stub.fetchErrors,
  };
}

async function closes(symbol: string): Promise<YahooBar[] | null> {
  const r = await fetchDailyCloses(symbol, { range: "3mo", lastN: 40 });
  if ("error" in r) return null;
  return r.bars;
}

/** Live Yahoo refresh for seats with clean mappings; soft-fail keeps stub. */
export async function loadCanarySparklines(
  opts: { live?: boolean } = {}
): Promise<CanarySparklinesPayload> {
  const base = fromStub();
  if (!opts.live) return base;

  const emptyNotes = { ...base.emptyNotes };
  const series = { ...base.series };
  const fetchErrors: Record<string, string> = { ...(base.fetchErrors ?? {}) };

  try {
    const [
      xlk,
      xly,
      xlp,
      xlu,
      xlf,
      kre,
      vix,
      vix3m,
      xlg,
      sp600idx,
      rsp,
      qqq,
      hyg,
      ief,
    ] = await Promise.all([
      closes("XLK"),
      closes("XLY"),
      closes("XLP"),
      closes("XLU"),
      closes("XLF"),
      closes("KRE"),
      closes("^VIX"),
      closes("^VIX3M"),
      closes("XLG"),
      closes("^SP600"),
      closes("RSP"),
      closes("QQQ"),
      closes("HYG"),
      closes("IEF"),
    ]);

    const setRatio = (
      id: string,
      bars: Array<YahooBar[] | null>,
      combine: (c: number[]) => number | null,
      source: string
    ) => {
      if (bars.some((b) => !b)) return;
      const aligned = alignedRatio(
        bars as YahooBar[][],
        combine,
        10
      );
      if (aligned) {
        series[id] = { ...aligned, source };
        delete emptyNotes[id];
      }
    };

    const setPrice = (
      id: string,
      bars: YahooBar[] | null,
      source: string
    ) => {
      if (!bars || bars.length < 2) return;
      const slice = bars.slice(-10);
      series[id] = {
        dates: slice.map((b) => b.date),
        values: slice.map((b) => Number(b.close.toFixed(4))),
        source,
      };
      delete emptyNotes[id];
    };

    setRatio(
      "cyclical-defensive",
      [xlk, xly, xlp, xlu],
      (c) => (c[0]! + c[1]!) / (c[2]! + c[3]!),
      "(XLK+XLY)/(XLP+XLU)"
    );
    // Owner 2026-10-10: KRE price (same default line as the Banks chart pop-up), not the XLF/KRE ratio.
    setPrice("xlf-kre", kre, "KRE");
    setRatio(
      "vix-vix3m",
      [vix, vix3m],
      (c) => c[0]! / c[1]!,
      "^VIX/^VIX3M"
    );
    setRatio(
      "hyg-ief-sma20",
      [hyg, ief],
      (c) => c[0]! / c[1]!,
      "HYG/IEF"
    );
    setPrice("sp-top-50", xlg, "XLG");
    setPrice("sp600", sp600idx, "S&P SmallCap 600 (^SP600)");
    setPrice("rsp", rsp, "RSP");
    setPrice("qqq-sma20", qqq, "QQQ");
    setPrice("vix-vvix", vix, "^VIX");

    const es = await closes("ES=F");
    setPrice("es1-jp30", es, "ES=F (ES leg; JP30 bond pending)");

    // NSHF: keep stub/Scout export if present — do not blank it on live refresh
    if (series["nyse-ad"]?.values?.length) {
      delete emptyNotes["nyse-ad"];
    } else {
      emptyNotes["nyse-ad"] =
        "NSHF needs Scout export — no Yahoo series";
    }

    // Honest empties only where no daily series exists
    emptyNotes["pct-above-200dma"] =
      "MMTH has no public Yahoo daily series — blank until pack history lands";
    emptyNotes["finra-margin"] =
      "FINRA margin debt is monthly — no 10-session daily chart";
    delete emptyNotes["vix-vvix"];
    delete emptyNotes["es1-jp30"];
  } catch (e) {
    fetchErrors["_live"] = e instanceof Error ? e.message : String(e);
  }

  return {
    asOf: new Date().toISOString().slice(0, 10),
    points: 10,
    note: base.note,
    series,
    emptyNotes,
    fetchErrors,
    liveRefresh: true,
  };
}

/** Merge sparkline values onto members canary rows. */
export function attachSparklines<
  T extends { id: string; sparkline?: number[]; sparklineHeldSince?: string },
>(rows: T[], payload: CanarySparklinesPayload): T[] {
  return rows.map((row) => {
    const s = payload.series[row.id];
    if (s?.values?.length) {
      const held = payload.heldSince?.[row.id];
      return { ...row, sparkline: s.values, sparklineHeldSince: held };
    }
    // Drop stale 13-wk score sparklines if present
    const { sparkline: _drop, ...rest } = row as T & { sparkline?: number[] };
    return { ...rest, sparkline: undefined } as T;
  });
}
