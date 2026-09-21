import type { FishAlert, FishSignal } from "@/lib/loadFishAlerts";

function signalLabel(signal: FishSignal): string {
  switch (signal) {
    case "smile":
      return "🙂 smile";
    case "fish":
      return "🐟 fish";
    case "both":
      return "🙂 + 🐟";
  }
}

export function FishAlerts({ alerts }: { alerts: FishAlert[] }) {
  return (
    <article
      id="fish-alerts"
      className="rounded-2xl border border-canary-gold/25 bg-slate-900/60 p-4 shadow-sm ring-1 ring-canary-gold/10"
    >
      <h3 className="font-medium text-white">Fish alerts</h3>
      <p className="mt-1 text-[11px] uppercase tracking-wide text-canary-gold/80">
        Bottom Finder 🙂 / 🐟 · daily chart · 4H signals · education only
      </p>

      {alerts.length === 0 ? (
        <p className="mt-4 text-sm leading-relaxed text-slate-300">
          No smile/fish hits in the latest scan. Next pass will refresh this
          list from the owner universe.
        </p>
      ) : (
        <ul className="mt-4 space-y-2">
          {alerts.map((a) => (
            <li
              key={`${a.ticker}-${a.asOf}-${a.signal}`}
              className="flex flex-wrap items-baseline justify-between gap-2 rounded-lg border border-white/10 bg-slate-950/40 px-3 py-2"
            >
              <span className="font-semibold tracking-wide text-white">
                {a.ticker}
              </span>
              <span className="text-sm text-slate-200">
                {signalLabel(a.signal)}
              </span>
              <span className="w-full text-[11px] tabular-nums text-slate-500">
                as of {a.asOf}
                {a.note ? ` · ${a.note}` : ""}
              </span>
            </li>
          ))}
        </ul>
      )}
    </article>
  );
}
