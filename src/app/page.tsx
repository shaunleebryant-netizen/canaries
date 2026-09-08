import { loadState } from "@/lib/loadState";
import { toPublicSnapshot } from "@/lib/composite";
import { TrafficLightDisplay } from "@/components/TrafficLight";
import { ProofBlocks } from "@/components/ProofBlocks";
import { NewsletterForm } from "@/components/NewsletterForm";
import { StripeStubButton } from "@/components/StripeStubButton";

export const dynamic = "force-dynamic";

export default function HomePage() {
  const state = loadState();
  const snap = toPublicSnapshot(
    state.canaries,
    state.asOf,
    state.fixture,
    state.fixtureLabel
  );

  return (
    <div>
      <section className="relative overflow-hidden bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 text-white">
        <div className="pointer-events-none absolute inset-0 opacity-30"
          style={{
            backgroundImage:
              "radial-gradient(circle at 20% 20%, #eab30833, transparent 40%), radial-gradient(circle at 80% 60%, #22c55e22, transparent 35%)",
          }}
        />
        <div className="relative mx-auto grid max-w-5xl gap-12 px-4 py-16 md:grid-cols-2 md:items-center md:py-24">
          <div>
            <p className="text-sm font-medium uppercase tracking-widest text-canary-gold">
              The mine metaphor
            </p>
            <h1 className="mt-3 text-4xl font-semibold leading-tight tracking-tight md:text-5xl">
              Healthy canaries → stay in the market.
              <span className="block text-slate-300">Dying canaries → get defensive.</span>
            </h1>
            <p className="mt-5 max-w-lg text-base leading-relaxed text-slate-300">
              One screen. One composite reading. Like miners watching birds for air quality, we
              watch a weighted flock of market-health canaries — then show a traffic light, not a
              trade list.
            </p>
            {snap.fixture ? (
              <p className="mt-4 inline-block rounded-full bg-amber-500/20 px-3 py-1 text-xs font-medium text-amber-200 ring-1 ring-amber-400/40">
                {snap.fixtureLabel}
              </p>
            ) : null}
          </div>
          <div className="rounded-3xl border border-white/10 bg-white/5 p-8 backdrop-blur">
            <TrafficLightDisplay
              light={snap.light}
              S={snap.S}
              asOf={snap.asOf}
              stance={snap.stance}
            />
            <p className="mt-6 text-center text-xs text-slate-400">
              Public view shows light + composite S + asOf only — never the full scored table.
            </p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-4 py-16">
        <h2 className="text-center text-2xl font-semibold text-slate-900">
          How to read the flock
        </h2>
        <p className="mx-auto mt-2 max-w-2xl text-center text-slate-600">
          Three educational proof blocks — beginner to advanced. No buy/sell ticker advice.
        </p>
        <div className="mt-10">
          <ProofBlocks />
        </div>
      </section>

      <section id="letter" className="border-y border-slate-200 bg-white">
        <div className="mx-auto max-w-5xl px-4 py-16 text-center">
          <h2 className="text-2xl font-semibold text-slate-900">Weekly canary letter</h2>
          <p className="mx-auto mt-2 max-w-xl text-slate-600">
            One clear reading each week. This form is a stub: it stores locally and does not send
            email.
          </p>
          <div className="mt-8 flex justify-center">
            <NewsletterForm />
          </div>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <StripeStubButton product="weekly_letter" label="Subscribe (Stripe stub)" />
            <StripeStubButton product="dashboard" label="Dashboard plan (stub)" />
          </div>
        </div>
      </section>
    </div>
  );
}
