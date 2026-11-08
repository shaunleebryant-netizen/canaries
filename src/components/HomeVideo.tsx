"use client";

import { useRef, useState, type MouseEvent } from "react";
import { SubscribeInlineForm } from "@/components/SubscribeLightbox";

/**
 * Hero video slot (owner 2026-10-06): self-hosted walkthrough, no YouTube.
 * Native <video> with poster + amber play overlay; click plays inline, then native controls.
 * Files: public/home/video/canary-v1.2-720p.mp4 and its poster JPG.
 * (Replaces HomeYoutube in the hero; HomeYoutube.tsx is kept but no longer rendered.)
 */
// Served via the range-capable /media route (Workers static assets ignore Range).
export const HOME_VIDEO_SRC = "/media/canary-v1.2-720p.mp4";
export const HOME_VIDEO_POSTER = "/home/video/canary-v1.2-poster.jpg";

/**
 * Owner 2026-11-02 (t935u): video hidden while it is re-recorded; a founding
 * subscribe box shows in the same hero slot. Set to true to bring the video back.
 */
export const HOME_VIDEO_ENABLED = false;

export function HomeVideo({ className = "" }: { className?: string }) {
  if (!HOME_VIDEO_ENABLED) return <HomeFoundingBox className={className} />;
  return <HomeVideoPlayer className={className} />;
}

/**
 * Owner 2026-11-02 (t975u): Subscribe box moved out of the hero to its own homepage
 * section below Recent examples. Inline topic checkboxes + email/Subscribe row.
 */
export function HomeSubscribeBox({ className = "" }: { className?: string }) {
  return (
    <div
      className={`flex w-full min-w-0 max-w-full flex-col justify-center rounded-2xl border border-canary-gold/40 bg-slate-950 p-5 shadow-lg sm:p-8 ${className}`}
    >
      <p className="text-xs font-semibold uppercase tracking-wider text-canary-gold">
        Subscribe
      </p>
      <h2 className="mt-2 text-2xl font-bold text-white">Get the weekly setups in your inbox</h2>
      <p className="mt-3 text-sm text-slate-300">
        What would you like to hear about?
      </p>
      <SubscribeInlineForm />
      <p className="mt-3 text-xs text-slate-500">Unsubscribe any time. Not financial advice.</p>
    </div>
  );
}

/** Owner 2026-11-02 (t975u): founding pricing box restored in the hero slot. */
function HomeFoundingBox({ className = "" }: { className?: string }) {
  return (
    <div
      className={`flex flex-col justify-center rounded-2xl border border-canary-gold/40 bg-slate-950 p-6 shadow-lg sm:p-8 ${className}`}
    >
      <p className="text-xs font-semibold uppercase tracking-wider text-canary-gold">
        Founding membership · first 100 members
      </p>
      <h2 className="mt-2 text-2xl font-bold text-white">Join as a founding member</h2>
      <div className="mt-5">
        <div className="rounded-xl border border-canary-gold/50 bg-gradient-to-b from-amber-500/15 to-slate-950 p-4 ring-1 ring-canary-gold/25">
          <p className="text-4xl font-bold tracking-tight text-white">
            US$35<span className="text-lg font-semibold text-slate-300">/mo</span>
          </p>
          <p className="mt-1 text-sm text-slate-300">billed annually (US$420/yr)</p>
        </div>
        <p className="mt-3 px-1 text-sm font-medium text-slate-400">
          US$70<span className="text-xs font-normal text-slate-500">/mo</span>
          <span className="ml-2 text-xs font-normal text-slate-500">billed monthly</span>
        </p>
      </div>
      <p className="mt-4 text-sm text-slate-300">
        Founding rate locked for life while you renew. After the first 100: US$99/mo or
        US$1,069/yr.
      </p>
      <a
        href="/account/signup"
        className="mt-5 block rounded-xl bg-canary-gold px-6 py-3 text-center text-sm font-semibold text-slate-950 hover:bg-yellow-400"
      >
        Create a free account
      </a>
      <p className="mt-2 text-center text-sm text-slate-300">Limited free access</p>
      <a href="/signup" className="mt-2 block text-center text-sm text-slate-300 underline">
        Founding annual · US$35/mo, billed annually US$420/yr
      </a>
      <p className="mt-3 text-xs text-slate-500">Educational market data only. Not financial advice.</p>
    </div>
  );
}

function HomeVideoPlayer({ className = "" }: { className?: string }) {
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
