/**
 * MFI Washout v6.1 — PREVIEW port (owner t576u 2026-10-07). NOT wired into any scanner; the owner
 * checks the Pine on TradingView first (/home/box/canaries/pine/mfi-washout-v6.1.pine).
 *
 * = v6 signal (scripts/lib/mfi-washout-v6.mjs, unchanged arming incl. the relative-low path; a v6
 *   signal disarms even if a gate blocks the print) AND two gates, both default ON:
 *   depth   : lowest finite MFI over bars [i - osLookback, i] (osLookback + 1 bars) < washDepth (25)
 *   confirm : a plotted 🐟 or 🙂 (Canary RelRSI port, same-side cluster rule) within
 *             [i - confirmBars, i] (confirmBars 5, current bar included)
 * Switch both gates off → identical to v6. PRIVATE: thresholds never in public copy.
 */
import { mfiWashoutV6, MFI_WASHOUT_V6_DEFAULTS } from "./mfi-washout-v6.mjs";
import { runCanaryTopsBottoms } from "../../src/lib/canaryTopsBottoms.mjs";
import { CANARY_TOPS_BOTTOMS } from "../../src/lib/canaryTopsBottomsConfig.mjs";

export const MFI_WASHOUT_V61_DEFAULTS = Object.freeze({
  ...MFI_WASHOUT_V6_DEFAULTS,
  useDepth: true,
  washDepth: 25,
  useConfirm: true,
  confirmBars: 5,
  relRsi: CANARY_TOPS_BOTTOMS, // rsiLen 14, lookback 500, smile 10, fish 5.5, cluster 8
});

export function mfiWashoutV61(bars, opts = {}) {
  const P = { ...MFI_WASHOUT_V61_DEFAULTS, ...opts };
  const n = bars.length;
  const v6 = mfiWashoutV6(bars, P);
  const { mfi } = v6;

  // Plotted 🐟/🙂 bars (bottom side only; cluster rule inside the port).
  const fsBar = new Array(n).fill(false);
  if (P.useConfirm) {
    const { events } = runCanaryTopsBottoms(bars, P.relRsi);
    for (const e of events) if (e.kind === "fish" || e.kind === "smile") fsBar[e.i] = true;
  }

  const bottomSignal = new Array(n).fill(false);
  let lastFs = null; // Pine ta.barssince(plotSmile or plotFish)
  for (let i = 0; i < n; i++) {
    if (fsBar[i]) lastFs = i;
    if (!v6.bottomSignal[i]) continue;
    let depthOk = true;
    if (P.useDepth) {
      let lo = Infinity;
      for (let k = Math.max(0, i - P.osLookback); k <= i; k++) if (Number.isFinite(mfi[k]) && mfi[k] < lo) lo = mfi[k];
      depthOk = lo < P.washDepth;
    }
    const fsOk = !P.useConfirm || (lastFs != null && i - lastFs <= P.confirmBars);
    bottomSignal[i] = depthOk && fsOk;
  }
  return { ...v6, v6Signal: v6.bottomSignal, bottomSignal, fishSmile: fsBar };
}
