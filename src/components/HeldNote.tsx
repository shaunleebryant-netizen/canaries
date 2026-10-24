/**
 * Small visible "held since YYYY-MM-DD" / "stale since MM-DD" note for any box
 * or Decide input whose data was NOT refreshed on the pack session (audit P3).
 * Held values are never re-stamped with the pack as-of date.
 */
export function HeldNote({
  since,
  label = "held since",
  className = "",
}: {
  since: string | null | undefined;
  label?: string;
  className?: string;
}) {
  if (!since) return null;
  return (
    <span
      className={`inline-block rounded bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-medium normal-case tracking-normal text-amber-300 ring-1 ring-amber-400/25 ${className}`}
      title="Not updated today. This is the last good reading, from the date shown."
    >
      {label} {since}
    </span>
  );
}

/** YYYY-MM-DD of an ISO/date string (UTC date part). */
export function ymdOf(asOf: string | null | undefined): string | null {
  if (!asOf) return null;
  return String(asOf).slice(0, 10);
}

/** Returns the held-since date when asOf is before the pack session, else null. */
export function heldSince(
  asOf: string | null | undefined,
  sessionDate: string | null | undefined
): string | null {
  const d = ymdOf(asOf);
  if (!d || !sessionDate) return null;
  return d < sessionDate ? d : null;
}
