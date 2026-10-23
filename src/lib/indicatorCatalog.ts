/**
 * TradingView indicators for sale on /indicators (owner 2026-10-05). Invite-only scripts:
 * access is granted by TradingView username under Manage Access after payment.
 * Stripe is not live yet: the buy flow stores the order (indicator_orders, pending_payment)
 * and lands on a "payments coming soon" stub. No performance or returns claims in this copy.
 */
export type IndicatorProduct = {
  id: string;
  name: string;
  /** Exact title as published on TradingView (with emoji). */
  tvTitle: string;
  tradingViewUrl: string;
  image: string;
  imageAlt: string;
  tagline: string;
  helpsYou: string;
  /** Owner 2026-10-16 (PREVIEW): pull quote shown under the description. Verbatim owner line. */
  quote?: string;
  bullets: string[];
  timeframe: string;
  priceCents: number;
  priceLabel: string;
  /** Owner 2026-10-09: "hold the third" — hidden from every list and not orderable. */
  hidden?: boolean;
  /**
   * Owner 2026-10-10: sold on its own (NOT in the bundle), US$99, free for members; ordered through the
   * same /indicators/buy → checkout flow as the bundle (?script=<id>).
   */
  separate?: boolean;
};

/** Owner 2026-10-16, verbatim. Education-only context line; not a signal or a returns claim. */
export const PESSIMISM_LINE =
  "While peak optimism is hard to catch, peak pessimism is a lot easier.";

export const SUPPORT_EMAIL = "shaun@canarydashboard.com";

/**
 * Owner 2026-10-09 (ships Sat 10 Oct): Canary RelRSI (🙂🐟🥵💀) and MFI Washout (💵) are sold together as ONE
 * bundle, US$99 one-off for both; free for Canary Dashboard members, who keep access even if they cancel.
 * Vanna & Charm was on hold (hidden) 2026-10-09; owner 2026-10-10 put it back as its OWN listing, separate
 * from the bundle, with no price shown (pre-hide "$99 USD each, free for members" is not reused).
 * Replaces "$99 USD each" (2026-10-06).
 */
export const SEPARATE_ACCESS_LINE = "Sold separately · US$99 · free for members";
export const MEMBERS_FREE_LINE_ONE = "Free for Canary Dashboard members, and you keep it even if you cancel.";
export const BUNDLE_PRICE_LABEL = "US$99";
export const BUNDLE_PRICE_LINE = "US$99 one-off for both";
export const MEMBERS_FREE_LINE = "Free for Canary Dashboard members, and you keep them even if you cancel.";

const ALL_INDICATORS: IndicatorProduct[] = [
  {
    id: "vanna-charm",
    name: "Vanna & Charm Flows and Window of Weakness",
    tvTitle: "Vanna & Charm 👑✨ Flows and 🪟 Window of Weakness",
    tradingViewUrl:
      "https://www.tradingview.com/script/AF9ofe7J-Vanna-Charm-Flows-and-Window-of-Weakness/",
    image: "/indicators/vanna-charm.jpg",
    imageAlt: "Vanna & Charm Flows indicator on a daily Bitcoin chart, with 👑✨ and 🪟 marks",
    tagline: "Know which part of the month you're trading in",
    // Owner 2026-10-11: cautious wording, no directional claims.
    helpsYou:
      "Marks where you are in the options calendar: the days when options-dealer hedging flows (vanna and charm) tend to build, and the window around monthly expiry when they tend to fade. Flows are one input among many; they don't reliably predict direction on their own. Education only.",
    bullets: [
      "👑✨ marks the days when vanna and charm hedging flows tend to build",
      "🪟 marks the window around monthly expiry when those flows tend to fade (\"on holiday\")",
      "The same calendar read as the Vanna & Charm box on the dashboard, on your own charts",
    ],
    timeframe: "Daily chart only",
    // Owner 2026-10-10 "ship all now": US$99 on its own, free for members, separate from the bundle.
    priceCents: 9900,
    priceLabel: "US$99",
    separate: true,
  },
  {
    id: "fish-sweaty",
    name: "Canary RelRSI: Time to Fish or Getting Sweaty",
    tvTitle: "Time to Fish 🙂🐟, or Getting Sweaty? 🥵💀",
    tradingViewUrl: "https://www.tradingview.com/script/CJgLPMDu-Time-to-Fish-or-Getting-Sweaty/",
    image: "/indicators/fish-sweaty.jpg",
    imageAlt: "Time to Fish or Getting Sweaty indicator on a daily Bitcoin chart, with 🙂🐟 and 🥵💀 marks",
    tagline: "Spot washed-out names and tired ones on your own charts",
    helpsYou:
      "Puts the same 🙂🐟 and 🥵💀 marks from our Fish and Sweaty scanners on any chart you open. It helps you find stocks that look sold out and worth a closer look, and notice when a name has run hard and is getting tired.",
    quote: PESSIMISM_LINE,
    bullets: [
      "🙂🐟 appears when conditions favour buying or bottoming",
      "🥵 appears when the stock looks exhausted, 💀 when price loses upside momentum",
      "The same read behind the Fish and Sweaty boxes on the dashboard",
    ],
    timeframe: "Daily chart only",
    priceCents: 9900,
    priceLabel: "US$99 bundle",
  },
  {
    // Owner 2026-10-06: published on TradingView; the members MFI Scan runs v6.1 (= v6 + private depth and 🐟/🙂 gates) from 2026-10-08; card copy is v6-safe.
    id: "mfi-washout",
    name: "MFI Washout",
    tvTitle: "MFI Washout 💵",
    tradingViewUrl: "https://www.tradingview.com/script/OhImHDIH-MFI-Washout/",
    image: "/indicators/mfi-washout.jpg",
    imageAlt: "MFI Washout indicator on a daily chart, with 💵 marks on price and the MFI pane below",
    tagline: "See when the selling looks washed out",
    helpsYou:
      "Puts the 💵 mark from our MFI Scan on any chart you open. It watches the Money Flow Index, which blends price and volume, and marks the day money flow turns back up after a washout. It helps you find sold-out names worth a closer look.",
    quote: PESSIMISM_LINE,
    bullets: [
      "💵 appears when money flow hooks back up from a washed-out, oversold zone",
      "It looks for a burst of heavy volume first, then quieter trading on the turn",
      "Fires once per washout: the same read behind the MFI Scan box on the dashboard",
    ],
    timeframe: "Daily chart only",
    priceCents: 9900,
    priceLabel: "US$99 bundle",
  },
];

/** The two bundled indicators (Canary RelRSI + MFI Washout). */
export const INDICATOR_PRODUCTS: IndicatorProduct[] = ALL_INDICATORS.filter((p) => !p.hidden && !p.separate);

/** Sold on their own, outside the bundle (owner 2026-10-10: Vanna & Charm, US$99, free for members). */
export const SEPARATE_INDICATORS: IndicatorProduct[] = ALL_INDICATORS.filter((p) => !p.hidden && p.separate);

/** The only thing for sale: both indicators together. */
export const INDICATOR_BUNDLE: IndicatorProduct = {
  id: "bundle",
  name: "Canary RelRSI + MFI Washout bundle",
  tvTitle: "Time to Fish 🙂🐟, or Getting Sweaty? 🥵💀 + MFI Washout 💵",
  // Orders store one URL column; access is granted on both scripts (space-separated links).
  tradingViewUrl: INDICATOR_PRODUCTS.map((p) => p.tradingViewUrl).join(" "),
  image: "/indicators/fish-sweaty.jpg",
  imageAlt: "Canary RelRSI and MFI Washout indicators on TradingView",
  tagline: "Both indicators, one bundle",
  helpsYou: "Canary RelRSI (🙂🐟🥵💀) and MFI Washout (💵) together, on any daily chart you open.",
  bullets: [],
  timeframe: "Daily chart only",
  priceCents: 9900,
  priceLabel: BUNDLE_PRICE_LABEL,
};

/** Lookup for display (incl. legacy order rows: single indicators, hidden ones). */
export function findIndicator(id: string | null | undefined): IndicatorProduct | undefined {
  if (id === INDICATOR_BUNDLE.id) return INDICATOR_BUNDLE;
  return ALL_INDICATORS.find((p) => p.id === id);
}

/** What can be ordered now: the bundle (old single bundled-indicator links map to it) or a separately sold
 * indicator (Vanna & Charm); hidden ones can't be ordered. */
export function findOrderable(id: string | null | undefined): IndicatorProduct | undefined {
  if (id === INDICATOR_BUNDLE.id) return INDICATOR_BUNDLE;
  const separate = SEPARATE_INDICATORS.find((p) => p.id === id);
  if (separate) return separate;
  return INDICATOR_PRODUCTS.some((p) => p.id === id) ? INDICATOR_BUNDLE : undefined;
}

/** TradingView usernames: letters, numbers, underscore (dots/hyphens tolerated), 2-40 chars. */
export function normalizeTvUsername(raw: unknown): string | null {
  const u = String(raw ?? "").trim().replace(/^@+/, "");
  if (!/^[A-Za-z0-9_][A-Za-z0-9_.-]{1,39}$/.test(u)) return null;
  return u;
}
