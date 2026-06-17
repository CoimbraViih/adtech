import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const isProd = process.env.NODE_ENV === "production";

const nextConfig: NextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**.supabase.co" },
      { protocol: "https", hostname: "oaidalleapiprodscus.blob.core.windows.net" },
    ],
  },
  async headers() {
    // Next.js 15 App Router generates inline RSC hydration scripts
    // (self.__next_f.push(...)) that are inlined into the HTML. These are blocked
    // by a strict 'self'-only script-src, causing React to never initialize on the
    // client and producing a blank page. 'unsafe-inline' is required for production.
    // In development, 'unsafe-eval' is additionally needed for HMR.
    const scriptSrc = isProd
      ? "script-src 'self' 'unsafe-inline'"
      : "script-src 'self' 'unsafe-inline' 'unsafe-eval'";

    const headers = [
      { key: "X-Frame-Options",            value: "DENY" },
      { key: "X-Content-Type-Options",     value: "nosniff" },
      { key: "Referrer-Policy",            value: "strict-origin-when-cross-origin" },
      { key: "Permissions-Policy",         value: "camera=(), microphone=(), geolocation=()" },
      { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
      {
        key: "Content-Security-Policy",
        value: [
          "default-src 'self'",
          scriptSrc,
          "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
          "font-src 'self' https://fonts.gstatic.com",
          "img-src 'self' data: blob: https:",
          "connect-src 'self' https://*.supabase.co https://api.stripe.com https://*.sentry.io",
          "frame-ancestors 'none'",
        ].join("; "),
      },
    ];

    // HSTS: tell browsers to always use HTTPS for 2 years (production only)
    if (isProd) {
      headers.push({
        key: "Strict-Transport-Security",
        value: "max-age=63072000; includeSubDomains; preload",
      });
    }

    return [{ source: "/(.*)", headers }];
  },
};

export default withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  silent: !process.env.CI,
  widenClientFileUpload: true,
  sourcemaps: { deleteSourcemapsAfterUpload: true },
  webpack: {
    treeshake: { removeDebugLogging: true },
    automaticVercelMonitors: true,
  },
});
