"use client";
// Owner 2026-11-02 (t1010u): no cursor following (owner found it distracting). The canary now
// wanders on its own along the header's bottom edge: rests a few seconds, hops a short way to a
// random spot, sometimes pecks at a little gold seed that pops up there. Slow + small on purpose.
// Click: pause / resume wandering. prefers-reduced-motion: sits still beside the logo. Decorative only.
// Owner t1014u: after 2 min on a page a second, little blue canary appears on the right and
// wanders/pecks the same way (same pause-on-click + reduced-motion rules). Render
// <HeaderCanary variant="blue" /> beside the yellow one; it stays hidden until the delay passes.
// Owner 2026-11-04: pink canary after 10 min — <HeaderCanary variant="pink" />.
import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";

const PALETTES = {
  yellow: { tail: "#eab308", body: "#facc15", head: "#fde047", wing: "#eab308", beak: "#f59e0b", cheek: "#fb923c", glow: "rgba(250,204,21,0.35)" },
  blue: { tail: "#2563eb", body: "#60a5fa", head: "#93c5fd", wing: "#3b82f6", beak: "#f59e0b", cheek: "#f472b6", glow: "rgba(96,165,250,0.35)" },
  pink: { tail: "#db2777", body: "#f472b6", head: "#f9a8d4", wing: "#ec4899", beak: "#f59e0b", cheek: "#fb7185", glow: "rgba(244,114,182,0.35)" },
} as const;

export default function HeaderCanary({
  variant = "yellow",
  appearAfterMs = variant === "blue" ? 120_000 : variant === "pink" ? 600_000 : 0,
}: { variant?: keyof typeof PALETTES; appearAfterMs?: number } = {}) {
  const c = PALETTES[variant];
  const [shown, setShown] = useState(appearAfterMs <= 0);
  const pathname = usePathname();
  // Timer restarts on every route change: hide, then re-show after appearAfterMs on this page.
  useEffect(() => {
    if (appearAfterMs <= 0) return;
    setShown(false);
    const id = window.setTimeout(() => setShown(true), appearAfterMs);
    return () => clearTimeout(id);
  }, [appearAfterMs, pathname]);
  const walker = useRef<HTMLDivElement>(null);
  const bird = useRef<HTMLDivElement>(null);
  const seed = useRef<HTMLDivElement>(null);
  const paused = useRef(false);
  const togglePause = () => {
    paused.current = !paused.current;
    bird.current?.setAttribute("title", paused.current ? "Click to let me wander" : "Click to pause me");
  };

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (!shown || !walker.current) return;
    const startX =
      variant === "blue" ? Math.max(window.innerWidth - 60, 240)
      : variant === "pink" ? Math.max(Math.floor(window.innerWidth * 0.55), 280)
      : 210;
    walker.current.style.transform = `translateX(${startX}px)`;
    if (mq.matches || !bird.current || !seed.current) return;
    let x = startX, target = startX, face = 1, raf = 0, last = performance.now();
    let restUntil = performance.now() + 3000, eating = false, eatUntil = 0, timer = 0;
    const rand = (a: number, b: number) => a + Math.random() * (b - a);
    const pickTarget = () => {
      const max = Math.min(window.innerWidth - 28, 1200);
      const step = rand(60, 220) * (Math.random() < 0.5 ? -1 : 1);
      target = Math.min(Math.max(x + step, 8), max);
      if (Math.random() < 0.55) {
        // drop a seed where it's heading, to be eaten on arrival
        seed.current!.style.transform = `translateX(${target + (target > x ? 16 : -4)}px)`;
        seed.current!.classList.add("is-seed");
        eating = true;
      }
    };
    const tick = (t: number) => {
      const dt = Math.min((t - last) / 16.7, 3); last = t;
      const dx = target - x;
      const moving = Math.abs(dx) > 1.5;
      if (moving && !paused.current) {
        x += Math.sign(dx) * Math.min(Math.abs(dx), 1.1 * dt); face = dx > 0 ? 1 : -1;
      } else if (!moving) {
        if (eating) {
          eating = false; eatUntil = t + 1300;
          bird.current!.classList.add("is-pecking");
          timer = window.setTimeout(() => seed.current?.classList.remove("is-seed"), 900);
        }
        if (eatUntil && t > eatUntil) { bird.current!.classList.remove("is-pecking"); eatUntil = 0; restUntil = t + rand(4000, 9000); }
        if (!eatUntil && t > restUntil && !paused.current && !document.hidden) pickTarget();
      }
      walker.current!.style.transform = `translateX(${x}px)`;
      bird.current!.style.transform = `scaleX(${face})`;
      bird.current!.classList.toggle("is-hopping", moving && !paused.current);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => { cancelAnimationFrame(raf); clearTimeout(timer); };
  }, [shown, variant]);

  if (!shown) return null;
  return (
    <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-7 overflow-hidden">
      <div ref={seed} className="header-canary-seed" />
      <div ref={walker} className="header-canary-walker">
        <div ref={bird} onClick={togglePause} title="Click to pause me" className="pointer-events-auto cursor-pointer">
          <span className="block">
          <svg className="header-canary-bird" style={{ filter: `drop-shadow(0 0 4px ${c.glow})` }} viewBox="0 0 26 22" width="20" height="17">
            <path d="M4 13 L0.5 11 L1 15.5 Z" fill={c.tail} />
            <ellipse cx="11.5" cy="13.5" rx="7.5" ry="6" fill={c.body} />
            <circle cx="17" cy="8" r="5" fill={c.head} />
            <path d="M6 12.5 Q10 9 13 13.5 Q9 16 6 12.5 Z" fill={c.wing} />
            <path d="M21.6 7.6 L25 8.7 L21.6 9.8 Z" fill={c.beak} />
            <ellipse className="header-canary-eye" cx="18.6" cy="7.3" rx="1.1" ry="1.2" fill="#0f172a" />
            <circle cx="19" cy="6.9" r="0.35" fill="#fff" />
            <circle cx="18.8" cy="10" r="1.2" fill={c.cheek} opacity="0.55" />
            <path d="M16 3.4 Q16.5 1 18 2.2" stroke={c.body} strokeWidth="1.2" fill="none" strokeLinecap="round" />
            <path d="M10 19 L10 21.5 M13 19 L13 21.5" stroke="#f59e0b" strokeWidth="1.1" strokeLinecap="round" />
          </svg>
          </span>
        </div>
      </div>
    </div>
  );
}
