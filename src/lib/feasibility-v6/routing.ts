// ZAAHI Feasibility v6.1 — land use → engine routing.
//
// Audit B5: every land use the old `defaultEngineFor` did not recognise fell
// through to Residential and got a full residential profit — utility plots,
// open space, government land, about 2,700 plots in the DDA index. So did the
// 46,914 index plots with NO land use at all.
//
// The rule now: a land use either routes to an engine, or is explicitly not a
// development class, or is unknown. Nothing falls through to an asset class.

import type { EngineId } from './engines';

export interface Route {
  kind: 'engine' | 'not_developable' | 'not_modelled' | 'unknown';
  engineId: EngineId | null;
  /** False only for classes that cannot be built for sale or rent as zoned. */
  developable: boolean;
  /** Completes the sentence `Land use "X" is …`. */
  reason: string;
}

interface Rule {
  /** Shown in the routing table in the docs. */
  match: string;
  test: (u: string) => boolean;
  route: Route;
}

const has = (...needles: string[]) => (u: string) => needles.some((n) => u.includes(n));
const engine = (engineId: EngineId): Route => ({ kind: 'engine', engineId, developable: true, reason: '' });
const notDevelopable = (reason: string): Route => ({ kind: 'not_developable', engineId: null, developable: false, reason });
const notModelled = (engineId: EngineId, reason: string): Route => ({ kind: 'not_modelled', engineId, developable: true, reason });

// ORDER MATTERS. Specific uses first (a "Facilities: nursery" plot is a
// school, a "Commercial: Retail Facilities" plot is retail), then the classes
// that are not development land, then the broad categories.
const RULES: Rule[] = [
  { match: 'MIXED', test: has('MIXED'), route: engine('mixeduse') },
  // HOSPITALITY before HOSPITAL.
  { match: 'HOTEL · HOSPITALITY · RESORT', test: has('HOTEL', 'HOSPITALITY', 'RESORT'), route: engine('hospitality') },
  { match: 'EDUCATION · SCHOOL · NURSERY · KINDERGARTEN · UNIVERSITY · ACADEMY', test: has('EDUCATION', 'SCHOOL', 'NURSERY', 'KINDERGARTEN', 'UNIVERSITY', 'ACADEMY'), route: engine('educational') },
  { match: 'HEALTH · HOSPITAL · CLINIC · MEDICAL', test: has('HEALTH', 'HOSPITAL', 'CLINIC', 'MEDICAL'), route: engine('healthcare') },
  { match: 'DATA CENT', test: has('DATA CENT'), route: engine('datacenter') },
  { match: 'OPEN SPACE · PARK', test: (u) => u.includes('OPEN SPACE') || u === 'PARK' || u === 'PUBLIC PARK', route: notDevelopable('open space — it is not zoned for building') },
  { match: 'UTILITY · UTILITIES', test: has('UTILITY', 'UTILITIES'), route: notDevelopable('a utility plot (substation, pumping station, district cooling) — not land for sale or rent') },
  { match: 'TRANSPORT · TRANSPORTATION · ROAD', test: has('TRANSPORT', 'ROAD'), route: notDevelopable('transport land — not zoned for building') },
  { match: 'GOVERNMENT', test: has('GOVERNMENT'), route: notDevelopable('reserved for a government authority') },
  { match: 'RECREATION', test: has('RECREATION'), route: notDevelopable('recreational land — it has no sale or rental development model') },
  { match: 'WATER BODY', test: has('WATER BODY', 'WATERBODY'), route: notDevelopable('a water body') },
  { match: 'MOSQUE · RELIGIOUS · CEMETERY', test: has('MOSQUE', 'RELIGIOUS', 'CEMETERY'), route: notDevelopable('a religious or civic plot') },
  { match: 'PUBLIC FACILIT · COMMUNITY FACILIT', test: has('PUBLIC FACILIT', 'COMMUNITY FACILIT'), route: notDevelopable('a public-facility plot — it is reserved for community use') },
  { match: 'OFFICE', test: has('OFFICE'), route: engine('office') },
  { match: 'RETAIL · MALL · SHOWROOM', test: has('RETAIL', 'MALL', 'SHOWROOM'), route: engine('retail') },
  { match: 'INDUSTRIAL · WAREHOUSE · LOGISTIC · FACTORY', test: has('INDUSTRIAL', 'WAREHOUSE', 'LOGISTIC', 'FACTORY'), route: engine('industrial') },
  { match: 'RESIDENTIAL · VILLA · APARTMENT · TOWNHOUSE', test: has('RESIDENTIAL', 'VILLA', 'APARTMENT', 'TOWNHOUSE'), route: engine('residential') },
  { match: 'COMMERCIAL', test: has('COMMERCIAL'), route: engine('office') },
  { match: 'AGRICULTUR · FARM', test: has('AGRICULTUR', 'FARM'), route: notModelled('landhold', 'agricultural land — a land-hold, which is not modelled') },
  { match: 'FUTURE DEVELOPMENT', test: has('FUTURE'), route: notModelled('landhold', 'future-development land with no use assigned — a land-hold, which is not modelled') },
  { match: 'INVESTMENT', test: has('INVESTMENT'), route: notModelled('landhold', 'an investment land-hold, which is not modelled') },
  // A bare "FACILITIES" with none of the keywords above.
  { match: 'FACILIT (no school / clinic keyword)', test: has('FACILIT'), route: notDevelopable('a facilities plot with no stated use — it is reserved for community use') },
];

const UNKNOWN: Route = { kind: 'unknown', engineId: null, developable: true, reason: 'not on record' };

export function routeLandUse(landUse: string | null | undefined): Route {
  const u = (landUse ?? '').toUpperCase().trim();
  if (!u) return UNKNOWN;
  for (const r of RULES) if (r.test(u)) return r.route;
  return UNKNOWN;
}

/** The table, for the docs and the audit log. */
export function routingTable(): Array<{ match: string; result: string }> {
  return [
    ...RULES.map((r) => ({
      match: r.match,
      result:
        r.route.kind === 'engine'
          ? `engine: ${r.route.engineId}`
          : r.route.kind === 'not_modelled'
            ? `not modelled (${r.route.engineId})`
            : `NOT A DEVELOPMENT PLOT — ${r.route.reason}`,
    })),
    { match: '(empty) / anything else', result: 'UNKNOWN — the user must choose an engine; nothing is assumed' },
  ];
}

// ── Mixed use ────────────────────────────────────────────────────────────

export interface MixedUseShare {
  category: string;
  sub?: string;
  /** Share of total GFA, percent. */
  pct: number;
}

/**
 * Engine for one slice of a mixed-use plot. A slice whose use is not a
 * development class (a utility or open-space strip inside a mixed plot) maps
 * to `infrastructure`, which is not modelled — the calculator then asks the
 * user to reassign it rather than quietly pricing it as apartments.
 */
export function shareToEngine(share: MixedUseShare): EngineId {
  const cat = (share.category ?? '').toUpperCase().trim();
  const sub = (share.sub ?? '').toUpperCase().trim();
  // Category + sub together: "COMMERCIAL" + "RETAIL" is retail, not office.
  const route = routeLandUse(`${cat} ${sub}`.replace('MIXED', ''));
  if (route.kind === 'engine' && route.engineId) return route.engineId;
  if (route.kind === 'not_modelled' && route.engineId) return route.engineId;
  return 'infrastructure';
}

/**
 * Parse AffectionPlan.landUseMix into shares. Null when the plot is not
 * actually multi-use. Shares come from areaSqm when every entry has one,
 * otherwise an equal split (which the user is expected to correct).
 */
export function landUseMixToShares(mix: unknown): MixedUseShare[] | null {
  if (!Array.isArray(mix) || mix.length < 2) return null;
  const entries = mix as Array<{ category?: string; sub?: string; areaSqm?: number | null }>;
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
  return entries.map((e) => ({ category: (e.category ?? '').toString(), sub: e.sub, pct: equal }));
}
