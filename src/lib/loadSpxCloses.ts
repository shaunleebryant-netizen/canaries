/**
 * SPX daily closes from the local chart pack. Dates that are not in the file are absent.
 * This does not call Yahoo and does not invent a bar.
 */
import spxJson from "../../public/_chartdata/SPX.json";
import { ymdFromChartOffset } from "./chartPayload";
import { closesOnDates, type BenchmarkClose } from "./compositeHistory";

type SpxFile = {
  t?: string;
  asOf?: string;
  d0?: number;
  b?: [number, number, number, number, number, number | null][];
};

export type SpxClosePack = {
  symbol: "SPX";
  asOf: string;
  source: string;
  closes: BenchmarkClose[];
};

export function loadSpxClosesForDates(dates: readonly string[]): SpxClosePack {
  const doc = spxJson as unknown as SpxFile;
  const d0 = doc.d0;
  const bars: BenchmarkClose[] = [];
  if (typeof d0 === "number" && Array.isArray(doc.b)) {
    for (const bar of doc.b) {
      if (bar.length < 5 || typeof bar[0] !== "number" || typeof bar[4] !== "number") continue;
      bars.push({ date: ymdFromChartOffset(d0, bar[0]), close: bar[4] });
    }
  }
  return {
    symbol: "SPX",
    asOf: typeof doc.asOf === "string" ? doc.asOf : "",
    source: "public/_chartdata/SPX.json",
    closes: closesOnDates(bars, dates),
  };
}
