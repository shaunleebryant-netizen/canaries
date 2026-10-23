"use client";

import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";

/**
 * Box title button + "how it works" dialog (same look/behaviour as the
 * Bearish / IBD Setups popups). Body is passed in as children.
 */
export function HowItWorksDialog({
  open,
  onClose,
  titleId,
  closeRef,
  heading,
  subheading,
  body,
}: {
  open: boolean;
  onClose: () => void;
  titleId: string;
  closeRef: React.RefObject<HTMLButtonElement | null>;
  heading: string;
  subheading?: string;
  body: ReactNode;
}) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key !== "Tab" || !panelRef.current) return;
      const focusable = panelRef.current.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    queueMicrotask(() => closeRef.current?.focus());
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose, closeRef]);

  if (!open || typeof document === "undefined") return null;

  // Portal to <body> so the dialog never inherits box-header styles
  // (whitespace-nowrap, uppercase, tracking, centred text) on mobile.
  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-end justify-center whitespace-normal p-3 text-left font-normal normal-case tracking-normal sm:items-center sm:p-6"
      role="presentation"
    >
      <button
        type="button"
        aria-label="Close dialog"
        className="absolute inset-0 bg-black/70 backdrop-blur-[2px]"
        onClick={onClose}
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative z-10 flex max-h-[min(85dvh,720px)] w-full min-w-0 max-w-lg flex-col overflow-hidden rounded-2xl text-left border border-white/15 bg-slate-950 shadow-2xl ring-1 ring-canary-gold/20"
      >
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-white/10 px-4 py-3 sm:px-5 sm:py-4">
          <div className="min-w-0 flex-1">
            <h2
              id={titleId}
              className="break-words text-base font-semibold leading-snug text-white sm:text-lg"
            >
              {heading}
            </h2>
            {subheading ? (
              <p className="mt-0.5 break-words text-xs text-slate-500">
                {subheading}
              </p>
            ) : null}
          </div>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-lg border border-white/15 px-2.5 py-1 text-sm text-slate-300 hover:bg-white/5 hover:text-white"
          >
            Close
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4 sm:px-5">
          <div className="space-y-3 break-words text-left text-sm leading-relaxed text-slate-300">
            {body}
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

export function HowItWorksTitle({
  children,
  heading,
  subheading,
  body,
  className = "text-sm font-medium text-white",
}: {
  children: ReactNode;
  heading: string;
  subheading?: string;
  body: ReactNode;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const titleId = useId();
  const closeRef = useRef<HTMLButtonElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const onClose = useCallback(() => {
    setOpen(false);
    queueMicrotask(() => triggerRef.current?.focus());
  }, []);

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        aria-expanded={open}
        className={`${className} cursor-pointer border-b border-dotted border-canary-gold/70 hover:border-canary-gold hover:text-canary-gold focus:outline-none focus-visible:ring-2 focus-visible:ring-canary-gold/60`}
        title={heading}
      >
        {children}
        <span
          className="ml-1 text-[10px] font-normal text-canary-gold/80"
          aria-hidden
        >
          ?
        </span>
        <span className="sr-only"> — {heading}</span>
      </button>
      <HowItWorksDialog
        open={open}
        onClose={onClose}
        titleId={titleId}
        closeRef={closeRef}
        heading={heading}
        subheading={subheading}
        body={body}
      />
    </>
  );
}
