/**
 * Fish, Smiley, Fairy and MFI may show only when the composite at the signal
 * close was amber (yellow) or green. Red closes are suppressed. A missing
 * dated score is pending, not eligible, and is not treated as zero.
 * Monthly trend, Sweaty and Skull are unchanged.
 * Raw files stay on disk; this only classifies rows at read time.
 */
import { colourOn, type CompositeArchive, type CompositeColour } from "./compositeArchive";

export const GATED_MARKS = ["fish", "smile", "mfi", "fairy"] as const;
export type GatedMark = (typeof GATED_MARKS)[number];

export type TimingDecision = "eligible" | "suppressed" | "pending" | "ungated";

const GATED = new Set<string>(GATED_MARKS);

export function isGatedMark(kind: string): boolean {
  return GATED.has(kind);
}

export function timingDecision(kind: string, ymd: string, archive: CompositeArchive): TimingDecision {
  if (!isGatedMark(kind)) return "ungated";
  const colour: CompositeColour | "unknown" = colourOn(archive, ymd);
  if (colour === "unknown") return "pending";
  if (colour === "red") return "suppressed";
  return "eligible";
}

/** Every gated kind on the row must be eligible. Ungated kinds never block the row. */
export function rowDecision(kinds: readonly string[], ymd: string, archive: CompositeArchive): TimingDecision {
  const gated = kinds.filter(isGatedMark);
  if (!gated.length) return "ungated";
  const decisions = gated.map((k) => timingDecision(k, ymd, archive));
  if (decisions.includes("pending")) return "pending";
  if (decisions.includes("suppressed")) return "suppressed";
  return "eligible";
}

export function filterSignals<T extends string>(
  signals: readonly T[],
  ymd: string,
  archive: CompositeArchive,
): T[] {
  return signals.filter((s) => {
    const d = timingDecision(s, ymd, archive);
    return d === "ungated" || d === "eligible";
  });
}

export interface GateCounts {
  raw: number;
  eligible: number;
  suppressedRed: number;
  pendingUnknown: number;
}

export function emptyGateCounts(): GateCounts {
  return { raw: 0, eligible: 0, suppressedRed: 0, pendingUnknown: 0 };
}

export function tally(counts: GateCounts, decision: TimingDecision, n = 1): void {
  counts.raw += n;
  if (decision === "eligible" || decision === "ungated") counts.eligible += n;
  else if (decision === "suppressed") counts.suppressedRed += n;
  else counts.pendingUnknown += n;
}
