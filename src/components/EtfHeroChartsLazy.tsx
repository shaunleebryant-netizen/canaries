"use client";

import dynamic from "next/dynamic";

/** Own chunk for the ETF tab 1Y charts; loads only when the ETFs tab renders. */
export const EtfHeroChartsLazy = dynamic(() => import("@/components/EtfHeroCharts").then((m) => m.EtfHeroCharts), {
  ssr: false,
  loading: () => <div className="h-[340px] rounded-xl border border-white/10 bg-slate-900/40" aria-hidden />,
});
