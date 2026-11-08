/**
 * Who is looking at the page.
 * Paid account entitlements win over any preview cookie, so a paying member
 * is never silently downgraded. A free tier exists only in the isolated
 * preview adapter (see previewTier.ts). Production without that flag stays
 * on the existing stub or accounts gate.
 */
import { cookies } from "next/headers";
import { accountsEnabled } from "./config";
import { getEntitlement } from "./entitlement";
import { getMembersDb } from "./db";
import { PREVIEW_TIER_COOKIE, previewTierEnabled, readPreviewTier, type PreviewTierName } from "./previewTier";
import { getCurrentUser } from "./session";
import { isEmailVerified } from "./verify";

export type ViewerTier = "paid" | "free" | "anon";

export type Viewer = {
  signedIn: boolean;
  tier: ViewerTier;
  email: string | null;
  /** True only when a D1 grant task for this email is marked done. Preview fixtures are never granted. */
  indicatorGrant: boolean;
  source: "account" | "stub" | "preview" | "none";
};

function stubPassword(): string {
  return process.env.MEMBERS_PASSWORD || "canary-dev";
}

async function grantForEmail(email: string | null): Promise<boolean> {
  if (!email || !accountsEnabled()) return false;
  try {
    const db = await getMembersDb();
    const row = await db
      .prepare("SELECT id FROM indicator_grant_tasks WHERE email = ? AND status = 'done' LIMIT 1")
      .bind(email)
      .first();
    return Boolean(row);
  } catch {
    return false;
  }
}

export async function resolveViewer(): Promise<Viewer> {
  if (accountsEnabled()) {
    try {
      const cur = await getCurrentUser();
      if (cur) {
        const ent = await getEntitlement(await getMembersDb(), cur.user);
        if (ent.access) {
          return {
            signedIn: true,
            tier: "paid",
            email: cur.user.email,
            indicatorGrant: await grantForEmail(cur.user.email),
            source: "account",
          };
        }
        if (isEmailVerified(cur.user)) {
          return {
            signedIn: true,
            tier: "free",
            email: cur.user.email,
            indicatorGrant: false,
            source: "account",
          };
        }
      }
    } catch {
      /* no D1 / no session secret: do not invent paid access */
    }
  } else if (process.env.NODE_ENV !== "production") {
    const jar = await cookies();
    if (jar.get("canary_members")?.value === stubPassword()) {
      return { signedIn: true, tier: "paid", email: null, indicatorGrant: false, source: "stub" };
    }
  }

  if (previewTierEnabled()) {
    const jar = await cookies();
    const preview = await readPreviewTier(jar.get(PREVIEW_TIER_COOKIE)?.value);
    if (preview) {
      const tier: PreviewTierName = preview.tier;
      return {
        signedIn: true,
        tier,
        email: preview.email,
        indicatorGrant: tier === "paid" ? await grantForEmail(preview.email) : false,
        source: "preview",
      };
    }
  }

  return { signedIn: false, tier: "anon", email: null, indicatorGrant: false, source: "none" };
}
