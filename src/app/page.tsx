import Image from "next/image";
import { loadState } from "@/lib/loadState";
import { toPublicSnapshot } from "@/lib/composite";
import { TrafficLightDisplay } from "@/components/TrafficLight";
import { HomeVideo } from "@/components/HomeVideo";
import { NewsletterForm } from "@/components/NewsletterForm";
import { HomeScannerTour } from "@/components/HomeScannerTour";
import { ABOUT_PAGE, HOME_SCANNER_TOUR, HOME_TUITION_SECTION, HOME_V3 } from "@/lib/featureFlags";
import { AboutHomeSection } from "@/components/AboutContent";
import { FIRST_100_CAP, accountsEnabled } from "@/lib/members/config";
import { countLaunchMembers, getMembersDb } from "@/lib/members/db";

export const dynamic = "force-dynamic";

export const metadata = {
  alternates: { canonical: "/" },
};

const SITE_URL = "https://canarydashboard.com";

/** Homepage structured data: Organization + WebSite + FAQPage (built from the FAQ that is rendered). */
function homeJsonLd(faq: { q: string; a: string }[]) {
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": `${SITE_URL}/#organization`,
        name: "Canary Dashboard",
        legalName: "CANARY DASHBOARD PTE. LTD.",
        url: SITE_URL,
        logo: { "@type": "ImageObject", url: `${SITE_URL}/icon-512.png`, width: 512, height: 512 },
        email: "shaun@canarydashboard.com",
        address: { "@type": "PostalAddress", addressCountry: "SG" },
      },
      {
        "@type": "WebSite",
        "@id": `${SITE_URL}/#website`,
        name: "Canary Dashboard",
        url: SITE_URL,
        publisher: { "@id": `${SITE_URL}/#organization` },
        inLanguage: "en",
      },
      {
        "@type": "FAQPage",
        "@id": `${SITE_URL}/#faq`,
        mainEntity: faq.map((f) => ({
          "@type": "Question",
          name: f.q,
          acceptedAnswer: { "@type": "Answer", text: f.a },
        })),
      },
    ],
  };
}

const INCLUDED = [
  "Full Dashboard Access",
  "Learning Tools & Quizzes",
  "Weekly Review & Commentary",
  "Invite to Private Community",
  "Stocks Ranking Lists",
  "WhatsApp & Email Support",
];

/** HOME_V3 "Buy our proprietary indicators". url: only real TradingView pages. Fish and Sweaty,
 * Vanna and Charm (owner 2026-10-05) and MFI Washout (owner 2026-10-06) are published and for sale
 * on /indicators; others show "Coming soon". */
const INDICATORS: { name: string; blurb: string; url?: string; cta?: string }[] = [
  {
    name: "Canary RelRSI (Fish and Sweaty)",
    blurb:
      "Puts the same 🙂 🐟 and 🥵 💀 marks from our scanners on your own daily charts, so you can spot sold-off stocks finding their feet and stretched ones getting tired.",
    url: "/indicators#bundle",
  },
  {
    name: "MFI Washout",
    blurb:
      "Puts the 💵 mark from our MFI Scan on your own daily charts, showing when money flow turns back up after the selling looks washed out.",
    url: "/indicators#bundle",
  },
  {
    name: "Market State",
    blurb:
      "The weekly trend read behind our Bullish and Strong list. It shows on your chart whether a stock or index is in a bullish or bearish weekly state, and for how long.",
  },
  // Vanna and Charm Flows: on hold 2026-10-09; owner 2026-10-10 put it back as its OWN listing (not in the
  // bundle): US$99 on its own, free for members.
  {
    name: "Vanna and Charm Flows",
    blurb:
      "Tracks the options calendar: the parts of the month when dealer hedging flows tend to build, and when they fade around monthly expiry. Context, not a signal. Education only.",
    url: "/indicators#vanna-charm",
    cta: "See details · US$99 →",
  },
];

const REVIEWS = [
  {
    quote:
      "...The composite score + Fish list cut my usual scan time by 90%. Very accurate buys assuming good market health regime.",
    name: "Divesh S.",
    meta: "Member · New Zealand",
  },
  {
    quote:
      "Very content with the overall experience. Most look forward to the weekly market update videos where Shaun always addresses questions.",
    name: "Jonathan P.",
    meta: "Member · Brisbane",
  },
  {
    quote:
      "Particularly enjoy the Fish watchlist, I managed to enter $WGS at $38 and sold $95 which is my biggest winner so far.",
    name: "Mark T.",
    meta: "Member · New Zealand",
  },
];

const FAQ = [
  {
    q: "Is this investment advice?",
    a: "No. Education only — market-health readings and process tools. Nothing here is a buy/sell recommendation.",
  },
  {
    q: "Do I need to watch the video first?",
    a: "Yes if you can — that’s what the hero is for. Watch how the dashboard works, then join if the process fits how you trade.",
  },
  {
    q: "What do I get as a member?",
    a: "Full dashboard access, the 13-canary composite and regime view, daily Fish 🐟 and Sweaty 🥵/💀 lists, learning tools, weekly commentary/video Q&A, community, and WhatsApp/email support.",
  },
  {
    q: "How often is the dashboard updated?",
    a: "The canary readings and the scanner lists, including Fish and Sweaty, refresh daily after each US trading day.",
  },
  {
    q: "What are the Fish and Sweaty lists?",
    a: "Educational scan lists. Fish highlights names where momentum may be turning up; Sweaty flags names that look stretched (🥵) or rolling over (💀). They are process tools — not tips or recommendations to buy or sell.",
  },
  {
    q: "What is the first-100 launch lock?",
    a: "The first 100 members pay $600/yr (US$50/mo, billed annually), locked for life while they renew. After the first 100, standard membership is $1,069/yr. You can turn off auto-renew at any time and keep your access until the end of the paid year.",
  },
  {
    q: "Is Stripe checkout live yet?",
    a: "Signup is live as a clear pricing path; Stripe wiring is still being finished. If you want in during launch, start at /signup or email shaun@canarydashboard.com.",
  },
  {
    q: "Can I book the founder?",
    a: "Yes. 1-to-1 online tuition with Shaun at $120 USD/hr for deeper walkthroughs of the metrics. Check availability on the bookings page.",
  },
  {
    q: "Who is this for?",
    a: "Traders who want numbers and a repeatable posture check — composite, regime, and scan lists — instead of trading off headlines.",
  },
];

/** HOME_V3 FAQ (owner 2026-09-28 10:39 PM NZ): tight, distinct questions. Facts only from existing
 * site copy; no weights, thresholds or performance claims. */
const FAQ_V3 = [
  {
    q: "What is Canary Dashboard?",
    a: "A members' dashboard that sums up US market health in one place: a green, amber or red traffic light and a composite score built from 13 market “canaries”, plus scanner lists that rank stocks, sector ETFs and crypto automatically. It's for education, not investment advice.",
  },
  {
    q: "What are the canaries and the composite score?",
    a: "Each canary is a reading on one corner of the market, such as banks, bonds, fear or how many stocks are rising. Each one shows as Healthy, Neutral or Warning, and together they feed the composite score behind the traffic light. Every canary has its own weighting.",
  },
  {
    q: "How often is it updated?",
    a: "Daily. The canary readings and the scanner lists refresh after each US trading day, and members also get a weekly review.",
  },
  {
    q: "Who is it for?",
    a: "Traders and investors who want a repeatable, number-based check on market conditions and a ranked shortlist of setups, instead of trading off headlines. It won't tell you what to buy or sell.",
  },
  {
    q: "What do members get that the free letter doesn't?",
    a: "The free weekly letter gives you one clear reading a week: the light, what the canaries are saying and what would change our mind. Members get the full dashboard and scanner lists, weekly review and commentary, learning tools and quizzes, an invite to the private community, and WhatsApp and email support.",
  },
  {
    q: "What does membership cost?",
    a: "The first 100 members pay $600/yr (US$50/mo, billed annually), locked in for life while they renew. After the first 100, membership is $1,069/yr.",
  },
  {
    q: "Can I cancel?",
    a: "Yes. You can turn off auto-renew at any time and keep your access until the end of the paid year.",
  },
];

/** Same once-sold-out rule as /account and checkout: founding spots are open while
 * active launch members < FIRST_100_CAP. Monthly $99/mo is only shown once they sell out.
 * Defaults to "open" (monthly hidden) if accounts mode is off or the DB is unavailable. */
async function foundingSpotsOpen(): Promise<boolean> {
  if (!accountsEnabled()) return true;
  try {
    return (await countLaunchMembers(await getMembersDb())) < FIRST_100_CAP;
  } catch {
    return true;
  }
}

export default async function HomePage() {
  const launchOpen = await foundingSpotsOpen();
  const faqBase = HOME_V3 ? FAQ_V3 : FAQ;
  const faq = launchOpen
    ? faqBase
    : faqBase.map((f) =>
        f.q === "What is the first-100 launch lock?"
          ? { ...f, a: f.a.replace("standard membership is $1,069/yr.", "standard membership is $1,069/yr, or $99/mo on monthly billing.") }
          : f.q === "What does membership cost?"
            ? { ...f, a: f.a.replace("membership is $1,069/yr.", "membership is $1,069/yr, or $99/mo on monthly billing.") }
            : f,
      );
  const state = loadState();
  const snap = toPublicSnapshot(state);

  // 2. Outcome
  const outcomeSection = (
    <section className="border-t border-white/5">
      <div className="mx-auto max-w-5xl px-4 py-14">
        <p className="text-xs font-semibold uppercase tracking-widest text-canary-gold">
          intuitive and user-friendly interface
        </p>
        <h2 className="mt-2 text-2xl font-semibold text-white">
          Healthy canaries → stay in the market.
          <span className="mt-1 block text-slate-300">
            Dying canaries → get defensive.
          </span>
        </h2>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate-400">
          Easily visualise market health and stocks in real time on one dashboard. Our
          Composite Score considers 13 macroeconomic metrics and ratios, all transparent
          on our dashboard for geeks.
        </p>
        <div className="mt-8 grid gap-3 sm:grid-cols-3">
          {[
            {
              t: "Traffic Light System",
              d: "When all or most metrics (canaries) are healthy, the traffic light turns green, signalling confidence in markets and to stay invested. Cautious for amber, and stay in cash when it’s red.",
            },
            {
              t: "Market Regime",
              d: "This presents a clear picture of whether the market is Risk-On or Risk-Off, and whether it is safe for riskier speculation in small caps.",
            },
            {
              t: "Stock Scanner",
              d: "Using our algorithms and proprietary conditions, our scanner picks and ranks best real-time setups. Tap any box to see how it finds its stocks.",
            },
          ].map((c) => (
            <article
              key={c.t}
              className="rounded-xl border border-white/10 bg-slate-900/50 p-4"
            >
              <h3 className="text-sm font-semibold text-white">{c.t}</h3>
              <p className="mt-2 text-xs leading-relaxed text-slate-400">{c.d}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );

  // 3. Product proof + live score
  const cockpitSection = (
    <section className="border-t border-white/5 bg-slate-900/40">
      <div className="mx-auto max-w-5xl px-4 py-14">
        <div className="grid gap-8 md:grid-cols-2 md:items-start">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-canary-gold">
              A trader&apos;s cockpit
            </p>
            <h2 className="mt-2 text-2xl font-semibold text-white">
              See the dashboard you&apos;re joining.
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-slate-400">
              Our composite score comprises of 13 macroeconomic metrics and ratios of the
              US economy. We call them Canaries. The composite score acts as a guide on
              whether to be in leverage, invested, or sit out completely, like a traffic
              light.
            </p>
            <a
              href="/account/login"
              className="mt-6 inline-block rounded-xl border border-canary-gold/40 px-4 py-2 text-sm font-medium text-canary-gold hover:bg-canary-gold/10"
            >
              Members&apos; Login →
            </a>
          </div>
          <div>
            <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-canary-gold">
              Current Score Preview (LIVE)
            </p>
            <div className="rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur md:p-7">
              <TrafficLightDisplay
                light={snap.light}
                S={snap.S}
                asOf={snap.asOf}
                stance={snap.stance}
                showRange
                compact
              />
            </div>
          </div>
        </div>
        <div className="mt-8 overflow-hidden rounded-2xl border border-white/10 bg-slate-950 shadow-lg">
          <Image
            src="/home/dashboard-top.webp"
            alt="Members dashboard — Risk Guidance column, dashboard tabs and the Main Scanner's Bullish and Bearish Setups"
            width={1280}
            height={824}
            className="h-auto w-full"
            priority={false}
          />
        </div>
      </div>
    </section>
  );

  // Free weekly letter (for visitors not ready to join). One instance only; HOME_V3 moves it up.
  const letterSection = (
  <section id="letter" className="border-t border-white/5">
    <div className="mx-auto max-w-3xl px-4 py-16">
      <div className="rounded-3xl border border-white/10 bg-slate-900/60 px-5 py-10 text-center sm:px-10">
        <p className="text-xs font-semibold uppercase tracking-widest text-canary-gold">
          Free weekly letter
        </p>
        <h2 className="mt-2 text-2xl font-semibold text-white">
          Not ready to join? Get the free weekly letter.
        </h2>
        <p className="mx-auto mt-3 max-w-lg text-sm text-slate-400">
          One clear reading each week: the light, what the canaries are saying, and what
          would change our mind. No ticker tips.
        </p>
        <div className="mt-8">
          <NewsletterForm />
        </div>
      </div>
    </div>
  </section>
  );

  // 10. Final CTA (live version)
  const finalCtaSection = (
  <section className="border-t border-white/5">
    <div className="mx-auto max-w-3xl px-4 py-16 text-center">
      <h2 className="text-2xl font-semibold text-white">Ready to join us?</h2>
      <p className="mx-auto mt-3 max-w-lg text-sm text-slate-400">
        You are still within the launch price of $600/yr ($50/mo, locked for life). Get started today
        or contact shaun@canarydashboard.com with questions.
      </p>
      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        <a
          href="/signup"
          className="rounded-xl bg-canary-gold px-6 py-3 text-sm font-semibold text-slate-950 hover:bg-yellow-400"
        >
          Start membership
        </a>
        <a
          href="/account/login"
          className="rounded-xl border border-white/20 px-6 py-3 text-sm font-medium text-white hover:bg-white/5"
        >
          Log in
        </a>
      </div>
      <p className="mt-8 text-xs leading-relaxed text-slate-500">
        Not investment advice. Nothing here is a recommendation to buy or sell any
        security.
      </p>
    </div>
  </section>
  );

  // HOME_V3: Buy our proprietary indicators (real TradingView links only; none known yet).
  const indicatorsSection = (
    <section id="indicators" className="border-t border-white/5">
      <div className="mx-auto max-w-5xl px-4 py-14">
        <p className="text-xs font-semibold uppercase tracking-widest text-canary-gold">
          TradingView indicators
        </p>
        <h2 className="mt-2 text-2xl font-semibold text-white">Buy our proprietary indicators</h2>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate-400">
          Some of the tools behind the dashboard are also available as indicators for your own
          TradingView charts. They&apos;re there to help you read the chart, not to tell you
          what to buy or sell.
        </p>
        <div className="mt-8 grid gap-4 md:grid-cols-2">
          {INDICATORS.map((ind) => (
            <article
              key={ind.name}
              className="flex flex-col rounded-2xl border border-sky-400/30 bg-slate-900/60 p-5 ring-1 ring-sky-400/10"
            >
              <p className="text-[11px] font-semibold uppercase tracking-widest text-sky-300">
                TradingView
              </p>
              <h3 className="mt-2 text-lg font-semibold text-white">{ind.name}</h3>
              <p className="mt-2 flex-1 text-sm leading-relaxed text-slate-400">{ind.blurb}</p>
              {ind.url ? (
                <a
                  href={ind.url}
                  className="mt-5 inline-block self-start rounded-xl border border-sky-400/50 px-4 py-2 text-sm font-medium text-sky-200 hover:bg-sky-400/10"
                >
                  {ind.cta ?? "See the bundle · US$99 →"}
                </a>
              ) : (
                <span
                  aria-disabled="true"
                  className="mt-5 inline-flex cursor-not-allowed items-center gap-2 self-start rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-sm font-medium text-slate-400"
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-400" aria-hidden />
                  Coming soon
                </span>
              )}
            </article>
          ))}
        </div>
        <p className="mt-4 text-sm font-medium text-canary-amber">
          Canary RelRSI and MFI Washout come together as one bundle: US$99 one-off for both. Free for
          Canary Dashboard members, and you keep them even if you cancel. Vanna and Charm Flows is
          sold separately for US$99, free for members.
        </p>
        <p className="mt-2 text-xs text-slate-500">
          Questions about access? Email{" "}
          <a href="mailto:shaun@canarydashboard.com" className="text-slate-300 underline">
            shaun@canarydashboard.com
          </a>
        </p>
      </div>
    </section>
  );

  // HOME_V3: redesigned "Ready to join us?" (real facts only; $99/mo only once founding spots sell out).
  const joinSectionV3 = (
    <section id="join" className="relative overflow-hidden border-t border-white/5">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage:
            "radial-gradient(ellipse at 50% 0%, rgba(56,189,248,0.22), transparent 60%), radial-gradient(ellipse at 50% 100%, rgba(245,158,11,0.16), transparent 55%)",
        }}
      />
      <div className="relative mx-auto max-w-3xl px-4 py-16 sm:py-20">
        <div className="rounded-3xl bg-gradient-to-br from-sky-400/70 via-sky-500/30 to-amber-500/70 p-[2px] shadow-[0_0_60px_-15px_rgba(56,189,248,0.55)]">
          <div className="rounded-[calc(1.5rem-2px)] bg-slate-950/95 px-5 py-10 text-center sm:px-10 sm:py-12">
            <p className="inline-block rounded-full border border-amber-400/50 bg-amber-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-amber-300">
              {launchOpen ? "First 100 members" : "Membership"}
            </p>
            <h2 className="mt-4 text-3xl font-bold tracking-tight text-white sm:text-4xl">
              Ready to join us?
            </h2>
            {launchOpen ? (
              <>
                <p className="mt-6 flex items-baseline justify-center gap-1">
                  <span className="bg-gradient-to-r from-sky-300 to-amber-300 bg-clip-text text-6xl font-extrabold tracking-tight text-transparent sm:text-7xl">
                    $50
                  </span>
                  <span className="text-xl font-semibold text-slate-300">/mo</span>
                </p>
                <p className="mt-1 text-sm text-slate-300">billed annually ($600/yr)</p>
                <p className="mt-4 inline-flex items-center gap-2 rounded-full bg-sky-400/10 px-4 py-1.5 text-sm font-semibold text-sky-200 ring-1 ring-sky-400/40">
                  <span aria-hidden>🔒</span> Locked in for life
                </p>
                <p className="mx-auto mt-3 max-w-md text-xs text-slate-500">
                  Your rate stays the same for as long as you renew. After the first 100
                  members, membership is $1,069/yr.
                </p>
              </>
            ) : (
              <>
                <p className="mt-6 flex items-baseline justify-center gap-1">
                  <span className="bg-gradient-to-r from-sky-300 to-amber-300 bg-clip-text text-6xl font-extrabold tracking-tight text-transparent sm:text-7xl">
                    $1,069
                  </span>
                  <span className="text-xl font-semibold text-slate-300">/yr</span>
                </p>
                <p className="mt-1 text-sm text-slate-300">or $99/mo billed monthly</p>
              </>
            )}
            <ul className="mx-auto mt-8 grid max-w-lg gap-2 text-left text-sm text-slate-200 sm:grid-cols-2">
              {INCLUDED.map((item) => (
                <li key={item} className="flex items-center gap-2">
                  <span className="text-sky-300" aria-hidden>
                    ✓
                  </span>
                  {item}
                </li>
              ))}
            </ul>
            <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <a
                href="/signup"
                className="w-full rounded-xl bg-canary-gold px-8 py-4 text-base font-bold text-slate-950 shadow-[0_0_30px_-5px_rgba(245,158,11,0.7)] transition hover:bg-amber-400 sm:w-auto"
              >
                {launchOpen ? "Claim your founding spot →" : "Start membership →"}
              </a>
              <a
                href="/account/login"
                className="w-full rounded-xl border border-white/20 px-6 py-4 text-sm font-medium text-white hover:bg-white/5 sm:w-auto"
              >
                Log in
              </a>
            </div>
            <p className="mt-6 text-xs text-slate-500">
              Questions? Email shaun@canarydashboard.com.
            </p>
          </div>
        </div>
        <p className="mt-8 text-center text-xs leading-relaxed text-slate-500">
          Not investment advice. Nothing here is a recommendation to buy or sell any security.
        </p>
      </div>
    </section>
  );

  return (
    <div className="bg-slate-950 text-slate-100">
      <script
        type="application/ld+json"
        // JSON.stringify output with "<" escaped so no string can close the script tag.
        dangerouslySetInnerHTML={{ __html: JSON.stringify(homeJsonLd(faq)).replace(/</g, "\\u003c") }}
      />
      {/* 1. Video-first hero */}
      <section className="relative overflow-hidden bg-gradient-to-b from-slate-900 via-slate-800 to-slate-950 text-white">
        <div
          className="pointer-events-none absolute inset-0 opacity-30"
          style={{
            backgroundImage:
              "radial-gradient(circle at 20% 20%, #eab30833, transparent 40%), radial-gradient(circle at 80% 60%, #22c55e22, transparent 35%)",
          }}
        />
        <div className="relative mx-auto grid max-w-5xl gap-10 px-4 py-12 md:grid-cols-2 md:items-center md:py-16">
          <div>
            <p className="text-sm font-medium uppercase tracking-widest text-canary-gold">
              Favourable Price Condition Alerts
            </p>
            <h1 className="mt-3 text-3xl font-semibold leading-tight tracking-tight md:text-4xl">
              See how Canary Dashboard works, join us if it fits.
            </h1>
            <p className="mt-4 max-w-lg text-sm leading-relaxed text-slate-300">
              Daily dashboard summarizing real-time market health readings, and provide you a
              curated list of tickers and sectors in favourable conditions.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              {/* Owner 2026-10-06 6:27 PM NZ: hero primary button → "Go to Dashboard" (/members).
                  Other "Start membership" buttons further down stay as they are. */}
              <a
                href="/members"
                className="rounded-xl bg-canary-gold px-5 py-3 text-sm font-semibold text-slate-950 hover:bg-yellow-400"
              >
                Go to Dashboard
              </a>
              <a
                href="/account/login"
                className="rounded-xl border border-white/20 bg-white/5 px-5 py-3 text-sm font-medium text-white hover:bg-white/10"
              >
                Log in
              </a>
            </div>
            {/* Owner 2026-10-07 12:44 AM NZ: "Launch promo is currently ON" line removed from the hero (copy only). */}
          </div>
          <HomeVideo />
        </div>
      </section>

      <div className="border-y border-white/5 bg-slate-950/80">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-center gap-x-4 gap-y-2 px-4 py-4 text-center text-xs text-slate-500">
          <span className="font-medium text-slate-300">
            {HOME_V3 ? "Trust Numbers, Not Headlines" : "Trust live numbers, not headlines"}
          </span>
          <span aria-hidden>·</span>
          <span>{HOME_V3 ? "Market Composite" : "Market composite score"}</span>
          <span aria-hidden>·</span>
          <span>{HOME_V3 ? "Daily Updates" : "Daily updates to lists"}</span>
          <span aria-hidden>·</span>
          <span>{HOME_V3 ? "Weekly Videos + Archive" : "Weekly Live Call/Q&A"}</span>
        </div>
      </div>

      {HOME_V3 ? (
        // HOME_V3 (default ON since 2026-09-28 10:15 PM NZ): cockpit, scanner tour, letter signup,
        // indicators. The interface section and "What's included" are removed.
        <>
          {cockpitSection}
          <HomeScannerTour v3 />
          {letterSection}
          {indicatorsSection}
        </>
      ) : HOME_SCANNER_TOUR ? (
        // HOME_SCANNER_TOUR (default ON): cockpit first, then the interface section, then the scanner tour.
        <>
          {cockpitSection}
          {outcomeSection}
          <HomeScannerTour />
        </>
      ) : (
        <>
          {/* 2. Outcome */}
          {outcomeSection}

          {/* 3. Product proof + live score */}
          {cockpitSection}
        </>
      )}

      {/* 4. What's included (removed under HOME_V3) */}
      {HOME_V3 ? null : (
      <section className="border-t border-white/5">
        <div className="mx-auto max-w-5xl px-4 py-14">
          <p className="text-xs font-semibold uppercase tracking-widest text-canary-gold">
            Membership
          </p>
          <h2 className="mt-2 text-2xl font-semibold text-white">What&apos;s included</h2>
          <ul className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {INCLUDED.map((item) => (
              <li
                key={item}
                className="flex items-center gap-2 rounded-xl border border-white/10 bg-slate-900/50 px-4 py-3 text-sm text-slate-200"
              >
                <span className="text-canary-gold">✓</span>
                {item}
              </li>
            ))}
          </ul>
        </div>
      </section>
      )}

      {/* 6. Reviews */}
      <section id="reviews" className="border-t border-white/5">
        <div className="mx-auto max-w-5xl px-4 py-14">
          <p className="text-xs font-semibold uppercase tracking-widest text-canary-gold">
            What members are saying
          </p>
          <h2 className="mt-2 text-2xl font-semibold text-white">
            From traders already on the dashboard.
          </h2>
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {REVIEWS.map((r) => (
              <article
                key={r.name}
                className="flex flex-col rounded-xl border border-white/10 bg-slate-900/50 p-5"
              >
                <p className="text-sm tracking-widest text-canary-gold" aria-hidden>
                  ★★★★★
                </p>
                <p className="mt-3 flex-1 text-sm leading-relaxed text-slate-200">
                  “{r.quote}”
                </p>
                <div className="mt-4 border-t border-white/10 pt-3">
                  <p className="text-sm font-semibold text-white">{r.name}</p>
                  <p className="text-xs text-slate-500">{r.meta}</p>
                </div>
              </article>
            ))}
          </div>
          <p className="mt-4 text-xs text-slate-600">
            Member quotes shared with permission. Past results are not a promise of future
            outcomes.
          </p>
        </div>
      </section>

      {/* 7. Pricing (removed under HOME_V3; the "Ready to join us?" card carries the offer) */}
      {HOME_V3 ? null : (
      <section id="pricing" className="border-t border-white/5 bg-slate-900/40">
        <div className="mx-auto max-w-5xl px-4 py-14">
          <p className="text-xs font-semibold uppercase tracking-widest text-canary-gold">
            Pricing
          </p>
          <h2 className="mt-2 text-2xl font-semibold text-white">
            First 100 members lock lifetime price with no future increases.
          </h2>
          <div className="mt-8 grid gap-4 md:grid-cols-2">
            <article className="rounded-2xl border border-canary-gold/40 bg-gradient-to-b from-amber-500/10 to-slate-950 p-6 ring-1 ring-canary-gold/20">
              <p className="text-xs font-semibold uppercase tracking-widest text-canary-gold">
                First 100
              </p>
              <p className="mt-3 text-3xl font-semibold text-white">
                $600<span className="text-base font-medium text-slate-400">/yr</span>
              </p>
              <p className="mt-2 text-sm text-slate-300">
                Billed annually (US$50/mo) · rate locked for life while you renew
              </p>
              <ul className="mt-4 space-y-1.5 text-sm text-slate-200">
                <li className="flex gap-2">
                  <span className="text-canary-gold">✓</span> Full dashboard + lists
                </li>
                <li className="flex gap-2">
                  <span className="text-canary-gold">✓</span> Weekly commentary
                </li>
                <li className="flex gap-2">
                  <span className="text-canary-gold">✓</span> Learning tools + support
                </li>
              </ul>
              <a
                href="/signup"
                className="mt-6 inline-block rounded-xl bg-canary-gold px-5 py-3 text-sm font-semibold text-slate-950 hover:bg-yellow-400"
              >
                Claim launch rate
              </a>
            </article>
            <article className="rounded-2xl border border-white/10 bg-slate-900/60 p-6">
              <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">
                After 100
              </p>
              <p className="mt-3 text-3xl font-semibold text-white">
                $1,069<span className="text-base font-medium text-slate-400">/yr</span>
              </p>
              <p className="mt-2 text-sm text-slate-400">
                Standard annual · best value (about $89/mo)
              </p>
              {!launchOpen ? (
                <p className="mt-1 text-sm text-slate-400">or $99/mo billed monthly</p>
              ) : null}
              <p className="mt-6 text-sm text-slate-500">
                Still includes the full membership stack.
              </p>
            </article>
          </div>
        </div>
      </section>
      )}

      {HOME_V3 ? null : letterSection}

      {/* 8. FAQ */}
      <section className="border-t border-white/5">
        <div className="mx-auto max-w-3xl px-4 py-14">
          <p className="text-xs font-semibold uppercase tracking-widest text-canary-gold">
            Before you join
          </p>
          <h2 className="mt-2 text-2xl font-semibold text-white">Straight answers.</h2>
          <div className="mt-6 space-y-3">
            {faq.map((f, i) => (
              <details
                key={f.q}
                open={i === 0}
                className="rounded-xl border border-white/10 bg-slate-900/40 px-4 py-3"
              >
                <summary className="cursor-pointer text-sm font-semibold text-white">
                  {f.q}
                </summary>
                <p className="mt-2 text-sm leading-relaxed text-slate-400">{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* HOME_V3: join section comes before tuition (tuition last) */}
      {/* About (owner 2026-10-06): live behind ABOUT_PAGE (default ON). */}
      {ABOUT_PAGE ? <AboutHomeSection /> : null}

      {HOME_V3 ? joinSectionV3 : null}

      {/* 9. Tuition (HOME_V3: hidden unless HOME_TUITION_SECTION) */}
      {HOME_V3 && !HOME_TUITION_SECTION ? null : (
      <section className="border-t border-white/5 bg-slate-900/40">
        <div className="mx-auto flex max-w-5xl flex-col gap-8 px-4 py-14 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:gap-6">
            <div className="relative h-28 w-28 shrink-0 overflow-hidden rounded-2xl border border-canary-gold/30 shadow-lg ring-1 ring-white/10 sm:h-32 sm:w-32">
              <Image
                src="/home/shaun-tuition.jpg"
                alt="Shaun Lee Bryant, founder of Canary Dashboard"
                width={640}
                height={640}
                className="h-full w-full object-cover object-top"
              />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-canary-gold">
                Bookings
              </p>
              <h2 className="mt-2 text-2xl font-semibold text-white">
                Book a 1-to-1 Online Session
              </h2>
              <p className="mt-1 text-sm font-medium text-slate-200">
                Shaun Lee Bryant · Founder
              </p>
              <p className="mt-2 max-w-xl text-sm text-slate-400">
                Live online 1-on-1 ·{" "}
                <span className="font-medium text-white">$120 USD/hr</span> · dig into
                the metrics that run the dashboard.
              </p>
            </div>
          </div>
          <a
            href="/bookings"
            className="inline-block shrink-0 rounded-xl border border-white/20 px-5 py-3 text-center text-sm font-medium text-white hover:bg-white/5"
          >
            Check availability →
          </a>
        </div>
      </section>
      )}

      {HOME_V3 ? null : finalCtaSection}
    </div>
  );
}
