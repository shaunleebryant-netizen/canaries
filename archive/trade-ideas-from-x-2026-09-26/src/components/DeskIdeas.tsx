import { loadIdeas, type DeskIdea, type IdeaSide } from "@/lib/loadIdeas";
import { loadPackAsOf } from "@/lib/mainScanner";
import { HeldNote, heldSince } from "./HeldNote";

const THREE_DAYS_MS = 3 * 24 * 60 * 60 * 1000;

function sideChipClass(side: IdeaSide): string {
  switch (side) {
    case "buy":
      return "bg-emerald-500/15 text-emerald-200 ring-emerald-400/30";
    case "sell":
      return "bg-red-500/15 text-red-200 ring-red-400/30";
    case "trim":
      return "bg-amber-500/15 text-amber-200 ring-amber-400/30";
    case "watch":
      return "bg-sky-500/15 text-sky-200 ring-sky-400/30";
    default:
      return "bg-slate-500/15 text-slate-300 ring-slate-400/30";
  }
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

function visibleIdeas(ideas: DeskIdea[], nowMs: number): DeskIdea[] {
  const cutoff = nowMs - THREE_DAYS_MS;
  return ideas
    .filter((idea) => {
      if (idea.pinned === true) return true;
      const t = Date.parse(idea.postedAt);
      return Number.isFinite(t) && t >= cutoff;
    })
    .sort((a, b) => Date.parse(b.postedAt) - Date.parse(a.postedAt));
}

function IdeaCard({ idea }: { idea: DeskIdea }) {
  const handle = idea.handle.replace(/^@/, "");
  return (
    <article className="rounded-xl border border-white/10 bg-slate-950/50 p-4 shadow-sm">
      <div className="flex flex-wrap items-start gap-3">
        <div
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-canary-gold/20 text-sm font-semibold text-canary-gold ring-1 ring-canary-gold/30"
          aria-hidden
        >
          {avatarInitial(handle)}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-medium text-white">@{handle}</span>
            <span className="rounded-full bg-slate-800 px-2 py-0.5 text-[11px] font-semibold tracking-wide text-slate-200 ring-1 ring-white/10">
              {idea.ticker}
            </span>
            <span
              className={`rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide ring-1 ${sideChipClass(idea.side)}`}
            >
              {idea.side}
            </span>
            <span className="rounded-full bg-canary-gold/15 px-2 py-0.5 text-[11px] font-semibold text-canary-gold ring-1 ring-canary-gold/30">
              Qualified
            </span>
            {idea.pinned ? (
              <span className="rounded-full bg-violet-500/15 px-2 py-0.5 text-[11px] font-semibold text-violet-200 ring-1 ring-violet-400/30">
                Pinned
              </span>
            ) : null}
          </div>
          <p className="mt-2 text-sm leading-relaxed text-slate-300">
            {idea.summary}
          </p>
          {idea.level ? (
            <p className="mt-1 text-xs text-slate-500">Level: {idea.level}</p>
          ) : null}
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
            <time
              dateTime={idea.postedAt}
              className="text-xs text-slate-500"
            >
              {formatPostedAt(idea.postedAt)} PT
            </time>
            <a
              href={idea.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs font-medium text-canary-gold transition hover:text-yellow-300"
            >
              View on X →
            </a>
          </div>
        </div>
      </div>
    </article>
  );
}

export function DeskIdeas() {
  const data = loadIdeas();
  const ideas = visibleIdeas(data.ideas, Date.now());
  void data.allowlist; // kept in JSON; not shown in UI
  // No scraper yet: data is not refreshed by the pack → visible stale note.
  const stale = heldSince(data.asOf, loadPackAsOf());

  return (
    <section className="rounded-2xl border border-canary-gold/30 bg-slate-900/60 p-6 shadow-sm ring-1 ring-canary-gold/10">
      <h2 className="text-sm font-semibold uppercase tracking-widest text-canary-gold">
        Desk ideas
        {stale ? <HeldNote since={stale.slice(5)} label="stale since" className="ml-2 align-middle" /> : null}
      </h2>
      <p className="mt-1 text-xs leading-snug text-slate-400">
        Curated trade ideas from top traders on X, not Canary signals.
      </p>
      <p className="mt-1 text-sm text-slate-400">
        Qualified by Shaun · updated Wed &amp; Fri after US close
      </p>

      <div className="mt-4 max-h-80 space-y-3 overflow-y-auto pr-1">
        {ideas.length === 0 ? (
          <div className="rounded-xl border border-dashed border-white/10 bg-slate-950/40 px-4 py-8 text-center">
            <p className="text-sm text-slate-400">
              No qualified desk ideas in the last 3 days.
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Check back after Wed / Fri US close.
            </p>
          </div>
        ) : (
          ideas.map((idea) => <IdeaCard key={idea.id} idea={idea} />)
        )}
      </div>

      <p className="mt-4 text-[11px] leading-relaxed text-slate-500">
        Not buy/sell advice — third-party ideas from X accounts. Education
        only.
      </p>
    </section>
  );
}
