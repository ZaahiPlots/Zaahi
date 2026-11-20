// ZAAHI Feasibility v6.0 — production parcel → calculator-input adapter.
//
// Lifts a Prisma-loaded Parcel (+ latest AffectionPlan) into the shape the
// calculator client component consumes. Mirrors src/app/preview/feasibility-v6/
// mockData.ts MockParcel so the same calculator UI works for both.
//
// Land-use derivation logic mirrors deriveLandUse() in src/app/parcels/map/
// page.tsx and the SidePanel "primary category" rule (multi-category mix →
// "MIXED USE", single mix → first category, no mix → '' = unknown; the
// calculator then asks for an engine instead of assuming Residential).
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
  /** '' when the plot has no land use on record. Never defaulted to Residential. */
  landUse: string;
  plotAreaSqft: number;
  /**
   * null when the affection plan carries no FAR and no Max GFA to derive one
   * from. Audit B6: the calculator used to print an invented 2.5 as fact.
   */
  far: number | null;
  /** The plan's Max GFA when it has one (it wins over plot × FAR — audit M10). */
  maxGfaSqft: number | null;
  /** Max GFA, else plot × FAR, else null. Display only. */
  gfaSqft: number | null;
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
  const { far, maxGfaSqft, gfaSqft } = resolvePlanArea(plotAreaSqft, plan?.far ?? null, plan?.maxGfaSqft ?? null);
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
  let landUse = '';
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
    maxGfaSqft,
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
  const { far, maxGfaSqft, gfaSqft } = resolvePlanArea(plotAreaSqft, plan?.far ?? null, plan?.maxGfaSqft ?? null);

  // Land-use derivation — distinct categories only (founder 2026-06-08).
  // See adaptParcelToInput above for the reasoning.
  const mix = plan?.landUseMix ?? [];
  const uniqueCategories = new Set(
    mix
      .map((m) => (m.category ?? '').trim().toUpperCase())
      .filter((c) => c.length > 0),
  );
  let landUse = '';
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
    maxGfaSqft,
    gfaSqft,
    plotPriceAed,
    landPriceKnown,
    maxFloors: plan?.maxFloors ?? null,
    landUseMix: mix,
    notes: plan?.notes ?? null,
  };
}

// FAR / GFA straight from the plan. A FAR is derived only from the plan's own
// Max GFA — never assumed.
function resolvePlanArea(
  plotAreaSqft: number,
  planFar: number | null,
  planMaxGfa: number | null,
): { far: number | null; maxGfaSqft: number | null; gfaSqft: number | null } {
  const maxGfaSqft = planMaxGfa != null && planMaxGfa > 0 ? planMaxGfa : null;
  let far = planFar != null && planFar > 0 ? planFar : null;
  if (far == null && maxGfaSqft != null && plotAreaSqft > 0) far = maxGfaSqft / plotAreaSqft;
  const gfaSqft = maxGfaSqft ?? (far != null && plotAreaSqft > 0 ? plotAreaSqft * far : null);
  return { far, maxGfaSqft, gfaSqft };
}

// Land use → engine now lives in ./routing.ts, where a land use can also be
// "not a development plot" or "unknown" instead of falling through to
// Residential (audit B5). This wrapper returns null in both of those cases.
import type { EngineId } from './engines';
import { routeLandUse } from './routing';

export function defaultEngineFor(landUse: string): EngineId | null {
  return routeLandUse(landUse).engineId;
}
