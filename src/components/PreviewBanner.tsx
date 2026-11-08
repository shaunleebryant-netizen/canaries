import stateJson from "../../data/state.json";
import { previewTierEnabled } from "@/lib/members/previewTier";

/** One place for snapshot caveats. Hidden unless the isolated preview flag is on. */
export function PreviewBanner() {
  if (!previewTierEnabled()) return null;
  const day =
    typeof (stateJson as { sessionDate?: string }).sessionDate === "string"
      ? (stateJson as { sessionDate: string }).sessionDate
      : "2026-10-23";
  return (
    <p role="status" className="border-b border-amber-500/40 bg-amber-950 px-4 py-2 text-center text-xs leading-snug text-amber-100">
      Preview. Data as of {day}. This is not the 2026-11-06 live pack.
    </p>
  );
}
