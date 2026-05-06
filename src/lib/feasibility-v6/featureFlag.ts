// ZAAHI Feasibility v6.0 — feature-flag check.
//
// Per docs/specs/feasibility-v6/11_IMPLEMENTATION_PLAN.md §3.5, the v6 route
// is gated behind a server-evaluated env var. Layer 1 only for Sprint 1 —
// Layer 2 (per-user metadata override) is deferred.
//
// Behaviour matrix:
//   FEASIBILITY_V6_ENABLED = "true"   → enabled (route renders)
//   FEASIBILITY_V6_ENABLED = anything else (or unset) → disabled (notFound)
//
// Default-disabled. The route stays 404 in production until Sprint 11 cutover
// flips the Vercel env var to "true". Defence-in-depth: even if the route file
// ships, the gate keeps it dark.
//
// This file is server-side only (read by page.tsx in a Server Component).
// Do NOT import from a Client Component — VERCEL/server env vars are not
// inlined into the client bundle.

export const IS_FEASIBILITY_V6_ENABLED: boolean =
  process.env.FEASIBILITY_V6_ENABLED === 'true';

export function describeFeatureFlagEnv(): string {
  return `FEASIBILITY_V6_ENABLED=${process.env.FEASIBILITY_V6_ENABLED ?? 'unset'} → IS_FEASIBILITY_V6_ENABLED=${IS_FEASIBILITY_V6_ENABLED}`;
}
