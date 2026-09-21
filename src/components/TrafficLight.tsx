import type { TrafficLight as Light, Stance } from "@/lib/types";

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

/** Option B: seat scores −2…+2 weighted → composite S roughly −2…+2. */
const S_RANGE_MIN = -2;
const S_RANGE_MAX = 2;

function bandLabel(light: Light): string {
  if (light === "Green") return "Green S≥+0.6";
  if (light === "Amber") return "Amber −0.3≤S<+0.6";
  return "Red S<−0.3";
}

function RangeBar({ S }: { S: number }) {
  const span = S_RANGE_MAX - S_RANGE_MIN;
  const pct = Math.max(0, Math.min(100, ((S - S_RANGE_MIN) / span) * 100));
  // Band markers: Red < -0.3, Amber to +0.6, Green ≥ +0.6
  const amberStart = ((-0.3 - S_RANGE_MIN) / span) * 100;
  const greenStart = ((0.6 - S_RANGE_MIN) / span) * 100;

  return (
    <div className="mx-auto mt-2 w-full max-w-[11rem]">
      <div className="relative h-2 overflow-hidden rounded-full bg-slate-800">
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
          className="absolute top-1/2 h-3 w-0.5 -translate-y-1/2 bg-white shadow"
          style={{ left: `calc(${pct}% - 1px)` }}
          title={`S ${S >= 0 ? "+" : ""}${S.toFixed(2)}`}
        />
      </div>
      <p className="mt-1 text-[10px] tabular-nums text-slate-500">
        S range ≈ {S_RANGE_MIN} … +{S_RANGE_MAX}
      </p>
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
}) {
  const dim = size === "lg" ? "h-28 w-28" : "h-14 w-14";
  const asOfLabel =
    asOf != null
      ? new Date(asOf).toLocaleString("en-NZ", {
          timeZone: "Pacific/Auckland",
          dateStyle: "medium",
          timeStyle: "short",
        })
      : null;

  const sSigned =
    S != null ? `${S >= 0 ? "+" : ""}${S.toFixed(2)}` : null;

  return (
    <div className="flex flex-col items-center gap-3 text-center">
      <div
        className={`${dim} rounded-full shadow-lg ring-8 ${RING[light]} ${LIGHT_CLASS[light]}`}
        role="img"
        aria-label={`Traffic light: ${light}`}
        data-canary-light={light}
      />
      <div>
        {showComposite && S != null ? (
          <>
            <p className="text-sm uppercase tracking-widest text-slate-400">Composite S</p>
            <p className="text-3xl font-semibold tabular-nums text-white">{S.toFixed(2)}</p>
            {showRange ? (
              <>
                <p className="mt-1 text-[11px] leading-snug text-slate-400">
                  Full range ≈ −2 to +2. · now{" "}
                  <span className="font-medium text-slate-200">
                    {sSigned} {light}
                  </span>
                </p>
                <RangeBar S={S} />
                <p className="mt-1 text-[10px] text-slate-500">{bandLabel(light)}</p>
              </>
            ) : null}
          </>
        ) : (
          <p className="text-sm uppercase tracking-widest text-slate-400">Weekly reading</p>
        )}
        <p
          className={`mt-1 text-lg font-medium ${
            light === "Green"
              ? "text-canary-green"
              : light === "Red"
                ? "text-canary-red"
                : "text-canary-amber"
          }`}
        >
          {light}
        </p>
        {showStance && stance ? (
          <p className="mt-1 text-sm text-slate-300">{stance}</p>
        ) : null}
        {asOfLabel ? (
          <p className="mt-2 text-xs text-slate-500">as of {asOfLabel} PT</p>
        ) : null}
      </div>
    </div>
  );
}
