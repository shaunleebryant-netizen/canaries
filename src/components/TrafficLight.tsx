import type { TrafficLight as Light, Stance } from "@/lib/types";

const COLORS: Record<Light, string> = {
  Green: "bg-canary-green shadow-canary-green/40",
  Amber: "bg-canary-amber shadow-canary-amber/40",
  Red: "bg-canary-red shadow-canary-red/40",
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
}: {
  light: Light;
  S: number;
  asOf: string;
  stance?: Stance;
  size?: "sm" | "lg";
  showStance?: boolean;
}) {
  const dim = size === "lg" ? "h-28 w-28" : "h-14 w-14";
  const asOfLabel = new Date(asOf).toLocaleString("en-NZ", {
    timeZone: "Pacific/Auckland",
    dateStyle: "medium",
    timeStyle: "short",
  });

  return (
    <div className="flex flex-col items-center gap-3 text-center">
      <div
        className={`${dim} rounded-full ${COLORS[light]} shadow-lg ring-8 ${RING[light]} animate-pulse-soft`}
        role="img"
        aria-label={`Traffic light: ${light}`}
      />
      <div>
        <p className="text-sm uppercase tracking-widest text-slate-500">Composite S</p>
        <p className="text-3xl font-semibold tabular-nums">{S.toFixed(2)}</p>
        <p className={`mt-1 text-lg font-medium ${
          light === "Green" ? "text-canary-green" : light === "Red" ? "text-canary-red" : "text-canary-amber"
        }`}>
          {light}
        </p>
        {showStance && stance ? (
          <p className="mt-1 text-sm text-slate-600">{stance}</p>
        ) : null}
        <p className="mt-2 text-xs text-slate-400">as of {asOfLabel} PT</p>
      </div>
    </div>
  );
}
