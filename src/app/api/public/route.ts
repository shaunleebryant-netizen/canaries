import { NextResponse } from "next/server";
import { loadState } from "@/lib/loadState";
import { toPublicSnapshot } from "@/lib/composite";

export const dynamic = "force-dynamic";

/**
 * Public paywall surface: pulsing light sneak peek + optional S / asOf.
 * Never returns per-canary metrics, holdings, adds/trims, or veto internals.
 */
export async function GET() {
  const state = loadState();
  const snap = toPublicSnapshot(
    state.canaries,
    state.asOf,
    state.fixture,
    state.fixtureLabel
  );
  return NextResponse.json({
    light: snap.light,
    S: snap.S,
    asOf: snap.asOf,
    // Stance is a light label only — not paywalled depth
    stance: snap.stance,
    fixture: snap.fixture,
    fixtureLabel: snap.fixtureLabel,
  });
}
