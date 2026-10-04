import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Playwright builds into its own folder (.next-e2e) so it never clobbers `npm run dev`'s .next.
  distDir: process.env.NEXT_DIST_DIR ?? ".next",
  images: {
    // Listing photos come from the seed data's placeholder host.
    remotePatterns: [{ protocol: "https", hostname: "picsum.photos" }],
  },
};

export default nextConfig;
