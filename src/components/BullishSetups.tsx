import type { BullishSetup } from "@/lib/bullishSetups";
import { HowItWorksTitle } from "@/components/ScanHowItWorks";
import { MAIN_BOX_CLASS, SetupChips } from "@/components/MainScannerSetups";
import { SetupsPanel } from "@/components/SetupsTable";
import type { GrowthRow } from "@/lib/loadGrowthScore";
import type { FundRow } from "@/lib/loadFundamentals";
import { MEMBERS_GROWTH_SCORE, MEMBERS_SETUPS_COLUMNS } from "@/lib/featureFlags";

function BullishBody() {
  return (
    <>
      <p>
        Bullish Setups is our main list of stocks that look ready to move up.
        Every ticker here meets several bullish conditions from the Sub
        Scanners further down the page, and at least one of them is a fresh
        timing signal, such as a recent 🐟 fish, 😊 smiley or a 💵 MFI washout from the last five trading days.
      </p>
      <p>
        The other conditions come from the slower boxes: a bullish weekly
        trend (🟢), a monthly trend that has just turned up (📈) and a place
        in IBD Setups. The idea is that when a quick timing signal lines up
        with a healthy longer trend, the setup is more interesting than either
        one alone.
      </p>
      <p>
        The number beside each ticker is how many conditions it meets, and the
        names with the most sit at the top. The The &ldquo;since&rdquo; date isldquo;AlertThe &ldquo;since&rdquo; date isrdquo; date is
        the day it first made the list, and it keeps that date for as long as
        it stays on. Stocks that also show up in Bearish Setups are left out.
      </p>
      <p className="text-xs text-slate-400">
        Built only from signals already shown in the Sub Scanners. An empty
        list is normal on quiet days. Education only, not buy or sell advice.
      </p>
    </>
  );
}

export function BullishSetups({
  setups,
  asOf,
  fundamentals,
  growth,
  growthScored,
}: {
  setups: BullishSetup[];
  asOf: string;
  /** Owner 2026-10-10 (MEMBERS_SETUPS_COLUMNS): P/E · EPS g · EV/EBITDA columns. Omitted → chip rows. */
  fundamentals?: Record<string, FundRow>;
  /** Owner 2026-10-10 (MEMBERS_GROWTH_SCORE): Growth column + Columns menu. Omitted → no Growth column. */
  growth?: Record<string, GrowthRow>;
  /** Number of ranked stocks (percentile base shown in the card). */
  growthScored?: number;
}) {
  const asTable = MEMBERS_SETUPS_COLUMNS && fundamentals != null;
  const g = MEMBERS_GROWTH_SCORE ? growth : undefined;
  return (
    <article id="bullish-setups" className={MAIN_BOX_CLASS}>
      {asTable ? (
        <SetupsPanel
          tone="bull"
          rows={setups}
          fundamentals={fundamentals ?? {}}
          growth={g}
          growthScored={growthScored}
          title={
            <h3 className="m-0 shrink-0 whitespace-nowrap">
              <HowItWorksTitle
                heading="How Bullish Setups works"
                subheading="Main Scanner · several bullish signals lining up · education only"
                body={<BullishBody />}
              >
                Bullish Setups
              </HowItWorksTitle>
            </h3>
          }
          meta={
            <>
          {setups.length}
          {asOf ? ` · Updated: ${asOf}` : ""}
            </>
          }
          empty={
            <p className="mt-2 text-xs leading-relaxed text-slate-400">
              No tickers line up enough bullish signals in the latest scan. That
              is normal on quiet days.
            </p>
          }
        />
      ) : (
        <>
      <div className="flex shrink-0 items-baseline justify-between gap-2">
        <h3 className="m-0 shrink-0 whitespace-nowrap">
          <HowItWorksTitle
            heading="How Bullish Setups works"
            subheading="Main Scanner · several bullish signals lining up · education only"
            body={<BullishBody />}
          >
            Bullish Setups
          </HowItWorksTitle>
        </h3>
        <p className="text-right text-[10px] uppercase tracking-wide text-canary-gold/80">
          {setups.length}
          {asOf ? ` · Updated: ${asOf}` : ""}
        </p>
      </div>
      {setups.length === 0 ? (
        <p className="mt-2 text-xs leading-relaxed text-slate-400">
          No tickers line up enough bullish signals in the latest scan. That
          is normal on quiet days.
        </p>
      ) : (
        <SetupChips rows={setups} tone="bull" />
      )}
        </>
      )}
    </article>
  );
}
