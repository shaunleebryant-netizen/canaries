import { TuitionForm } from "@/components/TuitionForm";

export const metadata = {
  title: "1-to-1 Tuition · Coherant Canary",
  description:
    "Online video-call tuition with Shaun Lee Bryant — S$115/hour. Learn the canary traffic-light system live. Education only.",
};

const WHAT_YOU_GET = [
  "Live walkthrough of the canary indicators",
  "How composite Green / Amber / Red is built",
  "How members readings, holdings context, and chart tools fit together",
  "Copy of Canary-Style Investor by Shaun Lee Bryant",
  "Education only — not personalised trade execution advice",
];

const WHO = [
  "Traders who want clarity on US-market posture",
  "Members who want faster fluency",
  "Seminar attendees going deeper",
];

const FAQ = [
  {
    q: "How long is a session?",
    a: "60-minute online video call. Limited weekly seats — capacity stub until owner calendars open.",
  },
  {
    q: "When do I pay?",
    a: "Design mode stores your request only — no charge. Production will invoice or Stripe Payment Link for S$115 × hours after Shaun confirms.",
  },
  {
    q: "What’s included beyond the call?",
    a: "All Coherant Canary indicators walkthrough + how to interpret them, and a copy of Canary-Style Investor.",
  },
  {
    q: "Is this financial advice?",
    a: "No. Education only — not personalised trade execution advice or recommendations to buy or sell.",
  },
];

export default function TuitionPage() {
  return (
    <div className="bg-slate-950 text-slate-100">
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-white/5 bg-gradient-to-b from-slate-900 via-slate-800 to-slate-950">
        <div
          className="pointer-events-none absolute inset-0 opacity-30"
          style={{
            backgroundImage:
              "radial-gradient(circle at 25% 25%, #eab30833, transparent 40%), radial-gradient(circle at 75% 55%, #22c55e22, transparent 35%)",
          }}
        />
        <div className="relative mx-auto max-w-5xl px-4 py-16 md:py-20">
          <p className="text-sm font-medium uppercase tracking-widest text-canary-gold">
            With Shaun Lee Bryant
          </p>
          <h1 className="mt-3 max-w-2xl text-4xl font-semibold leading-tight tracking-tight text-white md:text-5xl">
            1-to-1 canary tuition
          </h1>
          <p className="mt-5 max-w-xl text-base leading-relaxed text-slate-300">
            Learn the traffic-light system live — indicators, interpretation, and how to read the
            flock.
          </p>
          <p className="mt-6 inline-flex rounded-full bg-amber-500/20 px-4 py-1.5 text-sm font-semibold text-amber-100 ring-1 ring-amber-400/40">
            S$115 / hour · Online video call
          </p>
          <div className="mt-8">
            <a
              href="#request"
              className="inline-block rounded-xl border border-white/20 bg-white/5 px-5 py-3 text-sm font-medium text-white hover:bg-white/10"
            >
              Request a session
            </a>
          </div>
        </div>
      </section>

      {/* What you get */}
      <section className="border-b border-white/5">
        <div className="mx-auto max-w-5xl px-4 py-16">
          <div className="grid gap-10 md:grid-cols-2">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-canary-gold">
                What you get
              </p>
              <h2 className="mt-3 text-2xl font-semibold text-white">The hour, unpacked</h2>
              <ul className="mt-6 space-y-3 text-sm text-slate-300">
                {WHAT_YOU_GET.map((item) => (
                  <li key={item} className="flex gap-2">
                    <span className="text-canary-gold">✓</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-canary-gold">
                Who it’s for
              </p>
              <h2 className="mt-3 text-2xl font-semibold text-white">Good fit if…</h2>
              <ul className="mt-6 space-y-3 text-sm text-slate-300">
                {WHO.map((item) => (
                  <li key={item} className="flex gap-2">
                    <span className="text-canary-gold">→</span>
                    {item}
                  </li>
                ))}
              </ul>
              <div className="mt-8 rounded-2xl border border-white/10 bg-slate-900/60 p-5">
                <p className="text-xs font-semibold uppercase tracking-widest text-canary-gold">
                  Session format
                </p>
                <ul className="mt-3 space-y-2 text-sm text-slate-300">
                  <li>60-minute online video call</li>
                  <li>
                    <span className="font-medium text-white">Limited weekly seats</span> — owner
                    capacity stub
                  </li>
                  <li>Prep: brief form below so the hour isn’t spent on basics you already know</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Lead form */}
      <section id="request" className="border-b border-white/5 bg-slate-900/40">
        <div className="mx-auto max-w-3xl px-4 py-16">
          <p className="text-xs font-semibold uppercase tracking-widest text-canary-gold">
            Request
          </p>
          <h2 className="mt-3 text-3xl font-semibold text-white">Book interest</h2>
          <p className="mt-2 text-sm text-slate-400">
            All fields help Shaun prep. Submit stores locally like the newsletter — no charge, no
            email send.
          </p>
          <div className="mt-8 rounded-3xl border border-white/10 bg-slate-950/70 p-6 md:p-8">
            <TuitionForm />
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="border-b border-white/5">
        <div className="mx-auto max-w-3xl px-4 py-16">
          <p className="text-center text-xs font-semibold uppercase tracking-widest text-canary-gold">
            FAQ
          </p>
          <h2 className="mt-3 text-center text-3xl font-semibold text-white">Questions</h2>
          <dl className="mt-10 space-y-4">
            {FAQ.map((item) => (
              <div
                key={item.q}
                className="rounded-2xl border border-white/10 bg-slate-900/50 p-5"
              >
                <dt className="font-medium text-white">{item.q}</dt>
                <dd className="mt-2 text-sm leading-relaxed text-slate-400">{item.a}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* Education footer CTA */}
      <section>
        <div className="mx-auto max-w-3xl px-4 py-20 text-center">
          <h2 className="text-2xl font-semibold text-white">Ready when you are</h2>
          <p className="mt-4 text-sm text-slate-400">
            Request a seat above, or explore members for the weekly light (
            <span className="text-white">US$50/mo</span> in production).
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <a
              href="#request"
              className="rounded-xl bg-canary-gold px-6 py-3 text-sm font-semibold text-slate-950 hover:bg-yellow-400"
            >
              Request tuition session
            </a>
            <a
              href="/members"
              className="rounded-xl border border-white/20 px-6 py-3 text-sm font-medium text-white hover:bg-white/5"
            >
              Members
            </a>
          </div>
          <p className="mt-10 text-xs leading-relaxed text-slate-500">
            Education only — not investment advice. Nothing here is a recommendation to buy or sell
            any security. Tuition is S$115/hour; design mode does not process payment.
          </p>
        </div>
      </section>
    </div>
  );
}
