/**
 * Bottom Zone 🧚 — WVF extreme + RSI(14) was under 35 + bullish close (owner pt801u Pine). Sub Scanner box + ★ timing print.
 * Written by scripts/scan-cci-fairy.mjs. Education only. Never invent rows.
 */
import json from "../../data/cci-fairy.json";
import { timingDecision } from "@/lib/compositeGate";
import { loadCompositeArchive } from "@/lib/loadCompositeArchive";

export interface FairyRow { ticker: string; name?: string | null; asOf: string; close: number; wvf: number; wvfUpper: number; rsiMin3: number; rsiNow: number; sessionsAgo: number }
type File = { asOf?: string | null; signals?: FairyRow[] };
const ok = (r: unknown): r is FairyRow => !!r && typeof (r as FairyRow).ticker === "string" && typeof (r as FairyRow).asOf === "string";

export function loadCciFairy(): { asOf: string | null; signals: FairyRow[] } {
  const f = json as unknown as File;
  const archive = loadCompositeArchive();
  return {
    asOf: f?.asOf ?? null,
    signals: (f?.signals ?? []).filter(ok).filter((r) => timingDecision("fairy", r.asOf.slice(0, 10), archive) === "eligible"),
  };
}
