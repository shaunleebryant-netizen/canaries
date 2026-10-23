import Link from "next/link";
import { redirect } from "next/navigation";
import { requireMemberAccessPage } from "@/lib/members/guard";
import { loadState } from "@/lib/loadState";
import { toMembersPayload } from "@/lib/composite";
import { TrafficLightDisplay, CompositeHowToRead } from "@/components/TrafficLight";
import { CanaryTable } from "@/components/CanaryTable";
import { MarketRegime } from "@/components/MarketRegime";
import { VolCurveCanary } from "@/components/VolCurveCanary";
import { FishAlerts } from "@/components/FishAlerts";
import { ExhaustionAlerts } from "@/components/ExhaustionAlerts";
import { EtfWatch } from "@/components/EtfWatch";
import { TickerUniverseButton } from "@/components/TickerUniverseButton";
import { loadTickerUniverse } from "@/lib/tickerUniverse";
import { CryptoWatch } from "@/components/CryptoWatch";
import { MoneyFlowAlerts } from "@/components/MoneyFlowAlerts";
import { BullishSetups } from "@/components/BullishSetups";
import { IbdSetups } from "@/components/IbdSetups";
import { InsiderBuying } from "@/components/InsiderBuying";
import { InsiderHistory } from "@/components/InsiderHistory";
import { XRumours } from "@/components/XRumours";
import { DeskIdeasLazy as DeskIdeas } from "@/components/DeskIdeasLazy";
import { CryptoHeroChartsLazy } from "@/components/CryptoHeroChartsLazy";
import { loadDeskIdeas } from "@/lib/loadDeskIdeas";
import { loadInsiderBuying } from "@/lib/loadInsiderBuying";
import { pickFundamentals } from "@/lib/loadFundamentals";
import { loadGrowthAsOf, loadGrowthRanking, pickGrowth } from "@/lib/loadGrowthScore";
import { GrowthScoreRanking } from "@/components/GrowthScoreRanking";
import { MainScannerSubtitle } from "@/components/MainScannerInfo";
import { loadInsiderHistory } from "@/lib/loadInsiderHistory";
import { loadXRumours } from "@/lib/loadXRumours";
import { BearishSetups } from "@/components/BearishSetups";
import { WeeklyStateTurns, BullishStrong } from "@/components/WeeklyMarketState";
// Monthly20Ma box hidden (owner 2026-09-25); component kept in src/components/Monthly20Ma.tsx.
import { TickerChartProvider } from "@/components/TickerChartLightbox";
import { LiveTickers } from "@/components/LiveTickers";
import { LocalTime } from "@/components/LocalTime";
import { BookingModalButton } from "@/components/BookingModalButton";
import { DecideLayout } from "@/components/DecideLayout";
import { DecideHeading, ScanHeading } from "@/components/DecideTheme";
import { DECIDE_THEME, MEMBERS_CRYPTO_HERO_CHARTS, MEMBERS_DESK_IDEAS, MEMBERS_GROWTH_SCORE, MEMBERS_HISTORY_TAB, MEMBERS_SECTOR_SCREENER, MEMBERS_X_RUMOURS, SCANNER_DECLUTTER } from "@/lib/featureFlags";
import { SectorScreener } from "@/components/SectorScreener";
import {
  ScannerDeclutterShell,
  ScannerShowMore,
} from "@/components/ScannerDeclutter";
import { HeldNote, heldSince } from "@/components/HeldNote";
import { loadRegimeFromCanaries } from "@/lib/loadRegime";
import { loadVolCurve } from "@/lib/loadVolCurve";
import { loadFishAlerts } from "@/lib/loadFishAlerts";
import { loadExhaustionAlerts } from "@/lib/loadExhaustionAlerts";
import { loadEtfWatchAlerts } from "@/lib/loadEtfWatchAlerts";
import { COUNTRY_NAMES, loadEtfCountryAlerts, loadEtfCountryHeldSince } from "@/lib/loadEtfCountryAlerts";
import { loadCryptoWatchAlerts } from "@/lib/loadCryptoWatchAlerts";
import { loadMoneyFlowAlerts, loadMoneyFlowPrints, loadMoneyFlowSessionDates } from "@/lib/loadMoneyFlowAlerts";
import { loadIbdSetupsAlerts } from "@/lib/loadIbdSetupsAlerts";
import { computeMainScannerSetups, loadPackAsOf } from "@/lib/mainScanner";
import {
  computeBullishStrong,
  computeWeeklyStateTurns,
  loadMarketStateMeta,
  loadMarketStates,
  loadMonthly20AboveTickers,
  loadMonthly20Signals,
} from "@/lib/marketState";
import { loadCommentary } from "@/lib/loadCommentary";
import { loadSignalHistory } from "@/lib/loadSignalHistory";
import { SignalHistory } from "@/components/SignalHistory";
import { MyStocks } from "@/components/MyStocks";
import { buildMyStocksData, tickerNames } from "@/lib/myStocksData";
import { loadMarketQuotesInitial } from "@/lib/marketQuotes";
import {
  attachSparklines,
  loadCanarySparklines,
} from "@/lib/loadCanarySparklines";

/**
 * Slim amber note above the Canary readings (owner approved 2026-10-09, t595u). The button opens
 * the Bookings form in a modal with "1-to-1 class" preselected. Amber, never yellow.
 */
function CanaryBookingNote() {
  return (
    <div className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-100">
      <span>Want to understand the canaries in depth? Book a 1-to-1 class with Shaun.</span>
      <BookingModalButton />
    </div>
  );
}

/** DECIDE_THEME "R": regime colour key from the same light the traffic light shows. */
type RegimeKey = "green" | "amber" | "red" | "neutral";
function regimeKey(light: unknown, S: unknown): RegimeKey {
  if (typeof S !== "number" || !Number.isFinite(S)) return "neutral";
  const k = typeof light === "string" ? light.trim().toLowerCase() : "";
  return k === "green" || k === "amber" || k === "red" ? k : "neutral";
}

/** Dashboard design flags (owner t581u/t583u; approved t583s2392, all default ON). */
export type MembersDesign = { decideCollapse: boolean; chartV2: boolean; myStocks: boolean };

/**
 * The members dashboard body (moved from page.tsx, t581u 2026-10-08, unchanged when both design
 * options are off). Rendered by /members with the feature flags.
 */
export async function MembersDashboard({
  searchParams,
  design,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
  design: MembersDesign;
}) {
  await requireMemberAccessPage(); // no-op unless MEMBERS_AUTH_MODE=accounts
  // Shell-first: sync bundled JSON only — no Yahoo awaits on the critical path.
  const state = loadState();
  const payload = toMembersPayload(state);
  const regime = loadRegimeFromCanaries(
    state.canaries,
    state.sessionDate ?? state.asOf.slice(0, 10)
  );
  const volCurve = loadVolCurve();
  const fishAlerts = loadFishAlerts();
  const exhaustionAlerts = loadExhaustionAlerts();
  const etfWatchAlerts = loadEtfWatchAlerts();
  // Owner 2026-10-06: ETF box split into Sector ETFs + Countries (Countries does not feed Main Scanner).
  const etfCountryAlerts = loadEtfCountryAlerts();
  const etfCountryHeldSince = loadEtfCountryHeldSince();
  const cryptoWatchAlerts = loadCryptoWatchAlerts();
  const moneyFlowAlerts = loadMoneyFlowAlerts();
  const ibdSetupsAlerts = loadIbdSetupsAlerts();
  // Insider Buying sub scanner (owner approved 2026-10-09, t595u): SEC Form 4. Members only;
  // not a Main Scanner / Bullish Setups condition.
  const insiderBuying = loadInsiderBuying();
  const insiderHistory = loadInsiderHistory();
  const xRumours = MEMBERS_X_RUMOURS ? loadXRumours() : null;
  // Desk Ideas (revived 2026-10-09; members only, never the homepage): third-party ideas from X,
  // refreshed by the agent after the pack. Unusual Options stays archived.
  const deskIdeas = loadDeskIdeas(loadPackAsOf());
  const deskHeld = heldSince(deskIdeas.asOf, loadPackAsOf());
  const marketStates = loadMarketStates();
  const marketStateMeta = loadMarketStateMeta();
  const weeklyTurns = computeWeeklyStateTurns(marketStates);
  const monthly20 = loadMonthly20Signals();
  // Multi-week Warriors: weekly green ∩ currently above 20-month MA (owner 2026-10-02).
  const bullishStrong = computeBullishStrong(
    marketStates,
    loadMonthly20AboveTickers()
  );
  // Main Scanner: Bullish / Bearish Setups from the same pack data, one as-of.
  const mainScanner = computeMainScannerSetups({
    asOf: loadPackAsOf(),
    fish: fishAlerts,
    etfWatch: etfWatchAlerts,
    // 💵 print history (+ current rows); counted from the last 5 trading days only.
    moneyFlow: [...loadMoneyFlowPrints(), ...moneyFlowAlerts],
    mfiSessionDates: loadMoneyFlowSessionDates(),
    exhaustion: exhaustionAlerts,
    ibd: ibdSetupsAlerts,
    marketStates,
    monthly20,
  });
  // Owner 2026-10-10 (MEMBERS_SETUPS_COLUMNS): P/E · EPS g y/y · EV/EBITDA for the Main Scanner rows only.
  const setupFundamentals = pickFundamentals([
    ...mainScanner.bullish.map((r) => r.ticker),
    ...mainScanner.bearish.map((r) => r.ticker),
  ]);
  // Owner 2026-10-10 (MEMBERS_GROWTH_SCORE): Growth column in the setups boxes, ranking box, My Stocks score.
  const growthRanking = MEMBERS_GROWTH_SCORE ? loadGrowthRanking() : [];
  const growthScored = growthRanking.length;
  const setupGrowth = MEMBERS_GROWTH_SCORE
    ? pickGrowth([...mainScanner.bullish.map((r) => r.ticker), ...mainScanner.bearish.map((r) => r.ticker)])
    : undefined;
  // History tab (owner approved 2026-10-07): past 🐟 / 🙂 / 💵 marks by date.
  const signalHistory = MEMBERS_HISTORY_TAB ? loadSignalHistory(COUNTRY_NAMES) : null;
  const tabParam = (await searchParams)?.tab;
  // Owner t572u: the History tab is shown as "Backtest". ?tab=history (old links) → ?tab=backtest.
  if (tabParam === "history" && signalHistory) redirect("/members?tab=backtest");
  const initialTab =
    tabParam === "backtest" && signalHistory
      ? "history"
      : tabParam === "stocks" || tabParam === "etf" || tabParam === "crypto" || tabParam === "insiders"
        ? tabParam
        : tabParam === "mystocks" && design.myStocks
          ? "mystocks"
          : tabParam === "canaries"
            ? "canaries"
            : "stocks"; // Owner t697u 2026-10-14: default landing tab is Stocks; ?tab=canaries still works.
  // Held (not refreshed this pack) — shown as "held since", never re-stamped.
  const packSession = loadPackAsOf();
  const heldInputs = state.canaries.filter((c) => c.fresh === false);
  const volHeld = heldSince(volCurve.asOf, packSession);
  const commentary = loadCommentary();
  const marketQuotes = loadMarketQuotesInitial();
  const sparkPayload = await loadCanarySparklines({ live: false });
  const canaries = attachSparklines(payload.canaries, sparkPayload);

  // Best / worst XL sectors for commentary (day %) — from cache only; no live Yahoo.
  const ranked = [...marketQuotes.sectors].filter(
    (s) => s.quote?.changePct != null
  );
  ranked.sort(
    (a, b) => (b.quote!.changePct ?? -999) - (a.quote!.changePct ?? -999)
  );
  const topSec = ranked[0];
  const worstSec = ranked[ranked.length - 1];
  const topLine =
    topSec && topSec.quote?.changePct != null
      ? `${topSec.symbol} ${topSec.quote.changePct >= 0 ? "+" : ""}${topSec.quote.changePct.toFixed(2)}%`
      : "see strip";
  const worstLine =
    worstSec && worstSec.quote?.changePct != null
      ? `${worstSec.symbol} ${worstSec.quote.changePct >= 0 ? "+" : ""}${worstSec.quote.changePct.toFixed(2)}%`
      : "see strip";

  const haveSectors = topLine !== "see strip" && worstLine !== "see strip";

  /** Compact Commentary — from data/commentary.json; sectors freshened from cache. */
  const whatToDo = [
    ...commentary.whatToDo.filter((b) => !b.toLowerCase().startsWith("sectors")),
    haveSectors
      ? `Sectors today: strongest ${topLine}; weakest ${worstLine}. Prefer the leaders over the laggards.`
      : "Sectors: see the live strip, and prefer the leaders over the laggards.",
  ];

  // DRAFT: Decide vs Scanners visual separation; "current" = live look.
  const theme = DECIDE_THEME;
  const themed = theme !== "current";
  let regimeColour: RegimeKey = regimeKey(payload.light, payload.S);
  // Local preview only (next dev): /members?regime=green|amber|red|neutral. Ignored in production builds.
  if (process.env.NODE_ENV === "development") {
    const q = (await searchParams)?.regime;
    if (q === "green" || q === "amber" || q === "red" || q === "neutral") regimeColour = q;
  }
  const scanTheme = theme === "R" ? "R" : undefined;

  // Design previews (t581u / t583u): names for the v2 lightbox header + My Stocks rows. Off → nothing sent.
  const designNames = design.chartV2 || design.myStocks ? tickerNames() : undefined;
  const myStocksData = design.myStocks
    ? buildMyStocksData({
        universe: loadTickerUniverse(),
        names: designNames ?? {},
        conditionsByTicker: mainScanner.conditionsByTicker,
        bullish: mainScanner.bullish,
        bearish: mainScanner.bearish,
        boxRows: [
          { source: "Sector ETFs", rows: etfWatchAlerts },
          { source: "Countries", rows: etfCountryAlerts },
          { source: "Crypto", rows: cryptoWatchAlerts },
        ],
      })
    : null;

  // Literal gold (not text-canary-gold): the button now sits inside data-scan-theme, which would recolour it.
  const universeButton = (
    <TickerUniverseButton
      groups={loadTickerUniverse()}
      className="whitespace-nowrap rounded-lg border border-[#eab308]/40 px-3 py-1.5 text-xs font-medium text-[#eab308] hover:bg-[#eab308]/10"
    />
  );
  const scan = (
    <>
        {/* ── SCAN ── */}
        <main className="min-w-0 flex-1 space-y-4">
          {/* Owner 2026-10-06: public-safe ticker universe pop-up (tickers only, no signals).
              Owner 2026-10-10: on the tabbed layout it sits on the tab-bar row (toolbarEnd), no own row. */}
          {SCANNER_DECLUTTER ? null : <div className="flex justify-end">{universeButton}</div>}
          <TickerChartProvider v2={design.chartV2} myStocks={design.myStocks} universe={design.myStocks ? loadTickerUniverse() : undefined} names={designNames}>
            {/* Scanners: SCANNER_DECLUTTER mock (default off) or the live layout. */}
            {SCANNER_DECLUTTER ? (
              <div data-scan-theme={scanTheme}>
                <ScannerDeclutterShell
                  initialTab={initialTab}
                  toolbarEnd={universeButton}
                  insiders={
                    <section aria-labelledby="insiders-tab-label" className="space-y-3">
                      {themed ? (
                        <ScanHeading
                          theme={theme}
                          id="insiders-tab-label"
                          title="Insiders"
                          subtitle="Open-market insider buys from SEC Form 4 filings"
                        />
                      ) : (
                        <h2
                          id="insiders-tab-label"
                          className="text-base font-bold uppercase tracking-[0.15em] text-canary-gold sm:text-lg"
                        >
                          Insiders
                        </h2>
                      )}
                      <div className="min-w-0">
                        <InsiderBuying signals={insiderBuying.signals} asOf={insiderBuying.asOf} />
                      </div>
                      <div className="min-w-0">
                        <InsiderHistory rows={insiderHistory.rows} asOf={insiderHistory.asOf} windowStart={insiderHistory.windowStart} />
                      </div>
                    </section>
                  }
                  myStocks={
                    myStocksData ? (
                      <MyStocks rows={myStocksData.rows} universe={myStocksData.universe} asOf={mainScanner.asOf} growth={MEMBERS_GROWTH_SCORE ? pickGrowth(myStocksData.universe.map((u) => u.t)) : undefined} growthScored={growthScored} />
                    ) : undefined
                  }
                  history={
                    signalHistory ? (
                      <section aria-labelledby="signal-history-tab-label" className="space-y-3">
                        {themed ? (
                          <ScanHeading
                            theme={theme}
                            id="signal-history-tab-label"
                            title="Backtest"
                            subtitle="Past Fish, Washout and MFI marks by date, and price since"
                          />
                        ) : (
                          <h2
                            id="signal-history-tab-label"
                            className="text-base font-bold uppercase tracking-[0.15em] text-canary-gold sm:text-lg"
                          >
                            Backtest
                          </h2>
                        )}
                        <SignalHistory data={signalHistory} />
                      </section>
                    ) : undefined
                  }
                  canaries={
                    <>
                      <CanaryBookingNote />
                      <CanaryTable
                        rows={canaries}
                        emptyNotes={sparkPayload.emptyNotes}
                      />
                    </>
                  }
                  main={
                    <section
                      aria-labelledby="main-scanner-label"
                      className="space-y-3"
                    >
                      {themed ? (
                        <ScanHeading
                          theme={theme}
                          id="main-scanner-label"
                          title="Main Scanner"
                          subtitle={<MainScannerSubtitle />}
                        />
                      ) : (
                        <h2
                          id="main-scanner-label"
                          className="text-base font-bold uppercase tracking-[0.15em] text-canary-gold sm:text-lg"
                        >
                          Main Scanner
                        </h2>
                      )}
                      <div className="grid items-stretch gap-3 md:grid-cols-2">
                        <ScannerShowMore limit={12}>
                          <BullishSetups
                            setups={mainScanner.bullish}
                            asOf={mainScanner.asOf}
                            fundamentals={setupFundamentals}
                            growth={setupGrowth}
                            growthScored={growthScored}
                          />
                        </ScannerShowMore>
                        <ScannerShowMore limit={12}>
                          <BearishSetups
                            setups={mainScanner.bearish}
                            asOf={mainScanner.asOf}
                            fundamentals={setupFundamentals}
                            growth={setupGrowth}
                            growthScored={growthScored}
                          />
                        </ScannerShowMore>
                      </div>
                      {/* Owner 2026-10-10 (MEMBERS_GROWTH_SCORE): full-width Growth Score ranking under the
                          Main Scanner boxes, above Sub Scanners. */}
                      {MEMBERS_GROWTH_SCORE && growthRanking.length ? (
                        <GrowthScoreRanking rows={growthRanking} asOf={loadGrowthAsOf()} />
                      ) : null}
                    </section>
                  }
                  moreScans={
                    <section
                      aria-labelledby="sub-scanners-label"
                      className="space-y-3"
                    >
                      {themed ? (
                        <ScanHeading
                          theme={theme}
                          id="sub-scanners-label"
                          title="Sub Scanners"
                          subtitle="Canary scanners for different trades"
                        />
                      ) : (
                        <h2
                          id="sub-scanners-label"
                          className="text-base font-bold uppercase tracking-[0.15em] text-canary-gold sm:text-lg"
                        >
                          Sub Scanners
                        </h2>
                      )}
                      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                        <ScannerShowMore>
                          <FishAlerts alerts={fishAlerts} />
                        </ScannerShowMore>
                        <ScannerShowMore>
                          <ExhaustionAlerts alerts={exhaustionAlerts} />
                        </ScannerShowMore>
                        <ScannerShowMore>
                          <MoneyFlowAlerts alerts={moneyFlowAlerts} prints={loadMoneyFlowPrints()} sessionDates={loadMoneyFlowSessionDates()} />
                        </ScannerShowMore>
                        <ScannerShowMore>
                          <IbdSetups alerts={ibdSetupsAlerts} />
                        </ScannerShowMore>
                        <ScannerShowMore>
                          <WeeklyStateTurns
                            bulls={weeklyTurns.bulls}
                            bears={weeklyTurns.bears}
                            meta={marketStateMeta}
                          />
                        </ScannerShowMore>
                        <ScannerShowMore>
                          <BullishStrong
                            rows={bullishStrong}
                            meta={marketStateMeta}
                          />
                        </ScannerShowMore>
                        {MEMBERS_DESK_IDEAS ? (
                          <ScannerShowMore>
                            <DeskIdeas ideas={deskIdeas.ideas} windowDays={deskIdeas.windowDays} heldSince={deskHeld} />
                          </ScannerShowMore>
                        ) : null}
                      </div>
                      {/* Owner 2026-10-10: Insider Buying moved to the Insiders tab; X Rumours keeps its
                          full-width row here, where Insider Buying used to be. */}
                      {xRumours ? (
                        <div className="mt-3 min-w-0">
                          <XRumours rows={xRumours.rows} asOf={xRumours.asOf} expirySessions={xRumours.expirySessions} filtered={xRumours.filtered} />
                        </div>
                      ) : null}
                    </section>
                  }
                  etf={
                    <section
                      aria-labelledby="etf-watch-label"
                      className="space-y-3"
                    >
                      {themed ? (
                        <ScanHeading
                          theme={theme}
                          id="etf-watch-label"
                          title="ETFs"
                          subtitle="Sector ETFs"
                        />
                      ) : (
                        <h2
                          id="etf-watch-label"
                          className="text-base font-bold uppercase tracking-[0.15em] text-canary-gold sm:text-lg"
                        >
                          ETFs
                        </h2>
                      )}
                      {MEMBERS_SECTOR_SCREENER ? <SectorScreener etfAlerts={etfWatchAlerts} /> : null}
                      {/* Owner t697u 2026-10-14: Countries box + Country Screener removed from the ETFs tab. */}
                      <ScannerShowMore>
                        <EtfWatch alerts={etfWatchAlerts} />
                      </ScannerShowMore>
                    </section>
                  }
                  crypto={
                    <>
                    {MEMBERS_CRYPTO_HERO_CHARTS ? <CryptoHeroChartsLazy /> : null}
                    <section
                      aria-labelledby="crypto-watch-label"
                      className="space-y-3"
                    >
                      {themed ? (
                        <ScanHeading
                          theme={theme}
                          id="crypto-watch-label"
                          title="Crypto Watch"
                        />
                      ) : (
                        <h2
                          id="crypto-watch-label"
                          className="text-base font-bold uppercase tracking-[0.15em] text-canary-gold sm:text-lg"
                        >
                          Crypto Watch
                        </h2>
                      )}
                      <ScannerShowMore>
                        <CryptoWatch alerts={cryptoWatchAlerts} />
                      </ScannerShowMore>
                    </section>
                    </>
                  }
                />
              </div>
            ) : (
              <>
                {/* ── MAIN SCANNER ── */}
                <section
                  aria-labelledby="main-scanner-label"
                  className="space-y-3"
                  data-scan-theme={scanTheme}
                >
                  {themed ? (
                    <ScanHeading
                      theme={theme}
                      id="main-scanner-label"
                      title="Main Scanner"
                      subtitle={<MainScannerSubtitle />}
                    />
                  ) : (
                    <h2
                      id="main-scanner-label"
                      className="text-base font-bold uppercase tracking-[0.15em] text-canary-gold sm:text-lg"
                    >
                      Main Scanner
                    </h2>
                  )}
                  <div className="grid gap-3 md:grid-cols-2">
                    <BullishSetups
                      setups={mainScanner.bullish}
                      asOf={mainScanner.asOf}
                      fundamentals={setupFundamentals}
                            growth={setupGrowth}
                            growthScored={growthScored}
                    />
                    <BearishSetups
                      setups={mainScanner.bearish}
                      asOf={mainScanner.asOf}
                      fundamentals={setupFundamentals}
                            growth={setupGrowth}
                            growthScored={growthScored}
                    />
                  </div>
                </section>

                {/* ── SUB SCANNERS ── (Monthly 20MA box hidden; its scan still feeds 📈 in Bullish Setups) */}
                <section
                  aria-labelledby="sub-scanners-label"
                  className="mt-5 space-y-3"
                  data-scan-theme={scanTheme}
                >
                  {themed ? (
                    <ScanHeading
                      theme={theme}
                      id="sub-scanners-label"
                      title="Sub Scanners"
                      subtitle="Canary scanners for different trades"
                    />
                  ) : (
                    <h2
                      id="sub-scanners-label"
                      className="text-base font-bold uppercase tracking-[0.15em] text-canary-gold sm:text-lg"
                    >
                      Sub Scanners
                    </h2>
                  )}
                  <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                    {/* Order (owner 2026-09-29 12:17 PM NZ):
                        Time to fish, Sweaty stocks, MFI / IBD, Baby Bulls, Multi-week Warriors.
                        All six share max-h-[min(320px,40vh)] so each row lines up. */}
                    <FishAlerts alerts={fishAlerts} />
                    <ExhaustionAlerts alerts={exhaustionAlerts} />
                    <MoneyFlowAlerts alerts={moneyFlowAlerts} prints={loadMoneyFlowPrints()} sessionDates={loadMoneyFlowSessionDates()} />
                    <IbdSetups alerts={ibdSetupsAlerts} />
                    <WeeklyStateTurns
                      bulls={weeklyTurns.bulls}
                      bears={weeklyTurns.bears}
                      meta={marketStateMeta}
                    />
                    <BullishStrong rows={bullishStrong} meta={marketStateMeta} />
                    {MEMBERS_DESK_IDEAS ? (
                      <DeskIdeas ideas={deskIdeas.ideas} windowDays={deskIdeas.windowDays} heldSince={deskHeld} />
                    ) : null}
                  </div>
                  {/* Owner 2026-10-10: Insider Buying is a full-width row with a table. */}
                  <div className="mt-3 min-w-0">
                    <InsiderBuying signals={insiderBuying.signals} asOf={insiderBuying.asOf} />
                  </div>
                  {/* Owner 2026-10-10: Past insider buys (3 months), under Insider Buying (legacy layout). */}
                  <div className="mt-3 min-w-0">
                    <InsiderHistory rows={insiderHistory.rows} asOf={insiderHistory.asOf} windowStart={insiderHistory.windowStart} />
                  </div>
                  {/* Owner 2026-10-10: X Rumours is the next full-width row, directly under Insider Buying. */}
                  {xRumours ? (
                    <div className="mt-3 min-w-0">
                      <XRumours rows={xRumours.rows} asOf={xRumours.asOf} expirySessions={xRumours.expirySessions} filtered={xRumours.filtered} />
                    </div>
                  ) : null}
                </section>

                {/* ── ETFS AND CRYPTO SCANNER ── */}
                <section
                  aria-labelledby="etf-crypto-label"
                  className="mt-5 space-y-3"
                  data-scan-theme={scanTheme}
                >
                  {themed ? (
                    <ScanHeading
                      theme={theme}
                      id="etf-crypto-label"
                      title="ETFs and Crypto Scanner"
                    />
                  ) : (
                    <h2
                      id="etf-crypto-label"
                      className="text-base font-bold uppercase tracking-[0.15em] text-canary-gold sm:text-lg"
                    >
                      ETFs and Crypto Scanner
                    </h2>
                  )}
                  <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                    <EtfWatch alerts={etfWatchAlerts} />
                    <CryptoWatch alerts={cryptoWatchAlerts} />
                  </div>
                </section>
              </>
            )}
          </TickerChartProvider>

          {/* CanaryTable lives in the Canaries tab when SCANNER_DECLUTTER is on. */}
          {!SCANNER_DECLUTTER ? (
            <>
              <CanaryBookingNote />
              <CanaryTable rows={canaries} emptyNotes={sparkPayload.emptyNotes} />
            </>
          ) : null}

          <section className="grid gap-4 md:grid-cols-2">
            <div className="rounded-xl border border-white/10 bg-slate-900/60 p-4 shadow-sm">
              <h2 className="text-base font-semibold text-white">
                Letter archive
              </h2>
              <ul className="mt-3 space-y-2">
                {payload.letterArchive.map((letter) => (
                  <li
                    key={letter.id}
                    className="rounded-lg border border-white/10 p-2.5"
                  >
                    <p className="text-sm font-medium text-white">
                      {letter.title}
                    </p>
                    <p className="text-[10px] text-slate-500">
                      {/^\d{4}-\d{2}-\d{2}$/.test(letter.publishedAt) ? (
                        letter.publishedAt
                      ) : (
                        <LocalTime iso={letter.publishedAt} />
                      )}
                    </p>
                    <p className="mt-0.5 text-xs text-slate-400">
                      {letter.summary}
                    </p>
                  </li>
                ))}
              </ul>
            </div>

            {/* Bookings card (owner approved 2026-10-09, t595u): opens the Bookings form in a modal
                with "1-to-1 class" preselected (was a link to /tuition). Amber, never yellow. */}
            <div className="rounded-xl border border-amber-500/30 bg-gradient-to-br from-slate-900 via-slate-900 to-amber-950/30 p-4 shadow-sm">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-amber-400">
                Bookings
              </p>
              <h2 className="mt-1 text-base font-semibold text-white">
                1-to-1 classes with Shaun
              </h2>
              <p className="mt-2 text-xs leading-relaxed text-slate-300">
                Want a deep dive into the canaries or the indicators? Book an online
                1-to-1 class with Shaun at{" "}
                <span className="font-semibold text-white">$120 USD/hr</span>.
              </p>
              <BookingModalButton
                label="Book a class →"
                className="mt-4 inline-flex items-center justify-center rounded-xl bg-amber-500 px-3.5 py-2 text-sm font-semibold text-slate-950 transition hover:bg-amber-400"
              />
              <p className="mt-2 text-[10px] text-slate-500">
                Want Shaun to speak at your event?{" "}
                <Link href="/bookings" className="text-amber-300 underline decoration-amber-400/40 underline-offset-2 hover:text-amber-200">
                  See Bookings
                </Link>
                .
              </p>
            </div>
          </section>
        </main>
    </>
  );

  return (
    <div className="mx-auto max-w-7xl px-3 py-6 text-slate-100 sm:px-4 lg:py-8">
      {/* Page title — heads the whole members page */}
      <header className="mb-4">
        <h1 className="text-xl font-semibold text-white sm:text-2xl">
          Canary Trader&apos;s Dashboard
        </h1>
        <p className="mt-0.5 text-xs text-slate-400 sm:text-sm">
          Welcome. Updated daily. Questions:{" "}
          <a
            href="mailto:shaun@canarydashboard.com"
            className="text-canary-gold underline decoration-canary-gold/40 underline-offset-2 transition hover:text-canary-amber"
          >
            shaun@canarydashboard.com
          </a>
        </p>
      </header>

      {/* Live quotes strip — top of page, above Decide / Scan */}
      <div className="mb-5">
        <LiveTickers initial={marketQuotes} />
      </div>

      {/* Cockpit B: compact DECIDE (sticky) | SCAN */}
      <DecideLayout
        collapsible={design.decideCollapse}
        light={payload.light}
        sidebarClassName="w-full shrink-0 space-y-2 lg:sticky lg:w-[340px] lg:self-start"
        theme={themed ? theme : undefined}
        regime={theme === "R" ? regimeColour : undefined}
        scan={scan}
      >
          {themed ? (
            <DecideHeading theme={theme} canaryCount={canaries.length} />
          ) : (
            <p className="px-0.5 py-1 text-base font-bold uppercase tracking-[0.15em] text-canary-gold sm:text-lg">
              Risk Guidance
            </p>
          )}

          {/* 1. Composite traffic light — large */}
          <div className="rounded-xl border border-canary-gold/20 bg-slate-900/80 p-3 shadow-sm ring-1 ring-canary-gold/10">
            <TrafficLightDisplay
              light={payload.light}
              S={payload.S}
              asOf={payload.asOf}
              stance={payload.stance}
              size="lg"
              showRange
              compact
              weightSum={payload.weightSum}
              vetoApplied={payload.vetoApplied}
            />
            {heldInputs.length ? (
              <ul className="mt-2 space-y-0.5 border-t border-white/5 pt-1.5 text-[10px] text-slate-500">
                {heldInputs.map((c) => (
                  <li key={c.id} className="flex flex-wrap items-center gap-1">
                    <span>{c.name}:</span>
                    <HeldNote since={c.heldSince ?? "—"} />
                  </li>
                ))}
              </ul>
            ) : null}
            <CompositeHowToRead />
          </div>

          {/* 2. Commentary — short bullets (owner 2026-10-02: no Full commentary details).
              Owner 2026-10-12 (t688u): moved up, directly under the traffic light. */}
          <section
            id="commentary"
            className="rounded-xl border border-white/10 bg-slate-900/70 p-3 shadow-sm"
          >
            <h2 className="text-[10px] font-semibold uppercase tracking-widest text-canary-gold">
              Commentary
            </h2>
            <p className="mt-1.5 text-xs font-medium leading-snug text-amber-200">
              {commentary.headline}
            </p>
            <ul className="mt-2 space-y-1.5 text-[11px] leading-snug text-slate-300">
              {whatToDo.map((b) => (
                <li key={b.slice(0, 28)} className="flex gap-1.5">
                  <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-canary-gold/70" />
                  <span>{b}</span>
                </li>
              ))}
            </ul>
          </section>

          {/* 3–4. Compact decide cards. Owner 2026-10-12 (t688u): Vanna & Charm Flows and Liquidity
              boxes removed from Decide (data/scripts kept; /owner untouched). */}
          <MarketRegime
            data={regime}
            canaryLight={payload.light}
            canaryS={payload.S}
            compact
          />
          <VolCurveCanary data={volCurve} compact heldSince={volHeld} />
      </DecideLayout>
    </div>
  );
}
