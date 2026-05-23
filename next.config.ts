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
// Ambassador program now lives at /refer (founder spec 2026-05-23 —
// 20% flat, no "tier" wording). The old /join URL is referenced in
// older WelcomeTour copy and external materials, so we permanently
// (308) redirect it. The /refer route itself is a separate backlog
// item — until it ships /refer renders the standard 404, which is
// the intended state during the rollout window.
const nextConfig: NextConfig = {
  async redirects() {
    return [
      { source: "/join", destination: "/refer", permanent: true },
    ];
  },
};

export default nextConfig;
