import type { MembersPayload } from "@/lib/types";
import { Sparkline } from "./Sparkline";

type Row = MembersPayload["canaries"][0];

function scoreLabel(row: Row) {
  if (row.status === "UNVERIFIED" || row.score === "UNVERIFIED" || row.score === null) {
    return "UNVERIFIED";
  }
  return String(row.score);
}

function scoreClass(row: Row) {
  if (row.status === "UNVERIFIED" || row.score === "UNVERIFIED" || row.score === null) {
    return "text-slate-400";
  }
  if (typeof row.score === "number" && row.score > 0) return "text-canary-green";
  if (typeof row.score === "number" && row.score < 0) return "text-canary-red";
  return "text-canary-amber";
}

export function CanaryTable({
  rows,
  emptyNotes,
}: {
  rows: MembersPayload["canaries"];
  /** Per-seat note when no clean Yahoo series (never invent). */
  emptyNotes?: Record<string, string>;
}) {
  return (
    <div
      id="canary-table"
      className="overflow-x-auto rounded-2xl border border-white/10 bg-slate-900/70 shadow-sm"
    >
      <div className="border-b border-white/10 px-4 py-3">
        <h2 className="text-sm font-semibold uppercase tracking-widest text-canary-gold">
          Canary readings
        </h2>
        <p className="mt-1 text-xs leading-snug text-slate-400">
          Each seat is one early-warning bird in the flock — together they set
          the traffic light. Sparkline = last ~10 trading sessions when a clean
          Yahoo series exists.
        </p>
        <p className="mt-1 text-[11px] uppercase tracking-wide text-slate-500">
          Education only
        </p>
      </div>
      <table className="min-w-full text-left text-sm">
        <thead className="border-b border-white/10 bg-slate-950/60 text-xs uppercase tracking-wide text-slate-400">
          <tr>
            <th className="px-3 py-3 font-medium">10-sess</th>
            <th className="px-4 py-3 font-medium">Canary</th>
            <th className="px-4 py-3 font-medium">Last reading</th>
            <th className="px-4 py-3 font-medium">Score</th>
            <th className="px-4 py-3 font-medium">Weight</th>
            <th className="px-4 py-3 font-medium">Contribution</th>
            <th className="px-4 py-3 font-medium">Read</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((c) => {
            const unverified =
              c.status === "UNVERIFIED" ||
              c.score === "UNVERIFIED" ||
              c.score === null;
            const hasSpark = Boolean(c.sparkline && c.sparkline.length > 1);
            const emptyNote = emptyNotes?.[c.id];
            return (
              <tr
                key={c.id}
                className={`border-b border-white/5 last:border-0 ${
                  unverified ? "bg-slate-950/40" : ""
                }`}
              >
                <td className="px-3 py-3 align-middle">
                  {hasSpark ? (
                    <Sparkline values={c.sparkline!} />
                  ) : (
                    <span
                      className="text-[10px] leading-tight text-slate-600"
                      title={emptyNote}
                    >
                      —
                    </span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <div className="font-medium text-white">{c.name}</div>
                  <div className="text-xs text-slate-500">{c.description}</div>
                  {c.status ? (
                    <div
                      className={`mt-1 text-[10px] font-semibold uppercase tracking-wide ${
                        unverified ? "text-slate-500" : "text-emerald-400"
                      }`}
                    >
                      {c.status}
                      {unverified && c.displayWeight === 0
                        ? " · weight zeroed"
                        : ""}
                    </div>
                  ) : null}
                  {!hasSpark && emptyNote ? (
                    <div className="mt-1 max-w-[14rem] text-[10px] leading-snug text-slate-600">
                      {emptyNote}
                    </div>
                  ) : null}
                </td>
                <td className="px-4 py-3 tabular-nums text-slate-300">
                  {c.lastReading}
                </td>
                <td className={`px-4 py-3 font-semibold tabular-nums ${scoreClass(c)}`}>
                  {scoreLabel(c)}
                </td>
                <td className="px-4 py-3 tabular-nums text-slate-400">
                  {c.displayWeight.toFixed(2)}
                  {typeof c.weightNominal === "number" &&
                  c.weightNominal !== c.displayWeight ? (
                    <span className="ml-1 text-[10px] text-slate-500">
                      (nom {c.weightNominal.toFixed(2)})
                    </span>
                  ) : null}
                </td>
                <td className="px-4 py-3 tabular-nums text-slate-400">
                  {c.contribution === null || c.contribution === undefined
                    ? "—"
                    : c.contribution.toFixed(4)}
                </td>
                <td className="max-w-xs px-4 py-3 text-slate-400">
                  {c.oneSentenceRead}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
