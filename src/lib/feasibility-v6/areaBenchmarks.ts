// ZAAHI Feasibility v6.1 — per-area price and rent benchmarks (audit M3).
//
// The engines carry Dubai city-wide averages. A Downtown plot and a Dubai
// South plot do not sell at the same price, so where a PUBLISHED area figure
// exists it replaces the city-wide default, and the calculator says which
// basis it used. Where none exists the model keeps the city-wide figure and
// attaches a "not this location" caveat.
//
// This is a short, hand-keyed table of published figures — not the DLD
// transaction feed. Wiring per-area medians from ZAAHI's own DLD data is the
// proper fix and is listed under FOUNDER DECISIONS: the repo holds only 6,886
// LAND transactions (data/dld-transactions.csv), no unit sales or rents.
//
// Every figure: AED per sqft (sale) or AED per sqft per year (rent).
//
// RESIDENTIAL RENT: no area carries one. The earlier figures were sale price ×
// a quoted gross yield, i.e. derived, not published. Residential rent is the
// Dubai city average (engines.ts) until an area has its own PUBLISHED rent per
// sqft: add `residentialRentPsfYear` with its source then.

import type { EngineId, EngineParams } from './engines';

export interface AreaBenchmark {
  name: string;
  /** Upper-case substrings matched against district / community / project. */
  match: string[];
  residentialSalePsf?: number;
  residentialRentPsfYear?: number;
  officeSalePsf?: number;
  officeRentPsfYear?: number;
  retailRentPsfYear?: number;
  industrialRentPsfYear?: number;
  source: string;
}

const PM = 'Property Monitor via Engel & Völkers, Oct–Nov 2026';

export const AREA_BENCHMARKS: AreaBenchmark[] = [
  {
    name: 'Jumeirah Village Circle',
    match: ['JUMEIRAH VILLAGE CIRCLE', 'JVC'],
    residentialSalePsf: 1408,
    source: `${PM}: AED 1,408/sqft`,
  },
  {
    name: 'Dubai South',
    match: ['DUBAI SOUTH', 'DUBAI WORLD CENTRAL'],
    residentialSalePsf: 1496,
    officeRentPsfYear: 124,
    industrialRentPsfYear: 55,
    source: `${PM}: AED 1,496/sqft; office AED 124 (Property Monitor, May 2026); warehouses AED 55 (Knight Frank, H1 2026)`,
  },
  {
    name: 'Business Bay',
    match: ['BUSINESS BAY'],
    residentialSalePsf: 2224,
    officeRentPsfYear: 151,
    retailRentPsfYear: 221,
    source: `${PM}: AED 2,224/sqft; office AED 151 (May 2026); retail AED 221 (Engel & Völkers, H1 2026)`,
  },
  {
    name: 'Dubai Hills',
    match: ['DUBAI HILLS'],
    residentialSalePsf: 2366,
    source: `${PM}: AED 2,366/sqft`,
  },
  {
    name: 'Downtown Dubai',
    match: ['DOWNTOWN', 'BURJ KHALIFA'],
    residentialSalePsf: 3121,
    officeSalePsf: 5130,
    officeRentPsfYear: 367,
    retailRentPsfYear: 817,
    source: `${PM}: AED 3,121/sqft; office sale AED 5,130 (Knight Frank, 2025), rent AED 367 (Savills); retail AED 817 (Engel & Völkers, H1 2026)`,
  },
  { name: 'DIFC', match: ['DIFC', 'INTERNATIONAL FINANCIAL'], officeRentPsfYear: 537, source: 'Savills, Q4 2025: office AED 537/sqft/yr' },
  { name: 'Jumeirah Lakes Towers', match: ['JUMEIRAH LAKE', 'JLT'], officeRentPsfYear: 135, source: 'Property Monitor via Engel & Völkers, May 2026: office AED 135/sqft/yr' },
  { name: 'Al Quoz', match: ['AL QUOZ', 'QUOZ'], industrialRentPsfYear: 90, source: 'Knight Frank, H1 2026: Grade A warehouses AED 90/sqft/yr' },
  { name: 'Dubai Investment Park', match: ['DUBAI INVESTMENT PARK', 'DUBAI INVESTMENTS PARK'], industrialRentPsfYear: 62, source: 'Engel & Völkers, H2 2025: warehouses AED 60–65/sqft/yr' },
  { name: 'Jebel Ali Free Zone', match: ['JAFZA', 'JEBEL ALI FREE'], industrialRentPsfYear: 42, source: 'Engel & Völkers, H2 2025: warehouses AED 40–45/sqft/yr' },
  { name: 'Dubai Industrial City', match: ['DUBAI INDUSTRIAL'], industrialRentPsfYear: 58, source: 'Engel & Völkers, H2 2025: warehouses AED 58/sqft/yr' },
  { name: 'Mirdif', match: ['MIRDIF'], retailRentPsfYear: 298, source: 'Engel & Völkers, H1 2026: retail AED 298/sqft/yr' },
  { name: 'Al Barsha', match: ['AL BARSHA', 'BARSHA'], retailRentPsfYear: 337, source: 'Engel & Völkers, H1 2026: retail AED 337/sqft/yr' },
  { name: 'International City', match: ['INTERNATIONAL CITY'], retailRentPsfYear: 95, source: 'Engel & Völkers, H1 2026: retail AED 95/sqft/yr' },
];

/** Off-plan premium over ready stock: AED 2,030 vs 1,691 (ValuStrat, Q1 2026). */
export const OFF_PLAN_PREMIUM = 2030 / 1691;

export function benchmarkFor(loc: { district?: string | null; community?: string | null; projectName?: string | null }): AreaBenchmark | null {
  const hay = [loc.district, loc.community, loc.projectName].filter(Boolean).join(' | ').toUpperCase();
  if (!hay) return null;
  for (const b of AREA_BENCHMARKS) if (b.match.some((m) => hay.includes(m))) return b;
  return null;
}

/**
 * The parameter overrides an area benchmark implies for one engine. Empty
 * when the benchmark says nothing about that asset class.
 */
export function benchmarkPatch(engineId: EngineId, b: AreaBenchmark | null): Partial<EngineParams> {
  if (!b) return {};
  const out: Partial<EngineParams> = {};
  if (engineId === 'residential' || engineId === 'offplan') {
    if (b.residentialSalePsf) out.salesPsfSfa = Math.round(b.residentialSalePsf * (engineId === 'offplan' ? OFF_PLAN_PREMIUM : 1));
    if (b.residentialRentPsfYear) out.rentPsfSfaYear = b.residentialRentPsfYear;
  } else if (engineId === 'office') {
    if (b.officeSalePsf) out.salesPsfSfa = b.officeSalePsf;
    if (b.officeRentPsfYear) out.rentPsfSfaYear = b.officeRentPsfYear;
  } else if (engineId === 'retail') {
    if (b.retailRentPsfYear) out.rentPsfSfaYear = b.retailRentPsfYear;
  } else if (engineId === 'industrial') {
    if (b.industrialRentPsfYear) out.rentPsfSfaYear = b.industrialRentPsfYear;
  }
  return out;
}
