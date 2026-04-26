// Production-environment detection for the localhost-only Mole Agent preview.
//
// This route is internal preview tooling for the §41 Mole Agent Phase 1 v0.1
// underground layers (per docs/research/mole-data-acquisition-log.md). It MUST
// NOT be reachable on the production deploy of zaahi.io. The matrix:
//
//   pnpm dev (localhost)                       → IS_PRODUCTION_DEPLOY = false → route accessible
//   pnpm build && pnpm start (local prod)      → IS_PRODUCTION_DEPLOY = false → route accessible
//   Vercel preview deploy (any branch)         → IS_PRODUCTION_DEPLOY = false → route accessible (Жан + Dymo can share preview URL)
//   Vercel production deploy (main branch)     → IS_PRODUCTION_DEPLOY = true  → route returns 404
//
// We need both signals because:
//   - process.env.NODE_ENV is auto-inlined by Next.js into the client bundle but is
//     also "production" during `pnpm build && pnpm start` — so it alone cannot
//     distinguish a Vercel production deploy from any other production-mode build.
//   - process.env.VERCEL_ENV exists ONLY server-side; client bundles cannot read it.
//     The NEXT_PUBLIC_ prefixed variant IS exposed to the client at build time —
//     Vercel automatically populates VERCEL_ENV but does NOT auto-mirror it to
//     NEXT_PUBLIC_VERCEL_ENV. Project owners MUST set NEXT_PUBLIC_VERCEL_ENV
//     explicitly per environment for this guard to fire on production.
//
// Vercel project setup (one-time, by Жан):
//   Vercel dashboard → zaahi project → Settings → Environment Variables
//   Add: NEXT_PUBLIC_VERCEL_ENV = "production"  (scope: Production only)
//   Add: NEXT_PUBLIC_VERCEL_ENV = "preview"     (scope: Preview only)
//   Without these, Vercel production deploys would still serve the preview route.
//
// The guard is intentionally defence-in-depth — production-deploy AND
// production-env-var must BOTH be true. Either alone is insufficient.

export const IS_PRODUCTION_DEPLOY: boolean =
  process.env.NODE_ENV === 'production' &&
  process.env.NEXT_PUBLIC_VERCEL_ENV === 'production';

// Sanity helper for debugging — never read by the route logic, only useful in
// console.log if Жан needs to confirm what the build sees.
export function describePreviewEnv(): string {
  return `NODE_ENV=${process.env.NODE_ENV ?? 'unset'} NEXT_PUBLIC_VERCEL_ENV=${process.env.NEXT_PUBLIC_VERCEL_ENV ?? 'unset'} → IS_PRODUCTION_DEPLOY=${IS_PRODUCTION_DEPLOY}`;
}
