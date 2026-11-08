import type { Metadata } from "next";
import { SignupBoxPreview } from "@/components/preview/SignupBoxPreview";

/** Isolated signup-box preview. noindex, not in the sitemap, not linked from the homepage. */
export const metadata: Metadata = {
  title: "Signup box preview (not live)",
  robots: { index: false, follow: false, nocache: true },
};

export default function SignupBoxPreviewPage() {
  return <SignupBoxPreview />;
}
