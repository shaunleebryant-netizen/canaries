"use client";

import type { ReactNode } from "react";
import { HowItWorksTitle } from "@/components/ScanHowItWorks";

/** Plain-English guide for MFI Scan (MFI Washout v6.1; idea only, no thresholds). */
function MoneyFlowCalcBody() {
  return (
    <>
      <p>
        MFI Scan lists stocks where the selling looks washed out and money is
        starting to flow back in. It uses the Money Flow Index (MFI), a gauge
        that combines price and trading volume to show whether money has been
        flowing in or out.
      </p>
      <p>
        <span aria-hidden>💵</span>{" "}
        <strong className="text-white">Washout</strong> appears when these
        things line up on the daily chart: the MFI has been deeply oversold, it
        has just hooked back up, a burst of heavy volume has been followed by
        quieter trading, and the stock has had a recent{" "}
        <span aria-hidden>🐟</span> Fish or <span aria-hidden>🙂</span> Smiley
        mark. It fires once per washout, so a stock does not keep reappearing
        while it stays low.
      </p>
      <p>
        The list shows stocks that fired on the latest daily bar. The number
        beside each ticker is its MFI reading that day. It works best alongside
        the other boxes rather than on its own.
      </p>
      <p className="border-l-2 border-canary-amber/70 pl-3 italic text-amber-100/90">
        &ldquo;While peak optimism is hard to catch, peak pessimism is a lot easier.&rdquo;
      </p>
      <p className="text-xs text-slate-400">
        Education only, not buy or sell advice.
      </p>
    </>
  );
}

/** Clickable title that opens the MFI Scan lightbox. */
export function MoneyFlowCalcTitle({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <HowItWorksTitle
      heading="How MFI Scan works"
      subheading="Money flow washouts · daily charts · education only"
      body={<MoneyFlowCalcBody />}
      className={className}
    >
      {children}
    </HowItWorksTitle>
  );
}
