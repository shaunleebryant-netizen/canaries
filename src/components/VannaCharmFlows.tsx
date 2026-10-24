import type { VannaCharmResult } from "@/lib/vannaCharm";

const STATUS_PILL: Record<VannaCharmResult["status"], string> = {
  SUPPORTIVE: "bg-emerald-500 text-slate-950 ring-emerald-400/40",
  ON_HOLIDAY: "bg-canary-red text-white ring-canary-red/40",
};

/** Plain window note per status (replaces the calendar-rule note). */
const WINDOW_LINE: Record<VannaCharmResult["status"], string> = {
  SUPPORTIVE: "Mid-month: hedging flows tend to build",
  ON_HOLIDAY: "Around expiry: flows tend to fade until early next month",
};

function HowToRead() {
  return (
    <details className="rounded-lg border border-white/10 bg-slate-950/40 px-2.5 py-1.5">
      <summary className="cursor-pointer text-[10px] font-semibold uppercase tracking-wide text-slate-500">
        How to read
      </summary>
      <div className="mt-2 space-y-2 text-left text-[11px] leading-relaxed text-slate-400">
        {/* Owner 2026-10-11: labels kept (layout / homepage screenshot); explainer softened, no direction. */}
        <p>
          Vanna &amp; Charm Flows tracks the options calendar. Big options
          dealers adjust their hedges as time passes and as expiry nears, and
          those hedging flows tend to build through the middle of the month and
          fade around monthly expiry.
        </p>
        <p>
          <span className="font-medium text-emerald-300">Supportive</span> means
          we are in the part of the month when those flows tend to build.{" "}
          <span className="font-medium text-red-300">On holiday</span> means
          they tend to fade, around the monthly options expiry and into the
          start of the next month.
        </p>
        <p>
          It is based only on the calendar, not on prices. Flows are one input
          among many; they don&apos;t reliably predict direction on their own.
          Treat it as background context next to the other Risk Guidance cards.
          Education only, not advice.
        </p>
      </div>
    </details>
  );
}

export function VannaCharmFlows({
  data,
  compact = true,
}: {
  data: VannaCharmResult;
  compact?: boolean;
}) {
  if (compact) {
    return (
      <section
        id="vanna-charm"
        className="w-full rounded-xl border border-white/10 bg-slate-900/70 p-3 shadow-sm"
      >
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-[10px] font-semibold uppercase tracking-widest text-canary-gold">
            Vanna &amp; Charm Flows
          </h2>
          <p className="text-[10px] tabular-nums text-slate-500">{data.asOf}</p>
        </div>

        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          <span
            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold tracking-wide ring-2 ${STATUS_PILL[data.status]}`}
          >
            {data.label}
          </span>
          <span className="text-[11px] text-slate-400">
            {WINDOW_LINE[data.status]}
          </span>
        </div>

        <p className="mt-1.5 text-[11px] leading-snug text-slate-500">
          Monthly options-hedging rhythm · calendar based
        </p>

        <div className="mt-2">
          <HowToRead />
        </div>
      </section>
    );
  }

  return (
    <section
      id="vanna-charm"
      className="w-full rounded-2xl border border-white/10 bg-slate-900/70 p-5 shadow-sm"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-widest text-canary-gold">
            Vanna &amp; Charm Flows
          </h2>
          <p className="mt-1 text-xs leading-snug text-slate-400">
            A monthly rhythm in options hedging that often helps the market
            mid-month and fades around options expiry.
          </p>
        </div>
        <p className="shrink-0 text-xs tabular-nums text-slate-500">
          as of {data.asOf}
        </p>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <span
          className={`inline-flex items-center rounded-full px-5 py-2 text-base font-bold tracking-wide ring-4 ${STATUS_PILL[data.status]}`}
        >
          {data.label}
        </span>
        <span className="text-sm text-slate-400">
          {WINDOW_LINE[data.status]}
        </span>
      </div>

      <div className="mt-4">
        <HowToRead />
      </div>
    </section>
  );
}
