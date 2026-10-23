import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AboutPageBody } from "@/components/AboutContent";
import { ABOUT_PAGE } from "@/lib/featureFlags";
import { FIRST_100_CAP, accountsEnabled } from "@/lib/members/config";
import { countLaunchMembers, getMembersDb } from "@/lib/members/db";

// Founding-spots state is read per request (same rule as the homepage join section).
export const dynamic = "force-dynamic";

/** Same once-sold-out rule as the homepage / account / checkout: open while active launch members
 *  < FIRST_100_CAP; "open" if accounts mode is off or the DB is unavailable. */
async function foundingSpotsOpen(): Promise<boolean> {
  if (!accountsEnabled()) return true;
  try {
    return (await countLaunchMembers(await getMembersDb())) < FIRST_100_CAP;
  } catch {
    return true;
  }
}

/** /about — behind ABOUT_PAGE (default ON since 2026-10-06; NEXT_PUBLIC_ABOUT_PAGE=0 → 404). */
export const metadata: Metadata = ABOUT_PAGE
  ? {
      title: "About",
      description:
        "About Canary Dashboard and its founder, Shaun Lee Bryant: how our Relative RSI marks work, recent examples with the full hit-rate record, and founding membership. Education only.",
      alternates: { canonical: "/about" },
    }
  : { title: "Not found", robots: { index: false, follow: false } };

export default async function AboutPage() {
  if (!ABOUT_PAGE) notFound();
  return <AboutPageBody launchOpen={await foundingSpotsOpen()} />;
}
