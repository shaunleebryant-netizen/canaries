import { readFile } from "node:fs/promises";
import path from "node:path";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { filterChartMarks } from "@/lib/chartPayload";
import { isFreeEtfChart } from "@/lib/etfChartAccess";
import { loadCompositeArchive } from "@/lib/loadCompositeArchive";
import { resolveViewer } from "@/lib/members/previewAccess";

/**
 * Members ticker chart. Auth is the middleware plus the tier check here.
 * Free preview accounts only receive Sector ETF charts, and locked layers
 * are removed before the JSON leaves the server. Direct /_chartdata URLs 404.
 */
type AssetsBinding = { fetch: (req: Request | string) => Promise<Response> };

const TICKER_RE = /^[A-Z0-9.\-=^]{1,20}$/;
const chartKey = (t: string) => t.replace(/[^A-Z0-9.-]/g, "_");

async function readRaw(request: Request, key: string): Promise<unknown | null> {
  try {
    const { env } = await getCloudflareContext({ async: true });
    const assets = (env as unknown as { ASSETS?: AssetsBinding }).ASSETS;
    if (assets) {
      const upstream = await assets.fetch(new URL(`/_chartdata/${key}.json`, request.url).toString());
      if (upstream.ok) return await upstream.json();
    }
  } catch {
    /* local next dev has no assets binding */
  }
  try {
    const text = await readFile(path.join(process.cwd(), "public", "_chartdata", `${key}.json`), "utf8");
    return JSON.parse(text) as unknown;
  } catch {
    return null;
  }
}

export async function GET(request: Request, ctx: { params: Promise<{ ticker: string }> }) {
  const viewer = await resolveViewer();
  if (viewer.tier === "anon") return Response.json({ error: "Unauthorized" }, { status: 401 });
  const raw = decodeURIComponent((await ctx.params).ticker || "").toUpperCase();
  if (!TICKER_RE.test(raw)) return Response.json({ error: "Bad ticker" }, { status: 400 });
  if (viewer.tier === "free" && !isFreeEtfChart(raw)) {
    return Response.json({ error: "Upgrade required" }, { status: 403 });
  }
  const doc = await readRaw(request, chartKey(raw));
  if (!doc || typeof doc !== "object") {
    return Response.json({ error: "No chart data" }, { status: 404, headers: { "Cache-Control": "private, max-age=300" } });
  }
  const body = doc as { d0?: number; m?: [number, string][] };
  if (typeof body.d0 === "number" && Array.isArray(body.m)) {
    body.m = filterChartMarks(body.m, body.d0, loadCompositeArchive(), viewer.tier === "free" ? "free-etf" : "paid");
  }
  return Response.json(body, {
    headers: {
      "Cache-Control": "private, no-store",
      "X-Robots-Tag": "noindex, nofollow",
    },
  });
}
