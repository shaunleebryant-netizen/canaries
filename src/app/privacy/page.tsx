import { notFound } from "next/navigation";
import { LEGAL_PAGES } from "@/lib/featureFlags";

export const metadata = {
  title: "Privacy policy",
  description: "How Canary Dashboard collects, uses and protects your personal data.",
  alternates: { canonical: "/privacy" },
};

const UPDATED = "28 September 2026";

export default function PrivacyPage() {
  if (!LEGAL_PAGES) notFound();
  return (
    <div className="mx-auto max-w-3xl px-4 py-14 text-slate-300">
      <h1 className="text-3xl font-semibold text-white">Privacy policy</h1>
      <p className="mt-2 text-sm text-slate-400">Last updated {UPDATED}</p>

      <div className="mt-8 space-y-8 text-sm leading-relaxed">
        <section>
          <h2 className="text-lg font-semibold text-white">Who we are</h2>
          <p className="mt-2">
            Canary Dashboard is run by CANARY DASHBOARD PTE. LTD. (UEN 202643811M), a company
            registered in Singapore (&ldquo;we&rdquo;, &ldquo;us&rdquo;). This policy explains what
            personal data we collect through canarydashboard.com, why we collect it and how we look
            after it, in line with Singapore&rsquo;s Personal Data Protection Act 2012 (PDPA).
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-white">What we collect</h2>
          <ul className="mt-2 list-disc space-y-2 pl-5">
            <li>
              <span className="text-slate-100">Weekly letter:</span> your email address, your name
              if you give it, when you signed up and whether you confirmed your email.
            </li>
            <li>
              <span className="text-slate-100">Support form:</span> your name, email address, the
              type of issue and your message.
            </li>
            <li>
              <span className="text-slate-100">Members area:</span> your email address, a securely
              hashed password (we never store the password itself), login sessions, your plan and
              renewal dates.
            </li>
            <li>
              <span className="text-slate-100">Payments:</span> handled by Stripe. We receive your
              customer and subscription references and payment status. We never see or store your
              full card number.
            </li>
            <li>
              <span className="text-slate-100">Technical data:</span> to stop spam and abuse we keep
              a one-way hashed version of your IP address for a short time. We use Cloudflare Web
              Analytics, which counts page visits without cookies and without building a profile of
              you.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-white">How we use it</h2>
          <ul className="mt-2 list-disc space-y-2 pl-5">
            <li>To send the weekly letter you asked for (you can unsubscribe from any email).</li>
            <li>To reply to your support requests.</li>
            <li>To run your membership: logging in, billing, renewals and account emails.</li>
            <li>To keep the site secure and working properly.</li>
          </ul>
          <p className="mt-2">
            We do not sell your personal data, and we do not use it for third-party advertising.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-white">Cookies</h2>
          <p className="mt-2">
            We only use cookies that the site needs to work, such as keeping you logged in to the
            members area. We do not use advertising or tracking cookies. The homepage video is hosted
            on this site, with no third-party player.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-white">Who we share it with</h2>
          <p className="mt-2">
            We use a small number of trusted service providers who process data for us:
          </p>
          <ul className="mt-2 list-disc space-y-2 pl-5">
            <li>
              <span className="text-slate-100">Cloudflare</span> hosts the website and our database
              (Cloudflare Workers and D1).
            </li>
            <li>
              <span className="text-slate-100">Resend</span> sends our emails, such as the letter,
              confirmations and support replies.
            </li>
            <li>
              <span className="text-slate-100">Stripe</span> processes membership payments.
            </li>
          </ul>
          <p className="mt-2">
            These providers may store data outside Singapore, for example in the United States. We
            choose providers that protect personal data to a standard comparable to the PDPA. We may
            also disclose data where the law requires it.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-white">How long we keep it</h2>
          <p className="mt-2">
            We keep your data only as long as we need it for the purposes above, or as long as the
            law requires (for example, payment records for tax purposes). If you unsubscribe or close
            your account, we delete or anonymise data we no longer need.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-white">Your choices and rights</h2>
          <p className="mt-2">
            You can ask to see the personal data we hold about you, ask us to correct it, or
            withdraw your consent to us using it (for example, by unsubscribing from the letter).
            If you withdraw consent, we may no longer be able to provide some services. We aim to
            reply within 30 days.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-white">Keeping data safe</h2>
          <p className="mt-2">
            We use reasonable security measures, including encrypted connections (HTTPS), hashed
            passwords and limited access to our systems. No system is perfectly secure, and we will
            tell you and the authorities about a notifiable data breach as the PDPA requires.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-white">Contact us</h2>
          <p className="mt-2">
            For any privacy question or request, email{" "}
            <a href="mailto:shaun@canarydashboard.com" className="text-canary-gold hover:underline">
              shaun@canarydashboard.com
            </a>
            . We may update this policy from time to time and will change the date at the top when
            we do.
          </p>
        </section>
      </div>
    </div>
  );
}
