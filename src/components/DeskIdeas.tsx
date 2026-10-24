"use client";

import type { ReactNode } from "react";
import type { DeskAction, DeskIdeaItem } from "@/lib/loadDeskIdeas";
import { TickerLink } from "@/components/TickerChartLightbox";
import { HowItWorksTitle } from "@/components/ScanHowItWorks";
import { HeldNote } from "@/components/HeldNote";

/** Desk Ideas box (revived 2026-10-09). Members only. Third-party ideas, not Canary signals. */

const CHIP: Record<DeskAction, string> = {
  add: "bg-emerald-500/15 text-emerald-300",
  buy: "bg-emerald-500/15 text-emerald-300",
  long: "bg-emerald-500/15 text-emerald-300",
  trim: "bg-amber-500/15 text-amber-400",
  sell: "bg-red-500/15 text-red-300",
};
const CHIP_LABEL: Record<DeskAction, string> = { add: "Add", buy: "Buy", long: "Long", trim: "Trim", sell: "Sell" };

function shortDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("en-NZ", { timeZone: "Pacific/Auckland", day: "numeric", month: "short" });
  } catch {
    return iso.slice(0, 10);
  }
}

function DeskCalcBody() {
  return (
    <>
      <p>
        Desk Ideas collects recent posts on X where a small set of well-followed investors say they
        bought, added to, trimmed or sold a stock themselves.
      </p>
      <p>
        We only keep clear first-person moves. News, analyst price targets, replies and reposts are
        left out, and we write the short line ourselves rather than copying the post. Tap
        &quot;View&quot; to read the original on X.
      </p>
      <p>
        These are other people&apos;s ideas, not Canary signals, and they are not checked against our
        scans.
      </p>
      <p className="text-xs text-slate-400">Education only, not buy or sell advice.</p>
    </>
  );
}

function DeskCalcTitle({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <HowItWorksTitle
      heading="How Desk Ideas works"
      subheading="Third-party ideas from X · education only"
      body={<DeskCalcBody />}
      className={className}
    >
      {children}
    </HowItWorksTitle>
  );
}

export function DeskIdeas({
  ideas,
  windowDays,
  heldSince,
}: {
  ideas: DeskIdeaItem[];
  windowDays: number;
  heldSince: string | null;
}) {
  return (
    <article
      id="desk-ideas"
      className="flex max-h-[min(400px,52vh)] flex-col overflow-hidden rounded-xl border border-amber-500/25 bg-slate-900/60 p-3 shadow-sm ring-1 ring-amber-500/10"
    >
      <div className="flex shrink-0 items-baseline justify-between gap-2">
        <h3 className="m-0 shrink-0 whitespace-nowrap">
          <DeskCalcTitle>Desk Ideas</DeskCalcTitle>
        </h3>
        <p className="truncate text-[10px] uppercase tracking-wide text-slate-500">
          {heldSince ? <HeldNote since={heldSince} /> : `From X · last ${windowDays} days`}
        </p>
      </div>

      {ideas.length === 0 ? (
        <p className="mt-2 text-xs leading-relaxed text-slate-400">
          No new desk ideas in the last {windowDays} days.
        </p>
      ) : (
        <ul className="mt-2 min-h-0 flex-1 space-y-0.5 overflow-y-auto pr-0.5">
          {ideas.map((i) => (
            <li key={i.id} className="rounded-md border border-white/5 bg-slate-950/40 px-2 py-1 text-xs">
              <div className="flex items-center gap-2">
                {i.inUniverse ? (
                  <TickerLink ticker={i.ticker} />
                ) : (
                  <span className="w-12 shrink-0 font-semibold tracking-wide text-white">{i.ticker}</span>
                )}
                <span
                  className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${CHIP[i.action] ?? CHIP.add}`}
                >
                  {CHIP_LABEL[i.action] ?? "Add"}
                </span>
                <span className="ml-auto shrink-0 tabular-nums text-[10px] text-slate-500">{shortDate(i.postedAt)}</span>
                <a
                  href={i.url}
                  target="_blank"
                  rel="noopener noreferrer nofollow"
                  className="shrink-0 text-[10px] font-medium text-amber-500 hover:text-amber-400"
                  aria-label={`View @${i.handle}'s post about ${i.ticker} on X`}
                >
                  View
                </a>
              </div>
              <p className="mt-0.5 w-0 min-w-full truncate text-[11px] text-slate-400" title={`@${i.handle}: ${i.idea}`}>
                <span className="text-slate-300">@{i.handle}</span> · {i.idea}
              </p>
            </li>
          ))}
        </ul>
      )}
      <p className="mt-1.5 shrink-0 text-[10px] leading-snug text-slate-500">
        Third-party ideas from X, not Canary signals. Education only, not buy or sell advice.
      </p>
    </article>
  );
}
