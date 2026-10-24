/**
 * Canary RelRSI 🙂🐟🥵💀 (DAILY ONLY) — every input of the owner's Pine indicator
 * (reference: data/canary-relrsi-daily.pine, owner 2026-10-02; lookback 500 not 252).
 *
 * This ONE object drives Fish (🙂/🐟), Sweaty (🥵/💀), ETF Watch and Crypto Watch
 * (scripts/scan-fish-v3.mjs → src/lib/canaryTopsBottoms.mjs). Change a value here and
 * the next scan's results change. Daily bars only.
 *
 * PRIVATE: thresholds and lengths must never appear in public copy.
 */
export const CANARY_TOPS_BOTTOMS = Object.freeze({
  rsiLen: 14,
  lookback: 500,
  smileLevel: 10.0,
  fishLevel: 5.5,
  sweatLevel: 90.0,
  skullLevel: 95.0,
  clusterBars: 8,
});

export const CANARY_TOPS_BOTTOMS_VERSION = "canary-relrsi-daily-2026-10-02";
