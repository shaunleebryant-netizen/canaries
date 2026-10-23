import type { Metadata } from "next";
import Link from "next/link";
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
              <Link href="/" className="flex items-center gap-2 font-semibold text-white">
                <span aria-hidden className="text-xl">
                  🐤
                </span>
                Coherant Canary
              </Link>
              <nav className="flex flex-wrap items-center justify-end gap-x-4 gap-y-2 text-sm text-slate-300">
                <Link href="/#seminar" className="hover:text-canary-gold">
                  Singapore seminar
                </Link>
                <Link href="/#letter" className="hover:text-canary-gold">
                  Weekly letter
                </Link>
                <Link href="/indicators" className="hover:text-canary-gold">
                  Indicators
                </Link>
                <Link href="/tuition" className="hover:text-canary-gold">
                  Tuition
                </Link>
                <Link href="/members" className="hover:text-canary-gold">
                  Members
                </Link>
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
