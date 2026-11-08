/* Support-page realistic mine shaft backdrop (owner t989u/t994u). Decorative, aria-hidden. */
const VP = { x: 560, y: 235 }; // vanishing point
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

export function MineBackdrop() {
  // timber sets receding toward VP (perspective spacing)
  const sets = Array.from({ length: 16 }, (_, i) => i).map((i) => {
    const t = 1 - Math.pow(0.8, i + 0.3); // 0 near → 1 far
    const s = 1 - t;
    return { i, s, l: lerp(-80, VP.x, t), r: lerp(1280, VP.x, t), top: lerp(-40, VP.y, t), bot: lerp(760, VP.y + 6, t) };
  });
  const sleepers = Array.from({ length: 30 }).map((_, i) => 1 - Math.pow(0.88, i + 0.5));
  const glints = [
    [140, 180, 2.6], [210, 420, 1.8], [95, 560, 2.2], [330, 250, 1.4], [1050, 200, 2.4], [1110, 470, 2],
    [980, 610, 1.6], [880, 260, 1.3], [430, 330, 1.1], [760, 340, 1.2], [250, 90, 1.5], [1150, 90, 1.8],
  ];
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden bg-[#05070c]">
      <style>{`
        @keyframes mb-swing { 0%,100% { transform: rotate(-3.5deg) } 50% { transform: rotate(3.5deg) } }
        @keyframes mb-flicker { 0%,100% { opacity:.9 } 40% { opacity:.75 } 55% { opacity:1 } 70% { opacity:.82 } }
        @keyframes mb-twinkle { 0%,100% { opacity:.25; transform:scale(.7) } 50% { opacity:1; transform:scale(1.15) } }
        @keyframes mb-dust { from { transform: translate(0,0) } to { transform: translate(30px,-140px); opacity:0 } }
        @media (prefers-reduced-motion: reduce) { .mb-anim { animation: none !important } }
      `}</style>
      <svg className="absolute inset-0 h-full w-full" preserveAspectRatio="xMidYMid slice" viewBox="0 0 1200 700">
        <defs>
          <filter id="mb-rock" x="0" y="0" width="100%" height="100%">
            <feTurbulence type="fractalNoise" baseFrequency="0.012 0.02" numOctaves="5" seed="7" />
            <feColorMatrix values="0 0 0 0 0.16  0 0 0 0 0.13  0 0 0 0 0.11  0 0 0 1.4 -0.35" />
            <feDiffuseLighting surfaceScale="3" lightingColor="#f5b552" result="lit">
              <fePointLight x="1010" y="170" z="160" />
            </feDiffuseLighting>
            <feComposite in="SourceGraphic" in2="lit" operator="arithmetic" k1="1.1" k2="0" k3="0" />
          </filter>
          <filter id="mb-grain"><feTurbulence type="fractalNoise" baseFrequency="0.9 0.05" numOctaves="2" seed="3" /><feColorMatrix values="0 0 0 0 .3 0 0 0 0 .19 0 0 0 0 .1 0 0 0 .5 0" /><feComposite in2="SourceGraphic" operator="in" /></filter>
          <radialGradient id="mb-abyss" cx={VP.x / 1200} cy={VP.y / 700} r=".5">
            <stop offset="0" stopColor="#000" /><stop offset=".18" stopColor="#000" /><stop offset=".45" stopColor="#020306" stopOpacity=".8" /><stop offset=".8" stopColor="#000" stopOpacity=".15" /><stop offset="1" stopColor="#000" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="mb-fog" cx={VP.x / 1200} cy={VP.y / 700} r=".7">
            <stop offset="0" stopColor="#000" stopOpacity="1" /><stop offset=".12" stopColor="#000" stopOpacity=".9" /><stop offset=".3" stopColor="#05070c" stopOpacity=".2" /><stop offset="1" stopColor="#05070c" stopOpacity="0" />
          </radialGradient>
          <linearGradient id="mb-wood" x1="0" x2="1"><stop offset="0" stopColor="#3a2412" /><stop offset=".5" stopColor="#6b4420" /><stop offset="1" stopColor="#24170b" /></linearGradient>
          <linearGradient id="mb-rail" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stopColor="#9aa4b2" /><stop offset=".6" stopColor="#4b5563" /><stop offset="1" stopColor="#111" /></linearGradient>
          <radialGradient id="mb-lamp" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stopColor="#ffe2a0" stopOpacity=".38" /><stop offset=".12" stopColor="#ffc861" stopOpacity=".24" /><stop offset=".3" stopColor="#f59e0b" stopOpacity=".12" /><stop offset=".6" stopColor="#b45309" stopOpacity=".04" /><stop offset="1" stopColor="#f59e0b" stopOpacity="0" /></radialGradient>
        </defs>
        {/* rock walls */}
        <rect width="1200" height="700" fill="#3a2f27" filter="url(#mb-rock)" />
        {/* converging walls / ceiling shading */}
        <path d={`M0 0 L${VP.x} ${VP.y} L0 700 Z`} fill="#000" opacity=".35" />
        <path d={`M0 0 L1200 0 L${VP.x} ${VP.y} Z`} fill="#000" opacity=".5" />
        <path d={`M1200 0 L${VP.x} ${VP.y} L1200 700 Z`} fill="#000" opacity=".15" />
        {/* the abyss */}
        <rect width="1200" height="700" fill="url(#mb-abyss)" />
        {/* timber sets, far first */}
        {[...sets].reverse().map(({ i, s, l, r, top, bot }) => {
          const w = 52 * s + 1, fade = 0.2 + 0.8 * Math.pow(s, 0.6);
          return (
            <g key={i} opacity={fade}>
              <rect x={l} y={top} width={w} height={bot - top} fill="url(#mb-wood)" />
              <rect x={r - w} y={top} width={w} height={bot - top} fill="url(#mb-wood)" />
              <rect x={l - w * 0.3} y={top} width={r - l + w * 0.6} height={w * 0.9} fill="url(#mb-wood)" />
              <rect x={l} y={top} width={r - l} height={bot - top} fill="url(#mb-wood)" filter="url(#mb-grain)" opacity=".0" />
              <rect x={l + w - Math.max(1, w * 0.18)} y={top + w * 0.9} width={Math.max(1, w * 0.18)} height={bot - top} fill="#e0a85a" opacity={0.25 + 0.5 * s} />
              <rect x={r - w} y={top + w * 0.9} width={Math.max(1, w * 0.18)} height={bot - top} fill="#f3c27a" opacity={0.3 + 0.55 * s} />
              <rect x={l} y={top + w * 0.9 - Math.max(1, w * 0.15)} width={r - l} height={Math.max(1, w * 0.15)} fill="#d89a4c" opacity={0.2 + 0.45 * s} />
              <rect x={l} y={top} width={w} height={bot - top} fill="#000" opacity={0.6 * (1 - s)} />
              <rect x={r - w} y={top} width={w} height={bot - top} fill="#000" opacity={0.6 * (1 - s)} />
            </g>
          );
        })}
        {/* floor gravel shading */}
        <path d={`M-100 700 L${VP.x - 8} ${VP.y + 8} L${VP.x + 8} ${VP.y + 8} L1300 700 Z`} fill="#0b0a09" opacity=".55" />
        {/* sleepers + rails */}
        {sleepers.map((t, i) => {
          const y = lerp(700, VP.y + 8, t), hw = lerp(330, 6, t), th = lerp(18, 0.6, t);
          return <rect key={i} x={VP.x - hw} y={y - th} width={hw * 2} height={th} fill="#2b1c10" opacity={1 - t * 0.8} />;
        })}
        {[-1, 1].map((d) => (
          <polygon key={d} fill="url(#mb-rail)"
            points={`${VP.x + d * 220},700 ${VP.x + d * 236},700 ${VP.x + d * 2.2},${VP.y + 8} ${VP.x + d * 1.6},${VP.y + 8}`} />
        ))}
        {/* depth fog swallowing far frames and rails */}
        <rect width="1200" height="700" fill="url(#mb-fog)" />
        {/* lamplight pool on wall/floor */}
        <ellipse className="mb-anim" cx="1010" cy="220" rx="560" ry="460" fill="url(#mb-lamp)" style={{ animation: "mb-flicker 4s ease-in-out infinite" }} />
        {/* gold flecks embedded in rock */}
        {glints.map(([x, y, r], i) => (
          <g key={i} className="mb-anim" style={{ transformOrigin: `${x}px ${y}px`, animation: `mb-twinkle ${3 + (i % 4)}s ease-in-out ${i * 0.4}s infinite` }}>
            <circle cx={x} cy={y} r={r * 5} fill="#fbbf24" opacity=".12" />
            <circle cx={x} cy={y} r={r} fill="#fde68a" />
            <path d={`M${x - r * 4} ${y} L${x + r * 4} ${y} M${x} ${y - r * 4} L${x} ${y + r * 4}`} stroke="#fde68a" strokeWidth=".6" opacity=".7" />
          </g>
        ))}
      </svg>

      {/* hanging oil lamp + brass cage with canary */}
      <svg className="mb-anim absolute" style={{ left: "82%", top: 0, transformOrigin: "70px 0", animation: "mb-swing 7s ease-in-out infinite" }}
        width="140" height="320" viewBox="0 0 140 320">
        <defs>
          <linearGradient id="mb-brass" x1="0" x2="1"><stop offset="0" stopColor="#7c5a1e" /><stop offset=".45" stopColor="#e3b85a" /><stop offset="1" stopColor="#5b3f12" /></linearGradient>
          <radialGradient id="mb-bird" cx=".4" cy=".35"><stop offset="0" stopColor="#fff3a3" /><stop offset=".6" stopColor="#facc15" /><stop offset="1" stopColor="#b7860b" /></radialGradient>
        </defs>
        <path d="M70 0 L70 150" stroke="#3f3a33" strokeWidth="2" strokeDasharray="3 2" />
        <path d="M38 222 Q38 154 70 154 Q102 154 102 222" fill="#000" fillOpacity=".25" stroke="url(#mb-brass)" strokeWidth="2.4" />
        {[46, 54, 62, 70, 78, 86, 94].map((cx) => <path key={cx} d={`M${cx} ${160 + Math.abs(cx - 70) * 0.35} L${cx} 222`} stroke="url(#mb-brass)" strokeWidth="1.1" opacity=".85" />)}
        <circle cx="70" cy="150" r="4" fill="none" stroke="url(#mb-brass)" strokeWidth="2" />
        <line x1="46" y1="200" x2="94" y2="200" stroke="#5b3f12" strokeWidth="2" />
        <g>
          <path d="M82 190 Q98 196 100 206 L84 196 Z" fill="#b7860b" />
          <ellipse cx="73" cy="190" rx="12" ry="8.5" fill="url(#mb-bird)" />
          <path d="M66 188 Q75 182 84 190 Q75 194 66 188 Z" fill="#d4a017" opacity=".8" />
          <circle cx="62" cy="181" r="6.5" fill="url(#mb-bird)" />
          <path d="M56 181 L50 182.5 L56 184 Z" fill="#e08a1e" />
          <circle cx="60.5" cy="180" r="1.3" fill="#111" /><circle cx="60.1" cy="179.6" r=".4" fill="#fff" />
          <path d="M70 198 L69 201 M76 198 L77 201" stroke="#a16207" strokeWidth="1" />
        </g>
        <rect x="34" y="220" width="72" height="7" rx="2" fill="url(#mb-brass)" />
        {/* lamp glow on cage */}
        <circle className="mb-anim" cx="70" cy="190" r="34" fill="#ffcf70" fillOpacity=".08" style={{ animation: "mb-flicker 4s ease-in-out infinite" }} />
      </svg>

      {/* coal dust in the lamplight */}
      {Array.from({ length: 22 }).map((_, i) => (
        <span key={i} className="mb-anim absolute rounded-full"
          style={{ left: `${55 + ((i * 29) % 45)}%`, top: `${20 + ((i * 17) % 70)}%`, width: 1 + (i % 3), height: 1 + (i % 3),
            background: "rgba(253,230,138,.55)", filter: i % 4 === 0 ? "blur(1px)" : undefined,
            animation: `mb-dust ${9 + (i % 6) * 2}s linear ${i * 0.6}s infinite` }} />
      ))}
      {/* vignette + top/bottom fade into page */}
      <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse at 47% 40%, transparent 30%, rgba(2,4,8,.88) 100%)" }} />
      {/* overall dim: deeper mine, less washed out (owner t1005u) */}
      <div className="absolute inset-0" style={{ background: "rgba(2,4,8,.4)" }} />
      <div className="absolute inset-0" style={{ background: "linear-gradient(180deg, rgb(2,6,23) 0%, transparent 14%, transparent 86%, rgb(2,6,23) 100%)" }} />
      {/* readability veil on the copy side */}
      <div className="absolute inset-0" style={{ background: "linear-gradient(90deg, rgba(2,6,23,.75) 0%, rgba(2,6,23,.3) 32%, transparent 45%)" }} />
    </div>
  );
}
