/**
 * Members ETF tab layout. Values come from the sector pack and ETF Watch file.
 * A missing return or mark date stays missing.
 */

export type SectorReturnRow = {
  symbol: string;
  name: string;
  r1d: number | null;
  r1w: number | null;
  r1m: number | null;
  r3m: number | null;
  ytd: number | null;
  rs1m: number | null;
  monthly: (number | null)[];
  ranks: (number | null)[];
};

export type SectorPack = {
  asOf: string;
  months: string[];
  rows: SectorReturnRow[];
  currentMonthPartial?: boolean;
};

export type MarkKind = "smile" | "fish" | "exhaustion" | "skull";

export type SectorMark = {
  ticker: string;
  signals: string[];
  smileAsOf?: string;
  fishAsOf?: string;
  exhaustionAsOf?: string;
  skullAsOf?: string;
};

const MARK_DATE: Record<MarkKind, keyof SectorMark> = {
  smile: "smileAsOf",
  fish: "fishAsOf",
  exhaustion: "exhaustionAsOf",
  skull: "skullAsOf",
};

function byToday(a: SectorReturnRow, b: SectorReturnRow): number {
  return (b.r1d ?? Number.NEGATIVE_INFINITY) - (a.r1d ?? Number.NEGATIVE_INFINITY);
}

export function leadersAndLaggards(rows: readonly SectorReturnRow[], count = 3) {
  const ordered = [...rows].sort(byToday);
  const n = Math.min(count, Math.floor(rows.length / 2));
  return {
    leaders: ordered.slice(0, n),
    laggards: n === 0 ? [] : ordered.slice(-n).reverse(),
  };
}

export function performanceOrder(rows: readonly SectorReturnRow[]): SectorReturnRow[] {
  return [...rows].sort(byToday);
}

export function monthBars(rows: readonly SectorReturnRow[]) {
  return [...rows].sort((a, b) => (a.ranks.at(-1) ?? 99) - (b.ranks.at(-1) ?? 99));
}

export function monthReturn(row: SectorReturnRow): number | null {
  return row.monthly.at(-1) ?? null;
}

/** A mark is listed only when the pack recorded that kind's own date. */
export function recordedMarks(alert: SectorMark | undefined): { kind: MarkKind; date: string }[] {
  if (!alert) return [];
  const out: { kind: MarkKind; date: string }[] = [];
  for (const kind of alert.signals) {
    if (!(kind in MARK_DATE)) continue;
    const raw = alert[MARK_DATE[kind as MarkKind]];
    const date = typeof raw === "string" ? raw.slice(0, 10) : "";
    if (/^\d{4}-\d{2}-\d{2}$/.test(date)) out.push({ kind: kind as MarkKind, date });
  }
  return out;
}
