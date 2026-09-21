/**
 * Yahoo Finance chart helpers — Workers-safe fetch with User-Agent.
 * Soft-fail per symbol; never invent prints.
 */

export const YAHOO_UA =
  "Mozilla/5.0 (compatible; CoherantCanary/1.0; +https://coherantcanary.com)";

export interface YahooBar {
  date: string;
  close: number;
}

export interface YahooQuote {
  symbol: string;
  /** Requested label (may differ from Yahoo symbol, e.g. WTI → CL=F). */
  label: string;
  last: number;
  prevClose: number | null;
  changePct: number | null;
  asOf: string | null;
}

export interface YahooFetchFail {
  symbol: string;
  label?: string;
  error: string;
}

function encodeSymbol(symbol: string): string {
  return encodeURIComponent(symbol);
}

function isoDay(unixSec: number): string {
  return new Date(unixSec * 1000).toISOString().slice(0, 10);
}

async function chartJson(
  symbol: string,
  params: { interval?: string; range?: string } = {}
): Promise<{ ok: true; data: unknown } | { ok: false; error: string }> {
  const interval = params.interval ?? "1d";
  const range = params.range ?? "5d";
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeSymbol(symbol)}?interval=${interval}&range=${range}`;
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": YAHOO_UA,
        Accept: "application/json",
      },
      // Workers / OpenNext: avoid Next data-cache surprises for live quotes
      cache: "no-store",
    });
    if (!res.ok) {
      return { ok: false, error: `HTTP ${res.status}` };
    }
    const data = await res.json();
    return { ok: true, data };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

/** Last N daily closes (oldest → newest). Soft-fail → null. */
export async function fetchDailyCloses(
  symbol: string,
  opts: { range?: string; lastN?: number } = {}
): Promise<{ bars: YahooBar[] } | { error: string }> {
  const range = opts.range ?? "3mo";
  const lastN = opts.lastN ?? 10;
  const got = await chartJson(symbol, { interval: "1d", range });
  if (!got.ok) return { error: got.error };

  const root = got.data as {
    chart?: {
      error?: { description?: string } | null;
      result?: Array<{
        timestamp?: number[];
        indicators?: { quote?: Array<{ close?: Array<number | null> }> };
      }>;
    };
  };
  const err = root.chart?.error;
  const result = root.chart?.result?.[0];
  if (err || !result) {
    return { error: err?.description ?? "no chart result" };
  }
  const ts = result.timestamp ?? [];
  const closes = result.indicators?.quote?.[0]?.close ?? [];
  const bars: YahooBar[] = [];
  for (let i = 0; i < ts.length; i++) {
    const c = closes[i];
    const t = ts[i];
    if (c == null || t == null || Number.isNaN(c)) continue;
    bars.push({ date: isoDay(t), close: Number(c) });
  }
  if (bars.length === 0) return { error: "empty closes" };
  return { bars: bars.slice(-lastN) };
}

/** Live-ish quote from chart meta + recent bars. Soft-fail → null. */
export async function fetchQuote(
  symbol: string,
  label?: string
): Promise<{ quote: YahooQuote } | { error: string }> {
  const got = await chartJson(symbol, { interval: "1d", range: "5d" });
  if (!got.ok) return { error: got.error };

  const root = got.data as {
    chart?: {
      error?: { description?: string } | null;
      result?: Array<{
        meta?: {
          symbol?: string;
          regularMarketPrice?: number;
          chartPreviousClose?: number;
          previousClose?: number;
          regularMarketTime?: number;
        };
        timestamp?: number[];
        indicators?: { quote?: Array<{ close?: Array<number | null> }> };
      }>;
    };
  };
  const err = root.chart?.error;
  const result = root.chart?.result?.[0];
  if (err || !result?.meta) {
    return { error: err?.description ?? "no quote result" };
  }
  const meta = result.meta;
  let last = meta.regularMarketPrice;
  if (last == null || Number.isNaN(last)) {
    const closes = result.indicators?.quote?.[0]?.close ?? [];
    for (let i = closes.length - 1; i >= 0; i--) {
      const c = closes[i];
      if (c != null && !Number.isNaN(c)) {
        last = c;
        break;
      }
    }
  }
  if (last == null || Number.isNaN(last)) {
    return { error: "no last price" };
  }
  const prev =
    meta.chartPreviousClose ??
    meta.previousClose ??
    null;
  const changePct =
    prev != null && prev !== 0
      ? Number((((last - prev) / prev) * 100).toFixed(2))
      : null;
  const asOf =
    meta.regularMarketTime != null
      ? new Date(meta.regularMarketTime * 1000).toISOString()
      : null;

  return {
    quote: {
      symbol: meta.symbol ?? symbol,
      label: label ?? symbol,
      last: Number(last),
      prevClose: prev != null ? Number(prev) : null,
      changePct,
      asOf,
    },
  };
}

/**
 * Try symbols in order; return first success.
 * Used for SP600 (^SP600 then IJR fallback) and WTI (CL=F then USO).
 */
export async function fetchQuoteFallback(
  candidates: Array<{ symbol: string; label: string }>
): Promise<{ quote: YahooQuote } | { error: string; tried: string[] }> {
  const tried: string[] = [];
  const errors: string[] = [];
  for (const c of candidates) {
    tried.push(c.symbol);
    const r = await fetchQuote(c.symbol, c.label);
    if ("quote" in r) return r;
    errors.push(`${c.symbol}: ${r.error}`);
  }
  return { error: errors.join("; ") || "all failed", tried };
}

/** Align multiple date→close maps on common dates; last N. */
export function alignedRatio(
  seriesList: YahooBar[][],
  combine: (closes: number[]) => number | null,
  lastN = 10
): { dates: string[]; values: number[] } | null {
  if (seriesList.length === 0) return null;
  const maps = seriesList.map(
    (bars) => new Map(bars.map((b) => [b.date, b.close]))
  );
  let common = new Set(maps[0]!.keys());
  for (let i = 1; i < maps.length; i++) {
    const next = new Set<string>();
    for (const d of common) {
      if (maps[i]!.has(d)) next.add(d);
    }
    common = next;
  }
  const dates = [...common].sort().slice(-lastN);
  if (dates.length < 2) return null;
  const values: number[] = [];
  const outDates: string[] = [];
  for (const d of dates) {
    const closes = maps.map((m) => m.get(d)!);
    const v = combine(closes);
    if (v == null || Number.isNaN(v)) continue;
    outDates.push(d);
    values.push(Number(v.toFixed(6)));
  }
  if (outDates.length < 2) return null;
  return { dates: outDates, values };
}
