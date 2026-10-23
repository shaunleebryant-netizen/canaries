import { notFound } from "next/navigation";
import { LEGAL_PAGES } from "@/lib/featureFlags";

export const metadata = {
  title: "Terms of use",
  description: "The terms for using Canary Dashboard and its membership.",
  alternates: { canonical: "/terms" },
};

const UPDATED = "28 September 2026";

export default function TermsPage() {
  if (!LEGAL_PAGES) notFound();
  return (
    <div className="mx-auto max-w-3xl px-4 py-14 text-slate-300">
      <h1 className="text-3xl font-semibold text-white">Terms of use</h1>
      <p className="mt-2 text-sm text-slate-400">Last updated {UPDATED}</p>

      <div className="mt-8 space-y-8 text-sm leading-relaxed">
        <section>
          <h2 className="text-lg font-semibold text-white">About these terms</h2>
          <p className="mt-2">
            canarydashboard.com is run by CANARY DASHBOARD PTE. LTD. (UEN 202643811M), registered in
            Singapore (&ldquo;we&rdquo;, &ldquo;us&rdquo;). By using the site, the weekly letter or a
            membership, you agree to these terms. If you don&rsquo;t agree, please don&rsquo;t use
            the site.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-white">Education only, not advice</h2>
          <p className="mt-2">
            Everything on Canary Dashboard, including the traffic light, the canaries, the scanner
            lists, the letter, reviews and tuition, is for education and general information only.
            It is not investment, financial, tax or legal advice, and it is not a recommendation to
            buy, sell or hold any security. We don&rsquo;t know your personal situation. Past
            readings do not promise future results. You are responsible for your own decisions, and
            you may want to speak to a licensed adviser before you invest.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-white">Your account</h2>
          <p className="mt-2">
            Keep your login details private. A membership is for one person, so please don&rsquo;t
            share your account or pass on members-only content. We may suspend an account that is
            shared or misused.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-white">Membership and renewal</h2>
          <ul className="mt-2 list-disc space-y-2 pl-5">
            <li>Membership is billed in advance through Stripe, yearly (or monthly where a monthly plan is offered).</li>
            <li>
              It renews automatically at the end of each paid period at the price shown when you
              joined, unless you turn off auto-renew. Founding members keep their launch price for as long as they keep
              renewing.
            </li>
            <li>
              You can turn off auto-renew at any time from your account page. You keep your access
              until the end of the period you have paid for.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-white">Acceptable use</h2>
          <p className="mt-2">
            Please don&rsquo;t copy, resell or republish the dashboard, its data or its lists; scrape
            or overload the site; or try to get around logins or security.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-white">Our content</h2>
          <p className="mt-2">
            The site, its design, readings, lists and written content belong to us or our licensors.
            You may use them for your own personal learning.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-white">Availability and accuracy</h2>
          <p className="mt-2">
            We work hard to keep the dashboard accurate and online, but data can be late, incomplete
            or wrong, and the site may sometimes be unavailable. The service is provided &ldquo;as
            is&rdquo;. We may change or improve features over time.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-white">Limits on our liability</h2>
          <p className="mt-2">
            As far as the law allows, we are not liable for any trading or investment losses, or for
            indirect losses, that come from using the site. Nothing in these terms limits any rights
            you have that cannot be excluded by law.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-white">Changes and governing law</h2>
          <p className="mt-2">
            We may update these terms and will change the date at the top when we do. These terms
            are governed by the laws of Singapore.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-white">Contact us</h2>
          <p className="mt-2">
            Questions? Email{" "}
            <a href="mailto:shaun@canarydashboard.com" className="text-canary-gold hover:underline">
              shaun@canarydashboard.com
            </a>
            .
          </p>
        </section>
      </div>
    </div>
  );
}
