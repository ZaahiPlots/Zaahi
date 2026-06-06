import { adaptParcelToInput } from '@/lib/feasibility-v6/parcelInput';

const mkParcel = (overrides: Partial<{ id: string; plotNumber: string; district: string; emirate: string; area: number; currentValuation: bigint | null }> = {}) => ({
  id: 'p',
  plotNumber: '0',
  district: 'D',
  emirate: 'Dubai',
  area: 10000,
  currentValuation: 100_000_000_00n,
  ...overrides,
});

const mkPlan = (mix: Array<{ category: string; sub?: string; areaSqm?: number | null }>) => ({
  community: null, projectName: null, masterDeveloper: null,
  plotAreaSqft: 10000, far: 2.5, maxGfaSqft: 25000, maxFloors: 10,
  landUseMix: mix, notes: null,
});

// Case 1: JADDAF WATERFRONT 3260913 — TRULY mixed-use
const mixed = adaptParcelToInput(
  mkParcel({ plotNumber: '3260913', district: 'Al Jadaf' }),
  mkPlan([
    { category: 'RESIDENTIAL', sub: 'Apartments', areaSqm: 5000 },
    { category: 'COMMERCIAL', sub: 'Offices', areaSqm: 3000 },
    { category: 'COMMERCIAL', sub: 'Retail Podium', areaSqm: 1000 },
  ]),
);
console.log(`Case 1 (truly mixed):    landUse=${mixed.landUse}  mix.length=${mixed.landUseMix.length}`);

// Case 2: Residential plot with multiple sub-classifications (the bug case)
const resi = adaptParcelToInput(
  mkParcel({ plotNumber: '6457940', district: 'Dubai Hills' }),
  mkPlan([
    { category: 'RESIDENTIAL', sub: 'Permanent Apt', areaSqm: 1000 },
    { category: 'RESIDENTIAL', sub: 'Townhouse', areaSqm: 800 },
  ]),
);
console.log(`Case 2 (single-use):     landUse=${resi.landUse}  mix.length=${resi.landUseMix.length}`);

// Case 3: Single-entry COMMERCIAL plot
const office = adaptParcelToInput(
  mkParcel({ plotNumber: '6453221', district: 'Business Bay' }),
  mkPlan([{ category: 'COMMERCIAL', sub: 'Offices', areaSqm: 2044 }]),
);
console.log(`Case 3 (single-cat):     landUse=${office.landUse}  mix.length=${office.landUseMix.length}`);

console.log();
console.log('Panel visible only when landUse === "MIXED USE":');
console.log(`  Case 1 → ${mixed.landUse === 'MIXED USE' ? '✓ SHOW Mix Breakdown' : '✗ HIDE'}`);
console.log(`  Case 2 → ${resi.landUse === 'MIXED USE' ? '✗ SHOW (BUG)' : '✓ HIDE Mix Breakdown'}`);
console.log(`  Case 3 → ${office.landUse === 'MIXED USE' ? '✗ SHOW (BUG)' : '✓ HIDE Mix Breakdown'}`);
