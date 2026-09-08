import { loadState } from "@/lib/loadState";
import { toMembersPayload } from "@/lib/composite";
import { TrafficLightDisplay } from "@/components/TrafficLight";
import { CanaryTable } from "@/components/CanaryTable";
import { StripeStubButton } from "@/components/StripeStubButton";

export const dynamic = "force-dynamic";

export default function MembersPage() {
  const state = loadState();
  const payload = toMembersPayload(state);

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Members dashboard</h1>
          <p className="mt-1 text-sm text-slate-500">
            Full canary table, composite, archive, and product stubs.
          </p>
          {payload.fixture ? (
            <p className="mt-3 inline-block rounded-full bg-amber-50 px-3 py-1 text-xs font-medium text-amber-800 ring-1 ring-amber-200">
              {payload.fixtureLabel}
            </p>
          ) : null}
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <TrafficLightDisplay
            light={payload.light}
            S={payload.S}
            asOf={payload.asOf}
            stance={payload.stance}
            size="sm"
          />
          <p className="mt-2 text-center text-xs text-slate-400">
            Weights sum {payload.weightSum.toFixed(2)}
            {payload.vetoApplied ? " · green veto applied" : ""}
          </p>
        </div>
      </div>

      <div className="mt-8">
        <CanaryTable rows={payload.canaries} />
      </div>

      <section className="mt-12 grid gap-6 md:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold">Letter archive (stub)</h2>
          <ul className="mt-4 space-y-3">
            {payload.letterArchive.map((letter) => (
              <li key={letter.id} className="rounded-xl border border-slate-100 p-3">
                <p className="font-medium text-slate-900">{letter.title}</p>
                <p className="text-xs text-slate-400">
                  {new Date(letter.publishedAt).toLocaleDateString("en-NZ", {
                    timeZone: "Pacific/Auckland",
                  })}{" "}
                  PT
                </p>
                <p className="mt-1 text-sm text-slate-600">{letter.summary}</p>
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold">Tools & tuition (placeholders)</h2>
          <ul className="mt-4 space-y-3 text-sm text-slate-700">
            <li>
              <a
                href={payload.placeholders.tradingViewIndicatorsUrl}
                className="font-medium text-slate-900 underline-offset-2 hover:underline"
              >
                TradingView indicators
              </a>
              <span className="text-slate-400"> — link placeholder</span>
            </li>
            <li>
              <a
                href={payload.placeholders.bookTuitionUrl}
                className="font-medium text-slate-900 underline-offset-2 hover:underline"
              >
                Book a tuition session
              </a>
              <span className="text-slate-400"> — limited slots/week (stub)</span>
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
