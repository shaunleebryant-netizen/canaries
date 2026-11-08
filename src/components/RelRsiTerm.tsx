"use client";

import { HowItWorksTitle } from "@/components/ScanHowItWorks";

/** Inline "Relative RSI" term on the homepage hero that opens a short explainer in place (owner 2026-11-01). */
export function RelRsiTerm({ children = "Relative RSI" }: { children?: string }) {
  return (
    <HowItWorksTitle
      heading="What is RelRSI?"
      subheading="Relative RSI · education only"
      className="inline"
      body={
        <>
          <p>
            RSI (Relative Strength Index) is a 0 to 100 gauge of recent up
            versus down price pressure, measured over 14 days.
          </p>
          <p>
            RelRSI ranks today&apos;s RSI against that same stock&apos;s own RSI
            history over the last ~500 sessions, as a percentile from 0 to 100.
            Low means today&apos;s RSI is weak compared with its own past; high
            means strong. It does not compare the stock with the market.
          </p>
          <p className="text-xs text-slate-400">Education only, not buy or sell advice.</p>
        </>
      }
    >
      {children}
    </HowItWorksTitle>
  );
}
