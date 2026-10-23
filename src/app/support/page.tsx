import { SupportForm } from "@/components/SupportForm";

export const metadata = {
  alternates: { canonical: "/support" },
  title: "Support",
  description: "Contact Canary Dashboard support for login, billing, or dashboard help.",
};

export default function SupportPage() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-14">
      <p className="text-xs font-semibold uppercase tracking-widest text-canary-gold">
        Support
      </p>
      <h1 className="mt-2 text-3xl font-semibold text-white">How can we help?</h1>
      <p className="mt-3 max-w-xl text-sm text-slate-400">
        Login, billing, dashboard, or other questions. We reply by email.
      </p>

      <div className="mt-10 grid gap-10 md:grid-cols-2">
        <div>
          <h2 className="text-lg font-semibold text-white">Direct email</h2>
          <a
            href="mailto:shaun@canarydashboard.com"
            className="mt-2 inline-block text-canary-gold hover:underline"
          >
            shaun@canarydashboard.com
          </a>
          <p className="mt-6 text-sm leading-relaxed text-slate-400">
            Prefer a form? Leave your details and we’ll get back to you.
          </p>
        </div>
        <SupportForm />
      </div>
    </div>
  );
}
