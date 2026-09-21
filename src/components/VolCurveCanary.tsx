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

export function VolCurveCanary({ data }: { data: VolCurveView }) {
  const stanceLabel = data.stance.replaceAll("_", " ");
  // Keep VIX/VIX3M (+ optional HYG/IEF detail line). Never show Credit Quiet badge.
  const checklist = data.checklist.filter((item) => item.id !== "credit" || item.detail);

  return (
    <section
      id="vol-curve-canary"
      className="mt-6 w-full rounded-2xl border border-white/10 bg-slate-900/70 p-6 shadow-sm"
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

      <p className="mt-3 text-sm leading-snug text-slate-300">{data.oneLiner}</p>

      <div className="mt-3 rounded-xl border border-white/5 bg-slate-950/30 px-3 py-2 text-[11px] leading-relaxed text-slate-400">
        <span className="font-semibold text-slate-300">Bands:</span>{" "}
        <span className="text-emerald-300">SAFE</span> = under 0.91 (calm) ·{" "}
        <span className="text-amber-300">CAUTION</span> = 0.91–0.95 ·{" "}
        <span className="text-red-300">DANGER</span> = 0.96+ (stress).
      </div>

      <div className="mt-5">
        <ChecklistDots items={checklist} />
        <p className="mt-3 text-[11px] text-slate-500">
          <span className="text-emerald-400">●</span> safe ·{" "}
          <span className="text-amber-400">○</span> caution ·{" "}
          <span className="text-red-500">●</span> danger ·{" "}
          <span className="text-slate-600">○</span> pending
        </p>
      </div>

      <details className="mt-4 rounded-xl border border-white/10 bg-slate-950/40 p-3">
        <summary className="cursor-pointer text-xs font-semibold uppercase tracking-wide text-slate-400">
          How to read this box (new traders)
        </summary>
        <ul className="mt-3 space-y-3 text-xs leading-relaxed text-slate-400">
          <li>
            <span className="font-medium text-slate-300">What this box answers:</span>{" "}
            how stressed the options market looks right now — near-term fear
            (VIX) versus medium-term fear (VIX3M). Current volatility vs 3-month
            average volatility.
            <br />
            VIX = 30-day fear. VIX3M = 3-month fear.
            <br />
            Calm market: 3-month fear is higher (ratio under 1).
            <br />
            Panic: 30-day fear jumps above 3-month fear (ratio over 1).{" "}
            <span className="text-slate-300">sizing guide</span>, not a trade
            trigger.
          </li>
          <li>
            <span className="font-medium text-slate-300">SAFE / CAUTION / DANGER:</span>{" "}
            Bands for the VIX/VIX3M ratio —{" "}
            <span className="text-emerald-300">SAFE</span> under 0.91 (calm),{" "}
            <span className="text-amber-300">CAUTION</span> 0.91–0.95,{" "}
            <span className="text-red-300">DANGER</span> 0.96+ (stress). Calm
            band → Low vol, stay in markets; caution/danger → tighten risk,
            expect volatility.
          </li>
          <li>
            <span className="font-medium text-slate-300">HYG / IEF</span> shows
            whether investors want risk or safety in credit.
            <br />
            HYG = junk bonds (credit risk).
            <br />
            IEF = Treasuries (safety).
            <br />
            Rising ratio: junk beating Treasuries → risk-on.
            <br />
            Falling ratio: Treasuries winning → risk-off.
            <br />
            Junk often moves with stocks, so a rising ratio supports equities. A
            drop is a warning, sometimes before stocks roll over.
          </li>
        </ul>
      </details>

      <p className="mt-3 text-[11px] leading-snug text-slate-600">
        {data.draftsNote}
      </p>
    </section>
  );
}
