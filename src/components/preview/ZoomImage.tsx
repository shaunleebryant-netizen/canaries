"use client";
/* eslint-disable @next/next/no-img-element */
import { useEffect, useState } from "react";

/** Click-to-zoom image for homepage Tools cards (owner t898u). */
export function ZoomImage({ src, alt }: { src: string; alt: string }) {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { window.removeEventListener("keydown", onKey); document.body.style.overflow = prev; };
  }, [open]);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} aria-label={`Enlarge: ${alt}`}
        className="flex h-full w-full cursor-zoom-in items-center justify-center">
        <img src={src} alt={alt} loading="lazy" className="max-h-full w-auto max-w-full rounded-lg object-contain transition hover:opacity-90" />
      </button>
      {open && (
        <div role="dialog" aria-modal="true" aria-label={alt} onClick={() => setOpen(false)}
          className="fixed inset-0 z-[100] flex cursor-zoom-out items-center justify-center bg-black/85 p-4 backdrop-blur-sm">
          <button type="button" onClick={() => setOpen(false)} aria-label="Close"
            className="absolute right-4 top-4 rounded-full bg-white/10 px-3 py-1 text-lg text-white hover:bg-white/20">✕</button>
          <img src={src} alt={alt} className="max-h-[92vh] max-w-[95vw] rounded-lg object-contain shadow-2xl" />
        </div>
      )}
    </>
  );
}
