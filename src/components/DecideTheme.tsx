/**
 * DRAFT (2026-09-26): section headings for the DECIDE_THEME mockups (A/B/C).
 * Only rendered when DECIDE_THEME !== "current"; the live look uses the
 * original inline headings in src/app/members/page.tsx.
 * Colours: Decide = sky (#7dd3fc text, #38bdf8 accents), Scanners = canary gold.
 */
import type { DecideTheme } from "@/lib/featureFlags";
import type { ReactNode } from "react";

function GaugeIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-5 w-5 shrink-0 sm:h-6 sm:w-6"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M3.5 17a9 9 0 1 1 17 0" />
      <path d="M12 17l4.5-6" />
      <circle cx="12" cy="17" r="1.4" fill="currentColor" />
    </svg>
  );
}

function RadarIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-5 w-5 shrink-0 sm:h-6 sm:w-6"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="5" opacity={0.6} />
      <path d="M12 12l6-6" />
      <circle cx="12" cy="12" r="1.3" fill="currentColor" />
    </svg>
  );
}

const HEAD =
  "text-base font-bold uppercase tracking-[0.15em] sm:text-lg";

/**
 * Owner t755u: the heading names the current regime instead of a static "Risk Guidance".
 * Bands are the composite's own (green S ≥ +0.6, amber −0.3…+0.6, red < −0.3); contrarian extremes are
 * S ≥ +1.4 ("Euphoric") and S ≤ −1.4 ("Blood in the Streets") on the −2…+2 scale (~70% of the maximum).
 */
export const EUPHORIC_S = 1.4;
export const BLOOD_S = -1.4;
export function regimeLabel(light: string | null | undefined, S: number | null | undefined): { text: string; cls: string; note?: string } {
  const l = String(light ?? "").toLowerCase();
  if (typeof S === "number" && S >= EUPHORIC_S) return { text: "Euphoric", cls: "text-lime-300 drop-shadow-[0_0_6px_rgba(190,242,100,0.55)]", note: "Composite at a contrarian high: crowd is all-in, stay alert to a turn." };
  // Red-light tape + members Close notice still apply when light is red, including S ≤ −1.4. This note is unchanged.
  if (typeof S === "number" && S <= BLOOD_S) return { text: "Blood in the Streets", cls: "text-red-700", note: "Composite at a contrarian low: may be time to start buying quality stocks." };
  if (l === "green") return { text: "Risk-On! Bullish", cls: "text-emerald-400" };
  if (l === "amber" || l === "yellow") return { text: "Half Account, Cautious", cls: "text-amber-400" };
  if (l === "red") return { text: "Defensive, Risk-Off", cls: "text-rose-500" };
  return { text: "Risk Guidance", cls: "text-sky-300" };
}

function RegimeTitle({ light, S, className = "" }: { light?: string | null; S?: number | null; className?: string }) {
  const r = regimeLabel(light, S);
  return (
    <>
      <p className={`${HEAD} ${r.cls} ${className}`} data-regime-label={r.text}>{r.text}</p>
      {r.note ? <p className={`mt-0.5 text-xs font-semibold ${r.cls}`}>{r.note}</p> : null}
    </>
  );
}

/** Decide subtitle (owner 2026-10-02): no "(Canaries)" under Risk Guidance. */
function DecideSubtitle({ canaryCount }: { canaryCount: number }) {
  return <>Composite score from {canaryCount} macroeconomic metrics</>;
}

export function DecideHeading({
  theme,
  canaryCount = 13,
  light,
  S,
}: {
  theme: DecideTheme;
  light?: string | null;
  S?: number | null;
  /** Rows actually rendered in the Canary readings table. */
  canaryCount?: number;
}) {
  const subtitle = theme === "B" || theme === "C" || theme === "R";
  if (theme === "R") {
    // Colours come from globals.css ([data-decide-theme="R"][data-regime=…]).
    return (
      <div className="decide-r-accent px-0.5 py-1 pl-2.5">
        <RegimeTitle light={light} S={S} />
        <p className="mt-0.5 text-xs text-slate-400 sm:text-sm">
          <DecideSubtitle canaryCount={canaryCount} />
        </p>
      </div>
    );
  }
  if (theme === "C") {
    return (
      <div className="decide-band rounded-lg border-l-[3px] border-sky-400 bg-gradient-to-r from-sky-500/15 via-sky-500/5 to-transparent px-3 py-2">
<RegimeTitle light={light} S={S} />
        <p className="mt-0.5 text-xs text-slate-300 sm:text-sm">
          <DecideSubtitle canaryCount={canaryCount} />
        </p>
      </div>
    );
  }
  return (
    <div className="px-0.5 py-1">
      <RegimeTitle light={light} S={S} />
      {subtitle ? (
        <p className="mt-0.5 text-xs text-slate-400 sm:text-sm">
          <DecideSubtitle canaryCount={canaryCount} />
        </p>
      ) : null}
    </div>
  );
}

export function ScanHeading({
  theme,
  id,
  title,
  subtitle,
}: {
  theme: DecideTheme;
  id: string;
  title: string;
  subtitle?: ReactNode;
}) {
  const showSub = (theme === "B" || theme === "C" || theme === "R") && subtitle;
  if (theme === "C") {
    return (
      <div className="border-b border-canary-gold/20 pb-1.5">
        <h2 id={id} className={`flex items-center gap-2 text-canary-gold ${HEAD}`}>
          <RadarIcon />
          {title}
        </h2>
        {showSub ? (
          <p className="mt-0.5 text-xs text-slate-400 sm:text-sm">{subtitle}</p>
        ) : null}
      </div>
    );
  }
  return (
    <div>
      <h2 id={id} className={`${theme === "R" ? "text-sky-300" : "text-canary-gold"} ${HEAD}`}>
        {title}
      </h2>
      {showSub ? (
        <p className="mt-0.5 text-xs text-slate-400 sm:text-sm">{subtitle}</p>
      ) : null}
    </div>
  );
}
