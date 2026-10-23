import { HeldNote } from "./HeldNote";
import type {
  ComputeVolCurveResult,
  ChecklistDot,
  VolCurveStance,
} from "@/lib/volCurve/computeVolCurve";

const STANCE_PILL: Record<VolCurveStance, string> = {
  SAFE: "bg-emerald-500 text-slate-950 ring-emerald-400/40",
  CAUTION: "bg-amber-400 text-slate-950 ring-amber-300/40",
  DANGER: "bg-red-600 text-white ring-red-400/40",
};

export interface VolCurveView extends ComputeVolCurveResult {
  draft?: boolean;
  feeds?: {
    vix?: { value: number | null; status: string };
    vix3m?: { value: number | null; status: string };
  };
}

function ChecklistDots({
  items,
}: {
  items: ComputeVolCurveResult["checklist"];
}) {
  const color = (d: ChecklistDot) =>
    d === "pass"
      ? "text-emerald-400"
      : d === "fail"
        ? "text-red-500"
        : d === "pending"
          ? "text-slate-600"
          : "text-sky-400";

  return (
    <div className="flex flex-col gap-2">
      {items.map((item) => (
        <div key={item.id} className="flex items-start gap-2 text-sm">
          <span
            className={`mt-0.5 ${color(item.status)}`}
            aria-label={`${item.label} ${item.status}`}
          >
            {item.status === "pending" || item.status === "neutral" ? "○" : "●"}
          </span>
          <div className="min-w-0">
            <p className="text-xs leading-snug text-slate-300">
              <span className="font-medium text-slate-200">{item.label}</span>
              {item.detail ? (
                <span className="text-slate-400"> {item.detail}</span>
              ) : null}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}

/** Plain sentence per stance, used instead of the data one-liner (no bands). */
const STANCE_LINE: Record<VolCurveStance, string> = {
  SAFE: "Short-term fear is calm, so normal position sizes are reasonable.",
  CAUTION:
    "Short-term fear is creeping up, so it may be wise to size a little smaller.",
  DANGER:
    "Short-term fear is high, so smaller positions, hedges or cash make more sense.",
};

function HowToRead() {
  return (
    <details className="rounded-lg border border-white/10 bg-slate-950/40 px-2.5 py-1.5">
      <summary className="cursor-pointer text-[10px] font-semibold uppercase tracking-wide text-slate-500">
        How to read
      </summary>
      <div className="mt-2 space-y-2 text-left text-[11px] leading-relaxed text-slate-400">
        <p>
          The vol curve compares how nervous investors are about the next month
          with how nervous they are about the next few months. It uses the VIX
          (the market&apos;s &ldquo;fear gauge&rdquo;) and its three-month
          version.
        </p>
        <p>
          In normal times, people worry more about the long run than about next
          week, so the short-term number sits lower. When short-term fear
          catches up with or overtakes the longer one, markets are usually under
          stress. The number shown is simply one divided by the other: lower
          is calmer.
        </p>
        <p>
          <span className="text-emerald-300">Safe</span>,{" "}
          <span className="text-amber-300">Caution</span> and{" "}
          <span className="text-red-300">Danger</span> sum that up. Use it to
          decide how big your positions should be, not when to buy or sell. If the date says
          &ldquo;held since&rdquo;, the data wasn&apos;t updated today and we
          are showing the last good reading.
          Education only, not advice.
        </p>
      </div>
    </details>
  );
}

export function VolCurveCanary({
  data,
  compact = false,
  heldSince = null,
}: {
  data: VolCurveView;
  compact?: boolean;
  /** Set when this box was not refreshed on the pack session. */
  heldSince?: string | null;
}) {
  const stanceLabel = data.stance.replaceAll("_", " ");
  const checklist = data.checklist.filter(
    (item) => item.id !== "credit" || item.detail
  );

  if (compact) {
    return (
      <section
        id="vol-curve-canary"
        className="w-full rounded-xl border border-white/10 bg-slate-900/70 p-3 shadow-sm"
      >
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-[10px] font-semibold uppercase tracking-widest text-canary-gold">
            Vol curve
          </h2>
          <p className="text-[10px] tabular-nums text-slate-500">
            {heldSince ? <HeldNote since={heldSince} /> : data.asOf}
          </p>
        </div>

        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          <span
            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold tracking-wide ring-2 ${STANCE_PILL[data.stance]}`}
          >
            {stanceLabel}
          </span>
          {data.mediumRatio != null ? (
            <span className="inline-flex items-center gap-1 rounded-full border border-white/15 bg-slate-950/60 px-2 py-0.5 text-[11px] text-slate-200">
              <span className="text-slate-500">VIX/VIX3M</span>
              <span className="font-semibold tabular-nums text-white">
                {data.mediumRatio.toFixed(3)}
              </span>
            </span>
          ) : null}
        </div>

        <p className="mt-1.5 text-[11px] leading-snug text-slate-400">
          {STANCE_LINE[data.stance]}
        </p>

        <div className="mt-2">
          <HowToRead />
        </div>
      </section>
    );
  }

  return (
    <section
      id="vol-curve-canary"
      className="w-full rounded-2xl border border-white/10 bg-slate-900/70 p-5 shadow-sm"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 max-w-3xl">
          <h2 className="text-sm font-semibold uppercase tracking-widest text-canary-gold">
            Volatility curve - VIX / VIX3M
          </h2>
          <p className="mt-1 text-xs leading-snug text-slate-400">
            Measures the market’s current risk regime and volatility term
            structure: How expensive or cheap near-term fear is versus
            three-month expected volatility—so you can size risk and decide when
            hedges or cash are warranted rather than time individual entries and
            exits.
          </p>
          <p className="mt-1 text-[11px] uppercase tracking-wide text-slate-500">
            Can I expect volatility in the current market environment?
          </p>
        </div>
        <p className="shrink-0 text-xs tabular-nums text-slate-500">
          as of {data.asOf}
          {heldSince ? <HeldNote since={heldSince} className="ml-1" /> : null}
        </p>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <span
          className={`inline-flex items-center rounded-full px-5 py-2 text-lg font-bold tracking-wide ring-4 ${STANCE_PILL[data.stance]}`}
        >
          {stanceLabel}
        </span>
        {data.mediumRatio != null ? (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-slate-950/60 px-3 py-1.5 text-sm text-slate-200">
            <span className="text-slate-500">VIX/VIX3M</span>
            <span className="font-semibold tabular-nums text-white">
              {data.mediumRatio.toFixed(3)}
            </span>
          </span>
        ) : null}
      </div>

      <p className="mt-3 text-sm leading-snug text-slate-300">
        {STANCE_LINE[data.stance]}
      </p>

      <div className="mt-5">
        <ChecklistDots items={checklist} />
        <p className="mt-3 text-[11px] text-slate-500">
          <span className="text-emerald-400">●</span> safe ·{" "}
          <span className="text-amber-400">○</span> caution ·{" "}
          <span className="text-red-500">●</span> danger ·{" "}
          <span className="text-slate-600">○</span> pending
        </p>
      </div>

      <div className="mt-4">
        <HowToRead />
      </div>

      <p className="mt-3 text-[11px] leading-snug text-slate-600">
        {data.draftsNote}
      </p>
    </section>
  );
}
