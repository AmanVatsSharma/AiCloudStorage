import type { NextConfig } from "next";

// Centralized Next.js configuration with security headers and image domains
const nextConfig: NextConfig = {
  reactStrictMode: true,
  images: {
    domains: [
      "localhost",
      // Supabase storage domains used by this app
      "vwbzxklttacbrcnxbxpw.supabase.co",
      "idbjagstpgidlkjklhlv.supabase.co",
    ],
  },
  eslint: {
    // Allow builds to succeed even if linting fails in CI bootstraps
    ignoreDuringBuilds: true,
  },
  async headers() {
    const csp = [
      "default-src 'self'",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors 'self'",
      "img-src 'self' data: blob: https:",
      "media-src 'self' data: blob: https:",
      "object-src 'none'",
      "style-src 'self' 'unsafe-inline' https:",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https:",
      "connect-src 'self' https: wss:",
      // Allow Supabase Realtime/websocket and API
      "frame-src 'self' https://*.supabase.co",
    ].join("; ");

    const securityHeaders = [
      { key: "Content-Security-Policy", value: csp },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "X-Frame-Options", value: "SAMEORIGIN" },
      { key: "X-DNS-Prefetch-Control", value: "on" },
      // Enable HSTS for 6 months (adjust as needed), include subdomains and preload
      {
        key: "Strict-Transport-Security",
        value: "max-age=15552000; includeSubDomains; preload",
      },
      { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
    ];

    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
