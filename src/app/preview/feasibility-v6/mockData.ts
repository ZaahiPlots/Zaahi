// ZAAHI Feasibility v6.0 — mock parcel data, in-memory only.
//
// Used only by the preview route /preview/feasibility-v6 for parcel-picker UX
// evaluation. Production /parcels/[id]/feasibility passes a ParcelInput built
// from a real Prisma fetch via adaptParcelToInput().
//
// MockParcel is a type alias for ParcelInput so the same calculator component
// works for both. Five seed plots span the 9 canonical Land Use categories.

import type { ParcelInput } from '@/lib/feasibility-v6/parcelInput';

export type MockParcel = ParcelInput;

// landUse is UPPERCASE here to match what production actually produces:
// buildParcelInput sets 'MIXED USE' for a multi-category plan, otherwise the
// raw DDA category (`parcelInput.ts:94-98`), and those are uppercase.
//
// These mocks used to be title case ('Mixed Use'), which meant the preview
// route could never render the Mix breakdown panel at all — the component
// gates it on `parcel.landUse === 'MIXED USE'`. So the one route that exists
// to exercise the calculator was silently unable to exercise its mixed-use
// path. Found 2026-09-04 while writing the headline-switch e2e.

export const MOCK_PARCELS: MockParcel[] = [
  {
    id: 'mock-001',
    plotNumber: '6457940',
    district: 'Dubai Hills',
    emirate: 'Dubai',
    community: 'Hills Park',
    projectName: 'Park Villas',
    masterDeveloper: 'Emaar',
    landUse: 'RESIDENTIAL',
    plotAreaSqft: 14_500,
    far: 1.8,
    maxGfaSqft: null,
    gfaSqft: 26_100,
    plotPriceAed: 18_500_000,
    // Every preview fixture is deliberately priced; the unpriced path is
    // exercised by the e2e/unit cases, not by the showcase data.
    landPriceKnown: true,
    maxFloors: 4,
    landUseMix: [{ category: 'RESIDENTIAL', sub: 'VILLA', areaSqm: 2426 }],
    notes: null,
  },
  {
    id: 'mock-002',
    plotNumber: '6453221',
    district: 'Business Bay',
    emirate: 'Dubai',
    community: 'Bay Avenue',
    projectName: 'Bay Tower 12',
    masterDeveloper: 'Damac',
    landUse: 'COMMERCIAL',
    plotAreaSqft: 22_000,
    far: 4.5,
    maxGfaSqft: null,
    gfaSqft: 99_000,
    plotPriceAed: 62_000_000,
    // Every preview fixture is deliberately priced; the unpriced path is
    // exercised by the e2e/unit cases, not by the showcase data.
    landPriceKnown: true,
    maxFloors: 28,
    landUseMix: [{ category: 'COMMERCIAL', sub: 'OFFICES', areaSqm: 2044 }],
    notes: null,
  },
  {
    id: 'mock-003',
    plotNumber: '6862011',
    district: 'JLT',
    emirate: 'Dubai',
    community: 'Cluster X',
    projectName: 'Mixed-use podium',
    masterDeveloper: 'DMCC',
    landUse: 'MIXED USE',
    plotAreaSqft: 35_000,
    far: 5.0,
    maxGfaSqft: null,
    gfaSqft: 175_000,
    plotPriceAed: 130_000_000,
    // Every preview fixture is deliberately priced; the unpriced path is
    // exercised by the e2e/unit cases, not by the showcase data.
    landPriceKnown: true,
    maxFloors: 35,
    landUseMix: [
      { category: 'RESIDENTIAL', sub: 'APARTMENTS', areaSqm: 9000 },
      { category: 'COMMERCIAL', sub: 'OFFICES', areaSqm: 4500 },
      { category: 'COMMERCIAL', sub: 'RETAIL PODIUM', areaSqm: 2750 },
    ],
    notes: null,
  },
  {
    id: 'mock-004',
    plotNumber: '5917442',
    district: 'JAFZA',
    emirate: 'Dubai',
    community: 'Logistics District',
    projectName: 'Warehouse Block 4',
    masterDeveloper: 'JAFZA',
    landUse: 'INDUSTRIAL',
    plotAreaSqft: 80_000,
    far: 1.2,
    maxGfaSqft: null,
    gfaSqft: 96_000,
    plotPriceAed: 28_000_000,
    // Every preview fixture is deliberately priced; the unpriced path is
    // exercised by the e2e/unit cases, not by the showcase data.
    landPriceKnown: true,
    maxFloors: 2,
    landUseMix: [{ category: 'INDUSTRIAL', sub: 'WAREHOUSE', areaSqm: 7432 }],
    notes: null,
  },
  {
    id: 'mock-005',
    plotNumber: '6854566',
    district: 'Dubai Healthcare City',
    emirate: 'Dubai',
    community: null,
    projectName: 'Specialty Hospital plot',
    masterDeveloper: 'DHCC',
    landUse: 'HEALTHCARE',
    plotAreaSqft: 60_000,
    far: 2.4,
    maxGfaSqft: null,
    gfaSqft: 144_000,
    plotPriceAed: 95_000_000,
    // Every preview fixture is deliberately priced; the unpriced path is
    // exercised by the e2e/unit cases, not by the showcase data.
    landPriceKnown: true,
    maxFloors: 9,
    landUseMix: [{ category: 'HEALTHCARE', sub: 'HOSPITAL', areaSqm: 5574 }],
    notes: null,
  },
  // ── Audit 2026-11-20 gate cases ────────────────────────────────────────
  // Each reproduces one "confident wrong answer" from the audit so the gates
  // can be seen (and tested) without a database.
  {
    // B1 — no price on record: no result until the user types a land cost.
    id: 'mock-006',
    plotNumber: '3720111',
    district: 'Jumeirah Central',
    emirate: 'Dubai',
    community: null,
    projectName: null,
    masterDeveloper: null,
    landUse: 'RESIDENTIAL',
    plotAreaSqft: 144_250,
    far: 2.5,
    maxGfaSqft: null,
    gfaSqft: 360_625,
    plotPriceAed: 0,
    landPriceKnown: false,
    maxFloors: null,
    landUseMix: [{ category: 'RESIDENTIAL', sub: 'APARTMENTS' }],
    notes: null,
  },
  {
    // B6 — no FAR and no Max GFA on the plan: the user must enter the FAR.
    id: 'mock-007',
    plotNumber: '9000007',
    district: 'Al Barsha',
    emirate: 'Dubai',
    community: null,
    projectName: null,
    masterDeveloper: null,
    landUse: 'COMMERCIAL',
    plotAreaSqft: 20_000,
    far: null,
    maxGfaSqft: null,
    gfaSqft: null,
    plotPriceAed: 30_000_000,
    landPriceKnown: true,
    maxFloors: null,
    landUseMix: [],
    notes: null,
  },
  {
    // B5 — open space is not development land.
    id: 'mock-008',
    plotNumber: '9000008',
    district: 'Dubai South',
    emirate: 'Dubai',
    community: null,
    projectName: null,
    masterDeveloper: null,
    landUse: 'OPEN SPACE',
    plotAreaSqft: 50_000,
    far: 1.0,
    maxGfaSqft: null,
    gfaSqft: 50_000,
    plotPriceAed: 10_000_000,
    landPriceKnown: true,
    maxFloors: null,
    landUseMix: [],
    notes: null,
  },
  {
    // M10 — the plan's Max GFA wins over plot area x FAR.
    id: 'mock-009',
    plotNumber: '9000009',
    district: 'Business Bay',
    emirate: 'Dubai',
    community: null,
    projectName: 'Hotel plot',
    masterDeveloper: null,
    landUse: 'HOTEL',
    plotAreaSqft: 40_000,
    far: 4.0,
    maxGfaSqft: 150_000,
    gfaSqft: 150_000,
    plotPriceAed: 120_000_000,
    landPriceKnown: true,
    maxFloors: 30,
    landUseMix: [{ category: 'HOSPITALITY', sub: 'HOTEL' }],
    notes: null,
  },
];

export function getParcelById(id: string): MockParcel | undefined {
  return MOCK_PARCELS.find((p) => p.id === id);
}
