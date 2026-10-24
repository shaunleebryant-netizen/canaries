import type { VolumeBreadthResult, VolumeBreadthRegime } from "@/lib/volumeBreadth";
import { HeldNote } from "./HeldNote";

const REGIME_PILL: Record<VolumeBreadthRegime, string> = {
  RISK_ON: "bg-emerald-500 text-slate-950 ring-emerald-400/40",
  RISK_OFF: "bg-canary-red text-white ring-canary-red/40",
  NO_REGIME: "bg-slate-600 text-slate-100 ring-slate-500/40",
  PENDING: "border border-dashed border-amber-400/40 bg-amber-500/10 text-amber-100",
};

/** UI labels only — enums stay RISK_ON / RISK_OFF in lib/stub. */
function formatRegime(r: VolumeBreadthRegime): string {
  switch (r) {
    case "RISK_ON":
      return "Supportive";
    case "RISK_OFF":
      return "Low Liquidity";
    case "NO_REGIME":
      return "No call";
    case "PENDING":
      return "PENDING";
  }
}

function formatRegimeShort(r: VolumeBreadthRegime): string {
  return formatRegime(r);
}

/** Plain sentence per regime, used instead of the data one-liner. */
const REGIME_LINE: Record<VolumeBreadthRegime, string> = {
  RISK_ON: "More money is flowing into rising stocks than falling ones. That supports the market.",
  RISK_OFF: "More money is flowing into falling stocks. Rallies may struggle to last.",
  NO_REGIME: "Buying and selling are fairly balanced right now, so there's no clear message.",
  PENDING: "Waiting for fresh volume data.",
};

function fmt(n: number | null, digits = 3): string {
  if (n == null) return "—";
  return n.toFixed(digits);
}

function HowToRead() {
  return (
    <details className="rounded-lg border border-white/10 bg-slate-950/40 px-2.5 py-1.5">
      <summary className="cursor-pointer text-[10px] font-semibold uppercase tracking-wide text-slate-500">
        How to read
      </summary>
      <div className="mt-2 space-y-2 text-left text-[11px] leading-relaxed text-slate-400">
        <p>
          Liquidity shows whether trading volume on the New York Stock Exchange
          is going mostly into stocks that are rising or into stocks that are
          falling.
        </p>
        <p>
          It compares the volume in rising stocks with the volume in falling
          ones, then smooths that out over a short and a longer period to
          find the trend. <span className="text-emerald-300">Supportive</span>{" "}
          means buying volume is in charge.{" "}
          <span className="text-red-300">Low Liquidity</span> means selling
          volume is in charge. <span className="text-slate-300">No call</span>{" "}
          means it is too close to tell.
        </p>
        <p>
          It is most useful next to price. A rising market with supportive
          liquidity is healthier than one making new highs on weak volume. If the date says
          &ldquo;held since&rdquo;, the data wasn&apos;t updated today and we
          are showing the last good reading.
          Education only, not advice.
        </p>
      </div>
    </details>
  );
}

export function VolumeBreadth({
  data,
  compact = false,
  heldSince = null,
}: {
  data: VolumeBreadthResult;
  compact?: boolean;
  /** Set when this box was not refreshed on the pack session. */
  heldSince?: string | null;
}) {
  const isPending = data.status === "PENDING";
  const isPartial = data.status === "PARTIAL";
  const oneLiner = REGIME_LINE[data.regime];

  if (compact) {
    return (
      <section
        id="liquidity"
        className="w-full rounded-xl border border-white/10 bg-slate-900/70 p-3 shadow-sm"
      >
        {/* Legacy deep-link alias */}
        <span id="volume-breadth" className="sr-only" aria-hidden />
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-[10px] font-semibold uppercase tracking-widest text-canary-gold">
            Liquidity
          </h2>
          <p className="text-[10px] tabular-nums text-slate-500">
            {heldSince ? <HeldNote since={heldSince} /> : (data.asOf ?? "—")}
            {data.draft ? " · draft" : ""}
          </p>
        </div>

        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          <span
            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold tracking-wide ring-2 ${REGIME_PILL[data.regime]}`}
          >
            {formatRegimeShort(data.regime)}
          </span>
          {!isPending || data.ratio != null ? (
            <>
              <span className="inline-flex items-center gap-1 rounded-full border border-white/15 bg-slate-950/60 px-2 py-0.5 text-[11px] text-slate-200">
                <span className="text-slate-500">Ratio</span>
                <span className="font-semibold tabular-nums text-white">
                  {fmt(data.ratio)}
                </span>
              </span>
              <span className="inline-flex items-center gap-1 rounded-full border border-white/15 bg-slate-950/60 px-2 py-0.5 text-[11px] text-slate-200">
                <span className="text-slate-500">Fast/slow</span>
                <span className="font-semibold tabular-nums text-white">
                  {fmt(data.ema13)}/{fmt(data.ema34)}
                </span>
              </span>
            </>
          ) : null}
        </div>

        <p className="mt-1.5 text-[11px] leading-snug text-slate-400">
          {oneLiner}
        </p>

        {isPending || isPartial ? (
          <p className="mt-1 line-clamp-2 text-[10px] leading-snug text-amber-200/80">
            {isPartial
              ? "Still building enough history for the trend. The latest reading is shown."
              : "Waiting for fresh volume data."}
          </p>
        ) : null}

        <div className="mt-2">
          <HowToRead />
        </div>
      </section>
    );
  }

  return (
    <section
      id="liquidity"
      className="w-full rounded-2xl border border-white/10 bg-slate-900/70 p-5 shadow-sm"
    >
      <span id="volume-breadth" className="sr-only" aria-hidden />
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 max-w-3xl">
          <h2 className="text-sm font-semibold uppercase tracking-widest text-canary-gold">
            Liquidity
          </h2>
          <p className="mt-1 text-xs leading-snug text-slate-400">
            Is trading volume going mostly into rising stocks or falling ones?
          </p>
          <p className="mt-1 text-[11px] uppercase tracking-wide text-slate-500">
            Liquidity gauge for the tape.
            {data.draft ? " · draft" : ""}
          </p>
        </div>
        <p className="shrink-0 text-xs tabular-nums text-slate-500">
          {data.asOf ? `as of ${data.asOf}` : "as of —"}
          {heldSince ? <HeldNote since={heldSince} className="ml-1" /> : null}
        </p>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <span
          className={`inline-flex items-center rounded-full px-5 py-2 text-base font-bold tracking-wide ring-4 ${REGIME_PILL[data.regime]}`}
        >
          {formatRegime(data.regime)}
        </span>
        {!isPending || data.ratio != null ? (
          <>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-slate-950/60 px-3 py-1.5 text-sm text-slate-200">
              <span className="text-slate-500">Ratio</span>
              <span className="font-semibold tabular-nums text-white">
                {fmt(data.ratio)}
              </span>
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-slate-950/60 px-3 py-1.5 text-sm text-slate-200">
              <span className="text-slate-500">Fast / slow</span>
              <span className="font-semibold tabular-nums text-white">
                {fmt(data.ema13)} / {fmt(data.ema34)}
              </span>
            </span>
          </>
        ) : null}
      </div>

      <p className="mt-3 text-sm leading-snug text-slate-300">{oneLiner}</p>

      {isPending || isPartial ? (
        <div className="mt-4 rounded-xl border border-dashed border-amber-400/25 bg-amber-500/5 px-4 py-3 text-xs leading-relaxed text-amber-100/90">
          <p className="font-semibold text-amber-200">
            {isPartial
              ? "Latest reading shown · trend still building"
              : "Waiting for volume data"}
          </p>
          <p className="mt-1 text-slate-400">
            {data.pendingReason ??
              "Yahoo does not currently expose clean NYSE up/down volume symbols. Rules below still apply once a feed is wired — no invented prints."}
          </p>
          {data.symbolsTried.length > 0 ? (
            <p className="mt-2 font-mono text-[10px] text-slate-500">
              Tried: {data.symbolsTried.join(", ")}
            </p>
          ) : null}
        </div>
      ) : null}


      <div className="mt-4">
        <HowToRead />
      </div>
    </section>
  );
}
