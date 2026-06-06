// ZAAHI Feasibility v6 — per-unit revenue models for non-psf engines.
//
// The v5 math kernel multiplies SFA × salesPsf (for BtS) or SFA ×
// monthlyRent (for BtR). That formula breaks for asset classes whose
// revenue is not driven by floor area:
//
//   Hospitality  → ADR × keys × occupancy × 365
//   Healthcare   → annual revenue per bed × bed count
//   Educational  → tuition per student × student count
//   Data Center  → annual colocation revenue per MW × MW count
//
// Rather than changing the v5 kernel (Strangler-Fig invariant), we
// SYNTHESISE an equivalent psf number on the v6 side: compute the
// correct revenue per the engine's real model, then back into the psf
// the kernel needs. The result is mathematically correct for the
// engine while leaving v5 untouched.
//
// Founder ratification 2026-06-09: per-unit defaults are research
// midpoints; user can override every input in the new "Asset model"
// panel that renders for these engines.

import type { EngineId } from './engines';

// ── Per-unit defaults (research-grade midpoints) ──────────────────────
//
// Sourced from the same publications cited in engines.ts:
//   Hospitality  — HVS Middle East 2025 5★ ADR midpoint
//   Healthcare   — DHA/DHCC private hospital revenue/bed
//   Educational  — KHDA premium-tier tuition
//   Data Center  — JLL Global DC Outlook 2025 + Khazna colocation
//
// "Unit area" is the floor area each unit consumes (sqm/key, sqm/bed,
// sqm/student, sqm/MW). Used to auto-suggest unit count from BUA.

export interface PerUnitDefaults {
  // Operating revenue inputs.
  perUnitAnnualRevenueAed?: number;  // healthcare, educational, datacenter
  adrAed?: number;                   // hospitality only
  // Unit-area for auto-deriving unit count from BUA.
  unitAreaSqm: number;
  unitLabel: string;                 // "keys", "beds", "students", "MW"
  // Exit-cap-rate for BtS sale of operating asset.
  exitCapRatePct: number;
}

export const PER_UNIT_DEFAULTS: Partial<Record<EngineId, PerUnitDefaults>> = {
  hospitality: {
    adrAed: 1200,
    unitAreaSqm: 55,           // 5★ international standard: ~55-65 sqm/key
    unitLabel: 'keys',
    exitCapRatePct: 7.0,       // 5★ Dubai branded hotel cap rate Q1 2026
  },
  healthcare: {
    perUnitAnnualRevenueAed: 1_400_000, // AED 1.4 M / bed / year, DHCC midpoint
    unitAreaSqm: 80,           // ~80 sqm/bed incl. clinical + circulation
    unitLabel: 'beds',
    exitCapRatePct: 7.5,
  },
  educational: {
    perUnitAnnualRevenueAed: 80_000, // AED 80k / student / year, KHDA premium
    unitAreaSqm: 12,           // ~12 sqm/student incl. shared facilities
    unitLabel: 'students',
    exitCapRatePct: 8.0,
  },
  datacenter: {
    perUnitAnnualRevenueAed: 12_000_000, // AED 12 M / MW / year colocation
    unitAreaSqm: 400,          // ~400 sqm/MW incl. cooling + power
    unitLabel: 'MW',
    exitCapRatePct: 8.0,
  },
};

export function isPerUnitEngine(engineId: EngineId): boolean {
  return engineId in PER_UNIT_DEFAULTS;
}

// ── Synthesise an equivalent BtS sales psf ────────────────────────────
//
// The kernel will compute: grossRevenue = SFA × salesPsf
// We want:                  grossRevenue = exitValue (capitalised NOI)
// So:                       salesPsf = exitValue / SFA
//
//   annualGrossRev = unitCount × revenuePerUnit (× occupancy where it
//                    isn't already absorbed into the unit revenue, e.g.
//                    hospitality where ADR × occ × 365 IS the rev/key)
//   NOI            = annualGrossRev × (1 - operatingPct/100)
//   exitValue      = NOI / (exitCapRatePct/100)
//
// Returns 0 when SFA = 0 (can't derive psf).
export interface PerUnitBtSInput {
  engineId: EngineId;
  unitCount: number;
  // For hospitality: ADR (AED/night); pre-applied to compute annual rev
  // For healthcare/educational/datacenter: annual revenue per unit (AED)
  perUnitAnnualRevenueAed: number;
  occupancyPct: number;
  operatingPct: number;
  exitCapRatePct: number;
  sfaSqft: number;
}

export interface PerUnitBtSResult {
  unitCount: number;
  annualGrossRevenueAed: number;
  annualNoiAed: number;
  exitValueAed: number;
  equivalentSalesPsfSfa: number;
}

export function synthesiseBtSPsf(inp: PerUnitBtSInput): PerUnitBtSResult {
  let annualGrossRev: number;
  if (inp.engineId === 'hospitality') {
    // ADR already represents nightly revenue per key; occupancy folds in.
    // annualRev/key = ADR × occ × 365
    annualGrossRev = inp.unitCount * inp.perUnitAnnualRevenueAed * (inp.occupancyPct / 100) * 365;
  } else {
    // Per-unit annual revenue is already an annual figure (per bed /
    // per student / per MW per year). Occupancy applies as a discount.
    annualGrossRev = inp.unitCount * inp.perUnitAnnualRevenueAed * (inp.occupancyPct / 100);
  }
  const annualNoi = annualGrossRev * (1 - inp.operatingPct / 100);
  const exitValue = inp.exitCapRatePct > 0 ? annualNoi / (inp.exitCapRatePct / 100) : 0;
  const equivalentSalesPsfSfa = inp.sfaSqft > 0 ? exitValue / inp.sfaSqft : 0;
  return {
    unitCount: inp.unitCount,
    annualGrossRevenueAed: annualGrossRev,
    annualNoiAed: annualNoi,
    exitValueAed: exitValue,
    equivalentSalesPsfSfa,
  };
}

// ── Synthesise an equivalent BtR monthly rent psf ─────────────────────
//
// The kernel computes: grossMonthly = SFA × monthlyRentPsf; multiplied
// by occupancy and (1 - operating%) over 12 months to get NetAnnual.
//
// To make the kernel emit our target Net Annual, we back-derive:
//   NetAnnual = (SFA × monthlyRent × occ% × 12) × (1 - opex%)
//   monthlyRent = NetAnnual / (SFA × occ% × 12 × (1 - opex%))
//
// But that ALSO multiplies by occ% and (1 - opex%) in the kernel, so we
// don't pre-apply them in our synthetic input.
export interface PerUnitBtRInput {
  unitCount: number;
  perUnitAnnualRevenueAed: number;
  sfaSqft: number;
}

export interface PerUnitBtRResult {
  unitCount: number;
  annualGrossRevenueAed: number;
  // Synthetic monthly rent psf such that the v5 BtR kernel produces
  // the correct annual gross when multiplied by SFA × 12.
  equivalentMonthlyRentPsfSfa: number;
}

export function synthesiseBtRRentPsf(inp: PerUnitBtRInput): PerUnitBtRResult {
  // For BtR the per-unit revenue is the *gross* annual stream the asset
  // produces at 100% occupancy. The kernel applies occupancy + opex on
  // top, so we just need to back into monthly rent psf at SFA × 12.
  const annualGrossRev = inp.unitCount * inp.perUnitAnnualRevenueAed;
  const equivalentMonthlyRentPsfSfa =
    inp.sfaSqft > 0 ? annualGrossRev / (inp.sfaSqft * 12) : 0;
  return {
    unitCount: inp.unitCount,
    annualGrossRevenueAed: annualGrossRev,
    equivalentMonthlyRentPsfSfa,
  };
}

// Auto-derive a sensible unit count from BUA (in sqft).
// Caller can override the result.
export function autoUnitCount(buaSqft: number, engineId: EngineId): number {
  const def = PER_UNIT_DEFAULTS[engineId];
  if (!def) return 0;
  const buaSqm = buaSqft / 10.7639;
  return Math.max(1, Math.round(buaSqm / def.unitAreaSqm));
}
