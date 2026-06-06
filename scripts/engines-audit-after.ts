// Re-audit each engine with the per-unit revenue synth in place.
// Mirrors what the calculator does for hospitality/healthcare/etc.

import {
  deriveArea, deriveLand, deriveConstruction, deriveFinance,
  deriveBtSRevenue, deriveBtRRental,
} from '@/lib/feasibility';
import { ENGINES, type EngineId } from '@/lib/feasibility-v6/engines';
import { computeBtSV6, computeBtRV6 } from '@/lib/feasibility-v6/results';
import {
  PER_UNIT_DEFAULTS,
  isPerUnitEngine,
  synthesiseBtSPsf,
  synthesiseBtRRentPsf,
  autoUnitCount,
} from '@/lib/feasibility-v6/perUnitRevenue';

const PLOT = 20000;
const FAR = 3.0;
const LAND = 30_000_000;
const buaSqft = PLOT * FAR * 1.85;

const area = deriveArea({ plotAreaSqft: PLOT, far: FAR, bua: buaSqft, efficiencyPct: 80 });
const finance = deriveFinance({ enabled: false, loanAed: 0, ratePct: 0, periodMonths: 0 });

function runBtS(eId: EngineId) {
  const e = ENGINES[eId];
  if (!e.modes.includes('bts')) return { gated: true, revenue: 0, netProfit: 0, roi: NaN, irr: NaN };
  const land = deriveLand(
    { landCostAed: LAND, dldPct: 4, paymentMode: 'full', downPaymentPct: 30, numberOfPayments: 8, periodMonths: 24 },
    area.gfa,
  );
  const c = deriveConstruction({
    constructionPsfBua: e.constructionPsfBua, brandPsfBua: e.brandPsfBua,
    consultancyPsfBua: e.consultancyPsfBua, infrastructurePsfBua: e.infrastructurePsfBua,
    contingencyPct: e.contingencyPct,
  }, area.bua);

  // Per-unit synth path
  let salesPsf = e.salesPsfSfa;
  if (isPerUnitEngine(eId)) {
    const def = PER_UNIT_DEFAULTS[eId]!;
    const synth = synthesiseBtSPsf({
      engineId: eId,
      unitCount: autoUnitCount(buaSqft, eId),
      perUnitAnnualRevenueAed: def.perUnitAnnualRevenueAed ?? def.adrAed ?? 0,
      occupancyPct: e.occupancyPct,
      operatingPct: e.operatingPct,
      exitCapRatePct: def.exitCapRatePct,
      sfaSqft: area.sfa,
    });
    salesPsf = synth.equivalentSalesPsfSfa;
  }

  const r = deriveBtSRevenue({
    salesPricePsfSfa: salesPsf,
    commissionPct: 8.5, marketingPct: 2.0, devServicesPct: 0,
  }, area.sfa);
  const result = computeBtSV6(area, land, c, finance, r, 'full', { constructionMonths: 18 });
  return {
    gated: false,
    revenue: r.grossRevenueAed,
    netProfit: result.netProfitAed,
    roi: result.roiPct,
    irr: result.irrPct,
  };
}

function runBtR(eId: EngineId) {
  const e = ENGINES[eId];
  if (!e.modes.includes('btr')) return { gated: true, netAnnual: 0, yield: NaN, irr: NaN };
  const land = deriveLand(
    { landCostAed: LAND, dldPct: 4, paymentMode: 'full', downPaymentPct: 30, numberOfPayments: 8, periodMonths: 24 },
    area.gfa,
  );
  const c = deriveConstruction({
    constructionPsfBua: e.constructionPsfBua, brandPsfBua: e.brandPsfBua,
    consultancyPsfBua: e.consultancyPsfBua, infrastructurePsfBua: e.infrastructurePsfBua,
    contingencyPct: e.contingencyPct,
  }, area.bua);

  let monthlyRent = e.monthlyRentPsfSfa;
  if (isPerUnitEngine(eId) && eId !== 'hospitality') {
    const def = PER_UNIT_DEFAULTS[eId]!;
    const synth = synthesiseBtRRentPsf({
      unitCount: autoUnitCount(buaSqft, eId),
      perUnitAnnualRevenueAed: def.perUnitAnnualRevenueAed ?? 0,
      sfaSqft: area.sfa,
    });
    monthlyRent = synth.equivalentMonthlyRentPsfSfa;
  }

  const rental = deriveBtRRental({
    monthlyRentPsfSfa: monthlyRent,
    occupancyPct: e.occupancyPct, annualIncreasePct: 3, operatingPct: e.operatingPct,
  }, area.sfa);
  const result = computeBtRV6(land, c, finance, rental, 3, { constructionMonths: 18, holdYears: 5, terminalCapRatePct: 7.5 });
  return {
    gated: false,
    netAnnual: rental.netAnnualAed,
    yield: result.yieldPct,
    irr: result.irrPct,
  };
}

const fmt = (n: number) => {
  if (!Number.isFinite(n)) return '   NaN';
  const abs = Math.abs(n);
  const sign = n < 0 ? '-' : ' ';
  if (abs >= 1_000_000) return `${sign}${(abs / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `${sign}${(abs / 1_000).toFixed(0)}K`;
  return `${sign}${Math.round(abs)}`;
};
const pct = (n: number) => (Number.isFinite(n) ? (n >= 0 ? ' ' : '') + n.toFixed(1) + '%' : '   NaN');

console.log('═══ BtS AUDIT — AFTER fix ═══');
console.log('Engine                      gated? Revenue   Net Profit  ROI       IRR       Verdict');
console.log('────────────────────────────────────────────────────────────────────────────────────');
for (const id of Object.keys(ENGINES) as EngineId[]) {
  const r = runBtS(id);
  const status = r.gated ? '✓ gated (mode N/A)' : r.revenue === 0 ? '🔴 still broken' : '✓ ok';
  console.log(
    `${ENGINES[id].label.padEnd(28)}${r.gated ? '  yes' : '   no'} ${fmt(r.revenue).padStart(8)}  ${fmt(r.netProfit).padStart(10)}  ${pct(r.roi).padStart(8)}  ${pct(r.irr).padStart(8)}  ${status}`,
  );
}

console.log();
console.log('═══ BtR AUDIT — AFTER fix ═══');
console.log('Engine                      gated? NetAnnual TotalInv    Yield     IRR       Verdict');
console.log('────────────────────────────────────────────────────────────────────────────────────');
for (const id of Object.keys(ENGINES) as EngineId[]) {
  const r = runBtR(id);
  const status = r.gated ? '✓ gated (mode N/A)' : r.netAnnual === 0 ? '🔴 still broken' : '✓ ok';
  console.log(
    `${ENGINES[id].label.padEnd(28)}${r.gated ? '  yes' : '   no'} ${fmt(r.netAnnual).padStart(8)}             ${pct(r.yield).padStart(8)}  ${pct(r.irr).padStart(8)}  ${status}`,
  );
}
