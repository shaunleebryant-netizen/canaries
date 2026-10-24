import type { EtfWatchAlert, EtfWatchKind } from "@/lib/loadEtfWatchAlerts";
import { SignalCalcTitle, type SignalCalcVariant } from "@/components/SignalCalcLightbox";
import { TickerLink } from "@/components/TickerChartLightbox";
import { HeldNote } from "@/components/HeldNote";

const EMOJI: Record<EtfWatchKind, string> = {
  smile: "🙂",
  fish: "🐟",
  exhaustion: "🥵",
  skull: "💀",
};

function signalMarks(signals: EtfWatchKind[]): string {
  return signals.map((s) => EMOJI[s] ?? s).join("");
}

/**
 * ETF scanner box. Owner 2026-10-06: split into "Sector ETFs" (id etf-watch, default)
 * and "Countries" (id etf-countries). Same Canary RelRSI marks and 26rem scroll box.
 */
export function EtfWatch({
  alerts,
  id = "etf-watch",
  title = "Sector ETFs",
  variant = "etf-watch",
  tagline = "🙂/🐟 · 🥵/💀 · sectors/indexes",
  blurb = "Sector and index funds, metals and uranium, with the same marks as the Fish and Sweaty boxes. No leveraged or inverse funds.",
  names,
  heldSince,
  emptyText = "No funds have a fresh mark in the latest scan.",
}: {
  alerts: EtfWatchAlert[];
  id?: string;
  title?: string;
  variant?: SignalCalcVariant;
  tagline?: string;
  blurb?: string;
  /** Optional ticker → label (e.g. country name) shown next to the ticker. */
  names?: Record<string, string>;
  heldSince?: string | null;
  emptyText?: string;
}) {
  return (
    <article
      id={id}
      className="flex min-w-0 max-h-[min(320px,42vh)] flex-col overflow-hidden rounded-xl border border-canary-gold/25 bg-slate-900/60 p-3 shadow-sm ring-1 ring-canary-gold/10"
    >
      <div className="flex shrink-0 flex-wrap items-baseline justify-between gap-2">
        <h3 className="m-0">
          <SignalCalcTitle variant={variant}>{title}</SignalCalcTitle>
        </h3>
        <p className="text-[10px] uppercase tracking-wide text-slate-500">{tagline}</p>
      </div>
      <p className="mt-1 shrink-0 text-[10px] leading-snug text-slate-500">
        {blurb}
        {heldSince ? (
          <>
            {" "}
            <HeldNote since={heldSince} />
          </>
        ) : null}
      </p>

      {alerts.length === 0 ? (
        <p className="mt-2 text-xs leading-relaxed text-slate-400">{emptyText}</p>
      ) : (
        <ul className="mt-2 min-h-0 flex-1 space-y-0.5 overflow-y-auto pr-0.5">
          {alerts.map((a) => (
            <li
              key={`${a.ticker}-${a.asOf}-${a.signals.join("-")}`}
              className="flex min-w-0 items-center gap-2 rounded-md border border-white/5 bg-slate-950/40 px-2 py-1 text-xs"
            >
              <TickerLink ticker={a.ticker} />
              {names?.[a.ticker] ? (
                <span className="w-24 shrink-0 truncate text-[11px] text-slate-400">
                  {names[a.ticker]}
                </span>
              ) : null}
              <span className="shrink-0 text-slate-200" title={a.signals.join(", ")}>
                {signalMarks(a.signals)}
              </span>
              <span className="ml-auto min-w-0 tabular-nums text-[10px] text-slate-500 shrink-0 whitespace-nowrap">
                {a.asOf}
              </span>
            </li>
          ))}
        </ul>
      )}
    </article>
  );
}

/** Countries box: single-country ETFs, ticker · country name. */
export function EtfCountries({
  alerts,
  names,
  heldSince,
}: {
  alerts: EtfWatchAlert[];
  names: Record<string, string>;
  heldSince?: string | null;
}) {
  return (
    <EtfWatch
      alerts={alerts}
      id="etf-countries"
      title="Countries"
      variant="etf-country"
      tagline="🙂/🐟 · 🥵/💀 · country funds"
      blurb="Single-country funds, with the same marks as the Fish and Sweaty boxes. No leveraged or inverse funds."
      names={names}
      heldSince={heldSince}
      emptyText="No country funds have a fresh mark in the latest scan."
    />
  );
}
