import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Dev-only. The preview is opened at 127.0.0.1; without this, Next blocks the
  // HMR websocket (raw "Unauthorized") and the app never hydrates.
  allowedDevOrigins: ["127.0.0.1", "localhost"],
  // Always put <title>, description, canonical and OG tags in the initial <head> (no streamed
  // metadata), so every crawler and link-preview bot sees them without running JS.
  htmlLimitedBots: /.*/,
};

export default nextConfig;

import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";
// Members test mode (local only): MEMBERS_WRANGLER_CONFIG=wrangler.members-local.jsonc
// adds a local D1 binding during `next dev`. Unset (default) = unchanged behaviour.
initOpenNextCloudflareForDev(
  process.env.MEMBERS_WRANGLER_CONFIG
    ? { configPath: process.env.MEMBERS_WRANGLER_CONFIG }
    : undefined,
);

