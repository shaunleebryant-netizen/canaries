import { NextResponse } from "next/server";
import { memberApiGuard } from "@/lib/members/guard";
import { loadState } from "@/lib/loadState";
import { toMembersPayload } from "@/lib/composite";

export const dynamic = "force-dynamic";

/** Members: full payload (auth enforced by middleware). */
export async function GET() {
  const denied = await memberApiGuard(); // null unless MEMBERS_AUTH_MODE=accounts
  if (denied) return denied;
  const state = loadState();
  const payload = toMembersPayload(state);
  return NextResponse.json(payload);
}
