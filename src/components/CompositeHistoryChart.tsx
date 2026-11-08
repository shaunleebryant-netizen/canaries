import type { CompositePoint } from "@/lib/compositeArchive";

/**
 * Real dated composite points only. If the archive is a short pack log, say so.
 * This is not a stand-in series.
 */
export function CompositeHistoryChart({
  points,
  source,
}: {
  points: CompositePoint[];
  source: string;
}) {
  if (points.length < 2) {
    return (
      <p className="mt-2 text-[11px] leading-snug text-slate-500">
        No dated composite archive is available to chart. {source}
      </p>
    );
  }
  const w = 280;
  const h = 72;
  const min = Math.min(...points.map((p) => p.S), -0.3);
  const max = Math.max(...points.map((p) => p.S), 0.6);
  const span = max - min || 1;
  const coords = points.map((p, i) => {
    const x = (i / (points.length - 1)) * (w - 8) + 4;
    const y = h - 8 - ((p.S - min) / span) * (h - 16);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });
  return (
    <figure className="mt-2">
      <figcaption className="text-[10px] leading-snug text-slate-500">
        Composite score from the pack log ({points[0].date} to {points[points.length - 1].date}, {points.length} recorded sessions). {source} Missing sessions are not filled in.
      </figcaption>
      <svg viewBox={`0 0 ${w} ${h}`} role="img" aria-label="Composite score from the recorded pack log" className="mt-1 h-16 w-full">
        <polyline fill="none" stroke="#eab308" strokeWidth="1.5" points={coords.join(" ")} />
      </svg>
    </figure>
  );
}
