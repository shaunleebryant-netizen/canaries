"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { BookingForm, type BookingType } from "@/components/BookingForm";

/**
 * Members "Book a class" button (owner approved 2026-10-09, t595u): opens the Bookings form in a
 * modal with the given type preselected. Same accessible-modal pattern as TickerUniverseButton.
 */
export function BookingModalButton({
  label = "Book a class",
  initialType = "class",
  className = "inline-flex items-center justify-center rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-semibold text-slate-950 hover:bg-amber-400",
}: {
  label?: string;
  initialType?: BookingType;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const titleId = useId();

  useEffect(() => setMounted(true), []);

  const close = useCallback(() => {
    setOpen(false);
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
    requestAnimationFrame(() => closeRef.current?.focus());
    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener("keydown", onKey);
    };
  }, [open, close]);

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        className={className}
      >
        {label}
      </button>
      {mounted && open
        ? createPortal(
            <div
              className="fixed inset-0 z-[100] flex items-center justify-center bg-black/85 p-3 sm:p-6"
              onClick={close}
              role="presentation"
            >
              <div
                role="dialog"
                aria-modal="true"
                aria-labelledby={titleId}
                className="relative flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-white/10 bg-slate-950 shadow-2xl"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex shrink-0 items-start justify-between gap-4 border-b border-white/10 px-5 py-4">
                  <div>
                    <h2 id={titleId} className="text-lg font-semibold text-white">
                      Bookings
                    </h2>
                    <p className="mt-0.5 text-xs text-slate-400">
                      A 1-to-1 class with Shaun, or a speaking request for your event.
                    </p>
                  </div>
                  <button
                    ref={closeRef}
                    type="button"
                    onClick={close}
                    aria-label="Close"
                    className="rounded-lg px-2 py-1 text-lg leading-none text-slate-400 hover:bg-white/5 hover:text-white"
                  >
                    ×
                  </button>
                </div>
                <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
                  <BookingForm initialType={initialType} origin="members" />
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
