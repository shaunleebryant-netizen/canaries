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

/** Decide subtitle (owner 2026-10-02): no "(Canaries)" under Risk Guidance. */
function DecideSubtitle({ canaryCount }: { canaryCount: number }) {
  return <>Composite score from {canaryCount} macroeconomic metrics</>;
}

export function DecideHeading({
  theme,
  canaryCount = 13,
}: {
  theme: DecideTheme;
  /** Rows actually rendered in the Canary readings table. */
  canaryCount?: number;
}) {
  const subtitle = theme === "B" || theme === "C" || theme === "R";
  if (theme === "R") {
    // Colours come from globals.css ([data-decide-theme="R"][data-regime=…]).
    return (
      <div className="decide-r-accent px-0.5 py-1 pl-2.5">
        <p className={`decide-r-title ${HEAD}`}>Risk Guidance</p>
        <p className="mt-0.5 text-xs text-slate-400 sm:text-sm">
          <DecideSubtitle canaryCount={canaryCount} />
        </p>
      </div>
    );
  }
  if (theme === "C") {
    return (
      <div className="decide-band rounded-lg border-l-[3px] border-sky-400 bg-gradient-to-r from-sky-500/15 via-sky-500/5 to-transparent px-3 py-2">
        <p className={`flex items-center gap-2 text-sky-300 ${HEAD}`}>
          <GaugeIcon />
          Risk Guidance
        </p>
        <p className="mt-0.5 text-xs text-slate-300 sm:text-sm">
          <DecideSubtitle canaryCount={canaryCount} />
        </p>
      </div>
    );
  }
  return (
    <div className="px-0.5 py-1">
      <p className={`text-sky-300 ${HEAD}`}>Risk Guidance</p>
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
