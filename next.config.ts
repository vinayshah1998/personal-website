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
  // vgpu WGSL loader: resolves `.wgsl` import graphs at build time so shaders can
  // live in their own files and import from `@vgpu/wgsl-std`.
  turbopack: {
    rules: {
      "*.wgsl": {
        loaders: ["@vgpu/wgsl/loader-webpack"],
        as: "*.js",
      },
    },
  },
  webpack(config) {
    config.module ??= {};
    config.module.rules ??= [];
    config.module.rules.push({
      test: /\.wgsl$/,
      loader: "@vgpu/wgsl/loader-webpack",
      options: { minify: process.env.NODE_ENV === "production" },
    });
    return config;
  },
};

export default nextConfig;
