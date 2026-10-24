/**
 * Bearish Setups (Main Scanner).
 * Tickers with ≥2 distinct bearish conditions across the Sub Scanners:
 * (🍒 MFI ≥80 retired 2026-10-06) · 🥵 Sweaty · 💀 Skull — prints within 14 calendar days of the
 * pack as-of; 🔴 weekly bear (red, counted once). Logic: setupsCore.mjs.
 */

import type {
  BearishConditionId,
  MainScannerSetup,
} from "@/lib/setupsCore.mjs";
export {
  SETUPS_MIN_CONDITIONS,
  SETUPS_WINDOW_DAYS,
} from "@/lib/setupsCore.mjs";

export type BearishSetup = MainScannerSetup<BearishConditionId>;
