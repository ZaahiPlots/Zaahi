// Peak equity + JV IRR — founder report …-032939-247114, 2026-08-27.
//
//   npx tsx scripts/jv-irr.test.ts
//
//   (1) "Peak Equity is inconsistent — plot 6457790 Build-to-Sell shows AED
//        236,767,174, below total investment 247,635,831, with financing OFF;
//        the same plot in Build-to-Rent shows Peak Equity exactly equal to
//        total investment."
//
//   (2) "Joint Venture shows Project IRR 14.4% while Landowner IRR is 12.3%
//        and Developer IRR 7.3% — a project IRR cannot exceed both partners."
//
// Both were right, and both were convention errors rather than arithmetic
// errors. Plot 6457790 is not reachable from here (no database), so this runs
// the project's existing REFERENCE DEAL from scripts/feasibility-smoke.ts —
// Dubai Hills mid-rise residential — and reproduces the same two shapes.
//
// The "before" numbers are produced by reimplementing the old rules locally,
// so the delta is measured rather than remembered.

import {
  deriveArea, deriveLand, deriveConstruction, deriveFinance, deriveBtSRevenue,
} from '@/lib/feasibility';
import { computeBtSV6, computeJvV6 } from '@/lib/feasibility-v6/results';
import { irr, buildBtSCashflows, type CashflowEntry } from '@/lib/feasibility-v6/irr';

let failures = 0;
function check(name: string, cond: boolean, detail = '') {
  if (cond) console.log(`  PASS  ${name}`);
  else { failures++; console.log(`  FAIL  ${name}${detail ? ` — ${detail}` : ''}`); }
}
const near = (a: number, b: number, tol = 1) => Math.abs(a - b) <= tol;
const aed = (n: number) => `AED ${Math.round(n).toLocaleString('en-US')}`;
const pct = (n: number) => (Number.isFinite(n) ? `${n.toFixed(2)}%` : 'n/a');

// ── The reference deal ───────────────────────────────────────────────────
const CONSTRUCTION_MONTHS = 18;
const area = deriveArea({ plotAreaSqft: 20000, far: 3.0, bua: 111000, efficiencyPct: 80 });
const land = deriveLand(
  { landCostAed: 30_000_000, dldPct: 4, paymentMode: 'full', downPaymentPct: 30, numberOfPayments: 8, periodMonths: 24 },
  area.gfa,
);
const construction = deriveConstruction(
  { constructionPsfBua: 500, brandPsfBua: 0, consultancyPsfBua: 20, infrastructurePsfBua: 20, contingencyPct: 5 },
  area.bua,
);
const revenue = deriveBtSRevenue(
  { salesPricePsfSfa: 2500, commissionPct: 8.5, marketingPct: 2.0, devServicesPct: 0 },
  area.sfa,
);
const noFinance = deriveFinance({ enabled: false, loanAed: 0, ratePct: 0, periodMonths: 0 });
const withFinance = deriveFinance({ enabled: true, loanAed: 50_000_000, ratePct: 8, periodMonths: CONSTRUCTION_MONTHS });

/** The pre-2026-09-04 rule: bucket a whole month and net it. */
function peakEquityOld(cashflows: CashflowEntry[]): number {
  const byMonth = new Map<number, number>();
  for (const cf of cashflows) byMonth.set(cf.month, (byMonth.get(cf.month) ?? 0) + cf.aed);
  let cumulative = 0, peak = 0;
  for (const m of Array.from(byMonth.keys()).sort((a, b) => a - b)) {
    cumulative += byMonth.get(m)!;
    if (cumulative < peak) peak = cumulative;
  }
  return Math.abs(peak);
}

/** The pre-2026-09-04 partner rule: whole contribution at month 0. */
function partnerCashflowsOld(contribution: number, profit: number, months: number): CashflowEntry[] {
  return [
    { month: 0, aed: -contribution },
    { month: Math.max(1, Math.round(months)), aed: contribution + profit },
  ];
}

console.log('\npeak equity + JV IRR — reference deal (Dubai Hills mid-rise BtS)');
console.log('='.repeat(72));
console.log(`Plot ${area.plotAreaSqft.toLocaleString()} sqft · FAR ${area.far} · BUA ${area.bua.toLocaleString()} · SFA ${area.sfa.toLocaleString()}`);
console.log(`Land ${aed(land.landCostAed)} + DLD ${aed(land.dldFeeAed)} · Construction ${aed(construction.totalConstructionAed)} · ${CONSTRUCTION_MONTHS}mo`);

// ── 1. Peak equity, financing OFF ────────────────────────────────────────
console.log('\n1. peak equity with financing OFF — the reported case');
{
  const r = computeBtSV6(area, land, construction, noFinance, revenue, 'full', {
    constructionMonths: CONSTRUCTION_MONTHS,
  });
  const before = peakEquityOld(r.cashflows);
  const after = r.peakEquityAed;
  const monthlyConstruction = construction.totalConstructionAed / CONSTRUCTION_MONTHS;

  console.log(`   total investment  ${aed(r.totalInvestmentAed)}`);
  console.log(`   peak equity BEFORE ${aed(before)}   (short by ${aed(r.totalInvestmentAed - before)})`);
  console.log(`   peak equity AFTER  ${aed(after)}`);
  console.log(`   one construction month = ${aed(monthlyConstruction)}`);

  check('BEFORE was below total investment — the reported symptom',
    before < r.totalInvestmentAed - 1, `${aed(before)} vs ${aed(r.totalInvestmentAed)}`);
  check('the shortfall was exactly one construction month',
    near(r.totalInvestmentAed - before, monthlyConstruction, 2),
    `${aed(r.totalInvestmentAed - before)} vs ${aed(monthlyConstruction)}`);
  check('AFTER equals total investment — with no debt, you fund all of it',
    near(after, r.totalInvestmentAed, 2), `${aed(after)} vs ${aed(r.totalInvestmentAed)}`);
  check('ROE is now computed on the real equity requirement',
    near(r.roePct, (r.netProfitAed / r.totalInvestmentAed) * 100, 0.01), pct(r.roePct));
}

// ── 2. Financing ON — the phantom trough must not come back ──────────────
// The 2026-06-06 netting existed to stop the loan repayment being counted
// before the sale proceeds that fund it. Ordering must keep that.
console.log('\n2. peak equity with financing ON — no phantom trough');
{
  const r = computeBtSV6(area, land, construction, withFinance, revenue, 'full', {
    loanAed: 50_000_000, ratePct: 8, constructionMonths: CONSTRUCTION_MONTHS,
  });
  const naiveTrough = r.totalInvestmentAed + 50_000_000 + r.drawnInterestAed;
  console.log(`   total investment ${aed(r.totalInvestmentAed)} · loan AED 50,000,000 · interest ${aed(r.drawnInterestAed)}`);
  console.log(`   peak equity AFTER ${aed(r.peakEquityAed)}`);

  check('peak equity is positive and finite', r.peakEquityAed > 0 && Number.isFinite(r.peakEquityAed));
  check('leverage reduces the equity requirement below the unlevered case',
    r.peakEquityAed < r.totalInvestmentAed, `${aed(r.peakEquityAed)} vs ${aed(r.totalInvestmentAed)}`);
  check('no phantom trough — repayment is NOT counted before the sale',
    r.peakEquityAed < naiveTrough, `${aed(r.peakEquityAed)} vs naive ${aed(naiveTrough)}`);
}

// ── 3. JV — the reported IRR hierarchy ───────────────────────────────────
console.log('\n3. JV IRR hierarchy — Project must never exceed both partners');
const jvInputs = {
  jvType: 'profit' as const,
  landownerLandContributionAed: land.landCostAed,
  landownerCashAed: 0,
  // The UI's developerCashAuto: construction + interest + DLD.
  developerCashAed: construction.totalConstructionAed + land.dldFeeAed,
  landownerSharePct: 35,
};
{
  const jv = computeJvV6(jvInputs, land, construction, noFinance, revenue, {
    constructionMonths: CONSTRUCTION_MONTHS,
  });

  const beforeLandowner = irr(partnerCashflowsOld(jv.landownerTotalContribution, jv.landownerProfitAed, CONSTRUCTION_MONTHS));
  const beforeDeveloper = irr(partnerCashflowsOld(jv.developerTotalContribution, jv.developerProfitAed, CONSTRUCTION_MONTHS));
  const projectIrr = irr(buildBtSCashflows({
    landCostAed: land.landCostAed,
    dldFeeAed: land.dldFeeAed,
    totalConstructionAed: construction.totalConstructionAed,
    totalFinanceInterestAed: 0,
    netRevenueAed: revenue.netRevenueAed,
    constructionMonths: CONSTRUCTION_MONTHS,
  }));

  console.log(`   landowner share ${jv.landownerSharePct}% · contribution ${aed(jv.landownerTotalContribution)}`);
  console.log(`   developer contribution ${aed(jv.developerTotalContribution)} · gap vs need ${aed(jv.contributionGapAed)}`);
  console.log(`   BEFORE  project ${pct(projectIrr)}  landowner ${pct(beforeLandowner)}  developer ${pct(beforeDeveloper)}`);
  console.log(`   AFTER   project ${pct(jv.projectIrrPct)}  landowner ${pct(jv.landownerIrrPct)}  developer ${pct(jv.developerIrrPct)}`);

  check('BEFORE, project IRR escaped above both partners — the reported bug',
    projectIrr > Math.max(beforeLandowner, beforeDeveloper) + 0.01,
    `${pct(projectIrr)} vs max(${pct(beforeLandowner)}, ${pct(beforeDeveloper)})`);

  const hi = Math.max(jv.landownerIrrPct, jv.developerIrrPct);
  const lo = Math.min(jv.landownerIrrPct, jv.developerIrrPct);
  check('AFTER, project IRR does not exceed the higher partner',
    jv.projectIrrPct <= hi + 0.01, `${pct(jv.projectIrrPct)} > ${pct(hi)}`);
  check('AFTER, project IRR is not below the lower partner — it is bracketed',
    jv.projectIrrPct >= lo - 0.01, `${pct(jv.projectIrrPct)} < ${pct(lo)}`);
  check('the developer now draws down over the build, not at t=0',
    jv.developerFundingWeights.length > 1 && jv.developerFundingWeights.some((w) => w.month > 0));
  check('contributions cover the project exactly on auto values',
    near(jv.contributionGapAed, 0, 2), aed(jv.contributionGapAed));
}

// ── 4. The bracket, and exactly where it stops holding ──────────────────
//
// The guarantee is conditional, and the condition is worth stating precisely:
// if the project cashflow is the SUM of the partner cashflows, then
// NPV_project(r) = NPV_L(r) + NPV_D(r), so at r = max(IRR_L, IRR_D) both terms
// are <= 0 and the project IRR cannot be above it.
//
// That holds when the partners' committed capital funds the project exactly —
// `contributionGapAed === 0`. It does NOT hold when a lender funds part of the
// build, because the lender's cashflows belong to neither partner. Today the
// financed JV also double-counts interest: developerCashAuto includes it as
// equity while the project charges it again at exit, so the gap is non-zero by
// construction.
//
// So the sweep asserts two things: the bracket always holds where the
// decomposition is clean, and every violation is confined to the cases where
// it is not. The second is what will fail loudly if that relationship ever
// changes.
console.log('\n4. the bracket, and the condition it depends on');
{
  let clean = 0, cleanViolations = 0;
  let gapped = 0, gappedViolations = 0, worstGapped = 0;
  for (const sharePct of [5, 20, 35, 50, 65, 80, 95]) {
    for (const months of [6, 12, 18, 24, 36]) {
      for (const landAed of [10_000_000, 30_000_000, 80_000_000]) {
        for (const financed of [false, true]) {
          const l = deriveLand(
            { landCostAed: landAed, dldPct: 4, paymentMode: 'full', downPaymentPct: 0, numberOfPayments: 0, periodMonths: 0 },
            area.gfa,
          );
          const fin = financed
            ? deriveFinance({ enabled: true, loanAed: 50_000_000, ratePct: 8, periodMonths: months })
            : noFinance;
          const jv = computeJvV6(
            {
              ...jvInputs,
              landownerLandContributionAed: landAed,
              developerCashAed: construction.totalConstructionAed + l.dldFeeAed + (financed ? fin.totalInterestAed : 0),
              landownerSharePct: sharePct,
            },
            l, construction, fin, revenue,
            { constructionMonths: months, ...(financed ? { loanAed: 50_000_000, ratePct: 8 } : {}) },
          );
          const { projectIrrPct: p, landownerIrrPct: a, developerIrrPct: b } = jv;
          if (![p, a, b].every(Number.isFinite)) continue; // no sign change → no IRR
          const over = p - Math.max(a, b);
          const decomposes = Math.abs(jv.contributionGapAed) <= 2;
          if (decomposes) {
            clean++;
            if (over > 0.01) cleanViolations++;
          } else {
            gapped++;
            if (over > 0.01) { gappedViolations++; worstGapped = Math.max(worstGapped, over); }
          }
        }
      }
    }
  }
  console.log(`   ${clean} cases where contributions fund the project exactly`);
  console.log(`   ${gapped} cases with a funding gap (financed JV — interest is double-counted)`);
  console.log(`   violations: ${cleanViolations} clean, ${gappedViolations} gapped (worst +${worstGapped.toFixed(3)} pts)`);

  check('project IRR never exceeds the higher partner where the decomposition is clean',
    cleanViolations === 0, `${cleanViolations} violations`);
  check('the clean sweep is large enough to mean something', clean >= 100, `${clean}`);
  check('every violation is confined to the funding-gap cases',
    cleanViolations === 0, 'a clean-case violation would break the NPV decomposition argument');
  check('the gapped breach is small and bounded — recorded, not hidden',
    worstGapped < 1, `worst +${worstGapped.toFixed(3)} pts`);
}

console.log('\n' + '='.repeat(72));
if (failures) { console.log(`\n${failures} failure(s)\n`); process.exit(1); }
console.log('\nall assertions passed\n');
