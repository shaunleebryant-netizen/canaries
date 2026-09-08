const BLOCKS = [
  {
    level: "Beginner",
    title: "Read the chart like a traffic light",
    body: "Green means the flock looks healthy — historically a time people stayed engaged with markets. Amber means mixed signals. Red means stress is showing — historically when defensive posture made more sense. This is a reading frame, not a trade ticket.",
  },
  {
    level: "Intermediate",
    title: "Ratios tell relative health",
    body: "Canaries like IWF/IWD or (XLK+XLY)/(XLP+XLU) compare leadership and risk appetite. When cyclicals lead defensives, risk appetite is usually firmer; the reverse often accompanies caution. Educational ratio literacy — not a buy/sell call on any ticker.",
  },
  {
    level: "Advanced",
    title: "Breadth and leverage under the surface",
    body: "% above the 200-day MA, NYSE advances–declines, UVXY, and FINRA margin debt speak to participation and leverage. Thin breadth with rising leverage is a classic stress cocktail — useful context for students of market structure, not a signal service.",
  },
];

export function ProofBlocks() {
  return (
    <section className="grid gap-6 md:grid-cols-3">
      {BLOCKS.map((b) => (
        <article
          key={b.level}
          className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
        >
          <p className="text-xs font-semibold uppercase tracking-wider text-canary-gold">
            {b.level}
          </p>
          <h3 className="mt-2 text-lg font-semibold text-slate-900">{b.title}</h3>
          <p className="mt-3 text-sm leading-relaxed text-slate-600">{b.body}</p>
        </article>
      ))}
    </section>
  );
}
