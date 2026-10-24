import { NextResponse } from "next/server";

export async function readBody(request: Request): Promise<Record<string, string>> {
  const ct = request.headers.get("content-type") || "";
  try {
    if (ct.includes("application/json")) {
      const j = (await request.json()) as Record<string, unknown>;
      return Object.fromEntries(Object.entries(j).map(([k, v]) => [k, String(v ?? "")]));
    }
    const f = await request.formData();
    const out: Record<string, string> = {};
    f.forEach((v, k) => (out[k] = typeof v === "string" ? v : ""));
    return out;
  } catch {
    return {};
  }
}

export const jsonError = (error: string, status = 400) => NextResponse.json({ ok: false, error }, { status });

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Only allow same-site relative redirects. */
export function safeNext(n: string | undefined, fallback = "/account"): string {
  return n && n.startsWith("/") && !n.startsWith("//") ? n : fallback;
}
