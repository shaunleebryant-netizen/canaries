import { FOUNDING_BENEFITS } from "@/lib/foundingBenefits";
import { FIRST_100_CAP, accountsEnabled } from "@/lib/members/config";
import { countLaunchMembers, getMembersDb } from "@/lib/members/db";

export const metadata = {
  alternates: { canonical: "/signup" },
  title: "Sign up",
  description: "Create a Canary Dashboard account or log in to the members dashboard.",
};

// Founding-spots highlight switches when the first 100 fill.
export const dynamic = "force-dynamic";


async function foundingSpotsOpen(): Promise<boolean> {
  if (!accountsEnabled()) return true;
  try {
    return (await countLaunchMembers(await getMembersDb())) < FIRST_100_CAP;
  } catch {
    return true;
  }
}

export default async function SignupPage() {
  const launchOpen = await foundingSpotsOpen();
  const foundingBox = launchOpen
    ? "rounded-xl border border-canary-gold/30 bg-slate-950/60 px-4 py-3"
    : "rounded-xl border border-white/10 bg-slate-950/40 px-4 py-3 opacity-60";
  const afterBox = launchOpen
    ? "rounded-xl border border-white/10 bg-slate-950/40 px-4 py-3 opacity-60"
    : "rounded-xl border border-canary-gold/30 bg-slate-950/60 px-4 py-3";
  const foundingLabel = launchOpen ? "text-canary-gold" : "text-slate-500";
  const afterLabel = launchOpen ? "text-slate-500" : "text-canary-gold";
  const foundingPrice = launchOpen ? "text-white" : "text-slate-400";
  const afterPrice = launchOpen ? "text-slate-400" : "text-white";

  return (
    <div className="mx-auto max-w-3xl px-4 py-14">
      <p className="text-xs font-semibold uppercase tracking-widest text-canary-gold">
        Dashboard access
      </p>
      <h1 className="mt-2 text-3xl font-semibold text-white">Sign up or log in</h1>
      <p className="mt-3 max-w-xl text-sm text-slate-400">
        New members create an account below. Existing members log in to the gated
        dashboard.
      </p>

      <div className="mt-10 grid gap-6 md:grid-cols-2">
        {/* Log in */}
        <section className="rounded-2xl border border-white/10 bg-slate-900/50 p-6">
          <h2 className="text-lg font-semibold text-white">Log in</h2>
          <p className="mt-2 text-sm text-slate-400">
            Already a member? Open the members area.
          </p>
          <a
            href="/account/login"
            className="mt-6 inline-block w-full rounded-xl border border-white/20 bg-white/5 px-4 py-3 text-center text-sm font-semibold text-white hover:bg-white/10"
          >
            Go to log in →
          </a>
        </section>

        {/* Create account */}
        <section className="rounded-2xl border border-canary-gold/40 bg-gradient-to-b from-amber-500/10 to-slate-950 p-6 ring-1 ring-canary-gold/20">
          <h2 className="text-lg font-semibold text-white">Create account</h2>
          <p className="mt-2 text-sm text-slate-300">Secure card payment by Stripe. All prices in USD.</p>

          <div className="mt-5 space-y-3">
            <div className={foundingBox}>
              <p className={`text-xs font-semibold uppercase tracking-widest ${foundingLabel}`}>
                First 100 · launch special
              </p>
              <p className={`mt-1 text-2xl font-semibold ${foundingPrice}`}>
                $35<span className="text-sm font-medium text-slate-400">/month</span>
              </p>
              <p className="mt-1 text-xs text-slate-400">
                Billed annually (US$420/year) · not subject to future increments
              </p>
            </div>
            <div className={afterBox}>
              <p className={`text-xs font-semibold uppercase tracking-widest ${afterLabel}`}>
                After 100
              </p>
              <p className={`mt-1 text-xl font-semibold ${afterPrice}`}>
                $1,069<span className="text-sm font-medium text-slate-400">/yr</span>
                <span className="text-sm font-medium text-slate-400"> · or $99/mo monthly</span>
              </p>
            </div>
          </div>

          <ul className="mt-5 space-y-1.5 text-sm text-slate-300">
            {FOUNDING_BENEFITS.map((item) => (
              <li key={item} className="flex gap-2">
                <span className="text-canary-gold">✓</span>
                {item}
              </li>
            ))}
          </ul>

          <div className="mt-6">
            <a
              href="/account/signup"
              className="block w-full rounded-xl bg-canary-gold px-4 py-3 text-center text-sm font-semibold text-slate-950 hover:bg-yellow-400"
            >
              Create account and continue →
            </a>
            <p className="mt-2 text-center text-xs text-slate-500">
              You&apos;ll make your login first, then pay securely on Stripe.
            </p>
          </div>
        </section>
      </div>

      <p className="mt-10 text-center text-xs text-slate-500">
        Education only — not investment advice.
      </p>
    </div>
  );
}
