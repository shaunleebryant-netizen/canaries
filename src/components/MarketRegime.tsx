import type {
  ComputeRegimeResult,
  RegimeLight,
  RegimeStateName,
  SpecLevel,
} from "@/lib/regime/computeRegime";

const STATE_PILL: Record<RegimeStateName, string> = {
  RISK_ON: "bg-emerald-500 text-slate-950 ring-emerald-400/40",
  MIXED: "bg-amber-400 text-slate-950 ring-amber-300/40",
  RISK_OFF: "bg-orange-500 text-white ring-orange-400/40",
};

const SPEC_PILL: Record<SpecLevel, string> = {
  FULL: "border-violet-400/40 bg-violet-500/15 text-violet-100",
  HALF: "border-amber-400/40 bg-amber-500/10 text-amber-100",
  OFF: "border-white/20 bg-slate-950/60 text-slate-200",
};

export interface MarketRegimeView extends ComputeRegimeResult {
  draft?: boolean;
}

function formatRegimeLabel(state: RegimeStateName): string {
  return state.replaceAll("_", "-");
}

function LightChip({ L }: { L: RegimeLight }) {
  const tone =
    L.vote === 1
      ? "text-emerald-400"
      : L.vote === -1
        ? "text-red-400"
        : "text-slate-500";
  return (
    <span className={`inline-flex items-baseline gap-1 font-mono text-sm ${tone}`}>
      <span className="text-slate-400">{L.label}</span>
      <span className="font-bold">{L.symbol}</span>
    </span>
  );
}

export function MarketRegime({
  data,
}: {
  data: MarketRegimeView;
  /** Kept for call-site compat; flock S lives on traffic light, not this box. */
  canaryLight?: string | null;
  canaryS?: number | null;
}) {
  const coreLights = data.lights.slice(0, 4);
  const gateLights = data.lights.slice(4);
  const isDraft = data.draft !== false;

  return (
    <section
      id="market-regime"
      className="w-full rounded-2xl border border-white/10 bg-slate-900/70 p-6 shadow-sm"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 max-w-3xl">
          <h2 className="text-sm font-semibold uppercase tracking-widest text-canary-gold">
            Regime
          </h2>
          <p className="mt-1 text-xs leading-snug text-slate-400">
            Current market regime can be Risk-On, Mixed, or Risk-Off so you know
            whether to be fully invested or stay out of markets.
          </p>
          <p className="mt-1 text-xs leading-snug text-slate-400">
            Speculation considers background market structure and whether it is
            safe to include speculation on riskier small/mid-caps.
          </p>
          <p className="mt-1 text-[11px] uppercase tracking-wide text-slate-500">
            6-input decision rule
            {isDraft ? " · draft · not deployed" : ""}
          </p>
        </div>
        <p className="shrink-0 text-xs tabular-nums text-slate-500">
          as of {data.asOf}
          {isDraft ? (
            <span className="ml-2 rounded border border-amber-400/30 bg-amber-500/10 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-amber-200">
              draft
            </span>
          ) : null}
        </p>
      </div>

      {/* REGIME row — pill + days + four environment lights (no R) */}
      <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
        <span className="w-14 shrink-0 text-xs font-semibold uppercase tracking-wide text-slate-500">
          Regime
        </span>
        <a
          href="#canary-table"
          className={`inline-flex items-center rounded-full px-4 py-1.5 text-base font-bold tracking-wide ring-4 transition hover:brightness-110 ${STATE_PILL[data.stateShown]}`}
          title="Jump to canary table"
        >
          {formatRegimeLabel(data.stateShown)}
        </a>
        <span className="tabular-nums text-slate-400">
          {data.daysInState} day{data.daysInState === 1 ? "" : "s"}
        </span>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
          {coreLights.map((L) => (
            <LightChip key={L.id} L={L} />
          ))}
        </div>
        {data.stateRaw !== data.stateShown ? (
          <span className="w-full text-[11px] text-slate-500 sm:w-auto">
            today&apos;s raw call: {formatRegimeLabel(data.stateRaw)} (waiting for
            a second confirming day)
          </span>
        ) : null}
      </div>

      {/* SPEC row — pill + note + two gate lights */}
      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
        <span className="w-14 shrink-0 text-xs font-semibold uppercase tracking-wide text-slate-500">
          Spec
        </span>
        <span
          className={`inline-flex items-center rounded-lg border px-3 py-1.5 text-sm font-semibold ${SPEC_PILL[data.spec]}`}
        >
          {data.spec}
        </span>
        <span className="text-slate-400">{data.specNote}</span>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
          {gateLights.map((L) => (
            <LightChip key={L.id} L={L} />
          ))}
        </div>
      </div>

      <p className="mt-4 text-sm leading-snug text-slate-300">{data.oneLiner}</p>

      <details className="mt-4 rounded-xl border border-white/10 bg-slate-950/40 p-3">
        <summary className="cursor-pointer text-xs font-semibold uppercase tracking-wide text-slate-400">
          How to read this box (new traders)
        </summary>
        <ul className="mt-3 space-y-3 text-xs leading-relaxed text-slate-400">
          <li>
            <span className="font-medium text-slate-300">Regime</span> considers
            four environment (risk appetite) metrics: QQQ20, Cyc/Def, VIX3M,
            HYG/IEF.
          </li>
          <li>
            <span className="font-medium text-slate-300">Days</span> = number of
            days in the current regime. We use a 2-day hysteresis so the pill
            doesn&apos;t flip on one noisy session.
          </li>
          <li>
            <span className="font-medium text-slate-300">Spec</span> = FULL / HALF
            / OFF. This determines whether speculative / high-risk trades are
            allowed in the current regime. It considers NYSE Advancers–Decliners
            and the SP600. Switches off if Regime is Mixed or Risk-off or the
            QQQ/VIX stress vote is −1.
          </li>
        </ul>
      </details>
    </section>
  );
}
