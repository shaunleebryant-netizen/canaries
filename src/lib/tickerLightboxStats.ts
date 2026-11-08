/**
 * Header figures for the members ticker lightbox.
 * Canary Score: data/growth-score.json.
 * YoY / QoQ EPS and the Yahoo average target: data/fundamentals.json, the same
 * fields the universe table uses (`eg` or `g`, `eq`, `tm` when `ao` > 5).
 * Visible EPS marks match that table: "+" / "−" and a whole percent, "n/m", "n/a", or "—".
 * Education only. Not a recommendation.
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
  /** YoY diluted EPS growth as a fraction. Used when `eg` is absent. */
  g: number | null;
  gw: FundWhy;
  n?: string;
  fe?: string;
  /** Universe table YoY (`eg`). Wins over `g` when the pack sets it. */
  eg?: number | null;
  egw?: FundWhy;
  /** Universe table QoQ (`eq`), fraction. */
  eq?: number | null;
  eqw?: FundWhy;
  /** Live fundamentals.json QoQ key (mapped to `eq`). */
  qq?: number | null;
  qqw?: FundWhy;
  /** Yahoo average analyst price target (`tm`). */
  tm?: number | null;
  /** Opinion count (`ao`). Omitted = unknown. Shown as a price only when > 5. */
  ao?: number | null;
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

/** Copy the universe-table fields off a fundamentals row. Extra pack keys are kept. */
export function lightboxFundFromRow(row: LightboxFundSnap): LightboxFundSnap {
  return {
    g: row.g,
    gw: row.gw,
    ...(row.n ? { n: row.n } : {}),
    ...(row.fe ? { fe: row.fe } : {}),
    ...(row.eg !== undefined ? { eg: row.eg } : {}),
    ...(row.egw !== undefined ? { egw: row.egw } : {}),
    ...(row.eq !== undefined ? { eq: row.eq } : row.qq !== undefined ? { eq: row.qq } : {}),
    ...(row.eqw !== undefined ? { eqw: row.eqw } : row.qqw !== undefined ? { eqw: row.qqw } : {}),
    ...(row.tm !== undefined ? { tm: row.tm } : {}),
    ...(row.ao !== undefined ? { ao: row.ao } : {}),
  };
}

export function lightboxFigures(fund: LightboxFundSnap | undefined): { yoy: StatText; qoq: StatText; analyst: StatText } {
  const yoyValue = fund?.eg != null ? fund.eg : (fund?.g ?? null);
  const yoyWhy: FundWhy | undefined = fund?.eg != null ? (fund.egw !== undefined ? fund.egw : fund.gw) : fund ? fund.gw : "missing";
  const qoqValue = fund?.eq ?? null;
  const qoqWhy: FundWhy | undefined = qoqValue != null ? (fund?.eqw ?? null) : (fund?.eqw ?? "missing");
  const opinions = fund && "ao" in fund ? (fund.ao ?? null) : null;
  return {
    yoy: formatEpsGrowth(yoyValue, yoyWhy, "yoy", { note: fund?.n, periodEnd: fund?.fe }),
    qoq: formatEpsGrowth(qoqValue, qoqWhy, "qoq"),
    analyst: formatAnalystTarget(fund?.tm ?? null, opinions),
  };
}
