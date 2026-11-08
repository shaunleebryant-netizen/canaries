import { IndicatorsHeroBackdrop } from "@/components/home/SectionBackdrops";
import {
  INDICATOR_PRODUCTS,
  MEMBERS_FREE_LINE_ONE,
  SUPPORT_EMAIL,
  type IndicatorProduct,
} from "@/lib/indicatorCatalog";

// Owner 2026-10-27: no bundle — each indicator US$99 one-off; free for members. Amber accents only on CTAs / price chips, not the trust strip.

export const metadata = {
  alternates: { canonical: "/indicators" },
  title: "Indicators",
  description:
    "TradingView scripts from Canary Dashboard: RelRSI, MFI Washout, and Vanna & Charm — US$99 one-time payment each, free for members. Education only.",
};

const FAQ = [
  {
    q: "How does buying work?",
    a: (
      <>
        Pick one or more indicators, then enter your TradingView username (scripts are invite-only) and an email for the receipt. Pay once by card on Stripe — US$99 per script,{" "}
        <strong className="font-semibold text-slate-200">free for members.</strong>
      </>
    ),
  },
  {
    q: "Where do I find it after paying?",
    a: "In TradingView under Invite-only scripts. Open it on a daily chart.",
  },
  {
    q: "Do I need a paid TradingView plan?",
    a: "No. Invite-only scripts work on the free TradingView plan.",
  },
  {
    q: "Can I buy more than one?",
    a: "Yes. You may want to consider signing up for our dashboard. Members get all indicators free with a minimum 1-year membership.",
  },
  {
    q: "I'm a member. What happens if I cancel?",
    a: "You keep the indicators. Access stays on your TradingView username.",
  },
  {
    q: "Which timeframe?",
    a: "These indicators are designed to be used on Daily chart only.",
  },
  {
    q: "How do I get support?",
    a: `You can direct any questions on the dashboard or indicators to ${SUPPORT_EMAIL}`,
  },
  ];

export default function IndicatorsPage() {
  return (
    <div className="bg-slate-950 text-slate-100">
      <section className="relative overflow-hidden border-b border-white/5 bg-gradient-to-b from-slate-900 via-slate-800 to-slate-950">
        <IndicatorsHeroBackdrop />
        <div className="relative mx-auto max-w-5xl px-4 py-14 md:py-16">
          <p className="text-sm font-medium uppercase tracking-widest text-canary-amber">TradingView indicators</p>
          <h1 className="mt-3 max-w-2xl text-4xl font-semibold leading-tight tracking-tight text-white md:text-5xl">
            Use my indicators on your Tradingview Charts
          </h1>
          <p className="mt-5 max-w-xl text-base leading-relaxed text-slate-300">
            I enjoyed the months spent creating and optimising these indicators, backtesting and applying
            them across hundreds of tickers to ensure they remain reliable. With community feedback, I will
            continue to update them even after your purchase. You keep the indicator and email support forever.
          </p>
          <p className="mt-4 inline-flex items-center gap-2 rounded-full border border-canary-amber/40 bg-canary-amber/10 px-3 py-1 text-sm font-medium text-canary-amber">
            Included free with a 1-year membership.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <a
              href="#catalog"
              className="rounded-xl bg-canary-amber px-5 py-3 text-sm font-semibold text-slate-950 hover:bg-amber-400"
            >
              Browse indicators
            </a>
            <a
              href="/indicators/buy"
              className="rounded-xl border border-white/20 bg-white/5 px-5 py-3 text-sm font-medium text-white hover:bg-white/10"
            >
              Buy now
            </a>
          </div>
        </div>
      </section>

      {/* Trust strip — one colour so it doesn't look half-white / half-amber */}
      <section className="border-b border-white/5 bg-slate-900/50">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-center gap-x-6 gap-y-2 px-4 py-4 text-xs font-medium uppercase tracking-wider text-slate-400">
          <span>TradingView invite-only</span>
          <span className="text-slate-600">·</span>
          <span>US$99 one-time payment</span>
          <span className="text-slate-600">·</span>
          <span>Free for members</span>
          <span className="text-slate-600">·</span>
          <span>Lifetime email support</span>
          <span className="text-slate-600">·</span>
          <span>Education only</span>
        </div>
      </section>

      <section id="catalog" className="border-b border-white/5">
        <div className="mx-auto max-w-6xl px-4 py-14">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {INDICATOR_PRODUCTS.map((p) => (
              <IndicatorCard key={p.id} p={p} />
            ))}
          </div>
        </div>
      </section>

      <section>
        <div className="mx-auto max-w-3xl px-4 py-14">
          <h2 className="text-2xl font-semibold text-white">Questions</h2>
          <dl className="mt-6 space-y-5">
            {FAQ.map((f) => (
              <div key={f.q} className="rounded-xl border border-white/10 bg-slate-900/50 p-5">
                <dt className="font-medium text-white">{f.q}</dt>
                <dd className="mt-2 text-sm leading-relaxed text-slate-400">{f.a}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>
    </div>
  );
}

function IndicatorCard({ p }: { p: IndicatorProduct }) {
  const shortName = p.name.split(":")[0].replace(" Flows and Window of Weakness", "").trim();
  return (
    <article
      id={p.id}
      className="flex flex-col rounded-2xl border border-white/10 bg-slate-900/60 p-6 shadow-sm"
    >
      <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-400">
        TradingView · {p.timeframe}
      </p>
      <h2 className="mt-2 text-xl font-semibold text-white">{p.name}</h2>
      <p className="mt-1 text-sm text-canary-amber">{p.tagline}</p>
      <a
        href={p.tradingViewUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-4 block overflow-hidden rounded-xl border border-white/10"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={p.image} alt={p.imageAlt} width={1200} height={606} loading="lazy" className="h-auto w-full" />
      </a>
      <p className="mt-4 text-sm leading-relaxed text-slate-300">{p.helpsYou}</p>
      {p.quote ? (
        <blockquote className="mt-4 border-l-2 border-canary-amber/70 pl-3 text-sm italic leading-relaxed text-amber-100/90">
          &ldquo;{p.quote}&rdquo;
        </blockquote>
      ) : null}
      <ul className="mt-4 space-y-2 text-sm text-slate-300">
        {p.bullets.map((b) => (
          <li key={b} className="flex gap-2">
            <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-sky-400" aria-hidden />
            <span>{b}</span>
          </li>
        ))}
      </ul>
      <p className="mt-4 text-xs text-slate-400">
        Lifetime email support:{" "}
        <a href={`mailto:${SUPPORT_EMAIL}`} className="text-slate-200 underline">
          {SUPPORT_EMAIL}
        </a>
      </p>
      <div className="mt-auto pt-5">
        <p className="text-2xl font-semibold text-white">
          {p.priceLabel} <span className="text-sm font-normal text-slate-400">one-time</span>
        </p>
        <p className="mt-1 text-xs text-slate-400">{MEMBERS_FREE_LINE_ONE}</p>
        <a
          href={p.tradingViewUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 block rounded-xl border border-white/20 px-4 py-2.5 text-center text-sm font-medium text-slate-200 hover:bg-white/5"
        >
          View on TradingView →
        </a>
        <a
          href={`/indicators/buy?script=${p.id}`}
          className="mt-3 block rounded-xl bg-canary-amber px-4 py-2.5 text-center text-sm font-semibold text-slate-950 hover:bg-amber-400"
        >
          Buy {shortName} · {p.priceLabel}
        </a>
      </div>
      <p className="mt-4 inline-flex self-start rounded-full bg-white/5 px-3 py-1 text-[11px] text-slate-400 ring-1 ring-white/10">
        Education only
      </p>
    </article>
  );
}
