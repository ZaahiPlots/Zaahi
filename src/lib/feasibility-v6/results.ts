// ZAAHI Feasibility v6.0 — V6 result wrappers extending v5 results.
//
// Strangler Fig invariant: src/lib/feasibility.ts (v5 math) is READ-ONLY
// during the cutover. The v5 result interfaces (BtSResult, BtRResult,
// JvDerived) cannot be modified there, so v6 extends them here with the
// new institutional metrics — IRR, ROE, peak equity, NPV — required by
// RICS NRM 1 and IVS 2025 for development feasibility.
//
// Pattern:
//   v5 computes the deterministic single-period numbers (ROI, yield,
//     payback, profit) — used by both v5 SidePanel calculator (untouched)
//     and v6 calculator (via these wrappers).
//   v6 wrappers call v5, then add time-weighted metrics (IRR over the
//     monthly cashflow timeline, ROE on peak equity, NPV at a default
//     discount rate).

import {
  computeBtS,
  computeBtR,
  computeJv,
  type BtSResult,
  type BtRResult,
  type JvDerived,
  type AreaDerived,
  type LandDerived,
  type ConstructionDerived,
  type FinanceDerived,
  type BtSRevenueDerived,
  type BtRRentalDerived,
  type JvInputs,
  type LandPaymentMode,
} from '@/lib/feasibility';
import {
  irr,
  npv,
  peakEquity,
  buildBtSCashflows,
  buildBtRCashflows,
  buildJvPartnerCashflows,
  type CashflowEntry,
} from './irr';
import {
  deriveEscrowDrawdown,
  buildBtSCashflowsWithEscrow,
  type EscrowDrawdownInputs,
  type EscrowDrawdownResult,
} from './escrowDrawdown';

// Default planning assumptions until Sprint 9c surfaces them as user
// inputs. Typical Dubai mid-rise residential build = 18 months. Office /
// hospitality ~24 months. Tower projects ~30+ months. We use 18 as a
// sensible single default for v9a; users will override per project in 9c.
export const DEFAULT_CONSTRUCTION_MONTHS = 18;

// Hold duration for BtR IRR — institutional default. 5 years matches the
// existing v5 5-year projection; 10 years would be more accurate for
// freehold but doubles forecasting uncertainty.
export const DEFAULT_BTR_HOLD_YEARS = 5;

// Terminal cap rate for BtR exit valuation. Dubai residential typical
// 7-8%; office / retail 7-9%; industrial 8-10%. 7.5% is a sensible
// midpoint until Sprint 9c surfaces per-engine cap rates.
export const DEFAULT_TERMINAL_CAP_RATE = 7.5;

// NPV display discount rate. Used for the optional NPV line in the PDF
// per N1 founder ratification (PDF only; not surfaced in calculator UI
// for v9a). Cost of capital approximation: UAE benchmark ~5.5% + risk
// margin 4.5% = 10% blended.
export const DEFAULT_NPV_DISCOUNT_RATE = 10;

// ── BtS V6 ────────────────────────────────────────────────────────────

export interface BtSResultV6 extends BtSResult {
  irrPct: number;       // annualised, NaN if no sign change in cashflows
  roePct: number;       // netProfit / peakEquity × 100
  peakEquityAed: number;
  npvAed: number;       // at DEFAULT_NPV_DISCOUNT_RATE
  cashflows: CashflowEntry[]; // for PDF rendering of timeline
  constructionMonths: number;
  escrow?: EscrowDrawdownResult; // present when escrow is enabled (Sprint 9c)
}

export function computeBtSV6(
  area: AreaDerived,
  land: LandDerived,
  construction: ConstructionDerived,
  finance: FinanceDerived,
  revenue: BtSRevenueDerived,
  paymentMode: LandPaymentMode,
  options?: {
    constructionMonths?: number;
    loanAed?: number;
    escrow?: Omit<EscrowDrawdownInputs, 'monthsToCompletion' | 'totalConstructionAed' | 'totalRevenueAed'>;
  },
): BtSResultV6 {
  const v5 = computeBtS(area, land, construction, finance, revenue, paymentMode);
  const constructionMonths =
    options?.constructionMonths ?? DEFAULT_CONSTRUCTION_MONTHS;

  // Escrow drawdown — Sprint 9c. When enabled (RERA Law 8/2007), buyer
  // payments flow into a trust account; developer draws down on milestone
  // completion. This dramatically reduces peak equity for off-plan
  // projects and lifts IRR-on-equity. When disabled, fall back to
  // traditional all-equity cashflow.
  let escrow: EscrowDrawdownResult | undefined;
  let cashflows: CashflowEntry[];

  if (options?.escrow?.enabled) {
    escrow = deriveEscrowDrawdown({
      ...options.escrow,
      monthsToCompletion: constructionMonths,
      totalConstructionAed: construction.totalConstructionAed,
      // Use gross revenue (what buyers pay into escrow), not net.
      // Reconstruct: gross = netRevenue / (1 - sum-of-deduction-pcts).
      // Simpler: pull gross from BtSRevenueDerived. Caller passes via
      // revenue.grossRevenueAed.
      totalRevenueAed: revenue.grossRevenueAed,
    });
    cashflows = buildBtSCashflowsWithEscrow(
      land.landCostAed,
      land.dldFeeAed,
      escrow,
      revenue.netRevenueAed,
    );
  } else {
    cashflows = buildBtSCashflows({
      landCostAed: land.landCostAed,
      dldFeeAed: land.dldFeeAed,
      totalConstructionAed: construction.totalConstructionAed,
      totalFinanceInterestAed: finance.totalInterestAed,
      netRevenueAed: revenue.netRevenueAed,
      constructionMonths,
      paymentMode,
      downPaymentAed: land.downPaymentAed,
      installmentPerMonthAed: land.monthlyInstallmentAed,
      installmentMonths: paymentMode === 'installments' ? 24 : undefined,
      loanAed: options?.loanAed,
    });
  }

  const peak = peakEquity(cashflows);
  const irrPct = irr(cashflows);
  const npvAed = npv(cashflows, DEFAULT_NPV_DISCOUNT_RATE);
  const roePct = peak > 0 ? (v5.netProfitAed / peak) * 100 : 0;

  return {
    ...v5,
    irrPct,
    roePct,
    peakEquityAed: peak,
    npvAed,
    cashflows,
    constructionMonths,
    escrow,
  };
}

// ── BtR V6 ────────────────────────────────────────────────────────────

export interface BtRResultV6 extends BtRResult {
  irrPct: number;
  roePct: number;             // first-year net annual / peak equity × 100 (yield-on-equity)
  peakEquityAed: number;
  npvAed: number;
  cashflows: CashflowEntry[];
  constructionMonths: number;
  holdYears: number;
  terminalCapRatePct: number;
  exitValueAed: number;       // capitalised year-(N+1) net annual
}

export function computeBtRV6(
  land: LandDerived,
  construction: ConstructionDerived,
  finance: FinanceDerived,
  rental: BtRRentalDerived,
  annualIncreasePct: number,
  options?: {
    constructionMonths?: number;
    holdYears?: number;
    terminalCapRatePct?: number;
    loanAed?: number;
  },
): BtRResultV6 {
  const v5 = computeBtR(land, construction, finance, rental, annualIncreasePct);
  const constructionMonths =
    options?.constructionMonths ?? DEFAULT_CONSTRUCTION_MONTHS;
  const holdYears = options?.holdYears ?? DEFAULT_BTR_HOLD_YEARS;
  const terminalCapRatePct =
    options?.terminalCapRatePct ?? DEFAULT_TERMINAL_CAP_RATE;

  const cashflows = buildBtRCashflows({
    landCostAed: land.landCostAed,
    dldFeeAed: land.dldFeeAed,
    totalConstructionAed: construction.totalConstructionAed,
    totalFinanceInterestAed: finance.totalInterestAed,
    netAnnualAed: rental.netAnnualAed,
    annualIncreasePct,
    constructionMonths,
    holdYears,
    terminalCapRatePct,
    loanAed: options?.loanAed,
  });

  const peak = peakEquity(cashflows);
  const irrPct = irr(cashflows);
  const npvAed = npv(cashflows, DEFAULT_NPV_DISCOUNT_RATE);
  const roePct = peak > 0 ? (rental.netAnnualAed / peak) * 100 : 0;

  // Exit value (re-derive to surface in result)
  const yieldNextYear =
    rental.netAnnualAed * Math.pow(1 + annualIncreasePct / 100, holdYears);
  const exitValueAed =
    terminalCapRatePct > 0 ? yieldNextYear / (terminalCapRatePct / 100) : 0;

  return {
    ...v5,
    irrPct,
    roePct,
    peakEquityAed: peak,
    npvAed,
    cashflows,
    constructionMonths,
    holdYears,
    terminalCapRatePct,
    exitValueAed,
  };
}

// ── JV V6 ─────────────────────────────────────────────────────────────

export interface JvDerivedV6 extends JvDerived {
  landownerIrrPct: number;
  developerIrrPct: number;
  projectIrrPct: number;
  landownerRoePct: number;     // identical to landownerRoiPct here (in-period
                               // contribution = peak equity for partner)
  developerRoePct: number;
  landownerCashflows: CashflowEntry[];
  developerCashflows: CashflowEntry[];
  constructionMonths: number;
}

export function computeJvV6(
  jvInp: JvInputs,
  land: LandDerived,
  construction: ConstructionDerived,
  finance: FinanceDerived,
  revenue: BtSRevenueDerived,
  options?: {
    constructionMonths?: number;
  },
): JvDerivedV6 {
  const v5 = computeJv(jvInp, land, construction, finance, revenue);
  const constructionMonths =
    options?.constructionMonths ?? DEFAULT_CONSTRUCTION_MONTHS;

  const landownerCashflows = buildJvPartnerCashflows({
    partnerContributionAed: v5.landownerTotalContribution,
    partnerProfitAed: v5.landownerProfitAed,
    constructionMonths,
  });
  const developerCashflows = buildJvPartnerCashflows({
    partnerContributionAed: v5.developerTotalContribution,
    partnerProfitAed: v5.developerProfitAed,
    constructionMonths,
  });

  // Project-level IRR uses the BtS-style timeline since JV produces a
  // single sale event.
  const projectCashflows = buildBtSCashflows({
    landCostAed: land.landCostAed,
    dldFeeAed: land.dldFeeAed,
    totalConstructionAed: construction.totalConstructionAed,
    totalFinanceInterestAed: finance.totalInterestAed,
    netRevenueAed: revenue.netRevenueAed,
    constructionMonths,
  });

  return {
    ...v5,
    landownerIrrPct: irr(landownerCashflows),
    developerIrrPct: irr(developerCashflows),
    projectIrrPct: irr(projectCashflows),
    // For per-partner JV, peakEquity = their total contribution (it's
    // outflowed at t=0 and not topped up) — so ROE equals ROI on their
    // contribution. Documenting explicitly so the field is present in
    // the V6 wrapper and the verdict block can render it consistently
    // across modes.
    landownerRoePct: v5.landownerRoiPct,
    developerRoePct: v5.developerRoiPct,
    landownerCashflows,
    developerCashflows,
    constructionMonths,
  };
}
