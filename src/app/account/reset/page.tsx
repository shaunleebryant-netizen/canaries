import Link from "next/link";
import { notFound } from "next/navigation";
import { AccountForm } from "@/components/account/AccountForm";
import { TestModeBanner } from "@/components/account/TestModeBanner";
import { accountsEnabled } from "@/lib/members/config";

export const dynamic = "force-dynamic";
export const metadata = { title: "Reset password", robots: { index: false } };

export default async function AccountResetPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  if (!accountsEnabled()) notFound();
  const { token } = await searchParams;
  return (
    <div className="mx-auto max-w-md px-4 py-14">
      <TestModeBanner />
      <h1 className="text-3xl font-semibold text-white">Reset password</h1>
      {token ? (
        <AccountForm
          endpoint="/api/account/reset/confirm"
          submitLabel="Set new password"
          hidden={{ token }}
          fields={[{ name: "password", label: "New password (min 10 characters)", type: "password", autoComplete: "new-password" }]}
        />
      ) : (
        <>
          <p className="mt-3 text-sm text-slate-400">
            Enter your account email and we&apos;ll send you a link to set a new password. The link works for 1 hour.
          </p>
          <AccountForm
            endpoint="/api/account/reset/request"
            submitLabel="Send reset link"
            fields={[{ name: "email", label: "Email", type: "email", autoComplete: "email" }]}
          />
        </>
      )}
      <p className="mt-6 text-sm">
        <Link href="/account/login" className="text-canary-gold underline">
          Back to log in
        </Link>
      </p>
    </div>
  );
}
