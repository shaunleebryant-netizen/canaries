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

export function TrafficLightDisplay({
  light,
  S,
  asOf,
  stance,
  size = "lg",
  showStance = true,
  showComposite = true,
}: {
  light: Light;
  S?: number;
  asOf?: string;
  stance?: Stance;
  size?: "sm" | "lg";
  showStance?: boolean;
  /** Public sneak peek may hide S; members keep full composite. */
  showComposite?: boolean;
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
