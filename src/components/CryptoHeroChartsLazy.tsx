"use client";

import dynamic from "next/dynamic";

/** Own chunk for the Crypto tab hero charts (flag MEMBERS_CRYPTO_HERO_CHARTS); /members first load unchanged. */
export const CryptoHeroChartsLazy = dynamic(() => import("@/components/CryptoHeroCharts").then((m) => m.CryptoHeroCharts), {
  ssr: false,
  loading: () => <div className="h-[340px] rounded-xl border border-white/10 bg-slate-900/40" aria-hidden />,
});
