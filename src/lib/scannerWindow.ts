/**
 * Scanner-box display only. Chart files, signal-history.json and email alerts are not rewritten.
 * Fish, Smiley, Fairy and MFI need an amber or green composite on the mark's own date.
 * A missing score is not eligible. Sweaty and Skull use the date window and are not colour-gated.
 * The file's asOf is never treated as the mark date.
 */
import type { CompositeArchive } from "./compositeArchive";
import { timingDecision } from "./compositeGate";

export function lastTradingSessions(dates: readonly string[], sessionDate: string, n = 5): string[] {
  const day = sessionDate.slice(0, 10);
  const uniq = [...new Set(dates.map((d) => d.slice(0, 10)).filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d) && d <= day))];
  uniq.sort();
  return uniq.slice(-n);
}

export function eventDate(value: string | null | undefined): string | null {
  if (!value) return null;
  const day = value.slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(day) ? day : null;
}

/** Bullish event prints are withheld on red or missing. Warning prints and snapshots are not. */
export const SCANNER_POLARITY = {
  fish: "bullish-print",
  smile: "bullish-print",
  fairy: "bullish-print",
  mfi: "bullish-print",
  sweaty: "warning-print",
  skull: "warning-print",
  bearish: "snapshot",
  ibd: "snapshot",
  warriors: "snapshot",
  "baby-bulls": "snapshot",
} as const;

export type ScannerPolarity = (typeof SCANNER_POLARITY)[keyof typeof SCANNER_POLARITY];

export function withholdsForRedComposite(id: keyof typeof SCANNER_POLARITY): boolean {
  return SCANNER_POLARITY[id] === "bullish-print";
}

/** Colour gate for Fish, Smiley, Fairy and MFI. Warning kinds stay visible. */
export function colourAllowsPrint(kind: string, markDate: string | null, archive: CompositeArchive): boolean {
  if (!markDate) return false;
  const decision = timingDecision(kind, markDate, archive);
  if (decision === "ungated") return true;
  return decision === "eligible";
}

export function printInWindow(
  kind: string,
  markDate: string | null,
  archive: CompositeArchive,
  sessions: readonly string[],
): boolean {
  if (!markDate || !sessions.includes(markDate)) return false;
  return colourAllowsPrint(kind, markDate, archive);
}

type FishLike = {
  ticker: string;
  signal: "smile" | "fish" | "both";
  asOf: string;
  smileAsOf?: string;
  fishAsOf?: string;
  note?: string;
  timeframe?: string;
};

/** Keeps only kinds whose own date is inside the window and, for these kinds, non-red. */
export function fishForScanner<T extends FishLike>(rows: readonly T[], archive: CompositeArchive, sessions: readonly string[]): { rows: T[]; missingDate: number } {
  const out: T[] = [];
  let missingDate = 0;
  for (const row of rows) {
    const kinds: Array<"smile" | "fish"> = [];
    const wantSmile = row.signal === "smile" || row.signal === "both";
    const wantFish = row.signal === "fish" || row.signal === "both";
    const smileDate = eventDate(row.smileAsOf);
    const fishDate = eventDate(row.fishAsOf);
    if (wantSmile && !smileDate) missingDate += 1;
    if (wantFish && !fishDate) missingDate += 1;
    if (wantSmile && printInWindow("smile", smileDate, archive, sessions)) kinds.push("smile");
    if (wantFish && printInWindow("fish", fishDate, archive, sessions)) kinds.push("fish");
    if (!kinds.length) continue;
    const dates = [kinds.includes("smile") ? smileDate : null, kinds.includes("fish") ? fishDate : null].filter((d): d is string => Boolean(d));
    dates.sort();
    out.push({
      ...row,
      signal: kinds.length === 2 ? "both" : kinds[0],
      asOf: dates.at(-1) ?? row.asOf,
    });
  }
  return { rows: out, missingDate };
}

type Dated = { asOf?: string | null };

export function datedPrintsForScanner<T extends Dated>(
  rows: readonly T[],
  kind: string,
  archive: CompositeArchive,
  sessions: readonly string[],
): { rows: T[]; missingDate: number } {
  const out: T[] = [];
  let missingDate = 0;
  for (const row of rows) {
    const date = eventDate(row.asOf);
    if (!date) {
      missingDate += 1;
      continue;
    }
    if (printInWindow(kind, date, archive, sessions)) out.push(row);
  }
  return { rows: out, missingDate };
}

type ExhaustionLike = {
  signal: "exhaustion" | "skull";
  signals?: ("exhaustion" | "skull")[];
  asOf: string;
  exhaustionAsOf?: string;
  skullAsOf?: string;
};

/** Sweaty and Skull. Dates are the kind dates, never the file asOf. Not colour-gated. */
export function exhaustionForScanner<T extends ExhaustionLike>(rows: readonly T[], sessions: readonly string[]): { rows: T[]; missingDate: number } {
  const out: T[] = [];
  let missingDate = 0;
  for (const row of rows) {
    const wanted = row.signals?.length ? row.signals : [row.signal];
    const kept: Array<"exhaustion" | "skull"> = [];
    if (wanted.includes("exhaustion")) {
      const date = eventDate(row.exhaustionAsOf);
      if (!date) missingDate += 1;
      else if (sessions.includes(date)) kept.push("exhaustion");
    }
    if (wanted.includes("skull")) {
      const date = eventDate(row.skullAsOf);
      if (!date) missingDate += 1;
      else if (sessions.includes(date)) kept.push("skull");
    }
    if (!kept.length) continue;
    const dates = [kept.includes("exhaustion") ? eventDate(row.exhaustionAsOf) : null, kept.includes("skull") ? eventDate(row.skullAsOf) : null].filter((d): d is string => Boolean(d));
    dates.sort();
    out.push({ ...row, signals: kept, signal: kept.at(-1) ?? kept[0], asOf: dates.at(-1) ?? row.asOf });
  }
  return { rows: out, missingDate };
}

type EtfLike = {
  signals: string[];
  asOf: string;
  smileAsOf?: string;
  fishAsOf?: string;
  exhaustionAsOf?: string;
  skullAsOf?: string;
};

const ETF_DATE: Record<string, "smileAsOf" | "fishAsOf" | "exhaustionAsOf" | "skullAsOf"> = {
  smile: "smileAsOf",
  fish: "fishAsOf",
  exhaustion: "exhaustionAsOf",
  skull: "skullAsOf",
};

type CryptoLike = {
  signals: string[];
  asOf: string;
  smileAsOf?: string;
  fishAsOf?: string;
  mfiAsOf?: string;
  fairyAsOf?: string;
  exhaustionAsOf?: string;
  skullAsOf?: string;
};

const CRYPTO_DATE: Record<string, keyof CryptoLike> = {
  smile: "smileAsOf",
  fish: "fishAsOf",
  mfi: "mfiAsOf",
  fairy: "fairyAsOf",
  exhaustion: "exhaustionAsOf",
  skull: "skullAsOf",
};

/**
 * Crypto Watch display only. Uses the same equity-session window and the mark's own date.
 * A weekend date is not a session and is not given another day's composite.
 * The row asOf is replaced with the latest kept mark date and is never the gate date.
 */
export function cryptoForScanner<T extends CryptoLike>(
  rows: readonly T[],
  archive: CompositeArchive,
  sessions: readonly string[],
): { rows: T[]; missingDate: number } {
  const out: T[] = [];
  let missingDate = 0;
  for (const row of rows) {
    const kept: string[] = [];
    const dates: string[] = [];
    for (const kind of row.signals) {
      const field = CRYPTO_DATE[kind];
      const date = field ? eventDate(row[field] as string | undefined) : null;
      if (!date) {
        missingDate += 1;
        continue;
      }
      if (printInWindow(kind, date, archive, sessions)) {
        kept.push(kind);
        dates.push(date);
      }
    }
    if (!kept.length) continue;
    dates.sort();
    out.push({ ...row, signals: kept, asOf: dates.at(-1) ?? row.asOf });
  }
  return { rows: out, missingDate };
}

export function etfForScanner<T extends EtfLike>(rows: readonly T[], archive: CompositeArchive, sessions: readonly string[]): { rows: T[]; missingDate: number } {
  const out: T[] = [];
  let missingDate = 0;
  for (const row of rows) {
    const kept: string[] = [];
    for (const kind of row.signals) {
      const field = ETF_DATE[kind];
      const date = field ? eventDate(row[field]) : null;
      if (!date) {
        missingDate += 1;
        continue;
      }
      if (printInWindow(kind, date, archive, sessions)) kept.push(kind);
    }
    if (kept.length) out.push({ ...row, signals: kept });
  }
  return { rows: out, missingDate };
}
