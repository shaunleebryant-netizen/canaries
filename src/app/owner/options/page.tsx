/**
 * Old path: /owner/options → /owner (the owner page moved 2026-09-26).
 * Still gated: middleware verifies the Access JWT first (404 otherwise), and we re-check before redirecting.
 */
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import { ACCESS_JWT_HEADER, verifyAccessJwt } from "@/lib/owner/accessJwt";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { robots: { index: false, follow: false } };

export default async function OwnerOptionsRedirect() {
  const h = await headers();
  const verdict = await verifyAccessJwt(h.get(ACCESS_JWT_HEADER));
  if (!verdict.ok) notFound();
  redirect("/owner");
}
