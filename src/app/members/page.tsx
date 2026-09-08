import { loadState } from "@/lib/loadState";
import { toMembersPayload } from "@/lib/composite";
import { TrafficLightDisplay } from "@/components/TrafficLight";
import { CanaryTable } from "@/components/CanaryTable";
import { StripeStubButton } from "@/components/StripeStubButton";
import { MembersPricingNote } from "@/components/MembersPricingNote";

export const dynamic = "force-dynamic";

/** Roadmap stubs — full UI later (P1). */
const ROADMAP = [
  {
    id: "holdings",
    title: "Holdings",
    body: "[Stub] Ranked holdings — owner updates via CoS weekly. Empty until first pack.",
  },
  {
    id: "adds-trims",
    title: "Adds / Trims",
    body: "[Stub] Weekly adds & trims log — not built yet.",
  },
  {
    id: "commentary",
    title: "Commentary",
    body: "[Stub] Grok-summarised market commentary slot — empty until Interpreter draft approved.",
  },
  {
    id: "canaries-detail",
    title: "Canaries",
    body: "[Stub] Per bird: description · current reading · last 5 weeks · score into composite · bird state (flapping / perched / dead).",
  },
];

export default function MembersPage() {
  const state = loadState();
  const payload = toMembersPayload(state);

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 text-slate-100">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-white">Members dashboard</h1>
          <p className="mt-1 text-sm text-slate-400">
            Full canary table, composite, archive, and product stubs.
          </p>
          <MembersPricingNote />
          {payload.fixture ? (
            <p className="mt-3 inline-block rounded-full bg-amber-500/15 px-3 py-1 text-xs font-medium text-amber-200 ring-1 ring-amber-400/30">
              {payload.fixtureLabel ?? "Fixture data — not a live reading"}
            </p>
          ) : (
            <p className="mt-3 inline-block rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-medium text-emerald-200 ring-1 ring-emerald-400/30">
              Live flock
              {payload.packMark ? ` · ${payload.packMark}` : ""}
              {payload.unverified && payload.unverified.length
                ? ` · ${payload.unverified.length} UNVERIFIED zeroed`
                : ""}
            </p>
          )}
        </div>
        <div className="rounded-2xl border border-white/10 bg-slate-900/70 p-4 shadow-sm">
          <TrafficLightDisplay
            light={payload.light}
            S={payload.S}
            asOf={payload.asOf}
            stance={payload.stance}
            size="sm"
          />
          <p className="mt-2 text-center text-xs text-slate-500">
            Weights sum {payload.weightSum.toFixed(2)}
            {payload.vetoApplied ? " · green veto applied" : ""}
          </p>
        </div>
      </div>

      {/* Roadmap section headers / stubs */}
      <section className="mt-10">
        <h2 className="text-sm font-semibold uppercase tracking-widest text-canary-gold">
          Roadmap (stubs)
        </h2>
        <div className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {ROADMAP.map((r) => (
            <article
              key={r.id}
              id={r.id}
              className="rounded-2xl border border-dashed border-white/15 bg-slate-900/40 p-4"
            >
              <h3 className="font-medium text-white">{r.title}</h3>
              <p className="mt-2 text-xs leading-relaxed text-slate-500">{r.body}</p>
            </article>
          ))}
        </div>
      </section>

      <div className="mt-8">
        <CanaryTable rows={payload.canaries} />
      </div>

      <section className="mt-12 grid gap-6 md:grid-cols-2">
        <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-white">Letter archive (stub)</h2>
          <ul className="mt-4 space-y-3">
            {payload.letterArchive.map((letter) => (
              <li key={letter.id} className="rounded-xl border border-white/10 p-3">
                <p className="font-medium text-white">{letter.title}</p>
                <p className="text-xs text-slate-500">
                  {new Date(letter.publishedAt).toLocaleDateString("en-NZ", {
                    timeZone: "Pacific/Auckland",
                  })}{" "}
                  PT
                </p>
                <p className="mt-1 text-sm text-slate-400">{letter.summary}</p>
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-white">Tools & tuition (placeholders)</h2>
          <ul className="mt-4 space-y-3 text-sm text-slate-300">
            <li>
              <a
                href={payload.placeholders.tradingViewIndicatorsUrl}
                className="font-medium text-white underline-offset-2 hover:underline"
              >
                TradingView indicators
              </a>
              <span className="text-slate-500"> — link placeholder</span>
            </li>
            <li>
              <a
                href={payload.placeholders.bookTuitionUrl}
                className="font-medium text-white underline-offset-2 hover:underline"
              >
                Book a tuition session
              </a>
              <span className="text-slate-500"> — limited slots/week (stub)</span>
            </li>
          </ul>
          <div className="mt-6 flex flex-wrap gap-2">
            <StripeStubButton product="tv_indicators" label="Buy TV indicators (stub)" />
            <StripeStubButton product="tuition" label="Paid 1-on-1 slot (stub)" />
            <StripeStubButton
              endpoint="/api/stripe/portal"
              label="Customer portal (stub)"
            />
          </div>
        </div>
      </section>
    </div>
  );
}
