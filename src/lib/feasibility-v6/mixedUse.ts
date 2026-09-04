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
  type LandPaymentMode,
} from '@/lib/feasibility';
import { ENGINES, type EngineId } from './engines';
// Delegation, not duplication — see the note on MixedUseBtSResultV6.full.
// results.ts does not import this module, so there is no cycle.
import { computeBtSV6, type BtSResultV6 } from './results';
import { type EscrowDrawdownInputs } from './escrowDrawdown';

/**
 * Escrow options in the same shape computeBtSV6 takes them. Declared here so
 * the mixed-use path cannot silently diverge from the single-engine path: if
 * computeBtSV6 gains an escrow field, this fails to compile rather than
 * quietly dropping it from every mixed-use headline.
 */
export type MixedUseEscrowInput = Omit<
  EscrowDrawdownInputs,
  'monthsToCompletion' | 'totalConstructionAed' | 'totalRevenueAed'
>;

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

  /**
   * Slices aggregated into one parcel-level construction and revenue figure.
   * Present whenever slices were produced. This is what a complete model is
   * built from — the mix splits cost and revenue by area share, and everything
   * else (land, DLD, brokerage, finance) is a property of the parcel, not of a
   * slice, so it is applied ONCE to this aggregate rather than divided up.
   */
  parentConstruction: ConstructionDerived;
  parentRevenue: BtSRevenueDerived;

  /**
   * The complete feasibility for the mix — total investment, net profit, ROI,
   * IRR, peak equity, cashflows — or null when the caller supplied no
   * parcel-level land/finance inputs.
   *
   * null means "not modelled", NOT "zero". The same distinction the land-price
   * guard draws: an absent input must never read as a free one.
   *
   * This is deliberately produced by delegating to computeBtSV6 — the SAME
   * function the headline uses — rather than by reimplementing the investment
   * and return maths here. Two independent implementations of one calculation
   * is precisely what produced the contradiction this work exists to fix
   * (composite construction 162.3M against a headline 195.6M on plot 6457790);
   * a second copy would guarantee it recurs the moment either side changed.
   */
  full: BtSResultV6 | null;
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

  /**
   * Parcel-level inputs. Supply these and `full` is a complete feasibility;
   * omit them and `full` is null and the function behaves exactly as before.
   * They are OPTIONAL so that adding a complete model changes no existing
   * caller and no published number — switching the headline over is a separate,
   * reviewable step.
   *
   * None of these is divided across slices. Land is bought once, DLD is paid
   * once on that purchase, the broker is paid once, and the loan is taken
   * against the project — not against a use-class.
   */
  land?: LandDerived;
  finance?: FinanceDerived;
  paymentMode?: LandPaymentMode;
  brokerageOnLandPct?: number;
  constructionMonths?: number;
  loanAed?: number;
  ratePct?: number;
  financePeriodMonths?: number;

  /**
   * Escrow drawdown, forwarded verbatim to computeBtSV6.
   *
   * Added 2026-09-04 with the headline switch. Branch 1 delegated everything
   * EXCEPT escrow, which was invisible while nothing consumed `full`. The
   * moment the headline reads `full`, omitting it would have turned escrow off
   * for every mixed-use plot — silently, because the escrow rows read
   * `result.escrow` and would simply have rendered nothing while Net Profit,
   * peak equity and IRR all moved. That is the same class of defect as the
   * half-model this work exists to remove.
   */
  escrow?: MixedUseEscrowInput;
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

  // ── Aggregate the slices back into one parcel-level pair ────────────────
  // Every field on both shapes is a plain sum, so the aggregate is exact
  // rather than a re-derivation from a blended psf. The two per-sqft figures
  // are recovered from the totals so they stay consistent with them.
  const sum = <T extends object>(pick: (s: MixedUseSlice) => number) =>
    slices.reduce((acc, sl) => acc + pick(sl), 0);

  const parentBua = args.parentArea.bua;
  const parentConstruction: ConstructionDerived = {
    baseConstructionAed: sum((sl) => sl.construction.baseConstructionAed),
    contingencyAed: sum((sl) => sl.construction.contingencyAed),
    totalConstructionAed: sum((sl) => sl.construction.totalConstructionAed),
    constructionAed: sum((sl) => sl.construction.constructionAed),
    brandAed: sum((sl) => sl.construction.brandAed),
    consultancyAed: sum((sl) => sl.construction.consultancyAed),
    infrastructureAed: sum((sl) => sl.construction.infrastructureAed),
    perSqftBuaTotal:
      parentBua > 0 ? sum((sl) => sl.construction.baseConstructionAed) / parentBua : 0,
    perSqftBuaWithContingency:
      parentBua > 0 ? sum((sl) => sl.construction.totalConstructionAed) / parentBua : 0,
  };

  const parentRevenue: BtSRevenueDerived = {
    grossRevenueAed: sum((sl) => sl.revenue.grossRevenueAed),
    commissionAed: sum((sl) => sl.revenue.commissionAed),
    marketingAed: sum((sl) => sl.revenue.marketingAed),
    devServicesAed: sum((sl) => sl.revenue.devServicesAed),
    salesCostsAed: sum((sl) => sl.revenue.salesCostsAed),
    netRevenueAed: sum((sl) => sl.revenue.netRevenueAed),
  };

  // ── Complete model, by delegation ───────────────────────────────────────
  // Only when the caller supplied parcel-level inputs. Otherwise null, which
  // means "not modelled" and must never be read as zero.
  const full: BtSResultV6 | null =
    args.land && args.finance
      ? computeBtSV6(
          args.parentArea,
          args.land,
          parentConstruction,
          args.finance,
          parentRevenue,
          args.paymentMode ?? 'full',
          {
            constructionMonths: args.constructionMonths,
            loanAed: args.loanAed,
            ratePct: args.ratePct,
            financePeriodMonths: args.financePeriodMonths,
            brokerageOnLandPct: args.brokerageOnLandPct ?? 0,
            escrow: args.escrow,
          },
        )
      : null;

  return {
    slices,
    totalConstructionAed: totalConstruction,
    totalGrossRevenueAed: totalGross,
    totalNetRevenueAed: totalNet,
    shareSumPct: shareSum,
    shareValid,
    parentConstruction,
    parentRevenue,
    full,
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
