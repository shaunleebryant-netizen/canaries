/**
 * Former dashboard design preview (owner t581u/t583u). Approved t583s2392 2026-10-08: collapsible Decide,
 * the chart lightbox and My Stocks are live on /members, so this path just redirects there.
 */
import { redirect } from "next/navigation";

export default function MembersDesignPreviewRedirect() {
  redirect("/members");
}
