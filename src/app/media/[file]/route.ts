import { getCloudflareContext } from "@opennextjs/cloudflare";
import { serveMedia } from "@/lib/mediaRange.mjs";

/**
 * Range-capable media route (owner 2026-10-06, self-hosted homepage video).
 * On Workers, /media/* is answered by worker-entry.mjs BEFORE Next (t580u 2026-10-08: the old
 * buffered version of this route caused Error 1102). This route stays as the `next start` /
 * fallback path and shares the same streaming code (src/lib/mediaRange.mjs), never buffering.
 */
type AssetsBinding = { fetch: (req: Request | string) => Promise<Response> };

function assetFetcher(request: Request) {
  return async (path: string): Promise<Response> => {
    const url = new URL(path, request.url).toString();
    try {
      const { env } = await getCloudflareContext({ async: true });
      const assets = (env as unknown as { ASSETS?: AssetsBinding }).ASSETS;
      if (assets) return assets.fetch(url);
    } catch {
      // not running on Workers (next start / dev): fall through
    }
    return fetch(url);
  };
}

export async function GET(request: Request, ctx: { params: Promise<{ file: string }> }) {
  const { file } = await ctx.params;
  return serveMedia(request, file, assetFetcher(request));
}

export async function HEAD(request: Request, ctx: { params: Promise<{ file: string }> }) {
  const { file } = await ctx.params;
  return serveMedia(request, file, assetFetcher(request));
}
