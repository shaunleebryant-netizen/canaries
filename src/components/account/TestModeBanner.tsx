import { billingBackend } from "@/lib/members/stripe";
import { stripeKeyMode } from "@/lib/members/config";

export function TestModeBanner() {
  const backend = billingBackend();
  const mode = stripeKeyMode();
  if (backend === "stripe" && mode === "live") return null;
  const text =
    backend === "mock"
      ? "TEST MODE · local Stripe mock (no Stripe API calls, nothing charged)"
      : backend === "stripe"
        ? "TEST MODE · Stripe test keys (use card 4242 4242 4242 4242)"
        : "Billing not configured (no Stripe keys)";
  return (
    <div className="mb-6 rounded-xl border border-amber-400/40 bg-amber-500/10 px-4 py-2 text-center text-xs font-semibold uppercase tracking-widest text-amber-200">
      {text}
    </div>
  );
}
