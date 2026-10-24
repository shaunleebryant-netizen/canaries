/**
 * Former History preview (owner approved 2026-10-07). The History tab is now live on /members;
 * keep this path as a redirect so any saved preview link lands on the tab.
 */
import { redirect } from "next/navigation";

export default function MembersHistoryPreviewRedirect() {
  redirect("/members?tab=backtest");
}
