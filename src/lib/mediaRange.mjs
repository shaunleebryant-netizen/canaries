/**
 * Streaming Range server for the self-hosted homepage video (t580u, 2026-10-08).
 *
 * Root cause of Cloudflare 1102 "Worker exceeded resource limits": the old /media route did
 * `await upstream.arrayBuffer()` on the 24.9 MB MP4 for EVERY request (even a 2-byte Range probe),
 * then copied a slice — ~25–50 MB and ~250 ms CPU per request. Safari/iOS fires several
 * overlapping Range requests per play, so a few in one isolate blew the 128 MB memory limit.
 *
 * Now: the ASSETS body is streamed. Whole-file / open-ended-from-0 ranges pass the native stream
 * straight through (no JS touches the bytes); other ranges skip/trim chunks on the fly and cancel
 * the upstream read once the range is sent. Memory stays at a chunk or two per request.
 * Used by worker-entry.mjs (on Workers, before Next) and src/app/media/[file]/route.ts (next start).
 */

/** Allowlisted media. `size` is a fallback only (the ASSETS Content-Length wins when present);
 *  update it if the video file is replaced. */
export const MEDIA_FILES = {
  "canary-v1.2-720p.mp4": { path: "/home/video/canary-v1.2-720p.mp4", type: "video/mp4", size: 24913959 },
};

/** Single byte range → [start, end] inclusive; null = no Range; "bad" = 416. */
export function parseRange(header, size) {
  if (!header) return null;
  const m = /^bytes=(\d*)-(\d*)$/.exec(header.trim());
  if (!m || (m[1] === "" && m[2] === "")) return "bad";
  let start;
  let end;
  if (m[1] === "") {
    const suffix = Number(m[2]);
    if (suffix === 0) return "bad";
    start = Math.max(0, size - suffix);
    end = size - 1;
  } else {
    start = Number(m[1]);
    end = m[2] === "" ? size - 1 : Math.min(Number(m[2]), size - 1);
  }
  if (start > end || start >= size) return "bad";
  return [start, end];
}

/** Bytes [start, end] of a stream without buffering it; cancels upstream once done. */
function sliceStream(body, start, end) {
  const reader = body.getReader();
  let pos = 0;
  return new ReadableStream({
    async pull(controller) {
      for (;;) {
        const { done, value } = await reader.read();
        if (done) {
          controller.close();
          return;
        }
        const chunk = value instanceof Uint8Array ? value : new Uint8Array(value);
        const cStart = pos;
        const cEnd = pos + chunk.byteLength;
        pos = cEnd;
        if (cEnd <= start) continue; // still before the range
        const from = Math.max(0, start - cStart);
        const to = Math.min(chunk.byteLength, end + 1 - cStart);
        if (to > from) controller.enqueue(chunk.subarray(from, to));
        if (cEnd > end) {
          controller.close();
          reader.cancel().catch(() => {});
        }
        return;
      }
    },
    cancel(reason) {
      return reader.cancel(reason);
    },
  });
}

/** Fixed Content-Length body on Workers (FixedLengthStream); plain stream elsewhere. */
function withLength(stream, length) {
  const FLS = globalThis.FixedLengthStream;
  if (typeof FLS !== "function") return stream;
  const { readable, writable } = new FLS(length);
  stream.pipeTo(writable).catch(() => {});
  return readable;
}

/**
 * @param {Request} request
 * @param {string} file  basename under /media/
 * @param {(path: string) => Promise<Response>} fetchAsset  GET of the static asset (no Range)
 * @returns {Promise<Response>}
 */
export async function serveMedia(request, file, fetchAsset) {
  const meta = Object.prototype.hasOwnProperty.call(MEDIA_FILES, file) ? MEDIA_FILES[file] : null;
  if (!meta) return new Response("Not found", { status: 404 });
  const head = request.method === "HEAD";
  if (request.method !== "GET" && !head) {
    return new Response("Method not allowed", { status: 405, headers: { Allow: "GET, HEAD" } });
  }
  const upstream = await fetchAsset(meta.path);
  if (!upstream.ok || !upstream.body) {
    upstream.body?.cancel().catch(() => {});
    return new Response("Not found", { status: 404 });
  }
  const len = Number(upstream.headers.get("content-length"));
  const size = Number.isFinite(len) && len > 0 ? len : meta.size;
  const base = {
    "Content-Type": meta.type,
    "Accept-Ranges": "bytes",
    "Cache-Control": "public, max-age=86400",
    // Owner 2026-10-06: play inline, never prompt a download.
    "Content-Disposition": `inline; filename="${file}"`,
    "X-Content-Type-Options": "nosniff",
  };
  const etag = upstream.headers.get("etag");
  if (etag) base.ETag = etag;

  const range = parseRange(request.headers.get("range"), size);
  if (range === "bad" || head) upstream.body.cancel().catch(() => {});
  if (range === "bad") {
    return new Response(null, { status: 416, headers: { ...base, "Content-Range": `bytes */${size}` } });
  }
  if (!range) {
    return new Response(head ? null : upstream.body, {
      status: 200,
      headers: { ...base, "Content-Length": String(size) },
    });
  }
  const [start, end] = range;
  const length = end - start + 1;
  const headers = { ...base, "Content-Range": `bytes ${start}-${end}/${size}`, "Content-Length": String(length) };
  if (head) return new Response(null, { status: 206, headers });
  const body = start === 0 && end === size - 1 ? upstream.body : withLength(sliceStream(upstream.body, start, end), length);
  return new Response(body, { status: 206, headers });
}
