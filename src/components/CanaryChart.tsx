"use client";

/**
 * Canary history line chart (owner PREVIEW 2026-10-09; flag MEMBERS_CANARY_CHARTS, default OFF).
 * Own chunk: loaded only when a canary chart pop-up opens. TradingView Lightweight Charts™
 * (attribution logo kept on the chart, as the licence asks). Education only.
 */
import { useEffect, useRef } from "react";

export type CanaryChartDoc = {
  v: number;
  id: string;
  asOf: string;
  unit: string;
  refLabel: string | null;
  consts: { v: number; label: string }[];
  refNote: string | null;
  /** What the white line is (footer caption); null on files built before 2026-10-10. */
  lineLabel?: string | null;
  d: string[];
  y: number[];
  r: (number | null)[] | null;
  s: (number | null)[];
  /** Optional switchable lines on the same dates (e.g. Banks: KRE / XLF, each with its own 20-day average). */
  views?: CanaryChartView[];
};

export type CanaryChartView = { key: string; lineLabel: string; y: number[]; r: (number | null)[] };

const ZONE = { 1: "rgba(52,211,153,0.10)", 0: "rgba(148,163,184,0.06)", [-1]: "rgba(248,113,113,0.12)" } as Record<number, string>;
const fmt = (x: number) => (Math.abs(x) >= 1000 ? x.toFixed(0) : Math.abs(x) >= 10 ? x.toFixed(2) : x.toFixed(4));

export default function CanaryChart({ doc, view = 0 }: { doc: CanaryChartDoc; view?: number }) {
  const hostRef = useRef<HTMLDivElement>(null);
  const tipRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    let disposed = false;
    let cleanup = () => {};
    const v = doc.views?.[view];
    const values = v ? v.y : doc.y;
    const refs = v ? v.r : doc.r;
    void import("lightweight-charts").then((lc) => {
      if (disposed || !hostRef.current) return;
      const chart = lc.createChart(host, {
        autoSize: true,
        layout: { background: { type: lc.ColorType.Solid, color: "transparent" }, textColor: "#94a3b8", fontSize: 11, attributionLogo: true },
        grid: { vertLines: { color: "rgba(148,163,184,0.06)" }, horzLines: { color: "rgba(148,163,184,0.06)" } },
        rightPriceScale: { borderColor: "rgba(148,163,184,0.18)", scaleMargins: { top: 0.12, bottom: 0.08 } },
        timeScale: { borderColor: "rgba(148,163,184,0.18)", rightOffset: 2 },
        crosshair: { mode: lc.CrosshairMode.Normal },
      });
      // Signal zones: full-height bars on their own hidden scale, coloured by that day's signal.
      const zones = chart.addSeries(lc.HistogramSeries, { priceScaleId: "zones", lastValueVisible: false, priceLineVisible: false, base: 0 });
      zones.priceScale().applyOptions({ scaleMargins: { top: 0, bottom: 0 }, visible: false });
      zones.setData(doc.d.map((t, i) => ({ time: t, value: 1, color: ZONE[doc.s[i] ?? 0] ?? ZONE[0] })));
      const line = chart.addSeries(lc.LineSeries, { color: "#e2e8f0", lineWidth: 2, priceLineColor: "rgba(245,158,11,0.6)", priceFormat: { type: "custom", formatter: fmt } });
      line.setData(doc.d.map((t, i) => ({ time: t, value: values[i] })));
      if (refs) {
        const ref = chart.addSeries(lc.LineSeries, { color: "rgba(245,158,11,0.85)", lineWidth: 1, lineStyle: lc.LineStyle.Dashed, lastValueVisible: false, priceLineVisible: false });
        ref.setData(doc.d.flatMap((t, i) => (refs[i] == null ? [] : [{ time: t, value: refs[i] as number }])));
      }
      for (const c of doc.consts) {
        line.createPriceLine({ price: c.v, color: "rgba(245,158,11,0.75)", lineWidth: 1, lineStyle: lc.LineStyle.Dashed, axisLabelVisible: true, title: c.label });
      }
      const n = doc.d.length;
      chart.timeScale().setVisibleLogicalRange({ from: Math.max(0, n - (host.clientWidth < 520 ? 66 : 128)), to: n + 1 });
      const word = (s: number | null) => (s == null ? "" : s > 0 ? "Healthy" : s < 0 ? "Warning" : "Neutral");
      const idx = new Map(doc.d.map((t, i) => [t, i]));
      const show = (t: string | null) => {
        const tip = tipRef.current;
        if (!tip) return;
        const i = t != null ? idx.get(t) : n - 1;
        if (i == null) return;
        tip.textContent = `${doc.d[i]}  ${v ? `${v.key} ` : ""}${fmt(values[i])}${refs && refs[i] != null ? `  avg ${fmt(refs[i] as number)}` : ""}  ·  ${word(doc.s[i])}`;
      };
      show(null);
      chart.subscribeCrosshairMove((p) => show(p.time != null ? String(p.time) : null));
      cleanup = () => chart.remove();
    });
    return () => {
      disposed = true;
      cleanup();
    };
  }, [doc, view]);
  return (
    <div className="absolute inset-0">
      <div ref={tipRef} className="pointer-events-none absolute left-2 top-1.5 z-10 max-w-[calc(100%-4.5rem)] truncate rounded bg-slate-950/70 px-1.5 py-0.5 font-mono text-[10px] text-slate-300 sm:text-[11px]" />
      <div ref={hostRef} className="absolute inset-0" />
    </div>
  );
}
