import Link from "next/link";
import { googleOAuthConfigured } from "@/lib/members/google";

/**
 * Continue with Google — links to PKCE start.
 * When secrets missing, shows amber notice (owner must create OAuth client); no fake client id.
 */
export function GoogleSignInButton({ next = "/account" }: { next?: string }) {
  const configured = googleOAuthConfigured();
  const href = `/api/account/google/start?next=${encodeURIComponent(next)}`;

  if (!configured) {
    if (process.env.NODE_ENV === "production") return null; // hide the owner-setup notice from customers
    return (
      <div className="mt-6 rounded-xl border border-amber-400/40 bg-amber-500/10 px-4 py-3 text-xs text-amber-100">
        <p className="font-semibold text-amber-200">Google sign-in pending owner setup</p>
        <p className="mt-1 text-amber-100/90">
          Set <code className="text-amber-50">GOOGLE_CLIENT_ID</code> and{" "}
          <code className="text-amber-50">GOOGLE_CLIENT_SECRET</code> (shell / Worker secrets only — not{" "}
          <code className="text-amber-50">.env.local</code>). See{" "}
          <span className="font-medium">exports/members-auth/google-oauth-setup.md</span>.
        </p>
      </div>
    );
  }

  return (
    <div className="mt-6">
      <div className="relative my-4">
        <div className="absolute inset-0 flex items-center" aria-hidden>
          <div className="w-full border-t border-white/10" />
        </div>
        <div className="relative flex justify-center text-xs uppercase tracking-widest">
          <span className="bg-slate-950 px-3 text-slate-500">or</span>
        </div>
      </div>
      <Link
        href={href}
        className="flex w-full items-center justify-center gap-2 rounded-xl border border-white/20 bg-white/5 px-4 py-3 text-sm font-semibold text-white hover:bg-white/10"
      >
        Continue with Google
      </Link>
    </div>
  );
}
