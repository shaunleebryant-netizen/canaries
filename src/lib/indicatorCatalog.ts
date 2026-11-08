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
  "Peak optimism is hard to catch, peak pessimism is often easier.";

export const SUPPORT_EMAIL = "shaun@canarydashboard.com";

/**
 * Owner 2026-10-27: each indicator is US$99 one-off on its own (no bundle). Free for Canary Dashboard
 * members, who keep access even if they cancel. Legacy `bundle` orders still resolve via INDICATOR_BUNDLE.
 */
export const SEPARATE_ACCESS_LINE = "US$99 one-time payment · free for members";
export const MEMBERS_FREE_LINE_ONE = "Free for members.";
export const BUNDLE_PRICE_LABEL = "US$99";  // legacy
export const BUNDLE_PRICE_LINE = "US$99 one-time payment";
export const MEMBERS_FREE_LINE = "Free for members.";
export const EACH_PRICE_LINE = "US$99 one-time payment";

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
      "Marks the options-calendar windows when dealer hedging flows (vanna and charm) tend to build, and around monthly expiry when they tend to fade.",
    bullets: [
      "👑✨ when vanna and charm flows tend to build",
      "🪟 around monthly expiry, when those flows tend to fade",
      "Same calendar read as the dashboard Vanna & Charm box",
    ],
    timeframe: "Daily chart only",
    priceCents: 9900,
    priceLabel: "US$99",
  },
  {
    id: "fish-sweaty",
    name: "Canary RelRSI 🙂🐟 and 🥵",
    tvTitle: "Time to Fish 🙂🐟, or Getting Sweaty? 🥵💀",
    tradingViewUrl: "https://www.tradingview.com/script/CJgLPMDu-Time-to-Fish-or-Getting-Sweaty/",
    image: "/indicators/fish-sweaty.jpg",
    imageAlt: "Time to Fish or Getting Sweaty indicator on a daily Bitcoin chart, with 🙂🐟 and 🥵💀 marks",
    tagline: "Spot washed-out names and tired ones on your own charts",
    helpsYou:
      "Spot names that have meaningfully recovered from oversold conditions, and ones that have run too hard, too fast.",
    // Owner 2026-11-02 (t939u): pessimism pull quote removed from the indicators page.
    bullets: [
      "🙂🐟 to visualise when RSI is recovering after a washout",
      "🥵 when a run looks exhausted · 💀 when upside momentum fades",
      "Same read as the Fish and Sweaty boxes on the dashboard",
    ],
    timeframe: "Daily chart only",
    priceCents: 9900,
    priceLabel: "US$99",
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
      "Watches for high relative money flow to previous sessions, and marks when a ticker turns up after a washout.",
    bullets: [
      "💵 when money flow hooks up from a washout",
      "Looks for heavy volume first, then a quieter turn",
      "Once per washout — same read as the MFI Scan box",
    ],
    timeframe: "Daily chart only",
    priceCents: 9900,
    priceLabel: "US$99",
  },
];

/** All live indicators for sale (US$99 each). */
export const INDICATOR_PRODUCTS: IndicatorProduct[] = ALL_INDICATORS.filter((p) => !p.hidden);

/** @deprecated Owner 2026-10-27: no separate tier — kept empty for old imports. */
export const SEPARATE_INDICATORS: IndicatorProduct[] = [];

/** Legacy bundle product for old order rows / ?script=bundle links. */
export const INDICATOR_BUNDLE: IndicatorProduct = {
  id: "bundle",
  name: "Canary RelRSI + MFI Washout (legacy bundle)",
  tvTitle: "Time to Fish 🙂🐟, or Getting Sweaty? 🥵💀 + MFI Washout 💵",
  tradingViewUrl: ALL_INDICATORS.filter((p) => p.id === "fish-sweaty" || p.id === "mfi-washout")
    .map((p) => p.tradingViewUrl)
    .join(" "),
  image: "/indicators/fish-sweaty.jpg",
  imageAlt: "Canary RelRSI and MFI Washout indicators on TradingView",
  tagline: "Legacy two-script order",
  helpsYou: "Legacy order covering RelRSI and MFI Washout together.",
  bullets: [],
  timeframe: "Daily chart only",
  priceCents: 9900,
  priceLabel: BUNDLE_PRICE_LABEL,
};

/** Lookup for display (incl. legacy order rows: single indicators, hidden ones, bundle). */
export function findIndicator(id: string | null | undefined): IndicatorProduct | undefined {
  if (id === INDICATOR_BUNDLE.id) return INDICATOR_BUNDLE;
  return ALL_INDICATORS.find((p) => p.id === id);
}

/** What can be ordered now: any live indicator, or the legacy bundle id. */
export function findOrderable(id: string | null | undefined): IndicatorProduct | undefined {
  if (id === INDICATOR_BUNDLE.id) return INDICATOR_BUNDLE;
  return INDICATOR_PRODUCTS.find((p) => p.id === id);
}

/** TradingView usernames: letters, numbers, underscore (dots/hyphens tolerated), 2-40 chars. */
export function normalizeTvUsername(raw: unknown): string | null {
  const u = String(raw ?? "").trim().replace(/^@+/, "");
  if (!/^[A-Za-z0-9_][A-Za-z0-9_.-]{1,39}$/.test(u)) return null;
  return u;
}

/**
 * Owner 2026-11-02 (t909u): buyers can pick several indicators in one order. Accepts an array or a
 * comma-separated string of ids; returns de-duplicated live products in catalog order (legacy
 * "bundle" still resolves on its own). Stored on indicator_orders.script_id as "id1,id2".
 */
export function findOrderableMany(raw: unknown): IndicatorProduct[] {
  const ids = (Array.isArray(raw) ? raw : String(raw ?? "").split(","))
    .map((s) => String(s).trim())
    .filter(Boolean)
    .slice(0, 10);
  if (ids.length === 1 && ids[0] === INDICATOR_BUNDLE.id) return [INDICATOR_BUNDLE];
  const set = new Set(ids);
  return INDICATOR_PRODUCTS.filter((p) => set.has(p.id));
}

/** Display lookup for a stored (possibly multi) script_id. */
export function findIndicators(id: string | null | undefined): IndicatorProduct[] {
  const ids = String(id ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  return ids.map((i) => findIndicator(i)).filter((p): p is IndicatorProduct => Boolean(p));
}
