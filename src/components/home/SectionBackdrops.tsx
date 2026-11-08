/* Draft section backgrounds (owner t953u, 2026-11-02). Decorative only, aria-hidden. */

const VEIL = "linear-gradient(180deg, rgb(2,6,23) 0%, rgba(2,6,23,0.55) 18%, rgba(2,6,23,0.55) 82%, rgb(2,6,23) 100%)";

/** Faded chart like the hero, mirrored so it doesn't repeat the hero exactly. */
export function ChartBackdrop({ opacity = 0.22, flip = true }: { opacity?: number; flip?: boolean }) {
  return (
    <>
      <div aria-hidden className="pointer-events-none absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: "url(/home/hero-chart.webp)", opacity, transform: flip ? "scaleX(-1)" : undefined }} />
      <div aria-hidden className="pointer-events-none absolute inset-0" style={{ background: VEIL }} />
      <div aria-hidden className="pointer-events-none absolute inset-0"
        style={{ background: "radial-gradient(ellipse at center, rgba(2,6,23,0.75) 0%, transparent 70%)" }} />
    </>
  );
}

/** Coal-mine tunnel: timber props, swinging lantern + caged canary, drifting coal dust. */
export function CoalmineBackdrop({ side = "right" }: { side?: "left" | "right" }) {
  const x = side === "right" ? "84%" : "12%";
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      <style>{`
        @keyframes cm-swing { 0%,100% { transform: rotate(-4deg) } 50% { transform: rotate(4deg) } }
        @keyframes cm-glow { 0%,100% { opacity: .55 } 50% { opacity: .85 } }
        @keyframes cm-dust { from { transform: translateY(0) } to { transform: translateY(-120px); opacity: 0 } }
        @media (prefers-reduced-motion: reduce) { .cm-anim { animation: none !important } }
      `}</style>
      {/* lantern glow */}
      <div className="cm-anim absolute -translate-x-1/2 rounded-full"
        style={{ left: x, top: "18%", width: 620, height: 620, marginTop: -200,
          background: "radial-gradient(circle, rgba(245,158,11,0.3) 0%, rgba(245,158,11,0.06) 40%, transparent 70%)",
          animation: "cm-glow 5s ease-in-out infinite" }} />
      <svg className="absolute inset-0 h-full w-full opacity-[0.85]" preserveAspectRatio="xMidYMid slice" viewBox="0 0 1200 700">
        {/* timber props receding */}
        <g stroke="#1e293b" fill="none">
          {[0, 1, 2, 3].map((i) => {
            const s = 1 - i * 0.2, w = 1100 * s, h = 640 * s, l = 600 - w / 2, t = 700 - h;
            return <path key={i} d={`M${l} 700 L${l} ${t + 40} L${l + w} ${t + 40} L${l + w} 700`} strokeWidth={22 * s} strokeOpacity={0.9 - i * 0.18} />;
          })}
        </g>
        {/* rails */}
        <g stroke="#334155" strokeWidth="3" strokeOpacity=".6">
          <line x1="430" y1="700" x2="560" y2="380" /><line x1="770" y1="700" x2="640" y2="380" />
          {[690, 620, 560, 510, 470, 440].map((y, i) => <line key={y} x1={460 + i * 18} y1={y} x2={740 - i * 18} y2={y} strokeWidth="5" />)}
        </g>
      </svg>
      {/* hanging lantern + canary cage, swinging */}
      <svg className="cm-anim absolute -translate-x-1/2 opacity-90" style={{ left: x, top: 0, transformOrigin: "50% 0", animation: "cm-swing 6s ease-in-out infinite" }}
        width="140" height="300" viewBox="0 0 140 300">
        <line x1="70" y1="0" x2="70" y2="150" stroke="#475569" strokeWidth="2" />
        {/* cage */}
        <path d="M40 210 Q40 150 70 150 Q100 150 100 210 Z" fill="none" stroke="#94a3b8" strokeWidth="2" />
        {[50, 60, 70, 80, 90].map((cx) => <line key={cx} x1={cx} y1={cx === 70 ? 150 : 158} x2={cx} y2="210" stroke="#64748b" strokeWidth="1.2" />)}
        <rect x="36" y="208" width="68" height="6" rx="2" fill="#94a3b8" />
        <line x1="48" y1="192" x2="92" y2="192" stroke="#64748b" strokeWidth="1.5" />
        {/* canary on perch */}
        <g fill="#facc15">
          <ellipse cx="72" cy="182" rx="11" ry="8" />
          <circle cx="62" cy="175" r="6" />
          <path d="M83 182 L95 188 L82 187 Z" />
          <path d="M56 175 L51 176 L56 178 Z" fill="#f59e0b" />
        </g>
        <circle cx="61" cy="174" r="1.2" fill="#0f172a" />
      </svg>
      {/* coal dust */}
      {Array.from({ length: 14 }).map((_, i) => (
        <span key={i} className="cm-anim absolute rounded-full bg-amber-200/40"
          style={{ left: `${(i * 37) % 100}%`, top: `${40 + ((i * 23) % 55)}%`, width: 2 + (i % 3), height: 2 + (i % 3),
            animation: `cm-dust ${8 + (i % 5) * 2}s linear ${i * 0.7}s infinite` }} />
      ))}
      <div className="absolute inset-0" style={{ background: VEIL }} />
    </div>
  );
}

/** Indicators hero (owner t990u/t991u): ONE indicator example, same treatment as the homepage hero chart
 *  but a different chart — Vertiv (VRT) daily with MFI Washout marks + MFI pane. */
export function IndicatorsHeroBackdrop() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className="absolute inset-0 bg-cover opacity-90 saturate-150 brightness-125"
        style={{ backgroundImage: "url(/indicators/mfi-washout.jpg)", backgroundPosition: "right center" }} />
      <div className="absolute inset-0"
        style={{ background: "linear-gradient(90deg, rgba(2,6,23,0.85) 0%, rgba(2,6,23,0.3) 50%, transparent 100%), linear-gradient(180deg, rgba(2,6,23,0.2) 0%, transparent 25%, transparent 70%, rgb(2,6,23) 100%)" }} />
      <div className="absolute inset-0 opacity-40"
        style={{ backgroundImage: "radial-gradient(circle at 20% 0%, rgba(234,179,8,0.18), transparent 45%)" }} />
    </div>
  );
}

/** Gold/light glints twinkling here and there (owner t1001u, 2026-11-02). Fixed positions → no hydration mismatch. */
const GLINTS: [number, number, number, number, number][] = [
  // left%, top%, size px, delay s, gold(1)/white(0)
  [6, 18, 3, 0, 1], [14, 72, 2, 1.8, 0], [22, 38, 4, 3.1, 1], [31, 86, 2, 0.7, 1], [38, 12, 3, 2.4, 0],
  [47, 58, 2, 4.2, 1], [55, 28, 4, 1.2, 1], [63, 80, 3, 3.6, 0], [71, 44, 2, 0.4, 1], [78, 15, 3, 2.9, 1],
  [85, 66, 4, 1.5, 1], [92, 34, 2, 3.9, 0], [96, 88, 3, 2.1, 1], [3, 52, 2, 4.6, 0], [50, 94, 3, 0.9, 1],
  [27, 6, 2, 3.3, 1], [68, 4, 2, 1.0, 0], [88, 50, 2, 4.9, 1],
];
export function SparkleField() {
  return (
    <div aria-hidden className="canary-sparkles pointer-events-none absolute inset-0 overflow-hidden">
      {GLINTS.map(([l, t, s, d, g], i) => (
        <span key={i} className="canary-glint" style={{
          left: `${l}%`, top: `${t}%`, width: s, height: s, animationDelay: `${d}s`,
          background: g ? "rgb(250,204,21)" : "rgb(255,251,235)",
          boxShadow: g ? `0 0 ${s * 3}px ${s}px rgba(234,179,8,0.55)` : `0 0 ${s * 3}px ${s}px rgba(255,255,255,0.4)`,
        }} />
      ))}
    </div>
  );
}
