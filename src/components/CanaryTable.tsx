import type { MembersPayload } from "@/lib/types";
import { Sparkline } from "./Sparkline";

function scoreLabel(score: MembersPayload["canaries"][0]["score"]) {
  if (score === "UNVERIFIED") return "UNVERIFIED";
  return String(score);
}

function scoreClass(score: MembersPayload["canaries"][0]["score"]) {
  if (score === "UNVERIFIED") return "text-slate-400";
  if (score > 0) return "text-canary-green";
  if (score < 0) return "text-canary-red";
  return "text-canary-amber";
}

export function CanaryTable({
  rows,
}: {
  rows: MembersPayload["canaries"];
}) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
      <table className="min-w-full text-left text-sm">
        <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
          <tr>
            <th className="px-4 py-3 font-medium">Canary</th>
            <th className="px-4 py-3 font-medium">Last reading</th>
            <th className="px-4 py-3 font-medium">Score</th>
            <th className="px-4 py-3 font-medium">Weight</th>
            <th className="px-4 py-3 font-medium">Contribution</th>
            <th className="px-4 py-3 font-medium">13-wk</th>
            <th className="px-4 py-3 font-medium">Read</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((c) => (
            <tr key={c.id} className="border-b border-slate-100 last:border-0">
              <td className="px-4 py-3">
                <div className="font-medium text-slate-900">{c.name}</div>
                <div className="text-xs text-slate-400">{c.description}</div>
              </td>
              <td className="px-4 py-3 tabular-nums text-slate-700">{c.lastReading}</td>
              <td className={`px-4 py-3 font-semibold tabular-nums ${scoreClass(c.score)}`}>
                {scoreLabel(c.score)}
              </td>
              <td className="px-4 py-3 tabular-nums text-slate-600">
                {c.weight.toFixed(2)}
              </td>
              <td className="px-4 py-3 tabular-nums text-slate-600">
                {c.contribution === null ? "—" : c.contribution.toFixed(4)}
              </td>
              <td className="px-4 py-3">
                <Sparkline values={c.sparkline} />
              </td>
              <td className="max-w-xs px-4 py-3 text-slate-600">{c.oneSentenceRead}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
