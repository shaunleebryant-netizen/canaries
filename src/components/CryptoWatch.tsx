import type {
  CryptoWatchAlert,
  CryptoWatchKind,
} from "@/lib/loadCryptoWatchAlerts";
import { SignalCalcTitle } from "@/components/SignalCalcLightbox";
import { TickerLink } from "@/components/TickerChartLightbox";

const EMOJI: Record<CryptoWatchKind, string> = {
  smile: "🙂",
  fish: "🐟",
  exhaustion: "🥵",
  skull: "💀",
};

function signalMarks(signals: CryptoWatchKind[]): string {
  return signals.map((s) => EMOJI[s] ?? s).join("");
}

export function CryptoWatch({ alerts }: { alerts: CryptoWatchAlert[] }) {
  return (
    <article
      id="crypto-watch"
      className="flex max-h-[min(320px,42vh)] flex-col overflow-hidden rounded-xl border border-canary-gold/25 bg-slate-900/60 p-3 shadow-sm ring-1 ring-canary-gold/10"
    >
      <div className="flex shrink-0 flex-wrap items-baseline justify-between gap-2">
        <h3 className="m-0">
          <SignalCalcTitle variant="crypto-watch">Crypto Watch</SignalCalcTitle>
        </h3>
        <p className="text-[10px] uppercase tracking-wide text-slate-500">
          🙂/🐟 · 🥵/💀 · crypto
        </p>
      </div>
      <p className="mt-1 shrink-0 text-[10px] leading-snug text-slate-500">
        Top coins by market cap, with the same marks as the
        Fish and Sweaty boxes.
      </p>

      {alerts.length === 0 ? (
        <p className="mt-2 text-xs leading-relaxed text-slate-400">
          No coins have a fresh mark in the latest scan.
        </p>
      ) : (
        <ul className="mt-2 min-h-0 flex-1 space-y-0.5 overflow-y-auto pr-0.5">
          {alerts.map((a) => (
            <li
              key={`${a.ticker}-${a.asOf}-${a.signals.join("-")}`}
              className="flex items-center gap-2 rounded-md border border-white/5 bg-slate-950/40 px-2 py-1 text-xs"
            >
              <TickerLink ticker={a.ticker} />
              <span
                className="shrink-0 text-slate-200"
                title={a.signals.join(", ")}
              >
                {signalMarks(a.signals)}
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
