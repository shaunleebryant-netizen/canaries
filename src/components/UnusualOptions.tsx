import {
  loadOptionsFlow,
  type OptionsFlowItem,
  type OptionRight,
} from "@/lib/loadOptionsFlow";

const THREE_DAYS_MS = 3 * 24 * 60 * 60 * 1000;

function rightChipClass(right: OptionRight): string {
  return right === "call"
    ? "bg-emerald-500/15 text-emerald-200 ring-emerald-400/30"
    : "bg-red-500/15 text-red-200 ring-red-400/30";
}

function avatarInitial(handle: string): string {
  const cleaned = handle.replace(/^@/, "").trim();
  return (cleaned[0] ?? "?").toUpperCase();
}

function formatPostedAt(iso: string): string {
  try {
    return new Date(iso).toLocaleString("en-NZ", {
      timeZone: "Pacific/Auckland",
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch {
    return iso;
  }
}

function visibleFlows(flows: OptionsFlowItem[], nowMs: number): OptionsFlowItem[] {
  const cutoff = nowMs - THREE_DAYS_MS;
  return flows
    .filter((f) => {
      if (f.pinned === true) return true;
      const t = Date.parse(f.postedAt);
      return Number.isFinite(t) && t >= cutoff;
    })
    .sort((a, b) => {
      const p = Number(Boolean(b.priority)) - Number(Boolean(a.priority));
      if (p !== 0) return p;
      return Date.parse(b.postedAt) - Date.parse(a.postedAt);
    });
}

function FlowCard({ flow }: { flow: OptionsFlowItem }) {
  const handle = flow.handle.replace(/^@/, "");
  return (
    <article className="rounded-xl border border-violet-400/20 bg-slate-950/50 p-4 shadow-sm">
      <div className="flex flex-wrap items-start gap-3">
        <div
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-violet-500/20 text-sm font-semibold text-violet-200 ring-1 ring-violet-400/40"
          aria-hidden
        >
          {avatarInitial(handle)}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-medium text-white">@{handle}</span>
            {flow.priority ? (
              <span className="rounded-full bg-violet-500/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-violet-200 ring-1 ring-violet-400/40">
                Priority
              </span>
            ) : null}
            <span className="rounded-full bg-slate-800 px-2 py-0.5 text-[11px] font-semibold tracking-wide text-slate-200 ring-1 ring-white/10">
              {flow.ticker}
            </span>
            <span
              className={`rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide ring-1 ${rightChipClass(flow.right)}`}
            >
              {flow.right}
            </span>
            <span className="rounded-full bg-canary-gold/15 px-2 py-0.5 text-[11px] font-semibold text-canary-gold ring-1 ring-canary-gold/30">
              Qualified
            </span>
          </div>
          <p className="mt-2 font-mono text-xs text-violet-100/90">
            {flow.contract}
          </p>
          <p className="mt-2 text-sm leading-relaxed text-slate-300">
            {flow.summary}
          </p>
          {flow.tags && flow.tags.length > 0 ? (
            <div className="mt-2 flex flex-wrap gap-2">
              {flow.tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded bg-violet-500/10 px-2 py-0.5 text-[10px] uppercase tracking-wide text-violet-200 ring-1 ring-violet-400/20"
                >
                  {tag}
                </span>
              ))}
            </div>
          ) : null}
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
            <time dateTime={flow.postedAt} className="text-xs text-slate-500">
              {formatPostedAt(flow.postedAt)} PT
            </time>
            <a
              href={flow.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs font-medium text-violet-300 transition hover:text-violet-200"
            >
              View on X →
            </a>
          </div>
        </div>
      </div>
    </article>
  );
}

export function UnusualOptions() {
  const data = loadOptionsFlow();
  // Members page is dynamic; the 3-day window is the request time, not a client render.
  // eslint-disable-next-line react-hooks/purity -- request-time cutoff on a dynamic server render
  const flows = visibleFlows(data.flows, Date.now());
  const priority = data.priorityAllowlist;
  const also = data.allowlist.filter(
    (h) => !priority.map((p) => p.toLowerCase()).includes(h.toLowerCase()),
  );

  void priority;
  void also;

  return (
    <section className="mt-8 rounded-2xl border border-violet-400/35 bg-slate-900/60 p-6 shadow-sm ring-1 ring-violet-400/15">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-widest text-violet-300">
            Unusual options
          </h2>
          <p className="mt-1 text-xs leading-snug text-slate-400">
            Notable options prints Shaun qualifies — useful for spotting where
            big money is hedging or swinging, not a live screener.
          </p>
          <p className="mt-1 text-sm text-slate-400">
            Last 3 days
          </p>
        </div>
        <span className="rounded-full bg-violet-500/15 px-3 py-1 text-[11px] font-semibold text-violet-200 ring-1 ring-violet-400/30">
          Education only
        </span>
      </div>

      <p className="mt-3 text-[11px] leading-relaxed text-slate-500">
        <span className="font-semibold text-slate-400">Filters:</span>{" "}
        {data.filters.join(" · ")}
      </p>

      <div className="mt-4 max-h-80 space-y-3 overflow-y-auto pr-1">
        {flows.length === 0 ? (
          <div className="rounded-xl border border-dashed border-violet-400/20 bg-slate-950/40 px-4 py-8 text-center">
            <p className="text-sm text-slate-400">
              No qualified options flow in the last 3 days.
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Shaun fills this on Wed / Fri after US close.
            </p>
          </div>
        ) : (
          flows.map((flow) => <FlowCard key={flow.id} flow={flow} />)
        )}
      </div>

      <p className="mt-4 text-[11px] leading-relaxed text-slate-500">
        Education only. Flow posts are not fills. Not a live Unusual Whales /
        Cheddar API feed.
      </p>
    </section>
  );
}
