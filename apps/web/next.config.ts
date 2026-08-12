import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Ships only the traced server into the Docker runtime image. Vercel has
  // its own output pipeline and the two collide, so standalone is skipped there.
  output: process.env.VERCEL ? undefined : "standalone",
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
  async rewrites() {
    // In production the API is a separate deployment; proxying it through the
    // web origin keeps auth cookies first-party and makes CORS moot.
    const target = process.env.API_PROXY_TARGET;
    if (!target) return [];
    return [
      { source: "/api/v1/:path*", destination: `${target}/api/v1/:path*` },
      { source: "/api/docs", destination: `${target}/api/docs` },
      { source: "/api/docs-json", destination: `${target}/api/docs-json` },
    ];
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
