// ZAAHI Feasibility v6.0 — production parcel → calculator-input adapter.
//
// Lifts a Prisma-loaded Parcel (+ latest AffectionPlan) into the shape the
// calculator client component consumes. Mirrors src/app/preview/feasibility-v6/
// mockData.ts MockParcel so the same calculator UI works for both.
//
// Land-use derivation logic mirrors deriveLandUse() in src/app/parcels/map/
// page.tsx and the SidePanel "primary category" rule (multi-category mix →
// "MIXED USE", single mix → first category, no mix → "RESIDENTIAL" fallback).
// Kept minimal here: the v6 EngineSelector lets the user override the auto-
// derived land use anyway, so this is just a sensible default.

export interface ParcelInput {
  id: string;
  plotNumber: string;
  district: string;
  emirate: string;
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

interface LandUseMixEntry {
  category: string;
  sub?: string;
  areaSqm?: number | null;
}

interface ParcelLike {
  id: string;
  plotNumber: string;
  district: string;
  emirate: string;
  area: number;
  currentValuation: bigint | null;
}

interface AffectionPlanLike {
  community: string | null;
  projectName: string | null;
  masterDeveloper: string | null;
  plotAreaSqft: number | null;
  far: number | null;
  maxGfaSqft: number | null;
  maxFloors: number | null;
  landUseMix: unknown;
}

export function adaptParcelToInput(
  parcel: ParcelLike,
  plan: AffectionPlanLike | null,
): ParcelInput {
  const plotAreaSqft = plan?.plotAreaSqft ?? parcel.area ?? 0;
  const far = plan?.far ?? 2.5;
  const gfaSqft = plan?.maxGfaSqft ?? plotAreaSqft * far;
  const plotPriceAed =
    parcel.currentValuation != null ? Number(parcel.currentValuation) / 100 : 0;

  // Land-use derivation
  const mix = (plan?.landUseMix as LandUseMixEntry[] | null) ?? [];
  let landUse = 'RESIDENTIAL';
  if (mix.length > 1) {
    landUse = 'MIXED USE';
  } else if (mix.length === 1 && mix[0]?.category) {
    landUse = mix[0].category.toUpperCase();
  }

  return {
    id: parcel.id,
    plotNumber: parcel.plotNumber,
    district: parcel.district,
    emirate: parcel.emirate,
    community: plan?.community ?? null,
    projectName: plan?.projectName ?? null,
    masterDeveloper: plan?.masterDeveloper ?? null,
    landUse,
    plotAreaSqft,
    far,
    gfaSqft,
    plotPriceAed,
    maxFloors: plan?.maxFloors ?? null,
  };
}

// Map a Land-Use string (from the adapter or a future user override) to the
// most appropriate v6 engine. Used by Sprint 1 to seed Residential by default
// when the parcel's land-use is residential. Future sprints expand this map
// as more engines become available.
import type { EngineId } from './engines';

export function defaultEngineFor(landUse: string): EngineId {
  const u = landUse.toUpperCase();
  if (u.includes('MIXED')) return 'mixeduse';
  if (u.includes('OFFICE') || u.includes('COMMERCIAL')) return 'office';
  if (u.includes('RETAIL')) return 'retail';
  if (u.includes('HOTEL') || u.includes('HOSPITALITY')) return 'hospitality';
  if (u.includes('INDUSTRIAL') || u.includes('WAREHOUSE') || u.includes('LOGISTIC'))
    return 'industrial';
  if (u.includes('HEALTH') || u.includes('HOSPITAL') || u.includes('CLINIC'))
    return 'healthcare';
  if (u.includes('EDUCATION') || u.includes('SCHOOL') || u.includes('UNIVERSITY'))
    return 'educational';
  return 'residential';
}
