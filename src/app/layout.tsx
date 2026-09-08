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
        <div className="flex min-h-screen flex-col">
          <header className="border-b border-slate-200 bg-white/80 backdrop-blur">
            <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
              <a href="/" className="flex items-center gap-2 font-semibold text-slate-900">
                <span aria-hidden className="text-xl">🐤</span>
                Coherant Canary
              </a>
              <nav className="flex items-center gap-4 text-sm text-slate-600">
                <a href="/#letter" className="hover:text-slate-900">
                  Weekly letter
                </a>
                <a href="/members" className="hover:text-slate-900">
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
