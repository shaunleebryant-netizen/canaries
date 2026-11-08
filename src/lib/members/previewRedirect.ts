import { NextResponse } from "next/server";

/** Stay on the host the browser used, so the preview cookie is still sent. */
export function previewRedirect(request: Request, path: string): NextResponse {
  const host = request.headers.get("x-forwarded-host") || request.headers.get("host") || "127.0.0.1:3456";
  const proto = request.headers.get("x-forwarded-proto") || "http";
  return NextResponse.redirect(new URL(path, `${proto}://${host}`), 303);
}
