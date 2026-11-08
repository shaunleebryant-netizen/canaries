/**
 * Shared education copy for a red Canary Composite Score.
 * Decide bands: red when the composite light is red (S < −0.3).
 * Not a trade instruction — the dashboard's risk guidance only.
 */
export const RED_COMPOSITE_WARNING =
  "Canary Composite Score is red (Risk-Off). New long trades are strongly discouraged in this regime.";

/**
 * Shared education copy for an amber Canary Composite Score.
 * Shown when the pack light is amber. Not a trade instruction — the dashboard's risk guidance only.
 * There is no dismissible popup for amber; the header strip is the whole notice.
 */
export const AMBER_COMPOSITE_WARNING =
  "Canary Composite Score is amber (cautious). Remain cautious. Trade with at most half the account. Education only.";

/** True when the pack light is red, whatever the capitalisation (`red` / `Red`). */
export function isRedCompositeLight(light: unknown): boolean {
  return typeof light === "string" && light.trim().toLowerCase() === "red";
}

/** True when the pack light is amber, whatever the capitalisation (`amber` / `Amber`). */
export function isAmberCompositeLight(light: unknown): boolean {
  return typeof light === "string" && light.trim().toLowerCase() === "amber";
}

/** One dismiss per pack day so the members notice returns on the next red session. */
export function redCompositeNoticeStorageKey(packDay: string): string {
  const day = packDay.trim() || "undated";
  return `canary-red-composite-notice:${day}`;
}
