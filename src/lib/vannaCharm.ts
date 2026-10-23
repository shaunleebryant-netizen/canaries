/**
 * Vanna & Charm Flows — pure NY calendar classifier.
 *
 * Supportive (green): 1st Thursday → 3rd Wednesday of the month (inclusive).
 * On holiday (red): 3rd Thursday → 1st Wednesday of next month (inclusive);
 * early-month days before the 1st Thursday stay On holiday (continuation).
 *
 * All calendar math uses America/New_York civil dates.
 *
 * Spot checks (NY calendar):
 * - 2026-09-02 (Tue) → ON_HOLIDAY (before 1st Thu Sep 3)
 * - 2026-09-03 (1st Thu) → SUPPORTIVE
 * - 2026-09-16 (3rd Wed) → SUPPORTIVE
 * - 2026-09-17 (3rd Thu) → ON_HOLIDAY
 * - 2026-10-01 (1st Thu) → SUPPORTIVE
 */

export type VannaCharmStatus = "SUPPORTIVE" | "ON_HOLIDAY";

export interface VannaCharmResult {
  status: VannaCharmStatus;
  /** UI pill label */
  label: string;
  /** YYYY-MM-DD in America/New_York */
  asOf: string;
  /** Short window blurb for the card subtitle */
  windowNote: string;
}

const TZ = "America/New_York";

/** JS weekday: 0=Sun … 3=Wed … 4=Thu … 6=Sat */
export const WEEKDAY = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
} as const;

export interface NyYmd {
  y: number;
  /** 1–12 */
  m: number;
  /** 1–31 */
  d: number;
}

/** Civil Y-M-D in America/New_York for an instant. */
export function nyYmd(date: Date = new Date()): NyYmd {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const get = (t: string) =>
    Number(parts.find((p) => p.type === t)?.value ?? NaN);
  return { y: get("year"), m: get("month"), d: get("day") };
}

function ymdKey(y: number, m: number, d: number): number {
  return y * 10_000 + m * 100 + d;
}

function formatYmd(y: number, m: number, d: number): string {
  return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

/**
 * Day-of-month (1–31) for the n-th weekday in a month.
 * @param year full year
 * @param month 1–12
 * @param weekday 0=Sun … 6=Sat
 * @param n 1-based occurrence (1 = first)
 */
export function nthWeekdayOfMonth(
  year: number,
  month: number,
  weekday: number,
  n: number
): number {
  // UTC noon avoids DST edge cases when only asking getUTCDay.
  const first = new Date(Date.UTC(year, month - 1, 1, 12, 0, 0));
  const firstDow = first.getUTCDay();
  const day = 1 + ((weekday - firstDow + 7) % 7) + (n - 1) * 7;
  return day;
}

function supportiveBounds(y: number, m: number): { start: number; end: number } {
  const start = nthWeekdayOfMonth(y, m, WEEKDAY.Thu, 1);
  const end = nthWeekdayOfMonth(y, m, WEEKDAY.Wed, 3);
  return { start, end };
}

function holidayWindowNote(y: number, m: number): string {
  // On holiday spans 3rd Thu of this month → 1st Wed of next month.
  // Early month before 1st Thu is continuation of prior month's holiday.
  const firstThu = nthWeekdayOfMonth(y, m, WEEKDAY.Thu, 1);
  // If still before this month's 1st Thu, the active holiday started last month.
  return "3rd Thu → next 1st Wed";
  void firstThu;
}

/**
 * Classify Vanna & Charm flow regime for a given instant (NY calendar date).
 */
export function classifyVannaCharm(date: Date = new Date()): VannaCharmResult {
  const { y, m, d } = nyYmd(date);
  const { start, end } = supportiveBounds(y, m);
  const asOf = formatYmd(y, m, d);

  if (d >= start && d <= end) {
    return {
      status: "SUPPORTIVE",
      label: "Supportive",
      asOf,
      windowNote: "1st Thu → 3rd Wed",
    };
  }

  return {
    status: "ON_HOLIDAY",
    label: "On holiday",
    asOf,
    windowNote: holidayWindowNote(y, m),
  };
}

/**
 * Active window metadata for the current (or given) NY date.
 */
export function vannaCharmWindow(date: Date = new Date()): VannaCharmResult & {
  windowStart: string;
  windowEnd: string;
} {
  const base = classifyVannaCharm(date);
  const { y, m, d } = nyYmd(date);

  if (base.status === "SUPPORTIVE") {
    const { start, end } = supportiveBounds(y, m);
    return {
      ...base,
      windowStart: formatYmd(y, m, start),
      windowEnd: formatYmd(y, m, end),
    };
  }

  // On holiday: either late this month (from 3rd Thu) or early next (through 1st Wed)
  // or early this month continuing from prior month's 3rd Thu.
  const firstThu = nthWeekdayOfMonth(y, m, WEEKDAY.Thu, 1);
  if (d < firstThu) {
    // Continuation from previous month
    let py = y;
    let pm = m - 1;
    if (pm < 1) {
      pm = 12;
      py -= 1;
    }
    const start = nthWeekdayOfMonth(py, pm, WEEKDAY.Thu, 3);
    const end = nthWeekdayOfMonth(y, m, WEEKDAY.Wed, 1);
    return {
      ...base,
      windowStart: formatYmd(py, pm, start),
      windowEnd: formatYmd(y, m, end),
    };
  }

  // Late month: 3rd Thu → next month 1st Wed
  const start = nthWeekdayOfMonth(y, m, WEEKDAY.Thu, 3);
  let ny = y;
  let nm = m + 1;
  if (nm > 12) {
    nm = 1;
    ny += 1;
  }
  const end = nthWeekdayOfMonth(ny, nm, WEEKDAY.Wed, 1);
  return {
    ...base,
    windowStart: formatYmd(y, m, start),
    windowEnd: formatYmd(ny, nm, end),
  };
}

/** Test helper: classify a YYYY-MM-DD as if it were noon UTC that NY calendar day. */
export function classifyVannaCharmYmd(ymd: string): VannaCharmResult {
  const [y, m, d] = ymd.split("-").map(Number);
  // Feed a UTC instant that formats to this YMD in NY (15:00 UTC ≈ morning/afternoon ET).
  const instant = new Date(Date.UTC(y!, m! - 1, d!, 15, 0, 0));
  return classifyVannaCharm(instant);
}
