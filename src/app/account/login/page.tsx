import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/members/session";
import { AccountForm } from "@/components/account/AccountForm";
import { GoogleSignInButton } from "@/components/account/GoogleSignInButton";
import { TestModeBanner } from "@/components/account/TestModeBanner";
import { accountsEnabled } from "@/lib/members/config";
import { safeNext } from "@/lib/members/http";

export const dynamic = "force-dynamic";
export const metadata = { title: "Log in", robots: { index: false } };

const GOOGLE_ERR: Record<string, string> = {
  not_configured: "Google sign-in is not configured yet.",
  denied: "Google sign-in was cancelled.",
  oauth_error: "Google sign-in failed. Try again.",
  missing_code: "Google sign-in incomplete. Try again.",
  state_mismatch: "Google sign-in expired or mismatched. Try again.",
  email_unverified: "Your Google email must be verified with Google first.",
  account_conflict: "That Google account cannot be linked to this email.",
  token_exchange: "Google sign-in failed during token exchange. Try again.",
  session_secret: "Server session secret missing — contact support.",
};

export default async function AccountLoginPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  if (!accountsEnabled()) notFound();
  const sp = await searchParams;
  const next = safeNext(sp.next);
  if (!sp.out && !sp.reset && (await getCurrentUser())) redirect(next); // already logged in
  const googleErr = sp.google ? GOOGLE_ERR[sp.google] || "Google sign-in failed." : null;
  return (
    <div className="mx-auto max-w-md px-4 py-14">
      <TestModeBanner />
      <h1 className="text-3xl font-semibold text-white">Members log in</h1>
      {sp.reset ? <p className="mt-3 text-sm text-emerald-300">Password updated — log in with your new password.</p> : null}
      {sp.out ? <p className="mt-3 text-sm text-slate-400">You are logged out.</p> : null}
      {googleErr ? (
        <p className="mt-3 rounded-xl border border-amber-400/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
          {googleErr}
        </p>
      ) : null}
      <AccountForm
        endpoint="/api/account/login"
        submitLabel="Log in"
        hidden={{ next }}
        fields={[
          { name: "email", label: "Email", type: "email", autoComplete: "email" },
          { name: "password", label: "Password", type: "password", autoComplete: "current-password" },
        ]}
      />
      <GoogleSignInButton next={next} />
      <div className="mt-6 flex justify-between text-sm text-slate-400">
        <Link href="/account/signup" className="text-canary-gold underline">
          Create account
        </Link>
        <Link href="/account/reset" className="underline">
          Forgot password?
        </Link>
      </div>
      <p className="mt-3 text-xs text-slate-500">
        Didn&apos;t get your confirmation email?{" "}
        <Link href="/account/verify" className="underline">
          Resend it
        </Link>
        .
      </p>
    </div>
  );
}
