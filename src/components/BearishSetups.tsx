import type { BearishSetup } from "@/lib/bearishSetups";
import { HowItWorksTitle } from "@/components/ScanHowItWorks";
import { MAIN_BOX_CLASS, SetupChips } from "@/components/MainScannerSetups";
import { SetupsPanel } from "@/components/SetupsTable";
import type { GrowthRow } from "@/lib/loadGrowthScore";
import type { FundRow } from "@/lib/loadFundamentals";
import { MEMBERS_GROWTH_SCORE, MEMBERS_SETUPS_COLUMNS } from "@/lib/featureFlags";

function BearishBody() {
  return (
    <>
      <p>
        Bearish Setups is our main list of stocks that look tired or at risk
        of falling. Every ticker here meets several bearish conditions from
        the Sub Scanners further down the page, and at least one of them is a
        fresh timing signal, such as a recent 🥵 sweaty or 💀 skull.
      </p>
      <p>
        Another condition is a bearish weekly trend (🔴). The idea is that when
        a warning sign lines up with a weakening trend, it is worth paying more
        attention than to either one alone.
      </p>
      <p>
        The number beside each ticker is how many conditions it meets, and the
        names with the most sit at the top. The The &ldquo;since&rdquo; date isldquo;AlertThe &ldquo;since&rdquo; date isrdquo; date is
        the day it first made the list, and it keeps that date for as long as
        it stays on. You might use it to review names you hold or to avoid
        chasing them.
      </p>
      <p className="text-xs text-slate-400">
        Built only from signals already shown in the Sub Scanners. An empty
        list is normal on quiet days. Education only, not buy or sell advice.
      </p>
    </>
  );
}

export function BearishSetups({
  setups,
  asOf,
  fundamentals,
  growth,
  growthScored,
}: {
  setups: BearishSetup[];
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
    <article id="bearish-setups" className={MAIN_BOX_CLASS}>
      {asTable ? (
        <SetupsPanel
          tone="bear"
          rows={setups}
          fundamentals={fundamentals ?? {}}
          growth={g}
          growthScored={growthScored}
          title={
            <h3 className="m-0 shrink-0 whitespace-nowrap">
              <HowItWorksTitle
                heading="How Bearish Setups works"
                subheading="Main Scanner · several bearish signals lining up · education only"
                body={<BearishBody />}
              >
                Bearish Setups
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
              No tickers line up enough bearish signals in the latest scan. That
              is normal on quiet days.
            </p>
          }
        />
      ) : (
        <>
      <div className="flex shrink-0 items-baseline justify-between gap-2">
        <h3 className="m-0 shrink-0 whitespace-nowrap">
          <HowItWorksTitle
            heading="How Bearish Setups works"
            subheading="Main Scanner · several bearish signals lining up · education only"
            body={<BearishBody />}
          >
            Bearish Setups
          </HowItWorksTitle>
        </h3>
        <p className="text-right text-[10px] uppercase tracking-wide text-canary-gold/80">
          {setups.length}
          {asOf ? ` · Updated: ${asOf}` : ""}
        </p>
      </div>
      {setups.length === 0 ? (
        <p className="mt-2 text-xs leading-relaxed text-slate-400">
          No tickers line up enough bearish signals in the latest scan. That
          is normal on quiet days.
        </p>
      ) : (
        <SetupChips rows={setups} tone="bear" />
      )}
        </>
      )}
    </article>
  );
}
