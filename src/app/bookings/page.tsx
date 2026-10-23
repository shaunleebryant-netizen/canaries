import { BookingForm } from "@/components/BookingForm";

/** Bookings (owner approved 2026-10-09, t595u). Replaces /tuition (which now redirects here). */
export const metadata = {
  alternates: { canonical: "/bookings" },
  title: "Bookings",
  description:
    "Book a 1-to-1 online class with Shaun Lee Bryant to learn the canaries and indicators, or invite Shaun to speak at your event. Education only.",
};

const OPTIONS = [
  {
    title: "1-to-1 class",
    sub: "Canaries / indicators · online video call",
    points: [
      "A live walkthrough of the canaries and how the traffic light is read",
      "The indicators, and how members use the dashboard day to day",
      "$120 USD/hr · no payment until Shaun confirms a time",
    ],
  },
  {
    title: "Speaking at your event",
    sub: "Talks, panels and workshops",
    points: [
      "Market health, explained in plain language for your audience",
      "In person in Singapore, or online anywhere",
      "Tell us the date, city and audience size, and Shaun will reply by email",
    ],
  },
];

const FAQ = [
  {
    q: "When do I pay?",
    a: "Not now. Sending this form only saves your request. Shaun replies by email to confirm a time and the details.",
  },
  {
    q: "How long is a class?",
    a: "Usually 60 minutes on a video call. You can ask for longer in your message.",
  },
  {
    q: "Is this financial advice?",
    a: "No. Classes and talks are education only, not personalised advice or a recommendation to buy or sell anything.",
  },
];

export default function BookingsPage() {
  return (
    <div className="bg-slate-950 text-slate-100">
      <section className="relative overflow-hidden border-b border-white/5 bg-gradient-to-b from-slate-900 via-slate-800 to-slate-950">
        <div className="relative mx-auto max-w-5xl px-4 py-14 md:py-16">
          <p className="text-sm font-medium uppercase tracking-widest text-amber-400">With Shaun Lee Bryant</p>
          <h1 className="mt-3 max-w-2xl text-4xl font-semibold leading-tight tracking-tight text-white md:text-5xl">
            Bookings
          </h1>
          <p className="mt-5 max-w-xl text-base leading-relaxed text-slate-300">
            Book a 1-to-1 class to learn the canaries and indicators, or invite Shaun to speak at your event.
          </p>
          <div className="mt-8">
            <a
              href="#request"
              className="inline-block rounded-xl bg-amber-500 px-5 py-3 text-sm font-semibold text-slate-950 hover:bg-amber-400"
            >
              Make a booking request
            </a>
          </div>
        </div>
      </section>

      <section className="border-b border-white/5">
        <div className="mx-auto grid max-w-5xl gap-6 px-4 py-14 md:grid-cols-2">
          {OPTIONS.map((o) => (
            <div key={o.title} className="rounded-2xl border border-white/10 bg-slate-900/60 p-6">
              <h2 className="text-xl font-semibold text-white">{o.title}</h2>
              <p className="mt-1 text-xs uppercase tracking-widest text-amber-400">{o.sub}</p>
              <ul className="mt-5 space-y-2.5 text-sm text-slate-300">
                {o.points.map((p) => (
                  <li key={p} className="flex gap-2">
                    <span className="text-amber-400">✓</span>
                    {p}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      <section id="request" className="scroll-mt-20 border-b border-white/5 bg-slate-900/40">
        <div className="mx-auto max-w-3xl px-4 py-14">
          <p className="text-xs font-semibold uppercase tracking-widest text-amber-400">Request</p>
          <h2 className="mt-3 text-3xl font-semibold text-white">Make a booking request</h2>
          <p className="mt-2 text-sm text-slate-400">
            Choose a class or a speaking booking. No payment is taken now.
          </p>
          <div className="mt-8 rounded-3xl border border-white/10 bg-slate-950/70 p-6 md:p-8">
            <BookingForm />
          </div>
        </div>
      </section>

      <section>
        <div className="mx-auto max-w-3xl px-4 py-14">
          <h2 className="text-center text-2xl font-semibold text-white">Questions</h2>
          <dl className="mt-8 space-y-4">
            {FAQ.map((item) => (
              <div key={item.q} className="rounded-2xl border border-white/10 bg-slate-900/50 p-5">
                <dt className="font-medium text-white">{item.q}</dt>
                <dd className="mt-2 text-sm leading-relaxed text-slate-400">{item.a}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-10 text-center text-xs leading-relaxed text-slate-500">
            Education only, not investment advice. Nothing here is a recommendation to buy or sell any security.
          </p>
        </div>
      </section>
    </div>
  );
}
