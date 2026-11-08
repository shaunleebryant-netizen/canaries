/**
 * Provisional three-way grouping of the existing marks.
 * Names are a preview proposal. Descriptions match the live legend and chart labels.
 * Nothing here changes how a mark is calculated.
 */
const GROUPS = [
  {
    title: "Trend & continuation",
    note: "Provisional name",
    items: [
      ["🙂 Smiley", "Selling looks worn out (the chart label is Smiley; the legend also calls this a washout)."],
      ["📈 Monthly trend", "Monthly trend turned up."],
    ],
  },
  {
    title: "Pullbacks & bottoming",
    note: "Provisional name",
    items: [
      ["🐟 Fish", "A sold-off name starting to find its feet."],
      ["💵 MFI", "Selling washed out and money flow turning up."],
      ["🧚 Fairy", "Bottom Zone: WVF extreme, RSI under 35, and an up close."],
    ],
  },
  {
    title: "Warnings",
    note: "Provisional name",
    items: [
      ["🥵 Sweaty", "A hard run that may be getting tired."],
      ["💀 Skull", "Topping mark after a sweaty stretch."],
    ],
  },
] as const;

export function CanaryMarkGroups() {
  return (
    <section aria-label="Provisional mark groups" className="rounded-xl border border-dashed border-white/15 bg-slate-950/40 p-3">
      <h2 className="text-sm font-semibold text-white">Mark groups</h2>
      <p className="mt-1 text-[11px] leading-snug text-slate-400">
        Provisional grouping for this preview. The owner asked for three categories and did not lock these names. The marks themselves are unchanged.
      </p>
      <div className="mt-3 grid gap-3 md:grid-cols-3">
        {GROUPS.map((g) => (
          <div key={g.title} className="rounded-lg border border-white/10 p-2.5">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-canary-gold">{g.title}</p>
            <p className="text-[10px] text-slate-500">{g.note}</p>
            <ul className="mt-2 space-y-1.5 text-[11px] leading-snug text-slate-300">
              {g.items.map(([name, blurb]) => (
                <li key={name}>
                  <span className="font-medium text-white">{name}.</span> {blurb}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}
