import type { MetadataRoute } from "next";

/** Web app manifest (/manifest.webmanifest): name, brand colours and the 192/512 icons. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Canary Dashboard",
    short_name: "Canary",
    description: "US market health and ranked stock scanners in one dashboard. Education only.",
    start_url: "/",
    display: "standalone",
    background_color: "#020617",
    theme_color: "#020617",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
