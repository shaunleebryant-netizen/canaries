import type { TrafficLight as Light, Stance } from "@/lib/types";
import { LocalTime } from "./LocalTime";

const LIGHT_CLASS: Record<Light, string> = {
  Green: "canary-light-green animate-pulse-soft",
  Amber: "canary-light-amber animate-pulse-soft",
  Red: "canary-light-red animate-pulse-soft",
};

const RING: Record<Light, string> = {
  Green: "ring-canary-green/30",
  Amber: "ring-canary-amber/30",
  Red: "ring-canary-red/30",
};

/** Lit lamp fills (no pulse) for compact cockpit stack. */
const LAMP_ON: Record<Light, string> = {
  Red: "bg-canary-red shadow-[0_0_14px_rgba(239,68,68,0.85)]",
  Amber: "bg-canary-amber shadow-[0_0_14px_rgba(245,158,11,0.85)]",
  Green: "bg-canary-green shadow-[0_0_14px_rgba(34,197,94,0.85)]",
};

const LAMP_OFF = "bg-slate-800 ring-1 ring-white/10";

/** Option B: seat scores −2…+2 weighted → composite S roughly −2…+2. */
const S_RANGE_MIN = -2;
const S_RANGE_MAX = 2;

function bandLabel(light: Light): string {
  if (light === "Green") return "Green: conditions look healthy";
  if (light === "Amber") return "Amber: mixed, take care";
  return "Red: conditions look risky";
}

function RangeBar({
  S,
  thin,
  fill,
}: {
  S: number;
  thin?: boolean;
  /** Stretch to parent width (info rail). */
  fill?: boolean;
}) {
  const span = S_RANGE_MAX - S_RANGE_MIN;
  const pct = Math.max(0, Math.min(100, ((S - S_RANGE_MIN) / span) * 100));
  // Band markers: Red < -0.3, Amber to +0.6, Green ≥ +0.6
  const amberStart = ((-0.3 - S_RANGE_MIN) / span) * 100;
  const greenStart = ((0.6 - S_RANGE_MIN) / span) * 100;

  const widthCls = fill
    ? "mt-0 w-full"
    : thin
      ? "mx-auto mt-1 w-full max-w-[9rem]"
      : "mx-auto mt-2 w-full max-w-[11rem]";

  return (
    <div className={widthCls}>
      <div
        className={`relative overflow-hidden rounded-full bg-slate-800 ${thin || fill ? "h-1.5" : "h-2"}`}
      >
        <div
          className="absolute inset-y-0 left-0 bg-canary-red/50"
          style={{ width: `${amberStart}%` }}
        />
        <div
          className="absolute inset-y-0 bg-canary-amber/50"
          style={{ left: `${amberStart}%`, width: `${greenStart - amberStart}%` }}
        />
        <div
          className="absolute inset-y-0 right-0 bg-canary-green/50"
          style={{ left: `${greenStart}%` }}
        />
        <div
          className={`absolute top-1/2 -translate-y-1/2 bg-white shadow ${thin || fill ? "h-2.5 w-0.5" : "h-3 w-0.5"}`}
          style={{ left: `calc(${pct}% - 1px)` }}
          title={`Score ${S >= 0 ? "+" : ""}${S.toFixed(2)}`}
        />
      </div>
      {!thin && !fill ? (
        <p className="mt-1 text-[10px] tabular-nums text-slate-500">
          Riskier ← → healthier
        </p>
      ) : null}
    </div>
  );
}

function CompactLampStack({ light }: { light: Light }) {
  const lamps: Light[] = ["Red", "Amber", "Green"];
  return (
    <div
      className="flex shrink-0 flex-col items-center gap-2 rounded-2xl border border-white/15 bg-gradient-to-b from-slate-800 to-slate-950 px-2.5 py-3 shadow-inner ring-1 ring-black/40"
      role="img"
      aria-label={`Traffic light: ${light}`}
      data-canary-light={light}
    >
      {lamps.map((lamp) => {
        const on = lamp === light;
        return (
          <span
            key={lamp}
            className={`h-8 w-8 rounded-full ring-2 ring-black/50 ${on ? LAMP_ON[lamp] : LAMP_OFF}`}
            title={lamp}
            aria-hidden
          />
        );
      })}
    </div>
  );
}

function BandChip({
  label,
  active,
  tone,
}: {
  label: string;
  active: boolean;
  tone: "green" | "amber" | "red";
}) {
  const activeCls =
    tone === "green"
      ? "border-canary-green/50 bg-canary-green/15 text-canary-green"
      : tone === "amber"
        ? "border-canary-amber/50 bg-canary-amber/15 text-canary-amber"
        : "border-canary-red/50 bg-canary-red/15 text-canary-red";
  return (
    <span
      className={`rounded-md border px-1.5 py-0.5 text-[9px] font-semibold tabular-nums leading-tight ${
        active
          ? activeCls
          : "border-white/5 bg-slate-950/40 text-slate-600"
      }`}
    >
      {label}
    </span>
  );
}

function CompactInfoRail({
  light,
  S,
  stance,
  showStance,
  showRange,
  weightSum,
  vetoApplied,
  asOfLabel,
}: {
  light: Light;
  S?: number;
  stance?: Stance;
  showStance: boolean;
  showRange: boolean;
  weightSum?: number;
  vetoApplied?: boolean;
  asOfLabel: string | null;
}) {
  return (
    <div className="flex min-w-0 flex-1 flex-col justify-between gap-1.5 border-l border-white/10 pl-3">
      <div>
        <p className="text-[9px] font-semibold uppercase tracking-widest text-canary-gold/80">
          Riskier ← → healthier
        </p>
        {showRange && S != null ? (
          <div className="mt-1">
            <RangeBar S={S} thin fill />
          </div>
        ) : (
          <p className="mt-1 text-[10px] text-slate-600">—</p>
        )}
      </div>

      <div className="flex flex-wrap gap-1">
        <BandChip
          label="Green"
          active={light === "Green"}
          tone="green"
        />
        <BandChip
          label="Amber"
          active={light === "Amber"}
          tone="amber"
        />
        <BandChip label="Red" active={light === "Red"} tone="red" />
      </div>

      {weightSum != null && vetoApplied ? (
        <p
          className="text-[10px] leading-snug text-amber-200/90"
          title="A warning sign is keeping the light from turning Green"
        >
          Held back from Green by a warning sign
        </p>
      ) : null}

      {asOfLabel ? (
        <p className="text-[9px] tabular-nums text-slate-600">
          as of <LocalTime iso={asOfLabel} />
        </p>
      ) : null}
    </div>
  );
}

export function TrafficLightDisplay({
  light,
  S,
  asOf,
  stance,
  size = "lg",
  showStance = true,
  showComposite = true,
  showRange = true,
  compact = false,
  weightSum,
  vetoApplied,
}: {
  light: Light;
  S?: number;
  asOf?: string;
  stance?: Stance;
  size?: "sm" | "lg";
  showStance?: boolean;
  /** Public sneak peek may hide S; members keep full composite. */
  showComposite?: boolean;
  /** Show full S range (−2…+2) and current band. */
  showRange?: boolean;
  /** Cockpit decide: lamps | S | info rail. */
  compact?: boolean;
  /** Members cockpit: total seat weights. */
  weightSum?: number;
  /** Members cockpit: green veto applied. */
  vetoApplied?: boolean;
}) {
  const dim = size === "lg" ? "h-28 w-28" : "h-14 w-14";
  const ring = "ring-8";
  // ISO timestamp; rendered by <LocalTime> (ET on server, visitor-local after mount).
  const asOfLabel = asOf != null && asOf !== "" ? asOf : null;

  const sSigned =
    S != null ? `${S >= 0 ? "+" : ""}${S.toFixed(2)}` : null;

  const lightTone =
    light === "Green"
      ? "text-canary-green"
      : light === "Red"
        ? "text-canary-red"
        : "text-canary-amber";

  if (compact) {
    return (
      <div className="flex items-stretch gap-3 text-left">
        {/* LEFT — traffic housing */}
        <CompactLampStack light={light} />

        {/* MIDDLE — Composite S */}
        <div className="flex min-w-[5.5rem] shrink-0 flex-col justify-center">
          {showComposite && S != null ? (
            <>
              <p className="text-[9px] uppercase tracking-widest text-slate-500">
                Overall score
              </p>
              <p className="text-3xl font-semibold tabular-nums leading-none text-white">
                {sSigned}
              </p>
              <p className={`mt-1 text-sm font-semibold ${lightTone}`}>{light}</p>
            </>
          ) : (
            <p className={`text-sm font-semibold ${lightTone}`}>{light}</p>
          )}
          {showStance && stance ? (
            <p className="mt-1 text-[10px] leading-snug text-slate-500">
              {stance}
            </p>
          ) : null}
        </div>

        {/* RIGHT — info rail fills remaining space */}
        <CompactInfoRail
          light={light}
          S={S}
          stance={stance}
          showStance={showStance}
          showRange={showRange}
          weightSum={weightSum}
          vetoApplied={vetoApplied}
          asOfLabel={asOfLabel}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-3 text-center">
      <div
        className={`${dim} rounded-full shadow-lg ${ring} ${RING[light]} ${LIGHT_CLASS[light]}`}
        role="img"
        aria-label={`Traffic light: ${light}`}
        data-canary-light={light}
      />
      <div>
        {showComposite && S != null ? (
          <>
            <p className="text-sm uppercase tracking-widest text-slate-400">
              Overall score
            </p>
            <p className="text-3xl font-semibold tabular-nums text-white">
              {S.toFixed(2)}
            </p>
            {showRange ? (
              <>
                <p className="mt-1 text-[11px] leading-snug text-slate-400">
                  Now{" "}
                  <span className="font-medium text-slate-200">
                    {sSigned} {light}
                  </span>
                </p>
                <RangeBar S={S} />
                <p className="mt-1 text-[10px] text-slate-500">
                  {bandLabel(light)}
                </p>
              </>
            ) : null}
          </>
        ) : (
          <p className="text-sm uppercase tracking-widest text-slate-400">
            Weekly reading
          </p>
        )}
        <p className={`mt-1 text-lg font-medium ${lightTone}`}>{light}</p>
        {showStance && stance ? (
          <p className="mt-1 text-sm text-slate-300">{stance}</p>
        ) : null}
        {asOfLabel ? (
          <p className="mt-2 text-xs text-slate-500">
            as of <LocalTime iso={asOfLabel} />
          </p>
        ) : null}
      </div>
    </div>
  );
}

/** Plain "How to read" for the composite traffic light (members Decide). */
export function CompositeHowToRead() {
  return (
    <details className="mt-2 rounded-lg border border-white/10 bg-slate-950/40 px-2.5 py-1.5">
      <summary className="cursor-pointer text-[10px] font-semibold uppercase tracking-wide text-slate-500">
        How to read
      </summary>
      <div className="mt-2 space-y-2 text-left text-[11px] leading-relaxed text-slate-400">
        <p>
          The traffic light is our overall read on the US market. It combines
          our 13 &ldquo;canaries&rdquo;, early-warning signals such as market
          breadth (how many stocks are joining in), volatility, credit and
          small caps, into one score.
        </p>
        <p>
          Each canary gives a simple vote on whether things look healthy or
          risky. Every canary feeds into the overall score with its own
          weighting, so some count for more than others. The score is shown
          on a bar from riskier to healthier. Green means conditions look
          healthy, Amber means mixed and Red means risky. A serious warning
          sign can keep the light from turning Green on its own.
        </p>
        <p>
          Use it as a guide to how much risk to take, from fully invested to
          sitting out. If a line says &ldquo;held since&rdquo; a date, that
          input wasn&apos;t updated today, so we are still using its last good
          reading from that date. Education only, not advice.
        </p>
      </div>
    </details>
  );
}
