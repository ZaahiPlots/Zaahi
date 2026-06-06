// ZAAHI Feasibility v6.0 — Mixed-Use composite calculator (B2 2026-06-06).
//
// When a plot's land use is "MIXED USE", the affection plan typically lists
// multiple sub-uses with their own GFA allocations (e.g. Residential 60% +
// Office 30% + Retail 10%). Rather than treating the plot as a single
// generic "mixeduse" engine with blended psf defaults (which obscures the
// component-level economics), v6 splits the GFA by share and runs the
// matching engine on each slice — then sums the resulting investment,
// revenue, and net profit.
//
// Mapping (founder-ratified 2026-06-06):
//   RESIDENTIAL → 'residential'
//   COMMERCIAL+OFFICES → 'office'
//   COMMERCIAL+RETAIL → 'retail'
//   HOTEL / HOSPITALITY → 'hospitality'
//
// Note: this wraps v5 deriveArea/deriveLand/deriveConstruction/deriveBtSRevenue
// and computeBtSV6 — v5 core math is untouched. Land cost + DLD + brokerage
// (the shared-plot costs) are NOT split across slices; they sit on the
// composite parent. Only construction + revenue are sliced.

import {
  deriveArea,
  deriveConstruction,
  deriveBtSRevenue,
  type AreaDerived,
  type LandDerived,
  type ConstructionDerived,
  type FinanceDerived,
  type BtSResult,
  type BtSRevenueDerived,
} from '@/lib/feasibility';
import { ENGINES, type EngineId } from './engines';

export interface MixedUseShare {
  // One of the 10 ZAAHI canonical categories (or sub label).
  category: string;
  sub?: string;
  // Share of total GFA, in percent. Σ across shares should equal 100.
  pct: number;
}

export interface MixedUseSlice {
  share: MixedUseShare;
  engineId: EngineId;
  area: AreaDerived;
  construction: ConstructionDerived;
  revenue: BtSRevenueDerived;
  // Per-slice results
  totalConstructionAed: number;
  netRevenueAed: number;
  netProfitAed: number; // slice's contribution to net profit (no land/DLD)
}

export interface MixedUseBtSResultV6 {
  slices: MixedUseSlice[];
  totalConstructionAed: number;
  totalGrossRevenueAed: number;
  totalNetRevenueAed: number;
  shareSumPct: number; // for the UI validation banner — must equal 100
  shareValid: boolean;
}

// Routing per founder ratification 2026-06-06.
export function shareToEngine(share: MixedUseShare): EngineId {
  const cat = (share.category ?? '').toUpperCase().trim();
  const sub = (share.sub ?? '').toUpperCase().trim();
  if (cat.includes('HOTEL') || cat.includes('HOSPITALITY')) return 'hospitality';
  if (cat.includes('COMMERCIAL')) {
    if (sub.includes('OFFICE')) return 'office';
    if (sub.includes('RETAIL') || sub.includes('SHOWROOM') || sub.includes('MALL')) return 'retail';
    return 'office'; // default for plain COMMERCIAL
  }
  if (cat.includes('RETAIL')) return 'retail';
  if (cat.includes('OFFICE')) return 'office';
  if (cat.includes('INDUSTRIAL') || cat.includes('WAREHOUSE')) return 'industrial';
  if (cat.includes('HEALTH')) return 'healthcare';
  if (cat.includes('EDUCATION') || cat.includes('SCHOOL')) return 'educational';
  return 'residential';
}

// Build the per-slice area/construction/revenue inputs by scaling the
// parent plot's BUA and SFA by each share's percentage, then running the
// matching engine's psf defaults. Caller can later expose per-slice
// overrides on top of this; B2 first cut surfaces engine defaults.
export function computeMixedUseBtSV6(args: {
  parentArea: AreaDerived;
  shares: MixedUseShare[];
  // Caller may override psf per slice; if absent, engine default seeds.
  perSliceOverrides?: Record<string, {
    constructionPsfBua?: number;
    salesPsfSfa?: number;
  }>;
  commissionPct: number;
  marketingPct: number;
  devServicesPct: number;
}): MixedUseBtSResultV6 {
  const slices: MixedUseSlice[] = [];
  let shareSum = 0;
  for (const share of args.shares) {
    shareSum += share.pct;
  }
  const shareValid = Math.abs(shareSum - 100) < 0.5;

  for (const share of args.shares) {
    const engineId = shareToEngine(share);
    const engine = ENGINES[engineId];
    const sliceBua = args.parentArea.bua * (share.pct / 100);
    const sliceGfa = args.parentArea.gfa * (share.pct / 100);
    const sliceSfa = sliceGfa * (args.parentArea.efficiencyPct / 100);
    const sliceArea: AreaDerived = {
      ...args.parentArea,
      gfa: sliceGfa,
      bua: sliceBua,
      sfa: sliceSfa,
      buaGfaRatio: sliceGfa > 0 ? sliceBua / sliceGfa : 0,
    };
    const sliceKey = `${share.category}|${share.sub ?? ''}`;
    const ov = args.perSliceOverrides?.[sliceKey];
    const construction = deriveConstruction(
      {
        constructionPsfBua: ov?.constructionPsfBua ?? engine.constructionPsfBua,
        brandPsfBua: engine.brandPsfBua,
        consultancyPsfBua: engine.consultancyPsfBua,
        infrastructurePsfBua: engine.infrastructurePsfBua,
        contingencyPct: engine.contingencyPct,
      },
      sliceBua,
    );
    const revenue = deriveBtSRevenue(
      {
        salesPricePsfSfa: ov?.salesPsfSfa ?? engine.salesPsfSfa,
        commissionPct: args.commissionPct,
        marketingPct: args.marketingPct,
        devServicesPct: args.devServicesPct,
      },
      sliceSfa,
    );
    slices.push({
      share,
      engineId,
      area: sliceArea,
      construction,
      revenue,
      totalConstructionAed: construction.totalConstructionAed,
      netRevenueAed: revenue.netRevenueAed,
      // Per-slice net profit excludes shared plot costs (land + DLD +
      // brokerage + finance). The composite calc nets those at parent.
      netProfitAed: revenue.netRevenueAed - construction.totalConstructionAed,
    });
  }

  let totalConstruction = 0;
  let totalGross = 0;
  let totalNet = 0;
  for (const s of slices) {
    totalConstruction += s.totalConstructionAed;
    totalGross += s.revenue.grossRevenueAed;
    totalNet += s.revenue.netRevenueAed;
  }

  return {
    slices,
    totalConstructionAed: totalConstruction,
    totalGrossRevenueAed: totalGross,
    totalNetRevenueAed: totalNet,
    shareSumPct: shareSum,
    shareValid,
  };
}

// Parse the AffectionPlan.landUseMix JSON into the share format.
// Caller passes the raw JSON array as received from the parcel adapter.
// Returns null when the mix isn't actually multi-category (single-cat
// plots don't need the breakdown UI).
export function landUseMixToShares(
  mix: unknown,
): MixedUseShare[] | null {
  if (!Array.isArray(mix) || mix.length === 0) return null;
  const entries = mix as Array<{ category?: string; sub?: string; areaSqm?: number | null }>;
  // Only treat as mixed-use when there's more than one entry.
  if (entries.length < 2) return null;

  // If every entry has areaSqm, seed % from areaSqm/totalSqm.
  // Otherwise default to equal split.
  const allHaveArea = entries.every((e) => typeof e.areaSqm === 'number' && (e.areaSqm ?? 0) > 0);
  if (allHaveArea) {
    const totalSqm = entries.reduce((s, e) => s + (e.areaSqm ?? 0), 0);
    return entries.map((e) => ({
      category: (e.category ?? '').toString(),
      sub: e.sub,
      pct: totalSqm > 0 ? ((e.areaSqm ?? 0) / totalSqm) * 100 : 0,
    }));
  }
  const equal = 100 / entries.length;
  return entries.map((e) => ({
    category: (e.category ?? '').toString(),
    sub: e.sub,
    pct: equal,
  }));
}
