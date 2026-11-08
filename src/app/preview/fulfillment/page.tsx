import { notFound } from "next/navigation";
import { previewTierEnabled } from "@/lib/members/previewTier";
import { readPreviewLedger } from "@/lib/members/previewStore";
import { resolveViewer } from "@/lib/members/previewAccess";

export const dynamic = "force-dynamic";
export const metadata = { title: "Simulated fulfillment", robots: { index: false, follow: false } };

/** Isolated inspector. Not the live D1 ledger and not a production backup. */
export default async function PreviewFulfillmentPage() {
  if (!previewTierEnabled()) notFound();
  const viewer = await resolveViewer();
  if (!viewer.email) notFound();
  const ledger = await readPreviewLedger();
  const mine = {
    checkouts: ledger.checkouts.filter((c) => c.email === viewer.email),
    backup: ledger.backup.filter((b) => b.email === viewer.email),
    entitlement: ledger.entitlements.find((e) => e.email === viewer.email) ?? null,
  };
  return (
    <div className="mx-auto max-w-3xl px-4 py-14">
      <p className="text-xs font-semibold uppercase tracking-widest text-amber-300">Simulated preview inspector</p>
      <h1 className="mt-2 text-3xl font-semibold text-white">Fulfillment record</h1>
      <p className="mt-3 text-sm leading-relaxed text-slate-300">
        This file is local to the preview. It is not the members database and not a production backup.
        Access follows the entitlement line. A pending backup does not mean the backup finished, and it does not block access.
      </p>
      <pre className="mt-6 overflow-x-auto rounded-xl border border-white/10 bg-slate-950 p-4 text-xs text-slate-200">
        {JSON.stringify(mine, null, 2)}
      </pre>
      {mine.backup.filter((b) => b.status === "pending").map((b) => (
        <form key={b.id} action="/api/preview/backup" method="post" className="mt-4">
          <input type="hidden" name="checkoutId" value={b.checkoutId} />
          <button type="submit" className="rounded-xl border border-white/15 px-4 py-2 text-sm text-white">
            Simulate backup sync
          </button>
        </form>
      ))}
    </div>
  );
}
