import type { Metadata } from "next";
import "./globals.css";
import { SiteFooter } from "@/components/Footer";

export const metadata: Metadata = {
  title: "Coherant Canary",
  description:
    "Mine-metaphor market health: healthy canaries → stay in market; dying → get defensive. Education only.",
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
            <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
              <a href="/" className="flex items-center gap-2 font-semibold text-white">
                <span aria-hidden className="text-xl">
                  🐤
                </span>
                Coherant Canary
              </a>
              <nav className="flex items-center gap-4 text-sm text-slate-300">
                <a href="/#seminar" className="hover:text-canary-gold">
                  Singapore seminar
                </a>
                <a href="/#letter" className="hover:text-canary-gold">
                  Weekly letter
                </a>
                <a href="/members" className="hover:text-canary-gold">
                  Members
                </a>
              </nav>
            </div>
          </header>
          <main className="flex-1">{children}</main>
          <SiteFooter />
        </div>
      </body>
    </html>
  );
}
