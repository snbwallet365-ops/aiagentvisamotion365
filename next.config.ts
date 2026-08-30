import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  // Arena's browser preview is served from a separate origin.
  allowedDevOrigins: ["3000-i5tuo7ku7ym8zi05wlpgo.e2b.app"],
  compress: true,
  reactStrictMode: true,
  images: {
    remotePatterns: [{ protocol: "https", hostname: "image.pollinations.ai" }],
  },
  experimental: {
    // Ship only the icons/components actually imported from these packages.
    optimizePackageImports: ["framer-motion", "drizzle-orm"],
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
    ];
  },
};

export default nextConfig;
