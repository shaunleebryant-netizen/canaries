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

/** Plain chip labels for members (engine labels stay technical in lib). */
const PLAIN_LABEL: Record<string, string> = {
  "qqq-sma20": "Nasdaq",
  "cyclical-defensive": "Growth",
  "vix-vix3m": "Fear",
  "hyg-ief-sma20": "Credit",
  "nyse-ad": "Breadth",
  sp600: "Small caps",
};

function LightChip({ L, compact }: { L: RegimeLight; compact?: boolean }) {
  const tone =
    L.vote === 1
      ? "text-emerald-400"
      : L.vote === -1
        ? "text-red-400"
        : "text-slate-500";
  return (
    <span
      className={`inline-flex items-baseline gap-0.5 font-mono ${compact ? "text-[11px]" : "text-sm"} ${tone}`}
      title={`${PLAIN_LABEL[L.id] ?? L.label}: ${L.vote === 1 ? "positive" : L.vote === -1 ? "negative" : "neutral"}`}
    >
      <span className="text-slate-500">{PLAIN_LABEL[L.id] ?? L.label}</span>
      <span className="font-bold">{L.symbol}</span>
    </span>
  );
}

/** Plain status sentence for the members card (no internal scores). */
function plainLine(state: RegimeStateName, spec: SpecLevel): string {
  const specText =
    spec === "FULL"
      ? "Riskier small-cap and speculative trades look OK."
      : spec === "HALF"
        ? "Go easy on riskier speculative trades."
        : "Riskier speculative trades are best avoided for now.";
  if (state === "RISK_ON") return `The backdrop is supportive. ${specText}`;
  if (state === "RISK_OFF") return `The backdrop is defensive. ${specText}`;
  return `Signals are mixed, so patience may pay. ${specText}`;
}

function HowToRead() {
  return (
    <details className="rounded-lg border border-white/10 bg-slate-950/40 px-2.5 py-1.5">
      <summary className="cursor-pointer text-[10px] font-semibold uppercase tracking-wide text-slate-500">
        How to read
      </summary>
      <div className="mt-2 space-y-2 text-left text-[11px] leading-relaxed text-slate-400">
        <p>
          Regime is a quick read on the overall market mood: Risk-On, Mixed or
          Risk-Off. It weighs a handful of big-picture signals, such as how the
          Nasdaq is trending, whether investors prefer growth or safety,
          volatility and credit markets. Each one gets a simple up, down or
          neutral vote.
        </p>
        <p>
          The days count shows how long the current regime has lasted. It only
          changes after the new reading holds for a little while, so it
          doesn&apos;t flip on one noisy day.
        </p>
        <p>
          <span className="font-medium text-slate-300">Spec</span> (Full, Half
          or Off) is a separate check on whether the market is friendly to
          riskier, speculative trades like small caps. It looks at how broad
          the rally is. Use Regime to decide how much risk to take overall.
          Education only, not advice.
        </p>
      </div>
    </details>
  );
}

export function MarketRegime({
  data,
  compact = false,
}: {
  data: MarketRegimeView;
  /** Kept for call-site compat; flock S lives on traffic light, not this box. */
  canaryLight?: string | null;
  canaryS?: number | null;
  /** Cockpit: pills + lights only; essays behind How to read. */
  compact?: boolean;
}) {
  const coreLights = data.lights.slice(0, 4);
  const gateLights = data.lights.slice(4);
  const isDraft = data.draft !== false;
  const allLights = [...coreLights, ...gateLights];

  if (compact) {
    return (
      <section
        id="market-regime"
        className="w-full rounded-xl border border-white/10 bg-slate-900/70 p-3 shadow-sm"
      >
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-[10px] font-semibold uppercase tracking-widest text-canary-gold">
            Regime
          </h2>
          <p className="text-[10px] tabular-nums text-slate-500">
            {data.asOf}
            {isDraft ? " · draft" : ""}
          </p>
        </div>

        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          <a
            href="#canary-table"
            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold tracking-wide ring-2 transition hover:brightness-110 ${STATE_PILL[data.stateShown]}`}
            title="Jump to canary table"
          >
            {formatRegimeLabel(data.stateShown)}
          </a>
          <span className="text-[11px] tabular-nums text-slate-400">
            {data.daysInState}d
          </span>
          <span
            className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-semibold ${SPEC_PILL[data.spec]}`}
          >
            Spec {data.spec}
          </span>
        </div>

        <div className="mt-2 flex flex-wrap items-center gap-x-2.5 gap-y-0.5">
          {allLights.map((L) => (
            <LightChip key={L.id} L={L} compact />
          ))}
        </div>

        {data.stateRaw !== data.stateShown ? (
          <p className="mt-1.5 text-[10px] leading-snug text-slate-500">
            Today leans {formatRegimeLabel(data.stateRaw)}; waiting for it to hold
            before the regime changes.
          </p>
        ) : null}

        <p className="mt-1.5 text-[11px] leading-snug text-slate-400">
          {plainLine(data.stateShown, data.spec)}
        </p>

        <div className="mt-2">
          <HowToRead />
        </div>
      </section>
    );
  }

  return (
    <section
      id="market-regime"
      className="w-full rounded-2xl border border-white/10 bg-slate-900/70 p-5 shadow-sm"
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

      <div className="mt-4">
        <HowToRead />
      </div>
    </section>
  );
}
