/**
 * Ideas score summary (win rate, median move). Not mounted.
 * The members Backtest tab is a per-mark look-back and must not render this table.
 */
const dmy = (ymd: string) => ymd.split("-").reverse().join("/");

export type ScoreSummary = { since: string | null; logged: number; scored: Record<string, number>; byPlay: Row[]; byLight: Row[] };
type Row = { key: string; n: number; win20: number | null; wrong20: number | null; tgt60: number | null; med20: number | null };
const pct = (x: number | null) => (x == null ? "—" : `${Math.round(x * 100)}%`);

function Table({ title, rows, example }: { title: string; rows: Row[]; example?: boolean }) {
  return (
    <div className="overflow-x-auto">
      <p className="mb-1 text-xs font-semibold text-slate-300">{title}</p>
      <table className="w-full text-xs"><thead className="text-slate-500"><tr><th className="text-left">Group</th><th>Ideas</th><th>Moved right @20d</th><th>Wrong-if hit first</th><th>Target hit ≤60d</th><th>Median move @20d</th></tr></thead>
        <tbody>{rows.map((r) => (
          <tr key={r.key} className={example ? "text-slate-500 italic" : "text-slate-200"}><td className="text-left">{example ? `EXAMPLE · ${r.key}` : r.key}</td><td className="text-center">{r.n}</td><td className="text-center">{pct(r.win20)}</td><td className="text-center">{pct(r.wrong20)}</td><td className="text-center">{pct(r.tgt60)}</td><td className="text-center">{r.med20 == null ? "—" : `${(r.med20 * 100).toFixed(1)}%`}</td></tr>
        ))}</tbody></table>
    </div>
  );
}

export function TrackRecord({ s }: { s: ScoreSummary }) {
  const hasReal = s.byPlay.some((r) => r.n > 0);
  return (
    <section id="track-record" className="mb-6 rounded-2xl border border-white/10 bg-slate-900/60 p-4">
      <h2 className="text-sm font-bold uppercase tracking-[0.15em] text-canary-gold">How past ideas played out</h2>
      <p className="mt-1 text-xs text-slate-400">Each night’s Ideas are logged and checked after 5, 20 and 60 trading days: % move, whether the wrong-if level was hit first, and whether the target was reached. Past results only; they do not predict future results. Education only.</p>
      {hasReal ? (
        <div className="mt-3 grid gap-4 md:grid-cols-2"><Table title="By play type" rows={s.byPlay} /><Table title="By market light on the day" rows={s.byLight} /></div>
      ) : (
        <>
          <p data-empty className="mt-3 rounded-lg border border-dashed border-white/20 px-3 py-3 text-sm text-slate-200">
            Collecting since {s.since ? dmy(s.since) : "ship day"} · {s.logged} idea{s.logged === 1 ? "" : "s"} logged, none old enough to score yet. The first 5-day checks appear after 5 trading days; hit rates need 20+ ideas per group before we show them.
          </p>
          <div className="mt-3 rounded-lg border border-amber-500/30 p-2">
            <p className="mb-1 text-[11px] font-semibold uppercase text-amber-300">Example layout — made-up placeholder numbers, not real results</p>
            <Table title="By play type (example)" example rows={[{ key: "Bounce", n: 0, win20: null, wrong20: null, tgt60: null, med20: null }, { key: "Breakdown", n: 0, win20: null, wrong20: null, tgt60: null, med20: null }]} />
          </div>
        </>
      )}
    </section>
  );
}
