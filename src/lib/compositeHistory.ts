/**
 * Layout helpers for the recorded composite history.
 * A gap longer than a weekend splits the line. Nothing is interpolated.
 */
export type Dated = { date: string };

export type BenchmarkClose = { date: string; close: number };

const DAY = 86400000;

function utcDay(ymd: string): number {
  return Math.round(Date.parse(`${ymd}T00:00:00Z`) / DAY);
}

/** Split where a weekday is missing. A Friday-to-Monday step (three calendar days) stays one segment. */
export function historySegments<T extends Dated>(points: readonly T[]): T[][] {
  const ordered = [...points].sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
  const segments: T[][] = [];
  for (const point of ordered) {
    const prev = segments.at(-1)?.at(-1);
    const gap = prev ? utcDay(point.date) - utcDay(prev.date) : 0;
    const weekend = gap === 3;
    if (!prev || (gap > 1 && !weekend)) segments.push([point]);
    else segments[segments.length - 1].push(point);
  }
  return segments;
}

/** Exact date matches only. A composite date with no bar is omitted, not filled. */
export function closesOnDates(bars: readonly BenchmarkClose[], dates: readonly string[]): BenchmarkClose[] {
  const want = new Set(dates);
  const seen = new Set<string>();
  const out: BenchmarkClose[] = [];
  for (const bar of bars) {
    if (!want.has(bar.date) || seen.has(bar.date)) continue;
    if (!Number.isFinite(bar.close)) continue;
    seen.add(bar.date);
    out.push({ date: bar.date, close: bar.close });
  }
  out.sort((a, b) => (a.date < b.date ? -1 : 1));
  return out;
}
