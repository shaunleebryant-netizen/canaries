import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { TestModeBanner } from "@/components/account/TestModeBanner";
import { graceEndsAt } from "@/lib/members/access";
import { PollRefresh } from "@/components/account/PollRefresh";
import { getEntitlement } from "@/lib/members/entitlement";
import { FIRST_100_CAP, accountsEnabled, adminEmails } from "@/lib/members/config";
import { countLaunchMembers, getMembersDb } from "@/lib/members/db";
import { PLANS, offeredPlans } from "@/lib/members/plans";
import { getCurrentUser } from "@/lib/members/session";
import { isEmailVerified } from "@/lib/members/verify";

export const dynamic = "force-dynamic";
export const metadata = { title: "Account & billing", robots: { index: false } };

const fmt = (s: number | null) =>
  s ? new Date(s * 1000).toISOString().slice(0, 16).replace("T", " ") + " UTC" : "—";

const ERRORS: Record<string, string> = {
  stripe_not_configured: "Billing is not configured yet (Stripe keys missing).",
  price_missing: "Stripe price for this plan is not configured yet.",
  no_customer: "No billing profile yet — subscribe first.",
  stripe_error: "Something went wrong talking to Stripe. Nothing was charged. Please try again.",
};

export default async function AccountPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  if (!accountsEnabled()) notFound();
  const cur = await getCurrentUser();
  if (!cur) redirect("/account/login?next=/account");
  const sp = await searchParams;
  const db = await getMembersDb();
  const ent = await getEntitlement(db, cur.user);
  const sub = ent.sub;
  const access = ent.access;
  const complimentary = ent.kind === "admin" || ent.kind === "comp";
  const launchOpen = (await countLaunchMembers(db)) < FIRST_100_CAP;
  const plans = offeredPlans(launchOpen);
  const isAdmin = adminEmails().includes(cur.user.email.toLowerCase());

  return (
    <div className="mx-auto max-w-2xl px-4 py-14">
      <TestModeBanner />
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-canary-gold">Account &amp; billing</p>
          <h1 className="mt-2 text-2xl font-semibold text-white">{cur.user.email}</h1>
        </div>
        <form action="/api/account/logout" method="post">
          <button className="rounded-xl border border-white/20 px-3 py-2 text-xs text-slate-200 hover:bg-white/10">Log out</button>
        </form>
      </div>

      {sp.checkout === "success" && !access ? <PollRefresh /> : null}
      {sp.gate && !access ? (
        <p className="mt-6 rounded-xl border border-canary-red/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          The members dashboard needs an active membership.
        </p>
      ) : null}
      {!isEmailVerified(cur.user) ? (
        <p className="mt-6 rounded-xl border border-amber-400/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
          Confirm your email before the members dashboard unlocks.{" "}
          <Link href="/account/verify?pending=1" className="underline text-canary-gold">
            Verify email
          </Link>
        </p>
      ) : null}
      {sp.checkout === "success" ? (
        <p className="mt-6 rounded-xl border border-emerald-400/40 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
          {access
            ? "Payment received — welcome aboard. Your membership is active."
            : "Payment received — activating your membership now. This page refreshes by itself; it usually takes a few seconds."}
        </p>
      ) : null}
      {sp.checkout === "cancelled" ? <p className="mt-6 text-sm text-slate-400">Checkout cancelled — nothing was charged.</p> : null}
      {sp.error ? <p className="mt-6 text-sm text-canary-red">{ERRORS[sp.error] ?? sp.error}</p> : null}

      <section className="mt-8 rounded-2xl border border-white/10 bg-slate-900/50 p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">Membership</h2>
          <span
            data-testid="access-badge"
            className={`rounded-full px-3 py-1 text-xs font-semibold ${access ? "bg-emerald-500/20 text-emerald-300" : "bg-slate-700 text-slate-300"}`}
          >
            {access ? (complimentary ? "Complimentary" : "Active") : "No access"}
          </span>
        </div>
        {complimentary ? (
          <p className="mt-3 text-sm text-slate-300" data-testid="comp-note">
            You have full members access, with no payment needed and no renewal date.
          </p>
        ) : sub ? (
          <dl className="mt-4 grid grid-cols-2 gap-y-2 text-sm">
            <dt className="text-slate-400">Plan</dt>
            <dd className="text-white">{PLANS[sub.plan as keyof typeof PLANS]?.label ?? sub.plan}</dd>
            <dt className="text-slate-400">Stripe status</dt>
            <dd className="text-white" data-testid="sub-status">{sub.status}</dd>
            <dt className="text-slate-400">{sub.cancel_at_period_end ? "Access ends" : "Renews"}</dt>
            <dd className="text-white">{fmt(sub.current_period_end)}</dd>
            <dt className="text-slate-400">Auto-renew</dt>
            <dd className="text-white" data-testid="auto-renew">{sub.cancel_at_period_end ? "Off" : sub.status === "canceled" ? "—" : "On"}</dd>
            {graceEndsAt(sub) ? (
              <>
                <dt className="text-slate-400">Payment grace ends</dt>
                <dd className="text-amber-300" data-testid="grace-ends">{fmt(graceEndsAt(sub))}</dd>
              </>
            ) : null}
            {sub.last_payment_failed_at ? (
              <>
                <dt className="text-slate-400">Last failed payment</dt>
                <dd className="text-canary-red">{fmt(sub.last_payment_failed_at)}</dd>
              </>
            ) : null}
          </dl>
        ) : (
          <p className="mt-3 text-sm text-slate-400">No membership yet. Choose a plan below to unlock the dashboard.</p>
        )}

        {access ? (
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/members" className="rounded-xl bg-canary-gold px-4 py-3 text-sm font-semibold text-slate-950 hover:bg-yellow-400">
              Open members dashboard →
            </Link>
            {!complimentary && sub?.stripe_customer_id ? (
              <form action="/api/account/portal" method="post">
                <button className="rounded-xl border border-white/20 bg-white/5 px-4 py-3 text-sm font-semibold text-white hover:bg-white/10">
                  Manage billing / auto-renew
                </button>
              </form>
            ) : null}
          </div>
        ) : (
          <div className="mt-6 space-y-4">
            {plans.map((plan) => (
              <div
                key={plan.id}
                data-testid={`plan-${plan.id}`}
                className={
                  plan.highlight
                    ? "rounded-xl border-2 border-canary-gold bg-gradient-to-b from-amber-500/10 to-slate-950 p-4 ring-1 ring-canary-gold/30"
                    : "rounded-xl border border-white/15 bg-slate-950/60 p-4"
                }
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-semibold uppercase tracking-widest text-canary-gold">{plan.label}</p>
                  {plan.highlight ? (
                    <span className="rounded-full bg-canary-gold px-2 py-0.5 text-[10px] font-bold uppercase text-slate-950">
                      {plan.id === "launch_annual" || plan.id === "launch_monthly" ? "Launch special" : "Recommended"}
                    </span>
                  ) : null}
                </div>
                <p className="mt-1 text-2xl font-semibold text-white">{plan.display}</p>
                <p className="mt-1 text-xs text-slate-300">{plan.sub}</p>
                <p className="mt-1 text-xs text-slate-500">{plan.note}</p>
                <form action="/api/account/checkout" method="post" className="mt-4">
                  <input type="hidden" name="plan" value={plan.id} />
                  <button
                    className={
                      plan.highlight
                        ? "w-full rounded-xl bg-canary-gold px-4 py-3 text-sm font-semibold text-slate-950 hover:bg-yellow-400"
                        : "w-full rounded-xl border border-white/20 bg-white/5 px-4 py-3 text-sm font-semibold text-white hover:bg-white/10"
                    }
                  >
                    {plan.interval === "year" ? "Continue with annual (Stripe) →" : "Continue with monthly (Stripe) →"}
                  </button>
                </form>
              </div>
            ))}
            {sub?.stripe_customer_id ? (
              <form action="/api/account/portal" method="post" className="mt-3">
                <button className="w-full rounded-xl border border-white/20 px-4 py-2 text-xs text-slate-200 hover:bg-white/10">
                  Billing history / update card
                </button>
              </form>
            ) : null}
          </div>
        )}
        {complimentary ? null : (
          <p className="mt-4 text-xs text-slate-500">
            You can turn off auto-renew at any time and keep your access until the end of the paid term.
          </p>
        )}
      </section>

      {isAdmin ? (
        <section className="mt-8 rounded-2xl border border-white/10 bg-slate-900/50 p-6">
          <h2 className="text-lg font-semibold text-white">Admin ledger (CSV)</h2>
          <div className="mt-3 flex flex-wrap gap-3 text-sm">
            {["signups", "payments", "events", "subscriptions", "member_events"].map((t) => (
              <a key={t} href={`/api/admin/export?table=${t}`} className="text-canary-gold underline">
                {t}.csv
              </a>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
