import type { XRumoursAudit } from "@/lib/owner/xRumoursAudit";

/** Owner-only: what X Rumours left out tonight and why, plus the checks each story passed. */
export function OwnerXRumoursAudit({ audit }: { audit: XRumoursAudit }) {
  const nz = audit.generatedAt
    ? new Date(audit.generatedAt).toLocaleString("en-NZ", { timeZone: "Pacific/Auckland", dateStyle: "medium", timeStyle: "short" }) + " NZ"
    : null;
  return (
    <section id="x-rumours-audit" className="rounded-xl border border-white/10 bg-slate-900/60 p-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-sm font-semibold text-white">X Rumours audit (owner only)</h2>
        <p className="text-[11px] text-slate-500">
          {audit.placeholder || !audit.asOf ? "No X Rumours run yet." : `Session ${audit.asOf}${nz ? ` · run ${nz}` : ""}`} ·{" "}
          {audit.filtered.length} left out · {audit.checks.length} checked
        </p>
      </div>
      {audit.filtered.length ? (
        <div className="mt-2 overflow-auto rounded-md border border-white/5">
          <table className="min-w-full text-left text-xs">
            <thead className="bg-slate-950/95 text-[10px] uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-1.5 py-1.5">Ticker</th>
                <th className="px-1.5 py-1.5">Stage</th>
                <th className="px-1.5 py-1.5">Why left out</th>
                <th className="px-1.5 py-1.5">Draft line</th>
                <th className="px-1.5 py-1.5">Link</th>
              </tr>
            </thead>
            <tbody>
              {audit.filtered.map((f, i) => (
                <tr key={`${f.ticker}-${i}`} className="border-t border-white/5 align-top">
                  <td className="whitespace-nowrap px-1.5 py-1.5 font-semibold text-white">{f.ticker}</td>
                  <td className="whitespace-nowrap px-1.5 py-1.5 text-slate-400">{f.stage}</td>
                  <td className="min-w-[14rem] px-1.5 py-1.5 text-amber-200">{f.why}</td>
                  <td className="min-w-[14rem] px-1.5 py-1.5 text-slate-400">{f.line ?? "—"}</td>
                  <td className="whitespace-nowrap px-1.5 py-1.5">
                    {f.link ? (
                      <a href={f.link} target="_blank" rel="noopener noreferrer nofollow" className="text-sky-300 hover:underline">
                        Open ↗
                      </a>
                    ) : (
                      "—"
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
      {audit.checks.length ? (
        <details className="mt-2 text-xs text-slate-300">
          <summary className="cursor-pointer text-slate-400">Per-story checks ({audit.checks.length})</summary>
          <ul className="mt-1 space-y-1">
            {audit.checks.map((c, i) => (
              <li key={`${c.key ?? c.ticker}-${i}`}>
                <b className="text-white">{c.ticker}</b> {c.type ?? ""} · {c.status ?? "filtered"} · ✓ {c.passed.join(", ") || "—"}
                {c.failed.length ? <span className="text-rose-300"> · ✗ {c.failed.join("; ")}</span> : null}
                {c.sec?.match ? (
                  <a href={c.sec.match.url} target="_blank" rel="noopener noreferrer" className="ml-1 text-sky-300 hover:underline">
                    SEC {c.sec.match.form} {c.sec.match.date} ↗
                  </a>
                ) : c.sec?.checked ? (
                  <span className="text-slate-500"> · SEC: no match ({c.sec.candidates ?? 0} candidates)</span>
                ) : null}
              </li>
            ))}
          </ul>
        </details>
      ) : null}
    </section>
  );
}
