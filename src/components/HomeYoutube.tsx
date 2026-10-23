"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";

/**
 * Hero YouTube slot (owner 2026-10-05: https://youtu.be/oC98JV17hYU).
 * Thumbnail + play button only in the hero; click opens a large lightbox with
 * the youtube-nocookie embed. Override ID with NEXT_PUBLIC_HOME_YOUTUBE_ID.
 * Amber accents only; no duration or returns claims.
 */
const DEFAULT_ID = "oC98JV17hYU";

export function HomeYoutube({ className = "" }: { className?: string }) {
  const id = (process.env.NEXT_PUBLIC_HOME_YOUTUBE_ID || DEFAULT_ID).trim();
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const titleId = useId();

  useEffect(() => setMounted(true), []);

  const close = useCallback(() => {
    setOpen(false);
    // Restore focus to the play button after the dialog unmounts.
    requestAnimationFrame(() => triggerRef.current?.focus());
  }, []);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        close();
      }
    };
    document.addEventListener("keydown", onKey);
    // Focus the close button once the dialog is in the DOM.
    requestAnimationFrame(() => closeRef.current?.focus());
    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener("keydown", onKey);
    };
  }, [open, close]);

  if (!id) {
    return (
      <div
        className={`overflow-hidden rounded-2xl border border-white/10 bg-slate-950 shadow-lg ${className}`}
      >
        <div className="relative grid aspect-video place-items-center bg-gradient-to-br from-slate-800 via-slate-900 to-slate-950">
          <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-canary-gold text-2xl text-slate-950 shadow-[0_0_0_10px_rgba(234,179,8,0.18)]">
            ▶
          </div>
        </div>
      </div>
    );
  }

  const thumb = `https://i.ytimg.com/vi/${encodeURIComponent(id)}/hqdefault.jpg`;
  const src = `https://www.youtube-nocookie.com/embed/${encodeURIComponent(id)}?rel=0&autoplay=1`;

  return (
    <>
      <div
        className={`overflow-hidden rounded-2xl border border-white/10 bg-slate-950 shadow-lg ${className}`}
      >
        <div className="relative aspect-video bg-black">
          <button
            ref={triggerRef}
            type="button"
            onClick={() => setOpen(true)}
            className="group absolute inset-0 block h-full w-full cursor-pointer"
            aria-label="Play video"
            aria-haspopup="dialog"
          >
            {/* eslint-disable-next-line @next/next/no-img-element -- external YouTube thumbnail */}
            <img
              src={thumb}
              alt=""
              width={480}
              height={360}
              loading="lazy"
              decoding="async"
              className="absolute inset-0 h-full w-full object-cover"
            />
            <span className="absolute inset-0 bg-slate-950/35 transition group-hover:bg-slate-950/20" />
            <span className="absolute inset-0 grid place-items-center">
              <span className="grid h-16 w-16 place-items-center rounded-full bg-canary-gold text-2xl text-slate-950 shadow-[0_0_0_10px_rgba(234,179,8,0.18)] transition group-hover:scale-105">
                ▶
              </span>
            </span>
          </button>
        </div>
      </div>

      {mounted && open
        ? createPortal(
            <div
              className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-3 sm:p-6"
              onClick={close}
              role="presentation"
            >
              <div
                role="dialog"
                aria-modal="true"
                aria-labelledby={titleId}
                className="relative w-full max-w-[min(92vw,1280px)]"
                style={{ maxHeight: "min(90vh, calc(92vw * 9 / 16 + 3rem))" }}
                onClick={(e) => e.stopPropagation()}
              >
                <h2 id={titleId} className="sr-only">
                  Canary Dashboard walkthrough video
                </h2>
                <button
                  ref={closeRef}
                  type="button"
                  onClick={close}
                  aria-label="Close video"
                  className="absolute -top-11 right-0 grid h-10 w-10 place-items-center rounded-full border border-canary-gold/50 bg-slate-950/80 text-xl leading-none text-canary-gold hover:bg-canary-gold/15 sm:-top-12"
                >
                  ×
                </button>
                <div className="overflow-hidden rounded-2xl border border-white/10 bg-black shadow-2xl">
                  <div className="relative aspect-video w-full max-h-[min(82vh,calc(92vw*9/16))]">
                    <iframe
                      className="absolute inset-0 h-full w-full"
                      src={src}
                      title="Canary Dashboard walkthrough video"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                      allowFullScreen
                      referrerPolicy="strict-origin-when-cross-origin"
                    />
                  </div>
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
