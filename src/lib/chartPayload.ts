/**
 * Server-side chart mark filter. Raw public/_chartdata files are not rewritten.
 * Composite colour does not remove marks here. Scanners apply that rule.
 * Free ETF charts may only keep Smiley and monthly trend.
 */
import type { CompositeArchive } from "./compositeArchive";

export type ChartAccess = "paid" | "free-etf";

const FREE_HIDDEN = new Set(["fish", "mfi", "fairy", "sweat", "skull", "vanna"]);

export function ymdFromChartOffset(d0: number, off: number): string {
  return new Date((d0 + off) * 86400000).toISOString().slice(0, 10);
}

export function filterChartMarks(
  marks: readonly (readonly [number, string])[],
  d0: number,
  _archive: CompositeArchive,
  access: ChartAccess,
): [number, string][] {
  const out: [number, string][] = [];
  for (const mark of marks) {
    const off = mark[0];
    const kind = mark[1];
    if (typeof off !== "number" || typeof kind !== "string") continue;
    if (kind === "vanna") continue;
    if (access === "free-etf" && FREE_HIDDEN.has(kind)) continue;
    out.push([off, kind]);
  }
  return out;
}
