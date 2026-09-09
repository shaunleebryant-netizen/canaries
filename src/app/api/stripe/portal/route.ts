import { NextResponse } from "next/server";
import { stripeConfigured } from "@/lib/auth";

export const dynamic = "force-dynamic";

/** Customer Portal stub — no live Stripe calls. */
export async function POST() {
  if (!stripeConfigured()) {
    return NextResponse.json({
      ok: false,
      stub: true,
      message: "Stripe keys missing — portal stub (no-op).",
    });
  }
  return NextResponse.json({
    ok: false,
    stub: true,
    message: "Scaffold only — Customer Portal not wired. No live charges.",
  });
}
