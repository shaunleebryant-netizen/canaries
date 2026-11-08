"use client";

import type { ReactNode } from "react";

/** Clickable section title. The explainer is the disclosure; paid members only. */
export function ExplainTitle({
  title,
  enabled,
  children,
  className = "text-[10px] font-semibold uppercase tracking-widest text-canary-gold",
}: {
  title: string;
  enabled: boolean;
  children: ReactNode;
  className?: string;
}) {
  if (!enabled) {
    return <h2 className={className}>{title}</h2>;
  }
  return (
    <details className="group">
      <summary className={`cursor-pointer list-none marker:content-none [&::-webkit-details-marker]:hidden ${className}`}>
        <h2 className="inline">{title}</h2>
        <span className="ml-1 font-normal normal-case tracking-normal text-slate-500 group-open:hidden">Explain</span>
      </summary>
      <div className="mt-2 text-left text-[11px] font-normal normal-case leading-relaxed tracking-normal text-slate-400">
        {children}
      </div>
    </details>
  );
}
