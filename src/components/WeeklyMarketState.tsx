import type { MarketStateMeta, MarketStateRow } from "@/lib/marketState";
import { stateDots } from "@/lib/marketState";
import { TickerLink } from "@/components/TickerChartLightbox";
import { HowItWorksTitle } from "@/components/ScanHowItWorks";
import { SHOW_WEEKLY_EXAMPLE_CHART } from "@/lib/featureFlags";

const BOX_CLASS =
  "flex max-h-[min(320px,40vh)] flex-col overflow-hidden rounded-xl border border-canary-gold/25 bg-slate-900/60 p-3 shadow-sm ring-1 ring-canary-gold/10";

function StateLegend() {
  return (
    <ul className="space-y-1.5">
      <li className="flex gap-2">
        <span className="mt-1 inline-block h-3 w-3 shrink-0 rounded-sm bg-canary-green" />
        <span>
          <strong className="text-white">Green = bullish.</strong> The short-
          and longer-term trends all point up.
        </span>
      </li>
      <li className="flex gap-2">
        <span className="mt-1 inline-block h-3 w-3 shrink-0 rounded-sm bg-canary-red" />
        <span>
          <strong className="text-white">Red = bearish.</strong> The trends
          all point down.
        </span>
      </li>
      <li className="flex gap-2">
        <span className="mt-1 inline-block h-3 w-3 shrink-0 rounded-sm border border-slate-500 bg-slate-700" />
        <span>
          <strong className="text-white">Grey = undecided.</strong> The trends
          disagree.
        </span>
      </li>
    </ul>
  );
}

const EXAMPLE_ALT =
  "Weekly chart of Advanced Micro Devices (AMD) from 2021 to 2026. Green background bands cover the uptrends, including the climb through 2023 and the big run from late 2025 into 2026. Red bands cover the downtrends in 2022 and from late 2024 to mid 2025. Narrow grey bands mark weeks when the trend was undecided.";

const CAPTIONS = {
  weekly:
    "Example: AMD on a weekly chart. Green stretches are bullish weeks, red stretches are bearish, and the narrow grey bands are weeks when the trend was undecided. Baby Bulls flags a stock in the first few weeks after its colour changes.",
  strong:
    "Example: AMD on a weekly chart. Multi-week Warriors lists stocks that are in a green stretch right now, like AMD's run from late 2025 into 2026. The longer a stock stays green, the higher it sits in the list. When the background turns red or grey, it drops off.",
} as const;

/** Example weekly chart (owner's AMD chart, 2026-09-29) so the colours are easy to picture. */
function StateExample({ caption }: { caption: keyof typeof CAPTIONS }) {
  return (
    <figure className="m-0">
      {/* eslint-disable-next-line @next/next/no-img-element -- small static asset inside a portal dialog */}
      <img
        src="/images/weekly-state-amd.webp"
        width={1200}
        height={657}
        loading="lazy"
        decoding="async"
        alt={EXAMPLE_ALT}
        className="block h-auto w-full max-w-full rounded-lg border border-white/10"
      />
      <figcaption className="mt-1.5 text-xs leading-snug text-slate-400">
        {CAPTIONS[caption]}
      </figcaption>
    </figure>
  );
}

/**
 * Colour key, plus the example chart when SHOW_WEEKLY_EXAMPLE_CHART is on
 * (off by default: renders exactly the plain key).
 */
function ColourKey({ caption }: { caption: keyof typeof CAPTIONS }) {
  return (
    <>
      <StateLegend />
      {SHOW_WEEKLY_EXAMPLE_CHART ? <StateExample caption={caption} /> : null}
    </>
  );
}

function EngineNotes() {
  return (
    <p className="text-xs text-slate-400">
      The current week counts while it is still forming, so a colour can
      change before Friday&apos;s close. Tap a ticker for a weekly chart.
      Education only, not buy or sell advice.
    </p>
  );
}

function Dots({ n, emoji }: { n: number; emoji: string }) {
  const count = Math.max(0, n | 0);
  if (count < 1) return null;
  return (
    <span
      className="inline-flex shrink-0 items-center leading-none tracking-tighter"
      aria-label={`${count} week${count === 1 ? "" : "s"}`}
    >
      {emoji.repeat(count)}
    </span>
  );
}

function TurnList({
  rows,
  emoji,
  tone,
}: {
  rows: MarketStateRow[];
  emoji: string;
  tone: string;
}) {
  return (
    <ul className="mt-1 flex flex-wrap content-start gap-1.5">
      {rows.map((r) => (
        <li
          key={r.ticker}
          className={`inline-flex max-w-full items-center gap-1 whitespace-nowrap rounded-full border ${tone} bg-slate-950/70 px-2 py-0.5 text-xs leading-none`}
          title={`${r.state} for ${r.weeksInState} week${r.weeksInState === 1 ? "" : "s"} (since week of ${r.sinceWeek ?? "?"}; was ${r.prevState ?? "?"})`}
        >
          <TickerLink
            ticker={r.ticker}
            interval="W"
            className="shrink-0 font-semibold tracking-wide text-white decoration-transparent"
          />
          <Dots n={stateDots(r.weeksInState)} emoji={emoji} />
        </li>
      ))}
    </ul>
  );
}

export function WeeklyStateTurns({
  bulls,
  bears: _bears,
  meta,
}: {
  bulls: MarketStateRow[];
  bears: MarketStateRow[];
  meta: MarketStateMeta;
}) {
  void _bears;
  void meta;
  return (
    <article id="weekly-state" className={BOX_CLASS}>
      <div className="flex shrink-0 items-baseline justify-between gap-2">
        <h3 className="m-0 shrink-0 whitespace-nowrap">
          <HowItWorksTitle
            heading="How Baby Bulls works"
            subheading="Newly green on the weekly chart · education only"
            body={
              <>
                <p>
                  Baby Bulls lists stocks that have newly turned green on the
                  weekly chart. It compares a few moving averages (smoothed
                  lines of recent weekly prices) and colours each stock:
                </p>
                <ColourKey caption="weekly" />
                <p>
                  Only newly green (bullish) names are shown. The dots show how
                  many weeks in a row a stock has held green — 🟢 means it
                  turned this week, and more dots mean the change has lasted
                  longer. Names that have held longest sit at the top.
                </p>
                <p>
                  Use it to catch early strength, then check the chart.
                </p>
                <EngineNotes />
              </>
            }
          >
            Baby Bulls 🐂
          </HowItWorksTitle>
        </h3>
        <p className="text-right text-[10px] tracking-wide text-slate-500">
          Showing Strength (🟢= 1 week)
        </p>
      </div>

      {/* Owner 2026-10-02: no TURNED GREEN/RED section headers; Baby Bulls = newly green only. */}
      <div className="mt-2 min-h-0 flex-1 overflow-y-auto pr-0.5">
        {bulls.length === 0 ? (
          <p className="mt-1 text-xs text-slate-400">
            No stocks turned bullish in the last few weeks.
          </p>
        ) : (
          <TurnList rows={bulls} emoji="🟢" tone="border-emerald-500/25" />
        )}
      </div>
    </article>
  );
}

export function BullishStrong({
  rows,
  meta,
}: {
  rows: MarketStateRow[];
  meta: MarketStateMeta;
}) {
  return (
    <article id="bullish-strong" className={BOX_CLASS}>
      <div className="flex shrink-0 items-baseline justify-between gap-2">
        <h3 className="m-0 shrink-0 whitespace-nowrap">
          <HowItWorksTitle
            heading="How Multi-week Warriors works"
            subheading="Weekly green and above the 20-month MA · education only"
            body={
              <>
                <p>
                  Multi-week Warriors lists stocks whose weekly trend is
                  staying green and that are also trading above their 20-month
                  moving average. Green means the short- and longer-term weekly
                  trends all point up:
                </p>
                <ColourKey caption="strong" />
                <p>
                  The number beside each ticker (for example 12w) is how many
                  weeks in a row it has been green. The longest green runs sit
                  at the top, and 🟢🟢🟢 marks names that have stayed green for
                  a good while. When a stock&apos;s week turns red or grey, it
                  drops off the list.
                </p>
                <p>
                  It is a quick way to see which stocks are in steady uptrends.
                  Pair it with the timing boxes if you are looking for an entry.
                </p>
                <EngineNotes />
              </>
            }
          >
            Multi-week Warriors
          </HowItWorksTitle>
        </h3>
        <p className="text-right text-[10px] tracking-wide text-slate-500">
          Ranked weekly strength
        </p>
      </div>

      {rows.length === 0 ? (
        <p className="mt-2 text-xs leading-relaxed text-slate-400">
          No stocks are in a green (bullish) weekly trend in the latest scan.
        </p>
      ) : (
        <ul className="mt-2 flex min-h-0 flex-1 flex-wrap content-start gap-1.5 overflow-y-auto pr-0.5">
          {rows.map((r) => (
            <li
              key={r.ticker}
              className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/25 bg-slate-950/70 px-2.5 py-1 text-xs"
              title={`Green for ${r.weeksInState}${r.historyCapped ? "+" : ""} weeks (since week of ${r.sinceWeek ?? "?"})`}
            >
              <TickerLink
                ticker={r.ticker}
                interval="W"
                className="shrink-0 font-semibold tracking-wide text-white decoration-transparent"
              />
              <span
                className="tabular-nums text-[10px] text-slate-400"
                aria-label={`green for ${r.weeksInState}${r.historyCapped ? " or more" : ""} weeks in a row`}
              >
                {r.weeksInState}
                {r.historyCapped ? "+" : ""}w
              </span>
              {r.weeksInState >= 3 ? (
                <span className="shrink-0 tracking-tighter" aria-hidden>
                  🟢🟢🟢
                </span>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </article>
  );
}
