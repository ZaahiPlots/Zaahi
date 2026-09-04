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
//
// DRAWN-MONTHLY interest correction (2026-06-06, founder-ratified)
// ────────────────────────────────────────────────────────────────
// v5 deriveFinance() computes simple interest on the FULL loan principal
// for the FULL period — overstates by ~50% vs reality. Real-world
// construction loans amortise interest on the DRAWN BALANCE, which grows
// linearly as construction draws happen monthly (Brueggeman & Fisher
// Ch.21 "Development Financing"). For a linear monthly drawdown over N
// months at annual rate r, total accrued interest is approximately
// loanAed × r × N/12 × 0.5 (average outstanding balance = 50% of peak),
// plus a small capitalised-interest reserve that itself accrues interest
// during the build. We use the closed-form solution for monthly compounding
// over a linear drawdown, which is institutionally defensible.
//
// v5 deriveFinance() is NOT modified — it remains the historical "upper
// bound" used by v5 SidePanel for backwards compatibility. The v6 wrappers
// recompute and replace the interest figure before passing it downstream.

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
  projectFundingWeights,
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

// ── DRAWN-MONTHLY interest (institutional construction-loan accrual) ──
//
// For a construction loan drawn linearly over `drawMonths` at annual rate
// `ratePct`, the total interest paid by exit equals the sum, over each
// drawn slice, of slice × monthlyRate × (months it remained outstanding).
//
// Linear drawdown: slice_m = loan / drawMonths, drawn at month m, retained
// until exit at month `holdMonths` (= drawMonths for a BtS at handover).
// Interest on slice_m alone over the hold = slice_m × monthlyRate × (holdMonths - m + 1).
//
// Total interest = Σ_{m=1..drawMonths} (loan/drawMonths) × i × (hold − m + 1)
//                = (loan × i / drawMonths) × Σ (hold − m + 1)
//                = (loan × i / drawMonths) × Σ_{k=hold−drawMonths+1..hold} k
//                = (loan × i / drawMonths) × ((hold + (hold−drawMonths+1)) × drawMonths / 2)
//                = (loan × i / 2) × (2×hold − drawMonths + 1)
//
// Where i = ratePct/100/12 (monthly simple interest, capitalised at exit).
// This produces ~50% of the v5 simple-on-full-principal figure for the
// trivial case of drawMonths = holdMonths, and grows correctly when the
// loan is held past the drawdown period.
export function drawnMonthlyInterest(
  loanAed: number,
  ratePct: number,
  drawMonths: number,
  holdMonths: number,
): number {
  if (loanAed <= 0 || ratePct <= 0 || drawMonths <= 0 || holdMonths <= 0) return 0;
  const D = Math.max(1, Math.round(drawMonths));
  const H = Math.max(D, Math.round(holdMonths));
  const i = ratePct / 100 / 12;
  return (loanAed * i / 2) * (2 * H - D + 1);
}

// ── Brokerage on land purchase (v6 wrapper, 2026-06-08) ───────────────
//
// Real-world deals often go through a buyer-side broker who takes a
// commission off the closing price. v5 deriveLand does NOT model this
// (totalLandCost = landCost + DLD only). The v6 wrapper folds the broker
// fee into totalLandCostAed BEFORE downstream math, so ROI / IRR / NPV
// reflect the real all-in land cost. Brokerage is exposed separately so
// the UI / PDF can print it as its own line below DLD.
//
//   brokerageAed = landCostAed × brokerageOnLandPct / 100
//
// Default 0% — most ZAAHI users transact directly with the developer
// and pay no buyer-side broker.
export function applyLandBrokerageV6(
  land: LandDerived,
  brokerageOnLandPct: number,
): { land: LandDerived; brokerageAed: number } {
  const pct = brokerageOnLandPct > 0 ? brokerageOnLandPct : 0;
  const brokerageAed = land.landCostAed * (pct / 100);
  if (brokerageAed <= 0) return { land, brokerageAed: 0 };
  return {
    land: {
      ...land,
      totalLandCostAed: land.totalLandCostAed + brokerageAed,
    },
    brokerageAed,
  };
}

// ── BtS V6 ────────────────────────────────────────────────────────────

export interface BtSResultV6 extends BtSResult {
  irrPct: number;       // annualised, NaN if no sign change in cashflows
  roePct: number;       // netProfit / peakEquity × 100
  peakEquityAed: number;
  npvAed: number;       // at DEFAULT_NPV_DISCOUNT_RATE
  cashflows: CashflowEntry[]; // for PDF rendering of timeline
  constructionMonths: number;
  escrow?: EscrowDrawdownResult; // present when escrow is enabled (Sprint 9c)
  // v6 DRAWN-MONTHLY interest figures (replace v5 simple-interest line).
  interestBasis: 'simple-v5' | 'drawn-monthly-v6';
  drawnInterestAed: number;      // recomputed per Brueggeman Ch.21
  v5InterestAed: number;         // for transparency / before-after delta
  // Brokerage on land purchase (2026-06-08). Buyer-side broker fee
  // folded into totalLandCostAed before downstream math. 0 when off.
  brokerageOnLandPct: number;
  brokerageOnLandAed: number;
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
    ratePct?: number;             // annual rate, needed for drawn-monthly recompute
    financePeriodMonths?: number; // v5 period; falls back to constructionMonths
    brokerageOnLandPct?: number;  // buyer-side land broker fee %, default 0
    escrow?: Omit<EscrowDrawdownInputs, 'monthsToCompletion' | 'totalConstructionAed' | 'totalRevenueAed'>;
  },
): BtSResultV6 {
  const constructionMonths =
    options?.constructionMonths ?? DEFAULT_CONSTRUCTION_MONTHS;

  // Brokerage on land — paid at closing alongside land + DLD.
  const brokerageOnLandPct = options?.brokerageOnLandPct ?? 0;
  const { land: landWithBrokerage, brokerageAed: brokerageOnLandAed } =
    applyLandBrokerageV6(land, brokerageOnLandPct);
  land = landWithBrokerage;

  // ── Override v5 interest with DRAWN-MONTHLY per Brueggeman Ch.21. ──
  // Loan drawn linearly over `constructionMonths`, held until handover.
  // v5 deriveFinance simple interest is replaced with the institutionally
  // correct figure before flowing into totalInvestmentAed and ROI/IRR.
  const v5InterestAed = finance.totalInterestAed;
  const loan = options?.loanAed ?? 0;
  const rate = options?.ratePct ?? 0;
  const interestBasis: BtSResultV6['interestBasis'] =
    loan > 0 && rate > 0 ? 'drawn-monthly-v6' : 'simple-v5';
  const drawnInterestAed =
    interestBasis === 'drawn-monthly-v6'
      ? drawnMonthlyInterest(loan, rate, constructionMonths, constructionMonths)
      : v5InterestAed;
  const correctedFinance: FinanceDerived =
    interestBasis === 'drawn-monthly-v6'
      ? { totalInterestAed: drawnInterestAed }
      : finance;
  const v5 = computeBtS(area, land, construction, correctedFinance, revenue, paymentMode);

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
      totalFinanceInterestAed: correctedFinance.totalInterestAed,
      netRevenueAed: revenue.netRevenueAed,
      constructionMonths,
      paymentMode,
      downPaymentAed: land.downPaymentAed,
      installmentPerMonthAed: land.monthlyInstallmentAed,
      // P0.2 fix: pass the user-input period (deriveLand stores it via
      // monthlyInstallmentAed = remaining / periodMonths). We can recover
      // periodMonths by dividing remaining by monthlyInstallment. Default
      // to constructionMonths so installments don't outlive the build.
      installmentMonths:
        paymentMode === 'installments'
          ? land.monthlyInstallmentAed > 0
            ? Math.max(
                1,
                Math.round(land.remainingAed / land.monthlyInstallmentAed),
              )
            : constructionMonths
          : undefined,
      loanAed: options?.loanAed,
    });
  }
  // Brokerage on land — paid at closing alongside land + DLD.
  if (brokerageOnLandAed > 0) {
    cashflows.push({ month: 0, aed: -brokerageOnLandAed });
    cashflows.sort((a, b) => a.month - b.month);
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
    interestBasis,
    drawnInterestAed,
    v5InterestAed,
    brokerageOnLandPct,
    brokerageOnLandAed,
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
  interestBasis: 'simple-v5' | 'drawn-monthly-v6';
  drawnInterestAed: number;
  v5InterestAed: number;
  brokerageOnLandPct: number;
  brokerageOnLandAed: number;
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
    ratePct?: number;
    brokerageOnLandPct?: number;
  },
): BtRResultV6 {
  // Brokerage on land — same treatment as BtS.
  const brokerageOnLandPct = options?.brokerageOnLandPct ?? 0;
  const { land: landWithBrokerage, brokerageAed: brokerageOnLandAed } =
    applyLandBrokerageV6(land, brokerageOnLandPct);
  land = landWithBrokerage;
  const constructionMonths =
    options?.constructionMonths ?? DEFAULT_CONSTRUCTION_MONTHS;
  const holdYears = options?.holdYears ?? DEFAULT_BTR_HOLD_YEARS;
  const terminalCapRatePct =
    options?.terminalCapRatePct ?? DEFAULT_TERMINAL_CAP_RATE;

  // DRAWN-MONTHLY interest correction. For BtR the loan is drawn during
  // construction and typically refinanced to permanent at handover —
  // construction-loan interest accrues over the drawdown only (not the
  // hold period). hold-months for interest accrual = constructionMonths.
  const v5InterestAed = finance.totalInterestAed;
  const loan = options?.loanAed ?? 0;
  const rate = options?.ratePct ?? 0;
  const interestBasis: BtRResultV6['interestBasis'] =
    loan > 0 && rate > 0 ? 'drawn-monthly-v6' : 'simple-v5';
  const drawnInterestAed =
    interestBasis === 'drawn-monthly-v6'
      ? drawnMonthlyInterest(loan, rate, constructionMonths, constructionMonths)
      : v5InterestAed;
  const correctedFinance: FinanceDerived =
    interestBasis === 'drawn-monthly-v6'
      ? { totalInterestAed: drawnInterestAed }
      : finance;
  const v5 = computeBtR(land, construction, correctedFinance, rental, annualIncreasePct);

  const cashflows = buildBtRCashflows({
    landCostAed: land.landCostAed,
    dldFeeAed: land.dldFeeAed,
    totalConstructionAed: construction.totalConstructionAed,
    totalFinanceInterestAed: correctedFinance.totalInterestAed,
    netAnnualAed: rental.netAnnualAed,
    annualIncreasePct,
    constructionMonths,
    holdYears,
    terminalCapRatePct,
    loanAed: options?.loanAed,
  });
  if (brokerageOnLandAed > 0) {
    cashflows.push({ month: 0, aed: -brokerageOnLandAed });
    cashflows.sort((a, b) => a.month - b.month);
  }

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
    interestBasis,
    drawnInterestAed,
    v5InterestAed,
    brokerageOnLandPct,
    brokerageOnLandAed,
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
  /**
   * The developer's drawdown shape — the project's own spend schedule. Exposed
   * so the JV panel can show WHEN the developer funds, not just how much;
   * without it the partner IRRs are unauditable from the UI.
   */
  developerFundingWeights: Array<{ month: number; weight: number }>;
  /**
   * Committed capital minus what the project needs. Zero when the developer's
   * cash is left on its auto value (construction + interest + DLD). Non-zero
   * means the JV is under- or over-funded and the partner IRRs are no longer a
   * clean decomposition of the project's.
   */
  contributionGapAed: number;
  constructionMonths: number;
  interestBasis: 'simple-v5' | 'drawn-monthly-v6';
  drawnInterestAed: number;
  v5InterestAed: number;
  brokerageOnLandPct: number;
  brokerageOnLandAed: number;
}

export function computeJvV6(
  jvInp: JvInputs,
  land: LandDerived,
  construction: ConstructionDerived,
  finance: FinanceDerived,
  revenue: BtSRevenueDerived,
  options?: {
    constructionMonths?: number;
    loanAed?: number;
    ratePct?: number;
    brokerageOnLandPct?: number;
  },
): JvDerivedV6 {
  // Brokerage on land (developer-side cost; landowner doesn't pay
  // broker on their own contribution).
  const brokerageOnLandPct = options?.brokerageOnLandPct ?? 0;
  const { land: landWithBrokerage, brokerageAed: brokerageOnLandAed } =
    applyLandBrokerageV6(land, brokerageOnLandPct);
  land = landWithBrokerage;

  const constructionMonths =
    options?.constructionMonths ?? DEFAULT_CONSTRUCTION_MONTHS;

  // DRAWN-MONTHLY interest correction (consistent with BtS/BtR).
  const v5InterestAed = finance.totalInterestAed;
  const loan = options?.loanAed ?? 0;
  const rate = options?.ratePct ?? 0;
  const interestBasis: JvDerivedV6['interestBasis'] =
    loan > 0 && rate > 0 ? 'drawn-monthly-v6' : 'simple-v5';
  const drawnInterestAed =
    interestBasis === 'drawn-monthly-v6'
      ? drawnMonthlyInterest(loan, rate, constructionMonths, constructionMonths)
      : v5InterestAed;
  const correctedFinance: FinanceDerived =
    interestBasis === 'drawn-monthly-v6'
      ? { totalInterestAed: drawnInterestAed }
      : finance;
  const v5 = computeJv(jvInp, land, construction, correctedFinance, revenue);

  // Put both partners on the project's clock (2026-09-04). Previously every
  // contribution was booked at month 0 while the project spent construction
  // month by month, which let Project IRR sit above BOTH partner IRRs — the
  // reported 14.4% against 12.3% and 7.3%.
  //
  // Landowner: an in-kind land contribution is made once, at month 0. Any
  // cash they add rides alongside it — a landowner does not fund the build.
  //
  // Developer: funds DLD, construction and the financing interest, so their
  // drawdown mirrors the project's own spend schedule rather than landing up
  // front. `projectFundingWeights` is built from the same components in the
  // same order as buildBtSCashflows, so the two cannot drift apart.
  const developerWeights = projectFundingWeights({
    dldFeeAed: land.dldFeeAed,
    totalConstructionAed: construction.totalConstructionAed,
    interestAed: correctedFinance.totalInterestAed,
    constructionMonths,
  });

  const landownerCashflows = buildJvPartnerCashflows({
    partnerContributionAed: v5.landownerTotalContribution,
    partnerProfitAed: v5.landownerProfitAed,
    constructionMonths,
  });
  const developerCashflows = buildJvPartnerCashflows({
    partnerContributionAed: v5.developerTotalContribution,
    partnerProfitAed: v5.developerProfitAed,
    constructionMonths,
    fundingWeights: developerWeights,
  });

  // Does the committed capital actually cover what the project needs?
  //
  // developerCashAuto in the UI is construction + interest + DLD, so by
  // default the two match to the dirham and the partner cashflows sum exactly
  // to the project's. The moment a user overrides the developer's cash the
  // JV is under- or over-funded, and the partner IRRs stop being a clean
  // decomposition of the project's. That is a real modelling condition, not a
  // rounding issue, so it is surfaced rather than absorbed.
  const contributionGapAed = v5.totalContribution - v5.totalInvestmentAed;

  // Project-level IRR uses the BtS-style timeline since JV produces a
  // single sale event.
  const projectCashflows = buildBtSCashflows({
    landCostAed: land.landCostAed,
    dldFeeAed: land.dldFeeAed,
    totalConstructionAed: construction.totalConstructionAed,
    totalFinanceInterestAed: correctedFinance.totalInterestAed,
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
    developerFundingWeights: developerWeights,
    contributionGapAed,
    constructionMonths,
    interestBasis,
    drawnInterestAed,
    v5InterestAed,
    brokerageOnLandPct,
    brokerageOnLandAed,
  };
}
