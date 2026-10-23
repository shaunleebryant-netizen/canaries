/**
 * PRIVATE owner page (/owner/indicators): indicator buyers + TradingView grant tasks (owner 2026-10-14).
 * Gated by Cloudflare Access + JWT in middleware, checked again here. 404 for everyone else.
 */
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ACCESS_JWT_HEADER, verifyAccessJwt } from "@/lib/owner/accessJwt";
import { getMembersDb } from "@/lib/members/db";
import { type BuyerRow, buyerStatus, listBuyers, nzDate, usd } from "@/lib/owner/indicatorBuyers";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const metadata: Metadata = {
  title: "Owner · Indicator buyers",
  robots: { index: false, follow: false, nocache: true },
};

const BADGE: Record<string, string> = {
  pending: "bg-amber-500/20 text-amber-200 ring-amber-400/40",
  granted: "bg-emerald-500/15 text-emerald-200 ring-emerald-400/40",
  refunded: "bg-slate-500/20 text-slate-300 ring-slate-400/30",
};

export default async function OwnerIndicatorsPage({ searchParams }: { searchParams: Promise<{ granted?: string }> }) {
  const h = await headers();
  const verdict = await verifyAccessJwt(h.get(ACCESS_JWT_HEADER));
  if (!verdict.ok) notFound();
  const { granted } = await searchParams;

  let rows: BuyerRow[] = [];
  let dbError = false;
  try {
    rows = await listBuyers(await getMembersDb());
  } catch {
    dbError = true;
  }
  const pending = rows.filter((r) => r.status === "paid").length;
  const revenue = rows.filter((r) => r.status !== "refunded").reduce((a, r) => a + r.price_cents, 0);

  return (
    <div className="mx-auto max-w-6xl space-y-4 px-4 py-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-white">Indicator buyers</h1>
          <p className="text-xs text-slate-400">Owner only · signed in as {verdict.email}</p>
        </div>
        <a
          href="/api/owner/indicators/export"
          className="rounded-lg bg-canary-gold px-3 py-2 text-sm font-semibold text-slate-950 hover:bg-yellow-400"
        >
          Download CSV
        </a>
      </header>
      <div className="grid grid-cols-3 gap-3 text-sm">
        <div className="rounded-xl border border-amber-400/40 bg-amber-500/10 p-3"><p className="text-xs text-amber-200">To grant</p><p className="text-2xl font-semibold text-white">{pending}</p></div>
        <div className="rounded-xl border border-white/10 bg-slate-900/60 p-3"><p className="text-xs text-slate-400">Buyers</p><p className="text-2xl font-semibold text-white">{rows.length}</p></div>
        <div className="rounded-xl border border-white/10 bg-slate-900/60 p-3"><p className="text-xs text-slate-400">Revenue (excl. refunds)</p><p className="text-2xl font-semibold text-white">{usd(revenue)}</p></div>
      </div>
      {granted ? <p className="rounded-lg bg-emerald-500/10 px-3 py-2 text-sm text-emerald-200">Marked order {granted} as granted.</p> : null}
      {dbError ? <p className="text-sm text-red-300">Could not read the members database.</p> : null}
      <p className="text-xs text-slate-400">
        To grant: TradingView → each invite-only script → Manage access → add the username, then click Mark granted.
      </p>
      <div className="overflow-x-auto rounded-xl border border-white/10">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-900 text-xs uppercase tracking-wide text-slate-400">
            <tr>
              <th className="px-3 py-2">Email</th><th className="px-3 py-2">TradingView</th><th className="px-3 py-2">Product</th>
              <th className="px-3 py-2">Paid</th><th className="px-3 py-2 text-right">Amount</th><th className="px-3 py-2">Status</th>
              <th className="px-3 py-2">Granted</th><th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {rows.length === 0 ? (
              <tr><td colSpan={8} className="px-3 py-6 text-center text-slate-500">No paid orders yet.</td></tr>
            ) : (
              rows.map((r) => {
                const st = buyerStatus(r.status);
                return (
                  <tr key={r.order_id} className="text-slate-200">
                    <td className="px-3 py-2">{r.email}</td>
                    <td className="px-3 py-2 font-mono text-canary-gold">{r.tv_username}</td>
                    <td className="px-3 py-2 text-xs text-slate-400">{r.script_name}</td>
                    <td className="px-3 py-2">{nzDate(r.paid_at)}</td>
                    <td className="px-3 py-2 text-right">{usd(r.price_cents)}</td>
                    <td className="px-3 py-2"><span className={`rounded-full px-2 py-0.5 text-xs ring-1 ${BADGE[st] ?? ""}`}>{st}</span></td>
                    <td className="px-3 py-2">{nzDate(r.granted_at)}</td>
                    <td className="px-3 py-2 text-right">
                      {r.status === "paid" ? (
                        <form action="/api/owner/indicators/grant" method="post">
                          <input type="hidden" name="order" value={r.order_id} />
                          <button className="rounded-md bg-emerald-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-emerald-500">Mark granted</button>
                        </form>
                      ) : null}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-slate-500">Dates DD/MM/YYYY (NZ). Amounts in USD.</p>
    </div>
  );
}
