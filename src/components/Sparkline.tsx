/** Placeholder 13-week sparkline from score history (−2..+2). */
export function Sparkline({ values }: { values: number[] }) {
  const w = 104;
  const h = 28;
  const pad = 2;
  const min = -2;
  const max = 2;
  const pts = values.length ? values : Array(13).fill(0);
  const step = (w - pad * 2) / Math.max(pts.length - 1, 1);
  const coords = pts
    .map((v, i) => {
      const x = pad + i * step;
      const y = pad + ((max - v) / (max - min)) * (h - pad * 2);
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} aria-hidden className="text-slate-400">
      <polyline
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        points={coords}
      />
    </svg>
  );
}
