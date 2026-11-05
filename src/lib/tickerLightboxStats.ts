/**
 * Header figures for the members ticker lightbox.
 * Canary Score and YoY EPS use the same pack files as the scanners
 * (data/growth-score.json, data/fundamentals.json). Visible EPS marks match
 * SetupsTable: "+" / "−" and a whole percent, "n/m", "n/a", or "—".
 * QoQ diluted EPS and the Yahoo average analyst target are not in those files.
 * The formatters still apply the pack's empty marks, and the "fewer than 6 analysts"
 * rule when an opinion count is present. Education only. Not a recommendation.
 */
import type { GrowthRow } from "@/lib/loadGrowthScore";
import type { FundWhy } from "@/lib/loadFundamentals";

export const LIGHTBOX_STAT_LABELS = {
  score: "Canary Score",
  yoy: "YoY EPS",
  qoq: "QoQ EPS",
  target: "Avg target",
} as const;

/** Average target is shown only when more than 5 analysts have published one. */
export const MIN_ANALYST_OPINIONS = 6;

export interface LightboxFundSnap {
  /** YoY diluted EPS growth as a fraction (0.25 = +25%). Same field as fundamentals `g`. */
  g: number | null;
  gw: FundWhy;
  n?: string;
  fe?: string;
  /** QoQ diluted EPS growth. Omitted: not in the current fundamentals pack. */
  qoq?: number | null;
  qoqWhy?: FundWhy;
  /** Yahoo average analyst price target. Omitted: not in the current pack. */
  target?: number | null;
  /** Published opinions behind `target`. Null or omitted = unknown, not a low count. */
  opinions?: number | null;
}

export interface UniverseLightboxPack {
  /** Fish-universe companies. Off-universe names and non-companies are left out, so the row is omitted. */
  companies: string[];
  fundamentals: Record<string, LightboxFundSnap>;
  growth: Record<string, GrowthRow>;
  growthScored: number;
}

export interface StatText {
  text: string;
  title: string;
  tone: "up" | "down" | "empty" | "value";
}

const EPS_LEAD = {
  yoy: "12-month diluted EPS vs the 12 months before.",
  qoq: "Latest quarter diluted EPS vs the previous quarter.",
} as const;

function periodLabel(ymd: string | undefined): string {
  if (!ymd || ymd.length < 10) return "";
  return `latest period ${ymd.slice(8, 10)}/${ymd.slice(5, 7)}/${ymd.slice(0, 4)}`;
}

/** Same visible marks as SetupsTable `fmtG` / `nullLabel`. */
export function formatEpsGrowth(
  value: number | null,
  why: FundWhy | undefined,
  kind: keyof typeof EPS_LEAD,
  extra?: { note?: string; periodEnd?: string },
): StatText {
  const lead = EPS_LEAD[kind];
  if (value != null && Number.isFinite(value)) {
    const text = `${value >= 0 ? "+" : "−"}${Math.abs(value * 100).toFixed(0)}%`;
    const title = [lead, "n/m when either period is negative. Education only.", extra?.note, periodLabel(extra?.periodEnd)]
      .filter(Boolean)
      .join(" ");
    return { text, title, tone: value < 0 ? "down" : "up" };
  }
  if (why === "nm") {
    return {
      text: "n/m",
      title: `${lead} Not meaningful: diluted EPS is negative in one of the two periods. Education only.`,
      tone: "empty",
    };
  }
  if (why === "na") {
    return {
      text: "n/a",
      title: "Not a company (ETF, crypto or metal): no earnings. Education only.",
      tone: "empty",
    };
  }
  if (why === "stale") {
    return { text: "—", title: `${lead} Latest SEC filing is too old to use. Education only.`, tone: "empty" };
  }
  return { text: "—", title: `${lead} Not available in SEC data. Education only.`, tone: "empty" };
}

/** Price text matches the setups table: 2 decimals, or a whole number at 1000 and above. */
export function formatAnalystTarget(target: number | null, opinions: number | null): StatText {
  if (opinions == null) {
    return {
      text: "—",
      title: "Average analyst target is not in this pack. Education only, not a recommendation.",
      tone: "empty",
    };
  }
  if (opinions < MIN_ANALYST_OPINIONS) {
    const noun = opinions === 1 ? "opinion" : "opinions";
    return {
      text: "fewer than 6 analysts",
      title: `${opinions} published ${noun}. The average target is shown when at least 6 analysts publish one. Education only, not a recommendation.`,
      tone: "empty",
    };
  }
  if (target == null || !Number.isFinite(target)) {
    return {
      text: "—",
      title: "No average analyst target in this pack. Education only, not a recommendation.",
      tone: "empty",
    };
  }
  const text = target >= 1000 ? target.toFixed(0) : target.toFixed(2);
  return {
    text,
    title: `Average analyst price target from ${opinions} opinions. Education only, not a recommendation.`,
    tone: "value",
  };
}

export function lightboxFigures(fund: LightboxFundSnap | undefined): { yoy: StatText; qoq: StatText; analyst: StatText } {
  const qoqValue = fund?.qoq ?? null;
  const qoqWhy: FundWhy | undefined = qoqValue != null ? (fund?.qoqWhy ?? null) : (fund?.qoqWhy ?? "missing");
  const opinions = fund && "opinions" in fund ? (fund.opinions ?? null) : null;
  return {
    yoy: formatEpsGrowth(fund?.g ?? null, fund ? fund.gw : "missing", "yoy", { note: fund?.n, periodEnd: fund?.fe }),
    qoq: formatEpsGrowth(qoqValue, qoqWhy, "qoq"),
    analyst: formatAnalystTarget(fund?.target ?? null, opinions),
  };
}
