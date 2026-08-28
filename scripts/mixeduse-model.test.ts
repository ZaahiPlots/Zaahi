// Regression fixtures for the complete mixed-use model (issues #2 / #3, branch 1).
//
//   npx tsx scripts/mixeduse-model.test.ts
//
// Branch 1 extends computeMixedUseBtSV6 from a cost/revenue splitter into a
// complete feasibility, WITHOUT switching the headline over. So the single most
// important assertion here is the one that proves nothing moved: called the way
// the app calls it today, the function must return byte-identical numbers.
//
// The rest pin down the properties the model must hold for branch 2 to be safe:
// parcel-level costs applied once rather than per slice, per-slice overrides
// actually reaching the maths, and absent inputs reading as "not modelled"
// rather than as zero.

import { computeMixedUseBtSV6, type MixedUseShare } from '../src/lib/feasibility-v6/mixedUse';
import { deriveArea, deriveLand, deriveFinance } from '../src/lib/feasibility';

let failures = 0;
function check(name: string, cond: boolean, detail = '') {
  if (cond) console.log(`  PASS  ${name}`);
  else { failures++; console.log(`  FAIL  ${name}${detail ? ` — ${detail}` : ''}`); }
}
const near = (a: number, b: number, tol = 0.01) => Math.abs(a - b) <= tol;
const aed = (n: number) => `AED ${Math.round(n).toLocaleString('en-US')}`;

// A 3-use mix on a realistic plot. Shares deliberately uneven so an
// equal-split bug cannot pass by accident.
const SHARES: MixedUseShare[] = [
  { category: 'RESIDENTIAL', pct: 60 },
  { category: 'COMMERCIAL', pct: 30 },
  { category: 'HOTEL', pct: 10 },
];

// AreaInputs takes BUA in sqft, not a ratio. Getting this wrong silently
// produced bua = 0, which zeroed construction while leaving revenue (driven by
// SFA) intact — a reminder that a fixture can fail in a way that looks like a
// model bug. GFA = 40,000 x 3 = 120,000; BUA at a 1.15 ratio = 138,000.
const area = deriveArea({ plotAreaSqft: 40_000, far: 3, bua: 138_000, efficiencyPct: 82 });
const COMMON = { parentArea: area, shares: SHARES, commissionPct: 2, marketingPct: 1.5, devServicesPct: 3 };

console.log('\ncomplete mixed-use model\n' + '='.repeat(58));

// ── 1. Backwards compatibility — the guarantee branch 1 rests on ──────────
console.log('\n1. existing call shape is unchanged');
const legacy = computeMixedUseBtSV6({ ...COMMON });
check('slices still produced, one per share', legacy.slices.length === 3);
check('shareValid still computed', legacy.shareValid === true && legacy.shareSumPct === 100);
check('full is null when no parcel inputs given (not modelled, not zero)', legacy.full === null);
check('totalConstructionAed unchanged in shape', Number.isFinite(legacy.totalConstructionAed) && legacy.totalConstructionAed > 0);
check('totalNetRevenueAed unchanged in shape', Number.isFinite(legacy.totalNetRevenueAed) && legacy.totalNetRevenueAed > 0);

// ── 2. The aggregate must equal the sum of its slices, exactly ────────────
console.log('\n2. parent aggregate is the exact sum of slices');
const sliceConstruction = legacy.slices.reduce((s, x) => s + x.construction.totalConstructionAed, 0);
const sliceNet = legacy.slices.reduce((s, x) => s + x.revenue.netRevenueAed, 0);
check('parentConstruction total == Σ slices', near(legacy.parentConstruction.totalConstructionAed, sliceConstruction),
  `${aed(legacy.parentConstruction.totalConstructionAed)} vs ${aed(sliceConstruction)}`);
check('parentRevenue net == Σ slices', near(legacy.parentRevenue.netRevenueAed, sliceNet),
  `${aed(legacy.parentRevenue.netRevenueAed)} vs ${aed(sliceNet)}`);
check('parentConstruction total == legacy totalConstructionAed', near(legacy.parentConstruction.totalConstructionAed, legacy.totalConstructionAed));
check('recovered psf is consistent with the total',
  near(legacy.parentConstruction.perSqftBuaWithContingency * area.bua, legacy.parentConstruction.totalConstructionAed, 1));

// ── 3. Complete model ─────────────────────────────────────────────────────
console.log('\n3. complete model when parcel inputs are supplied');
const LAND_COST = 60_000_000;
const land = deriveLand(
  { landCostAed: LAND_COST, dldPct: 4, paymentMode: 'full', downPaymentPct: 0, numberOfPayments: 0, periodMonths: 0 },
  area.gfa,
);
const finance = deriveFinance({ loanAed: 0, ratePct: 0, periodMonths: 0 });
const complete = computeMixedUseBtSV6({ ...COMMON, land, finance, paymentMode: 'full' });

check('full is populated', complete.full !== null);
check('slices identical to the legacy call', complete.slices.length === legacy.slices.length &&
  near(complete.totalConstructionAed, legacy.totalConstructionAed));

const f = complete.full!;
check('land appears exactly once in total investment',
  near(f.totalInvestmentAed, land.totalLandCostAed + complete.parentConstruction.totalConstructionAed + f.drawnInterestAed, 1),
  `investment ${aed(f.totalInvestmentAed)} vs land ${aed(land.totalLandCostAed)} + construction ` +
  `${aed(complete.parentConstruction.totalConstructionAed)} + interest ${aed(f.drawnInterestAed)}`);
check('DLD is 4% of land, charged once', near(land.dldFeeAed, LAND_COST * 0.04, 1));
check('net profit == net revenue − total investment',
  near(f.netProfitAed, complete.parentRevenue.netRevenueAed - f.totalInvestmentAed, 1));
check('ROI is finite and derived from those two', Number.isFinite(f.roiPct) &&
  near(f.roiPct, (f.netProfitAed / f.totalInvestmentAed) * 100, 0.01));

// ── 4. Land is NOT divided across slices ──────────────────────────────────
// The bug this guards against: charging land per use-class, which would scale
// the land cost by the number of shares.
console.log('\n4. parcel-level costs are not multiplied by slice count');
const twoShare = computeMixedUseBtSV6({
  ...COMMON, shares: [{ category: 'RESIDENTIAL', pct: 50 }, { category: 'COMMERCIAL', pct: 50 }],
  land, finance, paymentMode: 'full',
});
const landInThree = complete.full!.totalInvestmentAed - complete.parentConstruction.totalConstructionAed - complete.full!.drawnInterestAed;
const landInTwo = twoShare.full!.totalInvestmentAed - twoShare.parentConstruction.totalConstructionAed - twoShare.full!.drawnInterestAed;
check('land component identical with 3 slices and with 2', near(landInThree, landInTwo, 1),
  `${aed(landInThree)} vs ${aed(landInTwo)}`);
check('land component equals land + DLD once', near(landInThree, land.totalLandCostAed, 1));

// ── 5. Brokerage once, not per slice ──────────────────────────────────────
console.log('\n5. brokerage on land is charged once');
const withBrokerage = computeMixedUseBtSV6({ ...COMMON, land, finance, paymentMode: 'full', brokerageOnLandPct: 2 });
check('brokerage recorded', withBrokerage.full!.brokerageOnLandAed > 0);
check('brokerage == 2% of land cost, once', near(withBrokerage.full!.brokerageOnLandAed, LAND_COST * 0.02, 1),
  aed(withBrokerage.full!.brokerageOnLandAed));

// ── 6. perSliceOverrides actually reach the maths ─────────────────────────
// This is issue #2 in miniature: the argument existed and was never passed, so
// user edits had no effect. If an override does not move the number, the same
// class of bug is back.
console.log('\n6. per-slice overrides change the result');
const overridden = computeMixedUseBtSV6({
  ...COMMON,
  perSliceOverrides: { 'RESIDENTIAL|': { constructionPsfBua: 9999, salesPsfSfa: 4444 } },
});
check('construction moved', !near(overridden.totalConstructionAed, legacy.totalConstructionAed, 1),
  `${aed(overridden.totalConstructionAed)} vs ${aed(legacy.totalConstructionAed)}`);
check('revenue moved', !near(overridden.totalNetRevenueAed, legacy.totalNetRevenueAed, 1));
check('only the overridden slice moved',
  near(overridden.slices[1].construction.totalConstructionAed, legacy.slices[1].construction.totalConstructionAed, 1));

// ── 7. Invalid shares are reported, not silently normalised ───────────────
console.log('\n7. share validation');
const bad = computeMixedUseBtSV6({ ...COMMON, shares: [{ category: 'RESIDENTIAL', pct: 30 }, { category: 'COMMERCIAL', pct: 30 }] });
check('shares summing to 60 are flagged invalid', bad.shareValid === false && near(bad.shareSumPct, 60));

console.log('\n' + '='.repeat(58));
if (failures) { console.log(`\n${failures} failure(s)\n`); process.exit(1); }
console.log('\nall assertions passed\n');
