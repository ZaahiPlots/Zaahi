// ZAAHI Feasibility v6.1 — saved studies: the pure half.
//
// A study is `StudyInputs` (everything the user can change, complete enough
// to recompute the result with no parcel to hand) plus three snapshots taken
// when a version is saved:
//
//   outputs   the headline numbers, so a version reads the same forever
//   defaults  the engine defaults it was built against
//   plot      the parcel facts it was built against (price, FAR, plan)
//
// Comparing the snapshots with today is what raises "defaults have changed"
// and "the plot's price or affection plan has changed" on reopen.
//
// No I/O here. The API routes and the UI both import this file, and the
// server recomputes `outputs` itself with `summarise()` — a client never
// supplies the numbers that get stored (CLAUDE.md: financial calculations
// server-side only).

import { z } from 'zod';
import {
  ENGINES,
  ENGINE_DEFAULTS_VERSION,
  PROJECT_DEFAULTS,
  defaultsSnapshot,
  type EngineId,
} from './engines';
import {
  MODEL_VERSION,
  computeFeasibility,
  componentFor,
  defaultInputs,
  projectDefaultsFor,
  jvBaseMode,
  type FeasibilityModel,
  type StudyInputs,
} from './model';
import { benchmarkFor, benchmarkPatch } from './areaBenchmarks';
import { landUseMixToShares, routeLandUse, shareToEngine } from './routing';
import type { ParcelInput } from './parcelInput';

// ── Inputs from a parcel ─────────────────────────────────────────────────

type Loc = { district?: string | null; community?: string | null; projectName?: string | null };

/** One component for `engineId`, with the area benchmark applied if there is one. */
export function seededComponent(engineId: EngineId, loc: Loc, key = 'main', label?: string, sharePct = 100) {
  return { ...componentFor(engineId, key, label, sharePct), ...benchmarkPatch(engineId, benchmarkFor(loc)) };
}

/**
 * The starting inputs for a parcel. Nothing unknown is filled in: a missing
 * FAR, price or land use stays null / '' and the model blocks on it.
 */
export function inputsFromParcel(parcel: ParcelInput, engineOverride?: EngineId): StudyInputs {
  const route = routeLandUse(parcel.landUse);
  const shares = !engineOverride && parcel.landUse === 'MIXED USE' ? landUseMixToShares(parcel.landUseMix) : null;
  const bm = benchmarkFor(parcel);
  const inp = defaultInputs(
    {
      plotAreaSqft: parcel.plotAreaSqft > 0 ? parcel.plotAreaSqft : null,
      far: parcel.far,
      maxGfaSqft: parcel.maxGfaSqft,
      landUse: parcel.landUse,
      landCostAed: parcel.landPriceKnown ? parcel.plotPriceAed : null,
      mix: shares ? shares.map((s) => ({ ...s, engineId: shareToEngine(s) })) : null,
    },
    engineOverride ?? route.engineId,
    !!engineOverride,
  );
  let applied = false;
  inp.components = inp.components.map((c) => {
    const patch = benchmarkPatch(c.engineId, bm);
    if (Object.keys(patch).length > 0) applied = true;
    return { ...c, ...patch };
  });
  inp.site.priceBasis = applied && bm ? bm.name : null;
  return inp;
}

/**
 * Switch a single-use study to another engine: the component and every
 * engine-driven project default are re-seeded; land, finance, JV terms and the
 * site are the user's and are kept.
 */
export function withEngine(inp: StudyInputs, engineId: EngineId, loc: Loc): StudyInputs {
  const components = [seededComponent(engineId, loc)];
  const bm = benchmarkFor(loc);
  return {
    ...inp,
    // The mode is kept even if the new engine does not model it: the blocker says so, which is clearer than a silent switch.
    site: {
      ...inp.site,
      engineChosenByUser: true,
      priceBasis: bm && Object.keys(benchmarkPatch(engineId, bm)).length > 0 ? bm.name : null,
    },
    components,
    ...projectDefaultsFor(components),
  };
}

// ── Validation (API boundary) ────────────────────────────────────────────

const num = (min: number, max: number) => z.number().finite().min(min).max(max);
const pct = num(0, 100);
const money = num(0, 1e13);
const ENGINE_IDS = Object.keys(ENGINES) as [EngineId, ...EngineId[]];

const componentSchema = z.object({
  key: z.string().min(1).max(160),
  label: z.string().min(1).max(160),
  engineId: z.enum(ENGINE_IDS),
  sharePct: pct,
  units: num(0, 1e7).nullable(),
  buaGfaRatio: num(0.5, 10),
  efficiencyPct: pct,
  constructionPsfGfa: num(0, 1e5),
  parkingPsf: num(0, 1e5),
  brandPsfGfa: num(0, 1e5),
  infrastructurePsfGfa: num(0, 1e5),
  consultancyPct: pct,
  contingencyPct: pct,
  salesPsfSfa: num(0, 1e6),
  rentPsfSfaYear: num(0, 1e6),
  occupancyPct: pct,
  operatingPct: pct,
  gfaPerUnitSqm: num(0, 1e6),
  revenuePerUnit: num(0, 1e10),
  otherRevenuePct: num(0, 1000),
  propertyIncomeSharePct: pct,
  equipmentPerUnitAed: money,
  preOpeningPerUnitAed: money,
  capexPerUnitAed: money,
  exitCapRatePct: num(0, 100),
  rampPct: z.array(pct).max(15),
});

export const studyInputsSchema = z.object({
  schema: z.literal(1),
  mode: z.enum(['bts', 'btr', 'jv']),
  site: z.object({
    plotAreaSqft: num(0, 1e10).nullable(),
    far: num(0, 100).nullable(),
    maxGfaSqft: num(0, 1e10).nullable(),
    landUse: z.string().max(512),
    changeOfUseAck: z.boolean(),
    engineChosenByUser: z.boolean(),
    priceBasis: z.string().max(160).nullable(),
  }),
  components: z.array(componentSchema).min(1).max(12),
  land: z.object({
    costAed: money.nullable(),
    dldPct: num(0, 20),
    brokeragePct: num(0, 20),
    paymentMode: z.enum(['full', 'installments']),
    downPaymentPct: pct,
    installmentMonths: num(1, 240),
  }),
  programme: z.object({
    preConstructionMonths: num(0, 120),
    constructionMonths: num(1, 180),
  }),
  softCosts: z.object({
    authorityFeesPct: num(0, 50),
    developerOverheadPct: num(0, 50),
    reraFeesAed: money,
    landHoldingPctPa: num(0, 50),
    irrecoverableVatPct: num(0, 20),
    serviceChargeUnsoldPsfYear: num(0, 1000),
  }),
  sales: z.object({
    commissionPct: num(0, 30),
    marketingPct: num(0, 30),
    devServicesPct: num(0, 30),
    offPlan: z.boolean(),
    soldAtLaunchPct: pct,
    soldByHandoverPct: pct,
    paidDuringConstructionPct: pct,
    selloutMonthsAfterHandover: num(0, 120),
    escrowRetentionPct: num(0, 20),
    assetSaleFeePct: num(0, 20),
  }),
  rental: z.object({
    rentGrowthPct: num(-20, 30),
    holdYears: num(1, 30),
    exitSaleCostPct: num(0, 20),
    debtAtHandover: z.enum(['repay', 'refinance']),
    termRatePct: num(0, 40),
  }),
  finance: z.object({
    enabled: z.boolean(),
    loanAed: money,
    ratePct: num(0, 40),
  }),
  jv: z.object({
    type: z.enum(['profit_share', 'equity', 'revenue_share']),
    landValueAed: money.nullable(),
    landownerCashAed: money,
    landownerSharePct: pct,
    developmentAgreementFeePct: num(0, 20),
  }),
  discountRatePct: num(0, 50),
});

export function parseStudyInputs(raw: unknown): StudyInputs | null {
  const r = studyInputsSchema.safeParse(raw);
  return r.success ? (r.data as StudyInputs) : null;
}

// ── Outputs snapshot ─────────────────────────────────────────────────────

export interface StudyOutputs {
  modelVersion: string;
  defaultsVersion: string;
  status: 'ok' | 'blocked';
  blockers: string[];
  caveats: string[];
  mode: 'bts' | 'btr' | 'jv';
  baseMode: 'bts' | 'btr' | null;
  engines: string;
  landCostAed: number | null;
  landPsfGfa: number | null;
  gfaSqft: number | null;
  sfaSqft: number | null;
  totalCostAed: number | null;
  netRevenueAed: number | null;
  profitAed: number | null;
  roiPct: number | null;
  irrPct: number | null;
  peakEquityAed: number | null;
  npvAed: number | null;
  yieldOnCostPct: number | null;
  stabilisedNoiAed: number | null;
  equityMultiple: number | null;
  /** psf sale engines in a sale mode only. */
  breakEvenSalePsf: number | null;
  breakEvenRevenueFactor: number | null;
  residualLandAtTargetIrrAed: number | null;
  preConstructionMonths: number;
  constructionMonths: number;
  verdictLabel: string | null;
  verdictTone: string | null;
  jvLandownerIrrPct: number | null;
  jvDeveloperIrrPct: number | null;
}

const fin = (n: number | null | undefined): number | null => (typeof n === 'number' && Number.isFinite(n) ? n : null);

export function summarise(inp: StudyInputs, model: FeasibilityModel): StudyOutputs {
  const c = model.core;
  const base = inp.mode === 'jv' ? jvBaseMode(inp.components) : inp.mode;
  const landCost = inp.mode === 'jv' ? inp.jv.landValueAed ?? inp.land.costAed : inp.land.costAed;
  const lead = [...inp.components].sort((a, b) => b.sharePct - a.sharePct)[0];
  const psfSale = base === 'bts' && lead && ENGINES[lead.engineId].kind === 'psf';
  return {
    modelVersion: model.modelVersion,
    defaultsVersion: model.defaultsVersion,
    status: model.status,
    blockers: model.blockers.map((b) => b.title),
    caveats: model.caveats,
    mode: inp.mode,
    baseMode: base,
    engines: inp.components.map((x) => (inp.components.length > 1 ? `${ENGINES[x.engineId].label} ${Math.round(x.sharePct)}%` : ENGINES[x.engineId].label)).join(' · '),
    landCostAed: fin(landCost),
    landPsfGfa: c && landCost ? fin(landCost / c.areas.gfaSqft) : null,
    gfaSqft: fin(c?.areas.gfaSqft ?? model.partial.gfaSqft),
    sfaSqft: fin(c?.areas.sfaSqft),
    totalCostAed: fin(c?.totalCostAed),
    netRevenueAed: fin(c?.netRevenueAed),
    profitAed: fin(c?.profitAed),
    roiPct: fin(c?.roiPct),
    irrPct: fin(c?.irrPct),
    peakEquityAed: fin(c?.peakEquityAed),
    npvAed: fin(c?.npvAed),
    yieldOnCostPct: c && c.stabilisedNoiAed > 0 ? fin(c.yieldOnCostPct) : null,
    stabilisedNoiAed: c && c.stabilisedNoiAed > 0 ? fin(c.stabilisedNoiAed) : null,
    equityMultiple: fin(c?.equityMultiple),
    breakEvenSalePsf: psfSale && model.breakEvenRevenueFactor != null ? fin(lead.salesPsfSfa * model.breakEvenRevenueFactor) : null,
    breakEvenRevenueFactor: fin(model.breakEvenRevenueFactor),
    residualLandAtTargetIrrAed: fin(model.residualLand?.atTargetIrrAed),
    preConstructionMonths: inp.programme.preConstructionMonths,
    constructionMonths: inp.programme.constructionMonths,
    verdictLabel: model.verdict?.label ?? null,
    verdictTone: model.verdict?.tone ?? null,
    jvLandownerIrrPct: fin(model.jv?.landowner.irrPct),
    jvDeveloperIrrPct: fin(model.jv?.developer.irrPct),
  };
}

/** Recompute and summarise — what the server stores with a version. */
export function computeOutputs(inp: StudyInputs): StudyOutputs {
  return summarise(inp, computeFeasibility(inp));
}

// ── Plot + defaults snapshots, and staleness ─────────────────────────────

export interface PlotSnapshot {
  plotNumber: string;
  district: string;
  landUse: string;
  plotAreaSqft: number | null;
  far: number | null;
  maxGfaSqft: number | null;
  /** The price on record for the plot — NOT the land cost typed into the study. */
  listedPriceAed: number | null;
  /** Use mix, flattened, so a change in the affection plan shows up. */
  mix: string;
}

export function plotSnapshot(parcel: ParcelInput): PlotSnapshot {
  return {
    plotNumber: parcel.plotNumber,
    district: parcel.district,
    landUse: parcel.landUse,
    plotAreaSqft: parcel.plotAreaSqft > 0 ? parcel.plotAreaSqft : null,
    far: parcel.far,
    maxGfaSqft: parcel.maxGfaSqft,
    listedPriceAed: parcel.landPriceKnown ? parcel.plotPriceAed : null,
    mix: (parcel.landUseMix ?? [])
      .map((m) => `${m.category}|${m.sub ?? ''}|${m.areaSqm ?? ''}`)
      .sort()
      .join(';'),
  };
}

export type DefaultsSnapshot = ReturnType<typeof defaultsSnapshot>;

export function snapshotDefaultsFor(inp: StudyInputs): DefaultsSnapshot {
  return defaultsSnapshot(inp.components.map((c) => c.engineId));
}

export interface Change {
  where: string;
  field: string;
  was: string;
  now: string;
}

const show = (v: unknown): string =>
  v == null || v === '' ? '—' : Array.isArray(v) ? v.join(' / ') : typeof v === 'number' ? v.toLocaleString('en-US', { maximumFractionDigits: 2 }) : String(v);

const sameNum = (a: unknown, b: unknown): boolean =>
  typeof a === 'number' && typeof b === 'number' ? Math.abs(a - b) <= 1e-6 * Math.max(1, Math.abs(a), Math.abs(b)) : JSON.stringify(a ?? null) === JSON.stringify(b ?? null);

/** Engine / project defaults that differ between a saved snapshot and today. */
export function defaultsChanged(saved: DefaultsSnapshot | null | undefined): Change[] {
  if (!saved || saved.version === ENGINE_DEFAULTS_VERSION) return [];
  const out: Change[] = [];
  const now = defaultsSnapshot(Object.keys(saved.engines ?? {}).filter((k): k is EngineId => k in ENGINES));
  for (const [id, was] of Object.entries(saved.engines ?? {})) {
    const cur = now.engines[id];
    if (!cur) continue;
    for (const k of Object.keys(cur) as Array<keyof typeof cur>) {
      if (!sameNum(was[k], cur[k])) out.push({ where: ENGINES[id as EngineId].label, field: String(k), was: show(was[k]), now: show(cur[k]) });
    }
  }
  for (const k of Object.keys(PROJECT_DEFAULTS) as Array<keyof typeof PROJECT_DEFAULTS>) {
    const was = saved.project?.[k];
    if (was !== undefined && !sameNum(was, PROJECT_DEFAULTS[k])) out.push({ where: 'Project', field: k, was: show(was), now: show(PROJECT_DEFAULTS[k]) });
  }
  return out;
}

/** Plot facts that differ between a saved snapshot and the parcel today. */
export function plotChanged(saved: PlotSnapshot | null | undefined, parcel: ParcelInput | null): Change[] {
  if (!saved || !parcel) return [];
  const now = plotSnapshot(parcel);
  const out: Change[] = [];
  const add = (field: string, a: unknown, b: unknown) => {
    if (!sameNum(a, b)) out.push({ where: 'Plot', field, was: show(a), now: show(b) });
  };
  add('Price on record (AED)', saved.listedPriceAed, now.listedPriceAed);
  add('Plot area (sqft)', saved.plotAreaSqft, now.plotAreaSqft);
  add('FAR', saved.far, now.far);
  add('Max GFA (sqft)', saved.maxGfaSqft, now.maxGfaSqft);
  add('Land use', saved.landUse, now.landUse);
  if (saved.mix !== now.mix) out.push({ where: 'Plot', field: 'Use mix', was: saved.mix || '—', now: now.mix || '—' });
  return out;
}

export function modelChanged(savedModelVersion: string | null | undefined): boolean {
  return !!savedModelVersion && savedModelVersion !== MODEL_VERSION;
}

// ── Compare ──────────────────────────────────────────────────────────────

export interface CompareMetric {
  key: keyof StudyOutputs;
  label: string;
  format: 'aed' | 'pct' | 'int' | 'psf' | 'x' | 'months' | 'text';
  /** Which direction is better, for the per-row highlight. null = no winner. */
  best: 'high' | 'low' | null;
}

export const COMPARE_METRICS: CompareMetric[] = [
  { key: 'engines', label: 'Engine', format: 'text', best: null },
  { key: 'mode', label: 'Mode', format: 'text', best: null },
  { key: 'landCostAed', label: 'Land cost', format: 'aed', best: null },
  { key: 'landPsfGfa', label: 'Land per sqft GFA', format: 'psf', best: 'low' },
  { key: 'gfaSqft', label: 'GFA (sqft)', format: 'int', best: null },
  { key: 'sfaSqft', label: 'SFA (sqft)', format: 'int', best: null },
  { key: 'totalCostAed', label: 'Total investment', format: 'aed', best: null },
  { key: 'netRevenueAed', label: 'Net revenue', format: 'aed', best: null },
  { key: 'profitAed', label: 'Profit', format: 'aed', best: 'high' },
  { key: 'roiPct', label: 'ROI', format: 'pct', best: 'high' },
  { key: 'irrPct', label: 'IRR', format: 'pct', best: 'high' },
  { key: 'peakEquityAed', label: 'Peak equity', format: 'aed', best: 'low' },
  { key: 'npvAed', label: 'NPV', format: 'aed', best: 'high' },
  { key: 'yieldOnCostPct', label: 'Yield on cost', format: 'pct', best: 'high' },
  { key: 'equityMultiple', label: 'Equity multiple', format: 'x', best: 'high' },
  { key: 'breakEvenSalePsf', label: 'Break-even sale price', format: 'psf', best: 'low' },
  { key: 'residualLandAtTargetIrrAed', label: 'Max land cost for a Strong IRR', format: 'aed', best: null },
  { key: 'constructionMonths', label: 'Build (months)', format: 'months', best: 'low' },
  { key: 'preConstructionMonths', label: 'Design + permits (months)', format: 'months', best: 'low' },
  { key: 'verdictLabel', label: 'Verdict', format: 'text', best: null },
];

/** Index of the best study for a metric, or null when there is no winner. */
export function bestIndex(metric: CompareMetric, outputs: StudyOutputs[]): number | null {
  if (!metric.best) return null;
  let best: number | null = null;
  let bestVal = 0;
  let distinct = false;
  outputs.forEach((o, i) => {
    const v = o[metric.key];
    if (typeof v !== 'number' || !Number.isFinite(v) || o.status !== 'ok') return;
    if (best === null) {
      best = i;
      bestVal = v;
      return;
    }
    if (v !== bestVal) distinct = true;
    if (metric.best === 'high' ? v > bestVal : v < bestVal) {
      best = i;
      bestVal = v;
    }
  });
  if (!distinct || best === null) return null;
  // A tie for best is not a winner: highlighting the first of several equal
  // columns would read as a ranking the numbers do not support.
  const holders = outputs.filter((o) => o.status === 'ok' && o[metric.key] === bestVal).length;
  return holders === 1 ? best : null;
}

export interface AssumptionRow {
  label: string;
  values: string[];
  /** True when the studies do not all agree — the row a reader must look at. */
  differs: boolean;
}

/**
 * The assumptions behind each study, side by side. A 30% IRR built on
 * AED 2,455/sqft must not be compared blind with one built on AED 1,900.
 */
export function assumptionRows(list: StudyInputs[]): AssumptionRow[] {
  const lead = (i: StudyInputs) => [...i.components].sort((a, b) => b.sharePct - a.sharePct)[0];
  const n = (v: number, d = 0) => v.toLocaleString('en-US', { maximumFractionDigits: d });
  const rows: Array<[string, (i: StudyInputs) => string]> = [
    // Land first: "same plot, different price" is the most common comparison,
    // and a difference here must not hide in the results table alone.
    ['Land cost (AED)', (i) => (i.land.costAed == null ? 'not set' : n(i.land.costAed))],
    ['Land payment', (i) => (i.land.paymentMode === 'installments' ? `${n(i.land.downPaymentPct)}% down, balance over ${n(i.land.installmentMonths)} mo` : 'In full')],
    ['Plot area / FAR', (i) => `${i.site.plotAreaSqft == null ? "unknown" : `${n(i.site.plotAreaSqft)} sqft`} / ${i.site.maxGfaSqft != null ? `Max GFA ${n(i.site.maxGfaSqft)}` : i.site.far != null ? n(i.site.far, 2) : 'unknown'}`],
    ['Use mix', (i) => i.components.map((c) => `${ENGINES[c.engineId].label} ${n(c.sharePct, 1)}%`).join(' · ')],
    ['Price basis', (i) => i.site.priceBasis ?? 'Dubai city-wide'],
    ['Sale price (AED/sqft)', (i) => i.components.map((c) => (ENGINES[c.engineId].kind === 'psf' ? n(c.salesPsfSfa) : '—')).join(' · ')],
    ['Rent (AED/sqft/yr)', (i) => i.components.map((c) => (ENGINES[c.engineId].kind === 'psf' ? n(c.rentPsfSfaYear) : '—')).join(' · ')],
    ['Revenue per unit', (i) => i.components.map((c) => (ENGINES[c.engineId].kind === 'operating' ? `${n(c.revenuePerUnit)} / ${ENGINES[c.engineId].unitLabel.replace(/s$/, '')}` : '—')).join(' · ')],
    ['Occupancy', (i) => i.components.map((c) => `${n(c.occupancyPct, 1)}%`).join(' · ')],
    ['Operating cost', (i) => i.components.map((c) => `${n(c.operatingPct, 1)}%`).join(' · ')],
    ['Exit cap rate', (i) => i.components.map((c) => `${n(c.exitCapRatePct, 2)}%`).join(' · ')],
    ['Construction (AED/sqft GFA)', (i) => i.components.map((c) => n(c.constructionPsfGfa)).join(' · ')],
    ['BUA / GFA', (i) => i.components.map((c) => n(c.buaGfaRatio, 2)).join(' · ')],
    ['Efficiency', (i) => i.components.map((c) => `${n(c.efficiencyPct, 1)}%`).join(' · ')],
    ['Contingency', (i) => `${n(lead(i).contingencyPct, 1)}%`],
    ['Design + permits', (i) => `${n(i.programme.preConstructionMonths)} mo`],
    ['Build', (i) => `${n(i.programme.constructionMonths)} mo`],
    ['Commission / marketing', (i) => `${n(i.sales.commissionPct, 1)}% / ${n(i.sales.marketingPct, 1)}%`],
    ['Off-plan (escrow)', (i) => (i.sales.offPlan ? `Yes — ${n(i.sales.soldAtLaunchPct)}% at launch, ${n(i.sales.soldByHandoverPct)}% by handover, ${n(i.sales.paidDuringConstructionPct)}/${n(100 - i.sales.paidDuringConstructionPct)} plan` : 'No')],
    ['Authority fees / overhead', (i) => `${n(i.softCosts.authorityFeesPct, 1)}% / ${n(i.softCosts.developerOverheadPct, 1)}%`],
    ['Finance', (i) => (i.finance.enabled && i.finance.loanAed > 0 ? `AED ${n(i.finance.loanAed)} at ${n(i.finance.ratePct, 2)}%` : 'None')],
    ['Hold / rent growth', (i) => `${n(i.rental.holdYears)} yr / ${n(i.rental.rentGrowthPct, 1)}%`],
    ['JV terms', (i) => (i.mode === 'jv' ? `${i.jv.type.replace('_', ' ')} · landowner ${n(i.jv.landownerSharePct, 1)}%` : '—')],
    ['Discount rate', (i) => `${n(i.discountRatePct, 1)}%`],
  ];
  return rows.map(([label, f]) => {
    const values = list.map(f);
    return { label, values, differs: new Set(values).size > 1 };
  });
}

// ── Re-basing a saved study onto today's defaults ────────────────────────

/**
 * "Defaults have changed since this was saved — recompute?"
 *
 * Moves a saved study onto the current engine defaults WITHOUT discarding the
 * user's own figures: a component field is replaced only if it still equals
 * the default it was saved against (i.e. the user never touched it). Returns
 * the new inputs and how many fields moved.
 */
export function applyNewDefaults(inp: StudyInputs, saved: DefaultsSnapshot | null | undefined): { inputs: StudyInputs; moved: number } {
  if (!saved) return { inputs: inp, moved: 0 };
  let moved = 0;
  const now = defaultsSnapshot(inp.components.map((c) => c.engineId));
  const components = inp.components.map((c) => {
    const was = saved.engines?.[c.engineId];
    const cur = now.engines[c.engineId];
    if (!was || !cur) return c;
    const next = { ...c } as typeof c & Record<string, unknown>;
    for (const k of Object.keys(cur) as Array<keyof typeof cur>) {
      if (!(k in c)) continue;
      const mine = (c as unknown as Record<string, unknown>)[k as string];
      if (sameNum(mine, was[k]) && !sameNum(was[k], cur[k])) {
        next[k as string] = Array.isArray(cur[k]) ? [...(cur[k] as number[])] : cur[k];
        moved += 1;
      }
    }
    return next as typeof c;
  });
  return { inputs: { ...inp, components }, moved };
}
