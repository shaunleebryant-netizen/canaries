"use client";

/**
 * PRIVATE owner Options Scanner (/owner only — Cloudflare Access + JWT gated).
 * Main view: three filter stacks (Aggressive directional · Swing positioning · Repeat flow).
 * Secondary (collapsed): call/put leans + IV spikes.
 * Rendered from props passed by the owner server page; it never fetches or imports data itself.
 * Cboe delayed data is personal, non-commercial use only — never use on member/public pages.
 */
import { useCallback, useEffect, useId, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import type { OptionsScan, OptionsStackConfig, RepeatRow, StackRow } from "@/lib/owner/optionsScan";
import { DEFAULT_STACK_CONFIG } from "@/components/owner/thresholds";
import { TickerLink } from "@/components/TickerChartLightbox";
import { HeldNote } from "@/components/HeldNote";

const money = (n: number) => (n >= 1e9 ? `$${(n / 1e9).toFixed(2)}B` : n >= 1e6 ? `$${(n / 1e6).toFixed(1)}M` : `$${Math.round(n / 1e3)}k`);
const md = (e: string) => `${e.slice(5, 7)}/${e.slice(8, 10)}`;
const num = (n: number) => n.toLocaleString("en-US");
const signed = (n: number) => `${n >= 0 ? "+" : "−"}${num(Math.abs(n))}`;

/* ---------- lightbox ---------- */
function InfoDialog({ label, title, subtitle, children }: { label: ReactNode; title: string; subtitle?: string; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const titleId = useId();
  const closeRef = useRef<HTMLButtonElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const onClose = useCallback(() => {
    setOpen(false);
    queueMicrotask(() => triggerRef.current?.focus());
  }, []);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    queueMicrotask(() => closeRef.current?.focus());
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);
  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        aria-expanded={open}
        className="cursor-pointer whitespace-nowrap border-b border-dotted border-canary-gold/70 text-left text-sm font-medium text-white hover:border-canary-gold hover:text-canary-gold focus:outline-none focus-visible:ring-2 focus-visible:ring-canary-gold/60"
        title={title}
      >
        {label}
        <span className="ml-1 text-[10px] font-normal text-canary-gold/80" aria-hidden>
          ?
        </span>
      </button>
      {open
        ? createPortal(
            <div className="fixed inset-0 z-50 flex items-end justify-center p-3 sm:items-center sm:p-6" role="presentation">
              <button type="button" aria-label="Close dialog" className="absolute inset-0 bg-black/70 backdrop-blur-[2px]" onClick={onClose} />
              <div
                role="dialog"
                aria-modal="true"
                aria-labelledby={titleId}
                className="relative z-10 flex max-h-[min(90vh,760px)] w-full max-w-lg flex-col overflow-hidden whitespace-normal rounded-2xl border border-white/15 bg-slate-950 text-left font-normal shadow-2xl ring-1 ring-canary-gold/20"
              >
                <div className="flex shrink-0 items-start justify-between gap-3 border-b border-white/10 px-5 py-4">
                  <div>
                    <h2 id={titleId} className="text-lg font-semibold text-white">
                      {title}
                    </h2>
                    {subtitle ? <p className="mt-0.5 text-xs text-slate-500">{subtitle}</p> : null}
                  </div>
                  <button ref={closeRef} type="button" onClick={onClose} className="rounded-lg border border-white/15 px-2.5 py-1 text-sm text-slate-300 hover:bg-white/5 hover:text-white">
                    Close
                  </button>
                </div>
                <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-5 py-4 text-sm leading-relaxed text-slate-300">{children}</div>
              </div>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}

function ProxyNotes({ c }: { c: OptionsStackConfig }) {
  return (
    <>
      <p className="font-semibold text-white">What the free data can and can&apos;t show</p>
      <p>
        The source is Cboe&apos;s free delayed end-of-day chain: each contract&apos;s day volume, start-of-day open interest (OI), closing
        bid/ask, last trade price and implied volatility. It has <strong className="text-white">no individual prints, no sweep or block
        tags and no trade side</strong>, so these stacks use proxies:
      </p>
      <ul className="list-disc space-y-1.5 pl-5">
        <li>
          <strong className="text-white">At/above ask</strong> (a &quot;bought&quot; proxy): the day&apos;s last print is in the top{" "}
          {Math.round((1 - c.proxies.AT_ASK_SPREAD_FRACTION) * 50)}% of the closing bid/ask spread (last ≥ mid + {c.proxies.AT_ASK_SPREAD_FRACTION} × (ask − mid)),
          it traded on that session, and bid and ask are both above zero. It describes one print against the closing quote, not the whole
          day&apos;s volume. &quot;At/below bid&quot; is the mirror.
        </li>
        <li>
          <strong className="text-white">Opening confirmed</strong>: the next session&apos;s OI minus this session&apos;s start-of-day OI is at
          least {Math.round(c.proxies.OPEN_CONFIRM_SHARE * 100)}% of the flagged volume. &quot;Unconfirmed&quot; means the next session&apos;s OI
          isn&apos;t in yet; &quot;not confirmed&quot; means it came in short.
        </li>
        <li>
          <strong className="text-white">Est. premium</strong> = volume × mid × 100, where mid is the closing bid/ask midpoint.
        </li>
      </ul>
      <p className="text-xs text-slate-400">Private, personal use only. Options data: Cboe delayed. Not buy/sell advice.</p>
    </>
  );
}

/* ---------- badges + rows ---------- */
function Badge({ tone, children, title }: { tone: "green" | "red" | "slate" | "gold" | "amber"; children: ReactNode; title?: string }) {
  const cls = {
    green: "bg-emerald-500/15 text-emerald-300 ring-emerald-400/25",
    red: "bg-red-500/15 text-red-300 ring-red-400/25",
    slate: "bg-slate-500/15 text-slate-300 ring-slate-400/20",
    gold: "bg-canary-gold/15 text-canary-gold ring-canary-gold/30",
    amber: "bg-amber-500/10 text-amber-300 ring-amber-400/25",
  }[tone];
  return (
    <span title={title} className={`inline-block whitespace-nowrap rounded px-1.5 py-0.5 text-[10px] font-medium ring-1 ${cls}`}>
      {children}
    </span>
  );
}

function AggrBadge({ r }: { r: StackRow }) {
  if (r.aggr === "ask") return <Badge tone="green" title={`last ${r.last} vs bid ${r.bid} / ask ${r.ask}`}>at/above ask</Badge>;
  if (r.aggr === "bid") return <Badge tone="slate" title={`last ${r.last} vs bid ${r.bid} / ask ${r.ask}`}>at/below bid</Badge>;
  return null;
}
function ConfirmBadge({ c }: { c: StackRow["confirm"] }) {
  if (c.status === "confirmed") return <Badge tone="green" title={`next-session OI change ${signed(c.oiChange ?? 0)} (needed ${num(c.needed)})`}>opening confirmed {signed(c.oiChange ?? 0)} OI</Badge>;
  if (c.status === "not_confirmed") return <Badge tone="red" title={`next-session OI change ${signed(c.oiChange ?? 0)} (needed ${num(c.needed)})`}>not confirmed {signed(c.oiChange ?? 0)} OI</Badge>;
  if (c.status === "unknown") return <Badge tone="slate">OI n/a next session</Badge>;
  return <Badge tone="slate" title={`needs +${num(c.needed)} OI next session`}>unconfirmed · OI next session</Badge>;
}

function ContractHead({ r, latestSession }: { r: StackRow; latestSession: string | null }) {
  return (
    <div className="flex items-center gap-2">
      <TickerLink ticker={r.ticker} />
      <span className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tabular-nums ${r.type === "call" ? "bg-emerald-500/15 text-emerald-300" : "bg-red-500/15 text-red-300"}`}>
        {r.type === "call" ? "C" : "P"} {r.strike}
      </span>
      <span className="truncate text-[10px] text-slate-400">
        {md(r.expiry)} · {r.dteNow}d · {r.moneyness} {r.pctFromSpot > 0 ? "+" : ""}
        {r.pctFromSpot}%{r.flagDate !== latestSession ? ` · flagged ${md(r.flagDate)}` : ""}
      </span>
    </div>
  );
}

function StackRowItem({ r, latestSession }: { r: StackRow; latestSession: string | null }) {
  return (
    <li className="rounded-md border border-white/5 bg-slate-950/40 px-2 py-1.5 text-xs">
      <div className="flex items-start justify-between gap-2">
        <ContractHead r={r} latestSession={latestSession} />
        <span className="shrink-0 tabular-nums text-[11px] font-semibold text-canary-gold">{money(r.premium)}</span>
      </div>
      <div className="mt-1 flex flex-wrap items-center gap-1">
        <span className="mr-1 tabular-nums text-[10px] text-slate-300">
          {num(r.volume)} vol / {num(r.oi)} OI · {r.volOi ?? "new"}×
        </span>
        <AggrBadge r={r} />
        <ConfirmBadge c={r.confirm} />
        {r.repeat >= 2 ? <Badge tone="gold">repeat ×{r.repeat}</Badge> : null}
      </div>
    </li>
  );
}

function RepeatRowItem({ r, latestSession }: { r: RepeatRow; latestSession: string | null }) {
  return (
    <li className="rounded-md border border-white/5 bg-slate-950/40 px-2 py-1.5 text-xs">
      <div className="flex items-start justify-between gap-2">
        <ContractHead r={{ ...r, flagDate: latestSession ?? r.flagDate }} latestSession={latestSession} />
        <span className="shrink-0 tabular-nums text-[11px] font-semibold text-canary-gold" title="combined est. premium on flagged sessions">
          {money(r.combinedPremium)}
        </span>
      </div>
      <div className="mt-1 flex flex-wrap items-center gap-1">
        <Badge tone="gold">flagged ×{r.flaggedOn.length}: {r.flaggedOn.map(md).join(", ")}</Badge>
        <span className="tabular-nums text-[10px] text-slate-300">
          latest {num(r.latest.volume)} / {num(r.latest.oi)} OI · {r.latest.volOi ?? "new"}× · OI since first flag {signed(r.oiChangeSinceFirst)}
        </span>
        <AggrBadge r={r} />
        {r.confirmations.filter((c) => c.status === "confirmed" || c.status === "not_confirmed").slice(-1).map((c) => (
          <ConfirmBadge key={c.date} c={c} />
        ))}
      </div>
    </li>
  );
}

/* ---------- stack boxes ---------- */
const boxCls = "flex max-h-[min(640px,78vh)] flex-col overflow-hidden rounded-xl border border-canary-gold/25 bg-slate-900/60 p-3 shadow-sm ring-1 ring-canary-gold/10";

function StackBox({ id, title, tag, how, count, children }: { id: string; title: string; tag: string; how: ReactNode; count: string; children: ReactNode }) {
  return (
    <article id={id} className={boxCls}>
      <div className="flex shrink-0 items-baseline justify-between gap-2">
        <h3 className="m-0 min-w-0">
          <InfoDialog label={title} title={`How this stack works: ${title}`} subtitle="Private, personal use only · Cboe delayed">
            {how}
          </InfoDialog>
        </h3>
        <span className="shrink-0 text-[10px] tabular-nums text-slate-400">{count}</span>
      </div>
      <p className="mt-0.5 shrink-0 text-[10px] uppercase tracking-wide text-canary-gold/80">{tag}</p>
      {children}
    </article>
  );
}
const empty = (msg: ReactNode) => <p className="mt-2 text-xs leading-relaxed text-slate-400">{msg}</p>;
const countLabel = (shown: number, total: number) => (total > shown ? `${shown} of ${total}` : `${total}`);

export function OwnerOptionsScanner({ data }: { data: OptionsScan }) {
  const c: OptionsStackConfig = {
    proxies: { ...DEFAULT_STACK_CONFIG.proxies, ...(data.config?.proxies ?? {}) },
    stacks: { ...DEFAULT_STACK_CONFIG.stacks, ...(data.config?.stacks ?? {}) },
  };
  const A = c.stacks.aggressive, S = c.stacks.swing, R = c.stacks.repeat;
  const session = data.asOfSession;
  const held = data.held ? (data.heldSince ?? "—") : null;
  const st = data.stacks;
  const [side, setSide] = useState<"all" | "call" | "put">("all");
  const lookback = st?.lookbackDates ?? [];

  const aggrRows = (st?.aggressive.rows ?? []).filter((r) => side === "all" || r.type === side);
  const calls = data.leans.filter((l) => l.lean === "call").sort((a, b) => b.callPrem + b.putPrem - (a.callPrem + a.putPrem));
  const puts = data.leans.filter((l) => l.lean === "put").sort((a, b) => b.callPrem + b.putPrem - (a.callPrem + a.putPrem));
  const singleNames = "Single-name stocks only (Cboe security type “stock”; ETFs, indexes and metal/crypto funds are excluded)";

  return (
    <div className="space-y-3">
      {data.paused ? (
        <div role="note" className="rounded-lg border border-amber-500/60 bg-amber-500/10 px-3 py-2 text-xs text-amber-100">
          <span className="font-semibold text-amber-300">Options scan paused (data source under review).</span>{" "}
          Showing the last scan, as of session{" "}
          <span className="tabular-nums font-semibold text-white">{session ?? "—"}</span>
          {data.pausedSince ? <> · paused since {data.pausedSince}</> : null}. No new data is downloaded until a
          licensed source is chosen.
        </div>
      ) : null}
      <p className="text-[11px] text-slate-400">
        <span className="font-semibold text-amber-200">Private, personal use only. Options data: Cboe delayed.</span> As of session{" "}
        <span className="tabular-nums text-slate-200">{session ?? "—"}</span>
        {lookback.length > 1 ? <> · stacks include flags from {lookback.map(md).join(" + ")}</> : null}
        {held ? " · " : ""}
        {held ? <HeldNote since={held} /> : null}
      </p>
      <p className="text-[10px] leading-relaxed text-slate-500">
        Proxies, not prints: “at/above ask” = the last print sat in the top of the closing spread; “opening confirmed” = next-session OI rose by ≥{" "}
        {Math.round(c.proxies.OPEN_CONFIRM_SHARE * 100)}% of the volume. No sweep/block tags or trade side in this data.
      </p>

      {!st ? (
        empty(data.placeholder ? "No options scan yet." : "This reading predates the stacks; they appear after the next scan.")
      ) : (
        <div className="grid gap-3 lg:grid-cols-3">
          {/* Stack 1 */}
          <StackBox
            id="stack-aggressive"
            title="Aggressive directional"
            tag={`≥ ${money(A.MIN_PREMIUM)} · vol/OI ≥ ${A.MIN_VOL_OI}× · at/above ask · ${A.MIN_DTE}–${A.MAX_DTE} DTE · single names`}
            count={countLabel(st.aggressive.rows.length, st.aggressive.total)}
            how={
              <>
                <p className="font-semibold text-white">Rules (all must pass)</p>
                <ul className="list-disc space-y-1 pl-5">
                  <li>Est. premium ≥ {money(A.MIN_PREMIUM)}</li>
                  <li>Volume ≥ {A.MIN_VOL_OI}× start-of-day OI (OI of 0 counts as new)</li>
                  {A.REQUIRE_AT_ASK ? <li>Last print at/above ask: our stand-in for sweeps and above-ask buying</li> : null}
                  <li>{A.MIN_DTE}–{A.MAX_DTE} days to expiry on the flag date</li>
                  <li>{singleNames}</li>
                  <li>Not more than {data.thresholds?.DEEP_ITM_PCT ?? 10}% in the money</li>
                </ul>
                <p>Calls at the ask read as &quot;calls bought&quot;, puts at the ask as &quot;puts bought&quot;. Use the toggle to filter. Each row shows whether the next session&apos;s OI confirmed an opening trade. Sorted by premium.</p>
                <ProxyNotes c={c} />
              </>
            }
          >
            <div className="mt-2 flex shrink-0 gap-1" role="group" aria-label="Side">
              {(["all", "call", "put"] as const).map((k) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => setSide(k)}
                  aria-pressed={side === k}
                  className={`rounded-full px-2 py-0.5 text-[10px] ring-1 ${side === k ? "bg-canary-gold/20 text-canary-gold ring-canary-gold/40" : "text-slate-400 ring-white/10 hover:text-white"}`}
                >
                  {k === "all" ? "Both" : k === "call" ? "Calls bought" : "Puts bought"}
                </button>
              ))}
            </div>
            {aggrRows.length === 0 ? (
              empty(st.aggressive.total === 0 ? "No contracts passed every rule on the latest sessions. The at/above-ask proxy is strict." : "None on this side.")
            ) : (
              <ul className="mt-2 min-h-0 flex-1 space-y-1 overflow-y-auto pr-0.5">
                {aggrRows.map((r) => (
                  <StackRowItem key={`${r.sym}-${r.flagDate}`} r={r} latestSession={session} />
                ))}
              </ul>
            )}
          </StackBox>

          {/* Stack 2 */}
          <StackBox
            id="stack-swing"
            title="Swing positioning"
            tag={`≥ ${money(S.MIN_PREMIUM)} · OTM · ${S.MIN_DTE}–${S.MAX_DTE} DTE · confirmed first`}
            count={countLabel(st.swing.rows.length, st.swing.total)}
            how={
              <>
                <p className="font-semibold text-white">Rules (all must pass)</p>
                <ul className="list-disc space-y-1 pl-5">
                  <li>Est. premium ≥ {money(S.MIN_PREMIUM)}</li>
                  {S.OTM_ONLY ? <li>Out of the money only: call strike above spot, put strike below spot</li> : null}
                  <li>{S.MIN_DTE}–{S.MAX_DTE} days to expiry on the flag date</li>
                  <li>Volume ≥ {S.MIN_VOL_OI}× start-of-day OI (OI of 0 counts as new)</li>
                  <li>{singleNames}</li>
                  <li>No aggressor requirement: any print location counts</li>
                </ul>
                <p>Opening-confirmed rows rank first, then unconfirmed (OI not in yet), then not confirmed. Within each group, sorted by premium.</p>
                <ProxyNotes c={c} />
              </>
            }
          >
            {st.swing.rows.length === 0 ? (
              empty("No contracts passed every rule on the latest sessions.")
            ) : (
              <ul className="mt-2 min-h-0 flex-1 space-y-1 overflow-y-auto pr-0.5">
                {st.swing.rows.map((r) => (
                  <StackRowItem key={`${r.sym}-${r.flagDate}`} r={r} latestSession={session} />
                ))}
              </ul>
            )}
          </StackBox>

          {/* Stack 3 */}
          <StackBox
            id="stack-repeat"
            title="Repeat flow"
            tag={`flagged ${R.MIN_SESSIONS}+ of last ${R.WINDOW_SESSIONS} sessions · ≥ ${money(R.MIN_COMBINED_PREMIUM)} combined · latest vol/OI ≥ ${R.LATEST_MIN_VOL_OI}×`}
            count={st.repeat.building ? "building" : countLabel(st.repeat.rows.length, st.repeat.total)}
            how={
              <>
                <p className="font-semibold text-white">Rules (all must pass)</p>
                <ul className="list-disc space-y-1 pl-5">
                  <li>
                    The same contract was flagged on at least {R.MIN_SESSIONS} sessions within the last {R.WINDOW_SESSIONS}. Flagged = volume ≥{" "}
                    {data.thresholds?.UNUSUAL_VOL_OI ?? 3}× OI, ≥ {num(data.thresholds?.UNUSUAL_MIN_VOL ?? 500)} contracts, premium ≥{" "}
                    {money(data.thresholds?.UNUSUAL_MIN_PREMIUM ?? 100000)}.
                  </li>
                  <li>Combined est. premium on the flagged sessions ≥ {money(R.MIN_COMBINED_PREMIUM)} (configurable up to $500k)</li>
                  <li>Still elevated on the latest session: volume ≥ {R.LATEST_MIN_VOL_OI}× that day&apos;s start-of-day OI</li>
                </ul>
                <p>&quot;OI since first flag&quot; is today&apos;s start-of-day OI minus the OI on the first flagged session, so it shows whether the position stayed on. The latest next-day OI confirmation is shown as a badge.</p>
                <p>This stack needs stored history, so it stays empty until enough sessions have been scanned. It never shows made-up rows.</p>
                <ProxyNotes c={c} />
              </>
            }
          >
            {st.repeat.building ? (
              empty(
                <>
                  <span className="font-semibold text-amber-200">Building history:</span> {st.repeat.sessionsSoFar} session
                  {st.repeat.sessionsSoFar === 1 ? "" : "s"} so far ({data.historyInfo?.dates.map(md).join(", ")}). Rows appear once the same contract is
                  flagged on {st.repeat.needSessions}+ sessions within {R.WINDOW_SESSIONS}.
                </>,
              )
            ) : st.repeat.rows.length === 0 ? (
              empty(`No repeat flow in the last ${st.repeat.sessionsSoFar} sessions.`)
            ) : (
              <ul className="mt-2 min-h-0 flex-1 space-y-1 overflow-y-auto pr-0.5">
                {st.repeat.rows.map((r) => (
                  <RepeatRowItem key={r.sym} r={r} latestSession={session} />
                ))}
              </ul>
            )}
          </StackBox>
        </div>
      )}

      {/* Secondary: leans + IV spikes (collapsed) */}
      <details className="rounded-xl border border-white/10 bg-slate-900/40 px-3 py-2">
        <summary className="cursor-pointer text-[11px] font-semibold uppercase tracking-wide text-slate-400">
          More: call/put leans ({calls.length + puts.length}) · IV spikes ({data.ivSpikes.length})
        </summary>
        <div className="mt-2 grid gap-3 md:grid-cols-2">
          <div>
            <p className="text-[10px] uppercase tracking-wide text-canary-gold/80">
              Call / put lean · ≥ {Math.round((data.thresholds?.LEAN_SHARE ?? 0.75) * 100)}% of premium · ≥ {money(data.thresholds?.LEAN_MIN_PREMIUM ?? 1e6)}
            </p>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {puts.map((l) => (
                <span key={l.ticker} className="inline-flex items-center gap-1 rounded-full border border-red-400/30 bg-red-500/10 px-2 py-0.5 text-[11px] text-red-200">
                  <TickerLink ticker={l.ticker} className="font-semibold text-red-100" />
                  <span className="opacity-70">{Math.round((1 - (l.callPremShare ?? 0)) * 100)}% puts</span>
                </span>
              ))}
              {calls.map((l) => (
                <span key={l.ticker} className="inline-flex items-center gap-1 rounded-full border border-emerald-400/30 bg-emerald-500/10 px-2 py-0.5 text-[11px] text-emerald-200">
                  <TickerLink ticker={l.ticker} className="font-semibold text-emerald-100" />
                  <span className="opacity-70">{Math.round((l.callPremShare ?? 0) * 100)}% calls</span>
                </span>
              ))}
              {calls.length + puts.length === 0 ? <span className="text-xs text-slate-500">None.</span> : null}
            </div>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wide text-canary-gold/80">
              IV spikes · IV30 ÷ HV{data.thresholds?.HV_LEN ?? 20} ≥ {data.thresholds?.IV_HV_SPIKE ?? 1.5}× or IV30 +{data.thresholds?.IV30_DAY_CHANGE_SPIKE_PCT ?? 15}%
            </p>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {data.ivSpikes.map((r) => (
                <span key={r.ticker} className="inline-flex items-center gap-1 rounded-full border border-amber-400/30 bg-amber-500/10 px-2 py-0.5 text-[11px] text-amber-200">
                  <TickerLink ticker={r.ticker} className="font-semibold text-amber-100" />
                  <span className="opacity-70 tabular-nums">
                    IV {r.iv30}/{r.hv20} = {r.ivHv}×
                  </span>
                </span>
              ))}
              {data.ivSpikes.length === 0 ? <span className="text-xs text-slate-500">None.</span> : null}
            </div>
          </div>
        </div>
      </details>
    </div>
  );
}
