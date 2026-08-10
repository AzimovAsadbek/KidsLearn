import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Ships only the traced server into the Docker runtime image.
  output: "standalone",
  outputFileTracingRoot: __dirname + "/../..",
  // The shared contract package is TypeScript source in the workspace.
  transpilePackages: ["@kidslearn/types"],
  reactStrictMode: true,
  poweredByHeader: false,
  images: {
    // Media is served from S3-compatible storage; the host is configured per
    // environment rather than hard-coded.
    remotePatterns: process.env.NEXT_PUBLIC_MEDIA_HOST
      ? [{ protocol: "https", hostname: process.env.NEXT_PUBLIC_MEDIA_HOST }]
      : [],
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Permissions-Policy", value: "camera=(), geolocation=(), microphone=(self)" },
        ],
      },
      {
        // The service worker must never be cached, or an update can never land.
        source: "/sw.js",
        headers: [{ key: "Cache-Control", value: "no-cache, no-store, must-revalidate" }],
      },
    ];
  },
};

export default nextConfig;
