import Image from "next/image";
import type { ReactNode } from "react";
import aboutExamples from "../../data/about-examples.json";
import {
  HOME_BULLISH_STRONG_TOUR,
  HOME_ETF_CRYPTO_TOUR,
  HOME_MFI_TOUR,
  HOME_SETUPS_TOUR,
} from "@/lib/featureFlags";

/**
 * (2026-09-28, shipped): homepage tour of the members' Sub Scanners.
 * Only rendered when HOME_SCANNER_TOUR is on (src/lib/featureFlags.ts, default ON).
 * Copy rules (owner locks): idea and rough "how" only; never exact filters, thresholds,
 * time periods, weights or formulas; no performance claims; "amber", never "yellow".
 * Box images: cropped captures of the live members boxes (theme R), in public/home/tour/.
 */

type Shot = { src: string; alt: string; w: number; h: number; caption?: string; bullish?: boolean };

/* Owner 2026-10-10: the two bullish Fish slots (were Guardant Health / AbbVie TradingView shots) now use
   the About page before/after charts (scripts/build-about-charts.mjs → public/about/, captions from
   data/about-examples.json, real marks from our signal history). Sweaty slots stay: we keep no
   Sweaty/skull history to build an equally honest bearish chart from. */
type AboutEx = {
  ticker: string;
  name: string;
  sameDay: string[];
  markDate: string;
  priceAtMark: number;
  lastDate: string;
  lastClose: number;
  pctNow: number;
  sessionsNow: number;
  image: string;
};
const EXAMPLES = (aboutExamples as unknown as { examples: AboutEx[] }).examples;
const MARK_LABEL: Record<string, string> = { fish: "🐟 Fish", smile: "🙂 Smiley", mfi: "💵 MFI Washout" };
function niceDate(iso: string): string {
  const [y, m, d] = iso.split("-");
  return `${Number(d)} ${["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][Number(m) - 1]} ${y}`;
}
function exampleShot(ticker: string): Shot | null {
  const e = EXAMPLES.find((x) => x.ticker === ticker);
  if (!e) return null;
  const marks = e.sameDay.map((k) => MARK_LABEL[k] ?? k).join(" + ");
  const move = `${e.pctNow >= 0 ? "+" : ""}${e.pctNow.toFixed(1)}%`;
  const price = (n: number) => `$${n.toFixed(2)}`;
  return {
    src: e.image,
    alt: `${e.name} (${e.ticker}) daily chart: ${marks.replace(/[^\w +]/gu, "").trim()} on ${niceDate(e.markDate)} at ${price(e.priceAtMark)}, then ${move} to ${price(e.lastClose)} by ${niceDate(e.lastDate)}`,
    w: 1920,
    h: 1080,
    caption: `${e.name} (${e.ticker}) · ${marks} ${niceDate(e.markDate)} at ${price(e.priceAtMark)} · ${move} to ${price(e.lastClose)} in ${e.sessionsNow} sessions (${niceDate(e.lastDate)})`,
    bullish: true,
  };
}

const FISH_CHARTS: Shot[] = [
  ...(["NU", "SMTC"].map(exampleShot).filter(Boolean) as Shot[]),
  {
    src: "/home/tour/sweaty-cameco.webp",
    alt: "Cameco daily chart with Sweaty, skull, smiley and Fish marks",
    w: 1558,
    h: 516,
    caption: "Cameco · daily · Sweaty example",
  },
  {
    src: "/home/tour/sweaty-10x-genomics.webp",
    alt: "10x Genomics daily chart with Sweaty, skull and Fish marks",
    w: 1559,
    h: 514,
    caption: "10x Genomics · daily · Sweaty example",
  },
];

function Eyebrow({ children }: { children: ReactNode }) {
  return (
    <p className="text-xs font-semibold uppercase tracking-widest text-canary-gold">
      {children}
    </p>
  );
}

function Title({ children }: { children: ReactNode }) {
  return <h2 className="mt-2 text-2xl font-semibold text-white">{children}</h2>;
}

function Body({ children }: { children: ReactNode }) {
  return (
    <div className="mt-3 space-y-3 text-sm leading-relaxed text-slate-400">{children}</div>
  );
}

function BoxShot({ shot, className = "" }: { shot: Shot; className?: string }) {
  return (
    <figure className={className}>
      <div className="overflow-hidden rounded-2xl border border-white/10 bg-slate-950 shadow-lg">
        <Image
          src={shot.src}
          alt={shot.alt}
          width={shot.w}
          height={shot.h}
          sizes="(min-width: 768px) 460px, 100vw"
          className="h-auto w-full"
        />
      </div>
      {shot.caption ? (
        <figcaption className="mt-2 text-xs text-slate-500">{shot.caption}</figcaption>
      ) : null}
    </figure>
  );
}

/** Owner 2026-10-05: small link to the indicator's card on /indicators (same style as the
 * cockpit outline button). Education only; no returns claims. */
function IndicatorLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a
      href={href}
      className="mt-2 inline-block rounded-xl border border-canary-gold/40 px-4 py-2 text-sm font-medium text-canary-gold hover:bg-canary-gold/10"
    >
      {children}
    </a>
  );
}

/** Text on one side, box screenshot(s) on the other; stacks on mobile. */
function Split({
  id,
  tinted,
  eyebrow,
  title,
  children,
  shots,
}: {
  id: string;
  tinted?: boolean;
  eyebrow: string;
  title: string;
  children: ReactNode;
  shots: Shot[];
}) {
  const pair = shots.length > 1;
  return (
    <section
      id={id}
      className={`border-t border-white/5 ${tinted ? "bg-slate-900/40" : ""}`}
    >
      <div
        className={
          pair
            ? "mx-auto max-w-5xl px-4 py-14"
            : "mx-auto grid max-w-5xl gap-8 px-4 py-14 md:grid-cols-2 md:items-center"
        }
      >
        <div className={pair ? "max-w-2xl" : ""}>
          <Eyebrow>{eyebrow}</Eyebrow>
          <Title>{title}</Title>
          <Body>{children}</Body>
        </div>
        {pair ? (
          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            {shots.map((s) => (
              <BoxShot key={s.src} shot={s} />
            ))}
          </div>
        ) : (
          <BoxShot shot={shots[0]} className="mx-auto w-full max-w-sm" />
        )}
      </div>
    </section>
  );
}

/** HOME_V3: 3 charts only (10x Genomics dropped). Sweaty captions "<Company>, daily"; the bullish
 *  before/after examples keep their mark date, price and move. */
const FISH_CHARTS_V3: Shot[] = FISH_CHARTS.filter((s) => !s.src.includes("10x-genomics")).map((s) =>
  s.bullish ? s : { ...s, caption: `${s.caption?.split(" · ")[0]}, daily` },
);

/** Owner 2026-10-10: under the hand-picked examples, link to the full hit-rate record on /about. */
function ExamplesNote() {
  return (
    <p className="mt-3 text-xs text-slate-500">
      Hand-picked examples · not typical ·{" "}
      <a href="/about#record" className="text-canary-gold underline-offset-2 hover:underline">
        see the full record
      </a>
      . Education only.
    </p>
  );
}

export function HomeScannerTour({ v3 = false }: { v3?: boolean } = {}) {
  const charts = v3 ? FISH_CHARTS_V3 : FISH_CHARTS;
  // Band tint alternates over the sections actually shown (intro "scanners" band is tinted),
  // so hiding sections behind flags never leaves two same-tone bands touching.
  const shown = [
    "scanners",
    ...(v3 ? ["vanna"] : []),
    ...(HOME_MFI_TOUR ? ["mfi"] : []),
    ...(!v3 ? ["ibd"] : []),
    ...(HOME_BULLISH_STRONG_TOUR ? ["bullish-strong"] : []),
    ...(HOME_SETUPS_TOUR ? ["setups"] : []),
    ...(HOME_ETF_CRYPTO_TOUR ? ["etf-crypto"] : []),
    "canaries",
  ];
  const tint = (key: string) => shown.indexOf(key) % 2 === 0;
  return (
    <>
      {/* a. Intro note + Fish / Sweaty */}
      <section id="scanners" className="border-t border-white/5 bg-slate-900/40">
        <div className="mx-auto max-w-5xl px-4 py-14">
          {v3 ? null /* owner 2026-09-28 10:39 PM NZ: amber note removed; the footer disclaimer covers it */ : (
            <div className="rounded-xl border border-white/10 bg-slate-950/60 px-4 py-3 text-xs leading-relaxed text-slate-400 sm:text-sm">
              <span className="font-semibold text-slate-200">
                Not financial advice. Education only.
              </span>{" "}
              Everything in the scanners is algorithm-based: the lists are built from market
              data and ranked automatically. Nobody hand-picks the names.
            </div>
          )}

          <div className={v3 ? "" : "mt-10"}>
            <Eyebrow>Inside the scanners</Eyebrow>
            <Title>
              {v3 ? "Time to Fish 🙂🐟, or getting Sweaty 🥵💀?" : "Time to Fish, or getting Sweaty?"}
            </Title>
            <div className="mt-3 grid gap-4 text-sm leading-relaxed text-slate-400 md:grid-cols-2 md:gap-8">
              <div className="space-y-3">
                <p>
                  Stocks overshoot in both directions. A 🙂 smiley is the early hint, and a 🐟 fish follows when that bounce holds and
                  price keeps improving.
                </p>
              </div>
              <div className="space-y-3">
                <p>
                  <span className="text-white">Sweaty</span> is the opposite. 🥵 means a stock is still
                  rising but looks stretched, and 💀 can follow later if that strength starts to
                  roll over. Both work from daily charts, and a mark only appears once the
                  trading day has finished.
                </p>
              </div>
            </div>
            {/* Owner 2026-10-16 (PREVIEW): pull quote under the Fish / Sweaty copy. */}
            <blockquote className="mt-6 border-l-2 border-canary-amber/70 pl-4 text-base italic leading-relaxed text-amber-100/90 sm:text-lg">
              &ldquo;While peak optimism is hard to catch, peak pessimism is a lot easier.&rdquo;
            </blockquote>
            <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2">
              <IndicatorLink href="/indicators#fish-sweaty">
                Get the indicator →
              </IndicatorLink>
              <span className="mt-2 text-xs text-slate-500">
                The Time to Fish or Getting Sweaty indicator for TradingView.
              </span>
            </div>
          </div>

          <div className={v3 ? "mt-8 grid gap-8 md:grid-cols-2" : "mt-8 grid gap-4 sm:grid-cols-2"}>
            {charts.map((s) => (
              <figure key={s.src} className={v3 && !s.bullish ? "md:col-span-2" : ""}>
                <div className="overflow-hidden rounded-2xl border border-white/10 bg-slate-950 shadow-lg">
                  <Image
                    src={s.src}
                    alt={s.alt}
                    width={s.w}
                    height={s.h}
                    sizes={
                      v3 && !s.bullish ? "(min-width: 1024px) 992px, 100vw" : "(min-width: 1024px) 488px, (min-width: 640px) 50vw, 100vw"
                    }
                    className="h-auto w-full"
                  />
                </div>
                <figcaption className={v3 ? "mt-2 text-sm text-slate-400" : "mt-2 text-xs text-slate-500"}>
                  {s.caption}
                </figcaption>
                {s.bullish && s.src === charts.filter((c) => c.bullish).at(-1)?.src ? <ExamplesNote /> : null}
              </figure>
            ))}
          </div>
        </div>
      </section>

      {/* b. HOME_V3: Vanna and Charm Flows preview (Decide card, not a Sub Scanner) */}
      {v3 ? (
        <Split
          id="scanner-vanna-charm"
          eyebrow="Risk Guidance card"
          title="Vanna and Charm Flows"
          shots={[
            {
              src: "/home/tour/box-vanna-charm.webp",
              alt: "Vanna & Charm Flows card from the members dashboard",
              w: 680,
              h: 254,
            },
          ]}
        >
          {/* Owner 2026-10-11: cautious wording, no directional claims (own S&P 500 check showed the
              calendar windows don't reliably predict direction). */}
          <p>
            Options dealers hedge the options they&apos;ve sold, and those hedging flows follow the
            options calendar: they tend to build through the middle of the month and fade around
            monthly expiry. This card shows which part of that calendar we&apos;re in, worked out
            from the calendar rather than prices.
          </p>
          <p className="text-slate-300">
            Use it as context, not a buy or sell signal. Flows are one input among many; they
            don&apos;t reliably predict direction on their own. Education only.
          </p>
          {/* owner 2026-10-09: indicator on hold; owner 2026-10-10: CTA restored as before (own listing, not in the bundle) */}
          <p className="text-xs text-slate-500">Also available as a TradingView indicator.</p>
          <IndicatorLink href="/indicators#vanna-charm">Get the indicator →</IndicatorLink>
        </Split>
      ) : null}

      {/* c. MFI (Sub Scanners order, owner 2026-09-29: Fish, Sweaty, MFI / IBD, Weekly State, Bullish & Strong).
          Hidden owner 2026-10-05 behind HOME_MFI_TOUR (default OFF). */}
      {HOME_MFI_TOUR ? (
      <Split
        id="scanner-mfi"
        tinted={tint("mfi")}
        eyebrow="Sub Scanner"
        title="Money Flow Index Scan"
        shots={[
          {
            src: "/home/tour/box-money-flow-alerts.webp",
            alt: "MFI Scan box from the members dashboard",
            w: 564,
            h: 640,
          },
        ]}
      >
        <p>
          The Money Flow Index is a well-known gauge that blends price and trading volume to
          show whether money has been flowing into or out of a stock. This scan flags stocks
          where the selling looks washed out and money flow is turning back up.
        </p>
        <p>
          💵 <span className="text-white">Washout:</span> the MFI has been oversold, has just
          hooked back up, and heavy volume has been followed by quieter trading.
        </p>
        <p>
          It&apos;s worked out from daily charts, and each washout fires once. The number beside
          each ticker is its MFI reading that day. It works best alongside the other boxes.
        </p>
        <div className="mt-2">
          <IndicatorLink href="/indicators#mfi-washout">Get the indicator →</IndicatorLink>
        </div>
      </Split>
      ) : null}

      {/* c2. IBD, after MFI to mirror the dashboard (only when HOME_V3 is off; v3 shows Vanna above) */}
      {!v3 ? (
        <Split
          id="scanner-ibd"
          tinted={tint("ibd")}
          eyebrow="Sub Scanner"
          title="Investor's Business Daily Style Setups"
          shots={[
            {
              src: "/home/tour/box-ibd-setups.webp",
              alt: "IBD Setups box from the members dashboard",
              w: 558,
              h: 640,
            },
          ]}
        >
          <p>
            Inspired by the growth-stock style made popular by Investor&apos;s Business Daily
            (IBD), this box lists stocks that are already in healthy, established uptrends and
            are among the market&apos;s strongest performers.
          </p>
          <p>
            Each day it checks that a stock&apos;s trend is pointing up, that it&apos;s trading
            nearer its highs than its lows, and that it has been doing better than the wider
            market. The RS number is our own relative-strength score, and the strongest names
            sit at the top. It isn&apos;t the official IBD rating.
          </p>
        </Split>
      ) : null}

      {/* d. Bullish & Strong — hidden on the homepage (owner t568u 2026-10-07; HOME_BULLISH_STRONG_TOUR) */}
      {HOME_BULLISH_STRONG_TOUR ? (
      <Split
        id="scanner-bullish-strong"
        tinted={tint("bullish-strong")}
        eyebrow="Sub Scanner"
        title="Bullish and Strong Stocks"
        shots={[
          {
            src: "/home/tour/box-bullish-strong.webp",
            alt: "Multi-week Warriors box from the members dashboard",
            w: 558,
            h: 640,
          },
        ]}
      >
        <p>
          This box lists stocks whose weekly trend is staying green. Green means the shorter
          and longer weekly trends all point up.
        </p>
        <p>
          The number beside each ticker is how many weeks in a row it has been green, and the
          longest green runs sit at the top. 🟢🟢🟢 marks names that have stayed green for a
          good while. When a stock&apos;s week turns red or grey, it drops off.
        </p>
      </Split>
      ) : null}

      {/* e. Bullish / Bearish Setups — hidden on the homepage (owner t568u 2026-10-07; HOME_SETUPS_TOUR) */}
      {HOME_SETUPS_TOUR ? (
      <Split
        id="scanner-setups"
        tinted={tint("setups")}
        eyebrow="Main Scanner"
        title="Bullish and Bearish Setups"
        shots={[
          {
            src: "/home/tour/box-bullish-setups.webp",
            alt: "Bullish Setups box from the members dashboard",
            w: 870,
            h: 760,
          },
          {
            src: "/home/tour/box-bearish-setups.webp",
            alt: "Bearish Setups box from the members dashboard",
            w: 876,
            h: 760,
          },
        ]}
      >
        <p>
          These two boxes bring the Sub Scanners together. A ticker only shows up when it meets
          several conditions across them, such as a fresh Fish or MFI washout signal lining up
          with a healthy weekly trend, or on the bearish side, a Sweaty or skull signal
          lining up with a weakening trend.
        </p>
        <p>
          Tickers are ranked by how many conditions they meet, most first. It&apos;s all
          number-based and re-ranked automatically every day.
        </p>
        {/* Owner 2026-10-06 6:11 PM NZ: "Ticker Universe" lives in the members dashboard only. */}
      </Split>
      ) : null}

      {/* f. ETF + Crypto — hidden on the homepage (owner t568u 2026-10-07; HOME_ETF_CRYPTO_TOUR) */}
      {HOME_ETF_CRYPTO_TOUR ? (
      <Split
        id="scanner-etf-crypto"
        tinted={tint("etf-crypto")}
        eyebrow="Sub Scanners"
        title="Sector ETF, Country and Crypto Scanners"
        shots={[
          {
            src: "/home/tour/box-etf-watch.webp",
            alt: "Sector ETFs box from the members dashboard",
            w: 870,
            h: 640,
          },
          {
            src: "/home/tour/box-crypto-watch.webp",
            alt: "Crypto Watch box from the members dashboard",
            w: 870,
            h: 640,
          },
        ]}
      >
        <p>
          The Sector ETFs and Crypto boxes use the same Fish and Sweaty marks, on
          hand-picked lists of sector and index funds, metals and uranium, and the major coins. No leveraged or inverse funds.
        </p>
        <p>
          At a glance you can see which parts of the market are washing out and which look
          overheated, which helps you pick the sectors worth focusing on for the week.
        </p>
      </Split>
      ) : null}

      {/* g. Canary readings */}
      <section
        id="scanner-canaries"
        className={`border-t border-white/5 ${tint("canaries") ? "bg-slate-900/40" : ""}`}
      >
        <div className="mx-auto grid max-w-5xl gap-8 px-4 py-14 md:grid-cols-2 md:items-center">
          <div>
            <Eyebrow>Behind the traffic light</Eyebrow>
            <Title>The canary readings</Title>
            <Body>
              <p>
                Each canary is an early-warning reading on a different corner of the market,
                from banks and bonds to how many stocks are rising. Every one shows as Healthy,
                Neutral or Warning, with a small chart of the last couple of weeks.
              </p>
              <p>
                Each canary feeds the composite score with its own weighting.
              </p>
            </Body>
          </div>
          <BoxShot
            className="mx-auto w-full max-w-md"
            shot={{
              src: "/home/tour/box-canary-readings.webp",
              alt: "Canary readings table from the members dashboard, showing each canary's recent chart, name and signal",
              w: 1274,
              h: 1386,
              caption: "Interface preview. Readings and calculations are for members.",
            }}
          />
        </div>
      </section>
    </>
  );
}
