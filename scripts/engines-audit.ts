// Audit every v6 engine on a representative plot. Outputs a table of
// Revenue / Net Profit / ROI / IRR so we can spot engines where the
// math is broken (revenue = 0, IRR NaN, ROI -100%).

import {
  deriveArea, deriveLand, deriveConstruction, deriveFinance,
  deriveBtSRevenue, deriveBtRRental,
} from '@/lib/feasibility';
import { ENGINES, type EngineId } from '@/lib/feasibility-v6/engines';
import { computeBtSV6, computeBtRV6 } from '@/lib/feasibility-v6/results';

const PLOT = 20000;
const FAR = 3.0;
const LAND = 30_000_000;

const area = deriveArea({ plotAreaSqft: PLOT, far: FAR, bua: PLOT * FAR * 1.85, efficiencyPct: 80 });
const finance = deriveFinance({ enabled: false, loanAed: 0, ratePct: 0, periodMonths: 0 });

function runBtS(eId: EngineId) {
  const e = ENGINES[eId];
  const land = deriveLand(
    { landCostAed: LAND, dldPct: 4, paymentMode: 'full', downPaymentPct: 30, numberOfPayments: 8, periodMonths: 24 },
    area.gfa,
  );
  const c = deriveConstruction({
    constructionPsfBua: e.constructionPsfBua,
    brandPsfBua: e.brandPsfBua,
    consultancyPsfBua: e.consultancyPsfBua,
    infrastructurePsfBua: e.infrastructurePsfBua,
    contingencyPct: e.contingencyPct,
  }, area.bua);
  const r = deriveBtSRevenue({
    salesPricePsfSfa: e.salesPsfSfa,
    commissionPct: 8.5, marketingPct: 2.0, devServicesPct: 0,
  }, area.sfa);
  const result = computeBtSV6(area, land, c, finance, r, 'full', { constructionMonths: 18 });
  return {
    revenue: r.grossRevenueAed,
    totalInv: result.totalInvestmentAed,
    netProfit: result.netProfitAed,
    roi: result.roiPct,
    irr: result.irrPct,
    modeSupported: e.modes.includes('bts'),
  };
}

function runBtR(eId: EngineId) {
  const e = ENGINES[eId];
  const land = deriveLand(
    { landCostAed: LAND, dldPct: 4, paymentMode: 'full', downPaymentPct: 30, numberOfPayments: 8, periodMonths: 24 },
    area.gfa,
  );
  const c = deriveConstruction({
    constructionPsfBua: e.constructionPsfBua,
    brandPsfBua: e.brandPsfBua,
    consultancyPsfBua: e.consultancyPsfBua,
    infrastructurePsfBua: e.infrastructurePsfBua,
    contingencyPct: e.contingencyPct,
  }, area.bua);
  const rental = deriveBtRRental({
    monthlyRentPsfSfa: e.monthlyRentPsfSfa,
    occupancyPct: e.occupancyPct,
    annualIncreasePct: 3,
    operatingPct: e.operatingPct,
  }, area.sfa);
  const result = computeBtRV6(land, c, finance, rental, 3, { constructionMonths: 18, holdYears: 5, terminalCapRatePct: 7.5 });
  return {
    netAnnual: rental.netAnnualAed,
    totalInv: result.totalInvestmentAed,
    yield: result.yieldPct,
    irr: result.irrPct,
    modeSupported: e.modes.includes('btr'),
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

console.log('═══ BtS AUDIT — Plot 20,000 sqft, FAR 3.0, Land AED 30M ═══');
console.log();
console.log('Engine                      mode? Revenue   Net Profit  ROI       IRR       Verdict');
console.log('────────────────────────────────────────────────────────────────────────────────────');
for (const id of Object.keys(ENGINES) as EngineId[]) {
  const r = runBtS(id);
  const status = !r.modeSupported
    ? 'BtS not supported'
    : r.revenue === 0
      ? '🔴 REVENUE = 0 (psf=0)'
      : !Number.isFinite(r.irr)
        ? '🟡 IRR NaN'
        : r.netProfit < 0
          ? '🟡 LOSS'
          : '✓ ok';
  console.log(
    `${ENGINES[id].label.padEnd(28)}${r.modeSupported ? 'yes ' : ' no '}${fmt(r.revenue).padStart(8)}  ${fmt(r.netProfit).padStart(10)}  ${pct(r.roi).padStart(8)}  ${pct(r.irr).padStart(8)}  ${status}`,
  );
}

console.log();
console.log('═══ BtR AUDIT — same plot ═══');
console.log();
console.log('Engine                      mode? NetAnnual TotalInv   Yield     IRR       Verdict');
console.log('────────────────────────────────────────────────────────────────────────────────────');
for (const id of Object.keys(ENGINES) as EngineId[]) {
  const r = runBtR(id);
  const status = !r.modeSupported
    ? 'BtR not supported'
    : r.netAnnual === 0
      ? '🔴 RENT = 0 (psf=0)'
      : !Number.isFinite(r.irr)
        ? '🟡 IRR NaN'
        : '✓ ok';
  console.log(
    `${ENGINES[id].label.padEnd(28)}${r.modeSupported ? 'yes ' : ' no '}${fmt(r.netAnnual).padStart(8)}  ${fmt(r.totalInv).padStart(8)}  ${pct(r.yield).padStart(8)}  ${pct(r.irr).padStart(8)}  ${status}`,
  );
}
