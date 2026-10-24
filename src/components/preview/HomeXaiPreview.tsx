import Image from "next/image";
import type { ReactNode } from "react";
import { HomeVideo } from "@/components/HomeVideo";

/**
 * PREVIEW ONLY — x.ai-inspired lean homepage (owner 2026-10-06).
 * Rendered at /preview/home. Not linked from nav or sitemap. Do not ship until owner yes.
 * Reuses real site images and the self-hosted HomeVideo. Education only; amber accents; no returns claims.
 */

function Eyebrow({ children }: { children: ReactNode }) {
  return (
    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-canary-gold">
      {children}
    </p>
  );
}

function Section({
  id,
  children,
  className = "",
}: {
  id?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section id={id} className={`border-t border-white/5 ${className}`}>
      <div className="mx-auto max-w-5xl px-4 py-20 md:py-28">{children}</div>
    </section>
  );
}

function Shot({
  src,
  alt,
  w,
  h,
  priority = false,
}: {
  src: string;
  alt: string;
  w: number;
  h: number;
  priority?: boolean;
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-white/10 bg-slate-950 shadow-2xl shadow-black/40">
      <Image
        src={src}
        alt={alt}
        width={w}
        height={h}
        priority={priority}
        sizes="(min-width: 768px) 960px, 100vw"
        className="h-auto w-full"
      />
    </div>
  );
}

export function HomeXaiPreview() {
  return (
    <div className="bg-slate-950 text-slate-100">
      {/* Preview banner — never ship this to / */}
      <div className="border-b border-canary-gold/40 bg-canary-gold/10 px-4 py-2 text-center text-xs font-medium text-canary-amber">
        Preview only · not live · say yes to ship
      </div>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-40"
          style={{
            backgroundImage:
              "radial-gradient(circle at 30% 0%, rgba(234,179,8,0.18), transparent 45%), radial-gradient(circle at 80% 40%, rgba(34,197,94,0.08), transparent 40%)",
          }}
        />
        <div className="relative mx-auto grid max-w-5xl gap-12 px-4 pb-20 pt-16 md:grid-cols-2 md:items-center md:gap-16 md:pb-28 md:pt-24">
          <div>
            <Eyebrow>Favourable Price Condition Alerts</Eyebrow>
            <h1 className="mt-5 text-4xl font-semibold tracking-tight text-white md:text-5xl md:leading-[1.1]">
              Market health at a glance.
            </h1>
            <p className="mt-5 max-w-md text-base leading-relaxed text-slate-400">
              Daily dashboard summarizing real-time market health readings, and provide you a curated list of tickers and sectors in favourable conditions.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <a
                href="/signup"
                className="rounded-xl bg-canary-gold px-5 py-3 text-sm font-semibold text-slate-950 hover:bg-amber-300"
              >
                Start membership
              </a>
              <a
                href="/account/login"
                className="rounded-xl border border-white/20 px-5 py-3 text-sm font-medium text-white hover:bg-white/5"
              >
                Members&apos; Login
              </a>
            </div>
            <p className="mt-4 text-xs font-medium text-canary-amber">
              Launch promo is currently ON
            </p>
          </div>
          <HomeVideo />
        </div>
      </section>

      {/* 1. Composite */}
      <Section id="composite">
        <div className="mx-auto max-w-2xl text-center">
          <Eyebrow>Composite</Eyebrow>
          <h2 className="mt-4 text-3xl font-semibold tracking-tight text-white md:text-4xl">
            Green. Amber. Red.
          </h2>
          <p className="mt-4 text-base text-slate-400">
            Thirteen canaries sum to one traffic light for US market health.
          </p>
          <p className="mt-3 text-sm text-slate-500">
            <a href="/account/login" className="text-canary-gold hover:underline">
              See the live score →
            </a>
          </p>
        </div>
        <div className="mt-12">
          <Shot
            src="/home/dashboard-top.png"
            alt="Members dashboard with traffic light and Decide stack"
            w={1400}
            h={800}
            priority
          />
        </div>
      </Section>

      {/* 2. Scanners */}
      <Section id="scanners" className="bg-slate-900/30">
        <div className="mx-auto max-w-2xl text-center">
          <Eyebrow>Scanners</Eyebrow>
          <h2 className="mt-4 text-3xl font-semibold tracking-tight text-white md:text-4xl">
            Fish, Sweaty, ranked setups.
          </h2>
          <p className="mt-4 text-base text-slate-400">
            Daily lists for washed-out names, stretched ones, and aligned setups.
          </p>
        </div>
        <div className="mt-12 grid gap-4 md:grid-cols-2">
          <Shot
            src="/home/tour/fish-guardant-health.webp"
            alt="Fish marks on a daily chart"
            w={1560}
            h={515}
          />
          <Shot
            src="/home/tour/sweaty-cameco.webp"
            alt="Sweaty marks on a daily chart"
            w={1558}
            h={516}
          />
          <Shot
            src="/home/tour/box-bullish-setups.webp"
            alt="Bullish Setups box from the members dashboard"
            w={854}
            h={760}
          />
          <Shot
            src="/home/tour/box-bearish-setups.webp"
            alt="Bearish Setups box from the members dashboard"
            w={854}
            h={760}
          />
        </div>
      </Section>

      {/* 3. Vanna & Charm — homepage promo priority */}
      <Section id="vanna-charm">
        <div className="grid gap-10 md:grid-cols-2 md:items-center">
          <div>
            <Eyebrow>Risk guidance</Eyebrow>
            <h2 className="mt-4 text-3xl font-semibold tracking-tight text-white md:text-4xl">
              Vanna and Charm Flows.
            </h2>
            <p className="mt-4 max-w-md text-base text-slate-400">
              Where we sit in the options calendar. Context, not a signal. Education only.
            </p>
            {/* owner 2026-10-09: Vanna & Charm indicator on hold; "Get the indicator →" removed */}
          </div>
          <Shot
            src="/home/tour/box-vanna-charm.webp"
            alt="Vanna & Charm Flows card from the members dashboard"
            w={680}
            h={256}
          />
        </div>
      </Section>

      {/* 4. Indicators */}
      <Section id="indicators" className="bg-slate-900/30">
        <div className="mx-auto max-w-2xl text-center">
          <Eyebrow>TradingView</Eyebrow>
          <h2 className="mt-4 text-3xl font-semibold tracking-tight text-white md:text-4xl">
            Indicators for your charts.
          </h2>
          <p className="mt-4 text-base text-slate-400">
            Canary RelRSI (Fish &amp; Sweaty) and MFI Washout, as one bundle: US$99 one-off for both. Free for Canary Dashboard members, and you keep them even if you cancel.
          </p>
          <a
            href="/indicators"
            className="mt-6 inline-block rounded-xl border border-canary-gold/40 px-5 py-2.5 text-sm font-medium text-canary-gold hover:bg-canary-gold/10"
          >
            View indicators →
          </a>
        </div>
        <div className="mt-12 grid gap-4 md:grid-cols-2">
          <Shot
            src="/indicators/fish-sweaty.jpg"
            alt="Time to Fish or Getting Sweaty indicator on TradingView"
            w={1200}
            h={675}
          />
          <Shot
            src="/indicators/mfi-washout.jpg"
            alt="MFI Washout indicator on TradingView"
            w={1200}
            h={606}
          />
        </div>
      </Section>

      {/* 5. Pricing strip */}
      <Section id="join">
        <div className="mx-auto max-w-xl text-center">
          <Eyebrow>First 100 members</Eyebrow>
          <h2 className="mt-4 text-3xl font-semibold tracking-tight text-white md:text-4xl">
            $600/yr. Locked for life.
          </h2>
          <p className="mt-4 text-base text-slate-400">
            Billed annually at $50/mo. After the first 100, $1,069/yr.
          </p>
          <p className="mt-3 text-xs font-medium text-canary-amber">
            Launch promo is currently ON
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <a
              href="/signup"
              className="rounded-xl bg-canary-gold px-6 py-3 text-sm font-semibold text-slate-950 hover:bg-amber-300"
            >
              Start membership
            </a>
            <a
              href="/account/login"
              className="rounded-xl border border-white/20 px-6 py-3 text-sm font-medium text-white hover:bg-white/5"
            >
              Members&apos; Login
            </a>
          </div>
          <p className="mt-6 text-xs text-slate-500">
            Questions?{" "}
            <a href="mailto:shaun@canarydashboard.com" className="text-slate-300 underline">
              shaun@canarydashboard.com
            </a>
          </p>
          <p className="mt-8 text-xs leading-relaxed text-slate-500">
            Education only. Not investment advice. Nothing here is a recommendation to buy or
            sell any security.
          </p>
        </div>
      </Section>
    </div>
  );
}
