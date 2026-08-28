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

export const MOCK_PARCELS: MockParcel[] = [
  {
    id: 'mock-001',
    plotNumber: '6457940',
    district: 'Dubai Hills',
    emirate: 'Dubai',
    community: 'Hills Park',
    projectName: 'Park Villas',
    masterDeveloper: 'Emaar',
    landUse: 'Residential',
    plotAreaSqft: 14_500,
    far: 1.8,
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
    landUse: 'Commercial',
    plotAreaSqft: 22_000,
    far: 4.5,
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
    landUse: 'Mixed Use',
    plotAreaSqft: 35_000,
    far: 5.0,
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
    landUse: 'Industrial',
    plotAreaSqft: 80_000,
    far: 1.2,
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
    landUse: 'Healthcare',
    plotAreaSqft: 60_000,
    far: 2.4,
    gfaSqft: 144_000,
    plotPriceAed: 95_000_000,
    // Every preview fixture is deliberately priced; the unpriced path is
    // exercised by the e2e/unit cases, not by the showcase data.
    landPriceKnown: true,
    maxFloors: 9,
    landUseMix: [{ category: 'HEALTHCARE', sub: 'HOSPITAL', areaSqm: 5574 }],
    notes: null,
  },
];

export function getParcelById(id: string): MockParcel | undefined {
  return MOCK_PARCELS.find((p) => p.id === id);
}
