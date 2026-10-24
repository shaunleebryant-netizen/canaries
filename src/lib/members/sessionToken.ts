/**
 * Signed session cookie: base64url(JSON{sid,uid,exp}).base64url(HMAC-SHA256).
 * Pure Web Crypto — safe to import from middleware (edge) and route handlers.
 * Signature proves the cookie was issued by us; the sessions table (checked in
 * route handlers / pages) allows revocation on logout.
 */
import { b64url, b64urlDecode, hmacSign, hmacVerify } from "./crypto";

export type SessionPayload = { sid: string; uid: string; exp: number };

export async function signSession(p: SessionPayload, secret: string): Promise<string> {
  const body = b64url(new TextEncoder().encode(JSON.stringify(p)));
  return `${body}.${await hmacSign(body, secret)}`;
}

export async function verifySessionToken(
  token: string | undefined,
  secret: string,
  nowSec = Math.floor(Date.now() / 1000),
): Promise<SessionPayload | null> {
  if (!token) return null;
  const i = token.indexOf(".");
  if (i < 1) return null;
  const body = token.slice(0, i);
  const sig = token.slice(i + 1);
  if (!(await hmacVerify(body, sig, secret))) return null;
  try {
    const p = JSON.parse(new TextDecoder().decode(b64urlDecode(body))) as SessionPayload;
    if (typeof p.sid !== "string" || typeof p.uid !== "string" || typeof p.exp !== "number") return null;
    if (p.exp <= nowSec) return null;
    return p;
  } catch {
    return null;
  }
}
