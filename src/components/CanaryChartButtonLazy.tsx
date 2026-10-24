"use client";

/**
 * Lazy wrapper so the canary chart button + pop-up code (preview, flag MEMBERS_CANARY_CHARTS, default
 * OFF) stays out of the /members first-load bundle. Only fetched when the flag is on and the table renders.
 */
import dynamic from "next/dynamic";

export const CanaryChartButtonLazy = dynamic(() => import("./CanaryChartButton").then((m) => m.CanaryChartButton), {
  ssr: false,
  loading: () => <span className="mt-1 inline-block h-[18px] w-[46px]" aria-hidden />,
});
