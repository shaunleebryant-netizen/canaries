"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  isRedCompositeLight,
  RED_COMPOSITE_WARNING,
  redCompositeNoticeStorageKey,
} from "@/lib/redCompositeNotice";

/**
 * Members-only notice when the pack composite light is red.
 * Close (or Escape) dismisses it for this pack day; the next red session shows it again.
 * Backdrop click does not dismiss — Close is the way out.
 */
export function RedCompositeNotice({
  light,
  packDay,
}: {
  light: string | null | undefined;
  /** Composite session day (state.sessionDate / asOf). */
  packDay: string;
}) {
  const red = isRedCompositeLight(light);
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);
  const closeRef = useRef<HTMLButtonElement>(null);
  const titleId = useId();
  const bodyId = useId();
  const storageKey = redCompositeNoticeStorageKey(packDay);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!red) return;
    try {
      if (window.localStorage.getItem(storageKey) === "1") return;
    } catch {
      // Storage blocked: still show the notice. Dismiss just closes it this view.
    }
    setOpen(true);
  }, [red, storageKey]);

  const dismiss = useCallback(() => {
    try {
      window.localStorage.setItem(storageKey, "1");
    } catch {
      // Ignore. The dialog still closes.
    }
    setOpen(false);
  }, [storageKey]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        dismiss();
      }
    };
    document.addEventListener("keydown", onKey);
    requestAnimationFrame(() => closeRef.current?.focus());
    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener("keydown", onKey);
    };
  }, [open, dismiss]);

  if (!mounted || !open) return null;

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/85 p-3 sm:p-6" role="presentation">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={bodyId}
        className="relative w-full max-w-lg rounded-2xl border border-rose-500/40 bg-slate-950 p-6 shadow-2xl"
      >
        <h2 id={titleId} className="text-lg font-semibold text-rose-100">
          Canary Composite Score is red
        </h2>
        <p id={bodyId} className="mt-3 text-sm leading-relaxed text-slate-200">
          {RED_COMPOSITE_WARNING}
        </p>
        <div className="mt-6 flex justify-end">
          <button
            ref={closeRef}
            type="button"
            onClick={dismiss}
            className="rounded-lg bg-rose-600 px-5 py-2 text-sm font-semibold text-white hover:bg-rose-500"
          >
            Close
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
