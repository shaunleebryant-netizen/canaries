import { NextResponse } from "next/server";
import { loadState } from "@/lib/loadState";
import { toPublicSnapshot } from "@/lib/composite";

export const dynamic = "force-dynamic";

/** Public: light + S + asOf only — never the full scored table. */
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
    stance: snap.stance,
    fixture: snap.fixture,
    fixtureLabel: snap.fixtureLabel,
    vetoApplied: snap.vetoApplied,
  });
}
