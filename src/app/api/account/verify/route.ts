import { NextResponse } from "next/server";
import { getMembersDb } from "@/lib/members/db";
import { accountsOr404 } from "@/lib/members/guard";
import { jsonError, readBody, safeNext } from "@/lib/members/http";
import { consumeEmailVerification } from "@/lib/members/verify";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const off = accountsOr404();
  if (off) return off;
  const b = await readBody(request);
  const db = await getMembersDb();
  const result = await consumeEmailVerification(db, b.token || "", request);
  if (!result.ok) return jsonError("Verify link is invalid or expired.", 400);

  const next = safeNext(b.next, "/account");
  return NextResponse.json({ ok: true, next, already: Boolean(result.already) });
}
