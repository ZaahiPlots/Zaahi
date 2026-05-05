// ZAAHI Feasibility v6.0 — mock parcel data, in-memory only.
//
// No Supabase tables, no API calls. Exists purely so the preview route can
// render without a real session-aware parcel fetch. Per task constraint:
// "mock in-memory data" — preview is for UX evaluation, not data validation.
//
// Five seed plots span the 9 canonical Land Use categories so every engine
// has a sensible default parcel to load.

export interface MockParcel {
  id: string;
  plotNumber: string;
  district: string;
  community: string | null;
  projectName: string | null;
  masterDeveloper: string | null;
  landUse: string;
  plotAreaSqft: number;
  far: number;
  gfaSqft: number;
  plotPriceAed: number;
  maxFloors: number | null;
}

export const MOCK_PARCELS: MockParcel[] = [
  {
    id: 'mock-001',
    plotNumber: '6457940',
    district: 'Dubai Hills',
    community: 'Hills Park',
    projectName: 'Park Villas',
    masterDeveloper: 'Emaar',
    landUse: 'Residential',
    plotAreaSqft: 14_500,
    far: 1.8,
    gfaSqft: 26_100,
    plotPriceAed: 18_500_000,
    maxFloors: 4,
  },
  {
    id: 'mock-002',
    plotNumber: '6453221',
    district: 'Business Bay',
    community: 'Bay Avenue',
    projectName: 'Bay Tower 12',
    masterDeveloper: 'Damac',
    landUse: 'Commercial',
    plotAreaSqft: 22_000,
    far: 4.5,
    gfaSqft: 99_000,
    plotPriceAed: 62_000_000,
    maxFloors: 28,
  },
  {
    id: 'mock-003',
    plotNumber: '6862011',
    district: 'JLT',
    community: 'Cluster X',
    projectName: 'Mixed-use podium',
    masterDeveloper: 'DMCC',
    landUse: 'Mixed Use',
    plotAreaSqft: 35_000,
    far: 5.0,
    gfaSqft: 175_000,
    plotPriceAed: 130_000_000,
    maxFloors: 35,
  },
  {
    id: 'mock-004',
    plotNumber: '5917442',
    district: 'JAFZA',
    community: 'Logistics District',
    projectName: 'Warehouse Block 4',
    masterDeveloper: 'JAFZA',
    landUse: 'Industrial',
    plotAreaSqft: 80_000,
    far: 1.2,
    gfaSqft: 96_000,
    plotPriceAed: 28_000_000,
    maxFloors: 2,
  },
  {
    id: 'mock-005',
    plotNumber: '6854566',
    district: 'Dubai Healthcare City',
    community: null,
    projectName: 'Specialty Hospital plot',
    masterDeveloper: 'DHCC',
    landUse: 'Healthcare',
    plotAreaSqft: 60_000,
    far: 2.4,
    gfaSqft: 144_000,
    plotPriceAed: 95_000_000,
    maxFloors: 9,
  },
];

export function getParcelById(id: string): MockParcel | undefined {
  return MOCK_PARCELS.find((p) => p.id === id);
}
