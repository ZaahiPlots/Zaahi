import type { NextConfig } from "next";

/**
 * Each /api/layers/* route handler reads exactly one geojson / KML from
 * `data/layers/...` via a single static `path.join(process.cwd(), 'data',
 * 'layers', '...')` const. Next.js's output file tracing detects that
 * literal path during the build and automatically bundles just that one
 * file with the function — no `outputFileTracingIncludes` needed.
 *
 * We previously tried `outputFileTracingIncludes: { "/api/layers/**\/*":
 * ["./data/layers/**\/*"] }` which forced every layer function to bundle
 * the entire 54 MB of layer data. On Vercel Hobby (50 MB per-function
 * limit) that pushed each function over the limit, the data was stripped
 * silently, and every layer endpoint returned 500 ENOENT. Letting the
 * implicit per-route tracing do its job keeps each function at the
 * single file it actually needs (≤4 MB).
 */
const nextConfig: NextConfig = {
  // The legacy 3-tier Ambassador / paid-tier signup pages were retired
  // 2026-04-30 in favour of a single-tier referral program (Phase A only:
  // a Coming Soon landing at /refer). Any inbound link to /ambassador,
  // /ambassador-terms, /join, or /r/<code> permanently redirects to /refer.
  async redirects() {
    return [
      { source: '/ambassador', destination: '/refer', permanent: true },
      { source: '/ambassador-terms', destination: '/refer', permanent: true },
      { source: '/join', destination: '/refer', permanent: true },
      { source: '/r/:code', destination: '/refer', permanent: true },
    ];
  },
};

export default nextConfig;
