import type { Metadata } from "next";
import Script from "next/script";
import "./globals.css";
import { SiteFooter } from "@/components/Footer";

const SITE_TITLE = "Canary Dashboard: US Market Health Dashboard & Stock Scanners";
const SITE_DESCRIPTION =
  "One dashboard for US market health: a green, amber or red traffic light built from 13 market canaries, plus daily-ranked stock scanners. Education only.";

export const metadata: Metadata = {
  metadataBase: new URL("https://canarydashboard.com"),
  title: {
    default: SITE_TITLE,
    template: "%s · Canary Dashboard",
  },
  description: SITE_DESCRIPTION,
  applicationName: "Canary Dashboard",
  // Favicon set made from the canary brand mark (public/icon.svg). Google needs a crawlable
  // favicon at a multiple of 48px: /favicon.ico carries 16/32/48, plus 192/512 in the manifest.
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "48x48" },
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180" }],
  },
  manifest: "/manifest.webmanifest",
  openGraph: {
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    url: "https://canarydashboard.com",
    siteName: "Canary Dashboard",
    type: "website",
    locale: "en_US",
    images: [{ url: "/og-image.png", width: 1200, height: 630, alt: "Canary Dashboard: market health traffic light and ranked scanners" }],
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    images: ["/og-image.png"],
  },
  // Canonical is set per page (a site-wide root canonical would point every page at "/").
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">
        <div className="flex min-h-screen flex-col bg-slate-950 text-slate-100">
          <header className="border-b border-white/10 bg-slate-950/80 backdrop-blur">
            <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-4">
              <a href="/" className="flex items-center gap-2 font-semibold text-white">
                <span aria-hidden className="text-xl">
                  🐤
                </span>
                Canary Dashboard
              </a>
              <nav className="flex flex-wrap items-center justify-end gap-x-4 gap-y-2 text-sm text-slate-300">
                <a href="/indicators" className="hover:text-canary-gold">
                  Indicators
                </a>
                <a href="/support" className="hover:text-canary-gold">
                  Support
                </a>
                <a
                  href="/signup"
                  className="rounded-lg bg-canary-gold px-3.5 py-1.5 text-sm font-semibold text-slate-950 hover:bg-yellow-400"
                >
                  Dashboard
                </a>
              </nav>
            </div>
          </header>
          <main className="flex-1">{children}</main>
          <SiteFooter />
        </div>
        {/* Cloudflare Web Analytics (RUM) — site canarydashboard.com, site tag a5ddddf4b6474efc996d0d5e3daa8250.
            Token is public (not a secret). Manual beacon because zone auto-install does not inject into Worker responses. */}
        <Script
          id="cf-web-analytics"
          strategy="afterInteractive"
          src="https://static.cloudflareinsights.com/beacon.min.js"
          data-cf-beacon='{"token": "ed7d93355360477f99fc2189a3a0d531"}'
          defer
        />
      </body>
    </html>
  );
}
