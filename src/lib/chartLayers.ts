/**
 * Layer visibility for the Canary-marks candlestick chart.
 * Every entitled layer starts on, whether or not this ticker has that mark.
 * A member's explicit toggle is stored and restored. Free ETF charts still
 * force the locked layers off for display only; that force is not saved.
 * Vanna & Charm is not a chart layer.
 */
export type MarkKind = "fish" | "smile" | "mfi" | "fairy" | "m20" | "sweat" | "skull";

export const MARK_ORDER: readonly MarkKind[] = ["smile", "m20", "fish", "mfi", "fairy", "sweat", "skull"];

export type ChartLayerId = MarkKind;

export const LAYER_IDS: readonly ChartLayerId[] = [...MARK_ORDER];

export type ChartLayers = Record<ChartLayerId, boolean>;

/** Paid default: every layer on. Free ETF charts force FREE_ETF_LOCKED off when shown. */
export const DEFAULT_CHART_LAYERS: ChartLayers = {
  smile: true,
  m20: true,
  fish: true,
  mfi: true,
  fairy: true,
  sweat: true,
  skull: true,
};

export const FREE_ETF_LOCKED: readonly MarkKind[] = ["fish", "mfi", "fairy", "sweat", "skull"];

/** v3 ignores the old default-off save so the first open after this change starts all on. */
export const CHART_LAYERS_STORAGE_KEY = "canary.chartLayers.v3";

export function clampChartLayers(layers: ChartLayers, access: "paid" | "free-etf"): ChartLayers {
  if (access !== "free-etf") return layers;
  const next = { ...layers };
  for (const id of FREE_ETF_LOCKED) next[id] = false;
  return next;
}

export function parseChartLayers(raw: unknown): ChartLayers {
  const next: ChartLayers = { ...DEFAULT_CHART_LAYERS };
  if (!raw || typeof raw !== "object") return next;
  const obj = raw as Record<string, unknown>;
  for (const id of LAYER_IDS) {
    if (typeof obj[id] === "boolean") next[id] = obj[id];
  }
  return next;
}

export function readStoredChartLayers(
  storage: { getItem(key: string): string | null } | null
): ChartLayers {
  if (!storage) return { ...DEFAULT_CHART_LAYERS };
  try {
    const raw = storage.getItem(CHART_LAYERS_STORAGE_KEY);
    if (!raw) return { ...DEFAULT_CHART_LAYERS };
    return parseChartLayers(JSON.parse(raw));
  } catch {
    return { ...DEFAULT_CHART_LAYERS };
  }
}

export function latestVisibleMarks(
  marks: readonly (readonly [number, MarkKind])[],
  layers: ChartLayers
): { kind: MarkKind; off: number }[] {
  const last = new Map<MarkKind, number>();
  for (const [off, kind] of marks) {
    if (!layers[kind]) continue;
    last.set(kind, off);
  }
  return MARK_ORDER.filter((kind) => last.has(kind)).map((kind) => ({
    kind,
    off: last.get(kind)!,
  }));
}

export function hoverReadoutMarks(
  kinds: readonly MarkKind[],
  ymd: string,
  layers: ChartLayers,
  marks: Record<MarkKind, { emoji: string; label: string }>
): string[] {
  const out: string[] = [];
  for (const kind of kinds) {
    const mark = marks[kind];
    if (!layers[kind] || !mark) continue;
    out.push(`${mark.emoji} ${mark.label}`);
  }
  return out;
}
