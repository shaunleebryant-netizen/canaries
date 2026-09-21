/** Compact line chart for ~10 session series (or any numeric series). Auto-scales. */
export function Sparkline({
  values,
  width = 88,
  height = 28,
}: {
  values: number[];
  width?: number;
  height?: number;
}) {
  const w = width;
  const h = height;
  const pad = 2;
  const pts = values.length ? values : [];
  if (pts.length < 2) {
    return (
      <span className="text-xs text-slate-500" aria-hidden>
        —
      </span>
    );
  }
  const dataMin = Math.min(...pts);
  const dataMax = Math.max(...pts);
  const span = dataMax - dataMin || Math.abs(dataMax) * 0.01 || 1;
  const min = dataMin - span * 0.08;
  const max = dataMax + span * 0.08;
  const step = (w - pad * 2) / Math.max(pts.length - 1, 1);
  const coords = pts
    .map((v, i) => {
      const x = pad + i * step;
      const y = pad + ((max - v) / (max - min)) * (h - pad * 2);
      return `${x},${y}`;
    })
    .join(" ");

  const last = pts[pts.length - 1]!;
  const first = pts[0]!;
  const up = last >= first;

  return (
    <svg
      width={w}
      height={h}
      viewBox={`0 0 ${w} ${h}`}
      aria-hidden
      className={up ? "text-emerald-400/90" : "text-rose-400/90"}
    >
      <polyline
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
        strokeLinecap="round"
        points={coords}
      />
    </svg>
  );
}
