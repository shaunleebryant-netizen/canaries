/** Light-touch education only — no per-canary metrics or paywalled depth. */
const BLOCKS = [
  {
    level: "Green",
    title: "Flock looks healthy",
    body: "[Stub] Historically when the weekly light is green, people stayed engaged with markets. A reading frame — not a trade ticket.",
    tone: "text-canary-green",
  },
  {
    level: "Amber",
    title: "Mixed signals",
    body: "[Stub] Amber means the composite is mixed. Stay alert; dig deeper only inside members if you want the flock detail.",
    tone: "text-canary-amber",
  },
  {
    level: "Red",
    title: "Stress is showing",
    body: "[Stub] Red historically lined up with defensive posture making more sense. Education only — not a sell signal service.",
    tone: "text-canary-red",
  },
];

export function ProofBlocks() {
  return (
    <section className="grid gap-6 md:grid-cols-3">
      {BLOCKS.map((b) => (
        <article
          key={b.level}
          className="rounded-2xl border border-white/10 bg-slate-900/60 p-6 shadow-sm"
        >
          <p className={`text-xs font-semibold uppercase tracking-wider ${b.tone}`}>
            {b.level}
          </p>
          <h3 className="mt-2 text-lg font-semibold text-white">{b.title}</h3>
          <p className="mt-3 text-sm leading-relaxed text-slate-400">{b.body}</p>
        </article>
      ))}
    </section>
  );
}
