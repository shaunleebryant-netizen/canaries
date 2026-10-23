"use client";

import { useEffect, useState } from "react";

/**
 * Timestamp shown in the visitor's own time zone with a short zone label.
 * Server + first client render use New York time labelled "ET" (identical on
 * both, so no hydration mismatch); after mount it swaps to the browser's local
 * zone. If the browser gives no zone, the ET text stays.
 */
type Mode = "datetime" | "date";

const FIELDS: Record<Mode, Intl.DateTimeFormatOptions> = {
  datetime: {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  },
  date: { year: "numeric", month: "short", day: "numeric" },
};

function formatWith(
  d: Date,
  mode: Mode,
  locale: string | undefined,
  timeZone: string | undefined,
  forceLabel?: string
): string | null {
  try {
    const parts = new Intl.DateTimeFormat(locale, {
      ...FIELDS[mode],
      timeZone,
      timeZoneName: "short",
    }).formatToParts(d);
    const zone = parts.find((p) => p.type === "timeZoneName")?.value;
    const body = parts
      .filter((p) => p.type !== "timeZoneName")
      .map((p) => p.value)
      .join("")
      // ICU differs between Node and browsers (U+202F / U+00A0 before AM/PM);
      // normalise so server and client text match (no hydration mismatch).
      .replace(/[\u202f\u00a0]/g, " ")
      .replace(/[\s,]+$/, "")
      .trim();
    const label = forceLabel ?? zone;
    if (!label) return null;
    return `${body} ${label}`;
  } catch {
    return null;
  }
}

/** Server / first-render text: America/New_York, labelled ET (EST/EDT aware). */
export function formatEt(iso: string, mode: Mode = "datetime"): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return formatWith(d, mode, "en-US", "America/New_York", "ET") ?? iso;
}

export function LocalTime({
  iso,
  mode = "datetime",
  className,
}: {
  iso: string;
  mode?: Mode;
  className?: string;
}) {
  const [text, setText] = useState(() => formatEt(iso, mode));

  useEffect(() => {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return;
    let tz: string | undefined;
    try {
      tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    } catch {
      tz = undefined;
    }
    if (!tz) return; // keep ET fallback
    const local = formatWith(d, mode, undefined, tz);
    if (local) setText(local);
  }, [iso, mode]);

  return (
    <time dateTime={iso} className={className}>
      {text}
    </time>
  );
}
