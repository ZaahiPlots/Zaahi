// ── Ambassador plan constants (client-safe) ──────────────────────────
// Pure data — no node-only imports. Safe to reference from client-side
// React components. Server code continues to import the same names from
// `@/lib/ambassador`, which re-exports these.
//
// Mirror of CLAUDE.md "Ambassador Program Rules". DO NOT change without
// founder approval.

export const PLAN_COMMISSION_RATES = {
  SILVER:   { L1: 0.05, L2: 0.02, L3: 0.01 },
  GOLD:     { L1: 0.10, L2: 0.04, L3: 0.01 },
  PLATINUM: { L1: 0.15, L2: 0.06, L3: 0.01 },
} as const;

export const PLAN_PRICES_AED = {
  SILVER: 1000,
  GOLD: 5000,
  PLATINUM: 15000,
} as const;

export const PLAN_PRICES_USDT = {
  SILVER: 272,
  GOLD: 1361,
  PLATINUM: 4084,
} as const;

export type AmbassadorPlan = keyof typeof PLAN_COMMISSION_RATES;
