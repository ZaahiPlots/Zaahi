// Regression test — an unpriced plot must never reach the model as "land = 0".
//
//   npx tsx scripts/feasibility-land-guard.test.ts
//
// Reported 2026-08-27: plots 5310367 and 3456896 both showed "Listed AED 0",
// Land AED 0 and DLD AED 0, and the calculator returned ROI 4.3% / IRR 6.1% on
// them anyway. A positive return on a plot nobody has priced is a number a buyer
// could act on, so the adapter must distinguish "no price on record" from
// "priced at zero", and the UI must gate the verdict on that distinction.
//
// This asserts the boundary. It fails on the pre-fix tree, where ParcelInput had
// no landPriceKnown field at all and both adapters coerced null to 0.

import { adaptParcelToInput, adaptSidePanelToInput } from '../src/lib/feasibility-v6/parcelInput';

let failures = 0;
function check(name: string, cond: boolean, detail = '') {
  if (cond) {
    console.log(`  PASS  ${name}`);
  } else {
    failures++;
    console.log(`  FAIL  ${name}${detail ? ` — ${detail}` : ''}`);
  }
}

const plan = {
  plotAreaSqft: 10_000,
  far: 2.5,
  maxGfaSqft: 25_000,
  maxFloors: 8,
  landUseMix: [{ category: 'RESIDENTIAL', sub: 'APARTMENT', areaSqm: null }],
  community: null,
  projectName: null,
  masterDeveloper: null,
  notes: null,
} as never;

console.log('\nunpriced-land guard\n' + '='.repeat(52));

// ── adaptParcelToInput ─────────────────────────────────────────────────────
const unpricedParcel = {
  id: 'p1', plotNumber: '5310367', district: 'Burj Khalifa', emirate: 'DUBAI',
  area: 10_000, currentValuation: null,
} as never;
const a = adaptParcelToInput(unpricedParcel, plan);
check('adaptParcelToInput: null valuation -> landPriceKnown false', a.landPriceKnown === false,
  `got ${a.landPriceKnown}`);
check('adaptParcelToInput: plotPriceAed still 0 for the model', a.plotPriceAed === 0);

const pricedParcel = { ...(unpricedParcel as object), currentValuation: '5000000000' } as never;
const b = adaptParcelToInput(pricedParcel, plan);
check('adaptParcelToInput: real valuation -> landPriceKnown true', b.landPriceKnown === true);
check('adaptParcelToInput: fils converted to AED', b.plotPriceAed === 50_000_000,
  `got ${b.plotPriceAed}`);

// A zero valuation is data, not absence — but it is still not a basis for ROI.
const zeroParcel = { ...(unpricedParcel as object), currentValuation: '0' } as never;
const z = adaptParcelToInput(zeroParcel, plan);
check('adaptParcelToInput: valuation of 0 -> landPriceKnown false', z.landPriceKnown === false,
  `got ${z.landPriceKnown}`);

// ── adaptSidePanelToInput ──────────────────────────────────────────────────
const sp = { id: 'p1', plotNumber: '3456896', district: 'Burj Khalifa', emirate: 'DUBAI', area: 10_000 } as never;
const c = adaptSidePanelToInput(sp, plan, null);
check('adaptSidePanelToInput: null price -> landPriceKnown false', c.landPriceKnown === false,
  `got ${c.landPriceKnown}`);
const d = adaptSidePanelToInput(sp, plan, 50_000_000);
check('adaptSidePanelToInput: real price -> landPriceKnown true', d.landPriceKnown === true);
const e = adaptSidePanelToInput(sp, plan, 0);
check('adaptSidePanelToInput: 0 price -> landPriceKnown false', e.landPriceKnown === false,
  `got ${e.landPriceKnown}`);

console.log('='.repeat(52));
if (failures) {
  console.log(`\n${failures} failure(s)\n`);
  process.exit(1);
}
console.log('\nall assertions passed\n');
