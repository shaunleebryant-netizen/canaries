/**
 * PRIVATE owner page (/owner) — Options Scanner (Cboe delayed data, personal use only).
 * Gated by Cloudflare Access + JWT check in src/middleware.ts, and checked again here.
 * Anything else gets 404. noindex/nofollow. Not linked from any public or member page.
 */
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ACCESS_JWT_HEADER, verifyAccessJwt } from "@/lib/owner/accessJwt";
import { loadOwnerOptionsScan } from "@/lib/owner/optionsScan";
import { OwnerOptionsScanner } from "@/components/owner/OwnerOptionsScanner";
import { TickerChartProvider } from "@/components/TickerChartLightbox";
import { loadOwnerXRumoursAudit } from "@/lib/owner/xRumoursAudit";
import { OwnerXRumoursAudit } from "@/components/owner/OwnerXRumoursAudit";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: "Owner · Options",
  robots: { index: false, follow: false, nocache: true, googleBot: { index: false, follow: false } },
  alternates: { canonical: null },
  openGraph: null,
  twitter: null,
};

export default async function OwnerOptionsPage() {
  const h = await headers();
  const verdict = await verifyAccessJwt(h.get(ACCESS_JWT_HEADER));
  if (!verdict.ok) notFound();

  const data = loadOwnerOptionsScan();
  const xAudit = loadOwnerXRumoursAudit();
  const c = data.counts;
  return (
    <div className="mx-auto max-w-6xl space-y-4 px-4 py-6">
      <header className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <h1 className="text-xl font-semibold text-white">Options Scanner</h1>
          <p className="text-xs text-slate-400">Owner only · signed in as {verdict.email}</p>
        </div>
        {c ? (
          <p className="text-[11px] tabular-nums text-slate-500">
            {c.ok}/{c.scanned} tickers loaded
            {data.stacks
              ? ` · ${data.stacks.aggressive.total} aggressive · ${data.stacks.swing.total} swing · ${data.stacks.repeat.building ? "repeat building" : `${data.stacks.repeat.total} repeat`}`
              : ""}
            {data.historyInfo ? ` · history ${data.historyInfo.sessions} session${data.historyInfo.sessions === 1 ? "" : "s"}` : ""}
          </p>
        ) : null}
      </header>
      <TickerChartProvider>
        <OwnerOptionsScanner data={{ ...data, unusual: [] }} />
      </TickerChartProvider>
      {/* Owner 2026-10-10: X Rumours audit — filtered items and checks; never on member pages. */}
      <OwnerXRumoursAudit audit={xAudit} />
    </div>
  );
}
