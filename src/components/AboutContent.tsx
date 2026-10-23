import Image from "next/image";
import aboutExamples from "../../data/about-examples.json";

/** Owner 2026-10-06 6:11 PM NZ: one paragraph under "Built for Snipers." */
export const ABOUT_SHORT = [
  "Looking at dozens of charts daily, I needed an easier way to interpret the market's health and screen for stocks with my indicators. Now, I simply wait for alerts in the dashboard and wait for setups to come to me. I want that same convenience for you too.",
];

/** Homepage "From the Founder" section (amber-suit headshot). */
export function AboutHomeSection() {
  return (
    <section id="about" className="border-t border-white/5">
      <div className="mx-auto grid max-w-5xl gap-8 px-4 py-16 md:grid-cols-[160px_1fr] md:items-center">
        <div className="mx-auto w-36 overflow-hidden rounded-2xl border border-white/10 bg-slate-900 md:w-full">
          <Image
            src="/about/shaun-headshot-3x4.webp"
            alt="Shaun Lee Bryant, founder of Canary Dashboard"
            width={600}
            height={800}
            sizes="160px"
            className="h-auto w-full"
          />
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-canary-gold">From the Founder</p>
          <h2 className="mt-2 text-2xl font-semibold text-white">Built for Snipers.</h2>
          <div className="mt-3 space-y-3 text-sm leading-relaxed text-slate-400">
            {ABOUT_SHORT.map((p) => (
              <p key={p.slice(0, 20)}>{p}</p>
            ))}
          </div>
          <a
            href="/about"
            className="mt-5 inline-block rounded-xl border border-canary-gold/40 px-4 py-2 text-sm font-medium text-canary-gold hover:bg-canary-gold/10"
          >
            Read more about us →
          </a>
        </div>
      </div>
    </section>
  );
}

function Bullet({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex gap-2">
      <span className="mt-2.5 h-1.5 w-1.5 shrink-0 rounded-full bg-canary-gold" aria-hidden />
      <span>{children}</span>
    </li>
  );
}

/* ---------- Owner 2026-10-10: expanded About (method, recent examples, founding members) ---------- */

type Stat = { n: number; hitPct: number; avgPct: number; medianPct: number; down10Pct: number; worstPct: number };
type Example = {
  ticker: string;
  name: string;
  kind: "fish" | "smile" | "mfi";
  markDate: string;
  sameDay: ("fish" | "smile" | "mfi")[];
  priceAtMark: number;
  lastDate: string;
  lastClose: number;
  pctNow: number;
  sessionsNow: number;
  peakDate: string;
  peakClose: number;
  pctPeak: number;
  sessionsPeak: number;
  image: string;
};
const ABOUT = aboutExamples as unknown as {
  asOf: string;
  record: { horizonSessions: number; windowStart: string; asOf: string; all: Stat; fish: Stat; smile: Stat; mfi: Stat };
  examples: Example[];
};

const MARK: Record<Example["kind"], { emoji: string; label: string }> = {
  fish: { emoji: "🐟", label: "Fish" },
  smile: { emoji: "🙂", label: "Washout (Smiley)" },
  mfi: { emoji: "💵", label: "MFI Washout" },
};

/** "2026-09-28" → "28 Sep 2026" (unambiguous in any locale). */
function niceDate(iso: string): string {
  const [y, m, d] = iso.split("-");
  const mon = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][Number(m) - 1];
  return `${Number(d)} ${mon} ${y}`;
}
const usd2 = (n: number) => `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const signed = (n: number, dp = 1) => `${n >= 0 ? "+" : ""}${n.toFixed(dp)}%`;

/** TradingView Premium, checked on tradingview.com/pricing on 10 Oct 2026 (USD). */
const TV_PREMIUM = { annualPerMonth: 59.95, annualTotal: 719.4, monthly: 69.95, checked: "10 Oct 2026" };

function SectionKicker({ children }: { children: React.ReactNode }) {
  return <h2 className="text-xs font-semibold uppercase tracking-widest text-canary-gold">{children}</h2>;
}

function MarkCard({ emoji, title, children }: { emoji: string; title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-5">
      <p className="flex items-center gap-2 text-base font-semibold text-white">
        <span aria-hidden className="text-xl">
          {emoji}
        </span>
        {title}
      </p>
      <div className="mt-2 space-y-2 text-sm leading-relaxed text-slate-300">{children}</div>
    </div>
  );
}

function HowItWorks() {
  return (
    <section id="how-it-works" className="space-y-5">
      <SectionKicker>How it works</SectionKicker>
      <h3 className="text-2xl font-semibold text-white">Relative RSI, not plain RSI</h3>
      <p>
        I want to be open about the maths, because you should know what you&apos;re looking at. Most RSI tools ask
        one question: is the stock&apos;s RSI below 30? The trouble is that 30 means very different things for
        different stocks. A steady, slow-moving name can go years without touching it, while a fast-moving tech stock
        drops through it every few months. A fixed line fires all the time on some stocks and almost never on others.
      </p>
      <p>
        So the main calculation behind our Fish and Smiley marks is <strong className="text-white">Relative RSI</strong>{" "}
        (we call it RelRSI). We start with the stock&apos;s normal RSI, then rank today&apos;s reading against that
        same stock&apos;s own RSI readings over a long stretch of its history. The result is a percentile from 0 to
        100. A RelRSI of 3 means today&apos;s RSI is lower than about 97% of that stock&apos;s past readings. A stock
        only gets flagged when it&apos;s unusually stretched <em>for that stock</em>, not just because it crossed a
        one-size-fits-all line.
      </p>
      <p>
        To be clear about what it isn&apos;t: RelRSI compares a stock with its own past, not with the S&amp;P 500. For
        the market as a whole we use a separate read, the Canaries and Risk Guidance (a composite of 13 macroeconomic
        metrics) at the top of the dashboard. The marks tell you which names are stretched; Risk Guidance tells you
        whether the backdrop supports taking a trade at all.
      </p>
      <div className="grid gap-4 md:grid-cols-3">
        <MarkCard emoji="🙂" title="Washout (Smiley)">
          <p>Selling looks worn out. RelRSI has just dropped into the bottom of the stock&apos;s usual range.</p>
          <p className="text-slate-400">
            It prints once, on the day it crosses in, not every day it stays down there.
          </p>
        </MarkCard>
        <MarkCard emoji="🐟" title="Fish">
          <p>
            A sold-off name starting to find its feet. RelRSI has reached the deepest part of its range, about as
            stretched as that stock ever gets.
          </p>
          <p className="text-slate-400">
            Repeat marks are held back for a few sessions after a mark. Only a stronger Fish can print again inside
            that window.
          </p>
        </MarkCard>
        <MarkCard emoji="💵" title="MFI Washout (v6.1)">
          <p>
            Money Flow Index is like RSI weighted by volume, so it shows whether real money is leaving or coming back.
            The 💵 needs a deep money-flow washout, a volume climax followed by quieter volume, and MFI hooking back up.
          </p>
          <p className="text-slate-400">
            New in v6.1: a 🐟 or 🙂 must also have printed in the last few sessions. Price stretch and money flow have
            to agree, which makes it the rarest of the three.
          </p>
        </MarkCard>
      </div>
      <p className="text-sm text-slate-400">
        These are the same calculations as our Canary RelRSI and MFI Washout indicators on TradingView. The dashboard
        runs them on every stock in our universe after each US close, so you don&apos;t have to open 200 charts.
      </p>
    </section>
  );
}

function RecentExamples() {
  const { record, examples } = ABOUT;
  const r = record;
  return (
    <section id="examples" className="space-y-5">
      <SectionKicker>Recent examples</SectionKicker>
      <h3 className="text-2xl font-semibold text-white">What a good mark can look like</h3>
      <p>
        These are real marks from our own signal history, drawn on daily charts with the exact mark-day close. I picked
        them because they show the idea clearly, so they&apos;re among the best, not typical. The numbers below the
        charts show the full record.
      </p>
      <div className="grid gap-6 md:grid-cols-2">
        {examples.map((e, i) => {
          const marks = e.sameDay.length ? e.sameDay : [e.kind];
          const lead = i === 0; // NU, the most recent, runs full width
          return (
            <figure
              key={e.ticker}
              className={`overflow-hidden rounded-2xl border bg-slate-900/60 ${lead ? "border-canary-gold/40 md:col-span-2" : "border-white/10"}`}
            >
              <Image
                src={e.image}
                alt={`${e.ticker} daily chart: ${marks.map((k) => MARK[k].label).join(" and ")} on ${niceDate(e.markDate)} at ${usd2(e.priceAtMark)}, then ${signed(e.pctNow)} to ${usd2(e.lastClose)} by ${niceDate(e.lastDate)}`}
                width={1920}
                height={1080}
                sizes={lead ? "(min-width: 1024px) 992px, 100vw" : "(min-width: 1024px) 488px, (min-width: 768px) 45vw, 100vw"}
                priority={lead}
                className="h-auto w-full"
              />
              <figcaption className="space-y-1 px-4 py-3 text-sm text-slate-300">
                <p className="font-semibold text-white">
                  {e.ticker} · {marks.map((k) => `${MARK[k].emoji} ${MARK[k].label}`).join(" + ")}
                </p>
                <p>
                  Marked {niceDate(e.markDate)} at {usd2(e.priceAtMark)}. Last close {usd2(e.lastClose)} (
                  {niceDate(e.lastDate)}):{" "}
                  <span className="font-semibold text-emerald-400">{signed(e.pctNow)}</span> in {e.sessionsNow} sessions.
                  {e.pctPeak > e.pctNow + 0.5 ? (
                    <>
                      {" "}
                      Peak close {usd2(e.peakClose)} on {niceDate(e.peakDate)} ({signed(e.pctPeak)}, {e.sessionsPeak}{" "}
                      sessions).
                    </>
                  ) : null}
                </p>
              </figcaption>
            </figure>
          );
        })}
      </div>

      <div
        id="record"
        className="scroll-mt-20 rounded-2xl border border-amber-500/30 bg-amber-500/5 p-5 text-sm leading-relaxed text-slate-300"
      >
        <p className="font-semibold text-white">Not every mark works</p>
        <p className="mt-2">
          Across every 🐟, 🙂 and 💵 mark on stocks in our signal history from {niceDate(r.windowStart)} to{" "}
          {niceDate(r.asOf)}, <strong className="text-white">{Math.round(r.all.hitPct)}%</strong> closed higher{" "}
          {r.horizonSessions} sessions later ({r.all.n.toLocaleString("en-US")} marks). The average move was{" "}
          {signed(r.all.avgPct)} and the median {signed(r.all.medianPct)}. By mark: 💵 MFI Washout{" "}
          {Math.round(r.mfi.hitPct)}% higher, average {signed(r.mfi.avgPct)} ({r.mfi.n} marks); 🐟 Fish{" "}
          {Math.round(r.fish.hitPct)}%, {signed(r.fish.avgPct)} ({r.fish.n}); 🙂 Smiley {Math.round(r.smile.hitPct)}%,{" "}
          {signed(r.smile.avgPct)} ({r.smile.n}).
        </p>
        <p className="mt-2">
          That means about 4 in 10 marks were lower {r.horizonSessions} sessions later. About{" "}
          {Math.round(r.all.down10Pct)}% fell 10% or more, and the worst fell {Math.abs(r.all.worstPct).toFixed(0)}%. This
          history was rebuilt by running today&apos;s rules over past prices, then extended each night, and it covers a
          mostly rising market. Members can check every mark and the move since in the{" "}
          <a href="/members?tab=backtest" className="text-canary-gold underline">
            Backtest tab
          </a>
          .
        </p>
        <p className="mt-2 text-xs text-slate-400">
          Education only. Past examples and past results don&apos;t guarantee future results. Nothing here is a
          recommendation to buy or sell any security.
        </p>
      </div>
    </section>
  );
}

function FoundingMembers({ launchOpen }: { launchOpen: boolean }) {
  return (
    <section
      id="founding"
      className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-sky-400/60 via-sky-500/20 to-amber-500/60 p-[2px]"
    >
      <div className="rounded-[calc(1.5rem-2px)] bg-slate-950/95 px-5 py-8 sm:px-8 sm:py-10">
        <h2 className="text-3xl font-bold tracking-tight text-white">
          {launchOpen ? "Become a founding member" : "Join Canary Dashboard"}
        </h2>
        {launchOpen ? (
          <>
            <p className="mt-4 font-medium text-white">
              First 100 only · US$50/month, billed annually (US$600) · locked for life while you renew
            </p>
            <p className="mt-1 text-sm text-slate-400">
              Less than TradingView Premium (US${TV_PREMIUM.annualPerMonth.toFixed(2)}/mo billed annually, checked Oct 2026)
            </p>
            <ul className="mt-5 space-y-2">
              <Bullet>Indicators free (RelRSI, MFI Washout, Vanna &amp; Charm)</Bullet>
              <Bullet>First access to new tools</Bullet>
              <Bullet>A say in what we build</Bullet>
              <Bullet>Your rate never rises (while renewing)</Bullet>
            </ul>
          </>
        ) : (
          <p className="mt-4">
            Founding spots have sold out, thank you to everyone who backed us early. Membership is open at the standard
            rate, and members still get our indicators free.
          </p>
        )}
        <p className="mt-5 text-xs text-slate-500">Education only — we sell tools, not trading profits.</p>
        <div className="mt-5 flex flex-col gap-3 sm:flex-row">
          <a
            href="/signup"
            className="w-full rounded-xl bg-canary-gold px-8 py-4 text-center text-base font-bold text-slate-950 shadow-[0_0_30px_-5px_rgba(245,158,11,0.7)] transition hover:bg-amber-400 sm:w-auto"
          >
            {launchOpen ? "Claim your founding spot →" : "Start membership →"}
          </a>
        </div>
      </div>
    </section>
  );
}

/** /about page body (owner-approved 2026-10-06, amber-suit portrait; expanded 2026-10-10). */
export function AboutPageBody({ launchOpen = true }: { launchOpen?: boolean }) {
  return (
    <div className="bg-slate-950 text-slate-100">
      <section className="border-b border-white/5 bg-gradient-to-b from-slate-900 via-slate-800 to-slate-950">
        <div className="mx-auto grid max-w-5xl gap-10 px-4 py-14 md:grid-cols-[220px_1fr] md:items-center md:py-20">
          <div className="mx-auto aspect-[4/5] w-44 overflow-hidden rounded-2xl border border-white/10 bg-slate-900 shadow-lg md:w-full">
            <Image
              src="/about/shaun-portrait.webp"
              alt="Shaun Lee Bryant, founder of Canary Dashboard"
              width={800}
              height={1200}
              priority
              sizes="(min-width: 768px) 220px, 176px"
              className="h-full w-full object-cover object-[50%_15%]"
            />
          </div>
          <div>
            <p className="text-sm font-medium uppercase tracking-widest text-canary-gold">From the Founder</p>
            <h1 className="mt-3 text-4xl font-semibold leading-tight tracking-tight text-white md:text-5xl">
              Shaun Lee Bryant
            </h1>
            <p className="mt-4 max-w-xl text-base leading-relaxed text-slate-300">
              Technology can be a trader&apos;s best friend when utilised well. Being a numbers person, I created
              Canary Dashboard initially as a personal project, but interest in it grew quickly with fellow traders.
              Our dashboard is now constantly improved within our community to optimise the decision-making process
              in trading. We are always looking for new ways to improve our dashboard, so don&apos;t hesitate to
              reach out with any questions or feedback.
            </p>
            <div className="mt-6 flex flex-wrap gap-2 text-sm">
              <a href="#how-it-works" className="rounded-lg border border-white/15 px-3 py-1.5 text-slate-200 hover:bg-white/5">
                How it works
              </a>
              <a href="#examples" className="rounded-lg border border-white/15 px-3 py-1.5 text-slate-200 hover:bg-white/5">
                Recent examples
              </a>
              <a
                href="#founding"
                className="rounded-lg border border-canary-gold/40 px-3 py-1.5 font-medium text-canary-gold hover:bg-canary-gold/10"
              >
                {launchOpen ? "Founding members" : "Membership"}
              </a>
            </div>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-3xl space-y-12 px-4 pt-14 text-base leading-relaxed text-slate-300">
        <section>
          <SectionKicker>Why I built Canary Dashboard</SectionKicker>
          <p className="mt-3">
            Most money in trading is made while doing nothing. But when exactly would we know to do nothing, or to
            take the trade? That dilemma is precisely why I created this dashboard. I wanted one place to check
            every day how healthy the market is, and which stocks have the best setups. Before, that meant lots of
            guesswork. Now, members are only alerted to stocks that meet specific requirements worth having a look
            at. This has worked well for me, and I hope the same for you.
          </p>
        </section>

        <section>
          <SectionKicker>Our mission</SectionKicker>
          <p className="mt-3">
            To give traders a dashboard where they can filter out the stocks with the best setups. It draws from a
            curated universe of around 200 stocks, so the lists stay focused.
          </p>
        </section>
      </div>

      <div className="mx-auto max-w-5xl space-y-14 px-4 py-14 text-base leading-relaxed text-slate-300">
        <HowItWorks />
        <RecentExamples />
      </div>

      <div className="mx-auto max-w-3xl space-y-12 px-4 pb-14 text-base leading-relaxed text-slate-300">
        <FoundingMembers launchOpen={launchOpen} />

        <section>
          <SectionKicker>Coming soon</SectionKicker>
          <ul className="mt-3 space-y-2">
            <Bullet>An app, so the dashboard is easier to use on the go.</Bullet>
            <Bullet>Personalised notifications.</Bullet>
            <Bullet>More indicators and services, as members ask for them.</Bullet>
          </ul>
        </section>

        <section className="rounded-2xl border border-white/10 bg-slate-900/60 p-6">
          <h2 className="text-lg font-semibold text-white">Tell me what you think</h2>
          <p className="mt-3">
            I&apos;d love your feedback. Send it through the{" "}
            <a href="/support" className="text-canary-gold underline">
              support page
            </a>
            .
          </p>
        </section>

        <p className="text-center text-xs leading-relaxed text-slate-500">
          Education only. Not investment advice. Nothing here is a recommendation to buy or sell any security.
        </p>
      </div>
    </div>
  );
}
