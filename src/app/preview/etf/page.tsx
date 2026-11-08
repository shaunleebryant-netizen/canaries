import type { Metadata } from "next";
import { EtfTabPreview } from "@/components/preview/EtfTabPreview";
import { TickerChartProvider } from "@/components/TickerChartLightbox";
import { resolveViewer } from "@/lib/members/previewAccess";

/**
 * Isolated ETF tab design preview. Not linked from the dashboard or sitemap.
 * The live ETF tab is unchanged.
 */
export const metadata: Metadata = {
  title: "ETF tab preview (not live)",
  robots: { index: false, follow: false, nocache: true },
};

export const dynamic = "force-dynamic";

export default async function EtfPreviewPage({ searchParams }: { searchParams: Promise<{ layers?: string }> }) {
  const viewer = await resolveViewer();
  const layers = (await searchParams).layers;
  const chartAccess = layers === "free" || viewer.tier !== "paid" ? "free-etf" : "paid";
  return (
    <TickerChartProvider v2 chartAccess={chartAccess}>
      <EtfTabPreview />
    </TickerChartProvider>
  );
}
