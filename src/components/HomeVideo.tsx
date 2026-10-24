"use client";

import { useRef, useState, type MouseEvent } from "react";

/**
 * Hero video slot (owner 2026-10-06): self-hosted walkthrough, no YouTube.
 * Native <video> with poster + amber play overlay; click plays inline, then native controls.
 * Files: public/home/video/canary-v1.2-720p.mp4 and its poster JPG.
 * (Replaces HomeYoutube in the hero; HomeYoutube.tsx is kept but no longer rendered.)
 */
// Served via the range-capable /media route (Workers static assets ignore Range).
export const HOME_VIDEO_SRC = "/media/canary-v1.2-720p.mp4";
export const HOME_VIDEO_POSTER = "/home/video/canary-v1.2-poster.jpg";

export function HomeVideo({ className = "" }: { className?: string }) {
  const ref = useRef<HTMLVideoElement>(null);
  const [started, setStarted] = useState(false);

  // Owner 2026-10-06: no download only (no save-as menu, no download button); PiP, speed and casting allowed.
  const blockMenu = (e: MouseEvent) => e.preventDefault();

  const play = () => {
    setStarted(true);
    const v = ref.current;
    if (v) void v.play().catch(() => {});
  };

  return (
    <div
      className={`overflow-hidden rounded-2xl border border-white/10 bg-slate-950 shadow-lg ${className}`}
      onContextMenu={blockMenu}
    >
      <div className="relative aspect-video bg-black" onContextMenu={blockMenu}>
        <video
          ref={ref}
          className="absolute inset-0 h-full w-full"
          src={HOME_VIDEO_SRC}
          poster={HOME_VIDEO_POSTER}
          preload="metadata"
          controls={started}
          playsInline
          controlsList="nodownload"
          onContextMenu={blockMenu}
          title="Canary Dashboard walkthrough video"
          aria-label="Canary Dashboard walkthrough video"
          onPlay={() => setStarted(true)}
        />
        {started ? null : (
          <button
            type="button"
            onClick={play}
            className="group absolute inset-0 block h-full w-full cursor-pointer"
            aria-label="Play video"
          >
            <span className="absolute inset-0 bg-slate-950/35 transition group-hover:bg-slate-950/20" />
            <span className="absolute inset-0 grid place-items-center">
              <span className="grid h-16 w-16 place-items-center rounded-full bg-canary-gold text-2xl text-slate-950 shadow-[0_0_0_10px_rgba(234,179,8,0.18)] transition group-hover:scale-105">
                ▶
              </span>
            </span>
          </button>
        )}
      </div>
    </div>
  );
}
