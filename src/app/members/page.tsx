import Link from "next/link";
import { loadState } from "@/lib/loadState";
import { toMembersPayload } from "@/lib/composite";
import { TrafficLightDisplay } from "@/components/TrafficLight";
import { CanaryTable } from "@/components/CanaryTable";
import { MembersPricingNote } from "@/components/MembersPricingNote";

export const dynamic = "force-dynamic";

/** Owner book — ranked holdings for week of 2026-09-08 (CoS). */
const HOLDINGS = [
  "SPCX",
  "STAA",
  "SYM",
  "OUST",
  "AAOI",
  "SNAP",
  "BTDR",
  "NFLX",
  "NOW",
] as const;

const COMMENTARY = {
  headline: "Green flock (S = +0.73) — stay-invested character intact",
  paragraphs: [
    "This week’s flock prints Green (S = +0.73). Most of the board is constructive: stress gauges (VIX vs yields, VIX+VVIX) are calm, and banks, mega-caps, small caps, and equal-weight price show intact uptrends. Participation (% above 200-day) sits in a healthy mid-50s — not euphoria, not a washout. Soft notes: NYSE daily internals printed negative, and the latest official FINRA margin-debt figure is down month-over-month (lagged). The risk-on vs defensive ratio has a print but no clean trend this pack, so it sits quiet.",
    "Green here means the board’s character is stay invested / risk-on intact under the teaching bands — not a promise about next week, and not a buy/sell call on any named ticker. Holdings list is the owner book for the week; adds/trims: none.",
  ],
};

const TOP_SECTOR = {
  name: "Energy",
  ticker: "XLE",
  weekEnded: "2026-09-04",
  movePct: "+2.33%",
  note: "Morningstar US sector wrap — Energy led; Technology ~+0.89%; Consumer Cyclicals lagged ~−1.98%. Education only — not a trade.",
};

export default function MembersPage() {
  const state = loadState();
  const payload = toMembersPayload(state);

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 text-slate-100">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-white">Members dashboard</h1>
          <p className="mt-1 text-sm text-slate-400">
            Live flock, weekly book, sector wrap, and letter archive.
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

      <section className="mt-10">
        <h2 className="text-sm font-semibold uppercase tracking-widest text-canary-gold">
          This week’s pack
        </h2>
        <div className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <article
            id="holdings"
            className="rounded-2xl border border-white/10 bg-slate-900/60 p-4 shadow-sm"
          >
            <h3 className="font-medium text-white">Holdings</h3>
            <p className="mt-1 text-[11px] uppercase tracking-wide text-slate-500">
              Ranked owner book · education only
            </p>
            <ol className="mt-3 space-y-1.5">
              {HOLDINGS.map((ticker, i) => (
                <li
                  key={ticker}
                  className="flex items-center gap-2 text-sm text-slate-200"
                >
                  <span className="w-5 tabular-nums text-xs text-slate-500">
                    {i + 1}.
                  </span>
                  <span className="font-semibold tracking-wide text-white">
                    {ticker}
                  </span>
                </li>
              ))}
            </ol>
          </article>

          <article
            id="adds-trims"
            className="rounded-2xl border border-white/10 bg-slate-900/60 p-4 shadow-sm"
          >
            <h3 className="font-medium text-white">Adds / Trims</h3>
            <p className="mt-3 text-sm leading-relaxed text-slate-300">
              None this week.
            </p>
          </article>

          <article
            id="commentary"
            className="rounded-2xl border border-white/10 bg-slate-900/60 p-4 shadow-sm md:col-span-2 lg:col-span-1"
          >
            <h3 className="font-medium text-white">Commentary</h3>
            <p className="mt-1 text-[11px] uppercase tracking-wide text-slate-500">
              Education only · not buy/sell advice
            </p>
            <p className="mt-3 text-sm font-medium leading-snug text-emerald-200">
              {COMMENTARY.headline}
            </p>
            <div className="mt-3 space-y-3 text-xs leading-relaxed text-slate-400">
              {COMMENTARY.paragraphs.map((p) => (
                <p key={p.slice(0, 24)}>{p}</p>
              ))}
            </div>
          </article>

          <article
            id="top-sector"
            className="rounded-2xl border border-canary-gold/25 bg-slate-900/60 p-4 shadow-sm ring-1 ring-canary-gold/10"
          >
            <h3 className="font-medium text-white">Top sector this week</h3>
            <p className="mt-1 text-[11px] uppercase tracking-wide text-canary-gold/80">
              Education only
            </p>
            <p className="mt-4 text-2xl font-semibold tracking-tight text-white">
              {TOP_SECTOR.name}
              <span className="ml-2 text-lg font-medium text-canary-gold">
                {TOP_SECTOR.ticker}
              </span>
            </p>
            <p className="mt-2 text-sm text-slate-300">
              Week ended {TOP_SECTOR.weekEnded} (US)
            </p>
            <p className="mt-1 text-xl font-semibold tabular-nums text-canary-green">
              ≈ {TOP_SECTOR.movePct}
            </p>
            <p className="mt-3 text-[11px] leading-relaxed text-slate-500">
              {TOP_SECTOR.note}
            </p>
          </article>
        </div>
      </section>

      <div className="mt-8">
        <CanaryTable rows={payload.canaries} />
      </div>

      <section className="mt-12 grid gap-6 md:grid-cols-2">
        <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-white">Letter archive</h2>
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

        <div className="rounded-2xl border border-canary-gold/30 bg-gradient-to-br from-slate-900 via-slate-900 to-amber-950/30 p-6 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-widest text-canary-gold">
            Go deeper live
          </p>
          <h2 className="mt-2 text-lg font-semibold text-white">
            1-on-1 live lessons
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-slate-300">
            Prefer a human walkthrough of this week’s flock? Book a limited
            1-on-1 live lesson —{" "}
            <span className="font-semibold text-white">S$115/hr</span>, book
            included. Education only.
          </p>
          <Link
            href="/tuition"
            className="mt-6 inline-flex items-center justify-center rounded-xl bg-canary-gold px-4 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-yellow-300"
          >
            Book a 1-on-1 lesson →
          </Link>
          <p className="mt-3 text-xs text-slate-500">
            Limited slots. Form stores interest; no charge until owner go-live.
          </p>
        </div>
      </section>
    </div>
  );
}
