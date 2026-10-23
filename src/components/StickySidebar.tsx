"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

/**
 * "Sticky-bottom" sidebar (desktop). When the column is shorter than the
 * viewport it sticks at the normal top offset. When it is taller, it scrolls
 * with the page until its bottom edge reaches the bottom of the viewport and
 * then holds there (sticky with a negative top), so there is no nested
 * scrollbar and no mid-way stall. Stacked (mobile) layout is unaffected
 * because `sticky` is only applied from the lg breakpoint in CSS.
 */
const GAP = 16; // px, matches the old lg:top-4

export function StickySidebar({
  children,
  className = "",
  theme,
  regime,
}: {
  children: ReactNode;
  className?: string;
  /** Optional DECIDE_THEME hook (draft); omitted = current look. */
  theme?: string;
  /** DECIDE_THEME "R" only: "green" | "amber" | "red" | "neutral". */
  regime?: string;
}) {
  const ref = useRef<HTMLElement>(null);
  const [top, setTop] = useState<number>(GAP);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => {
      const vh = window.innerHeight;
      const h = el.offsetHeight;
      setTop(h + GAP * 2 > vh ? vh - h - GAP : GAP);
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    window.addEventListener("resize", update);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", update);
    };
  }, []);

  return (
    <aside
      ref={ref}
      className={className}
      style={{ top }}
      data-decide-theme={theme}
      data-regime={regime}
    >
      {children}
    </aside>
  );
}
