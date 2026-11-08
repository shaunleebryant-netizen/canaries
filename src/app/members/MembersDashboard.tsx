import Link from "next/link";
import { redirect } from "next/navigation";
import { requireMemberAccessPage } from "@/lib/members/guard";
import { loadState } from "@/lib/loadState";
import { toMembersPayload } from "@/lib/composite";
import { TrafficLightDisplay } from "@/components/TrafficLight";
import { CanaryTable } from "@/components/CanaryTable";
import { MarketRegime } from "@/components/MarketRegime";
import { VolCurveCanary } from "@/components/VolCurveCanary";
import { FishAlerts } from "@/components/FishAlerts";
import { ExhaustionAlerts } from "@/components/ExhaustionAlerts";
import { EtfWatch } from "@/components/EtfWatch";
import { TickerUniverseButton } from "@/components/TickerUniverseButton";
import { loadTickerUniverse, loadUniverseStockRows } from "@/lib/tickerUniverse";
import { AssetStatusStrip } from "@/components/AssetStatusStrip";
import { CryptoWatch } from "@/components/CryptoWatch";
import { MoneyFlowAlerts } from "@/components/MoneyFlowAlerts";
import { BullishSetups } from "@/components/BullishSetups";
import { IbdSetups } from "@/components/IbdSetups";
import { CciFairy } from "@/components/CciFairy";
import { InsiderBuying } from "@/components/InsiderBuying";
import { InsiderHistory } from "@/components/InsiderHistory";
import { XRumours } from "@/components/XRumours";
import { DeskIdeasLazy as DeskIdeas } from "@/components/DeskIdeasLazy";
import { CryptoHeroChartsLazy } from "@/components/CryptoHeroChartsLazy";
import { EtfHeroChartsLazy } from "@/components/EtfHeroChartsLazy";
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
import { loadUniverseLightbox } from "@/lib/loadUniverseLightbox";
import { LiveTickers } from "@/components/LiveTickers";
import { quoteStripChartNames } from "@/lib/quoteStripChart";
import { LocalTime } from "@/components/LocalTime";
import { BookingModalButton } from "@/components/BookingModalButton";
import { LearnCanariesButton } from "@/components/LearnCanariesButton";
import { CompositeHistoryChart } from "@/components/CompositeHistoryChart";
import { ExplainTitle } from "@/components/ExplainTitle";
import { LockedUniverseButton } from "@/components/LimitedAccessNotice";
import { ScannerSearch } from "@/components/ScannerSearch";
import { RedCompositeNotice } from "@/components/RedCompositeNotice";
import { loadCompositeArchive } from "@/lib/loadCompositeArchive";
import { loadSpxClosesForDates, loadSpxSessionDates } from "@/lib/loadSpxCloses";
import { cryptoForScanner, datedPrintsForScanner, etfForScanner, exhaustionForScanner, fishForScanner, lastTradingSessions } from "@/lib/scannerWindow";
import { resolveViewer } from "@/lib/members/previewAccess";
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
import { loadCciFairy } from "@/lib/loadCciFairy";
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
import { FoldBox } from "@/components/FoldBox";
import type { PessRow } from "@/components/PessimismBoard";
import pessimismJson from "../../../data/pessimism-board.json";
import prevStateJson from "../../../data/state.prev.json";
import setupsHistoryJson from "../../../data/setups-history.json";
import commentaryRaw from "../../../data/commentary.json";
import { MyStocks } from "@/components/MyStocks";
import { buildMyStocksData, tickerNames } from "@/lib/myStocksData";
import { loadMarketQuotesInitial } from "@/lib/marketQuotes";
import {
  attachSparklines,
  loadCanarySparklines,
} from "@/lib/loadCanarySparklines";

/** Owner t1138u: hide the dashboard letter archive for now. Flip to restore the box. */
const SHOW_DASHBOARD_LETTER_ARCHIVE = false;

/**
 * Slim amber note above the Canary readings (owner approved 2026-10-09, t595u). The button opens
 * the Bookings form in a modal with "1-to-1 class" preselected. Amber, never yellow.
 */
function CanaryBookingNote() {
  return (
    <div className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-100">
      <span>Want to understand the canaries in depth?</span>
      <span className="flex flex-wrap gap-2">
        <LearnCanariesButton className="inline-flex items-center justify-center rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-semibold text-slate-950 hover:bg-amber-400" />
        <BookingModalButton label="Book a tutor" />
      </span>
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
  const viewer = await resolveViewer();
  const paid = viewer.tier === "paid";
  const chartAccess = paid ? "paid" : "free-etf";
  const compositeArchive = loadCompositeArchive();
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
  const printSessions = lastTradingSessions(loadSpxSessionDates(), loadPackAsOf(), 5);
  const printArchive = loadCompositeArchive();
  const fishShown = fishForScanner(fishAlerts, printArchive, printSessions).rows;
  const mfiShown = datedPrintsForScanner(loadMoneyFlowAlerts(), "mfi", printArchive, printSessions).rows;
  const mfiPrintsShown = datedPrintsForScanner(loadMoneyFlowPrints(), "mfi", printArchive, printSessions).rows;
  const fairyShown = datedPrintsForScanner(loadCciFairy().signals, "fairy", printArchive, printSessions).rows;
  const sweatyShown = exhaustionForScanner(exhaustionAlerts, printSessions).rows;
  const etfShown = etfForScanner(loadEtfWatchAlerts(), printArchive, printSessions).rows;
  const etfWatchAlerts = loadEtfWatchAlerts();
  // Owner 2026-10-06: ETF box split into Sector ETFs + Countries (Countries does not feed Main Scanner).
  const etfCountryAlerts = loadEtfCountryAlerts();
  const etfCountryHeldSince = loadEtfCountryHeldSince();
  const cryptoWatchAlerts = cryptoForScanner(loadCryptoWatchAlerts(), printArchive, printSessions).rows;
  const moneyFlowAlerts = loadMoneyFlowAlerts();
  const ibdSetupsAlerts = loadIbdSetupsAlerts();
  const cciFairy = loadCciFairy(); // Owner t795u: ★ condition (Main Scanner bullish).
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
    cciFairy: cciFairy.signals,
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
      : tabParam === "stocks" || tabParam === "etf" || tabParam === "crypto" || tabParam === "insiders" || tabParam === "ideas"
        ? tabParam
        : tabParam === "mystocks" && design.myStocks
          ? "mystocks"
          : tabParam === "canaries"
            ? "canaries"
            : paid
              ? "stocks" // Owner t697u 2026-10-14: default landing tab is Stocks; ?tab=canaries still works.
              : "etf";
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
  const designNames = paid && (design.chartV2 || design.myStocks) ? tickerNames() : undefined;
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

  // ── UX preview (t733u): Today strip, folded boxes, Pessimism Board ──
  const pess = pessimismJson as unknown as { asOf: string; rows: PessRow[]; counts: { priced: number; washedOut: number } };
  const pessSet = new Map(pess.rows.map((r) => [r.t, r]));
  const gsOf = (t: string) => (pickGrowth([t]) as Record<string, { gs?: number | null; d?: number }> | undefined)?.[t];
  const sh = setupsHistoryJson as unknown as { asOf: string; bullish: Record<string, { added: string; count: number; conditions: string[] }> };
  const bullTickers = mainScanner.bullish.map((r) => r.ticker);
  const inBoard = bullTickers.filter((t) => pessSet.has(t)).sort((a, b) => {
    const A = pessSet.get(a)!, B = pessSet.get(b)!;
    return (B.turning.length ? 1 : 0) - (A.turning.length ? 1 : 0) || (B.gs ?? 0) - (A.gs ?? 0);
  });
  const rest = bullTickers.filter((t) => !pessSet.has(t) && (gsOf(t)?.gs ?? 0) >= 40 && !gsOf(t)?.d).sort((a, b) =>
    (sh.bullish[b]?.count ?? 0) - (sh.bullish[a]?.count ?? 0) || (gsOf(b)?.gs ?? 0) - (gsOf(a)?.gs ?? 0));
  const picks = [...inBoard, ...rest].slice(0, 3).map((t) => {
    const r = pessSet.get(t); const g = gsOf(t)?.gs; const c = sh.bullish[t]?.count;
    return { t, why: r
      ? `Bullish Setup, washed out: −${Math.round(r.offHigh * 100)}% off high, RSI ${r.rsi.toFixed(0)}, Score ${g != null ? Math.round(g) : "—"}${r.turning.length ? `, ${r.turning.join(", ")}` : ""}`
      : `Bullish Setup with ${c ?? "—"} marks, Canary Score ${g != null ? Math.round(g) : "—"}` };
  });
  const prevState = prevStateJson as unknown as { composite?: { S?: number; light?: string } };
  const newSetups = Object.values(sh.bullish).filter((r) => r.added === sh.asOf).length;
  const sigs = (x: unknown): { ticker?: string; asOf?: string }[] => (Array.isArray(x) ? x : ((x as { signals?: [] })?.signals ?? [])) as { ticker?: string; asOf?: string }[];
  const sum = (label: string, x: unknown, emoji = "") => {
    const a = sigs(x);
    const fresh = a.filter((r) => r.asOf === packSession).length;
    return `${emoji ? emoji + " " : ""}${label}: ${a.length} names${fresh ? ` · ${fresh} today` : ""}${a[0]?.ticker ? ` · top ${a[0].ticker}` : ""}`;
  };
  // Literal gold (not text-canary-gold): the button now sits inside data-scan-theme, which would recolour it.
  const universeGroups = loadTickerUniverse().filter((g) => paid || g.id === "sector-etfs");
  const universeButton = (
    <TickerUniverseButton
      groups={universeGroups}
      stocks={paid && MEMBERS_GROWTH_SCORE ? loadUniverseStockRows() : undefined}
      className="whitespace-nowrap rounded-lg border border-[#eab308]/40 px-3 py-1.5 text-xs font-medium text-[#eab308] hover:bg-[#eab308]/10"
    />
  );
  const scan = (
    <>
        {/* ── SCAN ── */}
        <main className="min-w-0 flex-1 space-y-4">
          {/* Owner 2026-10-06: public-safe ticker universe pop-up (tickers only, no signals).
              Owner 2026-10-10: on the tabbed layout it sits on the tab-bar row (toolbarEnd), no own row. */}
          {/* Outside TickerChartProvider: plain list (the stock table needs the chart context). */}
          {SCANNER_DECLUTTER || !paid ? null : <div className="flex justify-end"><TickerUniverseButton groups={loadTickerUniverse()} className="whitespace-nowrap rounded-lg border border-[#eab308]/40 px-3 py-1.5 text-xs font-medium text-[#eab308] hover:bg-[#eab308]/10" /></div>}
          <TickerChartProvider v2={design.chartV2} myStocks={design.myStocks && paid} universe={design.myStocks && paid ? loadTickerUniverse() : undefined} names={designNames} lightbox={paid ? loadUniverseLightbox() : null} chartAccess={chartAccess}>
            {/* Scanners: SCANNER_DECLUTTER mock (default off) or the live layout. */}
            {SCANNER_DECLUTTER ? (
              <div data-scan-theme={scanTheme}>
                <ScannerDeclutterShell
                  initialTab={initialTab}
                  stocksTop={paid ? <>{/* Owner t765u: Ideas box removed from Stocks. */}{/* Owner t773u: drop outer FoldBox — GrowthScoreRanking already collapses. */}{MEMBERS_GROWTH_SCORE && growthRanking.length ? (<GrowthScoreRanking rows={growthRanking} asOf={loadGrowthAsOf()} />) : null}</> : null}
                  stocksBottom={null /* Owner t757u: Track record moved to Backtest. */}
                  toolbarEnd={paid ? universeButton : <LockedUniverseButton />}
                  insiders={paid ? (
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
                  ) : (
                    <span className="sr-only">Insiders</span>
                  )}
                  myStocks={
                    paid && myStocksData ? (
                      <MyStocks rows={myStocksData.rows} universe={myStocksData.universe} asOf={mainScanner.asOf} growth={MEMBERS_GROWTH_SCORE ? pickGrowth(myStocksData.universe.map((u) => u.t)) : undefined} growthScored={growthScored} />
                    ) : !paid ? (
                      <span className="sr-only">My Stocks</span>
                    ) : undefined
                  }
                  lockedTabs={paid ? [] : ["stocks", "crypto", "insiders", "ideas", "mystocks", "history", "canaries"]}
                  history={
                    paid && signalHistory ? (
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
                        {/* Owner t765u: Ideas track record removed from Backtest. */}
                        <SignalHistory data={signalHistory} />
                      </section>
                    ) : !paid ? (
                      <span className="sr-only">Backtest</span>
                    ) : undefined
                  }
                  canaries={
                    paid ? (
                    <>
                      <CanaryBookingNote />
                      <CanaryTable
                        rows={canaries}
                        emptyNotes={sparkPayload.emptyNotes}
                      />
                    </>
                    ) : null
                  }
                  main={null /* Owner t852u: Main Scanner retired — Bullish Setups removed, Bearish Setups moved to Sub Scanners row 3. */}
                  moreScans={paid ? (
                    <section
                      aria-labelledby="sub-scanners-label"
                      className="space-y-3"
                    >
                      {themed ? (
                        <ScanHeading
                          theme={theme}
                          id="sub-scanners-label"
                          title="Scanners"
                          subtitle="Daily signals across our curated stock list. Click a ticker to see its chart."
                        />
                      ) : (
                        <h2
                          id="sub-scanners-label"
                          className="text-base font-bold uppercase tracking-[0.15em] text-canary-gold sm:text-lg"
                        >
                          Scanners
                        </h2>
                      )}
                      <p className="text-[11px] leading-snug text-slate-400">
                        Bullish signals are withheld when the Composite is red. Warning signals remain visible.
                        {" "}Fish, Smiley, Fairy, MFI, Sweaty and Skull shown here are from the last 5 trading sessions
                        through {loadPackAsOf()}{printSessions.length ? ` (${printSessions[0]} to ${printSessions[printSessions.length - 1]})` : ""}.
                        Older prints are in Backtest. IBD, Warriors, Baby Bulls and Bearish stay the current snapshot.
                      </p>
                      <ScannerSearch
                        groups={[
                          { id: "fish", label: "Fish", rows: fishShown },
                          { id: "mfi", label: "MFI", rows: [...mfiShown, ...mfiPrintsShown] },
                          { id: "fairy", label: "Fairy Godmother", rows: fairyShown },
                          { id: "ibd", label: "IBD", rows: ibdSetupsAlerts },
                          { id: "baby-bulls", label: "Baby Bulls", rows: [...weeklyTurns.bulls, ...weeklyTurns.bears] },
                          { id: "warriors", label: "Warriors", rows: bullishStrong },
                          { id: "sweaty", label: "Sweaty", rows: sweatyShown },
                          { id: "bearish", label: "Bearish", rows: mainScanner.bearish },
                        ]}
                        universe={loadTickerUniverse().find((g) => g.id === "stocks")?.items ?? []}
                      />
                      {/* Owner t852u: three fixed rows. Bullish Setups, New Highs, New Lows removed from Stocks. */}
                      <div className="space-y-3">
                      <div className="grid items-start gap-3 md:grid-cols-2 lg:grid-cols-3">
                        <FoldBox id="fish" summary={sum("Fish", fishShown, "🐟")}><ScannerShowMore>
                          <FishAlerts alerts={fishShown} />
                        </ScannerShowMore></FoldBox>
                        <FoldBox id="mfi" summary={sum("MFI", mfiShown, "💵")}><ScannerShowMore>
                          <MoneyFlowAlerts alerts={mfiShown.filter((r) => r.asOf.slice(0, 10) === loadPackAsOf())} prints={mfiPrintsShown} sessionDates={printSessions} />
                        </ScannerShowMore></FoldBox>
                        <FoldBox id="cci-fairy" summary={sum("Fairy Godmother", fairyShown, "🧚")}><ScannerShowMore>
                          <CciFairy rows={fairyShown} asOf={cciFairy.asOf} />
                        </ScannerShowMore></FoldBox>
                      </div>
                      <div className="grid items-start gap-3 md:grid-cols-2 lg:grid-cols-3">
                        <FoldBox id="ibd" summary={sum("IBD", ibdSetupsAlerts)}><ScannerShowMore>
                          <IbdSetups alerts={ibdSetupsAlerts} />
                        </ScannerShowMore></FoldBox>
                        <FoldBox id="baby-bulls" summary={`Baby Bulls: ${weeklyTurns.bulls.length} bulls · ${weeklyTurns.bears.length} bears${weeklyTurns.bulls[0] ? ` · top ${(weeklyTurns.bulls[0] as { ticker?: string }).ticker}` : ""}`}><ScannerShowMore>
                          <WeeklyStateTurns
                            bulls={weeklyTurns.bulls}
                            bears={weeklyTurns.bears}
                            meta={marketStateMeta}
                          />
                        </ScannerShowMore></FoldBox>
                        <FoldBox id="warriors" summary={sum("Warriors", bullishStrong)}><ScannerShowMore>
                          <BullishStrong
                            rows={bullishStrong}
                            meta={marketStateMeta}
                          />
                        </ScannerShowMore></FoldBox>
                      </div>
                      <div className="grid items-start gap-3 md:grid-cols-2 lg:grid-cols-3">
                        <FoldBox id="sweaty" summary={sum("Sweaty", sweatyShown, "🥵")}><ScannerShowMore>
                          <ExhaustionAlerts alerts={sweatyShown} />
                        </ScannerShowMore></FoldBox>
                        <div className="min-w-0 md:col-span-2">
                        <FoldBox id="bearish" summary={`🔴 Bearish (${mainScanner.bearish.length}) · top ${mainScanner.bearish.slice(0, 3).map((r) => r.ticker).join(", ")}`}><ScannerShowMore limit={12}>
                          <BearishSetups
                            setups={mainScanner.bearish}
                            asOf={mainScanner.asOf}
                            fundamentals={setupFundamentals}
                            growth={setupGrowth}
                            growthScored={growthScored}
                          />
                        </ScannerShowMore></FoldBox>
                        </div>
                        {MEMBERS_DESK_IDEAS ? (
                          <FoldBox id="desk" summary={`Desk Ideas: ${deskIdeas.ideas.length} ideas`}><ScannerShowMore>
                            <DeskIdeas ideas={deskIdeas.ideas} windowDays={deskIdeas.windowDays} heldSince={deskHeld} />
                          </ScannerShowMore></FoldBox>
                        ) : null}
                      </div>
                      </div>
                      {/* Owner 2026-10-10: Insider Buying moved to the Insiders tab; X Rumours keeps its
                          full-width row here, where Insider Buying used to be. */}
                      {/* Owner t752u: X Rumours removed from Stocks for now. */}
                    </section>
                  ) : null}
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
                      {MEMBERS_SECTOR_SCREENER ? <SectorScreener etfAlerts={etfShown} /> : null}
                      {/* Owner t697u 2026-10-14: Countries box + Country Screener removed from the ETFs tab. */}
                      <FoldBox id="etf" summary={sum("Sector ETFs", etfShown)}><ScannerShowMore>
                        <EtfWatch alerts={etfShown} />
                      </ScannerShowMore></FoldBox>
                      {/* Owner t748u: 1Y charts under the ETF boxes, same pattern as Crypto BTC/ETH. */}
                      <EtfHeroChartsLazy />
                    </section>
                  }
                  crypto={paid ? (
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
                      <FoldBox id="crypto" summary={sum("Crypto Watch", cryptoWatchAlerts)}><ScannerShowMore>
                        <CryptoWatch alerts={cryptoWatchAlerts} />
                      </ScannerShowMore></FoldBox>
                    </section>
                    </>
                  ) : null}
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
                      title="Scanners"
                      subtitle="Proprietary scanners. Click each header for a short explanation, or click any stock to open its chart with indicator marks and information. Not every stock is in our ticker universe — we curate the list. To check one that isn’t here, open it on TradingView and load the invite-only scripts we granted you."
                    />
                  ) : (
                    <h2
                      id="sub-scanners-label"
                      className="text-base font-bold uppercase tracking-[0.15em] text-canary-gold sm:text-lg"
                    >
                      Scanners
                    </h2>
                  )}
                  <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                    {/* Order (owner 2026-09-29 12:17 PM NZ):
                        Time to fish, Sweaty stocks, MFI / IBD, Baby Bulls, Multi-week Warriors.
                        All six share max-h-[min(320px,40vh)] so each row lines up. */}
                    <FishAlerts alerts={fishShown} />
                    <ExhaustionAlerts alerts={sweatyShown} />
                    <MoneyFlowAlerts alerts={mfiShown.filter((r) => r.asOf.slice(0, 10) === loadPackAsOf())} prints={mfiPrintsShown} sessionDates={printSessions} />
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
                    <EtfWatch alerts={etfShown} />
                    <CryptoWatch alerts={cryptoWatchAlerts} />
                  </div>
                </section>
              </>
            )}
          </TickerChartProvider>

          {/* CanaryTable lives in the Canaries tab when SCANNER_DECLUTTER is on. */}
          {!SCANNER_DECLUTTER && paid ? (
            <>
              <CanaryBookingNote />
              <CanaryTable rows={canaries} emptyNotes={sparkPayload.emptyNotes} />
            </>
          ) : null}

          {/* Letter archive hidden for now (owner t1138u). Set this true to show it beside tuition again. */}
          <section className={SHOW_DASHBOARD_LETTER_ARCHIVE ? "grid gap-4 md:grid-cols-2" : undefined}>
            {SHOW_DASHBOARD_LETTER_ARCHIVE ? (
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
            ) : null}

            {/* Bookings card (owner approved 2026-10-09, t595u): opens the Bookings form in a modal
                with "1-to-1 class" preselected (was a link to /tuition). Amber, never yellow. */}
            <div className="rounded-xl border border-amber-500/30 bg-gradient-to-br from-slate-900 via-slate-900 to-amber-950/30 p-4 shadow-sm">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-amber-400">
                Personal tuition
              </p>
              <h2 className="mt-1 text-base font-semibold text-white">
                Build confidence in trading
              </h2>
              <p className="mt-2 text-xs leading-relaxed text-slate-300">
                Book a one-to-one session to master the dashboard and apply it to your trading.
              </p>
              <div className="mt-4 flex flex-wrap gap-3">
                {paid ? <LearnCanariesButton className="inline-flex items-center justify-center rounded-xl border border-amber-400/40 px-3.5 py-2 text-sm font-semibold text-amber-100 hover:bg-amber-500/10" /> : null}
                <BookingModalButton
                  label="Book a tutor"
                  className="inline-flex items-center justify-center rounded-xl bg-amber-500 px-3.5 py-2 text-sm font-semibold text-slate-950 transition hover:bg-amber-400"
                />
              </div>
              <p className="mt-2 text-[10px] text-slate-500">
                For speaking engagements, see{" "}
                <Link href="/bookings" className="text-amber-300 underline decoration-amber-400/40 underline-offset-2 hover:text-amber-200">
                  Bookings
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
      {regimeKey(payload.light, payload.S) === "red" ? (
        <RedCompositeNotice
          light={typeof payload.light === "string" ? payload.light : null}
          packDay={state.sessionDate ?? String(payload.asOf ?? "").slice(0, 10)}
        />
      ) : null}
      {/* Page title — heads the whole members page */}
      <header className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
        <h1 className="text-xl font-semibold text-white sm:text-2xl">
          Canary Trader&apos;s Dashboard
        </h1>
        <p className="mt-0.5 text-xs text-slate-400 sm:text-sm">
          Welcome. Preview data as of {state.sessionDate ?? String(payload.asOf ?? "").slice(0, 10)}. Questions:{" "}
          <a
            href="mailto:shaun@canarydashboard.com"
            className="text-canary-gold underline decoration-canary-gold/40 underline-offset-2 transition hover:text-canary-amber"
          >
            shaun@canarydashboard.com
          </a>
        </p>
        </div>
        {/* Owner t986u exploration: asset strip moved to Decide column (below composite). */}
      </header>

      {/* Owner t755u: Today strip removed; the Decide heading now names the regime. */}

      {/* Live quotes strip — top of page, above Decide / Scan.
          Own lightbox (the scanner provider sits inside the scan column). */}
      <div className="mb-5">
        <TickerChartProvider v2={design.chartV2} names={quoteStripChartNames()} chartAccess={chartAccess} lightbox={null}>
          <LiveTickers initial={marketQuotes} chartAccess={chartAccess} />
        </TickerChartProvider>
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
            <DecideHeading theme={theme} canaryCount={canaries.length} light={String(payload.light)} S={typeof payload.S === "number" ? payload.S : null} />
          ) : (
            <DecideHeading theme="A" canaryCount={canaries.length} light={String(payload.light)} S={typeof payload.S === "number" ? payload.S : null} />
          )}

          {/* 1. Composite traffic light — commentary lives in this box. */}
          <div className="rounded-xl border border-canary-gold/20 bg-slate-900/80 p-3 shadow-sm ring-1 ring-canary-gold/10">
            <ExplainTitle title="Canary Composite Score" enabled={paid}>
              <p>
                This is the weighted sum of the 13 canaries. Find out more on the &quot;Canaries&quot; tab.
              </p>
            </ExplainTitle>
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
            <div id="commentary" className="mt-2 border-t border-white/10 pt-2">
              <p className="text-xs font-medium leading-snug text-amber-200">{commentary.headline}</p>
              <ul className="mt-2 space-y-1.5 text-[11px] leading-snug text-slate-300">
                {whatToDo.map((b) => (
                  <li key={b.slice(0, 28)} className="flex gap-1.5">
                    <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-canary-gold/70" />
                    <span>{b}</span>
                  </li>
                ))}
              </ul>
            </div>
            <CompositeHistoryChart
              points={compositeArchive.points}
              conflicts={compositeArchive.conflicts}
              benchmark={loadSpxClosesForDates(compositeArchive.points.map((p) => p.date))}
            />
            {heldInputs.some((c) => c.id !== "finra-margin") ? (
              <ul className="mt-2 space-y-0.5 border-t border-white/5 pt-1.5 text-[10px] text-slate-500">
                {heldInputs.filter((c) => c.id !== "finra-margin").map((c) => (
                  <li key={c.id} className="flex flex-wrap items-center gap-1">
                    <span>{c.name}:</span>
                    <HeldNote since={c.heldSince ?? "—"} />
                  </li>
                ))}
              </ul>
            ) : null}
          </div>

          {/* Regime and vol curve. FINRA margin debt stays in the score and is not a Decide box. */}
          <MarketRegime
            data={regime}
            canaryLight={payload.light}
            canaryS={payload.S}
            compact
            explain={paid}
          />
          <VolCurveCanary data={volCurve} compact heldSince={volHeld} explain={paid} />

          {/* Gold / silver / ETH / BTC at the bottom of Decide. */}
          <section className="rounded-xl border border-white/10 bg-slate-900/70 p-3 shadow-sm">
            <TickerChartProvider v2={design.chartV2} names={designNames} lightbox={paid ? loadUniverseLightbox() : null} chartAccess={chartAccess}>
              <AssetStatusStrip />
            </TickerChartProvider>
          </section>
      </DecideLayout>
    </div>
  );
}
