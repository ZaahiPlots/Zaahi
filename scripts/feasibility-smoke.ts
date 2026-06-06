// Smoke test: reference deal — v5 simple-interest vs v6 DRAWN-MONTHLY.
//
// Reference: Dubai Hills mid-rise residential BtS.
// Plot 20,000 sqft · FAR 3.0 · GFA 60,000 · BUA 111,000 (×1.85) · Eff 80% · SFA 48,000
// Land AED 30M · DLD 4% · Construction 540 psf BUA · 5% contingency
// Loan AED 50M @ 8% · 18 month build · Sales psf 2,500 · 10.5% sales costs

import {
  deriveArea, deriveLand, deriveConstruction, deriveFinance,
  deriveBtSRevenue, computeBtS,
} from '@/lib/feasibility';
import { computeBtSV6 } from '@/lib/feasibility-v6/results';

const area = deriveArea({ plotAreaSqft: 20000, far: 3.0, bua: 111000, efficiencyPct: 80 });
const land = deriveLand(
  { landCostAed: 30_000_000, dldPct: 4, paymentMode: 'full', downPaymentPct: 30, numberOfPayments: 8, periodMonths: 24 },
  area.gfa,
);
const construction = deriveConstruction(
  { constructionPsfBua: 500, brandPsfBua: 0, consultancyPsfBua: 20, infrastructurePsfBua: 20, contingencyPct: 5 },
  area.bua,
);
const finance = deriveFinance({ enabled: true, loanAed: 50_000_000, ratePct: 8, periodMonths: 18 });
const revenue = deriveBtSRevenue(
  { salesPricePsfSfa: 2500, commissionPct: 8.5, marketingPct: 2.0, devServicesPct: 0 },
  area.sfa,
);

// v5: simple interest on full principal × full period
const v5 = computeBtS(area, land, construction, finance, revenue, 'full');

// v6: DRAWN-MONTHLY (linear drawdown over constructionMonths)
const v6 = computeBtSV6(area, land, construction, finance, revenue, 'full', {
  loanAed: 50_000_000,
  ratePct: 8,
  constructionMonths: 18,
});

const fmt = (n: number) =>
  Number.isFinite(n) ? `AED ${(n / 1_000_000).toFixed(2)}M` : '—';
const pct = (n: number) => (Number.isFinite(n) ? `${n.toFixed(2)}%` : '—');

console.log('═══ REFERENCE DEAL — Dubai Hills mid-rise residential BtS ═══');
console.log(`Plot: ${area.plotAreaSqft.toLocaleString()} sqft · FAR ${area.far} · GFA ${area.gfa.toLocaleString()} sqft`);
console.log(`BUA ${area.bua.toLocaleString()} sqft · Eff ${area.efficiencyPct}% · SFA ${area.sfa.toLocaleString()} sqft`);
console.log(`Land ${fmt(land.landCostAed)} + DLD ${fmt(land.dldFeeAed)} = ${fmt(land.totalLandCostAed)}`);
console.log(`Construction ${fmt(construction.totalConstructionAed)} (incl. ${fmt(construction.contingencyAed)} contingency)`);
console.log(`Loan ${fmt(50_000_000)} @ 8% × 18 months`);
console.log(`Gross revenue ${fmt(revenue.grossRevenueAed)} → Net ${fmt(revenue.netRevenueAed)} after 10.5% sales costs`);
console.log();
console.log('────────────────────────────────────────────────────────────');
console.log('                                v5 simple     v6 drawn      Δ');
console.log('────────────────────────────────────────────────────────────');
console.log(
  `Construction loan interest    ${fmt(v5.totalInvestmentAed - land.totalLandCostAed - construction.totalConstructionAed).padStart(11)}   ${fmt(v6.drawnInterestAed).padStart(11)}   ${fmt(v6.drawnInterestAed - v6.v5InterestAed).padStart(11)}`,
);
console.log(
  `Total Investment              ${fmt(v5.totalInvestmentAed).padStart(11)}   ${fmt(v6.totalInvestmentAed).padStart(11)}   ${fmt(v6.totalInvestmentAed - v5.totalInvestmentAed).padStart(11)}`,
);
console.log(
  `Net Profit                    ${fmt(v5.netProfitAed).padStart(11)}   ${fmt(v6.netProfitAed).padStart(11)}   ${fmt(v6.netProfitAed - v5.netProfitAed).padStart(11)}`,
);
console.log(
  `ROI                           ${pct(v5.roiPct).padStart(11)}   ${pct(v6.roiPct).padStart(11)}   ${`+${(v6.roiPct - v5.roiPct).toFixed(2)}pp`.padStart(11)}`,
);
console.log(`IRR (annualised)              ${'—'.padStart(11)}   ${pct(v6.irrPct).padStart(11)}   (v5 had no IRR)`);
console.log(`Peak equity                   ${'—'.padStart(11)}   ${fmt(v6.peakEquityAed).padStart(11)}`);
console.log(`ROE                           ${'—'.padStart(11)}   ${pct(v6.roePct).padStart(11)}`);
console.log('────────────────────────────────────────────────────────────');
console.log();
console.log(`v6 interestBasis: ${v6.interestBasis}`);
console.log(`Interest reduction vs v5: ${(((v6.v5InterestAed - v6.drawnInterestAed) / v6.v5InterestAed) * 100).toFixed(1)}%`);
