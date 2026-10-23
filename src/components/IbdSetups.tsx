"use client";

import type { ReactNode } from "react";
import type { IbdSetupAlert } from "@/lib/loadIbdSetupsAlerts";
import { TickerLink } from "@/components/TickerChartLightbox";
import { HowItWorksTitle } from "@/components/ScanHowItWorks";

function IbdSetupsCalcBody() {
  return (
    <>
      <p>
        IBD Setups lists stocks that are in a healthy, established uptrend and
        are among the market&apos;s strongest performers. The idea comes from
        the growth-stock style made popular by Investor&apos;s Business Daily
        (IBD) and by Mark Minervini, a well-known US trader and former US
        Investing Champion.
      </p>
      <p>
        Each day it checks that a stock is trading above its longer-term
        averages (its typical price over recent months), that those averages
        are rising, and that the price is near its yearly high and well off its
        low. It also looks for strong performance compared with the overall
        market. The <strong className="text-white">RS</strong> number beside a
        ticker is our own relative-strength score: higher means it has done
        better than most stocks. It is not the official IBD rating.
      </p>
      <p>
        The box only checks trend and strength. It does not look at chart
        patterns, volume or earnings, so treat it as a list of strong stocks to
        study, not a buy list.
      </p>
      <p className="text-xs text-slate-400">
        Education only, not buy or sell advice.
      </p>
    </>
  );
}

function IbdSetupsCalcTitle({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <HowItWorksTitle
      heading="How IBD Setups works"
      subheading="Strong stocks in steady uptrends · education only"
      body={<IbdSetupsCalcBody />}
      className={className}
    >
      {children}
    </HowItWorksTitle>
  );
}

export function IbdSetups({ alerts }: { alerts: IbdSetupAlert[] }) {
  return (
    <article
      id="ibd-setups"
      className="flex max-h-[min(320px,40vh)] flex-col overflow-hidden rounded-xl border border-canary-gold/25 bg-slate-900/60 p-3 shadow-sm ring-1 ring-canary-gold/10"
    >
      <div className="flex shrink-0 items-baseline justify-between gap-2">
        <h3 className="m-0 shrink-0 whitespace-nowrap">
          <IbdSetupsCalcTitle>IBD Setups</IbdSetupsCalcTitle>
        </h3>
        <p className="text-[10px] uppercase tracking-wide text-slate-500">
          Strong uptrends
        </p>
      </div>

      {alerts.length === 0 ? (
        <p className="mt-2 text-xs leading-relaxed text-slate-400">
          No stocks pass the strong-uptrend check in the latest daily scan.
        </p>
      ) : (
        <ul className="mt-2 min-h-0 flex-1 space-y-0.5 overflow-y-auto pr-0.5">
          {alerts.map((a) => (
            <li
              key={`${a.ticker}-${a.asOf}`}
              className="flex items-center gap-2 rounded-md border border-white/5 bg-slate-950/40 px-2 py-1 text-xs"
            >
              <TickerLink ticker={a.ticker} />
              <span
                className="shrink-0 rounded bg-emerald-500/15 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-300"
                title="Passes the strong-uptrend check"
              >
                {/* Owner 2026-09-29 12:08 AM NZ: label reads STRONG (was SETUP). Display only. */}
                STRONG
              </span>
              <span className="ml-auto truncate tabular-nums text-[10px] text-slate-500">
                {a.rsRating != null ? `RS ${a.rsRating} · ` : ""}
                {a.asOf}
                
              </span>
            </li>
          ))}
        </ul>
      )}
    </article>
  );
}
