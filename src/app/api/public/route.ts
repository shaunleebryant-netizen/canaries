import { NextResponse } from "next/server";
import { loadState } from "@/lib/loadState";
import { toPublicSnapshot } from "@/lib/composite";

export const dynamic = "force-dynamic";

/**
 * Public paywall surface: pulsing light sneak peek + optional S / asOf.
 * Never returns per-canary metrics, holdings, adds/trims, veto internals,
 * packMark, renormalization, or the weightage table.
 */
export async function GET() {
  const state = loadState();
  const snap = toPublicSnapshot(state);
  // Intentionally minimal — no depth leak beyond light + optional S/asOf (+ stance label).
  return NextResponse.json({
    light: snap.light,
    S: snap.S,
    asOf: snap.asOf,
    stance: snap.stance,
    fixture: snap.fixture,
  });
}
