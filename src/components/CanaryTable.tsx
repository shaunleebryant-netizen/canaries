import type { MembersPayload } from "@/lib/types";
import { Sparkline } from "./Sparkline";
import { HeldNote } from "./HeldNote";
import { MEMBERS_CANARY_CHARTS } from "@/lib/featureFlags";
import { CanaryChartButtonLazy as CanaryChartButton } from "./CanaryChartButtonLazy";
import { CANARY_COPY, howCalculated, plainLastReading, plainRead, plainSource } from "@/lib/canaryCopy";

type Row = MembersPayload["canaries"][0];

/** Plain signal word instead of the internal point score. */
function scoreLabel(row: Row) {
  if (row.status === "UNVERIFIED" || row.score === "UNVERIFIED" || row.score === null) {
    return "No data";
  }
  if (typeof row.score === "number" && row.score > 0) return "Healthy";
  if (typeof row.score === "number" && row.score < 0) return "Warning";
  return "Neutral";
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
      className="scroll-mt-4 overflow-x-auto rounded-2xl border border-white/10 bg-slate-900/70 shadow-sm"
    >
      <div className="border-b border-white/10 px-4 py-3">
        <h2 className="text-sm font-semibold uppercase tracking-widest text-canary-gold">
          Canary readings
        </h2>
        <p className="mt-1 text-xs leading-snug text-slate-400">
          Each row is one of our canaries, an early-warning signal for the
          market. Every night each one is checked against its own recent trend
          and marked Healthy, Neutral or Warning. Each canary then feeds into
          the overall score with its own weighting, since some matter more
          than others, and that score sets the traffic light. The small chart shows the last couple of weeks. How calculated
          shows the market expression behind each canary. If a row says
          &ldquo;held since&rdquo; a date, it wasn&apos;t updated today and we
          are showing its last good reading.
        </p>
        <p className="mt-1 text-[11px] uppercase tracking-wide text-slate-500">
          Education only
        </p>
      </div>
      <table className="min-w-full text-left text-sm">
        <thead className="border-b border-white/10 bg-slate-950/60 text-xs uppercase tracking-wide text-slate-400">
          <tr>
            <th className="px-3 py-3 font-medium">Recent</th>
            <th className="px-4 py-3 font-medium">Canary</th>
            <th className="px-4 py-3 font-medium">How calculated</th>
            <th className="px-4 py-3 font-medium">Last reading</th>
            <th className="px-4 py-3 font-medium">Signal</th>
            <th className="px-4 py-3 font-medium">What it says</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((c) => {
            const unverified =
              c.status === "UNVERIFIED" ||
              c.score === "UNVERIFIED" ||
              c.score === null;
            const hasSpark = Boolean(c.sparkline && c.sparkline.length > 1);
            const emptyNote = emptyNotes?.[c.id]
              ?.replace(/\s*[—-]\s*no \d+-session chart/i, ", so there's no daily chart")
              .replace(/\s*\(not daily\)/i, "");
            const copy = CANARY_COPY[c.id];
            const derived = howCalculated(c.name, c.description);
            return (
              <tr
                key={c.id}
                className={`border-b border-white/5 last:border-0 ${
                  unverified ? "bg-slate-950/40" : ""
                }`}
              >
                <td className="px-3 py-3 align-middle">
                  {MEMBERS_CANARY_CHARTS && !unverified ? (
                    <div className="mb-1">
                      <CanaryChartButton
                        id={c.id}
                        name={copy?.name ?? c.name}
                        how={derived.title}
                        howDetail={derived.detail}
                        reading={plainLastReading(c.lastReading)}
                        signal={scoreLabel(c)}
                        signalClass={scoreClass(c)}
                        limitedNote={
                          c.id === "finra-margin"
                            ? "FINRA margin debt is published monthly and entered by hand, so there is no daily history to chart yet. The reading and signal below are the latest monthly figure."
                            : null
                        }
                      />
                    </div>
                  ) : null}
                  {hasSpark ? (
                    <>
                      <Sparkline
                        values={c.sparkline!}
                        signal={unverified || typeof c.score !== "number" ? null : c.score}
                      />
                      {c.sparklineHeldSince ? (
                        <div className="mt-0.5">
                          <HeldNote since={c.sparklineHeldSince} />
                        </div>
                      ) : null}
                    </>
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
                  <div className="font-medium text-white">
                    {copy?.name ?? c.name}
                  </div>
                  <div className="min-w-[12rem] max-w-xs text-xs text-slate-500">
                    {copy?.description ?? c.description}
                  </div>
                  {c.status ? (
                    <div
                      className={`mt-1 text-[10px] font-semibold uppercase tracking-wide ${
                        unverified
                          ? "text-slate-500"
                          : c.status === "HELD"
                            ? "text-amber-300"
                            : "text-emerald-400"
                      }`}
                    >
                      {unverified
                        ? "No data · left out"
                        : c.status === "HELD"
                          ? "Held"
                          : "Live"}
                    </div>
                  ) : null}
                  {!hasSpark && emptyNote ? (
                    <div className="mt-1 max-w-[14rem] text-[10px] leading-snug text-slate-600">
                      {emptyNote}
                    </div>
                  ) : null}
                </td>
                <td className="px-4 py-3">
                  <div className="font-medium text-slate-200">{derived.title}</div>
                  {derived.detail ? (
                    <div className="mt-0.5 max-w-[18rem] text-xs leading-snug text-slate-400">
                      {derived.detail}
                    </div>
                  ) : null}
                </td>
                <td className="px-4 py-3 tabular-nums text-slate-300">
                  {plainLastReading(c.lastReading)}
                  {c.fresh === false && c.heldSince ? (
                    <div className="mt-1">
                      <HeldNote since={c.heldSince} />
                    </div>
                  ) : null}
                  {c.evidence?.source ? (
                    <div className="mt-1 text-[10px] leading-snug text-slate-500">
                      {plainSource(c.evidence.source)}
                      {c.evidence.date ? ` · ${c.evidence.date}` : ""}
                    </div>
                  ) : null}
                </td>
                <td className={`px-4 py-3 font-semibold tabular-nums ${scoreClass(c)}`}>
                  {scoreLabel(c)}
                </td>
                <td className="max-w-xs px-4 py-3 text-slate-400">
                  {plainRead(c.oneSentenceRead)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
