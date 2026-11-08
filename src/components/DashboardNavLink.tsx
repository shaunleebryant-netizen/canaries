import Link from "next/link";
import { resolveViewer } from "@/lib/members/previewAccess";

/** Logged-in sessions go straight to the dashboard. Everyone else goes to signup. */
export async function DashboardNavLink({ className }: { className: string }) {
  const viewer = await resolveViewer();
  return (
    <>
      {viewer.signedIn ? (
        <Link href="/account" className="hover:text-canary-gold">
          Account
        </Link>
      ) : null}
      <Link href={viewer.signedIn ? "/members" : "/signup"} className={className}>
        Dashboard
      </Link>
    </>
  );
}
