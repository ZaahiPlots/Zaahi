// ZAAHI Feasibility v6.0 — IRR + NPV + cashflow timeline primitives.
//
// Pure math, no dependencies. Server-safe. Used by both the V6 result
// wrappers (src/lib/feasibility-v6/results.ts) and (later in Sprint 9c)
// the escrow-drawdown engine.
//
// IRR uses bisection — bulletproof convergence, no Newton-Raphson divergence
// surprises. About 50 iterations is sufficient for 1e-6 precision on the
// realistic NPV-vs-rate landscape (rates from -50% to +500% annualised).
//
// Cashflow conventions: monthly resolution. Outflows negative, inflows
// positive. Index `month` starts at 0 (project kickoff). For a typical
// residential build-to-sell with 18-month construction, the timeline is:
//   month  0: -land cost - DLD fee - finance interest setup
//   months 1..18: -construction cost / 18 each month
//   month 18: +net revenue (single lump-sum at handover for BtS)
// IRR is then the monthly rate that solves NPV = 0; we annualise it
// for display.

export interface CashflowEntry {
  month: number;
  aed: number;
}

// Net Present Value at a given annualised discount rate.
// Monthly cashflows are discounted by (1+monthly)^month where
// monthly = (1+annual)^(1/12) - 1.
export function npv(cashflows: CashflowEntry[], annualRatePct: number): number {
  const monthlyRate = Math.pow(1 + annualRatePct / 100, 1 / 12) - 1;
  let total = 0;
  for (const cf of cashflows) {
    total += cf.aed / Math.pow(1 + monthlyRate, cf.month);
  }
  return total;
}

// Internal Rate of Return — bisection over annualised rates.
// Returns IRR in % per year. Returns NaN if no sign change in cashflows
// (i.e. all-positive or all-negative streams have no IRR).
export function irr(cashflows: CashflowEntry[]): number {
  if (cashflows.length < 2) return NaN;
  // Quick check: cashflows must straddle zero — otherwise no IRR.
  let pos = 0;
  let neg = 0;
  for (const cf of cashflows) {
    if (cf.aed > 0) pos++;
    if (cf.aed < 0) neg++;
  }
  if (pos === 0 || neg === 0) return NaN;

  // Bisection bounds: -99% to 1000% annualised covers virtually all
  // realistic real-estate scenarios. If NPV doesn't change sign across
  // this range, return NaN.
  let lo = -99;
  let hi = 1000;
  let npvLo = npv(cashflows, lo);
  let npvHi = npv(cashflows, hi);
  if (Math.sign(npvLo) === Math.sign(npvHi)) {
    // No sign change — search a wider grid for a bracket.
    let found = false;
    for (let r = -99; r <= 1000; r += 25) {
      const v = npv(cashflows, r);
      if (Math.sign(v) !== Math.sign(npvLo)) {
        hi = r;
        npvHi = v;
        found = true;
        break;
      }
      lo = r;
      npvLo = v;
    }
    if (!found) return NaN;
  }

  // Bisect to convergence (1e-4 precision on the annualised rate, or
  // 50 iterations max — whichever first).
  for (let i = 0; i < 100; i++) {
    const mid = (lo + hi) / 2;
    const npvMid = npv(cashflows, mid);
    if (Math.abs(npvMid) < 1) return mid; // ~AED 1 of NPV residual
    if (Math.sign(npvMid) === Math.sign(npvLo)) {
      lo = mid;
      npvLo = npvMid;
    } else {
      hi = mid;
      npvHi = npvMid;
    }
    if (Math.abs(hi - lo) < 1e-4) return (lo + hi) / 2;
  }
  return (lo + hi) / 2;
}

// ── BtS cashflow builder ──────────────────────────────────────────────
//
// Monthly resolution. Default 18-month construction; Sprint 9c surfaces
// this as user-editable. Until then, callers can override via the
// constructionMonths param.
//
// Convention:
//   month 0:               -land cost - DLD fee
//   months 1..N:           -construction (linear monthly)
//                          (or installment-based land if mode=installments)
//   month N (completion):  +net revenue (BtS lump sum at handover)
//                          -finance total interest (paid at exit)
//
// `peakEquity` is `max(cumulative net cashflow up to month N)` — the
// most equity the developer ever has tied up. Used for ROE.
export interface BtSCashflowInputs {
  landCostAed: number;
  dldFeeAed: number;
  totalConstructionAed: number;
  totalFinanceInterestAed: number;
  netRevenueAed: number;
  constructionMonths: number;
  // Optional: if installments mode, override the t=0 land outflow with
  // the schedule. Sprint 9a keeps it simple — full payment at t=0.
  paymentMode?: 'full' | 'installments';
  downPaymentAed?: number;
  installmentPerMonthAed?: number;
  installmentMonths?: number;
  // Optional: developer financing. Loan reduces equity at construction
  // start; principal repaid at exit (with accumulated interest).
  loanAed?: number;
}

export function buildBtSCashflows(inp: BtSCashflowInputs): CashflowEntry[] {
  const cf: CashflowEntry[] = [];
  const N = Math.max(1, Math.round(inp.constructionMonths));

  // Land outflow
  if (inp.paymentMode === 'installments') {
    const dp = inp.downPaymentAed ?? 0;
    const monthly = inp.installmentPerMonthAed ?? 0;
    const months = Math.max(1, inp.installmentMonths ?? 24);
    cf.push({ month: 0, aed: -dp - inp.dldFeeAed });
    for (let m = 1; m <= months; m++) {
      cf.push({ month: m, aed: -monthly });
    }
  } else {
    cf.push({ month: 0, aed: -inp.landCostAed - inp.dldFeeAed });
  }

  // Construction outflow (linear monthly from month 1 to N)
  const monthlyConstruction = inp.totalConstructionAed / N;
  for (let m = 1; m <= N; m++) {
    cf.push({ month: m, aed: -monthlyConstruction });
  }

  // Finance: loan inflow at month 1, repayment + interest at month N
  if (inp.loanAed && inp.loanAed > 0) {
    cf.push({ month: 1, aed: inp.loanAed });
    cf.push({ month: N, aed: -inp.loanAed - (inp.totalFinanceInterestAed ?? 0) });
  } else if (inp.totalFinanceInterestAed && inp.totalFinanceInterestAed > 0) {
    // No loan but interest is being modeled (rare); pay at exit.
    cf.push({ month: N, aed: -inp.totalFinanceInterestAed });
  }

  // Revenue inflow at completion (single lump sum)
  cf.push({ month: N, aed: inp.netRevenueAed });

  return cf.sort((a, b) => a.month - b.month);
}

// ── BtR cashflow builder ──────────────────────────────────────────────
//
// Same construction phase as BtS, then an N-year hold of rental income.
// Exit value at end of hold = year-N+1 net annual / terminalCapRate
// (Gordon-style perpetuity approximation).
export interface BtRCashflowInputs {
  landCostAed: number;
  dldFeeAed: number;
  totalConstructionAed: number;
  totalFinanceInterestAed: number;
  netAnnualAed: number;
  annualIncreasePct: number;
  constructionMonths: number;
  holdYears: number;            // typically 5 or 10
  terminalCapRatePct: number;   // typically 7-9% in Dubai for residential BtR
  loanAed?: number;
}

export function buildBtRCashflows(inp: BtRCashflowInputs): CashflowEntry[] {
  const cf: CashflowEntry[] = [];
  const N = Math.max(1, Math.round(inp.constructionMonths));

  // Construction phase (identical to BtS)
  cf.push({ month: 0, aed: -inp.landCostAed - inp.dldFeeAed });
  const monthlyConstruction = inp.totalConstructionAed / N;
  for (let m = 1; m <= N; m++) {
    cf.push({ month: m, aed: -monthlyConstruction });
  }
  if (inp.loanAed && inp.loanAed > 0) {
    cf.push({ month: 1, aed: inp.loanAed });
    cf.push({ month: N, aed: -inp.loanAed - (inp.totalFinanceInterestAed ?? 0) });
  }

  // Rental income — annual lump sum at end of each hold year (simpler than
  // monthly distribution, closer to how investors think about NOI).
  for (let y = 1; y <= inp.holdYears; y++) {
    const annual =
      inp.netAnnualAed * Math.pow(1 + inp.annualIncreasePct / 100, y - 1);
    cf.push({ month: N + y * 12, aed: annual });
  }

  // Exit value at end of hold — year-(holdYears+1) net annual capitalised.
  const yieldNextYear =
    inp.netAnnualAed * Math.pow(1 + inp.annualIncreasePct / 100, inp.holdYears);
  const exitValue =
    inp.terminalCapRatePct > 0 ? yieldNextYear / (inp.terminalCapRatePct / 100) : 0;
  cf.push({ month: N + inp.holdYears * 12, aed: exitValue });

  return cf.sort((a, b) => a.month - b.month);
}

// ── JV cashflow builder (per-partner perspective) ─────────────────────
//
// Each partner sees -their contribution at t=0 and +their share of net
// project profit at completion. JV is treated as BtS under the hood.
export interface JvPartnerCashflowInputs {
  partnerContributionAed: number; // cash + (in-kind land valuation)
  partnerProfitAed: number;       // their share of net project profit
  constructionMonths: number;
}

export function buildJvPartnerCashflows(
  inp: JvPartnerCashflowInputs,
): CashflowEntry[] {
  const N = Math.max(1, Math.round(inp.constructionMonths));
  return [
    { month: 0, aed: -inp.partnerContributionAed },
    { month: N, aed: inp.partnerContributionAed + inp.partnerProfitAed },
    // The partner gets their contribution back PLUS their profit share.
    // Modeling as a single inflow at month N keeps the IRR formula clean.
    // Under the hood this is what JV agreements specify in practice for
    // simple 2-party JV at completion.
  ];
}

// ── Peak-equity helpers ───────────────────────────────────────────────
//
// Peak equity = max cumulative net cashflow (in absolute terms) up to,
// but not including, the revenue inflow that flips the sign back. Used
// to compute ROE — return ON equity, isolating leverage effect.
export function peakEquity(cashflows: CashflowEntry[]): number {
  let cumulative = 0;
  let peak = 0;
  for (const cf of cashflows) {
    cumulative += cf.aed;
    if (cumulative < peak) peak = cumulative; // most negative = max equity
  }
  return Math.abs(peak);
}
