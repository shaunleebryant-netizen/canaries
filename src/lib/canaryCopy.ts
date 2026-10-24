/**
 * Plain-English names and descriptions for the members Canary readings table.
 * UI-only override: data/state.json (built by the refresh scripts) keeps its
 * technical labels; the Canary name and description use these instead.
 * The formula itself is shown again in the table's "How calculated" column
 * (seat name + description from state). No weights.
 */
export const CANARY_COPY: Record<string, { name: string; description: string }> = {
  "cyclical-defensive": {
    name: "Growth vs safety sectors",
    description:
      "Are investors favouring tech and consumer stocks over safe, steady sectors like utilities?",
  },
  "xlf-kre": {
    name: "Banks",
    description:
      "Big banks and regional banks. Trouble in lending often shows up here first.",
  },
  "vix-vix3m": {
    name: "Fear curve (VIX)",
    description:
      "Short-term fear compared with longer-term fear. Calm markets keep short-term fear lower.",
  },
  "nyse-ad": {
    name: "Rising vs falling stocks",
    description:
      "How many NYSE stocks are rising compared with falling. It shows how healthy the market is underneath.",
  },
  "pct-above-200dma": {
    name: "Stocks in long-term uptrends",
    description:
      "The share of stocks trading above their long-term average price.",
  },
  "es1-jp30": {
    name: "US stocks vs Japanese bonds",
    description:
      "US stock futures compared with Japan's long-term bonds, a check on global money flows.",
  },
  "sp-top-50": {
    name: "Mega-cap leaders",
    description: "The 50 biggest US companies. Are the market leaders still leading?",
  },
  sp600: {
    name: "Small caps",
    description:
      "Smaller US companies. They tend to do well when investors feel confident.",
  },
  rsp: {
    name: "The average stock",
    description:
      "An equal-weight S&P 500 fund, so the typical stock counts as much as the giants.",
  },
  "vix-vvix": {
    name: "Fear gauge (VIX)",
    description:
      "The VIX fear gauge. Lower readings mean calmer markets.",
  },
  "finra-margin": {
    name: "Borrowing to invest",
    description:
      "How much investors are borrowing to buy stocks. Published monthly, so it lags a little.",
  },
  "qqq-sma20": {
    name: "Nasdaq trend",
    description: "Is the tech-heavy Nasdaq 100 trending up or down lately?",
  },
  "hyg-ief-sma20": {
    name: "Credit appetite",
    description:
      "Riskier company bonds compared with safe government bonds. Rising means lenders feel confident.",
  },
};

/** Soften technical wording in the data-driven one-line read. */
export function plainRead(s: string | null | undefined): string {
  if (!s) return "";
  return s
    .replace(/\b(its|their) 20-day averages?\b/gi, "$1 recent average")
    .replace(/\b20-day averages?\b/gi, "recent average")
    .replace(/\bin healthy contango \(SAFE\)/gi, "in its normal, calm shape")
    .replace(/\s*\((SAFE|CAUTION|DANGER)\)/g, "")
    .replace(/\bunder 50%/gi, "under half")
    .replace(/\bover 50%/gi, "over half")
    .replace(/\bJapan 30y bond price\b/gi, "Japanese bonds")
    .replace(/\bby level\b/gi, "")
    .replace(/\s+\./g, ".");
}

/** Replace technical tokens in the "last reading" text (keeps the values). */
export function plainLastReading(s: string | null | undefined): string {
  if (!s) return "";
  return s
    .replace(/\bSMA20\b/g, "avg")
    .replace(/\s*\(raw close [^)]*\)/gi, "");
}

/**
 * Plain source line for the canary table. The raw evidence.source string is
 * written by scripts/refresh-decide.mjs (Builder's file) and can include
 * symbols, periods and rules, so members only see the data provider(s).
 */
export function plainSource(s: string | null | undefined): string {
  if (!s) return "";
  const providers: string[] = [];
  if (/yahoo/i.test(s)) providers.push("Yahoo Finance");
  if (/tradingview/i.test(s)) providers.push("TradingView");
  if (/finra/i.test(s)) providers.push("FINRA");
  if (/cboe/i.test(s)) providers.push("Cboe");
  return `Source: ${providers.length ? providers.join(" · ") : "market data"}`;
}

/**
 * Derivation line for the members table. Plain names hide the seat formula;
 * this puts back the technical name and description from state.json
 * (e.g. "(XLK+XLY) / (XLP+XLU)").
 */
export function howCalculated(
  name: string | null | undefined,
  description: string | null | undefined,
): { title: string; detail: string | null } {
  const title = (name ?? "").trim();
  const detail = (description ?? "").trim();
  if (!detail || detail === title) return { title, detail: null };
  return { title, detail };
}
