import { notFound, redirect } from "next/navigation";
import { MockPortalActions } from "@/components/account/MockPortalActions";
import { stripeMockEnabled } from "@/lib/members/config";
import { getCurrentUser } from "@/lib/members/session";

export const dynamic = "force-dynamic";
export const metadata = { title: "MOCK billing portal", robots: { index: false } };

/** LOCAL-ONLY stand-in for the Stripe Customer Portal. */
export default async function MockPortalPage() {
  if (!stripeMockEnabled()) notFound();
  const cur = await getCurrentUser();
  if (!cur) redirect("/account/login?next=/account");
  return (
    <div className="mx-auto max-w-md px-4 py-14">
      <div className="mb-6 rounded-xl border-2 border-dashed border-fuchsia-400 bg-fuchsia-500/10 px-4 py-3 text-center text-sm font-bold uppercase tracking-widest text-fuchsia-200">
        MOCK — not the Stripe Customer Portal
      </div>
      <h1 className="text-2xl font-semibold text-white">Manage subscription</h1>
      <p className="mt-2 text-sm text-slate-400">{cur.user.email}</p>
      <MockPortalActions />
    </div>
  );
}
