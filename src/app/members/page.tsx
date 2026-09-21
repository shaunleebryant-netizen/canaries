import Link from "next/link";
import { loadState } from "@/lib/loadState";
import { toMembersPayload } from "@/lib/composite";
import { TrafficLightDisplay } from "@/components/TrafficLight";
import { CanaryTable } from "@/components/CanaryTable";
import { DeskIdeas } from "@/components/DeskIdeas";
import { UnusualOptions } from "@/components/UnusualOptions";
import { MarketRegime } from "@/components/MarketRegime";
import { VolCurveCanary } from "@/components/VolCurveCanary";
import { VolumeBreadth } from "@/components/VolumeBreadth";
import { FishAlerts } from "@/components/FishAlerts";
import { ExhaustionAlerts } from "@/components/ExhaustionAlerts";
import { LiveTickers } from "@/components/LiveTickers";
import { XlSectors } from "@/components/XlSectors";
import { loadRegimeFromCanaries } from "@/lib/loadRegime";
import { loadVolCurve } from "@/lib/loadVolCurve";
import { loadVolumeBreadthFromStub } from "@/lib/volumeBreadth";
import { loadFishAlerts } from "@/lib/loadFishAlerts";
import { loadExhaustionAlerts } from "@/lib/loadExhaustionAlerts";
import { loadMarketQuotesInitial } from "@/lib/marketQuotes";
import {
  attachSparklines,
  loadCanarySparklines,
} from "@/lib/loadCanarySparklines";

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

/**
 * Natural voice for a new-ish trader. Facts only — Amber ~+0.32, risk-on with
 * Spec OFF, SAFE vol ~0.81. Education only, not buy/sell.
 */
const COMMENTARY = {
  headline: "Amber (~+0.32) — stay in the game, but don’t get cute",
  paragraphs: [
    "The flock light is Amber around S +0.32. That’s not a red flag to hide under the desk — it just means the board isn’t clean enough to size like a Green week. Stay engaged, keep risk tidy.",
    "Behind that: the environment still looks risk-on, but Spec is OFF. Market traffic (A–D) and small caps (SP600) are soft, so treat speculative / high-risk stuff as parked until those heal. Core exposure is fine if your plan allows it.",
    "Fear gauge is calm — VIX/VIX3M around 0.81, SAFE band. Quiet fear is nice, but it isn’t permission to get sloppy.",
    "Education only. Holdings below are the owner book — no position changes called out this week.",
  ],
};

export default async function MembersPage() {
  // Shell-first: sync bundled JSON only — no Yahoo awaits on the critical path.
  const state = loadState();
  const payload = toMembersPayload(state);
  const regime = loadRegimeFromCanaries(
    state.canaries,
    state.sessionDate ?? state.asOf.slice(0, 10)
  );
  const volCurve = loadVolCurve();
  const fishAlerts = loadFishAlerts();
  const exhaustionAlerts = loadExhaustionAlerts();
  const volumeBreadth = loadVolumeBreadthFromStub();
  const marketQuotes = loadMarketQuotesInitial();
  const sparkPayload = await loadCanarySparklines({ live: false });
  const canaries = attachSparklines(payload.canaries, sparkPayload);

  // Best / worst XL sectors for commentary (day %) — from cache only; no live Yahoo.
  const ranked = [...marketQuotes.sectors].filter((s) => s.quote?.changePct != null);
  ranked.sort(
    (a, b) => (b.quote!.changePct ?? -999) - (a.quote!.changePct ?? -999)
  );
  const topSec = ranked[0];
  const worstSec = ranked[ranked.length - 1];
  const topLine =
    topSec && topSec.quote?.changePct != null
      ? `${topSec.symbol} (${topSec.name}) ${topSec.quote.changePct >= 0 ? "+" : ""}${topSec.quote.changePct.toFixed(2)}%`
      : "see XL sector box";
  const worstLine =
    worstSec && worstSec.quote?.changePct != null
      ? `${worstSec.symbol} (${worstSec.name}) ${worstSec.quote.changePct >= 0 ? "+" : ""}${worstSec.quote.changePct.toFixed(2)}%`
      : "see XL sector box";

  const commentary = {
    headline: COMMENTARY.headline,
    paragraphs: [
      COMMENTARY.paragraphs[0],
      COMMENTARY.paragraphs[1],
      COMMENTARY.paragraphs[2],
      `Sectors today: best ${topLine}; worst ${worstLine}. Prefer leaning into the leaders, not the laggards, while we’re still Amber.`,
      COMMENTARY.paragraphs[3],
    ],
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 text-slate-100">
      <LiveTickers initial={marketQuotes} />

      <div className="mt-8">
        <h1 className="text-2xl font-semibold text-white">Canary Trader&apos;s Dashboard</h1>
        <p className="mt-1 text-sm text-slate-400">
          Welcome. This dashboard considers multiple aspects of the US economy
          and is updated daily. For questions, email{" "}
          <a
            href="mailto:shaunleebryant@gmail.com"
            className="text-canary-gold underline decoration-canary-gold/40 underline-offset-2 transition hover:text-yellow-300"
          >
            shaunleebryant@gmail.com
          </a>
        </p>
      </div>

      <div className="mt-8 grid gap-4 lg:grid-cols-[minmax(0,1fr)_240px] lg:items-start">
        <MarketRegime
          data={regime}
          canaryLight={payload.light}
          canaryS={payload.S}
        />

        <div className="rounded-2xl border border-white/10 bg-slate-900/70 p-4 shadow-sm lg:sticky lg:top-4">
          <p className="mb-3 text-center text-[11px] leading-snug text-slate-500">
            Current Canary Composite Score — Green / Amber / Red — before you
            dig into seats.
          </p>
          <TrafficLightDisplay
            light={payload.light}
            S={payload.S}
            asOf={payload.asOf}
            stance={payload.stance}
            size="sm"
            showRange
          />
          <p className="mt-2 text-center text-xs text-slate-500">
            Weights sum {payload.weightSum.toFixed(2)}
            {payload.vetoApplied ? " · green veto applied" : ""}
          </p>
          <p className="mt-1 text-center text-[10px] text-slate-600">
            Bands: Green S≥+0.6 · Amber −0.3≤S&lt;+0.6 · Red S&lt;−0.3
          </p>
        </div>
      </div>

      <section
        id="commentary"
        className="mt-4 rounded-2xl border border-white/10 bg-slate-900/60 p-6 shadow-sm"
      >
        <h2 className="text-sm font-semibold uppercase tracking-widest text-canary-gold">
          Commentary
        </h2>
        <p className="mt-1 text-[11px] uppercase tracking-wide text-slate-500">
          Education only · not buy/sell advice
        </p>
        <p className="mt-4 text-base font-medium leading-snug text-amber-200">
          {commentary.headline}
        </p>
        <div className="mt-4 space-y-3 text-sm leading-relaxed text-slate-300">
          {commentary.paragraphs.map((p) => (
            <p key={p.slice(0, 32)}>{p}</p>
          ))}
        </div>
      </section>

      <VolCurveCanary data={volCurve} />

      <VolumeBreadth data={volumeBreadth} />

      <section className="mt-10">
        <h2 className="text-sm font-semibold uppercase tracking-widest text-canary-gold">
          This week’s alerts
        </h2>
        <p className="mt-1 text-xs leading-snug text-slate-400">
          The owner book, Exhaustion alerts (🥵 daily), and Fish alerts (🙂/🐟 ·
          daily chart · 4H signals) — so you can see how the desk is positioned.
        </p>
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          <article
            id="holdings"
            className="rounded-2xl border border-white/10 bg-slate-900/60 p-4 shadow-sm"
          >
            <h3 className="font-medium text-white">Current Holdings</h3>
            <p className="mt-1 text-[11px] uppercase tracking-wide text-slate-500">
              Ranked by size
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

          <ExhaustionAlerts alerts={exhaustionAlerts} />

          <FishAlerts alerts={fishAlerts} />
        </div>
      </section>

      <div className="mt-8">
        <CanaryTable rows={canaries} emptyNotes={sparkPayload.emptyNotes} />
      </div>

      <XlSectors data={marketQuotes} />

      <DeskIdeas />
      <UnusualOptions />

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
            Personal coaching or a deep dive into each metric? Book an online
            1-on-1 live lesson with Shaun at{" "}
            <span className="font-semibold text-white">S$115/hr</span>, book
            included.
          </p>
          <Link
            href="/tuition"
            className="mt-6 inline-flex items-center justify-center rounded-xl bg-canary-gold px-4 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-yellow-300"
          >
            Book a 1-on-1 lesson →
          </Link>
          <p className="mt-3 text-xs text-slate-500">
            Limited slots. In-person training available in Singapore.
          </p>
        </div>
      </section>
    </div>
  );
}
