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
  /**
   * False when the parcel has no `currentValuation` at all. plotPriceAed is 0
   * in that case, which is NOT the same statement as "this land is free" — and
   * a model fed a zero land cost returns a healthy-looking ROI on a plot whose
   * price nobody knows. Consumers must gate the verdict on this flag and make
   * the user supply a land cost. Never auto-derive one: CLAUDE.md makes
   * currentValuation a manual field.
   */
  landPriceKnown: boolean;
  maxFloors: number | null;
  // Mixed-use breakdown straight from the affection plan. Each entry has
  // a canonical category + DDA sub-classification. When the plot is
  // mixed-use (length > 1), the calculator surfaces a Mix Breakdown
  // panel and routes the composite engine path.
  landUseMix: Array<{ category: string; sub?: string; areaSqm?: number | null }>;
  // DDA general notes (plain-language rewrite). Notes tab pulls design
  // theme, NOC hints, etc. out of this.
  notes: string | null;
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
  notes?: string | null;
}

export function adaptParcelToInput(
  parcel: ParcelLike,
  plan: AffectionPlanLike | null,
): ParcelInput {
  const plotAreaSqft = plan?.plotAreaSqft ?? parcel.area ?? 0;
  const far = plan?.far ?? 2.5;
  const gfaSqft = plan?.maxGfaSqft ?? plotAreaSqft * far;
  const landPriceKnown =
    parcel.currentValuation != null && Number(parcel.currentValuation) > 0;
  const plotPriceAed = landPriceKnown ? Number(parcel.currentValuation) / 100 : 0;

  // Land-use derivation. A plot is MIXED USE only when the affection
  // plan lists more than one DISTINCT category (founder 2026-06-08 —
  // not just multiple sub-classifications of the same category, which
  // was incorrectly classifying single-use plots as MIXED USE).
  const mix = (plan?.landUseMix as LandUseMixEntry[] | null) ?? [];
  const uniqueCategories = new Set(
    mix
      .map((m) => (m.category ?? '').trim().toUpperCase())
      .filter((c) => c.length > 0),
  );
  let landUse = 'RESIDENTIAL';
  if (uniqueCategories.size > 1) {
    landUse = 'MIXED USE';
  } else if (uniqueCategories.size === 1) {
    landUse = [...uniqueCategories][0];
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
    landPriceKnown,
    maxFloors: plan?.maxFloors ?? null,
    landUseMix: mix,
    notes: plan?.notes ?? null,
  };
}

// SidePanel adapter — accepts the `data + plan + aed` triple already computed
// in src/app/parcels/map/SidePanel.tsx, so the v6 calculator can mount inside
// the Client Component without a fresh Prisma fetch (the SidePanel already has
// the parcel loaded via /api/parcels/[id]).
//
// The SidePanel serializes currentValuation as a string (BigInt → JSON), so
// the dirham conversion happens upstream and we just take the AED number here.

interface SidePanelDataLike {
  id: string;
  plotNumber: string;
  district: string;
  emirate: string;
  area: number;
}

interface SidePanelPlanLike {
  community: string | null;
  projectName: string | null;
  masterDeveloper: string | null;
  plotAreaSqft: number | null;
  far: number | null;
  maxGfaSqft: number | null;
  maxFloors: number | null;
  landUseMix: Array<{ category: string; sub?: string; areaSqm?: number | null }> | null;
  notes?: string | null;
}

export function adaptSidePanelToInput(
  data: SidePanelDataLike,
  plan: SidePanelPlanLike | null,
  /**
   * null / 0 means "no price on record". Callers used to pass `aed ?? 0`, which
   * erased the difference between a free plot and an unpriced one before the
   * calculator ever saw it.
   */
  plotPriceAedOrNull: number | null,
): ParcelInput {
  const landPriceKnown = plotPriceAedOrNull != null && plotPriceAedOrNull > 0;
  const plotPriceAed = landPriceKnown ? (plotPriceAedOrNull as number) : 0;
  const plotAreaSqft = plan?.plotAreaSqft ?? data.area ?? 0;
  const far = plan?.far ?? 2.5;
  const gfaSqft = plan?.maxGfaSqft ?? plotAreaSqft * far;

  // Land-use derivation — distinct categories only (founder 2026-06-08).
  // See adaptParcelToInput above for the reasoning.
  const mix = plan?.landUseMix ?? [];
  const uniqueCategories = new Set(
    mix
      .map((m) => (m.category ?? '').trim().toUpperCase())
      .filter((c) => c.length > 0),
  );
  let landUse = 'RESIDENTIAL';
  if (uniqueCategories.size > 1) {
    landUse = 'MIXED USE';
  } else if (uniqueCategories.size === 1) {
    landUse = [...uniqueCategories][0];
  }

  return {
    id: data.id,
    plotNumber: data.plotNumber,
    district: data.district,
    emirate: data.emirate,
    community: plan?.community ?? null,
    projectName: plan?.projectName ?? null,
    masterDeveloper: plan?.masterDeveloper ?? null,
    landUse,
    plotAreaSqft,
    far,
    gfaSqft,
    plotPriceAed,
    landPriceKnown,
    maxFloors: plan?.maxFloors ?? null,
    landUseMix: mix,
    notes: plan?.notes ?? null,
  };
}

// Map a Land-Use string (from the adapter or a future user override) to the
// most appropriate v6 engine. Used by Sprint 1 to seed Residential by default
// when the parcel's land-use is residential. Future sprints expand this map
// as more engines become available.
import type { EngineId } from './engines';

// Routing per spec 00_OVERVIEW.md §3 + founder ratification 2026-06-06:
//   Agricultural / Farm → Engine 13 Land-Hold (manual cost override; per spec §3)
//   Future Development  → Engine 13 Land-Hold (Rezoning Upside sub-mode per spec §3)
//   Investment (POST-spec, added 2026-06-03) → Engine 13 Land-Hold (founder ratified)
// HOSPITAL substring intentionally checked AFTER HEALTHCARE so "HOSPITALITY" wins
// for hotels and "HOSPITAL" (clinic context) doesn't accidentally route there.
export function defaultEngineFor(landUse: string): EngineId {
  const u = (landUse ?? '').toUpperCase().trim();
  if (!u) return 'residential';
  if (u.includes('MIXED')) return 'mixeduse';
  if (u.includes('HOTEL') || u.includes('HOSPITALITY') || u.includes('RESORT'))
    return 'hospitality';
  if (u.includes('OFFICE')) return 'office';
  if (u.includes('RETAIL') || u.includes('MALL') || u.includes('SHOWROOM'))
    return 'retail';
  if (u.includes('INDUSTRIAL') || u.includes('WAREHOUSE') || u.includes('LOGISTIC') || u.includes('FACTORY'))
    return 'industrial';
  if (u.includes('HEALTH') || u.includes('CLINIC') || u.includes('HOSPITAL'))
    return 'healthcare';
  if (u.includes('EDUCATION') || u.includes('SCHOOL') || u.includes('UNIVERSITY') || u.includes('ACADEMY') || u.includes('NURSERY'))
    return 'educational';
  if (u.includes('COMMERCIAL')) return 'office';
  if (u.includes('AGRICULTURAL') || u.includes('FARM')) return 'landhold';
  if (u.includes('FUTURE')) return 'landhold';
  if (u.includes('INVESTMENT')) return 'landhold';
  return 'residential';
}
