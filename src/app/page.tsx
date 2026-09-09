import { loadState } from "@/lib/loadState";
import { toPublicSnapshot } from "@/lib/composite";
import { TrafficLightDisplay } from "@/components/TrafficLight";
import { ProofBlocks } from "@/components/ProofBlocks";
import { NewsletterForm } from "@/components/NewsletterForm";

export const dynamic = "force-dynamic";

const HOW_STEPS = [
  {
    n: "01",
    title: "Watch the flock",
    body: "[Stub] Weighted market-health canaries are scored each week — like miners watching birds for air quality.",
  },
  {
    n: "02",
    title: "Read one light",
    body: "[Stub] Scores roll into a composite. You see Green / Amber / Red — not a buy/sell ticker list.",
  },
  {
    n: "03",
    title: "Allocate with clarity",
    body: "[Stub] Use the reading as a frame for US-market posture. Members get the flock depth behind the light.",
  },
];

const MEMBER_TEASE = [
  {
    title: "Ranked holdings",
    body: "[Stub] Owner-updated ranked book + adds/trims — behind signup.",
  },
  {
    title: "Market commentary",
    body: "[Stub] Concise weekly commentary summarised for members.",
  },
  {
    title: "Canary flock",
    body: "[Stub] Each bird: description, reading, last 5 weeks, score. Bird states coming: flapping / perched / dead.",
  },
];

const TESTIMONIALS = [
  {
    quote: "[Stub] Finally a simple weekly gauge instead of noise.",
    who: "Placeholder — US allocator",
  },
  {
    quote: "[Stub] The mine metaphor clicked in one sitting.",
    who: "Placeholder — seminar guest",
  },
  {
    quote: "[Stub] Amber weeks saved me from chasing headlines.",
    who: "Placeholder — letter reader",
  },
  {
    quote: "[Stub] I send the light screenshot to my co-pilot every Monday.",
    who: "Placeholder — private client",
  },
  {
    quote: "[Stub] Clear without pretending to be a crystal ball.",
    who: "Placeholder — Singapore attendee",
  },
  {
    quote: "[Stub] Members flock detail is the real unlock.",
    who: "Placeholder — member",
  },
];

const LOGOS = ["[Logo]", "[Logo]", "[Logo]", "[Logo]", "[Logo]"];

const FAQ = [
  {
    q: "Is this investment advice?",
    a: "No. Education only — a market-health reading frame, not recommendations to buy or sell.",
  },
  {
    q: "What do I see for free?",
    a: "[Stub] The pulsing weekly traffic light (+ optional composite S / asOf). Depth stays behind membership.",
  },
  {
    q: "What’s the Singapore seminar?",
    a: "Primary lead magnet: a live session on allocation clarity with the canary framework. Date & venue TBD · Singapore. Friends and private signup welcome.",
  },
  {
    q: "How often does the light update?",
    a: "[Stub] Weekly composite reading. Members see flock history and commentary.",
  },
  {
    q: "Can I join the weekly letter without the seminar?",
    a: "Yes — secondary CTA. Same education-only frame; form is stubbed until owner approves send.",
  },
  {
    q: "When is About / media live?",
    a: "[Stub] Authority page later — this block is a placeholder only.",
  },
];

export default function HomePage() {
  const state = loadState();
  const snap = toPublicSnapshot(state);

  return (
    <div className="bg-slate-950 text-slate-100">
      {/* 1. Hero — keep first-loved dark/amber teaser */}
      <section className="relative overflow-hidden bg-gradient-to-b from-slate-900 via-slate-800 to-slate-950 text-white">
        <div
          className="pointer-events-none absolute inset-0 opacity-30"
          style={{
            backgroundImage:
              "radial-gradient(circle at 20% 20%, #eab30833, transparent 40%), radial-gradient(circle at 80% 60%, #22c55e22, transparent 35%)",
          }}
        />
        <div className="relative mx-auto grid max-w-5xl gap-12 px-4 py-16 md:grid-cols-2 md:items-center md:py-24">
          <div>
            <p className="text-sm font-medium uppercase tracking-widest text-canary-gold">
              US-market allocation clarity
            </p>
            <h1 className="mt-3 text-4xl font-semibold leading-tight tracking-tight md:text-5xl">
              Healthy canaries → stay in the market.
              <span className="block text-slate-300">Dying canaries → get defensive.</span>
            </h1>
            <p className="mt-5 max-w-lg text-base leading-relaxed text-slate-300">
              One screen. One weekly traffic light. Like miners watching birds for air quality, we
              watch a weighted flock — then show Green / Amber / Red, not a trade list.
            </p>
            {snap.fixture ? (
              <p className="mt-4 inline-block rounded-full bg-amber-500/20 px-3 py-1 text-xs font-medium text-amber-200 ring-1 ring-amber-400/40">
                {snap.fixtureLabel}
              </p>
            ) : null}
            <div className="mt-8 flex flex-wrap gap-3">
              <a
                href="#seminar"
                className="rounded-xl bg-canary-gold px-5 py-3 text-sm font-semibold text-slate-950 hover:bg-yellow-400"
              >
                Join the Singapore waitlist
              </a>
              <a
                href="#letter"
                className="rounded-xl border border-white/20 bg-white/5 px-5 py-3 text-sm font-medium text-white hover:bg-white/10"
              >
                Get the weekly letter
              </a>
            </div>
            <p className="mt-2 text-xs text-slate-400">
              <a href="#seminar" className="underline decoration-white/20 underline-offset-2 hover:text-canary-gold">
                Prefer private / friends signup
              </a>
              <span className="text-slate-500"> — same waitlist, priority review.</span>
            </p>
            <p className="mt-3 text-xs text-slate-500">
              Primary: seminar · friends · private signup · Secondary: weekly letter · Education only
            </p>
          </div>
          <div className="rounded-3xl border border-white/10 bg-white/5 p-8 backdrop-blur">
            <TrafficLightDisplay
              light={snap.light}
              S={snap.S}
              asOf={snap.asOf}
              stance={snap.stance}
            />
            <p className="mt-6 text-center text-xs text-slate-400">
              Public sneak peek: pulsing weekly light (+ optional S / asOf). Full flock stays
              behind members.
            </p>
          </div>
        </div>
      </section>

      {/* 2. Problem */}
      <section id="problem" className="border-t border-white/5">
        <div className="mx-auto max-w-3xl px-4 py-16 text-center">
          <p className="text-xs font-semibold uppercase tracking-widest text-canary-gold">
            Problem
          </p>
          <h2 className="mt-3 text-3xl font-semibold text-white">Fog without a gauge</h2>
          <p className="mt-4 text-base leading-relaxed text-slate-400">
            [Stub] Headlines, feeds, and conflicting “experts” leave US allocators guessing posture
            week to week. Without a shared gauge, you either freeze or chase noise.
          </p>
        </div>
      </section>

      {/* 3. Mechanism — TODO: contrarian signals later */}
      <section id="mechanism" className="border-t border-white/5 bg-slate-900/40">
        <div className="mx-auto max-w-5xl px-4 py-16">
          <p className="text-xs font-semibold uppercase tracking-widest text-canary-gold">
            Mechanism
          </p>
          <h2 className="mt-3 text-3xl font-semibold text-white">Mine metaphor → composite → lights</h2>
          {/* TODO(contrarian): later — e.g. breadth extremes flashing sell despite green composite; hooks only, no rules invented yet */}
          <div className="mt-10 grid gap-6 md:grid-cols-3">
            <article className="rounded-2xl border border-white/10 bg-slate-950/60 p-6">
              <p className="text-canary-gold text-sm font-medium">1 · Mine</p>
              <p className="mt-2 text-sm text-slate-400">
                [Stub] Miners watched canaries for air quality. We watch market-health birds the same
                way.
              </p>
            </article>
            <article className="rounded-2xl border border-white/10 bg-slate-950/60 p-6">
              <p className="text-canary-gold text-sm font-medium">2 · Composite</p>
              <p className="mt-2 text-sm text-slate-400">
                [Stub] Weighted scores roll into one composite S each week. Depth of each bird is
                members-only.
              </p>
            </article>
            <article className="rounded-2xl border border-white/10 bg-slate-950/60 p-6">
              <p className="text-canary-gold text-sm font-medium">3 · Lights</p>
              <p className="mt-2 text-sm text-slate-400">
                [Stub] Green · Amber · Red — a traffic light for allocation clarity, not a ticker
                tip sheet.
              </p>
            </article>
          </div>
        </div>
      </section>

      {/* 4. How it works */}
      <section id="how" className="border-t border-white/5">
        <div className="mx-auto max-w-5xl px-4 py-16">
          <p className="text-center text-xs font-semibold uppercase tracking-widest text-canary-gold">
            How it works
          </p>
          <h2 className="mt-3 text-center text-3xl font-semibold text-white">Three steps</h2>
          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {HOW_STEPS.map((s) => (
              <article
                key={s.n}
                className="rounded-2xl border border-white/10 bg-slate-900/50 p-6"
              >
                <p className="font-mono text-sm text-canary-gold">{s.n}</p>
                <h3 className="mt-2 text-lg font-semibold text-white">{s.title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-slate-400">{s.body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* 5. Public proof demo — light + S + asOf only */}
      <section id="proof" className="border-t border-white/5 bg-slate-900/40">
        <div className="mx-auto max-w-5xl px-4 py-16">
          <p className="text-center text-xs font-semibold uppercase tracking-widest text-canary-gold">
            Public proof
          </p>
          <h2 className="mt-3 text-center text-3xl font-semibold text-white">
            This week’s light — sneak peek
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-center text-sm text-slate-400">
            Pulsing weekly traffic light only. No per-canary metrics, holdings, or scored table on
            the public page.
          </p>
          <div className="mx-auto mt-10 max-w-sm rounded-3xl border border-white/10 bg-slate-950/70 p-8">
            <TrafficLightDisplay
              light={snap.light}
              S={snap.S}
              asOf={snap.asOf}
              stance={snap.stance}
            />
          </div>
          <div className="mt-12">
            <h3 className="text-center text-lg font-semibold text-white">
              How to read a light (light-touch)
            </h3>
            <div className="mt-6">
              <ProofBlocks />
            </div>
          </div>
        </div>
      </section>

      {/* 6. Members tease */}
      <section id="members-tease" className="border-t border-white/5">
        <div className="mx-auto max-w-5xl px-4 py-16">
          <p className="text-center text-xs font-semibold uppercase tracking-widest text-canary-gold">
            Members
          </p>
          <h2 className="mt-3 text-center text-3xl font-semibold text-white">
            What’s inside after signup
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-center text-sm text-slate-400">
            Marketing tease only — not live paid data on this page.
          </p>
          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {MEMBER_TEASE.map((c) => (
              <article
                key={c.title}
                className="rounded-2xl border border-white/10 bg-gradient-to-b from-slate-900 to-slate-950 p-6"
              >
                <h3 className="text-lg font-semibold text-white">{c.title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-slate-400">{c.body}</p>
              </article>
            ))}
          </div>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <span className="inline-flex rounded-full bg-amber-500/20 px-3 py-1 text-xs font-semibold text-amber-100 ring-1 ring-amber-400/40">
              US$50/mo
            </span>
            <a
              href="/members"
              className="inline-block rounded-xl border border-white/20 px-5 py-3 text-sm font-medium text-white hover:bg-white/5"
            >
              Members login
            </a>
          </div>
        </div>
      </section>

      {/* 7. Testimonials + logos */}
      <section id="social-proof" className="border-t border-white/5 bg-slate-900/40">
        <div className="mx-auto max-w-5xl px-4 py-16">
          <p className="text-center text-xs font-semibold uppercase tracking-widest text-canary-gold">
            Social proof
          </p>
          <h2 className="mt-3 text-center text-3xl font-semibold text-white">
            What people say
          </h2>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {TESTIMONIALS.map((t) => (
              <blockquote
                key={t.who}
                className="rounded-2xl border border-white/10 bg-slate-950/50 p-5"
              >
                <p className="text-sm leading-relaxed text-slate-300">{t.quote}</p>
                <footer className="mt-3 text-xs text-slate-500">{t.who}</footer>
              </blockquote>
            ))}
          </div>
          <div className="mt-12 flex flex-wrap items-center justify-center gap-4 opacity-60">
            {LOGOS.map((l, i) => (
              <div
                key={`${l}-${i}`}
                className="rounded-lg border border-dashed border-white/20 px-6 py-3 text-xs uppercase tracking-widest text-slate-500"
              >
                {l}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 8. Authority stub */}
      <section id="authority" className="border-t border-white/5">
        <div className="mx-auto max-w-3xl px-4 py-16 text-center">
          <p className="text-xs font-semibold uppercase tracking-widest text-canary-gold">
            Authority
          </p>
          <h2 className="mt-3 text-2xl font-semibold text-white">About / media later</h2>
          <p className="mt-4 text-sm leading-relaxed text-slate-400">
            [Stub] Full About Me, press, and association logos land here later. For now: educator
            behind the canary framework — details coming.
          </p>
        </div>
      </section>

      {/* 9. Seminar lead magnet */}
      <section id="seminar" className="border-t border-white/5 bg-gradient-to-b from-slate-900 to-slate-950">
        <div className="mx-auto max-w-5xl px-4 py-16">
          <div className="grid gap-10 md:grid-cols-2 md:items-center">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-canary-gold">
                Lead magnet
              </p>
              <h2 className="mt-3 text-3xl font-semibold text-white">
                Singapore seminar — see the traffic light live
              </h2>
              <p className="mt-2 text-sm text-slate-400">
                Date & venue TBD · Singapore · friends & private signup welcome
              </p>
              <ul className="mt-6 space-y-3 text-sm text-slate-300">
                <li className="flex gap-2">
                  <span className="text-canary-gold">✓</span>
                  Live walkthrough of the canary traffic-light frame for US-market posture
                </li>
                <li className="flex gap-2">
                  <span className="text-canary-gold">✓</span>
                  How to read Green / Amber / Red without turning it into a ticker tip sheet
                </li>
                <li className="flex gap-2">
                  <span className="text-canary-gold">✓</span>
                  Open Q&amp;A — education only
                </li>
                <li className="flex gap-2">
                  <span className="text-canary-gold">✓</span>
                  Path into the members flock and private circle (if it fits)
                </li>
              </ul>
            </div>
            <div className="rounded-3xl border border-white/10 bg-slate-950/80 p-8">
              <h3 className="text-lg font-semibold text-white">Register interest</h3>
              <p className="mt-2 text-xs text-slate-400">
                Coming with a friend, or want a private seat? Note it in your waitlist message —
                same list, priority review.
              </p>
              <div className="mt-6">
                <NewsletterForm
                  source="singapore_seminar"
                  showName
                  showNote
                  buttonLabel="Join the Singapore waitlist"
                  helperText="Friends & private signup welcome. Date/city TBD — we'll confirm when seats open. Form stores interest only; no email is sent yet."
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Weekly letter (secondary CTA target) */}
      <section id="letter" className="border-t border-white/5">
        <div className="mx-auto max-w-5xl px-4 py-16 text-center">
          <h2 className="text-2xl font-semibold text-white">Weekly canary letter</h2>
          <p className="mx-auto mt-2 max-w-xl text-sm text-slate-400">
            One clear reading each week — the light, the composite frame, and what would change our
            mind. Secondary to the seminar; no ticker tips.
          </p>
          <div className="mt-8 flex justify-center">
            <NewsletterForm
              source="weekly_letter"
              buttonLabel="Get the weekly letter"
              helperText="Stub form for now — stores locally; does not send email. Education only."
            />
          </div>
        </div>
      </section>

      {/* 10. FAQ */}
      <section id="faq" className="border-t border-white/5 bg-slate-900/40">
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

      {/* 11. Final CTA */}
      <section id="final-cta" className="border-t border-white/5">
        <div className="mx-auto max-w-3xl px-4 py-20 text-center">
          <h2 className="text-3xl font-semibold text-white">
            Get clear on US-market posture
          </h2>
          <p className="mt-4 text-sm text-slate-400">
            Start with the Singapore seminar waitlist (friends & private signup welcome). Grab the
            weekly letter while dates firm up.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <a
              href="#seminar"
              className="rounded-xl bg-canary-gold px-6 py-3 text-sm font-semibold text-slate-950 hover:bg-yellow-400"
            >
              Singapore seminar waitlist
            </a>
            <a
              href="#letter"
              className="rounded-xl border border-white/20 px-6 py-3 text-sm font-medium text-white hover:bg-white/5"
            >
              Weekly letter
            </a>
          </div>
          <p className="mt-10 text-xs leading-relaxed text-slate-500">
            Education only — not investment advice. Nothing here is a recommendation to buy or sell
            any security.
          </p>
        </div>
      </section>
    </div>
  );
}
