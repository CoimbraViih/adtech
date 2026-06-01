import type { NextConfig } from "next";

const isProd = process.env.NODE_ENV === "production";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**.supabase.co" },
      { protocol: "https", hostname: "oaidalleapiprodscus.blob.core.windows.net" },
    ],
  },
  async headers() {
    // In production, Next.js 15 App Router loads all scripts as external files
    // from the same origin — no inline scripts needed, so 'unsafe-inline' is safe
    // to remove entirely, which restores CSP XSS protection.
    // In development, 'unsafe-inline' + 'unsafe-eval' are still needed for HMR.
    const scriptSrc = isProd
      ? "script-src 'self'"
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
          "connect-src 'self' https:",
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

export default nextConfig;
