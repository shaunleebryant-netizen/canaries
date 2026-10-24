import { getCloudflareContext } from "@opennextjs/cloudflare";

/**
 * Members-only ticker chart data (owner t581u 2026-10-08, approved t583s2392; flag MEMBERS_TICKER_CHART_V2, default ON).
 * Auth: src/middleware.ts guards /api/members/* (unchanged). This route only streams the small
 * precomputed JSON (scripts/build-ticker-charts.mjs → public/_chartdata/<KEY>.json) from the ASSETS
 * binding: no Yahoo, no engines, no JSON parsing here, so Worker CPU stays tiny (1102 lesson).
 */
type AssetsBinding = { fetch: (req: Request | string) => Promise<Response> };

const TICKER_RE = /^[A-Z0-9.\-=^]{1,20}$/;
const chartKey = (t: string) => t.replace(/[^A-Z0-9.-]/g, "_");

export async function GET(request: Request, ctx: { params: Promise<{ ticker: string }> }) {
  const raw = decodeURIComponent((await ctx.params).ticker || "").toUpperCase();
  if (!TICKER_RE.test(raw)) return Response.json({ error: "Bad ticker" }, { status: 400 });
  const url = new URL(`/_chartdata/${chartKey(raw)}.json`, request.url).toString();
  let upstream: Response | null = null;
  try {
    const { env } = await getCloudflareContext({ async: true });
    const assets = (env as unknown as { ASSETS?: AssetsBinding }).ASSETS;
    if (assets) upstream = await assets.fetch(url);
  } catch {
    // not on Workers (next start): fall through to the local static file
  }
  // Local `next start` / dev: the dev ASSETS proxy points at a stale .open-next/assets, so read the
  // file from the local server instead. Never on the live site.
  const host = new URL(request.url).hostname;
  if ((!upstream || !upstream.ok) && (host === "localhost" || host === "127.0.0.1")) {
    upstream?.body?.cancel().catch(() => {});
    upstream = await fetch(url);
  }
  if (!upstream) return Response.json({ error: "No chart data" }, { status: 404 });
  if (!upstream.ok || !upstream.body) {
    upstream.body?.cancel().catch(() => {});
    return Response.json({ error: "No chart data" }, { status: 404, headers: { "Cache-Control": "private, max-age=300" } });
  }
  return new Response(upstream.body, {
    status: 200,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "private, max-age=3600",
      "X-Robots-Tag": "noindex, nofollow",
    },
  });
}
