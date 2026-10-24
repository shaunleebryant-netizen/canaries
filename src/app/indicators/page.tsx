import {
  BUNDLE_PRICE_LINE,
  INDICATOR_BUNDLE,
  INDICATOR_PRODUCTS,
  MEMBERS_FREE_LINE,
  MEMBERS_FREE_LINE_ONE,
  SEPARATE_ACCESS_LINE,
  SEPARATE_INDICATORS,
  SUPPORT_EMAIL,
  type IndicatorProduct,
} from "@/lib/indicatorCatalog";

// Owner 2026-10-09 (ships Sat 10 Oct): one bundle (Canary RelRSI + MFI Washout), US$99 one-off. Amber (#f59e0b), never yellow.
// Owner 2026-10-10: Vanna & Charm back as its OWN listing, outside the bundle: US$99 on its own, free for members.

export const metadata = {
  alternates: { canonical: "/indicators" },
  title: "Indicators",
  description:
    "Two TradingView indicators from Canary Dashboard, sold together as one bundle: Canary RelRSI (Time to Fish or Getting Sweaty) and MFI Washout. US$99 one-off for both, free for Canary Dashboard members (you keep them even if you cancel), lifetime email support. Vanna & Charm Flows is sold separately for US$99, free for members. Education only.",
};

const BUY_STEPS = [
  {
    n: "01",
    title: "Tell us your TradingView username",
    body: "These are invite-only scripts, so access is added to your TradingView username. We also need your email for the receipt.",
  },
  {
    n: "02",
    title: "Pay once",
    body: "US$99 one-off for the bundle of both indicators. Free for Canary Dashboard members, who keep them even if they cancel. Card payments are being set up now.",
  },
  {
    n: "03",
    title: "Open it on your chart",
    body: "Once access is added, find it under Invite-only scripts in your TradingView indicators list and add it to a daily chart.",
  },
];

const FAQ = [
  {
    q: "Do I need a paid TradingView plan?",
    a: "No. Invite-only scripts can be added on any TradingView account, including the free plan.",
  },
  {
    q: "Can I buy just one?",
    a: "No. Canary RelRSI and MFI Washout come as one bundle, US$99 one-off for both. They're built to be read side by side on the same chart.",
  },
  {
    q: "I'm a member. What happens if I cancel?",
    a: "You keep both indicators. Access stays on your TradingView username.",
  },
  {
    q: "Which timeframe?",
    a: "All our indicators are built for the daily chart.",
  },
  {
    q: "Is Vanna & Charm Flows part of the bundle?",
    a: "No. The bundle is the two indicators, Canary RelRSI and MFI Washout. Vanna & Charm Flows is sold separately for US$99 one-off, free for Canary Dashboard members (you keep it even if you cancel).",
  },
  {
    q: "What support do I get?",
    a: `Lifetime email support at ${SUPPORT_EMAIL}. Send questions or ideas, and we'll keep improving them together.`,
  },
  {
    q: "Is this financial advice?",
    a: "No. These are chart tools for education. They don't tell you what to buy or sell, and past marks don't promise future results.",
  },
];

export default function IndicatorsPage() {
  return (
    <div className="bg-slate-950 text-slate-100">
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-white/5 bg-gradient-to-b from-slate-900 via-slate-800 to-slate-950">
        <div className="relative mx-auto max-w-5xl px-4 py-14 md:py-16">
          <p className="text-sm font-medium uppercase tracking-widest text-canary-amber">TradingView indicators</p>
          <h1 className="mt-3 max-w-2xl text-4xl font-semibold leading-tight tracking-tight text-white md:text-5xl">
            The dashboard&apos;s marks, on your own charts
          </h1>
          <p className="mt-5 max-w-xl text-base leading-relaxed text-slate-300">
            Two of the reads behind Canary Dashboard, as TradingView indicators you can put on any
            chart you open. They come together as one bundle. Vanna &amp; Charm Flows is sold
            separately for US$99, free for members. Read what each one does, look at it on TradingView, then decide.
          </p>
          <p className="mt-4 inline-flex items-center gap-2 rounded-full border border-canary-amber/40 bg-canary-amber/10 px-3 py-1 text-sm font-medium text-canary-amber">
            Both indicators · {BUNDLE_PRICE_LINE} · {MEMBERS_FREE_LINE}
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <a
              href="#catalog"
              className="rounded-xl bg-canary-amber px-5 py-3 text-sm font-semibold text-slate-950 hover:bg-amber-400"
            >
              See the indicators
            </a>
            <a
              href="/signup"
              className="rounded-xl border border-white/20 bg-white/5 px-5 py-3 text-sm font-medium text-white hover:bg-white/10"
            >
              See the dashboard
            </a>
          </div>
        </div>
      </section>

      {/* Trust strip */}
      <section className="border-b border-white/5 bg-slate-900/50">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-center gap-x-6 gap-y-2 px-4 py-4 text-xs font-medium uppercase tracking-wider text-slate-400">
          <span>TradingView invite-only</span>
          <span className="text-slate-600">·</span>
          <span>2 indicators, 1 bundle · US$99 one-off</span>
          <span className="text-slate-600">·</span>
          <span className="text-canary-amber">Free for members</span>
          <span className="text-slate-600">·</span>
          <span>Lifetime email support</span>
          <span className="text-slate-600">·</span>
          <span className="text-canary-amber">Education only</span>
        </div>
      </section>

      {/* Catalog */}
      <section id="catalog" className="border-b border-white/5">
        <div className="mx-auto max-w-6xl px-4 py-14">
          <div className="grid gap-6 md:grid-cols-2">
            {INDICATOR_PRODUCTS.map((p) => (
              <IndicatorCard key={p.id} p={p} />
            ))}
          </div>

          {/* The bundle: the only thing for sale. */}
          <div
            id="bundle"
            className="mt-8 scroll-mt-24 rounded-2xl border border-canary-amber/50 bg-canary-amber/10 p-6 md:flex md:items-center md:justify-between md:gap-8"
          >
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-canary-amber">The bundle</p>
              <h2 className="mt-2 text-xl font-semibold text-white">{INDICATOR_PRODUCTS.map((p) => p.name.split(":")[0]).join(" + ")}</h2>
              <p className="mt-2 text-sm text-slate-300">
                Both invite-only TradingView scripts on your username, with lifetime email support.
              </p>
              <p className="mt-3 text-sm font-medium text-canary-amber">{MEMBERS_FREE_LINE}</p>
            </div>
            <div className="mt-5 shrink-0 md:mt-0 md:text-right">
              <p className="text-3xl font-semibold text-white">
                {INDICATOR_BUNDLE.priceLabel} <span className="text-sm font-normal text-slate-400">one-off for both</span>
              </p>
              <a
                href={`/indicators/buy?script=${INDICATOR_BUNDLE.id}`}
                className="mt-4 inline-block rounded-xl bg-canary-amber px-5 py-3 text-center text-sm font-semibold text-slate-950 hover:bg-amber-400"
              >
                Buy the bundle · {INDICATOR_BUNDLE.priceLabel}
              </a>
            </div>
          </div>

          {/* Listed on its own, outside the bundle (owner 2026-10-10). No price until confirmed. */}
          {SEPARATE_INDICATORS.length ? (
            <div className="mt-12">
              <p className="text-xs font-semibold uppercase tracking-widest text-sky-300">Also on TradingView · sold separately</p>
              <div className="mt-4 grid gap-6 md:grid-cols-2">
                {SEPARATE_INDICATORS.map((p) => (
                  <IndicatorCard key={p.id} p={p} />
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </section>

      {/* How buying works */}
      <section className="border-b border-white/5 bg-slate-900/40">
        <div className="mx-auto max-w-5xl px-4 py-14">
          <p className="text-center text-xs font-semibold uppercase tracking-widest text-canary-amber">How buying works</p>
          <div className="mt-8 grid gap-6 md:grid-cols-3">
            {BUY_STEPS.map((s) => (
              <div key={s.n} className="rounded-2xl border border-white/10 bg-slate-950/60 p-6">
                <p className="font-mono text-sm text-canary-amber">{s.n}</p>
                <h3 className="mt-2 text-lg font-semibold text-white">{s.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-400">{s.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
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
  return (
    <article
      id={p.id}
      className="flex flex-col rounded-2xl border border-white/10 bg-slate-900/60 p-6 shadow-sm"
    >
      <p className="text-[11px] font-semibold uppercase tracking-widest text-sky-300">
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
        {p.separate ? (
          <>
            <p className="text-2xl font-semibold text-white">
              {p.priceLabel} <span className="text-sm font-normal text-slate-400">one-off</span>
            </p>
            <p className="mt-1 text-xs font-medium text-canary-amber">{SEPARATE_ACCESS_LINE}</p>
            <p className="mt-1 text-xs text-slate-400">{MEMBERS_FREE_LINE_ONE}</p>
          </>
        ) : (
          <p className="text-xs font-medium text-canary-amber">Included in the bundle · {BUNDLE_PRICE_LINE}</p>
        )}
        <a
          href={p.tradingViewUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 block rounded-xl border border-sky-400/50 px-4 py-2.5 text-center text-sm font-medium text-sky-200 hover:bg-sky-400/10"
        >
          View on TradingView →
        </a>
        {p.separate ? (
          <a
            href={`/indicators/buy?script=${p.id}`}
            className="mt-3 block rounded-xl bg-canary-amber px-4 py-2.5 text-center text-sm font-semibold text-slate-950 hover:bg-amber-400"
          >
            Buy {p.name.split(" Flows")[0]} · {p.priceLabel}
          </a>
        ) : null}
      </div>
      <p className="mt-4 inline-flex self-start rounded-full bg-white/5 px-3 py-1 text-[11px] text-slate-400 ring-1 ring-white/10">
        Education only · not a buy/sell tip
      </p>
    </article>
  );
}
