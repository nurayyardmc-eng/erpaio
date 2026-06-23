import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";
import bundleAnalyzer from "@next/bundle-analyzer";
import path from "node:path";

// `ANALYZE=true npm run build` ile bundle stats HTML rapor üretir.
// Default'ta no-op, prod build'i etkilemez.
const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === "true",
  openAnalyzer: false,
});

// Content-Security-Policy notes:
// - 'unsafe-inline' required for:
//     * <script type="application/ld+json"> in layout.tsx (Schema.org JSON-LD)
//     * styled-jsx generated <style> tags
// - 'unsafe-eval' required by Sentry replay/sourcemap helpers in dev/production
// - connect-src tightened to explicit hosts (was wildcard https:/wss:)
// - object-src 'none' + base-uri 'self' = defense in depth
// Future hardening path: generate per-request nonce in proxy, replace
// 'unsafe-inline' with nonce-based scripting; remove 'unsafe-eval' once Sentry
// SDK ships eval-free build.
const securityHeaders = [
  { key: "X-DNS-Prefetch-Control", value: "on" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  { key: "Cross-Origin-Resource-Policy", value: "same-site" },
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://*.sentry.io https://browser.sentry-cdn.com",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https:",
      "font-src 'self' data:",
      // Only the hosts we actually call from the browser
      "connect-src 'self' https://*.sentry.io https://*.ingest.sentry.io https://api.anthropic.com https://*.supabase.co https://*.upstash.io",
      "frame-ancestors 'none'",
      "frame-src 'self'",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "upgrade-insecure-requests",
    ].join("; "),
  },
];

const nextConfig: NextConfig = {
  turbopack: {
    root: path.resolve(__dirname),
  },
  outputFileTracingRoot: path.resolve(__dirname),
  // PostHog reverse proxy: route analytics through our own origin so that
  // (a) the tightened CSP connect-src/script-src 'self' covers it (PostHog
  // hosts are intentionally NOT whitelisted) and (b) ad-blockers — which
  // block *.posthog.com but not same-origin first-party paths — stop eating
  // client events. Without this, ZERO client events arrive (proven: a real
  // visitor ran the demo, nothing reached PostHog). Static assets + ingestion
  // target the US region (matches the phc_ project key). skipTrailingSlash-
  // Redirect stops PostHog's trailing-slash endpoints from 308-redirecting
  // and dropping the rewrite.
  skipTrailingSlashRedirect: true,
  async rewrites() {
    return [
      {
        source: "/ingest/static/:path*",
        destination: "https://us-assets.i.posthog.com/static/:path*",
      },
      {
        source: "/ingest/:path*",
        destination: "https://us.i.posthog.com/:path*",
      },
    ];
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
};

export default withSentryConfig(withBundleAnalyzer(nextConfig), {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,
  silent: !process.env.CI,
  widenClientFileUpload: true,
});
