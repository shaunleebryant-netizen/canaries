"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";

/**
 * Paid members' explainer. The owner video is not in the source archive.
 * This dialog says so. It does not load a substitute video.
 */
export function LearnCanariesButton({
  className = "inline-flex items-center justify-center rounded-xl bg-amber-500 px-3.5 py-2 text-sm font-semibold text-slate-950 transition hover:bg-amber-400",
}: {
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const closeRef = useRef<HTMLButtonElement>(null);
  const titleId = useId();
  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        close();
      }
    };
    document.addEventListener("keydown", onKey);
    queueMicrotask(() => closeRef.current?.focus());
    return () => document.removeEventListener("keydown", onKey);
  }, [open, close]);

  return (
    <>
      <button type="button" className={className} onClick={() => setOpen(true)}>
        Learn about canaries
      </button>
      {open ? (
        <div className="fixed inset-0 z-[70] flex items-end justify-center p-3 sm:items-center" role="presentation">
          <button type="button" aria-label="Close" className="absolute inset-0 bg-black/70" onClick={close} />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            className="relative z-10 w-full max-w-lg rounded-2xl border border-white/15 bg-slate-950 p-5 shadow-2xl"
          >
            <h2 id={titleId} className="text-lg font-semibold text-white">
              Learn about canaries
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-slate-300">
              Video coming soon. This membership includes a walkthrough of the composite score, the regime and vol curve, and how the scanner marks are read. The video file has not been supplied for this preview, so nothing is playing here.
            </p>
            <p className="mt-2 text-xs text-slate-500">Education only. Not financial advice.</p>
            <button
              ref={closeRef}
              type="button"
              onClick={close}
              className="mt-4 rounded-lg bg-white/10 px-3 py-1.5 text-sm text-white hover:bg-white/15"
            >
              Close
            </button>
          </div>
        </div>
      ) : null}
    </>
  );
}
