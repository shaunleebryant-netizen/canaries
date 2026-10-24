/** UX preview: one-answer strip at the top of /members. Uses pack data only. Education only. */
export type TodayStripProps = {
  light: string; S: number | null; prevS: number | null; prevLight: string | null; regime: string; asOf: string;
  picks: { t: string; why: string }[]; newSetups: number; droppedSetups: number | null; bullishCount: number; bearishCount: number;
};
const PLAIN: Record<string, string> = {
  green: "Green: conditions supportive, normal sizing",
  amber: "Amber: mixed, be selective and size moderately",
  red: "Red: stay defensive, size small",
};
const DOT: Record<string, string> = { green: "bg-emerald-400", amber: "bg-amber-400", red: "bg-rose-500" };
const fmt = (d: string) => `${d.slice(8, 10)}/${d.slice(5, 7)}/${d.slice(0, 4)}`;

export function TodayStrip(p: TodayStripProps) {
  const k = p.light.toLowerCase();
  const move = p.S != null && p.prevS != null ? p.S - p.prevS : null;
  const decideMove = move == null ? "Decide move n/a" : Math.abs(move) < 0.0005 ? `Decide unchanged (${p.prevLight ?? "—"})` : `Decide ${move > 0 ? "+" : ""}${move.toFixed(3)}${p.prevLight && p.prevLight !== k ? ` (was ${p.prevLight})` : ""}`;
  return (
    <section id="today-strip" className="mb-5 rounded-xl border border-canary-gold/30 bg-slate-900/80 p-3 shadow-sm ring-1 ring-canary-gold/10 sm:p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-canary-gold">Today · {fmt(p.asOf)}</p>
        <p className="text-[10px] text-slate-500">Education only</p>
      </div>
      <div className="mt-2 grid gap-3 md:grid-cols-[1.2fr_1.5fr_1fr]">
        <div>
          <p className="flex items-center gap-2 text-base font-semibold text-white sm:text-lg">
            <span className={`h-3 w-3 rounded-full ${DOT[k] ?? "bg-slate-500"}`} />{PLAIN[k] ?? p.light}
          </p>
          <p className="mt-0.5 text-xs text-slate-400">Score {p.S?.toFixed(3) ?? "—"} · Regime {p.regime.replace("_", "-").toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase())}</p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-wider text-slate-500">3 worth a look</p>
          <ul className="mt-1 space-y-1">
            {p.picks.map((x) => (
              <li key={x.t} className="text-xs text-slate-300"><span className="mr-1.5 font-semibold text-amber-300">{x.t}</span>{x.why}</li>
            ))}
          </ul>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-wider text-slate-500">Since last session</p>
          <p className="mt-1 text-xs text-slate-300">{decideMove}</p>
          <p className="text-xs text-slate-300">Setups: {p.newSetups} new · {p.droppedSetups == null ? "drop-offs from next run" : `${p.droppedSetups} dropped`}</p>
          <p className="text-[11px] text-slate-500">{p.bullishCount} bullish · {p.bearishCount} bearish</p>
        </div>
      </div>
    </section>
  );
}
