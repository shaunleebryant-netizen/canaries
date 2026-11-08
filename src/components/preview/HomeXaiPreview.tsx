/* eslint-disable @next/next/no-img-element */
import type { ReactNode } from "react";
import { ToolsTabs } from "@/components/preview/ToolsTabs";
import { HomeSubscribeBox, HomeVideo } from "@/components/HomeVideo";
import { CanariesTerm } from "@/components/CanariesTerm";
import { FOUNDING_BENEFITS } from "@/lib/foundingBenefits";
import { ChartBackdrop, CoalmineBackdrop, SparkleField } from "@/components/home/SectionBackdrops";
import aboutExamples from "../../../data/about-examples.json";

/**
 * LIVE homepage — Into-The-Cryptoverse-style layout (owner 2026-10-25), rendered at `/` via
 * src/app/page.tsx (and /preview/home). Copy pass + Fish examples section owner-approved 2026-10-26.
 * Layout feel only from ITC; all copy, facts and images are Canary's own. Education only.
 */

function Opener({ eyebrow, title, sub }: { eyebrow: string; title: string; sub?: string }) {
  return (
    <div className="mx-auto max-w-2xl text-center">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-canary-gold">{eyebrow}</p>
      <h2 className="mt-4 text-3xl font-bold tracking-tight text-white md:text-4xl">{title}</h2>
      {sub ? <p className="mt-4 text-base text-slate-400">{sub}</p> : null}
    </div>
  );
}

function Section({ id, children, alt = false, bg }: { id?: string; children: ReactNode; alt?: boolean; bg?: ReactNode }) {
  return (
    <section id={id} className={`relative overflow-hidden ${alt ? "bg-slate-900/40" : ""}`}>
      {bg}
      <div className="relative mx-auto max-w-6xl px-4 py-20 md:py-28">{children}</div>
    </section>
  );
}

const BENEFITS: { icon: string; t: string; d: ReactNode }[] = [
  { icon: "🚦", t: "Market Composite Score", d: <>Thirteen market <CanariesTerm /> roll up into one green, amber or red light for US market health, updated after every US trading day.</> },
  { icon: "🔎", t: "Scanners & Setups", d: "Ranked scanner lists across stocks, sector ETFs and crypto — canary readings and lists refresh after each US session." },
  { icon: "🧪", t: "Backtest our indicators", d: "Members can fully backtest each emoji mark for historical results — see prices after past Fish, Smiley, MFI and Sweaty prints." },
  { icon: "✉️", t: "Email Alerts (Setups)", d: "A weekly email with top bullish and bearish setups from the scanners, charted with their marks, plus a short market read. Education, not tips." },
  { icon: "📈", t: "Proprietary indicators", d: "Members get access to our proprietary TradingView indicators — the same marks we use on the dashboard — on their own charts." },
  { icon: "🤝", t: "Community & support", d: "Private community, weekly commentary and Q&A, plus WhatsApp and email support." },
];

const TOOLS = [
  { tab: "Cockpit", t: "Members cockpit", d: "Traffic light, regime and today’s scanner lists on one screen.", src: "/home/preview/members-top-green.png?v=nobang" },
  { tab: "Risk Guide", t: "Decide · traffic light", d: "Risk-On, Cautious or Risk-Off at a glance, with the math on how the score is weighted and derived.", src: "/home/preview/decide-regime-green.png?v=nobang" },
  { tab: "Insiders", t: "Insider buying", d: "Open-market insider buys from SEC Form 4 filings, updated daily.", src: "/home/preview/insiders-buying.png" },
  { tab: "Backtest", t: "Backtest", d: "Past Fish, Smiley, MFI and Fairy marks. Forward columns are the percent change after 3, 5 or 10 trading sessions.", src: "/home/preview/backtest-marks.png?v=green" },
  { tab: "Crypto", t: "Crypto charts", d: "Bitcoin and Ethereum daily charts with the same Canary marks — Fish, Smiley and the rest — shown on the dashboard.", src: "/home/preview/crypto-btc-eth.png" },
  { tab: "Alerts", t: "Alerts", d: "Get alerts via email as a stock in your watchlist prints an emoji.", src: "/home/preview/alerts-email.png" },
  { tab: "Warnings", t: "Sweaty stocks 🥵", d: "Names stretched versus their own history, with 💀 when momentum rolls over.", src: "/home/preview/sweaty-stocks.png" },
];

const MARKS = [
  { i: "🙂", t: "Smiley", d: "Time to look closely, in overcooked zone." },
  { i: "🐟", t: "Time to Fish", d: "Relative momentum washed out starting to recover." },
  { i: "💵", t: "MFI Washout", d: "Money-flow reading at a washed-out extreme and recovering." },
  { i: "🥵", t: "Getting Sweaty", d: "Price stretched versus its own history." },
  { i: "💀", t: "Rolling over", d: "A stretched name that has momentum rolling over." },
  { i: "🧚", t: "Fairy Godmother", d: "Canary's proprietary bottoming indicator" },
];

/* Fish example charts (owner 2026-10-26): same facts + images as About's Recent examples. */
const EX_MARK: Record<string, string> = { fish: "🐟 Fish", smile: "🙂 Smiley", mfi: "💵 MFI Washout", sweat: "🥵 Getting Sweaty", skull: "💀 Rolling over", fairy: "🧚 Fairy Godmother" };
const exDate = (d: string) =>
  new Date(`${d}T12:00:00Z`).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });
const exUsd = (n: number) => `$${n.toFixed(2)}`;
const exPct = (n: number) => `${n >= 0 ? "+" : ""}${n.toFixed(1)}%`;

export const HOME_FAQ = [
  { q: "What is Canary Dashboard?", a: "A members' dashboard that sums up US market health in one place: a traffic light and composite score built from 13 market canaries, plus scanner lists for education and study. Not investment advice — and it won’t tell you what to buy or sell." },
  { q: "How often is it updated?", a: "Daily. Canary readings and scanner lists refresh after each US trading day, and members also get a weekly review." },
  { q: "Who is it for?", a: "People who want a repeatable, number-based check on market conditions instead of reacting to headlines. Education only." },
  { q: "Can I cancel?", a: "Yes. Turn off auto-renew at any time and keep your access until the end of the paid year." },
];

export function HomeXaiPreview() {
  return (
    <div className="bg-slate-950 text-slate-100">

      {/* A. Hero */}
      <section className="relative overflow-hidden">
        {/* Background chart with emoji marks — faded so copy stays readable */}
        <div aria-hidden className="pointer-events-none absolute inset-0 bg-cover bg-center opacity-[0.55]"
          style={{ backgroundImage: "url(/home/hero-chart.webp)" }} />
        <div aria-hidden className="pointer-events-none absolute inset-0"
          style={{ background: "linear-gradient(90deg, rgba(2,6,23,0.85) 0%, rgba(2,6,23,0.15) 45%, rgba(2,6,23,0.6) 100%), linear-gradient(180deg, rgba(2,6,23,0.45) 0%, transparent 25%, transparent 70%, rgb(2,6,23) 100%)" }} />
        <div aria-hidden className="pointer-events-none absolute inset-0 opacity-40"
          style={{ backgroundImage: "radial-gradient(circle at 25% 0%, rgba(234,179,8,0.18), transparent 45%)" }} />
        <div className="relative mx-auto grid max-w-6xl gap-12 px-4 pb-20 pt-16 md:grid-cols-2 md:items-center md:pb-28 md:pt-24">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-canary-gold">Canary Dashboard</p>
            <h1 className="mt-5 text-4xl font-bold tracking-tight text-white md:text-6xl md:leading-[1.05]">
              Trust numbers, not headlines.
            </h1>
            <p className="mt-5 max-w-md text-lg leading-relaxed text-slate-400">
              Your daily risk traffic light, market health, stock and crypto conditions screener and more.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <a href="/account/signup" className="rounded-xl bg-canary-gold px-6 py-3 text-sm font-semibold text-slate-950 hover:bg-amber-300">Create a free account</a>
              <a href="/indicators" className="rounded-xl border border-white/20 px-6 py-3 text-sm font-medium text-white hover:bg-white/5">Indicators</a>
            </div>
          </div>
          <HomeVideo />
        </div>
      </section>

      {/* B. Benefits 3x2 */}
      <Section id="benefits" alt bg={<CoalmineBackdrop side="right" />}>
        <Opener eyebrow="Trader Cockpit" title="Everything you need in One Dashboard." />
        <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {BENEFITS.map((b) => (
            <div key={b.t} className="rounded-2xl border border-white/10 bg-slate-950 p-7">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-canary-gold/10 text-2xl">{b.icon}</div>
              <h3 className="mt-5 text-lg font-semibold text-white">{b.t}</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-400">{b.d}</p>
            </div>
          ))}
        </div>
      </Section>

      {/* C. Closer look */}
      {/* Owner 2026-11-02 (t979u): soft chart backdrop + faint gold glow, quieter than Subscribe/Membership. */}
      <Section
        id="tools"
        bg={
          <>
            <ChartBackdrop opacity={0.15} />
            <SparkleField />
            <div aria-hidden className="pointer-events-none absolute inset-0"
              style={{ background: "radial-gradient(ellipse 50% 40% at 50% 0%, rgba(234,179,8,0.10), transparent 70%), linear-gradient(180deg, rgba(2,6,23,0.6) 0%, transparent 30%, transparent 70%, rgba(2,6,23,0.8) 100%)" }} />
          </>
        }
      >
        <Opener eyebrow="Features" title="Take a closer look." sub="See what the dashboard looks like" />
        <ToolsTabs tools={TOOLS} />
      </Section>

      {/* C2. Fish examples (owner 2026-10-26; from About). Owner 2026-11-02 (t936u): NU no longer full-width; 6 equal cards, TEM added. */}
      <Section id="examples" alt bg={<><div aria-hidden className="pointer-events-none absolute inset-0" style={{ background: "radial-gradient(ellipse 45% 35% at 50% 0%, rgba(234,179,8,0.09), transparent 70%), radial-gradient(ellipse 30% 30% at 90% 85%, rgba(234,179,8,0.05), transparent 70%)" }} /><SparkleField /></>}>
        <Opener eyebrow="Examples" title="Recent examples" sub="" />
        <div className="mt-14 grid gap-6 md:grid-cols-2">
          {aboutExamples.examples.map((e, i) => {
            const marks = (e.sameDay.length ? e.sameDay : [e.kind]).map((k) => EX_MARK[k] ?? k).join(" + ");
            const lead = i === 0;
            return (
              <figure key={e.ticker} className="overflow-hidden rounded-2xl border border-white/10 bg-slate-950">
                <img src={e.image} alt={`${e.ticker} daily chart: ${marks} on ${exDate(e.markDate)} at ${exUsd(e.priceAtMark)}`} loading={lead ? "eager" : "lazy"} className="h-auto w-full" />
                <figcaption className="space-y-1 px-5 py-4 text-sm text-slate-300">
                  <p className="font-semibold text-white">{e.ticker} · {marks}</p>
                  <p>
                    Marked {exDate(e.markDate)} at {exUsd(e.priceAtMark)}. Close {exUsd(e.lastClose)} ({exDate(e.lastDate)}):{" "}
                    <span className={`font-semibold ${e.pctNow < 0 ? "text-rose-400" : "text-emerald-400"}`}>{exPct(e.pctNow)}</span> in {e.sessionsNow} sessions.
                  </p>
                </figcaption>
              </figure>
            );
          })}
        </div>
        <p className="mx-auto mt-8 max-w-3xl text-center text-xs leading-relaxed text-slate-500">
          Education only. Past readings don&apos;t promise future results. Nothing here is a recommendation to buy or sell any security.
        </p>
      </Section>

      {/* C3. Subscribe (owner 2026-11-02 t975u): moved here from the hero. */}
      <Section
        id="subscribe"
        bg={
          <>
            <CoalmineBackdrop side="left" />
            <div aria-hidden className="pointer-events-none absolute inset-0"
              style={{ background: "radial-gradient(ellipse 55% 60% at 50% 50%, rgba(234,179,8,0.14), transparent 70%), linear-gradient(180deg, rgba(15,23,42,0.9) 0%, rgba(2,6,23,0.4) 50%, rgba(15,23,42,0.9) 100%)" }} />
            <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-canary-gold/40 to-transparent" />
            <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-canary-gold/40 to-transparent" />
          </>
        }
      >
        <div className="mx-auto max-w-xl">
          <HomeSubscribeBox className="shadow-[0_0_60px_-10px_rgba(234,179,8,0.35)] backdrop-blur-sm bg-slate-950/90" />
        </div>
      </Section>

      {/* D. Marks */}
      <Section id="marks" bg={<ChartBackdrop opacity={0.25} />}>
        <Opener eyebrow="Chart marks" title="Know what every mark means." sub="Scanner marks are process labels for study, not buy or sell tips." />
        <div className="mx-auto mt-14 grid max-w-4xl gap-x-10 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
          {MARKS.map((m) => (
            <div key={m.t} className="flex gap-4">
              <span className="text-3xl leading-none">{m.i}</span>
              <div>
                <h3 className="font-semibold text-white">{m.t}</h3>
                <p className="mt-1 text-sm text-slate-400">{m.d}</p>
              </div>
            </div>
          ))}
        </div>
        <p className="mt-10 text-center text-sm">
          <a href="/indicators" className="text-canary-gold hover:underline">View indicators page →</a>
        </p>
      </Section>

      {/* E. Pricing + FAQ */}
      <Section id="join" bg={<CoalmineBackdrop side="left" />}>
        <div className="mx-auto max-w-3xl rounded-3xl bg-gradient-to-br from-sky-400/60 via-sky-500/20 to-amber-500/60 p-[2px]">
          <div className="rounded-[calc(1.5rem-2px)] bg-slate-950/95 px-5 py-8 text-left sm:px-10 sm:py-10">
            <h2 className="text-3xl font-bold tracking-tight text-white">
              Join us and be among our Founding Members
            </h2>
            <p className="mt-3 text-sm font-semibold text-white">Limited free access</p>
            <p className="mt-4 font-medium text-white">
              US$35/month, billed annually (US$420) · Not subject to future price increases
            </p>
            <p className="mt-1 text-sm text-slate-400">
              Founding monthly is US$70/mo, the secondary option. After the first 100: US$99/mo or US$1,069/yr.
            </p>
            <ul className="mt-5 space-y-2 text-sm text-slate-200">
              {FOUNDING_BENEFITS.map((item) => (
                <li key={item} className="flex gap-2">
                  <span className="text-canary-gold" aria-hidden>✓</span> {item}
                </li>
              ))}
            </ul>
            <div className="mt-6 grid gap-3 text-sm sm:grid-cols-2">
              <div className="rounded-xl border border-white/10 p-3">
                <p className="font-semibold text-white">Free account</p>
                <ul className="mt-2 space-y-1 text-slate-400">
                  <li>Limited free access</li>
                  <li>ETF tab and ETF charts</li>
                  <li>Read-only Decide overview</li>
                  <li>Optional notes, off unless you tick the box. No charge.</li>
                </ul>
              </div>
              <div className="rounded-xl border border-canary-gold/30 p-3">
                <p className="font-semibold text-white">Paid membership</p>
                <p className="mt-2 text-slate-300">The founding benefits above, including the full dashboard.</p>
              </div>
            </div>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <a href="/account/signup" className="w-full rounded-xl bg-canary-gold px-8 py-4 text-center text-base font-bold text-slate-950 shadow-[0_0_30px_-5px_rgba(245,158,11,0.7)] transition hover:bg-amber-400 sm:w-auto">
                Create a free account
              </a>
              <a href="/signup" className="w-full rounded-xl border border-white/20 px-6 py-4 text-center text-sm font-medium text-white hover:bg-white/5 sm:w-auto">
                Founding annual · US$35/mo
              </a>
            </div>
          </div>
        </div>
        <div className="mx-auto mt-20 max-w-3xl">
          <h3 className="text-center text-2xl font-bold text-white">Questions</h3>
          <div className="mt-8 divide-y divide-white/10 border-y border-white/10">
            {HOME_FAQ.map((f) => (
              <details key={f.q} className="group py-5">
                <summary className="cursor-pointer list-none font-medium text-white">{f.q}</summary>
                <p className="mt-3 text-sm leading-relaxed text-slate-400">{f.a}</p>
              </details>
            ))}
          </div>
          <p className="mt-8 text-center text-xs leading-relaxed text-slate-500">
            Education only. Not investment advice. Nothing here is a recommendation to buy or sell any security.
          </p>
        </div>
      </Section>
    </div>
  );
}
