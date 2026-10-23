/**
 * Verifies a Cloudflare Access JWT (Cf-Access-Jwt-Assertion) with Web Crypto — works in the Worker
 * (middleware + server components). See src/lib/owner/config.ts.
 */
import { ownerAccessConfig, type OwnerAccessConfig } from "./config";

export const ACCESS_JWT_HEADER = "cf-access-jwt-assertion";

type Jwk = JsonWebKey & { kid?: string };
type Verdict = { ok: true; email: string } | { ok: false; reason: string };

const CERT_TTL_MS = 10 * 60 * 1000;
let certCache: { url: string; at: number; keys: Jwk[] } | null = null;

function b64urlBytes(s: string): Uint8Array<ArrayBuffer> {
  const b64 = s.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((s.length + 3) % 4);
  const bin = atob(b64);
  const out = new Uint8Array(new ArrayBuffer(bin.length));
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}
function b64urlJson(s: string): Record<string, unknown> {
  return JSON.parse(new TextDecoder().decode(b64urlBytes(s)));
}

async function getKeys(cfg: OwnerAccessConfig, force = false): Promise<Jwk[]> {
  const url = `${cfg.teamDomain}/cdn-cgi/access/certs`;
  if (!force && certCache && certCache.url === url && Date.now() - certCache.at < CERT_TTL_MS) return certCache.keys;
  const res = await fetch(url, { headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error(`certs HTTP ${res.status}`);
  const body = (await res.json()) as { keys?: Jwk[] };
  const keys = Array.isArray(body.keys) ? body.keys : [];
  certCache = { url, at: Date.now(), keys };
  return keys;
}

export async function verifyAccessJwt(token: string | null | undefined, cfg = ownerAccessConfig()): Promise<Verdict> {
  if (!cfg) return { ok: false, reason: "owner access not configured" };
  if (!token) return { ok: false, reason: "no access jwt" };
  const parts = token.split(".");
  if (parts.length !== 3) return { ok: false, reason: "malformed jwt" };
  try {
    const header = b64urlJson(parts[0]);
    const payload = b64urlJson(parts[1]);
    if (header.alg !== "RS256") return { ok: false, reason: "bad alg" };
    const kid = typeof header.kid === "string" ? header.kid : null;
    let keys = await getKeys(cfg);
    let jwk = keys.find((k) => k.kid === kid);
    if (!jwk) {
      keys = await getKeys(cfg, true); // key rotation
      jwk = keys.find((k) => k.kid === kid);
    }
    if (!jwk) return { ok: false, reason: "unknown kid" };
    const key = await crypto.subtle.importKey(
      "jwk",
      { kty: jwk.kty, n: jwk.n, e: jwk.e, alg: "RS256", ext: true },
      { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
      false,
      ["verify"],
    );
    const signed = new TextEncoder().encode(`${parts[0]}.${parts[1]}`);
    const valid = await crypto.subtle.verify("RSASSA-PKCS1-v1_5", key, b64urlBytes(parts[2]), signed);
    if (!valid) return { ok: false, reason: "bad signature" };

    const now = Math.floor(Date.now() / 1000);
    const aud = Array.isArray(payload.aud) ? payload.aud : [payload.aud];
    if (!aud.includes(cfg.aud)) return { ok: false, reason: "bad aud" };
    if (payload.iss !== cfg.teamDomain) return { ok: false, reason: "bad iss" };
    if (typeof payload.exp !== "number" || payload.exp <= now) return { ok: false, reason: "expired" };
    if (typeof payload.nbf === "number" && payload.nbf > now + 60) return { ok: false, reason: "not yet valid" };
    const email = typeof payload.email === "string" ? payload.email.toLowerCase() : "";
    if (email !== cfg.email.toLowerCase()) return { ok: false, reason: "not owner" };
    return { ok: true, email };
  } catch (e) {
    return { ok: false, reason: `verify error: ${String((e as Error)?.message || e)}` };
  }
}

export function isOwnerPath(pathname: string): boolean {
  return pathname === "/owner" || pathname.startsWith("/owner/") || pathname === "/api/owner" || pathname.startsWith("/api/owner/");
}
