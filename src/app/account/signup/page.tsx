import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/members/session";
import { AccountForm } from "@/components/account/AccountForm";
import { GoogleSignInButton } from "@/components/account/GoogleSignInButton";
import { TestModeBanner } from "@/components/account/TestModeBanner";
import { accountsEnabled } from "@/lib/members/config";

export const dynamic = "force-dynamic";
export const metadata = { title: "Create account", robots: { index: false } };

export default async function AccountSignupPage() {
  if (!accountsEnabled()) notFound();
  if (await getCurrentUser()) redirect("/account"); // already logged in
  return (
    <div className="mx-auto max-w-md px-4 py-14">
      <TestModeBanner />
      <p className="text-xs font-semibold uppercase tracking-widest text-canary-gold">Dashboard access</p>
      <h1 className="mt-2 text-3xl font-semibold text-white">Create your account</h1>
      <p className="mt-3 text-sm text-slate-400">
        Step 1 of 2 — create a login. Step 2 is secure payment with Stripe. Email/password accounts need email
        confirmation before the members dashboard unlocks.
      </p>
      <AccountForm
        endpoint="/api/account/signup"
        submitLabel="Create account"
        fields={[
          { name: "email", label: "Email", type: "email", autoComplete: "email" },
          { name: "password", label: "Password (min 10 characters)", type: "password", autoComplete: "new-password" },
        ]}
      />
      <GoogleSignInButton next="/account" />
      <p className="mt-6 text-sm text-slate-400">
        Already have an account?{" "}
        <Link href="/account/login" className="text-canary-gold underline">
          Log in
        </Link>
      </p>
    </div>
  );
}
