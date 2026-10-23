"use client";

import type { ReactNode } from "react";
import { HowItWorksTitle } from "@/components/ScanHowItWorks";

export type SignalCalcVariant = "fish" | "sweaty" | "etf-watch" | "etf-country" | "crypto-watch";

const EDU = (
  <p className="text-xs text-slate-400">
    Education only, not buy or sell advice.
  </p>
);

/** Fish box: 🙂 bottoms and 🐟 follow-through. Idea only, no recipe. */
function FishBody() {
  return (
    <>
      <p>
        The Fish box lists stocks that may be finding a floor after a sell-off.
        A <strong className="text-white">🙂 smiley</strong> means the selling
        looks overdone: the kind of washed-out spot where bottoms often form,
        sometimes just as momentum (how fast price is moving) starts to turn
        back up.
      </p>
      <p>
        A <strong className="text-white">🐟 fish</strong> comes a little later.
        It means the bounce after a smiley has held and price is improving, so
        it works as a confirmation rather than a first guess at the bottom.
      </p>
      <p>
        Everything is worked out from daily charts, and a mark only shows when
        a finished day actually qualifies. You might use it as a short list of
        beaten-down names worth a closer look. Tap a ticker to see its chart.
      </p>
      <p className="border-l-2 border-canary-amber/70 pl-3 italic text-amber-100/90">
        &ldquo;While peak optimism is hard to catch, peak pessimism is a lot easier.&rdquo;
      </p>
      {EDU}
    </>
  );
}

/** Sweaty box: 🥵 overheated and 💀 rolling over. */
function SweatyBody() {
  return (
    <>
      <p>
        The Sweaty box is the opposite of Fish. It flags stocks that have run
        up hard and may be getting tired.
      </p>
      <p>
        A <strong className="text-white">🥵 sweaty</strong> mark means the
        stock is still rising but looks stretched, with momentum running hot or
        starting to fade. A <strong className="text-white">💀 skull</strong>{" "}
        can follow later if that strength actually starts to roll over.
      </p>
      <p>
        It uses daily charts and only shows marks from finished days. You might
        use it as a reminder to be careful about chasing these names, or to
        review a winner you already hold.
      </p>
      {EDU}
    </>
  );
}

function EtfWatchBody() {
  return (
    <>
      <p>
        Sector ETFs uses the same daily marks as the Fish and Sweaty boxes, but
        on a hand-picked list of funds. The list covers sectors, the big market
        indexes, precious metals and uranium. No leveraged or inverse funds.
      </p>
      <p>
        <strong className="text-white">🙂 / 🐟</strong> suggest a fund may be
        bottoming and bouncing. <strong className="text-white">🥵 / 💀</strong>{" "}
        suggest it looks stretched or is starting to roll over. A fund only
        shows up when one of these marks has printed recently.
      </p>
      <p>
        It gives a quick view of which parts of the market are washing out and
        which look overheated.
      </p>
      {EDU}
    </>
  );
}

function EtfCountryBody() {
  return (
    <>
      <p>
        Countries uses the same daily marks as the Fish and Sweaty boxes, on a
        hand-picked list of single-country funds, from Japan and the UK to
        India, Brazil and Vietnam. No leveraged or inverse funds.
      </p>
      <p>
        <strong className="text-white">🙂 / 🐟</strong> suggest a market may be
        bottoming and bouncing. <strong className="text-white">🥵 / 💀</strong>{" "}
        suggest it looks stretched or is starting to roll over. A fund only
        shows up when one of these marks has printed recently.
      </p>
      <p>
        It gives a quick view of which countries are washing out and which look
        overheated.
      </p>
      {EDU}
    </>
  );
}

function CryptoWatchBody() {
  return (
    <>
      <p>
        Crypto Watch uses the same daily marks as the Fish and Sweaty boxes, on
        the top coins by market cap (stablecoins left out).
      </p>
      <p>
        <strong className="text-white">🙂 / 🐟</strong> suggest a coin may be
        bottoming and bouncing. <strong className="text-white">🥵 / 💀</strong>{" "}
        suggest it looks stretched or is starting to roll over. A row only
        shows when a mark has printed recently. If price data isn&apos;t
        available for a coin, it is skipped, never guessed.
      </p>
      <p>
        Crypto trades every day, so each finished daily candle counts,
        weekends included. It moves fast, so treat these as a prompt to look at
        the chart rather than a signal on their own.
      </p>
      {EDU}
    </>
  );
}

const VARIANTS: Record<
  SignalCalcVariant,
  { heading: string; subheading: string; body: () => ReactNode }
> = {
  fish: {
    heading: "How Fish works",
    subheading: "Possible bottoms · daily charts · education only",
    body: FishBody,
  },
  sweaty: {
    heading: "How Sweaty works",
    subheading: "Stretched and tiring · daily charts · education only",
    body: SweatyBody,
  },
  "etf-watch": {
    heading: "How Sector ETFs works",
    subheading: "Sector and index funds · daily charts · education only",
    body: EtfWatchBody,
  },
  "etf-country": {
    heading: "How Countries works",
    subheading: "Single-country funds · daily charts · education only",
    body: EtfCountryBody,
  },
  "crypto-watch": {
    heading: "How Crypto Watch works",
    subheading: "Major coins · daily charts · education only",
    body: CryptoWatchBody,
  },
};

/**
 * Clickable section title that opens the plain-English "how it works"
 * lightbox for Fish, Sweaty, Sector ETFs, Countries or Crypto Watch.
 */
export function SignalCalcTitle({
  children,
  className,
  variant = "fish",
}: {
  children: ReactNode;
  className?: string;
  variant?: SignalCalcVariant;
}) {
  const v = VARIANTS[variant];
  const Body = v.body;
  return (
    <HowItWorksTitle
      heading={v.heading}
      subheading={v.subheading}
      body={<Body />}
      className={className}
    >
      {children}
    </HowItWorksTitle>
  );
}
