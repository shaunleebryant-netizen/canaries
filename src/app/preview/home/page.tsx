import type { Metadata } from "next";
import { HomeXaiPreview } from "@/components/preview/HomeXaiPreview";

/**
 * Local / owner preview of the x.ai-inspired homepage redesign.
 * noindex · not in sitemap · not linked from nav. Do not deploy until owner yes —
 * or if this route ships accidentally, robots noindex keeps it out of search.
 */
export const metadata: Metadata = {
  title: "Homepage preview (not live)",
  robots: { index: false, follow: false, nocache: true },
};

export default function HomePreviewPage() {
  return <HomeXaiPreview />;
}
