import type { ReactNode } from "react";
import type { SetupCondition } from "@/lib/setupsCore.mjs";
import { TickerLink } from "@/components/TickerChartLightbox";

/** Icon + plain label (no dates) for each Main Scanner condition. */
export const CONDITION_META: Record<
  string,
  { icon: (c: SetupCondition) => ReactNode; label: (c: SetupCondition) => string }
> = {
  fish: { icon: () => "🐟", label: () => "Recent Fish print" },
  smile: {
    icon: () => "😊",
    label: (c) => `Recent smiley print${c.source ? ` (${c.source})` : ""}`,
  },
  mfi_os: { icon: () => "💵", label: () => "Recent MFI washout" },
  weekly_bull: {
    // Owner 2026-10-10: show ONE dot; the streak (×dots, weeks) stays in the hover label.
    icon: () => "🟢",
    label: (c) => `Weekly trend bullish${(c.dots ?? 1) > 1 ? ` · weekly green ×${c.dots}` : ""} (${c.weeks ?? "?"} wk)`,
  },
  monthly_20ma: { icon: () => "📈", label: () => "Monthly trend turned up" },
  ibd: {
    icon: () => (
      <span className="rounded bg-emerald-500/15 px-1 py-px text-[9px] font-semibold uppercase tracking-wide text-emerald-300">
        IBD
      </span>
    ),
    label: () => "In IBD Setups",
  },
  // Retired 2026-10-06 with the old MFI zone scan (kept so older history rows still render).
  mfi_ob: { icon: () => "🍒", label: () => "Recently in the MFI caution zone" },
  sweaty: { icon: () => "🥵", label: () => "Recent Sweaty print" },
  skull: { icon: () => "💀", label: () => "Recent skull print" },
  weekly_bear: {
    // Owner 2026-10-10: show ONE dot; the streak (×dots, weeks) stays in the hover label.
    icon: () => "🔴",
    label: (c) => `Weekly trend bearish${(c.dots ?? 1) > 1 ? ` · weekly red ×${c.dots}` : ""} (${c.weeks ?? "?"} wk)`,
  },
};

function shortDate(ymd: string): string {
  // YYYY-MM-DD → MM-DD for compact chips (full date in tooltip).
  return ymd.length >= 10 ? ymd.slice(5, 10) : ymd;
}

export function SetupChips({
  rows,
  tone,
}: {
  rows: {
    ticker: string;
    count: number;
    added: string;
    conditions: SetupCondition[];
  }[];
  tone: "bull" | "bear";
}) {
  const border = tone === "bull" ? "border-emerald-500/25" : "border-rose-500/25";
  const badge =
    tone === "bull"
      ? "bg-emerald-500/15 text-emerald-300"
      : "bg-rose-500/15 text-rose-300";
  // Single-line neat rows (owner 2026-10-02): no pill wrap; truncate trailing date if needed.
  return (
    <ul className="mt-2 flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto pr-0.5">
      {rows.map((r) => (
        <li
          key={r.ticker}
          className={`flex min-w-0 items-center gap-1.5 whitespace-nowrap rounded-md border ${border} bg-slate-950/70 px-2 py-1 text-xs`}
          title={`${r.count} conditions: ${r.conditions
            .map((c) => CONDITION_META[c.id]?.label(c) ?? c.id)
            .join(" · ")} · added ${r.added}`}
        >
          <TickerLink
            ticker={r.ticker}
            className="shrink-0 font-semibold tracking-wide text-white"
          />
          <span
            className={`shrink-0 rounded-full px-1.5 text-[10px] font-bold tabular-nums ${badge}`}
            aria-label={`${r.count} conditions`}
          >
            {r.count}
          </span>
          <span className="inline-flex min-w-0 shrink items-center gap-0.5 overflow-hidden" aria-hidden>
            {r.conditions.map((c) => (
              <span key={c.id} className="shrink-0 tracking-tighter">
                {CONDITION_META[c.id]?.icon(c) ?? c.id}
              </span>
            ))}
          </span>
          <span className="ml-auto shrink-0 truncate tabular-nums text-[10px] text-slate-500">
            since {shortDate(r.added)}
          </span>
        </li>
      ))}
    </ul>
  );
}

export const MAIN_BOX_CLASS =
  "flex h-full max-h-[min(380px,48vh)] min-h-0 flex-col overflow-hidden rounded-xl border border-canary-gold/40 bg-slate-900/70 p-3 shadow-sm ring-1 ring-canary-gold/20";
