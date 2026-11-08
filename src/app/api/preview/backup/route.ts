import { NextResponse } from "next/server";
import { readBody } from "@/lib/members/http";
import { resolveViewer } from "@/lib/members/previewAccess";
import { markBackupSynced } from "@/lib/members/previewFulfillment";
import { readPreviewLedger, writePreviewLedger } from "@/lib/members/previewStore";
import { previewRedirect } from "@/lib/members/previewRedirect";
import { previewTierEnabled } from "@/lib/members/previewTier";

export const dynamic = "force-dynamic";

/** Marks the simulated backup outbox synced. Does not change entitlement and does not touch production. */
export async function POST(request: Request) {
  if (!previewTierEnabled()) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const viewer = await resolveViewer();
  if (!viewer.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await readBody(request);
  const ledger = await readPreviewLedger();
  const item = ledger.backup.find((b) => b.checkoutId === body.checkoutId && b.email === viewer.email);
  if (!item) return NextResponse.json({ error: "No simulated backup" }, { status: 404 });
  await writePreviewLedger(markBackupSynced(ledger, item.checkoutId));
  const form = (request.headers.get("content-type") || "").includes("application/x-www-form-urlencoded")
    || (request.headers.get("content-type") || "").includes("multipart/form-data");
  if (form) return previewRedirect(request, "/preview/fulfillment");
  return NextResponse.json({ ok: true, simulated: true, backupStatus: "synced" });
}
