/**
 * Layer visibility for the Canary-marks candlestick chart.
 * Event marks default on. Vanna & Charm is the NY options calendar (same dates on every
 * ticker) and defaults off so a chart does not get busier until the member asks.
 */
import { classifyVannaCharmYmd, type VannaCharmStatus } from "./vannaCharm";

export type MarkKind = "fish" | "smile" | "mfi" | "m20" | "sweat" | "skull";

export const MARK_ORDER: readonly MarkKind[] = ["fish", "smile", "mfi", "m20", "sweat", "skull"];

export type ChartLayerId = MarkKind | "vanna";

export const LAYER_IDS: readonly ChartLayerId[] = [...MARK_ORDER, "vanna"];

export type ChartLayers = Record<ChartLayerId, boolean>;

export const DEFAULT_CHART_LAYERS: ChartLayers = {
  fish: true,
  smile: true,
  mfi: true,
  m20: true,
  sweat: true,
  skull: true,
  vanna: false,
};

export const CHART_LAYERS_STORAGE_KEY = "canary.chartLayers.v1";

export const VANNA_PAINT: Record<
  VannaCharmStatus,
  { emoji: string; label: string; shade: string }
> = {
  SUPPORTIVE: {
    emoji: "👑✨",
    label: "Supportive",
    shade: "rgba(16, 185, 129, 0.22)",
  },
  ON_HOLIDAY: {
    emoji: "🪟",
    label: "On holiday",
    shade: "rgba(99, 102, 241, 0.18)",
  },
};

export function vannaMark(status: VannaCharmStatus) {
  return VANNA_PAINT[status];
}

/** Calendar regime for a bar date. The ticker is irrelevant: this is not a per-stock signal. */
export function vannaStatusForYmd(ymd: string): VannaCharmStatus {
  return classifyVannaCharmYmd(ymd).status;
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
  if (layers.vanna) {
    const vanna = vannaMark(vannaStatusForYmd(ymd));
    out.push(`${vanna.emoji} ${vanna.label}`);
  }
  return out;
}
