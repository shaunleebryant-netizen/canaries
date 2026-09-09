import { NextResponse } from "next/server";
import { loadState } from "@/lib/loadState";
import { toMembersPayload } from "@/lib/composite";

export const dynamic = "force-dynamic";

/** Members: full payload (auth enforced by middleware). */
export async function GET() {
  const state = loadState();
  const payload = toMembersPayload(state);
  return NextResponse.json(payload);
}
