// ZAAHI Feasibility v6.0 — Escrow Drawdown engine.
//
// Models the RERA-mandated escrow trust account that off-plan developers
// in Dubai must use (Dubai Law No. 8 of 2007, the "Trust Account Law").
//
// Why this matters for the calculator:
//   Without escrow modeling, the calculator assumes the developer
//   equity-finances the entire construction cost up front. In reality,
//   buyer payments flow into a project-specific escrow account during
//   the build, and the developer can withdraw funds as RERA-engineer-
//   certified construction milestones complete. This dramatically reduces
//   the developer's peak equity requirement → lifts IRR-on-equity by
//   20-40 % for a typical Dubai 80/20 off-plan project.
//
// Regulatory framework (cited in tooltips and PDF disclosures):
//   - Dubai Law No. 8 of 2007 Article 14 — escrow agent must retain 5 %
//     of total escrow account for one year post-handover (defects guarantee).
//   - Dubai Law No. 9 of 2007 — developer must deposit 20 % of project
//     construction cost upfront (cash or bank guarantee) before marketing.
//   - DLD technical procedure — escrow activates for drawdowns once
//     construction reaches 20 % completion.
//   - Drawdown schedule itself NOT in law — contractual per project SPA,
//     RERA-engineer-certified per milestone.
//
// Sources: see docs/specs/feasibility-v6/16_SPRINT_9_PROPOSAL.md §5.
//
// The "industry default schedule" below is synthesised from Emaar / Damac /
// Sobha SPA guidance via the Sprint 9 proposal research wave. Founder-
// approved as ZAAHI default per §10 Q3=A. Marked as "research default" in
// the UI; user can edit per project.

import type { CashflowEntry } from './irr';

// ── Default schedule (founder-approved per Sprint 9 §10 Q3=A) ─────────
//
// Each entry: at construction completion `pctComplete`, the developer is
// entitled to draw cumulative `pctDrawdown` of the escrow account. The
// remaining 5% is retained per Article 14 until 1 year post-handover.
export const DEFAULT_DUBAI_ESCROW_SCHEDULE: ReadonlyArray<{
  pctComplete: number;
  pctDrawdown: number;
  label: string;
}> = [
  { pctComplete: 20, pctDrawdown: 15, label: 'Foundation' },
  { pctComplete: 40, pctDrawdown: 30, label: 'Structure / Superstructure' },
  { pctComplete: 60, pctDrawdown: 50, label: 'MEP rough-in' },
  { pctComplete: 80, pctDrawdown: 70, label: 'Internal finishes' },
  { pctComplete: 100, pctDrawdown: 95, label: 'Handover (5% retention)' },
];

// Article 14 retention released this many months after handover.
export const RETENTION_RELEASE_MONTHS_POST_HANDOVER = 12;

// ── Inputs / Outputs ──────────────────────────────────────────────────

export interface EscrowDrawdownInputs {
  enabled: boolean;
  monthsToCompletion: number;     // typically 18-24 for Dubai mid-rise
  totalConstructionAed: number;   // project construction cost (incl. contingency)
  totalRevenueAed: number;        // project gross sales revenue
  salesAtLaunchPct: number;       // % of units sold at launch (default 15)
  salesAtHandoverPct: number;     // % of units sold by handover (default 80)
  schedule?: ReadonlyArray<{ pctComplete: number; pctDrawdown: number }>;
  retentionPct?: number;          // default 5 (Law 8/2007 Article 14)
}

export interface EscrowDrawdownResult {
  enabled: boolean;
  // Per-month series, length = monthsToCompletion + 12 (to cover the
  // 1-year retention release window).
  monthlySalesReceipts: number[];
  monthlyEscrowInflow: number[];      // sales receipts × 95% (5% retained)
  monthlyDrawdownAllowed: number[];   // cumulative cap by milestone
  monthlyDrawdownActual: number[];    // bounded by allowed + escrow balance
  monthlyEquityInjection: number[];   // construction this month - drawdown this month
  // Single-figure summaries for verdict block + PDF
  totalDrawnFromEscrow: number;
  totalRetentionReleased: number;     // released at handover + 12 months
  peakEquityAed: number;              // max cumulative equity injected
  // Pretty-printable schedule for the PDF
  effectiveSchedule: Array<{ month: number; milestone: string; cumulativePctDrawdown: number }>;
}

// ── Implementation ────────────────────────────────────────────────────

export function deriveEscrowDrawdown(inp: EscrowDrawdownInputs): EscrowDrawdownResult {
  const N = Math.max(1, Math.round(inp.monthsToCompletion));
  const schedule = inp.schedule ?? DEFAULT_DUBAI_ESCROW_SCHEDULE;
  const retentionPct = inp.retentionPct ?? 5;

  const totalLength = N + RETENTION_RELEASE_MONTHS_POST_HANDOVER;
  const monthlySalesReceipts = new Array<number>(totalLength + 1).fill(0);
  const monthlyEscrowInflow = new Array<number>(totalLength + 1).fill(0);
  const monthlyDrawdownAllowed = new Array<number>(totalLength + 1).fill(0);
  const monthlyDrawdownActual = new Array<number>(totalLength + 1).fill(0);
  const monthlyEquityInjection = new Array<number>(totalLength + 1).fill(0);

  if (!inp.enabled) {
    return {
      enabled: false,
      monthlySalesReceipts,
      monthlyEscrowInflow,
      monthlyDrawdownAllowed,
      monthlyDrawdownActual,
      monthlyEquityInjection,
      totalDrawnFromEscrow: 0,
      totalRetentionReleased: 0,
      peakEquityAed: 0,
      effectiveSchedule: [],
    };
  }

  // ── Sales-receipts schedule ────────────────────────────────────────
  // Linear sales rate from launch to handover, with a 15% (default) launch
  // bump in month 1. The remaining `salesAtHandoverPct - salesAtLaunchPct`
  // is distributed evenly over months 2..N.
  const launchPct = inp.salesAtLaunchPct;
  const totalPctSold = Math.min(100, inp.salesAtHandoverPct);
  const remainingPct = Math.max(0, totalPctSold - launchPct);
  const launchAed = (inp.totalRevenueAed * launchPct) / 100;
  const monthlyLinear = (inp.totalRevenueAed * remainingPct) / 100 / Math.max(1, N - 1);

  monthlySalesReceipts[1] = launchAed;
  for (let m = 2; m <= N; m++) {
    monthlySalesReceipts[m] = monthlyLinear;
  }
  // Whatever is left (100% - salesAtHandoverPct) settles in months N+1..N+12
  // (post-handover sales of remaining inventory), distributed evenly.
  const postHandoverPct = Math.max(0, 100 - totalPctSold);
  const postHandoverAed = (inp.totalRevenueAed * postHandoverPct) / 100;
  if (postHandoverPct > 0) {
    const perMonth = postHandoverAed / RETENTION_RELEASE_MONTHS_POST_HANDOVER;
    for (let m = N + 1; m <= totalLength; m++) {
      monthlySalesReceipts[m] = perMonth;
    }
  }

  // Escrow inflow = sales receipts × (100 - retention)% — but only DURING
  // construction. Post-handover sales bypass escrow (units already exist).
  for (let m = 0; m <= totalLength; m++) {
    if (m <= N) {
      monthlyEscrowInflow[m] = (monthlySalesReceipts[m] * (100 - retentionPct)) / 100;
    } else {
      monthlyEscrowInflow[m] = monthlySalesReceipts[m]; // full receipt to developer
    }
  }

  // ── Drawdown allowance schedule ────────────────────────────────────
  // Construction completion progresses linearly from 0% at month 0 to 100%
  // at month N. For each month, find the cumulative % drawdown allowed
  // by interpolating the schedule.
  function allowedAtCompletionPct(pct: number): number {
    if (pct <= 0) return 0;
    if (pct >= 100) return schedule[schedule.length - 1].pctDrawdown;
    // Linear interpolation between schedule points
    let prev = { pctComplete: 0, pctDrawdown: 0 };
    for (const point of schedule) {
      if (pct <= point.pctComplete) {
        const span = point.pctComplete - prev.pctComplete;
        if (span === 0) return point.pctDrawdown;
        const frac = (pct - prev.pctComplete) / span;
        return prev.pctDrawdown + frac * (point.pctDrawdown - prev.pctDrawdown);
      }
      prev = point;
    }
    return schedule[schedule.length - 1].pctDrawdown;
  }

  // Total escrow account size = totalRevenue × (1 - retention/100)
  // Drawdown cumulative cap = totalEscrow × cumulativePctDrawdown / 100
  // (Note: pctDrawdown in schedule is "% of total escrow" not "% of revenue".)
  const totalEscrowSize = (inp.totalRevenueAed * (100 - retentionPct)) / 100;

  for (let m = 0; m <= totalLength; m++) {
    const completionPct = m <= N ? (m / N) * 100 : 100;
    const cumulativeAllowedAed =
      (totalEscrowSize * allowedAtCompletionPct(completionPct)) / 100;
    monthlyDrawdownAllowed[m] = cumulativeAllowedAed;
  }

  // ── Actual drawdown per month ──────────────────────────────────────
  // For each month, construction this month = totalConstruction / N (months 1..N).
  // Actual draw = min(amount needed this month, allowed cumulative cap minus
  // what we've drawn already, escrow balance).
  let cumulativeDrawn = 0;
  let escrowBalance = 0;
  const monthlyConstruction = inp.totalConstructionAed / N;

  for (let m = 0; m <= totalLength; m++) {
    // Inflow first
    escrowBalance += monthlyEscrowInflow[m];

    // Construction outflow only during build
    const constructionThisMonth = m >= 1 && m <= N ? monthlyConstruction : 0;

    // Drawdown bounded by: construction need, cumulative cap, escrow balance
    const allowance = Math.max(0, monthlyDrawdownAllowed[m] - cumulativeDrawn);
    const draw = Math.min(constructionThisMonth, allowance, escrowBalance);
    monthlyDrawdownActual[m] = draw;
    cumulativeDrawn += draw;
    escrowBalance -= draw;

    // Equity injection = construction this month - draw this month
    // (positive means developer adds equity; zero means escrow covered it)
    monthlyEquityInjection[m] = Math.max(0, constructionThisMonth - draw);
  }

  // Add the retention-release event 12 months post-handover.
  // The remaining 5% of escrow flows to developer at month N + 12.
  const retentionReleased = (inp.totalRevenueAed * retentionPct) / 100;
  // Treated as a "negative equity injection" — i.e. equity recovered.
  monthlyEquityInjection[totalLength] -= retentionReleased;

  // Peak equity
  let cumulativeEquity = 0;
  let peakEquity = 0;
  for (let m = 0; m <= totalLength; m++) {
    cumulativeEquity += monthlyEquityInjection[m];
    if (cumulativeEquity > peakEquity) peakEquity = cumulativeEquity;
  }

  // Effective schedule (for PDF)
  const effectiveSchedule = schedule.map((point) => ({
    month: Math.round((point.pctComplete / 100) * N),
    milestone: 'label' in point ? (point as { label: string }).label : `${point.pctComplete}% complete`,
    cumulativePctDrawdown: point.pctDrawdown,
  }));

  return {
    enabled: true,
    monthlySalesReceipts,
    monthlyEscrowInflow,
    monthlyDrawdownAllowed,
    monthlyDrawdownActual,
    monthlyEquityInjection,
    totalDrawnFromEscrow: cumulativeDrawn,
    totalRetentionReleased: retentionReleased,
    peakEquityAed: peakEquity,
    effectiveSchedule,
  };
}

// ── Cashflow timeline integration ─────────────────────────────────────
// Builds a BtS-style cashflow series that incorporates escrow drawdown:
// the developer's monthly net is (equity injected) — i.e. negative when
// they put cash in, positive when escrow returns it. Used by the IRR /
// peakEquity helpers in irr.ts to compute IRR-on-equity.
export function buildBtSCashflowsWithEscrow(
  landCostAed: number,
  dldFeeAed: number,
  escrow: EscrowDrawdownResult,
  netRevenueAed: number,
): CashflowEntry[] {
  const cf: CashflowEntry[] = [];
  // Land outflow at month 0
  cf.push({ month: 0, aed: -landCostAed - dldFeeAed });

  if (!escrow.enabled) {
    // Fall back to lump-sum revenue (caller should use buildBtSCashflows
    // from irr.ts instead). Provided here for completeness.
    return cf;
  }

  // Per-month equity injection (positive = outflow from developer's pocket).
  // Encoded as negative cashflow entries.
  for (let m = 0; m < escrow.monthlyEquityInjection.length; m++) {
    const eq = escrow.monthlyEquityInjection[m];
    if (eq !== 0) {
      cf.push({ month: m, aed: -eq });
    }
  }

  // Net revenue at completion: gross revenue from sales has already flowed
  // into escrow (which paid construction); the residual profit (revenue
  // minus everything escrow paid out — which is ~95% of construction)
  // is the developer's take-home at handover. Modeled as a single inflow
  // at month N (last construction month) for simplicity. The retention
  // release (5%) is already netted into monthlyEquityInjection at the
  // tail, so we just add the developer's profit margin here.
  //
  // Profit margin = netRevenue - totalConstructionPaidByEscrow - landCost - dldFee
  // = netRevenue - escrow.totalDrawnFromEscrow - landCostAed - dldFeeAed
  //   - retentionStillUnreleased (already accounted for in tail)
  // Simpler: at month N (handover), inflow the difference between net
  // revenue and what escrow has paid plus what equity has injected
  // (which sums to total construction). The math reconciles.
  //
  // Actually the cleanest formulation: revenue inflow at month N equals
  // the developer's NET TAKE = netRevenue - totalConstruction - landCostAed
  // - dldFeeAed = NET PROFIT. And the equity injections + land outflow
  // already reflect every cash event up to handover; the retention release
  // is in the tail. So:
  const N = Math.round(
    escrow.monthlyEquityInjection.length - RETENTION_RELEASE_MONTHS_POST_HANDOVER,
  );
  // Find effective handover month from the last non-zero construction-month
  // injection — but simpler: it's len - 13 (length includes the tail 12 months).
  cf.push({
    month: N,
    aed:
      netRevenueAed -
      escrow.totalDrawnFromEscrow -
      escrow.totalRetentionReleased,
    // Net of retention: developer receives net revenue minus construction
    // paid by escrow minus retention still locked. Retention release
    // is added back in the tail injection (already negative there).
  });

  return cf.sort((a, b) => a.month - b.month);
}
