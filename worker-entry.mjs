/**
 * Worker entry (t580u, 2026-10-08). Wraps the OpenNext worker and answers /media/* (homepage
 * video) before Next runs, and 404s direct /_chartdata/* hits (t583, members-only chart JSON).
 * Everything else goes to OpenNext unchanged. wrangler.jsonc "main".
 *
 * Why: Error 1102 = "Worker exceeded CPU time limit" (tail: exceededCpu at ~256 ms). The old
 * Next route buffered the 24.9 MB MP4 per request (~250 ms CPU each); Safari fires several Range
 * requests per play. Now:
 *  - whole file / ranges from byte 0: the native ASSETS stream passes straight through (~0–2 ms CPU)
 *  - ranges starting later (Safari's moov/seek requests): served by the Cache API, whose match()
 *    honours Range natively (206). On a cache miss the full file is put once per colo (native
 *    stream, no JS per chunk). If the cache is unavailable, the streaming slicer is the fallback.
 */
import { serveMedia, parseRange, MEDIA_FILES } from "./src/lib/mediaRange.mjs";
import openNext from "./.open-next/worker.js";

export { DOQueueHandler, DOShardedTagCache, BucketCachePurge } from "./.open-next/worker.js";

async function cachedRange(request, url, file, env) {
  const meta = MEDIA_FILES[file];
  const cache = globalThis.caches?.default;
  if (!cache) return null;
  // Key includes the byte size: replacing the video (new size in MEDIA_FILES) busts the cache.
  const key = `${url.origin}/media/${encodeURIComponent(file)}?__bytes=${meta.size}`;
  const rangeReq = () => new Request(key, { headers: { Range: request.headers.get("range") } });
  let hit = await cache.match(rangeReq());
  if (hit) return hit;
  const upstream = await env.ASSETS.fetch(new URL(meta.path, url).toString());
  if (!upstream.ok || !upstream.body) {
    upstream.body?.cancel().catch(() => {});
    return null;
  }
  const len = Number(upstream.headers.get("content-length"));
  const size = Number.isFinite(len) && len > 0 ? len : meta.size;
  const { readable, writable } = new FixedLengthStream(size);
  upstream.body.pipeTo(writable).catch(() => {});
  const headers = {
    "Content-Type": meta.type,
    "Content-Length": String(size),
    "Accept-Ranges": "bytes",
    "Cache-Control": "public, max-age=86400",
    "Content-Disposition": `inline; filename="${file}"`,
    "X-Content-Type-Options": "nosniff",
  };
  const etag = upstream.headers.get("etag");
  if (etag) headers.ETag = etag;
  await cache.put(key, new Response(readable, { status: 200, headers }));
  hit = await cache.match(rangeReq());
  return hit && hit.status === 206 ? hit : null;
}

async function media(request, url, env) {
  let file;
  try {
    file = decodeURIComponent(url.pathname.slice("/media/".length));
  } catch {
    return new Response("Not found", { status: 404 });
  }
  const fetchAsset = (path) => env.ASSETS.fetch(new URL(path, url).toString());
  const known = Object.prototype.hasOwnProperty.call(MEDIA_FILES, file);
  const range = known && request.method === "GET" ? parseRange(request.headers.get("range"), MEDIA_FILES[file].size) : null;
  if (Array.isArray(range) && range[0] > 0) {
    try {
      const res = await cachedRange(request, url, file, env);
      if (res) return res;
    } catch {
      // fall through to the streaming slicer
    }
  }
  return serveMedia(request, file, fetchAsset);
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    // t583: members-only chart data is never served directly (wrangler run_worker_first routes it
    // here). Members read it through /api/members/chart/[ticker] (middleware-guarded).
    if (url.pathname.startsWith("/_chartdata/")) {
      return new Response("Not found", {
        status: 404,
        headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store", "x-robots-tag": "noindex" },
      });
    }
    if (url.pathname.startsWith("/media/") && env.ASSETS) return media(request, url, env);
    return openNext.fetch(request, env, ctx);
  },
};
