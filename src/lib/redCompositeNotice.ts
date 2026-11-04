/**
 * Shared education copy for a red Canary Composite Score.
 * Decide bands: red when the composite light is red (S < −0.3).
 * Not a trade instruction — the dashboard's risk guidance only.
 */
export const RED_COMPOSITE_WARNING =
  "Canary Composite Score is red (Risk-Off). New long entries are outside this dashboard's risk guidance. Education only.";

/** True when the pack light is red, whatever the capitalisation (`red` / `Red`). */
export function isRedCompositeLight(light: unknown): boolean {
  return typeof light === "string" && light.trim().toLowerCase() === "red";
}

/** One dismiss per pack day so the members notice returns on the next red session. */
export function redCompositeNoticeStorageKey(packDay: string): string {
  const day = packDay.trim() || "undated";
  return `canary-red-composite-notice:${day}`;
}
