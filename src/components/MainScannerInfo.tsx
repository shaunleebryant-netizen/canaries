"use client";

/**
 * Owner t698u 2026-10-14 (PREVIEW): Main Scanner subtitle with two lightboxes —
 * "emojis" (what each mark means, same meanings as the Mark key / CONDITION_META) and
 * "Canary Growth Score" (how the score is built; mirrors scripts/build-fundamentals.mjs GS_W). Education only.
 */
import type { ReactNode } from "react";
import { HowItWorksTitle } from "@/components/ScanHowItWorks";

const LINK = "inline p-0 align-baseline text-canary-amber";

const MARKS: { e: ReactNode; name: string; text: string; tone: "bull" | "bear" }[] = [
  { e: "🐟", name: "Fish", text: "a sold-off stock starting to find its feet.", tone: "bull" },
  { e: "😊", name: "Smiley", text: "selling looks worn out (a washout).", tone: "bull" },
  { e: "💵", name: "MFI washout", text: "selling washed out and money flow turning back up.", tone: "bull" },
  { e: "🟢", name: "Weekly green", text: "the weekly trend has turned or is staying bullish.", tone: "bull" },
  { e: "📈", name: "Monthly trend", text: "the monthly trend has turned up.", tone: "bull" },
  {
    e: <span className="rounded bg-emerald-500/15 px-1 py-px text-[9px] font-semibold uppercase tracking-wide text-emerald-300">IBD</span>,
    name: "IBD Setups",
    text: "the stock is also in our IBD-style setups box.",
    tone: "bull",
  },
  { e: "🥵", name: "Sweaty", text: "a hard run that may be getting tired.", tone: "bear" },
  { e: "💀", name: "Skull", text: "a topping mark after a sweaty stretch.", tone: "bear" },
  { e: "🔴", name: "Weekly red", text: "the weekly trend has turned or is staying bearish.", tone: "bear" },
];

function EmojiBody() {
  const group = (tone: "bull" | "bear") => (
    <ul className="space-y-1.5">
      {MARKS.filter((m) => m.tone === tone).map((m) => (
        <li key={m.name} className="flex items-start gap-2">
          <span className="w-6 shrink-0 text-center" aria-hidden>{m.e}</span>
          <span><strong className="text-white">{m.name}</strong>: {m.text}</span>
        </li>
      ))}
    </ul>
  );
  return (
    <>
      <p>
        Each emoji is one of our own indicators. Our sub scanners check every stock in our list each night, and
        when an indicator fires, its emoji is added to that stock in the Main Scanner. More emojis means more of
        our indicators agree at the same time.
      </p>
      <p className="text-[11px] font-semibold uppercase tracking-wider text-emerald-300/90">Bullish marks</p>
      {group("bull")}
      <p className="text-[11px] font-semibold uppercase tracking-wider text-rose-300/90">Bearish marks</p>
      {group("bear")}
      <p>Hover over a row's emojis to see each mark and how long it has been there.</p>
      <p className="text-xs text-slate-400">Education only, not buy or sell advice.</p>
    </>
  );
}

function GrowthBody() {
  const parts: [string, string, string][] = [
    ["Revenue growth", "40%", "Sales over the last 12 months vs the 12 months before, blended with the latest quarter vs the same quarter a year ago (70% / 30%)."],
    ["Gross-margin trend", "20%", "Is the company keeping more of each sales dollar than a year ago? Measured in percentage points."],
    ["EV/Sales vs peers", "20%", "Company value compared with its sales, then compared with similar companies in the same industry. Cheaper than peers scores higher."],
    ["Cash runway", "10%", "How many months the cash on hand would last at the current cash burn. Companies already generating cash get full marks."],
    ["Path to profit", "10%", "Half for today's operating margin, half for whether that margin is improving vs a year ago."],
  ];
  return (
    <>
      <p>
        The Canary Growth Score is a 0–100 rating of a company's business growth, built from its official SEC
        filings. It does not look at the share price chart.
      </p>
      <p>Each stock is scored on five parts. Each part is ranked against every other stock in our list (0 = lowest, 100 = highest), then the parts are blended with these weights:</p>
      <ul className="space-y-1.5">
        {parts.map(([n, w, t]) => (
          <li key={n} className="border-t border-white/5 pt-1.5">
            <strong className="text-white">{n}</strong> <span className="text-amber-200">{w}</span>
            <span className="block text-slate-300">{t}</span>
          </li>
        ))}
      </ul>
      <p>
        If a part isn't available in the filings, its weight is shared across the others. If less than 60% of the
        weight is available, the score is shown in grey and not ranked. A red <strong className="text-rose-300">!</strong> marks
        Danger: heavy cash burn together with a weakening business (shrinking margins or slowing sales).
      </p>
      <p>Tap any score in the table to see that stock's breakdown. The score is updated with each nightly update.</p>
      <p className="text-xs text-slate-400">Education only, not buy or sell advice.</p>
    </>
  );
}

export function MainScannerSubtitle() {
  return (
    <>
      Tickers picked up by our sub scanners, ranked by number of{" "}
      <HowItWorksTitle heading="What the emojis mean" subheading="Our indicators · education only" body={<EmojiBody />} className={LINK}>
        emojis
      </HowItWorksTitle>{" "}
      or our{" "}
      <HowItWorksTitle heading="How the Canary Growth Score works" subheading="SEC filings · 0–100 · education only" body={<GrowthBody />} className={LINK}>
        Canary Growth Score
      </HowItWorksTitle>
      .
    </>
  );
}
