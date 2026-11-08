import Image from "next/image";
import aboutExamples from "../../data/about-examples.json";
import { FOUNDING_BENEFITS } from "@/lib/foundingBenefits";

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
  kind: "fish" | "smile" | "mfi" | "sweat" | "skull" | "fairy";
  markDate: string;
  sameDay: ("fish" | "smile" | "mfi" | "sweat" | "skull" | "fairy")[];
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
  sweat: { emoji: "🥵", label: "Getting Sweaty" },
  skull: { emoji: "💀", label: "Rolling over" },
  fairy: { emoji: "🧚", label: "Fairy Godmother" },
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

function FoundingMembers({ launchOpen }: { launchOpen: boolean }) {
  return (
    <section
      id="founding"
      className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-sky-400/60 via-sky-500/20 to-amber-500/60 p-[2px]"
    >
      <div className="rounded-[calc(1.5rem-2px)] bg-slate-950/95 px-5 py-8 sm:px-8 sm:py-10">
        <h2 className="text-3xl font-bold tracking-tight text-white">
          {launchOpen ? "Join us and be among our Founding Members" : "Join Canary Dashboard"}
        </h2>
        {launchOpen ? (
          <>
            <p className="mt-4 font-medium text-white">
              US$35/month, billed annually (US$420) · Not subject to future price increases
            </p>
            <p className="mt-1 text-sm text-slate-400">
              (Less than TradingView Premium&apos;s US${TV_PREMIUM.annualPerMonth.toFixed(2)}/month)
            </p>
            <ul className="mt-5 space-y-2">
              {FOUNDING_BENEFITS.map((item) => (
                <Bullet key={item}>{item}</Bullet>
              ))}
            </ul>
          </>
        ) : (
          <p className="mt-4">
            Founding spots have sold out, thank you to everyone who backed us early. Membership is open at the standard
            rate, and members still get our indicators free.
          </p>
        )}
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
          <div className="aspect-[4/5] w-28 overflow-hidden sm:w-36 md:mx-auto rounded-2xl border border-white/10 bg-slate-900 shadow-lg md:w-full">
            <Image
              src="/about/shaun-portrait-2026b.webp"
              alt="Shaun Lee Bryant, founder of Canary Dashboard"
              width={800}
              height={1000}
              priority
              sizes="(min-width: 768px) 220px, 112px"
              className="h-full w-full object-cover object-[50%_20%]"
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
      </div>

      <div className="mx-auto max-w-3xl space-y-12 px-4 pt-12 pb-14 text-base leading-relaxed text-slate-300">
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
