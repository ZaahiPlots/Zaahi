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
  /**
   * Order WITHIN a month. Only peakEquity reads it — IRR and NPV discount by
   * month alone, so intra-month order cannot affect them.
   *
   * Several things land in the handover month at once: the final construction
   * draw, the sale proceeds, and the repayment of loan principal + interest.
   * They do not happen simultaneously in reality, and which order you assume
   * changes the reported peak equity by millions.
   *
   *   COST    (0) — land, DLD, construction, loan DRAWS. Money that must be
   *                 in place before the asset exists.
   *   REVENUE (1) — the sale. Arrives only once the building is finished, so
   *                 it can never fund the construction draw of the same month.
   *   DEBT    (2) — principal + interest repayment, which in practice comes
   *                 OUT of the sale proceeds and therefore after them.
   *
   * Defaults to COST when omitted, which is the conservative reading.
   */
  seq?: CashflowSeq;
}

/** Intra-month ordering for peak-equity measurement. See CashflowEntry.seq. */
export const SEQ = {
  COST: 0,
  REVENUE: 1,
  DEBT: 2,
} as const;
export type CashflowSeq = (typeof SEQ)[keyof typeof SEQ];

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
    cf.push({ month: 0, aed: -dp - inp.dldFeeAed, seq: SEQ.COST });
    for (let m = 1; m <= months; m++) {
      cf.push({ month: m, aed: -monthly, seq: SEQ.COST });
    }
  } else {
    cf.push({ month: 0, aed: -inp.landCostAed - inp.dldFeeAed, seq: SEQ.COST });
  }

  // Construction outflow (linear monthly from month 1 to N)
  const monthlyConstruction = inp.totalConstructionAed / N;
  for (let m = 1; m <= N; m++) {
    cf.push({ month: m, aed: -monthlyConstruction, seq: SEQ.COST });
  }

  // Finance: loan is drawn LINEARLY over construction (one source of
  // truth with drawnMonthlyInterest in results.ts — the interest
  // accrual base and the cashflow inflow timing must match). Per-month
  // draw = loan / N. Principal + accrued interest repaid at exit.
  // Founder fix 2026-06-06: previously a lump +loan at m1 mismatched the
  // monthly-drawdown interest base, inflated equity in early months and
  // overstated levered IRR.
  if (inp.loanAed && inp.loanAed > 0) {
    const monthlyLoanDraw = inp.loanAed / N;
    for (let m = 1; m <= N; m++) {
      // A draw is funding, not a cost — it lands with the costs it pays for.
      cf.push({ month: m, aed: monthlyLoanDraw, seq: SEQ.COST });
    }
    cf.push({ month: N, aed: -inp.loanAed - (inp.totalFinanceInterestAed ?? 0), seq: SEQ.DEBT });
  } else if (inp.totalFinanceInterestAed && inp.totalFinanceInterestAed > 0) {
    // No loan but interest is being modeled (rare); pay at exit.
    cf.push({ month: N, aed: -inp.totalFinanceInterestAed, seq: SEQ.DEBT });
  }

  // Revenue inflow at completion (single lump sum)
  cf.push({ month: N, aed: inp.netRevenueAed, seq: SEQ.REVENUE });

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
  // Loan drawn linearly over construction (matches DRAWN-MONTHLY
  // interest base — same single source of truth). Founder fix 2026-06-06.
  if (inp.loanAed && inp.loanAed > 0) {
    const monthlyLoanDraw = inp.loanAed / N;
    for (let m = 1; m <= N; m++) {
      cf.push({ month: m, aed: monthlyLoanDraw });
    }
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
// Reported 2026-08-27: "Joint Venture shows Project IRR 14.4% while Landowner
// IRR is 12.3% and Developer IRR 7.3% — a project IRR cannot exceed both
// partners."
//
// That is correct, and it was not a rounding artefact. The two sides were
// measured on different clocks. Every partner's whole contribution was booked
// at month 0, while the project spent its construction budget month by month
// over the build. Money paid later earns a higher IRR for the same profit, so
// the project flattered itself against partners who were modelled as funding
// everything up front.
//
// The invariant that must hold: if the project cashflow is the sum of the
// partner cashflows on one timeline, then for conventional flows
//
//     NPV_project(r) = NPV_landowner(r) + NPV_developer(r)
//
// so at r = max(IRR_L, IRR_D) both terms are <= 0, the project NPV is <= 0,
// and therefore IRR_project <= max(IRR_L, IRR_D). Symmetrically it is >= the
// lower one. The project IRR is BRACKETED by its partners; it can never
// escape above both. scripts/jv-irr.test.ts asserts exactly this.
//
// `fundingWeights` is what puts a partner on the project's clock: the shape of
// their drawdown over time. A landowner contributing land funds it once at
// month 0 (the default). A developer funding DLD, construction and interest
// pays on the project's own schedule, so their weights mirror it.
export interface JvPartnerCashflowInputs {
  partnerContributionAed: number; // cash + (in-kind land valuation)
  partnerProfitAed: number;       // their share of net project profit
  constructionMonths: number;
  /**
   * How the contribution is drawn down, as {month, weight} with weights
   * summing to 1. Omitted → the whole contribution at month 0, which is right
   * for an in-kind land contribution and wrong for a cash developer.
   */
  fundingWeights?: Array<{ month: number; weight: number }>;
}

export function buildJvPartnerCashflows(
  inp: JvPartnerCashflowInputs,
): CashflowEntry[] {
  const N = Math.max(1, Math.round(inp.constructionMonths));
  const weights =
    inp.fundingWeights && inp.fundingWeights.length > 0
      ? inp.fundingWeights
      : [{ month: 0, weight: 1 }];

  // Normalise defensively: a caller that hands over weights summing to 0.98
  // would otherwise silently understate the partner's outlay and overstate
  // their IRR — the exact class of error this function exists to remove.
  const totalWeight = weights.reduce((acc, w) => acc + w.weight, 0);
  const norm = totalWeight > 0 ? totalWeight : 1;

  const cf: CashflowEntry[] = weights.map((w) => ({
    month: w.month,
    aed: -inp.partnerContributionAed * (w.weight / norm),
    seq: SEQ.COST,
  }));

  // The partner gets their contribution back PLUS their profit share, once,
  // at completion — which is what a simple two-party JV agreement specifies.
  cf.push({
    month: N,
    aed: inp.partnerContributionAed + inp.partnerProfitAed,
    seq: SEQ.REVENUE,
  });
  return cf.sort((a, b) => a.month - b.month);
}

/**
 * The shape of the project's cash needs over the build, as normalised weights.
 *
 * Used to put a cash-funding JV partner on the same clock as the project. The
 * components mirror buildBtSCashflows exactly — DLD at month 0, construction
 * spread linearly over the build, financing interest settled at completion —
 * so a developer funding all three draws down exactly as the project spends.
 */
export function projectFundingWeights(inp: {
  dldFeeAed: number;
  totalConstructionAed: number;
  interestAed: number;
  constructionMonths: number;
}): Array<{ month: number; weight: number }> {
  const N = Math.max(1, Math.round(inp.constructionMonths));
  const total = inp.dldFeeAed + inp.totalConstructionAed + inp.interestAed;
  if (!(total > 0)) return [{ month: 0, weight: 1 }];
  const out: Array<{ month: number; weight: number }> = [];
  if (inp.dldFeeAed > 0) out.push({ month: 0, weight: inp.dldFeeAed / total });
  if (inp.totalConstructionAed > 0) {
    const per = inp.totalConstructionAed / N / total;
    for (let m = 1; m <= N; m++) out.push({ month: m, weight: per });
  }
  if (inp.interestAed > 0) out.push({ month: N, weight: inp.interestAed / total });
  return out.length > 0 ? out : [{ month: 0, weight: 1 }];
}

// ── Peak-equity helpers ───────────────────────────────────────────────
//
// Peak equity = max cumulative net cashflow (in absolute terms). Used to
// compute ROE — return ON equity, isolating leverage effect.
//
// Events within a month are ordered by CashflowEntry.seq, not netted.
//
// The 2026-06-06 version bucketed a whole month and netted it. The concern
// behind that was real — sequencing naively would put the loan repayment
// before the sale proceeds and invent a trough the developer never has to
// fund. But netting everything solved it by erasing a difference that does
// exist: the final construction draw is paid BEFORE the building is sold, and
// netting it against the same month's sale proceeds hid one month of
// construction from the peak.
//
// Reported 2026-08-27: "plot 6457790 Build-to-Sell shows Peak Equity AED
// 236,767,174, below total investment 247,635,831, with financing OFF." With
// no debt, peak equity is by definition the whole investment — you funded all
// of it before you sold anything. The delta was exactly one month of
// construction, and BtR (whose rent starts a year later, so nothing nets)
// reported the correct figure. The two modes disagreed on a convention.
//
// The fix keeps the phantom-trough protection and drops the netting: within a
// month, COST lands first, then REVENUE, then DEBT service out of the
// proceeds. Peak is sampled after every step. See CashflowEntry.seq.
//
// Founder fix 2026-06-06, corrected 2026-09-04.
export function peakEquity(cashflows: CashflowEntry[]): number {
  // Bucket by (month, seq) so entries of the same kind in the same month still
  // net against each other — a loan draw against the construction draw it
  // funds, for instance — while different kinds stay ordered.
  const buckets = new Map<string, { month: number; seq: number; aed: number }>();
  for (const cf of cashflows) {
    const seq = cf.seq ?? SEQ.COST;
    const key = `${cf.month}:${seq}`;
    const existing = buckets.get(key);
    if (existing) existing.aed += cf.aed;
    else buckets.set(key, { month: cf.month, seq, aed: cf.aed });
  }
  const ordered = Array.from(buckets.values()).sort(
    (a, b) => a.month - b.month || a.seq - b.seq,
  );
  let cumulative = 0;
  let peak = 0;
  for (const b of ordered) {
    cumulative += b.aed;
    if (cumulative < peak) peak = cumulative; // most negative = max equity
  }
  return Math.abs(peak);
}
