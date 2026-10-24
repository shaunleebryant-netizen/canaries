import type { FishAlert, FishSignal } from "@/lib/loadFishAlerts";
import { SignalCalcTitle } from "@/components/SignalCalcLightbox";
import { TickerLink } from "@/components/TickerChartLightbox";

function signalLabel(signal: FishSignal): string {
  switch (signal) {
    case "smile":
      return "🙂";
    case "fish":
      return "🐟";
    case "both":
      return "🙂🐟";
  }
}

export function FishAlerts({ alerts }: { alerts: FishAlert[] }) {
  return (
    <article
      id="fish-alerts"
      className="flex max-h-[min(320px,40vh)] flex-col overflow-hidden rounded-xl border border-canary-gold/25 bg-slate-900/60 p-3 shadow-sm ring-1 ring-canary-gold/10"
    >
      <div className="flex shrink-0 items-baseline justify-between gap-2">
        <h3 className="m-0">
          <SignalCalcTitle>Time to fish</SignalCalcTitle>
        </h3>
        <p className="text-[10px] uppercase tracking-wide text-slate-500">
          🙂 / 🐟 · daily
        </p>
      </div>

      {alerts.length === 0 ? (
        <p className="mt-2 text-xs leading-relaxed text-slate-400">
          No smiley or fish marks in the latest scan.
        </p>
      ) : (
        <ul className="mt-2 min-h-0 flex-1 space-y-0.5 overflow-y-auto pr-0.5">
          {alerts.map((a) => (
            <li
              key={`${a.ticker}-${a.asOf}-${a.signal}`}
              className="flex items-center gap-2 rounded-md border border-white/5 bg-slate-950/40 px-2 py-1 text-xs"
            >
              <TickerLink ticker={a.ticker} />
              <span className="shrink-0 text-slate-200" title={a.signal}>
                {signalLabel(a.signal)}
              </span>
              <span className="ml-auto tabular-nums text-[10px] text-slate-500 shrink-0 whitespace-nowrap">
                {a.asOf}
              </span>
            </li>
          ))}
        </ul>
      )}
    </article>
  );
}
