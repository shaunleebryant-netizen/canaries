import { ABOUT_PAGE, FOOTER_LOGIN_LINK, FOOTER_TUITION_LINK, LEGAL_PAGES } from "@/lib/featureFlags";

export function SiteFooter() {
  return (
    <footer className="border-t border-white/10 bg-slate-950">
      <div className="mx-auto max-w-5xl px-4 py-10 text-sm text-slate-400">
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
          <a href="/indicators" className="text-slate-300 hover:text-canary-gold">
            Indicators
          </a>
          <a href="/support" className="text-slate-300 hover:text-canary-gold">
            Support
          </a>
          {/* About (owner 2026-10-06): footer menu only, never the main header nav. */}
          {ABOUT_PAGE ? (
            <a href="/about" className="text-slate-300 hover:text-canary-gold">
              About
            </a>
          ) : null}
          {FOOTER_TUITION_LINK ? (
            <a href="/bookings" className="text-slate-300 hover:text-canary-gold">
              Bookings
            </a>
          ) : null}
          <a href="/signup" className="text-slate-300 hover:text-canary-gold">
            Dashboard
          </a>
          {/* Order (owner 2026-09-28 11:53 PM NZ): Log in, Privacy, Terms. */}
          {FOOTER_LOGIN_LINK ? (
            <a href="/account/login" className="text-slate-300 hover:text-canary-gold">
              Log in
            </a>
          ) : null}
          {LEGAL_PAGES ? (
            <>
              <a href="/privacy" className="text-slate-300 hover:text-canary-gold">
                Privacy
              </a>
              <a href="/terms" className="text-slate-300 hover:text-canary-gold">
                Terms
              </a>
            </>
          ) : null}
        </div>
        <p className="mt-6 font-medium text-slate-200">
          Education only — not investment advice.
        </p>
        <p className="mt-2 max-w-3xl leading-relaxed">
          Canary Dashboard publishes educational market-health readings. We do{" "}
          <span className="text-slate-200">not</span> provide stock recommendations.
          Nothing on this site is a recommendation to buy or sell any security. Past
          readings do not promise future performance. You are responsible for your own
          decisions.
        </p>
        <p className="mt-4 text-xs text-slate-500">
          © {new Date().getFullYear()} Canary Dashboard
        </p>
        <address className="mt-2 text-[11px] not-italic leading-relaxed tracking-wide text-slate-500">
          CANARY DASHBOARD PTE. LTD.
          <br />
          UEN: 202643811M
          <br />
          Registered in Singapore
        </address>
      </div>
    </footer>
  );
}
