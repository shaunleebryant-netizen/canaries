import type { MetadataRoute } from "next";
import { ABOUT_PAGE, FOOTER_TUITION_LINK, LEGAL_PAGES } from "@/lib/featureFlags";

/**
 * Public pages only. Never list /owner, /api, /members or /account (private / gated).
 * /indicators is listed (owner 2026-10-05: real TradingView scripts for sale). /indicators/buy and
 * /indicators/checkout are form/stub steps and stay out.
 * /bookings (was /tuition, which now redirects) is left out while its footer link is hidden
 * (FOOTER_TUITION_LINK off).
 * /letter is left out because the page is marked noindex (signup lives on the homepage #letter).
 */
const BASE = "https://canarydashboard.com";
const PAGES: { path: string; priority: number; changeFrequency: "daily" | "weekly" | "monthly" }[] = [
  { path: "/", priority: 1, changeFrequency: "daily" },
  { path: "/signup", priority: 0.7, changeFrequency: "monthly" },
  { path: "/indicators", priority: 0.6, changeFrequency: "monthly" },
  { path: "/bookings", priority: 0.5, changeFrequency: "monthly" },
  { path: "/support", priority: 0.4, changeFrequency: "monthly" },
];

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();
  const base0 = FOOTER_TUITION_LINK ? PAGES : PAGES.filter((p) => p.path !== "/bookings");
  const base = ABOUT_PAGE ? [...base0, { path: "/about", priority: 0.5, changeFrequency: "monthly" as const }] : base0;
  const pages = LEGAL_PAGES
    ? [...base, { path: "/privacy", priority: 0.2, changeFrequency: "monthly" as const }, { path: "/terms", priority: 0.2, changeFrequency: "monthly" as const }]
    : base;
  return pages.map((p) => ({ url: `${BASE}${p.path === "/" ? "" : p.path}`, lastModified, changeFrequency: p.changeFrequency, priority: p.priority }));
}
