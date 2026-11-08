import { TuitionForm } from "@/components/TuitionForm";

/** Learn to Trade — LOCAL DRAFT (owner "go" 2026-10-29). Prices are placeholders; not shipped. */
export const metadata = {
  alternates: { canonical: "/learn" },
  title: "Learn to Trade",
  description:
    "Canary Foundations: learn to read the market with Shaun Lee Bryant. Beginner trading education, 1-to-1 or in a small group. Education only.",
};

const WHO = [
  { t: "Complete beginners", d: "Never placed a trade, or opened an account and froze. We start from zero." },
  { t: "Hunch and tip traders", d: "You've traded on tips or gut feel and want a repeatable process instead." },
  { t: "Canary members", d: "You have the dashboard and want to use the traffic light and scanners properly." },
];

const OUTCOMES = [
  "Read a price chart: candles, trend, support and resistance, volume",
  "Size a position and set a stop before you enter, every time",
  "Read market health with the canary traffic light and know when to sit out",
  "Use RSI, Relative RSI and MFI, and know what each can't tell you",
  "Write your own trading plan and keep a journal you actually review",
  "Run a simple 20-minute daily routine on Canary Dashboard",
];

const MODULES = [
  { t: "How markets work", d: "Stocks and exchanges, order types, choosing a broker in Singapore or New Zealand, fees and FX costs." },
  { t: "Reading a chart", d: "Candlesticks, timeframes, trend, support and resistance, and what volume is telling you." },
  { t: "Risk first", d: "Position sizing, stop-losses, the 1–2% rule, drawdown maths, and why most beginners blow up." },
  { t: "Market health, the canary way", d: "The traffic light, breadth, and why sitting out is a position too." },
  { t: "Indicators without the hype", d: "RSI and Relative RSI marks, MFI, moving averages, and their limits." },
  { t: "Setups as patterns to study", d: "Walk through the scanners (Fish, MFI, Fairy Godmother, IBD, Baby Bulls, Warriors, Sweaty, Bearish) as examples to learn from, not picks." },
  { t: "Your trading plan and journal", d: "Entry and exit rules, trade review, and paper trading before real money." },
  { t: "Psychology and routine", d: "FOMO, revenge trading, and building a calm daily dashboard routine." },
];

const OFFERS = [
  { t: "Intro call", p: "Free", n: "15 minutes", pts: ["Talk through where you are now", "We pick the right format together"], draft: false },
  { t: "1-to-1 class", p: "$120 USD/hr", n: "Single session", pts: ["Any topic from the syllabus", "Or a dashboard walkthrough"], draft: false },
  { t: "Foundations 1-to-1", p: "US$[TBC]", n: "6 sessions · placeholder", pts: ["The full 8-module syllabus at your pace", "Capstone review of your written plan", "Includes [TBC] months of dashboard access"], draft: true, featured: true },
  { t: "Foundations cohort", p: "US$[TBC] pp", n: "4–6 weeks · 6–12 people · placeholder", pts: ["Weekly live group sessions", "Recordings and workbook", "Includes [TBC] months of dashboard access"], draft: true },
  { t: "Members' Q&A", p: "US$[TBC]/mo", n: "Membership add-on · placeholder", pts: ["Monthly live group Q&A for members", "Bring your charts and questions"], draft: true },
];

const STEPS = [
  { t: "Apply", d: "Fill in the short form below so Shaun knows your level and goals." },
  { t: "Intro call", d: "A free 15-minute call to agree the right format." },
  { t: "Pay", d: "Only once a format and time are confirmed. Nothing is charged when you apply." },
  { t: "Schedule", d: "Lock in your sessions on Zoom or Google Meet, in SGT or NZT." },
];

const FAQ = [
  { q: "I'm a total beginner. Is that OK?", a: "Yes. Foundations starts from zero." },
  { q: "How much money do I need to start?", a: "None to learn. We use paper trading first, and talk about account size only to pitch the lessons at the right level." },
  { q: "Are sessions recorded?", a: "Cohort sessions are. 1-to-1 sessions can be on request." },
  { q: "What time zone?", a: "Sessions are scheduled in Singapore (SGT) or New Zealand (NZT) time, and other zones on request." },
  { q: "What's the refund policy?", a: "[Draft: owner to set.]" },
  { q: "Will you tell me what to buy?", a: "No. This is education only: how to read the market and build your own process. It is not personalised advice or a recommendation to buy or sell anything." },
];

export default function LearnPage() {
  return (
    <div className="bg-slate-950 text-slate-100">
      <div className="bg-amber-500/90 px-4 py-2 text-center text-xs font-semibold text-slate-950">
        DRAFT PREVIEW · local only · prices marked [TBC] are placeholders for Shaun to set
      </div>

      <section className="relative overflow-hidden border-b border-white/5 bg-gradient-to-b from-slate-900 via-slate-800 to-slate-950">
        <div className="relative mx-auto grid max-w-5xl items-center gap-10 px-4 py-14 md:grid-cols-[1fr_auto] md:py-16">
          <div>
            <p className="text-sm font-medium uppercase tracking-widest text-amber-400">Canary Foundations · with Shaun Lee Bryant</p>
            <h1 className="mt-3 max-w-2xl text-4xl font-semibold leading-tight tracking-tight text-white md:text-5xl">
              Learn to read the market, not chase tips.
            </h1>
            <p className="mt-5 max-w-xl text-base leading-relaxed text-slate-300">
              A beginner trading course built around the canaries and indicators. Learn it 1-to-1 or in a small group.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <a href="#syllabus" className="rounded-full bg-amber-400 px-6 py-3 text-sm font-semibold text-slate-950 hover:bg-amber-300">See the course</a>
              <a href="#apply" className="rounded-full border border-white/20 px-6 py-3 text-sm font-semibold text-white hover:border-amber-400">Book a free intro call</a>
            </div>
          </div>
          <div className="mx-auto w-full max-w-[260px] md:w-[280px] md:max-w-none">
            <img src="/home/shaun-tuition-portrait.jpg" alt="Shaun Lee Bryant in a black suit and bow tie" width={640} height={800} className="h-auto w-full rounded-2xl object-cover shadow-2xl ring-1 ring-white/10" />
          </div>
        </div>
      </section>

      <section className="border-b border-white/5">
        <div className="mx-auto max-w-5xl px-4 py-14">
          <p className="text-xs font-semibold uppercase tracking-widest text-amber-400">Who it's for</p>
          <div className="mt-6 grid gap-6 md:grid-cols-3">
            {WHO.map((w) => (
              <div key={w.t} className="rounded-2xl border border-white/10 bg-slate-900/60 p-6">
                <h3 className="text-lg font-semibold text-white">{w.t}</h3>
                <p className="mt-2 text-sm text-slate-400">{w.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-b border-white/5 bg-slate-900/40">
        <div className="mx-auto max-w-5xl px-4 py-14">
          <p className="text-xs font-semibold uppercase tracking-widest text-amber-400">What you'll be able to do</p>
          <ul className="mt-6 grid gap-3 md:grid-cols-2">
            {OUTCOMES.map((o) => (
              <li key={o} className="flex gap-2 text-sm text-slate-300"><span className="text-amber-400">✓</span>{o}</li>
            ))}
          </ul>
        </div>
      </section>

      <section id="syllabus" className="scroll-mt-20 border-b border-white/5">
        <div className="mx-auto max-w-3xl px-4 py-14">
          <p className="text-xs font-semibold uppercase tracking-widest text-amber-400">Syllabus</p>
          <h2 className="mt-3 text-3xl font-semibold text-white">Canary Foundations: 8 modules</h2>
          <div className="mt-8 space-y-3">
            {MODULES.map((m, i) => (
              <details key={m.t} className="group rounded-2xl border border-white/10 bg-slate-900/50 p-5">
                <summary className="flex cursor-pointer list-none items-center justify-between font-medium text-white">
                  <span><span className="mr-3 text-amber-400">{String(i + 1).padStart(2, "0")}</span>{m.t}</span>
                  <span className="text-amber-400 transition group-open:rotate-45">+</span>
                </summary>
                <p className="mt-3 text-sm leading-relaxed text-slate-400">{m.d}</p>
              </details>
            ))}
            <div className="rounded-2xl border border-amber-400/30 bg-amber-400/5 p-5 text-sm text-slate-300">
              <span className="font-semibold text-amber-400">Capstone:</span> you present your own written trading plan, and Shaun reviews it as a process, not as trade calls.
            </div>
          </div>
        </div>
      </section>

      <section className="border-b border-white/5 bg-slate-900/40">
        <div className="mx-auto max-w-6xl px-4 py-14">
          <p className="text-xs font-semibold uppercase tracking-widest text-amber-400">Ways to learn</p>
          <div className="mt-6 grid gap-5 md:grid-cols-3 lg:grid-cols-5">
            {OFFERS.map((o) => (
              <div key={o.t} className={`rounded-2xl border p-5 ${o.featured ? "border-amber-400/60 bg-slate-900" : "border-white/10 bg-slate-900/60"}`}>
                <h3 className="font-semibold text-white">{o.t}</h3>
                <p className={`mt-2 text-xl font-semibold ${o.draft ? "text-amber-300" : "text-white"}`}>{o.p}</p>
                <p className="mt-1 text-xs uppercase tracking-widest text-slate-500">{o.n}</p>
                <ul className="mt-4 space-y-2 text-sm text-slate-300">
                  {o.pts.map((p) => <li key={p} className="flex gap-2"><span className="text-amber-400">✓</span>{p}</li>)}
                </ul>
              </div>
            ))}
          </div>
          <p className="mt-6 text-xs text-slate-500">
            Want Shaun to speak at your event instead? See <a href="/bookings" className="text-amber-400 underline">Bookings</a>.
          </p>
        </div>
      </section>

      <section className="border-b border-white/5">
        <div className="mx-auto max-w-3xl px-4 py-14">
          <p className="text-xs font-semibold uppercase tracking-widest text-amber-400">Your teacher</p>
          <h2 className="mt-3 text-3xl font-semibold text-white">Shaun Lee Bryant</h2>
          <p className="mt-4 text-sm leading-relaxed text-slate-300">
            Shaun founded Canary Dashboard and built the canary traffic light and the Relative RSI marks that members use every day.
            He has presented at seminars in Singapore and teaches the same calm, rules-first process he uses himself.
            <span className="text-amber-300"> [Draft: owner to add years in markets and credentials.]</span>
          </p>
          <p className="mt-4 text-xs text-slate-500">[Draft: testimonials and seminar photos go here, from real students only.]</p>
        </div>
      </section>

      <section className="border-b border-white/5 bg-slate-900/40">
        <div className="mx-auto max-w-5xl px-4 py-14">
          <p className="text-xs font-semibold uppercase tracking-widest text-amber-400">How it works</p>
          <ol className="mt-6 grid gap-5 md:grid-cols-4">
            {STEPS.map((s, i) => (
              <li key={s.t} className="rounded-2xl border border-white/10 bg-slate-900/60 p-5">
                <span className="text-2xl font-semibold text-amber-400">{i + 1}</span>
                <h3 className="mt-2 font-semibold text-white">{s.t}</h3>
                <p className="mt-1 text-sm text-slate-400">{s.d}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section id="apply" className="scroll-mt-20 border-b border-white/5">
        <div className="mx-auto max-w-3xl px-4 py-14">
          <p className="text-xs font-semibold uppercase tracking-widest text-amber-400">Apply</p>
          <h2 className="mt-3 text-3xl font-semibold text-white">Apply for Canary Foundations</h2>
          <p className="mt-2 text-sm text-slate-400">No payment is taken now. Shaun replies to book your free intro call.</p>
          <div className="mt-8 rounded-3xl border border-white/10 bg-slate-950/70 p-6 md:p-8">
            <TuitionForm />
          </div>
        </div>
      </section>

      <section>
        <div className="mx-auto max-w-3xl px-4 py-14">
          <h2 className="text-center text-2xl font-semibold text-white">Questions</h2>
          <dl className="mt-8 space-y-4">
            {FAQ.map((f) => (
              <div key={f.q} className="rounded-2xl border border-white/10 bg-slate-900/50 p-5">
                <dt className="font-medium text-white">{f.q}</dt>
                <dd className="mt-2 text-sm leading-relaxed text-slate-400">{f.a}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-10 text-center text-xs leading-relaxed text-slate-500">
            Education only, not investment advice. Nothing here is a recommendation to buy or sell any security.
            Trading involves risk, including loss of capital. Past examples do not guarantee future results.
          </p>
        </div>
      </section>
    </div>
  );
}
