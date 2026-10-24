import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { AccountForm } from "@/components/account/AccountForm";
import { TestModeBanner } from "@/components/account/TestModeBanner";
import { accountsEnabled } from "@/lib/members/config";
import { getMembersDb } from "@/lib/members/db";
import { getCurrentUser } from "@/lib/members/session";
import { consumeEmailVerification, isEmailVerified } from "@/lib/members/verify";

export const dynamic = "force-dynamic";
export const metadata = { title: "Verify email", robots: { index: false } };

export default async function AccountVerifyPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  if (!accountsEnabled()) notFound();
  const sp = await searchParams;
  const token = sp.token || "";
  const pending = sp.pending === "1";
  const cur = await getCurrentUser();

  let consumeMsg: string | null = null;
  let consumeOk = false;
  if (token) {
    const db = await getMembersDb();
    const result = await consumeEmailVerification(db, token);
    if (result.ok) {
      consumeOk = true;
      consumeMsg = result.already ? "Email was already verified." : "Email confirmed — welcome.";
    } else {
      consumeMsg = "That verify link is invalid or expired. Request a new one below.";
    }
  }

  const verified = cur ? isEmailVerified(cur.user) : consumeOk;

  if (verified && sp.next?.startsWith("/") && !sp.next.startsWith("//")) {
    redirect(sp.next);
  }
  if (verified && !token) {
    redirect("/account");
  }

  return (
    <div className="mx-auto max-w-md px-4 py-14">
      <TestModeBanner />
      <p className="text-xs font-semibold uppercase tracking-widest text-canary-gold">Dashboard access</p>
      <h1 className="mt-2 text-3xl font-semibold text-white">Verify your email</h1>

      {consumeMsg ? (
        <p
          className={`mt-6 rounded-xl border px-4 py-3 text-sm ${
            consumeOk
              ? "border-emerald-400/40 bg-emerald-500/10 text-emerald-200"
              : "border-canary-red/40 bg-red-500/10 text-red-200"
          }`}
        >
          {consumeMsg}
        </p>
      ) : null}

      {pending && !consumeOk ? (
        <p className="mt-6 rounded-xl border border-amber-400/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
          Account created. We&apos;ve emailed you a confirmation link; click it to unlock the members dashboard.
          {cur ? (
            <>
              {" "}
              Signed in as <span className="font-medium text-white">{cur.user.email}</span>.
            </>
          ) : null}{" "}
          With <code className="text-xs">EMAIL_SENDING</code> off, use test-mode link from signup or resend below.
        </p>
      ) : null}

      {consumeOk ? (
        <p className="mt-8 text-sm text-slate-300">
          {cur ? (
            <Link href="/account" className="text-canary-gold underline">
              Continue to your account →
            </Link>
          ) : (
            <Link href="/account/login?next=/account" className="text-canary-gold underline">
              Log in to continue →
            </Link>
          )}
        </p>
      ) : (
        <>
          <p className="mt-4 text-sm text-slate-400">
            Need a new confirmation link? We&apos;ll email it to you.
          </p>
          <AccountForm
            endpoint="/api/account/verify/resend"
            submitLabel="Resend verify link"
            fields={
              cur
                ? []
                : [{ name: "email", label: "Email", type: "email", autoComplete: "email" }]
            }
            successMessage="If that account needs verification, a new link has been issued."
          />
        </>
      )}

      <p className="mt-6 text-sm text-slate-400">
        <Link href="/account/login" className="text-canary-gold underline">
          Back to log in
        </Link>
      </p>
    </div>
  );
}
