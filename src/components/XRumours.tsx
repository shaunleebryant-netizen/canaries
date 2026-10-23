"use client";

import { useState, type ReactNode } from "react";
import type { XRumourRow, XRumourStatus } from "@/lib/loadXRumours";
import { TickerLink } from "@/components/TickerChartLightbox";
import { HowItWorksTitle } from "@/components/ScanHowItWorks";

/**
 * X Rumours (owner approved 2026-10-10; flag MEMBERS_X_RUMOURS). Members Stocks tab only: a
 * full-width row directly under Insider Buying. Plain-words lines in our own words, credited to the
 * outlet and linking out; no embedded post text. Latest 10 rows, then "Show more" (+10).
 * Mobile: the table scrolls inside the box so the page never widens.
 */

const PAGE = 10;

function shortDate(iso: string): string {
  const [, m, d] = iso.split("-");
  const mon = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][Number(m) - 1];
  return mon ? `${Number(d)} ${mon}` : iso;
}

const STATUS: Record<XRumourStatus, { dot: string; chip: string; label: string; help: string }> = {
  Reported: {
    dot: "bg-amber-400",
    chip: "bg-amber-500/15 text-amber-300",
    label: "Reported",
    help: "A named outlet says so; not confirmed",
  },
  Confirmed: {
    dot: "bg-emerald-400",
    chip: "bg-emerald-500/15 text-emerald-300",
    label: "Confirmed",
    help: "The company, a filing or the other party said so",
  },
  Denied: {
    dot: "bg-rose-400",
    chip: "bg-rose-500/15 text-rose-300",
    label: "Denied",
    help: "The company itself denied it",
  },
};

function XRumoursBody({ expirySessions }: { expirySessions: number }) {
  return (
    <>
      <p>
        Every night we search X for deal and industry news on the stocks in our universe: takeovers and
        buyouts, activist stakes, big partnerships and supply deals, financing, regulatory and FDA news,
        spin-offs and index changes.
      </p>
      <p>
        A story only shows here if a named outlet reported it (for example Bloomberg, Reuters, WSJ, FT,
        The Information) or the company, an index provider or an SEC filing said it, and at least two
        separate sources carry it. Trader chatter with no source is left out.
      </p>
      <p>
        <b>🟡 Reported</b> a named outlet says so, not confirmed. <b>🟢 Confirmed</b> the company, a filing
        or the other party said so. <b>🔴 Denied</b> the company itself denied it. If someone else
        disputes a story, the status stays and a short grey note under the line says who. Rows drop off after {expirySessions}{" "}
        sessions with no update.
      </p>
      <p>
        &ldquo;Move since&rdquo; is the change from the close before the story first appeared to the latest
        close. It is not a forecast.
      </p>
      <p className="text-xs text-slate-400">
        Rumours aren&apos;t facts. We credit the outlet and link to it; we add no views of our own. Education
        only.
      </p>
    </>
  );
}

function XRumoursTitle({ children, expirySessions }: { children: ReactNode; expirySessions: number }) {
  return (
    <HowItWorksTitle
      heading="How X Rumours works"
      subheading="From X posts and news · education only"
      body={<XRumoursBody expirySessions={expirySessions} />}
    >
      {children}
    </HowItWorksTitle>
  );
}

function Move({ pct }: { pct: number | null | undefined }) {
  if (pct == null || !Number.isFinite(pct)) return <span className="text-slate-500">—</span>;
  const cls = pct > 0 ? "text-emerald-300" : pct < 0 ? "text-rose-300" : "text-slate-300";
  return <span className={`tabular-nums ${cls}`}>{`${pct > 0 ? "+" : ""}${pct.toFixed(1)}%`}</span>;
}

export function XRumours({
  rows,
  asOf,
  expirySessions,
  filtered,
}: {
  rows: XRumourRow[];
  asOf: string | null;
  expirySessions: number;
  filtered: number;
}) {
  const [shown, setShown] = useState(PAGE);
  const visible = rows.slice(0, shown);
  const th = "whitespace-nowrap px-1.5 py-1.5 font-medium";
  const td = "whitespace-nowrap px-1.5 py-1.5 align-top";
  return (
    <article
      id="x-rumours"
      className="flex min-w-0 max-w-full flex-col overflow-hidden rounded-xl border border-amber-500/25 bg-slate-900/60 p-3 shadow-sm ring-1 ring-amber-500/10"
    >
      <div className="flex shrink-0 flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <h3 className="m-0 shrink-0 whitespace-nowrap">
          <XRumoursTitle expirySessions={expirySessions}>X Rumours</XRumoursTitle>
        </h3>
        <p className="text-[10px] uppercase tracking-wide text-slate-500">
          Deals &amp; industry news on our stocks · last {expirySessions} sessions
          {asOf ? ` · to ${shortDate(asOf)}` : ""} · newest first
        </p>
      </div>

      {rows.length === 0 ? (
        <p className="mt-2 text-xs leading-relaxed text-slate-400">
          No sourced deal or industry stories on our stocks in the last {expirySessions} sessions.
        </p>
      ) : (
        <div className="mt-2 max-h-[32rem] min-w-0 overflow-auto rounded-md border border-white/5">
          <table className="min-w-full text-left text-xs">
            <thead className="sticky top-0 z-[1] bg-slate-950/95 text-[10px] uppercase tracking-wide text-slate-500">
              <tr>
                <th className={th}>Ticker</th>
                <th className={th}>Rumour</th>
                <th className={th}>Type</th>
                <th className={th}>Source</th>
                <th className={th}>First seen</th>
                <th className={th}>Status</th>
                <th className={`${th} text-right`} title="From the close before the story first appeared to the latest close">
                  Move since
                </th>
                <th className={th}>Link</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((r) => {
                const st = STATUS[r.status];
                return (
                  <tr key={r.key} className="border-t border-white/5 bg-slate-950/30 hover:bg-slate-900/80">
                    <td className={td}>
                      <span className="inline-flex items-center gap-1.5">
                        <span className={`inline-block h-2 w-2 shrink-0 rounded-full ${st.dot}`} title={st.label} aria-hidden />
                        <TickerLink ticker={r.ticker} />
                      </span>
                    </td>
                    <td className="min-w-[16rem] max-w-[34rem] px-1.5 py-1.5 align-top leading-snug text-slate-200">
                      {r.line}
                      {r.note ? <span className="mt-0.5 block text-[10px] leading-snug text-slate-500">{r.note}</span> : null}
                    </td>
                    <td className={td}>
                      <span className="rounded bg-slate-500/15 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-300">
                        {r.type}
                      </span>
                    </td>
                    <td className="min-w-[6rem] max-w-[10rem] px-1.5 py-1.5 align-top leading-snug text-slate-400">{r.source}</td>
                    <td className={`${td} tabular-nums text-slate-300`}>{shortDate(r.firstSeen)}</td>
                    <td className={td}>
                      <span
                        className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${st.chip}`}
                        title={r.statusNote ? `${st.help}. ${r.statusNote}` : st.help}
                      >
                        {st.label}
                      </span>
                      {r.sec?.url ? (
                        <a
                          href={r.sec.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="ml-1 text-[10px] text-sky-300 underline-offset-2 hover:underline"
                          title={`SEC ${r.sec.form} filed ${r.sec.date}`}
                        >
                          {r.sec.form} ↗
                        </a>
                      ) : null}
                    </td>
                    <td className={`${td} text-right`}>
                      <Move pct={r.movePct} />
                    </td>
                    <td className={td}>
                      <a href={r.link} target="_blank" rel="noopener noreferrer nofollow" className="text-sky-300 underline-offset-2 hover:underline">
                        Open ↗
                      </a>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {rows.length > shown ? (
        <div className="mt-2 flex justify-center">
          <button
            type="button"
            onClick={() => setShown((n) => n + PAGE)}
            className="rounded-lg border border-canary-gold/40 px-3 py-1.5 text-xs font-medium text-canary-gold hover:bg-canary-gold/10"
          >
            Show more ({rows.length - shown})
          </button>
        </div>
      ) : null}

      <div className="mt-2 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 text-[10px] leading-snug text-slate-500">
        <span>
          Rumours aren&apos;t facts. We list what named outlets or the parties said, credit them and link out. No
          views of our own. Education only.
        </span>
        <span>
          🟡 Reported · 🟢 Confirmed · 🔴 Denied{filtered > 0 ? ` · ${filtered} left out tonight (no named source)` : ""}
        </span>
      </div>
    </article>
  );
}
