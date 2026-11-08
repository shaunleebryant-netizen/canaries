"use client";

import { HowItWorksTitle } from "@/components/ScanHowItWorks";

/** Inline "canaries" term on the homepage that opens a short explainer (owner 2026-10-27). */
export function CanariesTerm({ children = "canaries" }: { children?: string }) {
  return (
    <HowItWorksTitle
      heading="What are the canaries?"
      subheading="Market Composite · education only"
      className="inline"
      body={
        <>
          <p>
            The canaries are 13 macroeconomic and market measures we track
            after every US trading day.
          </p>
          <p>
            Each one is scored and weighted, then they are combined into a
            single Market Composite score. That score sets the green, amber or
            red light for US market health.
          </p>
          <p className="text-xs text-slate-400">Education only, not buy or sell advice.</p>
        </>
      }
    >
      {children}
    </HowItWorksTitle>
  );
}
