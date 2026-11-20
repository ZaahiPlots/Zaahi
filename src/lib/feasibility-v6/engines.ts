// ZAAHI Feasibility v6.1 — engine catalogue: every default, with where it came from.
//
// Rewritten 2026-11-20 after docs/audits/FEASIBILITY_AUDIT_2026-11-20.md. The
// arithmetic downstream was right; these numbers were not (residential rent
// 12× too high, data centre capex 0, one 18-month programme and one 1.85 /
// 80% area model for every asset class, no FF&E, no ramp-up).
//
// Every numeric default carries a provenance entry:
//
//   sourced      a published figure (source + date in the note)
//   derived      arithmetic on published figures (shown in the note)
//   carried      the v5 / founder default, kept because nothing better was
//                found — NOT re-verified
//   assumed      a judgement call with no source; listed under FOUNDER
//                DECISIONS in docs/agent-log/2026-11-20-feasibility-v6-accuracy.md
//   placeholder  no usable data at all. While a revenue-critical placeholder
//                is still at its default the model reports numbers but
//                WITHHOLDS the verdict (see verdict.ts).
//
// Bump ENGINE_DEFAULTS_VERSION on ANY change to a default: saved studies
// snapshot it and flag "defaults changed since this was saved".
//
// Units. Costs are AED per sqft; published costs are per sqm (÷ 10.764).
// Rents are AED per sqft of SFA per YEAR — the Dubai market convention. The
// old field was per month, and an annual figure typed into it produced the
// 39.9% residential yield (audit B2).

export const ENGINE_DEFAULTS_VERSION = '2026-11-20.2';

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

export type ProvStatus = 'sourced' | 'derived' | 'carried' | 'assumed' | 'placeholder';
export interface Prov {
  s: ProvStatus;
  note: string;
}

/** The per-component, user-editable numbers. */
export interface EngineParams {
  // Area
  /** Total built area incl. parking / basements ÷ GFA. */
  buaGfaRatio: number;
  /** Net sellable or leasable area ÷ GFA, %. */
  efficiencyPct: number;
  // Cost
  /** Building cost on GFA, excl. parking, fees, FF&E. */
  constructionPsfGfa: number;
  /** Cost of the built area that is not GFA (BUA − GFA): parking, basements. */
  parkingPsf: number;
  brandPsfGfa: number;
  infrastructurePsfGfa: number;
  /** Professional fees, % of construction + parking. */
  consultancyPct: number;
  contingencyPct: number;
  // Revenue — area-driven engines
  salesPsfSfa: number;
  rentPsfSfaYear: number;
  occupancyPct: number;
  /** Operating cost as % of revenue. For operating assets: 100 − EBITDA margin. */
  operatingPct: number;
  // Revenue — operating assets (hotel / hospital / school / data centre)
  gfaPerUnitSqm: number;
  /** ADR per night (hotel) or revenue per unit per year at 100% occupancy. */
  revenuePerUnit: number;
  /** Hotel non-room revenue as % of rooms revenue. */
  otherRevenuePct: number;
  /**
   * Share of the operating EBITDA that reaches the property owner. 100 when
   * the owner runs the business (hotel under a management agreement); lower
   * when an operator leases the building and pays rent out of its EBITDA.
   */
  propertyIncomeSharePct: number;
  equipmentPerUnitAed: number;
  preOpeningPerUnitAed: number;
  /** All-in capex per unit that replaces a psf build cost (data centre, per MW). */
  capexPerUnitAed: number;
  // Exit + stabilisation
  exitCapRatePct: number;
  /** % of stabilised NOI earned in operating year 1, 2, … (100% afterwards). */
  rampPct: number[];
}

export type ParamKey = keyof EngineParams;
export type ProvKey = ParamKey | 'preConstructionMonths' | 'constructionMonths' | 'commissionPct' | 'marketingPct' | 'serviceChargePsfYear';

export interface EngineDefaults extends EngineParams {
  id: EngineId;
  label: string;
  family: 'residential' | 'commercial' | 'specialised' | 'modifier';
  /** psf = sold / let by area. operating = a business valued on its income. none = not modelled. */
  kind: 'psf' | 'operating' | 'none';
  unitLabel: string;
  revenueBasis: 'night' | 'year';
  /** The unit count cannot be inferred from floor area (data centre: power, not sqm). */
  unitsMustBeEntered: boolean;
  modes: ('bts' | 'btr')[];
  preConstructionMonths: number;
  constructionMonths: number;
  commissionPct: number;
  marketingPct: number;
  offPlanDefault: boolean;
  serviceChargePsfYear: number;
  irrecoverableVatPct: number;
  /** Headline citation for the engine tooltip. */
  source: string;
  blurb: string;
  /** Founder-ratified vs research defaults. Drives the dropdown grouping and the caveat. */
  validated: boolean;
  prov: Partial<Record<ProvKey, Prov>>;
}

// ── Shared provenance notes ──────────────────────────────────────────────

const SRC = {
  tt: 'Turner & Townsend UAE Market Intelligence 2025, Fig. 17',
  sh: 'Stonehaven UAE Construction Cost Benchmarking Report 2025',
  aecom: 'AECOM Middle East Property & Construction Handbook 2024 (Q3 2023 costs)',
  hvs: 'HVS / Wood Couture, GCC Hotel Development Costs, Sep 2023',
  fta: 'FTA Real Estate VAT Guide VATGRE1 (Apr 2021) s.7.2',
};

const P_PARKING: Prov = { s: 'derived', note: `Mid of basement parking AED 4,000/sqm and multi-storey AED 3,000/sqm (${SRC.sh}).` };
const P_RATIO_185: Prov = {
  s: 'carried',
  note: 'v5 default. The "Dubai Municipality Circular 168/2018" citation could not be found; no published source gives a parking-inclusive BUA/GFA ratio. Pending founder decision.',
};
const P_INFRA: Prov = { s: 'carried', note: 'v5 psf-BUA figure re-based to GFA. Not re-verified.' };
const P_CONSULT: Prov = { s: 'carried', note: 'v5 consultancy psf expressed as % of construction. Published benchmarks exclude fees; trade sources cite 5–18%.' };
const P_CONT: Prov = { s: 'carried', note: 'v5 default. Trade sources cite 7–15%.' };
const P_PROGRAMME: Prov = { s: 'assumed', note: 'No published duration table for Dubai. Editable; listed under FOUNDER DECISIONS.' };
const P_PRECON: Prov = { s: 'assumed', note: 'Design + authority approvals. One data point: Mediclinic Parkview, 10 months from announcement to groundbreaking. Editable.' };
const P_COMMISSION: Prov = { s: 'sourced', note: 'Off-plan developer commissions run 2–8% (Property Finder, Jul 2026). 5% is the audit-ratified midpoint.' };
const P_MARKETING: Prov = { s: 'carried', note: 'v5 default 2%. RERA caps marketing paid from escrow at 5% of sales (DLD FAQ).' };
const P_NA: Prov = { s: 'sourced', note: 'Not used by this engine.' };

const NO_UNIT = {
  gfaPerUnitSqm: 0,
  revenuePerUnit: 0,
  otherRevenuePct: 0,
  propertyIncomeSharePct: 100,
  equipmentPerUnitAed: 0,
  preOpeningPerUnitAed: 0,
  capexPerUnitAed: 0,
};

const NOT_MODELLED: EngineParams = {
  buaGfaRatio: 1,
  efficiencyPct: 100,
  constructionPsfGfa: 0,
  parkingPsf: 0,
  brandPsfGfa: 0,
  infrastructurePsfGfa: 0,
  consultancyPct: 0,
  contingencyPct: 0,
  salesPsfSfa: 0,
  rentPsfSfaYear: 0,
  occupancyPct: 0,
  operatingPct: 0,
  ...NO_UNIT,
  exitCapRatePct: 0,
  rampPct: [],
};

const RESIDENTIAL_BASE = {
  buaGfaRatio: 1.85,
  efficiencyPct: 80,
  constructionPsfGfa: 604,
  parkingPsf: 325,
  brandPsfGfa: 0,
  infrastructurePsfGfa: 37,
  consultancyPct: 4,
  contingencyPct: 5,
  rentPsfSfaYear: 77.3,
  occupancyPct: 95,
  operatingPct: 25,
  ...NO_UNIT,
  exitCapRatePct: 7.0,
  rampPct: [80],
};

const RESIDENTIAL_PROV: Partial<Record<ProvKey, Prov>> = {
  buaGfaRatio: P_RATIO_185,
  efficiencyPct: { s: 'sourced', note: 'Mid-rise apartments net-to-gross 75–85% (AECOM 2024, p.119).' },
  constructionPsfGfa: {
    s: 'sourced',
    note: `AED 6,500/sqm. Mid-rise 5,500–7,200 (${SRC.sh}); high-rise average 5,500 (${SRC.tt}); 6,000–10,000 (AESG Q2 2026). Excludes parking, fees, external works.`,
  },
  parkingPsf: P_PARKING,
  infrastructurePsfGfa: P_INFRA,
  consultancyPct: P_CONSULT,
  contingencyPct: P_CONT,
  rentPsfSfaYear: {
    s: 'sourced',
    note: 'AED 77.3/sqft/yr, Dubai city average (Cavendish Maxwell, Sep 2026, via Khaleej Times). Covers all residential stock, villas and older units included; a new block in a prime area can rent higher. Replace it with a local figure where you have one.',
  },
  occupancyPct: { s: 'assumed', note: 'Dubai Residential REIT reports 98.4–98.6% (2026); 95% allows for voids on one new block.' },
  operatingPct: { s: 'sourced', note: 'Dubai Residential REIT all-in opex 20.6–28.3% of revenue (H1 2026).' },
  exitCapRatePct: { s: 'assumed', note: 'No published build-to-rent cap rate. Private BtR trades at 7–8% GROSS (Cushman & Wakefield, 2025). Pending.' },
  rampPct: { s: 'assumed', note: 'Lease-up: year 1 at 80% of stabilised income.' },
  preConstructionMonths: P_PRECON,
  constructionMonths: { s: 'sourced', note: 'Dubai residential launch-to-handover runs 3–5 years (Knight Frank, Q3 2025); Sobha Crest Grande took 42 months start to completion certificate. 36 months for a mid/high-rise block.' },
  commissionPct: P_COMMISSION,
  marketingPct: P_MARKETING,
  serviceChargePsfYear: { s: 'sourced', note: 'Apartments AED 15–20/sqft/yr (RERA index via Engel & Völkers, Sep 2026). Developer pays on unsold units — Law 6/2019 Art. 25(a).' },
};

export const ENGINES: Record<EngineId, EngineDefaults> = {
  residential: {
    id: 'residential',
    label: 'Residential',
    family: 'residential',
    kind: 'psf',
    unitLabel: '',
    revenueBasis: 'year',
    unitsMustBeEntered: false,
    modes: ['bts', 'btr'],
    ...RESIDENTIAL_BASE,
    salesPsfSfa: 1800,
    preConstructionMonths: 9,
    constructionMonths: 36,
    commissionPct: 5,
    marketingPct: 2,
    offPlanDefault: false,
    serviceChargePsfYear: 15,
    irrecoverableVatPct: 0,
    source: 'Property Monitor / Savills / Cavendish Maxwell, Sep–Nov 2026 · Stonehaven 2025',
    blurb: 'Apartment block for sale at completion or for lease. City-wide averages unless the plot is in a benchmarked area.',
    validated: true,
    prov: {
      ...RESIDENTIAL_PROV,
      salesPsfSfa: {
        s: 'derived',
        note: 'Dubai apartments: AED 1,907 transactions (Property Monitor, Oct 2026), 1,817 (Savills), 1,644 index (Cavendish Maxwell, Sep 2026). City-wide — not this location.',
      },
    },
  },
  offplan: {
    id: 'offplan',
    label: 'Residential — off-plan',
    family: 'modifier',
    kind: 'psf',
    unitLabel: '',
    revenueBasis: 'year',
    unitsMustBeEntered: false,
    modes: ['bts'],
    ...RESIDENTIAL_BASE,
    salesPsfSfa: 2030,
    preConstructionMonths: 9,
    constructionMonths: 36,
    commissionPct: 5,
    marketingPct: 2,
    offPlanDefault: true,
    serviceChargePsfYear: 15,
    irrecoverableVatPct: 0,
    source: 'ValuStrat Q1 2026 off-plan average · Stonehaven 2025',
    blurb: 'Residential sold off-plan through a RERA escrow account. Buyers pay in instalments during the build.',
    validated: false,
    prov: {
      ...RESIDENTIAL_PROV,
      salesPsfSfa: { s: 'sourced', note: 'Off-plan AED 2,030 vs ready 1,691/sqft (ValuStrat, Q1 2026, via Global Property Guide). City-wide — not this location.' },
    },
  },
  office: {
    id: 'office',
    label: 'Office',
    family: 'commercial',
    kind: 'psf',
    unitLabel: '',
    revenueBasis: 'year',
    unitsMustBeEntered: false,
    modes: ['bts', 'btr'],
    buaGfaRatio: 1.85,
    efficiencyPct: 78,
    constructionPsfGfa: 604,
    parkingPsf: 325,
    brandPsfGfa: 0,
    infrastructurePsfGfa: 46,
    consultancyPct: 4.5,
    contingencyPct: 5,
    salesPsfSfa: 2012,
    rentPsfSfaYear: 189,
    occupancyPct: 95,
    operatingPct: 32,
    ...NO_UNIT,
    exitCapRatePct: 8.0,
    rampPct: [60, 90],
    preConstructionMonths: 9,
    constructionMonths: 40,
    commissionPct: 5,
    marketingPct: 2,
    offPlanDefault: false,
    serviceChargePsfYear: 20,
    irrecoverableVatPct: 0,
    source: 'Cavendish Maxwell H1 2026 · CBRE Q3 2026 · Turner & Townsend 2025',
    blurb: 'Office building, shell and core. Strata sale or lease. City-wide averages unless the plot is in a benchmarked area.',
    validated: true,
    prov: {
      buaGfaRatio: P_RATIO_185,
      efficiencyPct: { s: 'sourced', note: 'UAE office net-to-gross 75–80% (AECOM 2024, pp.118–119).' },
      constructionPsfGfa: { s: 'sourced', note: `AED 6,500/sqm. Average 6,200 (${SRC.tt}); shell and core 5,900–7,300 (${SRC.sh}). Tenant fit-out excluded.` },
      parkingPsf: P_PARKING,
      infrastructurePsfGfa: P_INFRA,
      consultancyPct: P_CONSULT,
      contingencyPct: P_CONT,
      salesPsfSfa: { s: 'sourced', note: 'Strata office AED 2,012/sqft city average (Cavendish Maxwell, H1 2026). Downtown 5,130.' },
      rentPsfSfaYear: { s: 'sourced', note: 'AED 189/sqft/yr city average (Cavendish Maxwell, H1 2026); Savills Q3 2026 reports 241.' },
      occupancyPct: { s: 'sourced', note: 'Dubai office occupancy ~95% (CBRE, Q3 2026).' },
      operatingPct: { s: 'carried', note: 'v5 default. No published office opex ratio found.' },
      exitCapRatePct: { s: 'sourced', note: 'Prime office yields 7–9% (Cushman & Wakefield, Jun 2025).' },
      rampPct: { s: 'assumed', note: 'Lease-up: 60% of stabilised income in year 1, 90% in year 2.' },
      preConstructionMonths: P_PRECON,
      constructionMonths: { s: 'sourced', note: 'Office towers: ICD Brookfield Place ~47 months, Uptown Tower 38 months from main contract.' },
      commissionPct: P_COMMISSION,
      marketingPct: P_MARKETING,
      serviceChargePsfYear: { s: 'placeholder', note: 'No official office service-charge average found.' },
    },
  },
  retail: {
    id: 'retail',
    label: 'Retail',
    family: 'commercial',
    kind: 'psf',
    unitLabel: '',
    revenueBasis: 'year',
    unitsMustBeEntered: false,
    modes: ['bts', 'btr'],
    buaGfaRatio: 1.85,
    efficiencyPct: 80,
    constructionPsfGfa: 530,
    parkingPsf: 325,
    brandPsfGfa: 0,
    infrastructurePsfGfa: 55,
    consultancyPct: 4,
    contingencyPct: 6,
    salesPsfSfa: 2400,
    rentPsfSfaYear: 252,
    occupancyPct: 95,
    operatingPct: 28,
    ...NO_UNIT,
    exitCapRatePct: 8.0,
    rampPct: [70, 90],
    preConstructionMonths: 9,
    constructionMonths: 27,
    commissionPct: 5,
    marketingPct: 2,
    offPlanDefault: false,
    serviceChargePsfYear: 20,
    irrecoverableVatPct: 0,
    source: 'Engel & Völkers H1 2026 · Stonehaven 2025 / AECOM 2024',
    blurb: 'Community mall / high-street retail, shell and core. Rent-led; a strata sale price is not published.',
    validated: false,
    prov: {
      buaGfaRatio: P_RATIO_185,
      efficiencyPct: { s: 'carried', note: 'v5 default. No published retail efficiency found.' },
      constructionPsfGfa: { s: 'sourced', note: `AED 5,700/sqm community mall shell and core: 4,800–6,600 (${SRC.sh}); 5,140–6,600 (${SRC.aecom}).` },
      parkingPsf: P_PARKING,
      infrastructurePsfGfa: P_INFRA,
      consultancyPct: P_CONSULT,
      contingencyPct: P_CONT,
      salesPsfSfa: { s: 'placeholder', note: 'v5 figure. No verified retail sale price per sqft was found — enter your own.' },
      rentPsfSfaYear: { s: 'sourced', note: 'Dubai retail average AED 252/sqft/yr (Engel & Völkers, H1 2026). Ranges from 95 (International City) to 817 (Downtown).' },
      occupancyPct: { s: 'sourced', note: 'Retail vacancy 4.8% (JLL, Q1 2026); super-regional malls 95–99% (Cushman & Wakefield, Dec 2025).' },
      operatingPct: { s: 'carried', note: 'v5 default. No published retail opex ratio found.' },
      exitCapRatePct: { s: 'assumed', note: 'No published retail yield found; set equal to the office range midpoint.' },
      rampPct: { s: 'assumed', note: 'Lease-up: 70% in year 1, 90% in year 2.' },
      preConstructionMonths: P_PRECON,
      constructionMonths: { s: 'sourced', note: 'Circle Mall JVC was planned at ~27 months (it took 66). Community malls overrun often — stress-test this.' },
      commissionPct: P_COMMISSION,
      marketingPct: P_MARKETING,
      serviceChargePsfYear: { s: 'placeholder', note: 'No official retail service-charge average found.' },
    },
  },
  hospitality: {
    id: 'hospitality',
    label: 'Hospitality',
    family: 'specialised',
    kind: 'operating',
    unitLabel: 'keys',
    revenueBasis: 'night',
    unitsMustBeEntered: false,
    modes: ['bts', 'btr'],
    buaGfaRatio: 1.2,
    efficiencyPct: 100,
    constructionPsfGfa: 1254,
    parkingPsf: 325,
    brandPsfGfa: 0,
    infrastructurePsfGfa: 65,
    consultancyPct: 3.5,
    contingencyPct: 7,
    salesPsfSfa: 0,
    rentPsfSfaYear: 0,
    occupancyPct: 75,
    operatingPct: 66,
    gfaPerUnitSqm: 100,
    revenuePerUnit: 1050,
    otherRevenuePct: 59,
    propertyIncomeSharePct: 100,
    equipmentPerUnitAed: 176_000,
    preOpeningPerUnitAed: 37_500,
    capexPerUnitAed: 0,
    exitCapRatePct: 7.0,
    rampPct: [40, 70, 90],
    preConstructionMonths: 12,
    constructionMonths: 36,
    commissionPct: 0,
    marketingPct: 0,
    offPlanDefault: false,
    serviceChargePsfYear: 0,
    irrecoverableVatPct: 0,
    source: 'HVS GCC Hotel Development Costs 2023 · CoStar via MMCG · Cavendish Maxwell 2025–26',
    blurb: 'Upper-upscale / 5-star hotel, owner-operated under a management agreement. Build, stabilise, then sell or hold.',
    validated: false,
    prov: {
      buaGfaRatio: { s: 'derived', note: 'Set so built area per key = 120 sqm, the HVS 2023 upper-upscale benchmark (100 sqm GFA × 1.2).' },
      gfaPerUnitSqm: { s: 'derived', note: 'HVS 2023: built area per key 185 sqm luxury, 120 upper upscale, 85 upscale, 60 midscale. 120 ÷ 1.2.' },
      constructionPsfGfa: { s: 'sourced', note: `AED 13,500/sqm 5-star: 12,000–17,500 (${SRC.sh}); average 10,500 (${SRC.tt}). Excludes loose FF&E and OS&E.` },
      parkingPsf: P_PARKING,
      infrastructurePsfGfa: P_INFRA,
      consultancyPct: P_CONSULT,
      contingencyPct: P_CONT,
      revenuePerUnit: { s: 'sourced', note: 'ADR AED 1,050 (USD 286) luxury + upper upscale (CoStar via MMCG). All Dubai hotels FY2025: AED 746 (Cavendish Maxwell).' },
      occupancyPct: { s: 'sourced', note: 'Luxury + upper upscale 76.2% (MMCG). 2026 is a shock year: H1 2026 luxury occupancy was 51% (Cavendish Maxwell) — stress-test at 55%.' },
      otherRevenuePct: { s: 'derived', note: 'Rooms are 62.9% of UAE full-service hotel revenue (CoStar 2023) → non-rooms = 59% of rooms revenue.' },
      operatingPct: { s: 'derived', note: 'UAE full-service EBITDA margin 36.7% (CoStar 2023) less a ~3% FF&E reserve (assumed).' },
      propertyIncomeSharePct: { s: 'assumed', note: 'Owner keeps the hotel EBITDA; management fees are inside operating costs.' },
      equipmentPerUnitAed: { s: 'sourced', note: 'FF&E + OS&E USD 48,000 per key, upper upscale (HVS 2023). Luxury USD 69,000.' },
      preOpeningPerUnitAed: { s: 'sourced', note: 'AED 25–50k per key (UAE Free Zone Finder 2026, cited in the audit). Low-grade source; HVS bundles it in soft costs.' },
      exitCapRatePct: { s: 'carried', note: 'v5 default. Hotel cap rates are "not formally tracked" in the UAE; transactions imply 4–6% (MMCG). Pending.' },
      rampPct: { s: 'assumed', note: 'Hotels take 36–48 months to mature; year-1 occupancy 50–60% against 68–78% stabilised (RLA Global, not GCC-specific). NOI at 40 / 70 / 90% of stabilised in years 1–3.' },
      preConstructionMonths: P_PRECON,
      constructionMonths: { s: 'assumed', note: 'No dated example of a typical Dubai 5-star was found (Atlantis The Royal, 79 months, is an outlier).' },
      salesPsfSfa: P_NA,
      rentPsfSfaYear: P_NA,
    },
  },
  industrial: {
    id: 'industrial',
    label: 'Industrial / Logistics',
    family: 'specialised',
    kind: 'psf',
    unitLabel: '',
    revenueBasis: 'year',
    unitsMustBeEntered: false,
    modes: ['bts', 'btr'],
    buaGfaRatio: 1.05,
    efficiencyPct: 95,
    constructionPsfGfa: 372,
    parkingPsf: 279,
    brandPsfGfa: 0,
    infrastructurePsfGfa: 26,
    consultancyPct: 5,
    contingencyPct: 5,
    salesPsfSfa: 500,
    rentPsfSfaYear: 50,
    occupancyPct: 94,
    operatingPct: 18,
    ...NO_UNIT,
    exitCapRatePct: 7.5,
    rampPct: [85],
    preConstructionMonths: 6,
    constructionMonths: 14,
    commissionPct: 2,
    marketingPct: 1,
    offPlanDefault: false,
    serviceChargePsfYear: 5,
    irrecoverableVatPct: 0,
    source: 'JLL Q3 2026 · Knight Frank H1 2026 · Turner & Townsend 2025',
    blurb: 'Warehouse / light industrial. Rent-led with long leases; a sale price per sqft is not published.',
    validated: false,
    prov: {
      buaGfaRatio: { s: 'assumed', note: 'Sheds have surface parking and almost no excluded area — audit M2 range 1.0–1.1.' },
      efficiencyPct: { s: 'assumed', note: 'Audit M2: ~95% for warehouses. No published figure.' },
      constructionPsfGfa: { s: 'sourced', note: `AED 4,000/sqm warehouse / light industrial (${SRC.tt}); light industrial 3,000–4,000, logistics 5,500–8,600 (${SRC.sh}).` },
      parkingPsf: { s: 'sourced', note: `Multi-storey / surface parking AED 3,000/sqm (${SRC.sh}).` },
      infrastructurePsfGfa: P_INFRA,
      consultancyPct: P_CONSULT,
      contingencyPct: P_CONT,
      salesPsfSfa: { s: 'placeholder', note: 'Only asking prices of AED 335–670/sqft were found (listings). Enter your own.' },
      rentPsfSfaYear: { s: 'sourced', note: 'Dubai warehouse average AED 50/sqft/yr (JLL, Q3 2026). Al Quoz 90, Dubai South 55 (Knight Frank, H1 2026); DIP 60–65, JAFZA 40–45.' },
      occupancyPct: { s: 'sourced', note: 'Dubai South 96%, DIC 94% (Engel & Völkers, 2026 — period not stated; low confidence).' },
      operatingPct: { s: 'carried', note: 'v5 default. No published industrial opex ratio found.' },
      exitCapRatePct: { s: 'derived', note: 'Prime logistics yield ~7% (Cushman & Wakefield, 2026 outlook) plus 50 bp for a non-prime single asset (assumed).' },
      rampPct: { s: 'assumed', note: 'Lease-up: 85% of stabilised income in year 1.' },
      preConstructionMonths: P_PRECON,
      constructionMonths: { s: 'sourced', note: 'Warehouses: DSV/Arcapita JAFZA ~16 months, dnata Dubai South 11 months scheduled.' },
      commissionPct: { s: 'assumed', note: 'Whole-building or unit sale to occupiers — agent fee around 2%.' },
      marketingPct: { s: 'assumed', note: 'Minimal marketing for industrial stock.' },
      serviceChargePsfYear: { s: 'placeholder', note: 'No published industrial service-charge figure.' },
    },
  },
  healthcare: {
    id: 'healthcare',
    label: 'Healthcare',
    family: 'specialised',
    kind: 'operating',
    unitLabel: 'beds',
    revenueBasis: 'year',
    unitsMustBeEntered: false,
    modes: ['bts', 'btr'],
    buaGfaRatio: 1.3,
    efficiencyPct: 100,
    constructionPsfGfa: 1115,
    parkingPsf: 325,
    brandPsfGfa: 0,
    infrastructurePsfGfa: 90,
    consultancyPct: 7,
    contingencyPct: 8,
    salesPsfSfa: 0,
    rentPsfSfaYear: 0,
    occupancyPct: 67,
    operatingPct: 78.5,
    gfaPerUnitSqm: 200,
    revenuePerUnit: 3_900_000,
    otherRevenuePct: 0,
    propertyIncomeSharePct: 50,
    equipmentPerUnitAed: 330_000,
    preOpeningPerUnitAed: 0,
    capexPerUnitAed: 0,
    exitCapRatePct: 9.0,
    rampPct: [0, 20, 40, 60, 75],
    preConstructionMonths: 10,
    constructionMonths: 31,
    commissionPct: 0,
    marketingPct: 0,
    offPlanDefault: false,
    serviceChargePsfYear: 0,
    irrecoverableVatPct: 0,
    source: 'Burjeel FY2024 MD&A · six UAE hospital projects 2016–2021 · AECOM 2024',
    blurb: 'Private hospital leased to an operator. Per-bed economics from UAE operator disclosures; a new hospital takes five years or more to mature.',
    validated: false,
    prov: {
      buaGfaRatio: { s: 'assumed', note: 'Hospitals carry structured parking; no published ratio.' },
      gfaPerUnitSqm: { s: 'derived', note: 'Median 260 sqm built per bed across six UAE hospitals (Fakeeh 221, Burjeel Medical City 205, Mediclinic Parkview 323, Clemenceau 380, NMC Royal 300, Saudi German Ajman 205) ÷ 1.3. Their all-in cost was AED 3.6–3.8m per bed at 2016–21 prices.' },
      constructionPsfGfa: { s: 'sourced', note: `AED 12,000/sqm: district hospital USD 2,400–4,100/sqm with fixed fit-out, no medical equipment (${SRC.aecom}).` },
      parkingPsf: P_PARKING,
      infrastructurePsfGfa: P_INFRA,
      consultancyPct: P_CONSULT,
      contingencyPct: P_CONT,
      revenuePerUnit: {
        s: 'derived',
        note: 'Burjeel hospitals segment FY2024: AED 4,406m on ~1,700 beds = AED 2.6m per bed at 67% occupancy → 3.9m at 100%. Includes outpatient revenue.',
      },
      occupancyPct: { s: 'sourced', note: 'Bed occupancy 67% (Burjeel FY2024), 69% (H1 2026), 76% (PureHealth).' },
      operatingPct: { s: 'sourced', note: 'Hospitals-segment EBITDA margin 21.5% (Burjeel FY2024 MD&A: 946 / 4,406).' },
      propertyIncomeSharePct: { s: 'assumed', note: 'A hospital building is valued on the rent an operator can pay, not on the operator’s EBITDA. Rent at half of EBITDA (2.0× cover). Pending founder decision.' },
      equipmentPerUnitAed: { s: 'sourced', note: 'Medical equipment USD 80–100k per bed (Colliers, Egypt 2021). Low confidence for the UAE.' },
      preOpeningPerUnitAed: { s: 'placeholder', note: 'No published hospital pre-opening budget. Enter licensing, recruitment and working-capital costs.' },
      exitCapRatePct: { s: 'assumed', note: 'No published UAE healthcare yield. Set by analogy with long-lease school assets (9–10% initial yields, ENBD REIT / Emirates REIT).' },
      rampPct: { s: 'derived', note: 'Burjeel Medical City opened 2020: 48% bed occupancy in year 4, 62% in year 5, EBITDA margin still below the segment. Income at 0 / 20 / 40 / 60 / 75% of stabilised in years 1–5 (the curve itself is assumed).' },
      preConstructionMonths: { s: 'sourced', note: 'Mediclinic Parkview: 10 months from announcement to groundbreaking.' },
      constructionMonths: { s: 'sourced', note: 'Mediclinic Parkview: 31 months from groundbreaking to opening.' },
      salesPsfSfa: P_NA,
      rentPsfSfaYear: P_NA,
    },
  },
  educational: {
    id: 'educational',
    label: 'Educational',
    family: 'specialised',
    kind: 'operating',
    unitLabel: 'students',
    revenueBasis: 'year',
    unitsMustBeEntered: false,
    modes: ['bts', 'btr'],
    buaGfaRatio: 1.1,
    efficiencyPct: 100,
    constructionPsfGfa: 743,
    parkingPsf: 279,
    brandPsfGfa: 0,
    infrastructurePsfGfa: 46,
    consultancyPct: 8,
    contingencyPct: 6,
    salesPsfSfa: 0,
    rentPsfSfaYear: 0,
    occupancyPct: 78,
    operatingPct: 74.5,
    gfaPerUnitSqm: 12,
    revenuePerUnit: 61_000,
    otherRevenuePct: 0,
    propertyIncomeSharePct: 50,
    equipmentPerUnitAed: 0,
    preOpeningPerUnitAed: 0,
    capexPerUnitAed: 0,
    exitCapRatePct: 9.0,
    rampPct: [0, 30, 55, 75, 90],
    preConstructionMonths: 9,
    constructionMonths: 18,
    commissionPct: 0,
    marketingPct: 0,
    offPlanDefault: false,
    serviceChargePsfYear: 0,
    irrecoverableVatPct: 0,
    source: 'Taaleem FY2025/26 · Stonehaven 2025 / AECOM 2024 · JLL',
    blurb: 'K-12 private school leased to (or run with) an operator. Per-student economics; premium-tier fee default.',
    validated: false,
    prov: {
      buaGfaRatio: { s: 'assumed', note: 'Schools use surface parking; no published ratio.' },
      gfaPerUnitSqm: { s: 'derived', note: 'Mass-market UAE schools build 7–10 sqm per student (South View 6.8, GEMS Metropole Al Waha 7.6, GEMS Founders 9.3, Dubai Schools Al Khawaneej 10.3). Premium campuses cost AED 135–150k per place, which implies 12–15 sqm. 12 matches the premium fee default.' },
      constructionPsfGfa: { s: 'sourced', note: `AED 8,000/sqm K-12 school: 6,000–12,500 (${SRC.sh}); 5,500–8,440 (${SRC.aecom}).` },
      parkingPsf: { s: 'sourced', note: `Multi-storey / surface parking AED 3,000/sqm (${SRC.sh}).` },
      infrastructurePsfGfa: P_INFRA,
      consultancyPct: P_CONSULT,
      contingencyPct: P_CONT,
      revenuePerUnit: { s: 'sourced', note: 'Premium-school average fee AED 61,070 (Taaleem, FY2025/26). Outstanding-rated schools 29.5k–111.8k (2026–27). KHDA froze fees for 2026–27.' },
      occupancyPct: { s: 'sourced', note: 'Premium-school utilisation 77.9%; blended 88.4% (Taaleem, FY2023/24).' },
      operatingPct: { s: 'sourced', note: 'School EBITDA margin 25.5% (Taaleem, FY2025/26).' },
      propertyIncomeSharePct: { s: 'assumed', note: 'A school building is valued on the rent an operator can pay. Rent at half of EBITDA (2.0× cover). Pending founder decision.' },
      equipmentPerUnitAed: { s: 'placeholder', note: 'No published FF&E per student place.' },
      preOpeningPerUnitAed: { s: 'placeholder', note: 'No published school pre-opening budget.' },
      exitCapRatePct: { s: 'sourced', note: 'School sale-and-leasebacks: ~9% initial yield (ENBD REIT, South View School); above 10% of cost (Emirates REIT, Jebel Ali School — which ended in arrears). JLL quotes 7.5–8.5% for long leases.' },
      rampPct: { s: 'derived', note: 'Dubai British School Mira reached 37.8% utilisation in its first half-year; a three-year-old Taaleem school sat at 63.5%. Income at 0 / 30 / 55 / 75 / 90% of stabilised in years 1–5 (the curve itself is assumed).' },
      preConstructionMonths: P_PRECON,
      constructionMonths: { s: 'sourced', note: 'DBS Jumeira was built in 15 months or less; Taaleem quotes 2–3 years including approvals.' },
      salesPsfSfa: P_NA,
      rentPsfSfaYear: P_NA,
    },
  },
  senior: {
    id: 'senior',
    label: 'Senior Living',
    family: 'specialised',
    kind: 'psf',
    unitLabel: '',
    revenueBasis: 'year',
    unitsMustBeEntered: false,
    modes: ['btr'],
    buaGfaRatio: 1.5,
    efficiencyPct: 75,
    constructionPsfGfa: 720,
    parkingPsf: 325,
    brandPsfGfa: 0,
    infrastructurePsfGfa: 55,
    consultancyPct: 5.5,
    contingencyPct: 7,
    salesPsfSfa: 0,
    rentPsfSfaYear: 216,
    occupancyPct: 82,
    operatingPct: 58,
    ...NO_UNIT,
    exitCapRatePct: 8.0,
    rampPct: [50, 80],
    preConstructionMonths: 9,
    constructionMonths: 30,
    commissionPct: 0,
    marketingPct: 0,
    offPlanDefault: false,
    serviceChargePsfYear: 0,
    irrecoverableVatPct: 0,
    source: 'No UAE data published — every default is a placeholder',
    blurb: 'Assisted / independent senior living. There is no UAE market data for this class; treat every number as yours to supply.',
    validated: false,
    prov: {
      buaGfaRatio: { s: 'placeholder', note: 'No data.' },
      efficiencyPct: { s: 'placeholder', note: 'No data.' },
      constructionPsfGfa: { s: 'placeholder', note: 'v5 figure. No published senior-living build cost for the UAE.' },
      parkingPsf: P_PARKING,
      infrastructurePsfGfa: P_INFRA,
      consultancyPct: P_CONSULT,
      contingencyPct: P_CONT,
      rentPsfSfaYear: { s: 'placeholder', note: 'v5 figure (AED 18/sqft/month). No UAE senior-living fee data exists — enter your own.' },
      occupancyPct: { s: 'placeholder', note: 'v5 figure.' },
      operatingPct: { s: 'placeholder', note: 'v5 figure.' },
      exitCapRatePct: { s: 'placeholder', note: 'No data.' },
      rampPct: { s: 'assumed', note: 'Slow fill: 50 / 80% in years 1–2.' },
      preConstructionMonths: P_PROGRAMME,
      constructionMonths: P_PROGRAMME,
    },
  },
  datacenter: {
    id: 'datacenter',
    label: 'Data Center',
    family: 'specialised',
    kind: 'operating',
    unitLabel: 'MW',
    revenueBasis: 'year',
    unitsMustBeEntered: true,
    modes: ['bts', 'btr'],
    buaGfaRatio: 1.0,
    efficiencyPct: 100,
    constructionPsfGfa: 0,
    parkingPsf: 0,
    brandPsfGfa: 0,
    infrastructurePsfGfa: 0,
    consultancyPct: 5,
    contingencyPct: 0,
    salesPsfSfa: 0,
    rentPsfSfaYear: 0,
    occupancyPct: 85,
    operatingPct: 52,
    gfaPerUnitSqm: 630,
    revenuePerUnit: 8_600_000,
    otherRevenuePct: 0,
    propertyIncomeSharePct: 100,
    equipmentPerUnitAed: 0,
    preOpeningPerUnitAed: 0,
    capexPerUnitAed: 36_700_000,
    exitCapRatePct: 6.25,
    rampPct: [30, 60, 85],
    preConstructionMonths: 9,
    constructionMonths: 21,
    commissionPct: 0,
    marketingPct: 0,
    offPlanDefault: false,
    serviceChargePsfYear: 0,
    irrecoverableVatPct: 0,
    source: 'Turner & Townsend Data Centre Cost Index 2026 · S&P 2026 · RCLCO via ValuStrat',
    blurb: 'Tier-3 colocation. Sized by IT load in MW, which depends on a confirmed power allocation — not on floor area.',
    validated: false,
    prov: {
      capexPerUnitAed: {
        s: 'sourced',
        note: 'USD 10m per MW: UAE USD 9.2/W (Turner & Townsend Data Centre Cost Index 2026, incl. shell, MEP and contingency); USD 11m/MW (S&P 2026, cited in the audit). Excludes land, utility connection, IT and fees.',
      },
      contingencyPct: { s: 'sourced', note: 'Contingency is inside the Turner & Townsend USD/W figure.' },
      consultancyPct: { s: 'assumed', note: 'Fees are excluded from the cost index.' },
      revenuePerUnit: { s: 'placeholder', note: 'No UAE or Gulf colocation price is published. AED 8.6m per MW per year is the North America wholesale average, USD 196/kW/month (CBRE, 2026); global range USD 160–403. Enter your contracted or target pricing.' },
      gfaPerUnitSqm: { s: 'sourced', note: 'Capacity check only: Khazna AUH6 houses 31.8 MW in 20,000 sqm (629 sqm/MW, S&P 2025); Knight Frank rule of thumb ~1,000 sqm/MW.' },
      occupancyPct: { s: 'carried', note: 'v5 default utilisation.' },
      operatingPct: { s: 'sourced', note: 'Colocation EBITDA margins: Equinix 49%, GDS 47.3% (FY2025 results).' },
      exitCapRatePct: { s: 'sourced', note: 'Stabilised data-centre cap rates 4.25–6.25% globally (RCLCO via ValuStrat, Jul 2026). Top of range used.' },
      rampPct: { s: 'assumed', note: 'Fill-up over three years: 30 / 60 / 85%.' },
      preConstructionMonths: P_PROGRAMME,
      constructionMonths: { s: 'assumed', note: '18–24 months reported for one UAE project (press).' },
      salesPsfSfa: P_NA,
      rentPsfSfaYear: P_NA,
    },
  },
  mixeduse: {
    id: 'mixeduse',
    label: 'Mixed-Use (blended)',
    family: 'specialised',
    kind: 'psf',
    unitLabel: '',
    revenueBasis: 'year',
    unitsMustBeEntered: false,
    modes: ['bts', 'btr'],
    buaGfaRatio: 1.85,
    efficiencyPct: 80,
    constructionPsfGfa: 650,
    parkingPsf: 325,
    brandPsfGfa: 0,
    infrastructurePsfGfa: 55,
    consultancyPct: 5,
    contingencyPct: 6,
    salesPsfSfa: 1900,
    rentPsfSfaYear: 150,
    occupancyPct: 92,
    operatingPct: 30,
    ...NO_UNIT,
    exitCapRatePct: 7.5,
    rampPct: [70, 90],
    preConstructionMonths: 12,
    constructionMonths: 36,
    commissionPct: 5,
    marketingPct: 2,
    offPlanDefault: false,
    serviceChargePsfYear: 15,
    irrecoverableVatPct: 0,
    source: 'Blend of the residential, office and retail engines',
    blurb: 'Fallback when a plot is mixed use but its use split is not known. Blended figures — add the real mix for a verdict.',
    validated: false,
    prov: {
      buaGfaRatio: P_RATIO_185,
      constructionPsfGfa: { s: 'derived', note: 'Blend of residential, office and retail build costs.' },
      parkingPsf: P_PARKING,
      salesPsfSfa: { s: 'placeholder', note: 'A blended sale price is not a market figure. Supply the use mix, or enter a price.' },
      rentPsfSfaYear: { s: 'placeholder', note: 'A blended rent is not a market figure. Supply the use mix, or enter a rent.' },
      exitCapRatePct: { s: 'assumed', note: 'Blend.' },
      preConstructionMonths: P_PROGRAMME,
      constructionMonths: P_PROGRAMME,
      commissionPct: P_COMMISSION,
      marketingPct: P_MARKETING,
    },
  },
  infrastructure: {
    id: 'infrastructure',
    label: 'Infrastructure',
    family: 'specialised',
    kind: 'none',
    unitLabel: '',
    revenueBasis: 'year',
    unitsMustBeEntered: false,
    modes: [],
    ...NOT_MODELLED,
    preConstructionMonths: 0,
    constructionMonths: 1,
    commissionPct: 0,
    marketingPct: 0,
    offPlanDefault: false,
    serviceChargePsfYear: 0,
    irrecoverableVatPct: 0,
    source: 'Not modelled',
    blurb: 'roads, utilities and district cooling are costed on unit rates, not floor area',
    validated: false,
    prov: {},
  },
  landhold: {
    id: 'landhold',
    label: 'Land-Hold',
    family: 'specialised',
    kind: 'none',
    unitLabel: '',
    revenueBasis: 'year',
    unitsMustBeEntered: false,
    modes: [],
    ...NOT_MODELLED,
    preConstructionMonths: 0,
    constructionMonths: 1,
    commissionPct: 0,
    marketingPct: 0,
    offPlanDefault: false,
    serviceChargePsfYear: 0,
    irrecoverableVatPct: 0,
    source: 'Not modelled',
    blurb: 'a land-bank exit depends on an appreciation rate nobody has published for this plot',
    validated: false,
    prov: {},
  },
};

export const ENGINE_ORDER: EngineId[] = [
  'residential',
  'offplan',
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
  'landhold',
];

export const PARAM_KEYS: ParamKey[] = [
  'buaGfaRatio', 'efficiencyPct', 'constructionPsfGfa', 'parkingPsf', 'brandPsfGfa',
  'infrastructurePsfGfa', 'consultancyPct', 'contingencyPct', 'salesPsfSfa', 'rentPsfSfaYear',
  'occupancyPct', 'operatingPct', 'gfaPerUnitSqm', 'revenuePerUnit', 'otherRevenuePct',
  'propertyIncomeSharePct', 'equipmentPerUnitAed', 'preOpeningPerUnitAed', 'capexPerUnitAed',
  'exitCapRatePct', 'rampPct',
];

/** A fresh copy of an engine's editable parameters. */
export function engineParams(id: EngineId): EngineParams {
  const e = ENGINES[id];
  return {
    buaGfaRatio: e.buaGfaRatio,
    efficiencyPct: e.efficiencyPct,
    constructionPsfGfa: e.constructionPsfGfa,
    parkingPsf: e.parkingPsf,
    brandPsfGfa: e.brandPsfGfa,
    infrastructurePsfGfa: e.infrastructurePsfGfa,
    consultancyPct: e.consultancyPct,
    contingencyPct: e.contingencyPct,
    salesPsfSfa: e.salesPsfSfa,
    rentPsfSfaYear: e.rentPsfSfaYear,
    occupancyPct: e.occupancyPct,
    operatingPct: e.operatingPct,
    gfaPerUnitSqm: e.gfaPerUnitSqm,
    revenuePerUnit: e.revenuePerUnit,
    otherRevenuePct: e.otherRevenuePct,
    propertyIncomeSharePct: e.propertyIncomeSharePct,
    equipmentPerUnitAed: e.equipmentPerUnitAed,
    preOpeningPerUnitAed: e.preOpeningPerUnitAed,
    capexPerUnitAed: e.capexPerUnitAed,
    exitCapRatePct: e.exitCapRatePct,
    rampPct: [...e.rampPct],
  };
}

// ── Project-level defaults ───────────────────────────────────────────────

export const PROJECT_DEFAULTS = {
  authorityFeesPct: 1.0,
  developerOverheadPct: 3.0,
  reraFeesAed: 150_000,
  landHoldingPctPa: 0,
  soldAtLaunchPct: 15,
  soldByHandoverPct: 80,
  paidDuringConstructionPct: 60,
  selloutMonthsAfterHandover: 12,
  escrowRetentionPct: 5,
  assetSaleFeePct: 2,
  exitSaleCostPct: 2,
  rentGrowthPct: 3,
  holdYears: 5,
  loanRatePct: 7,
  termRatePct: 6.5,
  discountRatePct: 10,
  jvProfitSharePct: 30,
  jvRevenueSharePct: 20,
  jvDevelopmentAgreementFeePct: 4,
} as const;

export const PROJECT_PROV: Record<keyof typeof PROJECT_DEFAULTS, Prov> = {
  authorityFeesPct: {
    s: 'assumed',
    note: 'No published rule of thumb. The Dubai Municipality permit fee is tiny (AED 0.30/sqft, Property Finder Nov 2026; DDA design approval AED 0.10/sqft of BUA, capped at AED 50,000). The DEWA connection charge is per kW of connected load and its rates could not be retrieved — 1% is an allowance for it.',
  },
  developerOverheadPct: { s: 'assumed', note: 'Project-management fees of 2–4% are quoted in trade sources; no published developer-overhead benchmark.' },
  reraFeesAed: { s: 'sourced', note: 'DLD project registration AED 150,000 + AED 20 (DLD "Register Project" page). Escrow-bank fees not published.' },
  landHoldingPctPa: { s: 'placeholder', note: 'No published holding-cost figure. The time cost of holding land through design is already in the IRR; enter any cash cost (community fees, security).' },
  soldAtLaunchPct: { s: 'carried', note: 'Founder default (Sprint 9, N6). No published figure.' },
  soldByHandoverPct: { s: 'carried', note: 'Founder default. Fitch (Mar 2026) cites a 60–65% presale threshold for a viable start.' },
  paidDuringConstructionPct: { s: 'sourced', note: '60/40 is the commonest Dubai off-plan plan; 80/20 and 50/50 post-handover also used (fäm Properties, Aug 2025).' },
  selloutMonthsAfterHandover: { s: 'assumed', note: 'Time to sell completed, unsold stock. No published figure.' },
  escrowRetentionPct: { s: 'sourced', note: 'Law 8/2007 Art. 14: 5% of the escrow account retained for one year after completion.' },
  assetSaleFeePct: { s: 'assumed', note: 'Agent 2% + VAT is the residential convention; institutional fees are not published. Buyer pays the 4% DLD.' },
  exitSaleCostPct: { s: 'assumed', note: 'As above.' },
  rentGrowthPct: { s: 'carried', note: 'v5 default. 2026 actuals: residential +5.5% overall but apartments −10 to −13% in some areas; office +12%; industrial +5.9%.' },
  holdYears: { s: 'carried', note: 'v5 default.' },
  loanRatePct: { s: 'assumed', note: '3M EIBOR ~4.2% (CBUAE, Sep 2026) plus a development margin. Margins and loan-to-cost are not published.' },
  termRatePct: { s: 'assumed', note: 'Investment loan on a completed, let asset. Not published.' },
  discountRatePct: { s: 'carried', note: 'v5 default: 10% for NPV.' },
  jvProfitSharePct: { s: 'sourced', note: '"30% landowner / 70% developer" profit shares reported for JVC, Dubailand, Sports City (Gulf News, c.2018). Low confidence.' },
  jvRevenueSharePct: { s: 'derived', note: 'Fitch (Mar 2026): land is about 20% of end value in Dubai.' },
  jvDevelopmentAgreementFeePct: { s: 'assumed', note: 'Charged only when the land title transfers to the JV company (toggle, off by default): DLD then takes 4% of the land value (DLD "Register Project" page + FAQ). Whether a given JV structure transfers title is a legal question: confirm with a lawyer.' },
};

/** What a study records so it can later tell that defaults moved. */
export function defaultsSnapshot(engineIds: EngineId[]): {
  version: string;
  engines: Record<string, EngineParams & { preConstructionMonths: number; constructionMonths: number; commissionPct: number; marketingPct: number }>;
  project: typeof PROJECT_DEFAULTS;
} {
  const engines: ReturnType<typeof defaultsSnapshot>['engines'] = {};
  for (const id of [...new Set(engineIds)]) {
    const e = ENGINES[id];
    engines[id] = {
      ...engineParams(id),
      preConstructionMonths: e.preConstructionMonths,
      constructionMonths: e.constructionMonths,
      commissionPct: e.commissionPct,
      marketingPct: e.marketingPct,
    };
  }
  return { version: ENGINE_DEFAULTS_VERSION, engines, project: PROJECT_DEFAULTS };
}

// Diff-badge tone function lives in ./diffBadge.ts — kept separate so the
// engine catalogue stays pure data + types.
export { diffTone, type DiffTone, type DiffResult } from './diffBadge';
