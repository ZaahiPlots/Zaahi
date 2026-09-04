// Founder backlog #7 — area formatting by provenance.
//
//   npx tsx scripts/area-format.test.ts
//
// Two failures are pinned here, one in each direction.
//
// BEFORE (main, until 2026-09-04): every area went through Math.round(), so a
// 2,426.5 m² plot displayed as "2,427 m²" and the half metre was gone.
//
// FIRST FIX ATTEMPT (feat/backlog-batch-2, 2026-06-12): every area formatted
// with maximumFractionDigits: 20, which does not show source precision — it
// shows IEEE-754 noise. That branch would have shipped
// "48,437.596875195006 sqft" for a 4,500 m² plot. Twelve of those digits
// describe the conversion constant, not the land.
//
// The rule now: a value the source gave us for the unit being displayed is
// rendered untouched; a value we derived by multiplying or dividing is capped
// at 2 decimals.

import { formatArea, formatAreaWithBoth } from '../src/lib/area-unit';

let failures = 0;
function check(name: string, cond: boolean, detail = '') {
  if (cond) console.log(`  PASS  ${name}`);
  else { failures++; console.log(`  FAIL  ${name}${detail ? ` — ${detail}` : ''}`); }
}
const eq = (name: string, got: string | null, want: string | null) =>
  check(name, got === want, `got ${JSON.stringify(got)}, want ${JSON.stringify(want)}`);

console.log('\narea formatting by provenance (backlog #7)\n' + '='.repeat(60));

// ── 1. Source values are rendered exactly as they arrived ────────────────
console.log('\n1. source value for the displayed unit — untouched');
eq('whole sqft keeps no decimals',        formatArea(33862, null, 'sqft'), '33,862 sqft');
eq('fractional sqft keeps its decimal',   formatArea(14500.5, null, 'sqft'), '14,500.5 sqft');
eq('whole sqm keeps no decimals',         formatArea(null, 2426, 'sqm'), '2,426 m²');
eq('fractional sqm keeps its decimal',    formatArea(null, 2426.5, 'sqm'), '2,426.5 m²');
eq('three decimals survive',              formatArea(1234.567, null, 'sqft'), '1,234.567 sqft');
eq('sub-unit value is not rounded to 0',  formatArea(0.5, null, 'sqft'), '0.5 sqft');

// The old Math.round behaviour, asserted as gone.
check('half metres are no longer swallowed', formatArea(null, 2426.5, 'sqm') !== '2,427 m²');

// When BOTH are present the source for the requested unit wins — no
// conversion happens, so no cap applies.
eq('sqm requested, sqm present -> source path', formatArea(33862, 3146.5, 'sqm'), '3,146.5 m²');
eq('sqft requested, sqft present -> source path', formatArea(33862.25, 3146, 'sqft'), '33,862.25 sqft');

// ── 2. Converted values are capped ───────────────────────────────────────
console.log('\n2. derived value — capped at 2 decimals');
const conv4500 = formatArea(null, 4500, 'sqft');
eq('4,500 sqm -> sqft', conv4500, '48,437.55 sqft');
check(
  'the 2026-06-12 float-noise output cannot recur',
  !/\.\d{3,}/.test(conv4500 ?? ''),
  `got ${conv4500}`,
);
for (const sqm of [2426, 9000, 2750, 5574]) {
  const out = formatArea(null, sqm, 'sqft') ?? '';
  check(`${sqm} sqm -> sqft has at most 2 decimals`, !/\.\d{3,}/.test(out), out);
}
const convSqm = formatArea(33862, null, 'sqm') ?? '';
check('sqft -> sqm has at most 2 decimals', !/\.\d{3,}/.test(convSqm), convSqm);

// A converted value that lands whole shows no trailing ".00".
eq('converted whole number has no trailing zeros', formatArea(null, 1, 'sqm'), '1 m²');

// ── 3. Null handling is unchanged ────────────────────────────────────────
console.log('\n3. absent input still yields null, never "0"');
eq('both null', formatArea(null, null, 'sqft'), null);
eq('both undefined', formatArea(undefined, undefined, 'sqm'), null);
check('NaN is rejected', formatArea(Number.NaN, null, 'sqft') === null);
check('Infinity is rejected', formatArea(Number.POSITIVE_INFINITY, null, 'sqft') === null);
// 0 is a real area, not a missing one — it must render, per the same
// "absent is not zero" line the land-price guard draws.
eq('zero renders rather than vanishing', formatArea(0, null, 'sqft'), '0 sqft');

// ── 4. The both-units row composes from the same rules ───────────────────
console.log('\n4. formatAreaWithBoth');
const both = formatAreaWithBoth(33862, 3146.5, 'sqft');
eq('source on each side of the pair', both, '33,862 sqft (3,146.5 m²)');
const bothConverted = formatAreaWithBoth(33862, null, 'sqft');
check(
  'the converted half of the pair is capped',
  !!bothConverted && !/\.\d{3,}/.test(bothConverted),
  String(bothConverted),
);

console.log('\n' + '='.repeat(60));
if (failures) { console.log(`\n${failures} failure(s)\n`); process.exit(1); }
console.log('\nall assertions passed\n');
