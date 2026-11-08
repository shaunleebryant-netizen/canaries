import { FreeSignupForm } from "./FreeSignupForm";
import { previewTierEnabled } from "@/lib/members/previewTier";

export const metadata = { title: "Create a free account", robots: { index: false, follow: false } };

export default function FreeSignupPage() {
  const open = previewTierEnabled();
  return (
    <div className="mx-auto max-w-lg px-4 py-14">
      <p className="text-xs font-semibold uppercase tracking-widest text-canary-gold">Free account</p>
      <h1 className="mt-2 text-3xl font-semibold text-white">Create a free account</h1>
      <p className="mt-3 text-sm text-slate-300">Limited free access</p>
      <p className="mt-3 text-sm leading-relaxed text-slate-400">
        A free account can open the ETF tab and a read-only Decide overview. Other tabs stay locked. Paid membership is separate and is not charged from this form.
      </p>
      {open ? (
        <FreeSignupForm />
      ) : (
        <p className="mt-6 rounded-xl border border-white/10 p-4 text-sm text-slate-300">
          Free signup is off in this environment. It runs only when the isolated preview flag is set, and it is ignored in production.
        </p>
      )}
      <p className="mt-8 text-sm text-slate-400">
        Already using the preview? <a className="underline" href="/members/login">Paid preview login</a> uses the local members password and stays on the paid tier.
      </p>
    </div>
  );
}
