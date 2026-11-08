import Link from "next/link";
import { notFound } from "next/navigation";
import { PLANS } from "@/lib/members/plans";
import { previewTierEnabled } from "@/lib/members/previewTier";
import { readPreviewLedger } from "@/lib/members/previewStore";
import { resolveViewer } from "@/lib/members/previewAccess";
import { StatusClient } from "./StatusClient";

export const dynamic = "force-dynamic";
export const metadata = { title: "Simulated checkout", robots: { index: false, follow: false } };

export default async function PreviewCheckoutStatus({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  if (!previewTierEnabled()) notFound();
  const id = String((await searchParams)?.id ?? "");
  const ledger = await readPreviewLedger();
  const viewer = await resolveViewer();
  const checkout = ledger.checkouts.find((c) => c.id === id && c.email === viewer.email);
  if (!checkout) notFound();
  const plan = PLANS[checkout.plan];
  return (
    <div className="mx-auto max-w-lg px-4 py-14">
      <p className="text-xs font-semibold uppercase tracking-widest text-amber-300">Simulated preview</p>
      <h1 className="mt-2 text-3xl font-semibold text-white">Upgrade to paid membership</h1>
      <p className="mt-3 text-sm leading-relaxed text-slate-300">
        This is a Canary checkout handoff for the preview. Stripe is not contacted, and no card is collected.
        Returning to a tab with a success address does not unlock it.
      </p>
      <div className="mt-6 rounded-2xl border border-canary-gold/40 bg-slate-950 p-5">
        <p className="text-sm font-semibold text-white">{plan.label}</p>
        <p className="mt-1 text-2xl font-semibold text-white">{checkout.plan === "launch_annual" ? "US$35/mo" : plan.display}</p>
        <p className="mt-1 text-sm text-slate-400">
          {checkout.plan === "launch_annual" ? "Billed annually · US$420/yr" : plan.sub}
        </p>
        <p className="mt-2 text-xs text-slate-500">Status: {checkout.status}. Simulated record {checkout.id}.</p>
      </div>
      <StatusClient checkoutId={checkout.id} returnTab={checkout.returnTab} />
      <p className="mt-8 text-sm">
        <Link href="/preview/fulfillment" className="text-slate-300 underline">
          Simulated fulfillment inspector
        </Link>
      </p>
    </div>
  );
}
