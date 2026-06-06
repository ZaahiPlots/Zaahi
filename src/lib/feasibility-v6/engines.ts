// ZAAHI Feasibility v6.0 — engine catalogue.
//
// 13 specialised engines + 2 modifiers, per docs/specs/feasibility-v6/01_LAND_USE_ENGINES.md.
// Each engine seeds default per-sqft construction cost, sales psf, and monthly
// rent psf for its asset class. Defaults are in AED. Values used here are
// research-closed in 08_RATIFY_TRIAGE.md (LU-4, LU-5, LU-8, LU-21, LU-23, LU-26)
// or carried forward from v5 mapCategoryToDefaults for the categories where v5
// already had a number.
//
// Diff baselines: every engine pre-records its own default psf values.
// `diffTone()` (re-exported from ./diffBadge) compares current input vs the
// engine default and returns a 4-tone delta band per 03_UX_FULLSCREEN_AND_DIFF.md.

export type EngineId =
  | 'residential'
  | 'office'
  | 'retail'
  | 'hospitality'
  | 'industrial'
  | 'healthcare'
  | 'educational'
  | 'senior'
  | 'datacenter'
  | 'mixeduse'
  | 'infrastructure'
  | 'offplan'
  | 'landhold';

export type ModifierId = 'fractional' | 'awqaf';

export interface EngineDefaults {
  id: EngineId;
  label: string;
  family: 'residential' | 'commercial' | 'specialised' | 'modifier';
  // Construction
  constructionPsfBua: number;
  brandPsfBua: number;
  consultancyPsfBua: number;
  infrastructurePsfBua: number;
  contingencyPct: number;
  // Revenue (BtS)
  salesPsfSfa: number;
  // Revenue (BtR)
  monthlyRentPsfSfa: number;
  occupancyPct: number;
  operatingPct: number;
  // Source citation (short, for tooltip)
  source: string;
  // One-line founder-facing description
  blurb: string;
  // Whether BtS and BtR pathways apply to this engine
  modes: ('bts' | 'btr')[];
  // Founder-validated defaults vs research-only. Controls UX grouping in the
  // engine dropdown ("VALIDATED" group at top, "RESEARCH DEFAULTS" below) and
  // the italic "Founder validation in progress" caption under the source line.
  // Flip to true sprint-by-sprint as founder ratifies engine numbers in
  // 10_FOUNDER_RATIFY_P0.md follow-ups.
  validated: boolean;
}

export const ENGINES: Record<EngineId, EngineDefaults> = {
  residential: {
    id: 'residential',
    label: 'Residential',
    family: 'residential',
    constructionPsfBua: 500,
    brandPsfBua: 0,
    consultancyPsfBua: 20,
    infrastructurePsfBua: 20,
    contingencyPct: 5,
    salesPsfSfa: 2183,
    monthlyRentPsfSfa: 100,
    occupancyPct: 88,
    operatingPct: 30,
    source: 'DLD secondary Q1 2026 · Dubai Hills median',
    blurb: 'Apartment / villa stock for sale or lease. Default seeded from Dubai Hills median.',
    modes: ['bts', 'btr'],
    validated: true,

  },
  office: {
    id: 'office',
    label: 'Office',
    family: 'commercial',
    constructionPsfBua: 580,
    brandPsfBua: 0,
    consultancyPsfBua: 25,
    infrastructurePsfBua: 25,
    contingencyPct: 5,
    salesPsfSfa: 2200,
    monthlyRentPsfSfa: 14, // ~ AED 170/sqft annual mid-grade Business Bay
    occupancyPct: 85,
    operatingPct: 32,
    source: 'CBRE Q1 2026 Dubai Office MarketView',
    blurb: 'Grade-A and B+ office space. Default mid-grade Business Bay psf.',
    modes: ['bts', 'btr'],
    validated: true,

  },
  retail: {
    id: 'retail',
    label: 'Retail',
    family: 'commercial',
    constructionPsfBua: 620,
    brandPsfBua: 0,
    consultancyPsfBua: 25,
    infrastructurePsfBua: 30,
    contingencyPct: 6,
    salesPsfSfa: 2400,
    monthlyRentPsfSfa: 22,
    occupancyPct: 90,
    operatingPct: 28,
    source: 'JLL Dubai Retail Market H2 2025',
    blurb: 'High-street and community-mall retail. Anchor + line-shop blend.',
    modes: ['bts', 'btr'],
    validated: false,

  },
  hospitality: {
    id: 'hospitality',
    label: 'Hospitality',
    family: 'specialised',
    constructionPsfBua: 1200,
    brandPsfBua: 100,
    consultancyPsfBua: 40,
    infrastructurePsfBua: 35,
    contingencyPct: 7,
    salesPsfSfa: 0,
    monthlyRentPsfSfa: 0, // ADR-driven, not psf-driven — placeholder
    occupancyPct: 72,
    operatingPct: 60,
    source: 'HVS Middle East 2025 · 5★ ADR 1,000–1,400',
    blurb: '5★ branded hotel / branded residences. ADR-driven; revenue model is not psf.',
    modes: ['bts'],
    validated: false,

  },
  industrial: {
    id: 'industrial',
    label: 'Industrial / Logistics',
    family: 'specialised',
    constructionPsfBua: 165,
    brandPsfBua: 0,
    consultancyPsfBua: 8,
    infrastructurePsfBua: 25,
    contingencyPct: 5,
    salesPsfSfa: 450,
    monthlyRentPsfSfa: 4.6, // ~ AED 55/sqft annual JAFZA / DIP
    occupancyPct: 92,
    operatingPct: 18,
    source: 'Cushman & Wakefield UAE Logistics 2025',
    blurb: 'Warehouse, light industrial, last-mile logistics. Long lease tenor.',
    modes: ['bts', 'btr'],
    validated: false,

  },
  healthcare: {
    id: 'healthcare',
    label: 'Healthcare',
    family: 'specialised',
    constructionPsfBua: 850,
    brandPsfBua: 0,
    consultancyPsfBua: 60,
    infrastructurePsfBua: 50,
    contingencyPct: 8,
    salesPsfSfa: 0,
    monthlyRentPsfSfa: 0, // bed-driven, not psf-driven
    occupancyPct: 78,
    operatingPct: 65,
    source: 'DHA / VPS Healthcare 2025 · AED 3M/bed private',
    blurb: 'Private hospital / specialty clinic. Per-bed economics; placeholder needs founder default Q1.',
    modes: ['bts', 'btr'],
    validated: false,

  },
  educational: {
    id: 'educational',
    label: 'Educational',
    family: 'specialised',
    constructionPsfBua: 380,
    brandPsfBua: 30,
    consultancyPsfBua: 30,
    infrastructurePsfBua: 25,
    contingencyPct: 6,
    salesPsfSfa: 0,
    monthlyRentPsfSfa: 0, // student-fee-driven
    occupancyPct: 88,
    operatingPct: 55,
    source: 'KHDA 2025 · AED 400k/student ultra-premium',
    blurb: 'British / IB curriculum schools. Per-student economics; placeholder needs founder default Q2.',
    modes: ['bts', 'btr'],
    validated: false,

  },
  senior: {
    id: 'senior',
    label: 'Senior Living',
    family: 'specialised',
    constructionPsfBua: 720,
    brandPsfBua: 60,
    consultancyPsfBua: 40,
    infrastructurePsfBua: 30,
    contingencyPct: 7,
    salesPsfSfa: 0,
    monthlyRentPsfSfa: 18,
    occupancyPct: 82,
    operatingPct: 58,
    source: 'CBRE Senior Living UAE 2025 (preliminary)',
    blurb: 'Assisted-living / independent senior. Nascent UAE class; cost band is wide.',
    modes: ['btr'],
    validated: false,

  },
  datacenter: {
    id: 'datacenter',
    label: 'Data Center',
    family: 'specialised',
    constructionPsfBua: 0, // capex per MW, not psf
    brandPsfBua: 0,
    consultancyPsfBua: 0,
    infrastructurePsfBua: 0,
    contingencyPct: 10,
    salesPsfSfa: 0,
    monthlyRentPsfSfa: 0, // colocation rev/MW, not psf
    // Stage 2 fix 2026-06-09: DC needs non-zero occupancy + operating
    // so the per-unit synth pipeline produces meaningful net annual.
    // 85% MW utilization is the Khazna / Equinix UAE midpoint;
    // operating ratio 35% covers power + maintenance + monitoring.
    occupancyPct: 85,
    operatingPct: 35,
    source: 'Khazna / Equinix 2025 · AED 33–41M Tier-3/MW',
    blurb: 'Tier-3 colocation. CapEx in AED/MW, not psf. Placeholder needs founder default Q7.',
    modes: ['btr'],
    validated: false,

  },
  mixeduse: {
    id: 'mixeduse',
    label: 'Mixed-Use',
    family: 'specialised',
    constructionPsfBua: 580,
    brandPsfBua: 25,
    consultancyPsfBua: 30,
    infrastructurePsfBua: 30,
    contingencyPct: 6,
    salesPsfSfa: 1900,
    monthlyRentPsfSfa: 12,
    occupancyPct: 86,
    operatingPct: 35,
    source: 'Blended residential + retail + office',
    blurb: 'Mixed residential + retail + office tower. Defaults are blended midpoints.',
    modes: ['bts', 'btr'],
    validated: false,

  },
  infrastructure: {
    id: 'infrastructure',
    label: 'Infrastructure',
    family: 'specialised',
    constructionPsfBua: 0, // not psf-modelled
    brandPsfBua: 0,
    consultancyPsfBua: 0,
    infrastructurePsfBua: 0,
    contingencyPct: 12,
    salesPsfSfa: 0,
    monthlyRentPsfSfa: 0,
    occupancyPct: 0,
    operatingPct: 0,
    source: 'ICMS 3 / NRM 1 unit-rate library',
    blurb: 'Roads, utilities, district cooling. Modelled on unit-rate basis, not psf.',
    modes: [],
    validated: false,

  },
  offplan: {
    id: 'offplan',
    label: 'Off-Plan modifier',
    family: 'modifier',
    constructionPsfBua: 500,
    brandPsfBua: 0,
    consultancyPsfBua: 20,
    infrastructurePsfBua: 20,
    contingencyPct: 5,
    salesPsfSfa: 2455, // off-plan premium per LU-4
    monthlyRentPsfSfa: 0,
    occupancyPct: 0,
    operatingPct: 0,
    source: 'DLD off-plan Q1 2026 · Dubai Hills',
    blurb: 'Off-plan sales overlay on Residential. ~12% premium over secondary.',
    modes: ['bts'],
    validated: false,

  },
  landhold: {
    id: 'landhold',
    label: 'Land-Hold',
    family: 'specialised',
    constructionPsfBua: 0,
    brandPsfBua: 0,
    consultancyPsfBua: 0,
    infrastructurePsfBua: 0,
    contingencyPct: 0,
    salesPsfSfa: 0,
    monthlyRentPsfSfa: 0,
    occupancyPct: 0,
    operatingPct: 0,
    source: 'DLD secondary land Q1 2026',
    blurb: 'Speculative land-bank with no construction. CAGR-driven exit.',
    modes: [],
    validated: false,

  },
};

export const ENGINE_ORDER: EngineId[] = [
  'residential',
  'office',
  'retail',
  'hospitality',
  'industrial',
  'healthcare',
  'educational',
  'senior',
  'datacenter',
  'mixeduse',
  'infrastructure',
  'offplan',
  'landhold',
];

// Diff-badge tone function lives in ./diffBadge.ts — kept separate so the
// engine catalogue stays pure data + types.
export { diffTone, type DiffTone, type DiffResult } from './diffBadge';
