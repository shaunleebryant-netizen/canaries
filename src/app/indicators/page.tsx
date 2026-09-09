import { IndicatorBuyButton } from "@/components/IndicatorBuyButton";

export const metadata = {
  title: "Indicators · Coherant Canary",
  description:
    "Proprietary TradingView Pine indicators built for the same flock logic as Coherant Canary. Education only.",
};

const PRODUCTS = [
  {
    id: "canary-breadth-pane",
    name: "Canary Breadth Pane",
    tagline: "See participation, not just the index print",
    measures:
      "Breadth / % above averages under the headline index — participation, not just the print.",
    bestUsed: "When indexes look strong but you suspect thin leadership or a soft underbelly.",
    pairsWith: "Members weekly light · Leadership Quality Meter",
    includes: "TradingView invite · setup notes PDF · update access (stub)",
    price: "Price TBD · one-time (Stripe stub)",
  },
  {
    id: "risk-on-ratio-ribbon",
    name: "Risk-On Ratio Ribbon",
    tagline: "Risk appetite as a ribbon, not a guess",
    measures:
      "Risk-on vs defensive posture on the chart — appetite as a ribbon, not a guess.",
    bestUsed: "When narrative flips week to week and you need a chart-side posture check.",
    pairsWith: "Members weekly light · Fragility Guard",
    includes: "TradingView invite · setup notes PDF · update access (stub)",
    price: "Price TBD · one-time (Stripe stub)",
  },
  {
    id: "fragility-guard",
    name: "Fragility Guard (VIX/yield stress)",
    tagline: "Stress on the edge before it hits the light",
    measures:
      "VIX / yield stress context that can flag fragility even when composites still look calm.",
    bestUsed: "Around rate shocks, vol spikes, or when Danger Above 5 style stress matters.",
    pairsWith: "Members weekly light · Risk-On Ratio Ribbon",
    includes: "TradingView invite · setup notes PDF · update access (stub)",
    price: "Price TBD · one-time (Stripe stub)",
  },
  {
    id: "leadership-quality-meter",
    name: "Leadership Quality Meter",
    tagline: "Who is carrying the market — and how cleanly",
    measures:
      "Leadership quality and concentration — who is carrying the market, and how cleanly.",
    bestUsed: "When a handful of names dominate returns and you want quality of leadership, not noise.",
    pairsWith: "Members weekly light · Canary Breadth Pane",
    includes: "TradingView invite · setup notes PDF · update access (stub)",
    price: "Price TBD · one-time (Stripe stub)",
  },
];

const BUY_STEPS = [
  {
    n: "01",
    title: "Request invite",
    body: "Design mode stores interest; pay when priced (Stripe in production, owner keys).",
  },
  {
    n: "02",
    title: "Receive access",
    body: "TradingView invite after purchase / fulfill (owner fulfills).",
  },
  {
    n: "03",
    title: "Drop on chart",
    body: "Add the Pine tool to your charts. Education frame only — not a tip sheet.",
  },
];

const FAQ = [
  {
    q: "Works on free TradingView?",
    a: "Most scripts run on free plans; some features may need a paid TV tier. Exact matrix TBD.",
  },
  {
    q: "Refunds?",
    a: "Policy TBD. Design mode — no purchases processed.",
  },
  {
    q: "Do I get updates?",
    a: "Update access planned with each invite; versioning later.",
  },
  {
    q: "Is this financial advice?",
    a: "No. Education only — not recommendations to buy or sell any security.",
  },
];

function ChartPlaceholder({ name }: { name: string }) {
  return (
    <div
      className="relative flex h-40 items-center justify-center overflow-hidden rounded-xl border border-dashed border-white/20 bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900"
      aria-hidden
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-40"
        style={{
          backgroundImage:
            "radial-gradient(circle at 30% 40%, #eab30822, transparent 45%), linear-gradient(transparent 0, transparent 48%, #22c55e18 49%, transparent 51%)",
        }}
      />
      <div className="relative text-center">
        <p className="text-xs uppercase tracking-widest text-canary-gold">Chart placeholder</p>
        <p className="mt-1 text-sm text-slate-400">{name}</p>
        <p className="mt-2 font-mono text-[10px] text-slate-600">GIF / screenshot later</p>
      </div>
    </div>
  );
}

export default function IndicatorsPage() {
  return (
    <div className="bg-slate-950 text-slate-100">
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-white/5 bg-gradient-to-b from-slate-900 via-slate-800 to-slate-950">
        <div
          className="pointer-events-none absolute inset-0 opacity-30"
          style={{
            backgroundImage:
              "radial-gradient(circle at 20% 20%, #eab30833, transparent 40%), radial-gradient(circle at 80% 60%, #22c55e22, transparent 35%)",
          }}
        />
        <div className="relative mx-auto max-w-5xl px-4 py-16 md:py-20">
          <p className="text-sm font-medium uppercase tracking-widest text-canary-gold">
            Proprietary Pine tools
          </p>
          <h1 className="mt-3 max-w-2xl text-4xl font-semibold leading-tight tracking-tight text-white md:text-5xl">
            Indicators that speak canary
          </h1>
          <p className="mt-5 max-w-xl text-base leading-relaxed text-slate-300">
            Chart tools built for the same flock logic as Coherant Canary — clarity on the chart,
            not noise.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <a
              href="#catalog"
              className="rounded-xl bg-canary-gold px-5 py-3 text-sm font-semibold text-slate-950 hover:bg-yellow-400"
            >
              Browse indicators
            </a>
            <a
              href="/members"
              className="rounded-xl border border-white/20 bg-white/5 px-5 py-3 text-sm font-medium text-white hover:bg-white/10"
            >
              Members get the weekly light
            </a>
          </div>
        </div>
      </section>

      {/* Trust strip */}
      <section className="border-b border-white/5 bg-slate-900/50">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-center gap-x-6 gap-y-2 px-4 py-4 text-xs font-medium uppercase tracking-wider text-slate-400">
          <span>TradingView</span>
          <span className="text-slate-600">·</span>
          <span>Pine Script</span>
          <span className="text-slate-600">·</span>
          <span>Works with your existing charts</span>
          <span className="text-slate-600">·</span>
          <span className="text-canary-gold">Education only</span>
        </div>
      </section>

      {/* Catalog */}
      <section id="catalog" className="border-b border-white/5">
        <div className="mx-auto max-w-5xl px-4 py-16">
          <h2 className="text-3xl font-semibold text-white">Catalog</h2>
          <p className="mt-2 max-w-2xl text-sm text-slate-400">
            Real product names &amp; prices TBD — placeholders below for design review only. No
            invented live prices.
          </p>
          <div className="mt-10 grid gap-6 md:grid-cols-2">
            {PRODUCTS.map((p) => (
              <article
                key={p.id}
                id={p.id}
                className="flex flex-col rounded-2xl border border-white/10 bg-slate-900/60 p-6 shadow-sm"
              >
                <h3 className="text-xl font-semibold text-white">{p.name}</h3>
                <p className="mt-1 text-sm text-canary-gold">{p.tagline}</p>
                <div className="mt-4">
                  <ChartPlaceholder name={p.name} />
                </div>
                <dl className="mt-5 space-y-3 text-sm">
                  <div>
                    <dt className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                      What it measures
                    </dt>
                    <dd className="mt-1 text-slate-300">{p.measures}</dd>
                  </div>
                  <div>
                    <dt className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Best used when…
                    </dt>
                    <dd className="mt-1 text-slate-300">{p.bestUsed}</dd>
                  </div>
                  <div>
                    <dt className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Pairs with
                    </dt>
                    <dd className="mt-1 text-slate-300">{p.pairsWith}</dd>
                  </div>
                  <div>
                    <dt className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Includes
                    </dt>
                    <dd className="mt-1 text-slate-300">{p.includes}</dd>
                  </div>
                </dl>
                <p className="mt-4 text-sm font-medium text-white">{p.price}</p>
                <div className="mt-4 space-y-2">
                  <IndicatorBuyButton productId={p.id} />
                  <a
                    href="/members"
                    className="block rounded-xl border border-white/15 px-4 py-2.5 text-center text-sm font-medium text-slate-200 hover:bg-white/5"
                  >
                    See members dashboard
                  </a>
                </div>
                <p className="mt-4 inline-flex self-start rounded-full bg-white/5 px-3 py-1 text-[11px] text-slate-400 ring-1 ring-white/10">
                  Education only · not a buy/sell tip
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* How buying works */}
      <section className="border-b border-white/5 bg-slate-900/40">
        <div className="mx-auto max-w-5xl px-4 py-16">
          <p className="text-center text-xs font-semibold uppercase tracking-widest text-canary-gold">
            How buying works
          </p>
          <h2 className="mt-3 text-center text-3xl font-semibold text-white">Three steps</h2>
          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {BUY_STEPS.map((s) => (
              <article
                key={s.n}
                className="rounded-2xl border border-white/10 bg-slate-950/60 p-6"
              >
                <p className="font-mono text-sm text-canary-gold">{s.n}</p>
                <h3 className="mt-2 text-lg font-semibold text-white">{s.title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-slate-400">{s.body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Members cross-sell */}
      <section className="border-b border-white/5">
        <div className="mx-auto max-w-3xl px-4 py-16 text-center">
          <p className="text-xs font-semibold uppercase tracking-widest text-canary-gold">
            Members
          </p>
          <h2 className="mt-3 text-2xl font-semibold text-white">
            Already on the weekly light?
          </h2>
          <p className="mt-4 text-sm leading-relaxed text-slate-400">
            Members:{" "}
            <span className="font-semibold text-white">US$50/mo</span> (production Stripe). Some
            indicators may bundle or discount later — stub until owner confirms.
          </p>
          <a
            href="/members"
            className="mt-8 inline-block rounded-xl border border-white/20 px-5 py-3 text-sm font-medium text-white hover:bg-white/5"
          >
            Members dashboard · US$50/mo stub
          </a>
        </div>
      </section>

      {/* FAQ */}
      <section className="border-b border-white/5 bg-slate-900/40">
        <div className="mx-auto max-w-3xl px-4 py-16">
          <p className="text-center text-xs font-semibold uppercase tracking-widest text-canary-gold">
            FAQ
          </p>
          <h2 className="mt-3 text-center text-3xl font-semibold text-white">Questions</h2>
          <dl className="mt-10 space-y-4">
            {FAQ.map((item) => (
              <div
                key={item.q}
                className="rounded-2xl border border-white/10 bg-slate-950/50 p-5"
              >
                <dt className="font-medium text-white">{item.q}</dt>
                <dd className="mt-2 text-sm leading-relaxed text-slate-400">{item.a}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* Final CTA */}
      <section>
        <div className="mx-auto max-w-3xl px-4 py-20 text-center">
          <h2 className="text-3xl font-semibold text-white">Clarity on the chart</h2>
          <p className="mt-4 text-sm text-slate-400">
            Browse the catalog (prices TBD), or join members for the weekly traffic light.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <a
              href="#catalog"
              className="rounded-xl bg-canary-gold px-6 py-3 text-sm font-semibold text-slate-950 hover:bg-yellow-400"
            >
              Browse indicators
            </a>
            <a
              href="/members"
              className="rounded-xl border border-white/20 px-6 py-3 text-sm font-medium text-white hover:bg-white/5"
            >
              Members · US$50/mo
            </a>
          </div>
          <p className="mt-10 text-xs leading-relaxed text-slate-500">
            Education only — not investment advice. Nothing here is a recommendation to buy or sell
            any security. Design-mode preview: checkout and invites are stubbed.
          </p>
        </div>
      </section>
    </div>
  );
}
