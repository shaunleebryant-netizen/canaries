"use client";
// Track: "Meditation Impromptu 01" by Kevin MacLeod (incompetech.com), CC BY 4.0. See public/audio/AUDIO-CREDITS.md
import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";

const KEY = "calmingMusic";

export function CalmingMusic() {
  const pathname = usePathname() || "/";
  const ref = useRef<HTMLAudioElement | null>(null);
  const [on, setOn] = useState(false);
  const hidden = pathname.startsWith("/members") || pathname.startsWith("/owner");

  useEffect(() => {
    if (hidden) return;
    const a = new Audio("/audio/calming.mp3");
    a.loop = true;
    a.muted = true;
    a.volume = 0.3;
    a.preload = "none";
    ref.current = a;
    if (sessionStorage.getItem(KEY) === "on") {
      a.muted = false;
      a.play().then(() => setOn(true)).catch(() => setOn(false));
    }
    return () => { a.pause(); ref.current = null; };
  }, [hidden]);

  if (hidden) return null;

  const toggle = () => {
    const a = ref.current;
    if (!a) return;
    if (on) {
      a.muted = true; a.pause(); setOn(false);
      sessionStorage.setItem(KEY, "off");
    } else {
      a.muted = false; a.volume = 0.3;
      a.play().then(() => { setOn(true); sessionStorage.setItem(KEY, "on"); }).catch(() => setOn(false));
    }
  };

  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={on}
      title='"Meditation Impromptu 01" Kevin MacLeod (incompetech.com), CC BY 4.0'
      className={`rounded-lg border px-2.5 py-1 text-sm transition ${on ? "border-canary-gold text-canary-gold" : "border-white/15 text-slate-300 hover:text-canary-gold"}`}
    >
      {on ? "🔊" : "🔇"} Calming music
    </button>
  );
}
