/**
 * Server-side chart mark filter. Raw public/_chartdata files are not rewritten.
 * Gated marks (fish, smile, mfi, fairy) need an amber or green composite on that bar's date.
 * Free ETF charts may only keep Smiley and monthly trend, and Smiley is still gated.
 */
import { timingDecision } from "./compositeGate";
import type { CompositeArchive } from "./compositeArchive";

export type ChartAccess = "paid" | "free-etf";

const FREE_HIDDEN = new Set(["fish", "mfi", "fairy", "sweat", "skull", "vanna"]);

export function ymdFromChartOffset(d0: number, off: number): string {
  return new Date((d0 + off) * 86400000).toISOString().slice(0, 10);
}

export function filterChartMarks(
  marks: readonly (readonly [number, string])[],
  d0: number,
  archive: CompositeArchive,
  access: ChartAccess,
): [number, string][] {
  const out: [number, string][] = [];
  for (const mark of marks) {
    const off = mark[0];
    const kind = mark[1];
    if (typeof off !== "number" || typeof kind !== "string") continue;
    if (kind === "vanna") continue;
    if (access === "free-etf" && FREE_HIDDEN.has(kind)) continue;
    const decision = timingDecision(kind, ymdFromChartOffset(d0, off), archive);
    if (decision === "suppressed" || decision === "pending") continue;
    out.push([off, kind]);
  }
  return out;
}
