import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Removed output: 'export' to enable API routes
  trailingSlash: true,
  images: {
    unoptimized: true
  },
  experimental: {
    staleTimes: {
      dynamic: 600, // 10 minutes - matches ISR revalidate period
    },
  },
};

export default nextConfig;
