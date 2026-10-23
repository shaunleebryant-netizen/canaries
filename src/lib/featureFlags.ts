/**
 * Feature flags (UI only).
 *
 * SHOW_WEEKLY_EXAMPLE_CHART: example weekly chart (AMD, green / red / grey bands; replaced the TTD
 * chart 2026-09-29) in the Weekly State and Bullish & Strong lightboxes. Owner approved 2026-09-26, so it is ON.
 * To hide it again, change the default below to `false`, or build with
 * NEXT_PUBLIC_SHOW_WEEKLY_EXAMPLE_CHART=0 (inlined at build time).
 */
export const SHOW_WEEKLY_EXAMPLE_CHART: boolean =
  process.env.NEXT_PUBLIC_SHOW_WEEKLY_EXAMPLE_CHART !== "0";

/**
 * DECIDE_THEME: visual separation between the Decide column and the scanners
 * on /members. Owner approved Option B on 2026-09-26 (ships with Monday's
 * post-close update).
 *   "current" = the old look (no separation).
 *   "A" = cool sky-blue outlines on Decide boxes.
 *   "B" = A + faint blue tint on the Decide column + section subtitles.
 *   "C" = tinted Decide rail with header bands and icons (gauge / radar).
 *   "R" (default; owner approved 2026-09-26) = B layout, but the Decide outlines,
 *       heading accent and panel tint follow the traffic-light regime (green / amber /
 *       red, neutral grey if unreadable), and the Main, Sub and ETFs & Crypto
 *       scanners switch from gold to sky blue.
 * Override with NEXT_PUBLIC_DECIDE_THEME=current|A|B|C|R (inlined at build time).
 * Anything else, or unset, uses "R". To roll back, set the default to "B" (or "current").
 */
export type DecideTheme = "current" | "A" | "B" | "C" | "R";
const rawDecideTheme = process.env.NEXT_PUBLIC_DECIDE_THEME;
export const DECIDE_THEME: DecideTheme =
  rawDecideTheme === "current" ||
  rawDecideTheme === "A" ||
  rawDecideTheme === "B" ||
  rawDecideTheme === "C" ||
  rawDecideTheme === "R"
    ? rawDecideTheme
    : "R";

/**
 * HOME_SCANNER_TOUR (owner approved "Ship now" 2026-09-28 9:23 PM NZ; default ON): homepage restructure.
 * When ON: "A trader's cockpit" moves above "intuitive and user-friendly interface",
 * and a Sub Scanners tour (src/components/HomeScannerTour.tsx) is added before the
 * membership section. When OFF the homepage renders exactly as before.
 * To roll back, build with NEXT_PUBLIC_HOME_SCANNER_TOUR=0 (inlined at build time), or
 * change the default below to `=== "1"` (off unless explicitly enabled).
 */
export const HOME_SCANNER_TOUR: boolean =
  process.env.NEXT_PUBLIC_HOME_SCANNER_TOUR !== "0";

/**
 * HOME_V3 (owner approved SHIP 2026-09-28 10:15 PM NZ; default ON): homepage edits round 3.
 * Trust-strip wording, removes the "intuitive and user-friendly interface" section, Fish/Sweaty
 * heading + 3 large stacked charts, amber "not financial advice" note, new "Buy our proprietary
 * indicators" section, the letter signup moves up into the membership slot (one signup only),
 * a redesigned "Ready to join us?" (before tuition), and a Vanna and Charm Flows tour section in
 * place of the IBD one. OFF = the page as shipped in 251871ab: roll back by building with
 * NEXT_PUBLIC_HOME_V3=0 (inlined at build time), or change the default to `=== "1"`.
 */
export const HOME_V3: boolean = process.env.NEXT_PUBLIC_HOME_V3 !== "0";

/**
 * HOME_TUITION_SECTION (owner 2026-09-28 10:39 PM NZ): the homepage "Trading tuition" section is
 * hidden for now (HOME_V3 page only). Restore with NEXT_PUBLIC_HOME_TUITION_SECTION=1 at build time,
 * or change the default here. The footer Tuition link and /tuition page are unaffected.
 */
export const HOME_TUITION_SECTION: boolean = process.env.NEXT_PUBLIC_HOME_TUITION_SECTION === "1";

/**
 * LEGAL_PAGES (owner approved 2026-09-28 11:56 PM NZ; default ON): /privacy and /terms pages
 * plus their footer links and sitemap entries. When OFF both pages 404 and the links are hidden.
 * Roll back by building with NEXT_PUBLIC_LEGAL_PAGES=0 (inlined at build time), or change the
 * default to `=== "1"`.
 */
export const LEGAL_PAGES: boolean = process.env.NEXT_PUBLIC_LEGAL_PAGES !== "0";

/**
 * FOOTER_TUITION_LINK (owner 2026-09-28 11:40 PM NZ; default OFF -> default ON 2026-10-09, owner yes
 * after t595u: the footer "Bookings" link is visible): the footer link, now labelled
 * "Bookings" -> /bookings (renamed from Tuition 2026-10-09, t595u; /tuition redirects), shows on
 * every page and /bookings is listed in sitemap.xml. When hidden, /bookings leaves the sitemap but the
 * page itself stays reachable. Hide again with NEXT_PUBLIC_FOOTER_TUITION_LINK=0 at build time, or
 * change the default to `=== "1"`.
 */
export const FOOTER_TUITION_LINK: boolean = process.env.NEXT_PUBLIC_FOOTER_TUITION_LINK !== "0";

/**
 * FOOTER_LOGIN_LINK (2026-09-28 11:53 PM NZ): the footer "Log in" link (-> /members/login), shown
 * before Privacy and Terms. That link has been live in the footer since before this flag existed,
 * so the default keeps it ON so the 08:40 NZ post-close deploy doesn't remove a live link.
 * To hide it, build with NEXT_PUBLIC_FOOTER_LOGIN_LINK=0, or change the default to `=== "1"`
 * (off unless explicitly enabled).
 */
export const FOOTER_LOGIN_LINK: boolean = process.env.NEXT_PUBLIC_FOOTER_LOGIN_LINK !== "0";

/**
 * SCANNER_DECLUTTER (owner "ship all now" 2026-10-02; default ON): members-page scanner declutter —
 * Canaries | Stocks | ETFs | Crypto tabs (CanaryTable on Canaries; Mark key + Main Scanner +
 * closed "Sub Scanners" accordion on Stocks; ETF Watch / Crypto Watch split), quieter sub-card
 * styling, and "Show all" after 12 rows.
 * Roll back by building with NEXT_PUBLIC_SCANNER_DECLUTTER=0 (inlined at build time), or change
 * the default below to `=== "1"` (off unless explicitly enabled).
 */
export const SCANNER_DECLUTTER: boolean =
  process.env.NEXT_PUBLIC_SCANNER_DECLUTTER !== "0";

/**
 * HOME_MFI_TOUR (owner 2026-10-05; default OFF): the "Money Flow Index Scan" section of the
 * homepage scanner tour is hidden. The section code stays in HomeScannerTour.tsx; restore it by
 * building with NEXT_PUBLIC_HOME_MFI_TOUR=1 (inlined at build time), or change the default here.
 */
export const HOME_MFI_TOUR: boolean = process.env.NEXT_PUBLIC_HOME_MFI_TOUR === "1";

/**
 * ABOUT_PAGE (owner approved 2026-10-06 2:57 PM NZ; default ON):
 * /about page, footer "About" link (footer only, not the header), sitemap entry, and the condensed
 * "From the Founder" section near the bottom of the homepage.
 * Hide by building with NEXT_PUBLIC_ABOUT_PAGE=0 (inlined at build time) → /about 404s.
 */
export const ABOUT_PAGE: boolean = process.env.NEXT_PUBLIC_ABOUT_PAGE !== "0";

/**
 * MEMBERS_HISTORY_TAB (owner approved 2026-10-07, ships with the 2026-10-08 post-close run; default ON):
 * 5th "History" tab on /members (after Canaries, Stocks, ETFs, Crypto) — past 🐟 / 🙂 / 💵 marks by
 * date from data/signal-history.json (scripts/update-signal-history.mjs, run by the post-close pack).
 * "% since" shows by default with the education-only footnote (owner choice). No "In a box now"
 * column or filter (owner t567u).
 * Hide by building with NEXT_PUBLIC_MEMBERS_HISTORY_TAB=0 (inlined at build time).
 * The old /members/history-preview route now redirects to /members?tab=history.
 */
export const MEMBERS_HISTORY_TAB: boolean = process.env.NEXT_PUBLIC_MEMBERS_HISTORY_TAB !== "0";

/**
 * Homepage scanner-tour hides (owner t568u 2026-10-07; each default OFF = hidden on the public
 * homepage, same pattern as HOME_MFI_TOUR). Section code stays in HomeScannerTour.tsx; the members
 * dashboard is unaffected. Restore by building with the env var set to 1 (inlined at build time):
 *   HOME_SETUPS_TOUR         → NEXT_PUBLIC_HOME_SETUPS_TOUR=1         "Bullish and Bearish Setups"
 *   HOME_ETF_CRYPTO_TOUR     → NEXT_PUBLIC_HOME_ETF_CRYPTO_TOUR=1     "Sector ETF, Country and Crypto Scanners"
 *   HOME_BULLISH_STRONG_TOUR → NEXT_PUBLIC_HOME_BULLISH_STRONG_TOUR=1 "Bullish and Strong Stocks"
 */
export const HOME_SETUPS_TOUR: boolean = process.env.NEXT_PUBLIC_HOME_SETUPS_TOUR === "1";
export const HOME_ETF_CRYPTO_TOUR: boolean = process.env.NEXT_PUBLIC_HOME_ETF_CRYPTO_TOUR === "1";
export const HOME_BULLISH_STRONG_TOUR: boolean =
  process.env.NEXT_PUBLIC_HOME_BULLISH_STRONG_TOUR === "1";

/**
 * MEMBERS_DECIDE_COLLAPSE (owner t581u; APPROVED t583s2392 2026-10-08, default ON): members can
 * hide the Decide (Risk Guidance) column so the scanners open to full width (desktop) or move up
 * (mobile); the choice is remembered in localStorage. 
 * Roll back by building with NEXT_PUBLIC_MEMBERS_DECIDE_COLLAPSE=0.
 */
export const MEMBERS_DECIDE_COLLAPSE: boolean =
  process.env.NEXT_PUBLIC_MEMBERS_DECIDE_COLLAPSE !== "0";

/**
 * MEMBERS_TICKER_CHART_V2 (owner t581u; APPROVED t583s2392 2026-10-08, default ON): ticker
 * lightbox shows a daily candlestick chart (lightweight-charts) with our marks (🐟 🙂 💵 🥵 💀 📈),
 * from per-ticker JSON written by scripts/build-ticker-charts.mjs and served members-only by
 * /api/members/chart/[ticker]. The TradingView widget stays as a second tab.
 * Roll back with NEXT_PUBLIC_MEMBERS_TICKER_CHART_V2=0.
 */
export const MEMBERS_TICKER_CHART_V2: boolean =
  process.env.NEXT_PUBLIC_MEMBERS_TICKER_CHART_V2 !== "0";

/**
 * MEMBERS_MY_STOCKS (owner t583u; APPROVED t583s2392 2026-10-08, default ON): "My Stocks" tab +
 * ☆ star toggles on universe tickers (scanner rows and the chart lightbox). localStorage for now.
 *  Roll back with NEXT_PUBLIC_MEMBERS_MY_STOCKS=0.
 */
export const MEMBERS_MY_STOCKS: boolean = process.env.NEXT_PUBLIC_MEMBERS_MY_STOCKS !== "0";

/**
 * MEMBERS_DESK_IDEAS (owner 2026-10-09 6:59 PM NZ; default OFF): the Desk Ideas box (third-party
 * ideas from X) is hidden on /members. Code, data/desk-ideas.json, data/desk-ideas-accounts.json and
 * scripts/desk-ideas-ingest.mjs are kept; the routine skips the refresh while this is off
 * (docs/ops/desk-ideas-refresh.md). Show it by building with NEXT_PUBLIC_MEMBERS_DESK_IDEAS=1.
 */
export const MEMBERS_DESK_IDEAS: boolean = process.env.NEXT_PUBLIC_MEMBERS_DESK_IDEAS === "1";

/**
 * MEMBERS_CRYPTO_HERO_CHARTS (owner PREVIEW 2026-10-09 7:05 PM NZ; APPROVED 7:25 PM NZ to ship with the Sat 10 Oct 11:24 AM NZ update; default ON): BTC + ETH daily
 * candle charts with our marks at the top of the members Crypto tab, an indicators promo line and a
 * one-line mark key. Roll back by building with NEXT_PUBLIC_MEMBERS_CRYPTO_HERO_CHARTS=0.
 */
export const MEMBERS_CRYPTO_HERO_CHARTS: boolean = process.env.NEXT_PUBLIC_MEMBERS_CRYPTO_HERO_CHARTS !== "0";

/**
 * MEMBERS_CANARY_CHARTS (owner PREVIEW 2026-10-09 7:09 PM NZ; APPROVED 7:25 PM NZ to ship with the Sat 10 Oct 11:24 AM NZ update; default ON): a small "Chart" button on
 * each Canary readings row opens a pop-up with that canary's ~12-month daily line, its reference
 * (20-day average or fixed levels) and Healthy / Neutral / Warning zones from replaying the same rule.
 * Data: scripts/build-canary-charts.mjs (full pack step 8d2) → public/_chartdata/canary/ (members-only
 * route). Roll back by building with NEXT_PUBLIC_MEMBERS_CANARY_CHARTS=0.
 */
export const MEMBERS_CANARY_CHARTS: boolean = process.env.NEXT_PUBLIC_MEMBERS_CANARY_CHARTS !== "0";

/**
 * MEMBERS_X_RUMOURS (owner approved 2026-10-10; ships with the Tue 13 Oct 11:24 AM NZ post-close
 * update; default ON): the X Rumours full-width row directly under Insider Buying on the members
 * Stocks tab. Data: data/x-rumours.json (scripts/x-rumours-ingest.mjs; docs/ops/x-rumours-refresh.md).
 * Owner-only audit of filtered items is on /owner. Roll back by building with NEXT_PUBLIC_MEMBERS_X_RUMOURS=0.
 */
export const MEMBERS_X_RUMOURS: boolean = process.env.NEXT_PUBLIC_MEMBERS_X_RUMOURS !== "0";

/**
 * MEMBERS_SETUPS_COLUMNS (owner approved 2026-10-10; ships with the Tue 13 Oct 11:24 AM NZ post-close
 * update): Bullish / Bearish Setups become sortable tables — Stock · Score · Emojis · Since · Price ·
 * P/E · EPS g y/y · EV/EBITDA (data/fundamentals.json from scripts/build-fundamentals.mjs, SEC EDGAR).
 * Default ON. Roll back to the old chip rows by building with NEXT_PUBLIC_MEMBERS_SETUPS_COLUMNS=0.
 */
export const MEMBERS_SETUPS_COLUMNS: boolean = process.env.NEXT_PUBLIC_MEMBERS_SETUPS_COLUMNS !== "0";

/**
 * MEMBERS_GROWTH_SCORE (owner approved 2026-10-10; ships with the Tue 13 Oct 11:24 AM NZ post-close update):
 * Growth column (score + bar + Danger "!") with a hover / tap breakdown card in Bullish / Bearish Setups,
 * a "Columns" menu per box, the "Growth Score ranking" box on the Stocks tab, and the score on My Stocks.
 * Data: data/growth-score.json (scripts/build-fundamentals.mjs). Default ON; build with
 * NEXT_PUBLIC_MEMBERS_GROWTH_SCORE=0 to hide it all.
 */
export const MEMBERS_GROWTH_SCORE: boolean = process.env.NEXT_PUBLIC_MEMBERS_GROWTH_SCORE !== "0";

/**
 * MEMBERS_SECTOR_SCREENER (owner PREVIEW t691u 2026-10-14; APPROVED t693u to ship with the Thu 15 Oct
 * 11:24 AM NZ update; default ON): Sector Screener box at the top of the members ETFs tab — 11 SPDR
 * sectors, 1D/1W/1M/3M/YTD, vs SPY, rank change and a month-by-month rank heatmap. Data:
 * data/sector-screener.json (scripts/build-sector-screener.mjs, full-pack step 8g, non-fatal).
 * Roll back by building with NEXT_PUBLIC_MEMBERS_SECTOR_SCREENER=0.
 */
export const MEMBERS_SECTOR_SCREENER: boolean =
  process.env.NEXT_PUBLIC_MEMBERS_SECTOR_SCREENER !== "0";

/**
 * MEMBERS_COUNTRY_SCREENER (owner PREVIEW t695u 2026-10-14; APPROVED t696u to ship with the Thu 15 Oct
 * 11:24 AM NZ update; default ON): Country Screener (same Screener
 * component as the Sector one) for the top-20 Countries list, shown directly above the Countries box.
 * Data: data/country-screener.json (scripts/build-country-screener.mjs, full-pack step 8h, non-fatal).
 * Roll back by building with NEXT_PUBLIC_MEMBERS_COUNTRY_SCREENER=0.
 */
export const MEMBERS_COUNTRY_SCREENER: boolean =
  process.env.NEXT_PUBLIC_MEMBERS_COUNTRY_SCREENER === "1"; // Owner t697u 2026-10-14: removed; default OFF and not rendered.
