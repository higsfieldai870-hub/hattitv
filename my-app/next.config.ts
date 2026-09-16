import type { NextConfig } from "next";
import { OPTIMIZED_IMAGE_SOURCES } from "./lib/images";

// Images go through Vercel's /_next/image optimizer, which bills per
// transformation and returns 402 once the plan's quota is used up. Every
// setting below exists to keep the number of distinct transformations small.
const nextConfig: NextConfig = {
  images: {
    remotePatterns: OPTIMIZED_IMAGE_SOURCES.map(({ hostname, pathname }) => ({
      protocol: "https",
      hostname,
      pathname: `${pathname}**`,
      search: "",
    })),
    qualities: [75],
    // Each width is its own transformation; nothing needs more than 1920px.
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
    // TMDB and Streamed image paths change whenever the picture does, so a
    // transformed copy can be cached for a month without going stale.
    minimumCacheTTL: 2678400,
  },
};

export default nextConfig;
