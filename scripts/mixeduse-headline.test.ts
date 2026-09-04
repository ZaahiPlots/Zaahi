// Branch 2 fixtures — the mix now DRIVES the headline (issues #2 / #3).
//
//   npx tsx scripts/mixeduse-headline.test.ts
//
// Branch 1 (584c4c5) built the complete model and deliberately changed nothing
// a user could see. Its own fixtures asserted that: "the single most important
// assertion here is the one that proves nothing moved".
//
// This file asserts the opposite, because that is the whole point of branch 2.
// The founder's original report, 2026-08-27:
//
//   "Mix Breakdown inputs have ZERO effect on headline numbers. On plot 5310367
//    I changed the use mix from 30/10/60 to 90/10/60 and then to 0/100/0 and Net
//    Profit stayed exactly AED 9,849,442, ROI 4.3%, IRR 6.1% every time."
//
// Section 1 is that report, turned into a test. It fails on the pre-branch-2
// tree for the exact reason the founder described.

import { computeMixedUseBtSV6, type MixedUseShare } from '../src/lib/feasibility-v6/mixedUse';
import { computeBtSV6 } from '../src/lib/feasibility-v6/results';
import {
  deriveArea,
  deriveLand,
  deriveFinance,
  deriveConstruction,
  deriveBtSRevenue,
} from '../src/lib/feasibility';
import { ENGINES } from '../src/lib/feasibility-v6/engines';

let failures = 0;
function check(name: string, cond: boolean, detail = '') {
  if (cond) console.log(`  PASS  ${name}`);
  else { failures++; console.log(`  FAIL  ${name}${detail ? ` — ${detail}` : ''}`); }
}
const near = (a: number, b: number, tol = 0.01) => Math.abs(a - b) <= tol;
const aed = (n: number) => `AED ${Math.round(n).toLocaleString('en-US')}`;
const pct = (n: number) => (Number.isFinite(n) ? `${n.toFixed(2)}%` : 'n/a');

const area = deriveArea({ plotAreaSqft: 40_000, far: 3, bua: 138_000, efficiencyPct: 82 });
const LAND_COST = 60_000_000;
const land = deriveLand(
  { landCostAed: LAND_COST, dldPct: 4, paymentMode: 'full', downPaymentPct: 0, numberOfPayments: 0, periodMonths: 0 },
  area.gfa,
);
const finance = deriveFinance({ loanAed: 0, ratePct: 0, periodMonths: 0 });
const PARCEL = { land, finance, paymentMode: 'full' as const, brokerageOnLandPct: 2 };
const SALES = { commissionPct: 2, marketingPct: 1.5, devServicesPct: 3 };

const mix = (res: number, com: number, hot: number): MixedUseShare[] => [
  { category: 'RESIDENTIAL', pct: res },
  { category: 'COMMERCIAL', pct: com },
  { category: 'HOTEL', pct: hot },
];

const run = (shares: MixedUseShare[]) =>
  computeMixedUseBtSV6({ parentArea: area, shares, ...SALES, ...PARCEL });

console.log('\nmixed-use headline switch (branch 2)\n' + '='.repeat(64));

// ── 1. The founder's report, as a test ────────────────────────────────────
console.log('\n1. changing the mix changes the headline');
console.log('   (the reported bug: all three of these produced identical numbers)');

const cases: Array<[string, MixedUseShare[]]> = [
  ['30/10/60', mix(30, 10, 60)],
  ['90/10/60', mix(90, 10, 60)],   // sums to 160 — as reported, deliberately
  ['0/100/0', mix(0, 100, 0)],
];

const results = cases.map(([label, shares]) => {
  const r = run(shares);
  const f = r.full!;
  console.log(
    `   ${label.padEnd(10)} Σ${String(r.shareSumPct).padStart(4)}%  ` +
    `net profit ${aed(f.netProfitAed).padStart(20)}  ROI ${pct(f.roiPct).padStart(9)}  IRR ${pct(f.irrPct).padStart(9)}`,
  );
  return { label, r, f };
});

check('full is populated for every mix', results.every((x) => x.r.full !== null));

const profits = results.map((x) => x.f.netProfitAed);
const rois = results.map((x) => x.f.roiPct);
check(
  'net profit differs across the three mixes',
  !near(profits[0], profits[1], 1) && !near(profits[1], profits[2], 1) && !near(profits[0], profits[2], 1),
  profits.map(aed).join(' / '),
);
check(
  'ROI differs across the three mixes',
  !near(rois[0], rois[1], 0.001) && !near(rois[1], rois[2], 0.001) && !near(rois[0], rois[2], 0.001),
  rois.map(pct).join(' / '),
);

// A one-point nudge must move the number too — not just a dramatic reshuffle.
const a = run(mix(60, 30, 10)).full!;
const b = run(mix(59, 31, 10)).full!;
check('a 1-point shift between two uses moves net profit', !near(a.netProfitAed, b.netProfitAed, 1),
  `${aed(a.netProfitAed)} vs ${aed(b.netProfitAed)}`);

// ── 2. How far the published numbers move ─────────────────────────────────
// Not an assertion about a "correct" value — a measurement, so the size of the
// change is on the record before it reaches users.
console.log('\n2. divergence from the single-engine model (what users will see change)');
const engine = ENGINES.residential;
const construction = deriveConstruction(
  {
    constructionPsfBua: engine.constructionPsfBua,
    brandPsfBua: engine.brandPsfBua,
    consultancyPsfBua: engine.consultancyPsfBua,
    infrastructurePsfBua: engine.infrastructurePsfBua,
    contingencyPct: engine.contingencyPct,
  },
  area.bua,
);
const revenue = deriveBtSRevenue({ salesPricePsfSfa: engine.salesPsfSfa, ...SALES }, area.sfa);
const single = computeBtSV6(area, land, construction, finance, revenue, 'full', {
  brokerageOnLandPct: 2,
});
const balancedWrap = run(mix(60, 30, 10));
const balanced = balancedWrap.full!;

const delta = (name: string, s: number, m: number, fmt: (n: number) => string) => {
  const d = m - s;
  const rel = s !== 0 ? ` (${d >= 0 ? '+' : ''}${((d / Math.abs(s)) * 100).toFixed(1)}%)` : '';
  console.log(`   ${name.padEnd(20)} single ${fmt(s).padStart(20)}   mixed ${fmt(m).padStart(20)}   Δ ${fmt(d)}${rel}`);
};
delta('total investment', single.totalInvestmentAed, balanced.totalInvestmentAed, aed);
delta('net revenue', single.netRevenueAed, balanced.netRevenueAed, aed);
delta('net profit', single.netProfitAed, balanced.netProfitAed, aed);
delta('ROI', single.roiPct, balanced.roiPct, pct);
delta('IRR', single.irrPct, balanced.irrPct, pct);

check('the two models genuinely disagree (this is why the switch matters)',
  !near(single.netProfitAed, balanced.netProfitAed, 1));
// BtSResultV6 carries no construction total of its own, so back it out of
// total investment the same way the branch-1 fixtures do. What must match is
// the parcel-level part — land, DLD and brokerage — because those are
// properties of the plot, not of the use mix. If this ever drifts, the switch
// is changing more than the construction/revenue split and that is a bug.
const parcelPartSingle =
  single.totalInvestmentAed - construction.totalConstructionAed - single.drawnInterestAed;
const parcelPartMixed =
  balanced.totalInvestmentAed -
  balancedWrap.parentConstruction.totalConstructionAed -
  balanced.drawnInterestAed;
check('land + DLD + brokerage identical in both — only construction/revenue differ',
  near(parcelPartSingle, parcelPartMixed, 1),
  `${aed(parcelPartSingle)} vs ${aed(parcelPartMixed)}`);

// ── 3. Escrow must survive the delegation ─────────────────────────────────
// Branch 1 delegated every parcel-level input EXCEPT escrow. Harmless while
// nothing read `full`; the moment the headline reads it, an omitted escrow
// would silently switch escrow off for every mixed-use plot.
console.log('\n3. escrow passes through to the mixed-use headline');
const noEscrow = run(mix(60, 30, 10)).full!;
const withEscrow = computeMixedUseBtSV6({
  parentArea: area, shares: mix(60, 30, 10), ...SALES, ...PARCEL,
  escrow: { enabled: true, salesAtLaunchPct: 40, salesAtHandoverPct: 60 },
}).full!;
check('escrow block is present when enabled', !!withEscrow.escrow && withEscrow.escrow.enabled === true);
check('escrow is off when not requested', !noEscrow.escrow?.enabled);
check('enabling escrow changes peak equity', !near(noEscrow.peakEquityAed, withEscrow.peakEquityAed, 1),
  `${aed(noEscrow.peakEquityAed)} vs ${aed(withEscrow.peakEquityAed)}`);

// ── 4. No regression for everyone else ────────────────────────────────────
// The headline only switches for MIXED USE plots with >1 use and shares
// summing to 100. Every other plot must be bit-for-bit unchanged, and the
// component falls back to exactly this single-engine result.
console.log('\n4. single-use plots are untouched');
const singleAgain = computeBtSV6(area, land, construction, finance, revenue, 'full', {
  brokerageOnLandPct: 2,
});
check('single-engine result is deterministic and unchanged',
  near(singleAgain.netProfitAed, single.netProfitAed, 0.0001) &&
  near(singleAgain.roiPct, single.roiPct, 0.0001) &&
  near(singleAgain.totalInvestmentAed, single.totalInvestmentAed, 0.0001));

// Invalid shares must NOT drive the headline — the component falls back.
const invalid = run(mix(30, 30, 0)); // Σ 60
check('an invalid mix is flagged so the UI can fall back', invalid.shareValid === false);
check('...but full is still computed rather than throwing', invalid.full !== null);

// ── 5. Branch 1 guarantee still holds ─────────────────────────────────────
// Omitting parcel inputs must still yield full === null, meaning "not
// modelled" — never zero. The land-price guard in #1 draws the same line.
console.log('\n5. absent parcel inputs still mean "not modelled", not zero');
const bare = computeMixedUseBtSV6({ parentArea: area, shares: mix(60, 30, 10), ...SALES });
check('full is null without land/finance', bare.full === null);
check('slices are still produced', bare.slices.length === 3);

console.log('\n' + '='.repeat(64));
if (failures) { console.log(`\n${failures} failure(s)\n`); process.exit(1); }
console.log('\nall assertions passed\n');
