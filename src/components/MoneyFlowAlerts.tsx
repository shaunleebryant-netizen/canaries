import type { MoneyFlowAlert } from "@/lib/loadMoneyFlowAlerts";
import { MoneyFlowCalcTitle } from "@/components/MoneyFlowLightbox";
import { TickerLink } from "@/components/TickerChartLightbox";

const RECENT_SESSIONS = 5;
const MIN_ROWS = 5;

export function MoneyFlowAlerts({
  alerts,
  prints = [],
  sessionDates = [],
}: {
  alerts: MoneyFlowAlert[];
  /** Every 💵 print in the scan's history window (money-flow-alerts.json `prints`). */
  prints?: MoneyFlowAlert[];
  /** Scan trading-session calendar (money-flow-alerts.json `sessionDates`). */
  sessionDates?: string[];
}) {
  // MFI Washout v6.1 (owner 2026-10-07; v6 since 2026-10-06): 💵 only. The old 🍒 caution zone is retired.
  const today = alerts.filter((a) => a.signal === "mfi_os");
  // Owner 2026-10-10: never an empty box. No marks today → the 💵 marks from the last 5 sessions (newest
  // first); fewer than ~5 today → topped up from those sessions. Real prints only, never invented.
  const recentDays = new Set(sessionDates.slice(-RECENT_SESSIONS));
  const seen = new Set(today.map((a) => `${a.ticker}|${a.asOf}`));
  const recent = prints
    .filter((p) => p.signal === "mfi_os" && recentDays.has(p.asOf) && !seen.has(`${p.ticker}|${p.asOf}`))
    .sort((a, b) => (a.asOf !== b.asOf ? (a.asOf < b.asOf ? 1 : -1) : a.ticker.localeCompare(b.ticker)));
  const ordered = today.length >= MIN_ROWS ? today : [...today, ...recent];
  const note =
    today.length === 0 && ordered.length
      ? `None today · showing last ${RECENT_SESSIONS} sessions`
      : today.length < MIN_ROWS && ordered.length > today.length
        ? `${today.length} today · plus last ${RECENT_SESSIONS} sessions`
        : null;
  return (
    <article
      id="money-flow-alerts"
      className="flex max-h-[min(320px,40vh)] flex-col overflow-hidden rounded-xl border border-canary-gold/25 bg-slate-900/60 p-3 shadow-sm ring-1 ring-canary-gold/10"
    >
      <div className="flex shrink-0 items-baseline justify-between gap-2">
        <h3 className="m-0">
          <MoneyFlowCalcTitle>MFI Scan</MoneyFlowCalcTitle>
        </h3>
        <p className="text-[10px] uppercase tracking-wide text-slate-500">
          💵 · daily
        </p>
      </div>
      {note ? <p className="mt-1 shrink-0 text-[10px] text-slate-500">{note}</p> : null}

      {ordered.length === 0 ? (
        <p className="mt-2 text-xs leading-relaxed text-slate-400">
          No new MFI washouts on the latest daily bar.
        </p>
      ) : (
        <ul className="mt-2 min-h-0 flex-1 space-y-0.5 overflow-y-auto pr-0.5">
          {ordered.map((a) => (
            <li
              key={`${a.ticker}-${a.asOf}-${a.signal}`}
              className="flex items-center gap-2 rounded-md border border-white/5 bg-slate-950/40 px-2 py-1 text-xs"
            >
              <TickerLink ticker={a.ticker} />
              <span
                className="shrink-0 text-base leading-none"
                title="MFI washout: selling washed out, money flow turning up"
              >
                💵
              </span>
              <span className="ml-auto shrink-0 whitespace-nowrap tabular-nums text-[10px] text-slate-500">
                {a.asOf}
              </span>
            </li>
          ))}
        </ul>
      )}
    </article>
  );
}
