"use client";

/**
 * Compact universe figures under the ticker lightbox title.
 * Shown for fish-universe companies only. Off-universe charts omit the row.
 * Education only. Not buy or sell advice.
 */
import { GrowthCell } from "@/components/GrowthScore";
import { LIGHTBOX_STAT_LABELS, lightboxFigures, type UniverseLightboxPack } from "@/lib/tickerLightboxStats";

const TONE = {
  up: "text-emerald-300",
  down: "text-rose-300",
  empty: "text-slate-500",
  value: "text-slate-100",
} as const;

export function TickerLightboxStats({
  ticker,
  pack,
}: {
  ticker: string;
  pack?: UniverseLightboxPack | null;
}) {
  if (!pack) return null;
  const t = ticker.trim().toUpperCase();
  if (!pack.companies.includes(t)) return null;
  const { yoy, qoq, analyst } = lightboxFigures(pack.fundamentals[t]);
  return (
    <dl
      className="mt-2 flex flex-wrap items-end gap-x-4 gap-y-1.5"
      aria-label={`${t} universe figures. Education only, not a recommendation.`}
      data-testid="ticker-lightbox-stats"
    >
      <div className="min-w-[4.5rem]">
        <dt className="text-[10px] font-medium uppercase tracking-wide text-slate-500">{LIGHTBOX_STAT_LABELS.score}</dt>
        <dd className="mt-0.5 text-[13px]">
          <GrowthCell ticker={t} row={pack.growth[t]} scored={pack.growthScored} variant="row" barClass="hidden" />
        </dd>
      </div>
      <Stat label={LIGHTBOX_STAT_LABELS.yoy} text={yoy.text} title={yoy.title} tone={yoy.tone} />
      <Stat label={LIGHTBOX_STAT_LABELS.qoq} text={qoq.text} title={qoq.title} tone={qoq.tone} />
      <Stat
        label={LIGHTBOX_STAT_LABELS.target}
        text={analyst.text}
        title={analyst.title}
        tone={analyst.tone === "value" ? "value" : "empty"}
        wide={analyst.text.length > 8}
      />
    </dl>
  );
}

function Stat({
  label,
  text,
  title,
  tone,
  wide = false,
}: {
  label: string;
  text: string;
  title: string;
  tone: keyof typeof TONE;
  wide?: boolean;
}) {
  return (
    <div className={wide ? "max-w-[11rem]" : "min-w-[3.25rem]"}>
      <dt className="text-[10px] font-medium uppercase tracking-wide text-slate-500">{label}</dt>
      <dd className={`mt-0.5 text-[13px] font-semibold tabular-nums leading-none ${TONE[tone]}`} title={title}>
        {text}
      </dd>
    </div>
  );
}
