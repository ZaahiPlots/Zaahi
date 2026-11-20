// ZAAHI Feasibility v6.1 — THE model.
//
// One function, `computeFeasibility(inputs)`, produces every number the
// calculator, the PDF, a saved study and the compare view show. The audit of
// 2026-11-20 (docs/audits/FEASIBILITY_AUDIT_2026-11-20.md) found the kernel
// arithmetic correct and the model wrong in three structural ways:
//
//   1. several models on one screen (single-engine lines under a mixed-use
//      total, an escrow IRR next to a JV IRR that ignored escrow),
//   2. inputs that were invented when unknown (land price 0, FAR 2.5,
//      "Residential" for a utility plot),
//   3. costs and time that were simply absent (FF&E, ramp-up, permits, the
//      design period, sell-out, selling costs on exit).
//
// So this module is deliberately a single month-by-month cash model:
//
//   • a project is a list of COMPONENTS (one for a single-use plot, one per
//     use on a mixed-use plot); each carries its own engine parameters;
//   • everything a parcel pays once (land, DLD, permits, overhead, debt) sits
//     at project level;
//   • BtS, BtR and JV are three readings of the same schedule, so they cannot
//     disagree about cost, programme, escrow or debt;
//   • every displayed line is an element of `costLines` / `revenueLines`, and
//     the totals are literally the sum of those arrays — a report cannot print
//     a line that does not reconcile;
//   • an unknown input produces a BLOCKER and no result, never a default.
//
// v5 (src/lib/feasibility.ts) is not imported for maths. It stays read-only
// and keeps serving the v5 side-panel calculator.
//
// Pure and serialisable: no React, no Date, no I/O. The same code runs in the
// browser (live calculator) and on the server (saved-study outputs are
// recomputed server-side before they are stored).

import {
  ENGINES,
  ENGINE_DEFAULTS_VERSION,
  type EngineId,
  type EngineParams,
  type ParamKey,
  engineParams,
} from './engines';
import { irr, npv, peakEquity, SEQ, type CashflowEntry } from './irr';
import { routeLandUse } from './routing';
import {
  verdictFor,
  type Verdict,
  STRONG_IRR_BTS,
  STRONG_IRR_BTR,
} from './verdict';

export const MODEL_VERSION = '6.1.0';
export const SQM_TO_SQFT = 10.7639;

export type Mode = 'bts' | 'btr' | 'jv';
export type JvType = 'profit_share' | 'equity' | 'revenue_share';

// ── Inputs ───────────────────────────────────────────────────────────────

export interface ComponentInputs extends EngineParams {
  /** Stable key — 'main' for a single-use plot, `${category}|${sub}` on a mix. */
  key: string;
  label: string;
  engineId: EngineId;
  /** Share of project GFA, percent. Shares must sum to 100. */
  sharePct: number;
  /** Keys / beds / students / MW. null = derive from GFA ÷ gfaPerUnitSqm. */
  units: number | null;
}

export interface StudyInputs {
  schema: 1;
  mode: Mode;
  site: {
    plotAreaSqft: number | null;
    /** null = unknown. Never defaulted. */
    far: number | null;
    /** Affection-plan Max GFA. Wins over plot × FAR when present. */
    maxGfaSqft: number | null;
    landUse: string;
    /**
     * The user has explicitly asked to model a land use that is not a
     * development class (utility, open space…). Results then carry a
     * "hypothetical — change of use required" caveat.
     */
    changeOfUseAck: boolean;
    /** The user picked the engine themselves (land use unknown or overridden). */
    engineChosenByUser: boolean;
    /**
     * Name of the area benchmark the price / rent defaults were seeded from
     * (areaBenchmarks.ts), or null when they are Dubai city-wide averages.
     */
    priceBasis: string | null;
  };
  components: ComponentInputs[];
  land: {
    /** null / 0 = unknown. Never derived. */
    costAed: number | null;
    dldPct: number;
    brokeragePct: number;
    paymentMode: 'full' | 'installments';
    downPaymentPct: number;
    installmentMonths: number;
  };
  programme: {
    /** Design + authority approvals, between land purchase and site start. */
    preConstructionMonths: number;
    constructionMonths: number;
  };
  softCosts: {
    /** DM/DDA permit, DEWA connection, Civil Defence — % of construction. */
    authorityFeesPct: number;
    /** Developer overhead / project management — % of construction. */
    developerOverheadPct: number;
    /** RERA project registration + escrow account. Off-plan sales only. */
    reraFeesAed: number;
    /** Carrying cost of the land until handover — % of land cost per year. */
    landHoldingPctPa: number;
    /** Net irrecoverable VAT — % of construction-phase costs. */
    irrecoverableVatPct: number;
    /** Service charge the developer pays on unsold completed stock. */
    serviceChargeUnsoldPsfYear: number;
  };
  sales: {
    commissionPct: number;
    marketingPct: number;
    devServicesPct: number;
    /** Off-plan sales through a RERA escrow account (Law 8/2007). */
    offPlan: boolean;
    soldAtLaunchPct: number;
    soldByHandoverPct: number;
    /** Share of the price buyers pay before handover (the "60" in 60/40). */
    paidDuringConstructionPct: number;
    /** Months after handover to sell whatever is still unsold. */
    selloutMonthsAfterHandover: number;
    escrowRetentionPct: number;
    /** Agent + legal on the sale of a whole operating asset. */
    assetSaleFeePct: number;
  };
  rental: {
    rentGrowthPct: number;
    holdYears: number;
    /** Agent + legal on the exit sale at the end of the hold. */
    exitSaleCostPct: number;
    /** What happens to the construction loan at handover in BtR. */
    debtAtHandover: 'repay' | 'refinance';
    termRatePct: number;
  };
  finance: {
    enabled: boolean;
    loanAed: number;
    ratePct: number;
  };
  jv: {
    type: JvType;
    /** null = follow the Land Cost input (audit B9). */
    landValueAed: number | null;
    landownerCashAed: number;
    /** Profit share (profit_share) or revenue share (revenue_share), %. */
    landownerSharePct: number;
    /**
     * DLD fee to register the development agreement when the landowner is not
     * the developer — % of the land value. 0 when the landowner IS the
     * developer of record.
     */
    developmentAgreementFeePct: number;
  };
  discountRatePct: number;
}

// ── Outputs ──────────────────────────────────────────────────────────────

export type BlockerCode =
  | 'AREA_UNKNOWN'
  | 'FAR_UNKNOWN'
  | 'LAND_PRICE_UNKNOWN'
  | 'NOT_DEVELOPABLE'
  | 'ENGINE_NOT_MODELLED'
  | 'MODE_UNSUPPORTED'
  | 'MIX_INVALID'
  | 'LAND_USE_UNKNOWN'
  | 'UNITS_REQUIRED';

export interface Blocker {
  code: BlockerCode;
  title: string;
  message: string;
}

export interface Line {
  id: string;
  label: string;
  aed: number;
  /** Shown next to the label: the rate or basis the figure came from. */
  basis?: string;
}

export interface ComponentResult {
  key: string;
  label: string;
  engineId: EngineId;
  engineLabel: string;
  kind: 'psf' | 'operating';
  sharePct: number;
  gfaSqft: number;
  buaSqft: number;
  sfaSqft: number;
  units: number;
  unitLabel: string;
  /** Building, parking, brand, infrastructure, consultancy, contingency, per-unit capex. */
  constructionAed: number;
  equipmentAed: number;
  preOpeningAed: number;
  /** BtS, psf engines: SFA × sale psf. */
  grossSalesAed: number;
  /** Stabilised year-1 net operating income (no ramp, no growth). */
  stabilisedNoiAed: number;
  /** Sale / exit value of this component. */
  exitValueAed: number;
  /** Revenue net of this component's selling costs, less its construction. */
  contributionAed: number;
}

export interface MonthRow {
  month: number;
  costsAed: number;
  inflowsAed: number;
  debtDrawAed: number;
  debtServiceAed: number;
  netAed: number;
  cumulativeAed: number;
}

export interface CoreResult {
  mode: 'bts' | 'btr';
  areas: {
    plotAreaSqft: number;
    far: number;
    farSource: 'affection plan' | 'derived from Max GFA' | 'user input';
    gfaSqft: number;
    gfaSource: 'affection plan Max GFA' | 'plot area × FAR';
    buaSqft: number;
    sfaSqft: number;
  };
  components: ComponentResult[];
  costLines: Line[];
  /** Σ costLines. */
  totalCostAed: number;
  revenueLines: Line[];
  grossRevenueAed: number;
  /** Σ revenueLines. */
  netRevenueAed: number;
  /** netRevenue − totalCost. Equals Σ of the equity cashflow. */
  profitAed: number;
  roiPct: number;
  marginOnGdvPct: number;
  profitPerSqftSfa: number;
  irrPct: number;
  npvAed: number;
  peakEquityAed: number;
  roePct: number;
  equityMultiple: number;
  // Income (BtR, and the operating period of a build-stabilise-sell).
  stabilisedNoiAed: number;
  yieldOnCostPct: number;
  paybackYears: number;
  exitValueAed: number;
  exitCostsAed: number;
  noiByYear: number[];
  // Finance
  interestAed: number;
  loanPeakAed: number;
  escrow: null | {
    receiptsAed: number;
    drawnAed: number;
    releasedAtHandoverAed: number;
    retentionAed: number;
    retentionReleaseMonth: number;
  };
  timeline: {
    preConstructionMonths: number;
    constructionMonths: number;
    handoverMonth: number;
    endMonth: number;
  };
  monthly: MonthRow[];
  cashflows: CashflowEntry[];
}

export interface JvPartner {
  contributionAed: number;
  receiptsAed: number;
  profitAed: number;
  multiple: number;
  irrPct: number;
  cashflows: CashflowEntry[];
}

export interface JvResult {
  type: JvType;
  baseMode: 'bts' | 'btr';
  landValueAed: number;
  landownerSharePct: number;
  /** In `equity`, the share is derived from capital contributed. */
  shareIsDerived: boolean;
  project: {
    totalCostAed: number;
    netRevenueAed: number;
    profitAed: number;
    roiPct: number;
    irrPct: number;
  };
  landowner: JvPartner;
  developer: JvPartner & { peakFundingAed: number };
  /** Landowner entitlement capped by what the project can actually pay. */
  entitlementCapped: boolean;
  /** Share at which the landowner's JV receipts are worth exactly a sale today. */
  breakevenSharePct: number | null;
  sellVsJv: Array<{
    sharePct: number;
    landownerReceiptsAed: number;
    /** Receipts minus the land value: nominal gain over selling today. */
    vsSellAed: number;
    /** PV of the receipts at the discount rate, minus the land value. */
    vsSellPvAed: number;
  }>;
}

export interface FeasibilityModel {
  modelVersion: string;
  defaultsVersion: string;
  status: 'ok' | 'blocked';
  blockers: Blocker[];
  /** Conditions that do not stop the result but must travel with it. */
  caveats: string[];
  mode: Mode;
  /** What a blocked model can still say truthfully (areas, build cost). */
  partial: {
    gfaSqft: number | null;
    buaSqft: number | null;
    constructionAed: number | null;
  };
  core: CoreResult | null;
  jv: JvResult | null;
  verdict: Verdict | null;
  sensitivity: null | {
    revenueSteps: number[];
    costSteps: number[];
    /** [costStep][revenueStep] */
    irrPct: number[][];
    profitAed: number[][];
  };
  /**
   * Factor on every revenue input at which profit is exactly zero (0.92 = the
   * project survives an 8% fall in prices). null when it cannot break even.
   */
  breakEvenRevenueFactor: number | null;
  /** Outputs only. Never written back to a land cost (CLAUDE.md). */
  residualLand: null | {
    targetIrrPct: number;
    atTargetIrrAed: number | null;
    atBreakevenAed: number | null;
  };
  modelStamp: string;
}

// ── RERA escrow milestone schedule (founder-approved default, Sprint 9) ──
// At construction completion `pctComplete`, cumulative `pctDrawdown` of the
// drawable escrow may have been released. The drawdown schedule itself is
// contractual, not statutory; the retention is Law 8/2007 Art. 14.
export const ESCROW_SCHEDULE: ReadonlyArray<{ pctComplete: number; pctDrawdown: number; label: string }> = [
  { pctComplete: 20, pctDrawdown: 15, label: 'Foundation' },
  { pctComplete: 40, pctDrawdown: 30, label: 'Structure' },
  { pctComplete: 60, pctDrawdown: 50, label: 'MEP rough-in' },
  { pctComplete: 80, pctDrawdown: 70, label: 'Internal finishes' },
  { pctComplete: 100, pctDrawdown: 100, label: 'Completion' },
];
export const ESCROW_RETENTION_MONTHS = 12;

function escrowAllowedPct(completionPct: number): number {
  if (completionPct <= 0) return 0;
  let prev = { pctComplete: 0, pctDrawdown: 0 };
  for (const pt of ESCROW_SCHEDULE) {
    if (completionPct <= pt.pctComplete) {
      const span = pt.pctComplete - prev.pctComplete;
      const f = span > 0 ? (completionPct - prev.pctComplete) / span : 1;
      return prev.pctDrawdown + f * (pt.pctDrawdown - prev.pctDrawdown);
    }
    prev = pt;
  }
  return 100;
}

// ── Small helpers ────────────────────────────────────────────────────────

const pos = (n: number | null | undefined): number =>
  typeof n === 'number' && Number.isFinite(n) && n > 0 ? n : 0;
const int = (n: number, min: number): number => Math.max(min, Math.round(Number.isFinite(n) ? n : min));
const sum = (xs: number[]): number => xs.reduce((a, b) => a + b, 0);

/** Ramp factor (0..1) for operating year k (1-based). 100% beyond the array. */
function rampFactor(ramp: number[], year: number): number {
  const v = ramp[year - 1];
  return typeof v === 'number' ? Math.max(0, Math.min(100, v)) / 100 : 1;
}

export function componentUnits(c: ComponentInputs, gfaSqft: number): number {
  const eng = ENGINES[c.engineId];
  if (eng.kind !== 'operating') return 0;
  if (c.units != null && c.units > 0) return c.units;
  if (eng.unitsMustBeEntered || !(c.gfaPerUnitSqm > 0)) return 0;
  const raw = gfaSqft / SQM_TO_SQFT / c.gfaPerUnitSqm;
  // MW are fractional; keys, beds and students are whole.
  return eng.unitLabel === 'MW' ? Math.max(0.1, Math.round(raw * 10) / 10) : Math.max(1, Math.round(raw));
}

/** Stabilised net operating income of one component, AED per year. */
function stabilisedNoi(c: ComponentInputs, sfaSqft: number, units: number): number {
  const eng = ENGINES[c.engineId];
  const occ = c.occupancyPct / 100;
  const margin = 1 - c.operatingPct / 100;
  if (eng.kind === 'operating') {
    const perUnitYear =
      eng.revenueBasis === 'night'
        ? c.revenuePerUnit * 365 * (1 + c.otherRevenuePct / 100)
        : c.revenuePerUnit;
    return units * perUnitYear * occ * margin * (c.propertyIncomeSharePct / 100);
  }
  return sfaSqft * c.rentPsfSfaYear * occ * margin;
}

// ── Area resolution + gates ──────────────────────────────────────────────

interface ResolvedArea {
  plotAreaSqft: number;
  far: number;
  farSource: CoreResult['areas']['farSource'];
  gfaSqft: number;
  gfaSource: CoreResult['areas']['gfaSource'];
}

export function resolveArea(site: StudyInputs['site'], farIsUserInput = false): ResolvedArea | null {
  const plot = pos(site.plotAreaSqft);
  const maxGfa = pos(site.maxGfaSqft);
  const far = pos(site.far);
  if (!plot) return null;
  if (maxGfa) {
    // Audit M10: the plan's Max GFA is the entitlement; plot × FAR is only an
    // approximation of it (63,972 vs 64,003.61 sqft on plot 3261250).
    return {
      plotAreaSqft: plot,
      far: far || maxGfa / plot,
      farSource: far ? (farIsUserInput ? 'user input' : 'affection plan') : 'derived from Max GFA',
      gfaSqft: maxGfa,
      gfaSource: 'affection plan Max GFA',
    };
  }
  if (!far) return null;
  return {
    plotAreaSqft: plot,
    far,
    farSource: farIsUserInput ? 'user input' : 'affection plan',
    gfaSqft: plot * far,
    gfaSource: 'plot area × FAR',
  };
}

function modeSupportedBy(c: ComponentInputs, mode: 'bts' | 'btr'): boolean {
  return ENGINES[c.engineId].modes.includes(mode);
}

/** The economics a JV is struck on: a sale if the asset has one, else a hold. */
export function jvBaseMode(components: ComponentInputs[]): 'bts' | 'btr' | null {
  if (components.length === 0) return null;
  if (components.every((c) => modeSupportedBy(c, 'bts'))) return 'bts';
  if (components.every((c) => modeSupportedBy(c, 'btr'))) return 'btr';
  return null;
}

export function findBlockers(inp: StudyInputs, opts?: { farIsUserInput?: boolean }): Blocker[] {
  const out: Blocker[] = [];
  const route = routeLandUse(inp.site.landUse);

  if (!route.developable && !inp.site.changeOfUseAck) {
    out.push({
      code: 'NOT_DEVELOPABLE',
      title: 'Not a development plot',
      message:
        `Land use "${inp.site.landUse}" is ${route.reason}. It cannot be built for sale or rent as zoned, ` +
        `so there is no development profit to report. Model it only as an explicit change-of-use scenario.`,
    });
  } else if (route.kind === 'unknown' && !inp.site.engineChosenByUser) {
    out.push({
      code: 'LAND_USE_UNKNOWN',
      title: 'Land use unknown — choose an engine',
      message:
        'This plot has no land use on record, so the calculator will not assume one. ' +
        'Pick the asset class you intend to build.',
    });
  }

  const notModelled = inp.components.filter((c) => ENGINES[c.engineId].kind === 'none');
  if (notModelled.length > 0) {
    const eng = ENGINES[notModelled[0].engineId];
    out.push({
      code: 'ENGINE_NOT_MODELLED',
      title: `${eng.label} — not modelled`,
      message: `${eng.label} has no revenue model yet (${eng.blurb}). No profit, yield or IRR is reported for it in any mode.`,
    });
  }

  if (!pos(inp.site.plotAreaSqft)) {
    out.push({
      code: 'AREA_UNKNOWN',
      title: 'Plot area unknown',
      message: 'There is no plot area on record for this plot, so nothing can be sized.',
    });
  } else if (!resolveArea(inp.site, opts?.farIsUserInput)) {
    out.push({
      code: 'FAR_UNKNOWN',
      title: 'FAR unknown — enter it',
      message:
        'The affection plan carries neither a FAR nor a Max GFA for this plot. ' +
        'Enter the FAR from the plan or the master developer; the calculator will not assume one.',
    });
  }

  const landCost = inp.mode === 'jv' ? pos(inp.jv.landValueAed) || pos(inp.land.costAed) : pos(inp.land.costAed);
  if (!landCost) {
    out.push({
      code: 'LAND_PRICE_UNKNOWN',
      title: 'Land price needed',
      message:
        'This plot has no price on record. A feasibility without a land cost is not a low-cost scenario, ' +
        'it is an unknown one — enter the land cost to see results. ZAAHI never estimates a land price.',
    });
  }

  const needsUnits = inp.components.find(
    (c) => ENGINES[c.engineId].unitsMustBeEntered && !(c.units != null && c.units > 0),
  );
  if (needsUnits) {
    const eng = ENGINES[needsUnits.engineId];
    out.push({
      code: 'UNITS_REQUIRED',
      title: `Enter the ${eng.unitLabel} for ${eng.label}`,
      message:
        `${eng.label} is sized by ${eng.unitLabel}, which cannot be read off the floor area ` +
        `(for a data centre it depends on a confirmed power allocation). Enter it to see results.`,
    });
  }

  const shareSum = sum(inp.components.map((c) => c.sharePct));
  if (inp.components.length === 0 || Math.abs(shareSum - 100) >= 0.5) {
    out.push({
      code: 'MIX_INVALID',
      title: 'Use mix must total 100%',
      message: `The use shares add up to ${shareSum.toFixed(1)}%. Adjust them to 100% to get a result.`,
    });
  }

  if (notModelled.length === 0 && inp.components.length > 0) {
    const need: 'bts' | 'btr' | null = inp.mode === 'jv' ? jvBaseMode(inp.components) : inp.mode;
    const bad =
      need === null
        ? inp.components[0]
        : inp.components.find((c) => !modeSupportedBy(c, need));
    if (bad) {
      const eng = ENGINES[bad.engineId];
      const modeLabel = inp.mode === 'bts' ? 'Build to Sell' : inp.mode === 'btr' ? 'Build to Rent' : 'Joint Venture';
      const alt = eng.modes.length > 0 ? ` Switch to ${eng.modes.includes('bts') ? 'Build to Sell' : 'Build to Rent'} for this engine.` : '';
      out.push({
        code: 'MODE_UNSUPPORTED',
        title: `${modeLabel} — not modelled`,
        message: `${eng.label} has no ${inp.mode === 'bts' ? 'build-to-sell' : inp.mode === 'btr' ? 'build-to-rent' : 'sale or rental'} revenue model, so there is no profit, yield or IRR to report.${alt}`,
      });
    }
  }
  return out;
}

// ── The cash model ───────────────────────────────────────────────────────

interface SimOptions {
  mode: 'bts' | 'btr';
  area: ResolvedArea;
  /** JV: land goes in at an agreed value, in kind, with no purchase costs. */
  landInKind?: { valueAed: number; feePct: number };
}

function simulate(inp: StudyInputs, o: SimOptions): CoreResult {
  const { mode, area } = o;
  const P = int(inp.programme.preConstructionMonths, 0);
  const N = int(inp.programme.constructionMonths, 1);
  const H = P + N;
  const growth = 1 + inp.rental.rentGrowthPct / 100;

  // ── Components: areas + static totals ──────────────────────────────────
  const comps = inp.components.map((c) => {
    const eng = ENGINES[c.engineId];
    const gfa = area.gfaSqft * (c.sharePct / 100);
    const bua = gfa * c.buaGfaRatio;
    const sfa = gfa * (c.efficiencyPct / 100);
    const units = componentUnits(c, gfa);
    const shell = gfa * c.constructionPsfGfa + units * c.capexPerUnitAed;
    const parking = Math.max(0, bua - gfa) * c.parkingPsf;
    const brand = gfa * c.brandPsfGfa;
    const infra = gfa * c.infrastructurePsfGfa;
    const consultancy = (shell + parking) * (c.consultancyPct / 100);
    const contingency = (shell + parking + brand + infra + consultancy) * (c.contingencyPct / 100);
    const equipment = units * c.equipmentPerUnitAed;
    const preOpening = units * c.preOpeningPerUnitAed;
    const noi = stabilisedNoi(c, sfa, units);
    const kind: 'psf' | 'operating' = eng.kind === 'operating' ? 'operating' : 'psf';
    return {
      c, eng, kind, gfa, bua, sfa, units,
      shell, parking, brand, infra, consultancy, contingency, equipment, preOpening, noi,
      construction: shell + parking + brand + infra + consultancy + contingency,
      grossSales: kind === 'psf' && mode === 'bts' ? sfa * c.salesPsfSfa : 0,
    };
  });

  const rampYearsMax = Math.max(0, ...comps.map((x) => x.c.rampPct.length));
  const hasOperating = comps.some((x) => x.kind === 'operating');
  const hasPsfSale = mode === 'bts' && comps.some((x) => x.kind === 'psf');
  const offPlan = hasPsfSale && inp.sales.offPlan;
  const sellout = int(inp.sales.selloutMonthsAfterHandover, 0);
  const holdYears = int(inp.rental.holdYears, 1);

  // Month the operating assets are sold in BtS: once stabilised.
  const assetSaleMonth = H + 12 * rampYearsMax;
  const T =
    mode === 'btr'
      ? H + 12 * holdYears
      : Math.max(
          H,
          hasPsfSale ? H + sellout : 0,
          offPlan ? H + ESCROW_RETENTION_MONTHS : 0,
          hasOperating ? assetSaleMonth : 0,
        );

  const zeros = () => new Array<number>(T + 1).fill(0);
  const cost = zeros();          // every project cost, cash basis
  const eligible = zeros();      // the part an escrow account may pay for
  const direct = zeros();        // inflows straight to the developer
  const toEscrow = zeros();      // buyer receipts into the escrow account
  const lineTotals = new Map<string, number>();
  const lineMeta = new Map<string, { label: string; basis?: string }>();

  const addCost = (id: string, label: string, month: number, aed: number, opt?: { eligible?: boolean; basis?: string }) => {
    if (!(aed !== 0) || !Number.isFinite(aed)) {
      if (!lineMeta.has(id)) lineMeta.set(id, { label, basis: opt?.basis });
      return;
    }
    const m = Math.max(0, Math.min(T, Math.round(month)));
    cost[m] += aed;
    if (opt?.eligible) eligible[m] += aed;
    lineTotals.set(id, (lineTotals.get(id) ?? 0) + aed);
    if (!lineMeta.has(id)) lineMeta.set(id, { label, basis: opt?.basis });
  };
  const spread = (id: string, label: string, from: number, to: number, aed: number, opt?: { eligible?: boolean; basis?: string }) => {
    const a = Math.min(from, to);
    const b = Math.max(from, to);
    const n = b - a + 1;
    for (let m = a; m <= b; m++) addCost(id, label, m, aed / n, opt);
    if (aed === 0) addCost(id, label, a, 0, opt);
  };

  // ── Land ───────────────────────────────────────────────────────────────
  const inKind = o.landInKind;
  const landCost = inKind ? inKind.valueAed : pos(inp.land.costAed);
  if (inKind) {
    addCost('land', 'Land (contributed in kind, agreed value)', 0, landCost);
    if (inKind.feePct > 0)
      addCost('dld', `DLD development-agreement fee (${inKind.feePct}%)`, 0, landCost * (inKind.feePct / 100), { basis: '% of land value; landowner is not the developer' });
  } else {
    if (inp.land.paymentMode === 'installments') {
      const dp = landCost * (inp.land.downPaymentPct / 100);
      const months = int(inp.land.installmentMonths, 1);
      addCost('land', 'Land', 0, dp);
      spread('land', 'Land', 1, months, landCost - dp);
      lineMeta.set('land', { label: 'Land', basis: `${inp.land.downPaymentPct}% down, balance over ${months} months` });
    } else {
      addCost('land', 'Land', 0, landCost);
    }
    addCost('dld', `DLD transfer fee (${inp.land.dldPct}%)`, 0, landCost * (inp.land.dldPct / 100));
    if (inp.land.brokeragePct > 0)
      addCost('brokerage', `Brokerage on land (${inp.land.brokeragePct}%)`, 0, landCost * (inp.land.brokeragePct / 100));
  }

  // ── Construction-phase costs ───────────────────────────────────────────
  const cStart = P + 1;
  const fitOutFrom = Math.max(cStart, H - 5); // equipment + pre-opening land in the last 6 months
  let constructionTotal = 0;
  for (const x of comps) {
    constructionTotal += x.construction;
    spread('construction', 'Construction', cStart, H, x.shell, { eligible: true });
    spread('parking', 'Parking & basements', cStart, H, x.parking, { eligible: true });
    spread('brand', 'Brand / design premium', cStart, H, x.brand, { eligible: true });
    spread('infrastructure', 'Infrastructure & external works', cStart, H, x.infra, { eligible: true });
    // Half the consultancy is design, spent before a contractor is on site.
    if (P > 0) {
      spread('consultancy', 'Consultancy & design', 1, P, x.consultancy / 2);
      spread('consultancy', 'Consultancy & design', cStart, H, x.consultancy / 2, { eligible: true });
    } else {
      spread('consultancy', 'Consultancy & design', cStart, H, x.consultancy, { eligible: true });
    }
    spread('contingency', 'Contingency', cStart, H, x.contingency, { eligible: true });
    spread('equipment', 'FF&E / equipment', fitOutFrom, H, x.equipment);
    spread('preopening', 'Pre-opening', fitOutFrom, H, x.preOpening);
  }

  const sc = inp.softCosts;
  addCost('authority', `Authority & utility fees (${sc.authorityFeesPct}%)`, P, constructionTotal * (sc.authorityFeesPct / 100), { basis: '% of construction' });
  spread('overhead', `Developer overhead / PM (${sc.developerOverheadPct}%)`, 1, H, constructionTotal * (sc.developerOverheadPct / 100), { basis: '% of construction' });
  if (offPlan) addCost('rera', 'RERA registration & escrow fees', P, sc.reraFeesAed);
  spread('holding', `Land holding cost (${sc.landHoldingPctPa}% p.a.)`, 1, H, landCost * (sc.landHoldingPctPa / 100) * (H / 12), { basis: `to handover, ${H} months` });
  spread('vat', `Irrecoverable VAT (${sc.irrecoverableVatPct}%)`, cStart, H, constructionTotal * (sc.irrecoverableVatPct / 100), { basis: '% of construction' });

  // ── Revenue ────────────────────────────────────────────────────────────
  let grossSales = 0;
  let commissionAed = 0;
  let marketingAed = 0;
  let devServicesAed = 0;
  let assetSaleAed = 0;
  let assetSaleFeeAed = 0;
  let interimNoiAed = 0;
  let exitValueAed = 0;
  let exitCostsAed = 0;
  let serviceChargeAed = 0;
  const noiMonthly = zeros();
  const compOut: ComponentResult[] = [];

  const salesCostRate = (inp.sales.commissionPct + inp.sales.marketingPct + inp.sales.devServicesPct) / 100;

  for (const x of comps) {
    let contribution = -x.construction - x.equipment - x.preOpening;
    let compExit = 0;

    if (mode === 'bts' && x.kind === 'psf') {
      const gross = x.grossSales;
      grossSales += gross;
      // Fraction of the stock sold by the end of each month.
      const soldBy = zeros();
      if (offPlan) {
        const launch = Math.min(H, cStart);
        const atLaunch = Math.min(100, inp.sales.soldAtLaunchPct) / 100;
        const byHandover = Math.max(atLaunch, Math.min(100, inp.sales.soldByHandoverPct) / 100);
        for (let m = 0; m <= T; m++) {
          if (m < launch) soldBy[m] = 0;
          else if (m <= H) soldBy[m] = H === launch ? byHandover : atLaunch + (byHandover - atLaunch) * ((m - launch) / (H - launch));
          else if (sellout === 0) soldBy[m] = 1;
          else soldBy[m] = Math.min(1, byHandover + (1 - byHandover) * ((m - H) / sellout));
        }
        if (sellout === 0) soldBy[H] = 1;
      } else {
        for (let m = 0; m <= T; m++) {
          if (m < H) soldBy[m] = 0;
          else if (sellout === 0) soldBy[m] = 1;
          else soldBy[m] = Math.min(1, (m - H) / sellout);
        }
      }
      const during = Math.max(0, Math.min(100, inp.sales.paidDuringConstructionPct)) / 100;
      for (let m = 0; m <= T; m++) {
        const sold = (soldBy[m] - (m > 0 ? soldBy[m - 1] : 0)) * gross;
        if (sold <= 0) continue;
        if (offPlan && m <= H) {
          // Selling costs fall due when the unit is sold. The buyer's money is
          // locked in escrow, so the developer funds them from equity.
          cost[m] += sold * salesCostRate;
          // Buyer pays `during` of the price in instalments up to handover and
          // the balance on handover. All of it goes through escrow.
          const n = H - m + 1;
          for (let k = m; k <= H; k++) toEscrow[k] += (sold * during) / n;
          toEscrow[H] += sold * (1 - during);
        } else {
          // A completed unit: the selling costs come out of its sale proceeds.
          direct[m] += sold * (1 - salesCostRate);
        }
      }
      // Service charge on completed stock nobody has bought yet.
      if (sc.serviceChargeUnsoldPsfYear > 0) {
        for (let m = H + 1; m <= T; m++) {
          const unsold = 1 - soldBy[m - 1];
          if (unsold > 1e-9) {
            const aed = x.sfa * unsold * (sc.serviceChargeUnsoldPsfYear / 12);
            addCost('servicecharge', 'Service charge on unsold stock', m, aed, { basis: `AED ${sc.serviceChargeUnsoldPsfYear}/sqft/yr` });
            serviceChargeAed += aed;
          }
        }
      }
      commissionAed += gross * (inp.sales.commissionPct / 100);
      marketingAed += gross * (inp.sales.marketingPct / 100);
      devServicesAed += gross * (inp.sales.devServicesPct / 100);
      contribution += gross * (1 - salesCostRate);
      compExit = gross;
    } else {
      // Income-producing: rent (psf engines in BtR) or an operating business.
      // BtS for an operating asset is build → stabilise → sell.
      const years = mode === 'btr' ? holdYears : x.c.rampPct.length;
      const exitMonth = mode === 'btr' ? T : H + 12 * x.c.rampPct.length;
      for (let y = 1; y <= years; y++) {
        const annual = x.noi * rampFactor(x.c.rampPct, y) * Math.pow(growth, y - 1);
        for (let k = 1; k <= 12; k++) {
          const m = H + (y - 1) * 12 + k;
          if (m <= T) {
            noiMonthly[m] += annual / 12;
            direct[m] += annual / 12;
          }
        }
        interimNoiAed += annual;
        contribution += annual;
      }
      // Capitalise the NOI of the year after exit — what the buyer is buying.
      const forwardNoi = x.noi * rampFactor(x.c.rampPct, years + 1) * Math.pow(growth, years);
      const value = x.c.exitCapRatePct > 0 ? forwardNoi / (x.c.exitCapRatePct / 100) : 0;
      const feePct = mode === 'btr' ? inp.rental.exitSaleCostPct : inp.sales.assetSaleFeePct;
      const fee = value * (feePct / 100);
      direct[Math.min(T, exitMonth)] += value - fee;
      if (mode === 'btr') {
        exitValueAed += value;
        exitCostsAed += fee;
      } else {
        assetSaleAed += value;
        assetSaleFeeAed += fee;
      }
      contribution += value - fee;
      compExit = value;
    }

    compOut.push({
      key: x.c.key,
      label: x.c.label,
      engineId: x.c.engineId,
      engineLabel: x.eng.label,
      kind: x.kind,
      sharePct: x.c.sharePct,
      gfaSqft: x.gfa,
      buaSqft: x.bua,
      sfaSqft: x.sfa,
      units: x.units,
      unitLabel: x.eng.unitLabel,
      constructionAed: x.construction,
      equipmentAed: x.equipment,
      preOpeningAed: x.preOpening,
      grossSalesAed: x.grossSales,
      stabilisedNoiAed: x.noi,
      exitValueAed: compExit,
      contributionAed: contribution,
    });
  }

  // ── Month loop: escrow, debt, equity ───────────────────────────────────
  const retentionPct = offPlan ? Math.max(0, inp.sales.escrowRetentionPct) / 100 : 0;
  const escrowContract = offPlan ? sum(toEscrow) : 0;
  const drawableTotal = escrowContract * (1 - retentionPct);

  const finOn = inp.finance.enabled && inp.finance.loanAed > 0;
  const loanLimit = finOn ? inp.finance.loanAed : 0;
  const eligibleTotal = sum(eligible);
  const loanShare = eligibleTotal > 0 ? Math.min(1, loanLimit / eligibleTotal) : 0;
  const iBuild = finOn ? inp.finance.ratePct / 100 / 12 : 0;
  const iTerm = finOn ? inp.rental.termRatePct / 100 / 12 : 0;
  const refinance = mode === 'btr' && inp.rental.debtAtHandover === 'refinance';

  let pot = 0;          // drawable escrow balance
  let retained = 0;     // Art. 14 retention
  let drawnCum = 0;
  let escrowReleased = 0;
  let balance = 0;      // loan outstanding
  let loanDrawn = 0;
  let loanPeak = 0;
  let interestAed = 0;
  let cumulative = 0;
  const monthly: MonthRow[] = [];
  const cashflows: CashflowEntry[] = [];

  for (let m = 0; m <= T; m++) {
    // Interest on the opening balance.
    let interestCash = 0;
    if (balance > 0) {
      const afterHandover = m > H;
      const rate = refinance && afterHandover ? iTerm : iBuild;
      const interest = balance * rate;
      interestAed += interest;
      // Rolled up during the build (and until a BtS loan is swept); serviced
      // in cash once a refinanced asset is earning rent.
      if (refinance && afterHandover) interestCash = interest;
      else balance += interest;
    }

    // Escrow.
    let inflow = direct[m];
    let escrowDraw = 0;
    if (offPlan) {
      pot += toEscrow[m] * (1 - retentionPct);
      retained += toEscrow[m] * retentionPct;
      if (m <= H) {
        const completion = m <= P ? 0 : ((m - P) / N) * 100;
        const capCum = drawableTotal * (escrowAllowedPct(completion) / 100);
        escrowDraw = Math.max(0, Math.min(eligible[m], pot, capCum - drawnCum));
        pot -= escrowDraw;
        drawnCum += escrowDraw;
      }
      if (m === H) {
        escrowReleased = pot;
        inflow += pot;
        pot = 0;
      }
      if (m === H + ESCROW_RETENTION_MONTHS) inflow += retained;
    }

    // Loan draw: pro-rata against construction, never more than is needed.
    let loanDraw = 0;
    if (finOn && m <= H && eligible[m] > 0) {
      loanDraw = Math.max(0, Math.min(eligible[m] - escrowDraw, eligible[m] * loanShare, loanLimit - loanDrawn));
      loanDrawn += loanDraw;
      balance += loanDraw;
    }
    if (balance > loanPeak) loanPeak = balance;

    const equityCost = cost[m] - escrowDraw - loanDraw;

    // Repayment.
    let repay = 0;
    if (balance > 0) {
      if (mode === 'bts') {
        // Cash sweep from handover: proceeds retire the loan before the
        // developer sees them. Whatever is left at the end is a balloon.
        if (m >= H) repay = Math.min(balance, Math.max(0, inflow - Math.max(0, equityCost)));
        if (m === T) repay = balance;
      } else if (refinance) {
        if (m === T) repay = balance;
      } else if (m === H) {
        repay = balance;
      }
      balance -= repay;
    }

    const debtService = repay + interestCash;
    const net = -equityCost + inflow - debtService;
    cumulative += net;
    monthly.push({
      month: m,
      costsAed: cost[m],
      inflowsAed: inflow + escrowDraw,
      debtDrawAed: loanDraw,
      debtServiceAed: debtService,
      netAed: net,
      cumulativeAed: cumulative,
    });
    if (equityCost !== 0) cashflows.push({ month: m, aed: -equityCost, seq: SEQ.COST });
    if (inflow !== 0) cashflows.push({ month: m, aed: inflow, seq: SEQ.REVENUE });
    if (debtService !== 0) cashflows.push({ month: m, aed: -debtService, seq: SEQ.DEBT });
  }

  // ── Lines + totals (the totals ARE the sums of the lines) ──────────────
  const order = [
    'land', 'dld', 'brokerage', 'construction', 'parking', 'brand', 'infrastructure', 'consultancy',
    'contingency', 'equipment', 'preopening', 'authority', 'overhead', 'rera', 'holding',
    'vat', 'servicecharge',
  ];
  const costLines: Line[] = [];
  for (const id of order) {
    const meta = lineMeta.get(id);
    const aed = lineTotals.get(id) ?? 0;
    if (!meta) continue;
    // A zero line is still shown when it is one the reader expects to see
    // (so "VAT 0" is a statement, not an omission) — but not empty optional ones.
    const alwaysShow = id === 'authority' || id === 'overhead' || id === 'vat' || id === 'holding';
    if (aed === 0 && !alwaysShow) continue;
    costLines.push({ id, label: meta.label, aed, basis: meta.basis });
  }
  if (finOn) {
    costLines.push({
      id: 'interest',
      label: 'Finance interest',
      aed: interestAed,
      basis: refinance ? `${inp.finance.ratePct}% rolled up to handover, then ${inp.rental.termRatePct}% term loan` : `${inp.finance.ratePct}% on the drawn balance`,
    });
  }
  const totalCostAed = sum(costLines.map((l) => l.aed));

  const revenueLines: Line[] = [];
  if (mode === 'bts') {
    if (grossSales > 0) {
      revenueLines.push({ id: 'sales', label: 'Gross sales', aed: grossSales, basis: 'SFA × sale price' });
      revenueLines.push({ id: 'commission', label: `Sales commission (${inp.sales.commissionPct}%)`, aed: -commissionAed });
      revenueLines.push({ id: 'marketing', label: `Marketing (${inp.sales.marketingPct}%)`, aed: -marketingAed });
      if (devServicesAed > 0) revenueLines.push({ id: 'devservices', label: `Developer services (${inp.sales.devServicesPct}%)`, aed: -devServicesAed });
    }
    if (hasOperating) {
      revenueLines.push({ id: 'assetsale', label: 'Sale of operating asset at stabilisation', aed: assetSaleAed, basis: 'stabilised NOI ÷ cap rate' });
      revenueLines.push({ id: 'assetsalefee', label: `Asset sale costs (${inp.sales.assetSaleFeePct}%)`, aed: -assetSaleFeeAed });
      if (interimNoiAed !== 0) revenueLines.push({ id: 'interimnoi', label: 'Net operating income during ramp-up', aed: interimNoiAed });
    }
  } else {
    revenueLines.push({ id: 'noi', label: `Net operating income over ${holdYears}-year hold`, aed: interimNoiAed });
    revenueLines.push({ id: 'exit', label: 'Exit value at end of hold', aed: exitValueAed, basis: 'forward NOI ÷ cap rate' });
    revenueLines.push({ id: 'exitcost', label: `Exit selling costs (${inp.rental.exitSaleCostPct}%)`, aed: -exitCostsAed });
  }
  const netRevenueAed = sum(revenueLines.map((l) => l.aed));
  const grossRevenueAed = sum(revenueLines.filter((l) => l.aed > 0).map((l) => l.aed));
  const profitAed = netRevenueAed - totalCostAed;

  const stabilised = sum(comps.map((x) => x.noi));
  const noiByYear: number[] = [];
  for (let y = 1; H + y * 12 <= T; y++) noiByYear.push(sum(noiMonthly.slice(H + (y - 1) * 12 + 1, H + y * 12 + 1)));

  // Payback on the income stream: years of NOI needed to recover total cost.
  let paybackYears = 0;
  if (stabilised > 0) {
    let acc = 0;
    let y = 0;
    while (acc < totalCostAed && y < 100) {
      y += 1;
      const yr = sum(comps.map((x) => x.noi * rampFactor(x.c.rampPct, y) * Math.pow(growth, y - 1)));
      if (acc + yr >= totalCostAed) {
        paybackYears = y - 1 + (totalCostAed - acc) / yr;
        acc = totalCostAed;
        break;
      }
      acc += yr;
    }
    if (acc < totalCostAed) paybackYears = Infinity;
  }

  const peak = peakEquity(cashflows);
  const sfaTotal = sum(comps.map((x) => x.sfa));
  const gdv = mode === 'bts' ? grossSales + assetSaleAed : exitValueAed;
  const equityIn = -sum(monthly.filter((r) => r.netAed < 0).map((r) => r.netAed));
  const equityOut = sum(monthly.filter((r) => r.netAed > 0).map((r) => r.netAed));

  return {
    mode,
    areas: {
      plotAreaSqft: area.plotAreaSqft,
      far: area.far,
      farSource: area.farSource,
      gfaSqft: area.gfaSqft,
      gfaSource: area.gfaSource,
      buaSqft: sum(comps.map((x) => x.bua)),
      sfaSqft: sfaTotal,
    },
    components: compOut,
    costLines,
    totalCostAed,
    revenueLines,
    grossRevenueAed,
    netRevenueAed,
    profitAed,
    roiPct: totalCostAed > 0 ? (profitAed / totalCostAed) * 100 : 0,
    marginOnGdvPct: gdv > 0 ? (profitAed / gdv) * 100 : 0,
    profitPerSqftSfa: sfaTotal > 0 ? profitAed / sfaTotal : 0,
    irrPct: irr(cashflows),
    npvAed: npv(cashflows, inp.discountRatePct),
    peakEquityAed: peak,
    roePct: peak > 0 ? (profitAed / peak) * 100 : 0,
    equityMultiple: equityIn > 0 ? equityOut / equityIn : 0,
    stabilisedNoiAed: stabilised,
    yieldOnCostPct: totalCostAed > 0 ? (stabilised / totalCostAed) * 100 : 0,
    paybackYears,
    exitValueAed: mode === 'btr' ? exitValueAed : assetSaleAed,
    exitCostsAed: mode === 'btr' ? exitCostsAed : assetSaleFeeAed,
    noiByYear,
    interestAed,
    loanPeakAed: loanPeak,
    escrow: offPlan
      ? {
          receiptsAed: escrowContract,
          drawnAed: drawnCum,
          releasedAtHandoverAed: escrowReleased,
          retentionAed: retained,
          retentionReleaseMonth: H + ESCROW_RETENTION_MONTHS,
        }
      : null,
    timeline: { preConstructionMonths: P, constructionMonths: N, handoverMonth: H, endMonth: T },
    monthly,
    cashflows,
  };
}

// ── Joint venture ────────────────────────────────────────────────────────
//
// A JV is the SAME project with the land contributed in kind. Both partners
// sit on the project's own clock, and the developer's cashflow is defined as
// project − landowner, so the two always sum to the project and the project
// IRR is bracketed by its partners' (scripts/feasibility-model.test.ts).
//
// Audit M8: the landowner's receipts include the return of their land value;
// "sell vs JV" therefore compares TOTAL receipts with a sale today, and the
// 4% DLD is charged only when title really transfers.

function landownerEntitlement(type: JvType, sharePct: number, contribution: number, core: CoreResult): number {
  if (type === 'revenue_share') return core.grossRevenueAed * (sharePct / 100);
  // Capital back, plus (or minus) the agreed share of the result.
  return contribution + core.profitAed * (sharePct / 100);
}

function computeJv(inp: StudyInputs, area: ResolvedArea, baseMode: 'bts' | 'btr'): JvResult {
  const landValue = pos(inp.jv.landValueAed) || pos(inp.land.costAed);
  const core = simulate(inp, { mode: baseMode, area, landInKind: { valueAed: landValue, feePct: Math.max(0, inp.jv.developmentAgreementFeePct) } });
  const cash = pos(inp.jv.landownerCashAed);
  const contribution = landValue + cash;

  // Equity JV: the share is what each side put in.
  const developerCapital = core.totalCostAed - landValue - cash;
  const shareIsDerived = inp.jv.type === 'equity';
  const sharePct = shareIsDerived
    ? contribution + developerCapital > 0 ? (contribution / (contribution + developerCapital)) * 100 : 0
    : Math.max(0, Math.min(100, inp.jv.landownerSharePct));

  const positive = core.monthly.filter((r) => r.netAed > 0);
  const distributable = sum(positive.map((r) => r.netAed));

  const partnerFlows = (share: number) => {
    const raw = landownerEntitlement(inp.jv.type, share, contribution, core);
    const entitled = Math.max(0, Math.min(distributable, raw));
    const lo: CashflowEntry[] = [{ month: 0, aed: -contribution, seq: SEQ.COST }];
    for (const r of positive) {
      if (distributable > 0) lo.push({ month: r.month, aed: r.netAed * (entitled / distributable), seq: SEQ.REVENUE });
    }
    return { entitled, capped: Math.abs(raw - entitled) > 1, lo };
  };

  const main = partnerFlows(sharePct);
  // Developer = project − landowner, month by month.
  const loByMonth = new Map<number, number>();
  for (const e of main.lo) loByMonth.set(e.month, (loByMonth.get(e.month) ?? 0) + e.aed);
  const dev: CashflowEntry[] = [];
  let devIn = 0;
  let devOut = 0;
  for (const r of core.monthly) {
    const v = r.netAed - (loByMonth.get(r.month) ?? 0);
    if (Math.abs(v) < 1e-6) continue;
    dev.push({ month: r.month, aed: v, seq: v < 0 ? SEQ.COST : SEQ.REVENUE });
    if (v < 0) devIn += -v;
    else devOut += v;
  }

  const sharesToShow = inp.jv.type === 'revenue_share' ? [15, 20, 25, 30, 35] : [20, 30, 40, 50, 60];
  const sellVsJv = sharesToShow.map((s) => {
    const f = partnerFlows(s);
    const pv = npv(f.lo.filter((e) => e.aed > 0), inp.discountRatePct);
    return { sharePct: s, landownerReceiptsAed: f.entitled, vsSellAed: f.entitled - landValue, vsSellPvAed: pv - landValue };
  });

  // Share at which the PV of the landowner's receipts equals a sale today.
  let breakevenSharePct: number | null = null;
  if (!shareIsDerived && distributable > 0) {
    const pvAt = (s: number) => npv(partnerFlows(s).lo.filter((e) => e.aed > 0), inp.discountRatePct) - landValue;
    if (pvAt(0) < 0 && pvAt(100) > 0) {
      let lo = 0;
      let hi = 100;
      for (let i = 0; i < 40; i++) {
        const mid = (lo + hi) / 2;
        if (pvAt(mid) < 0) lo = mid;
        else hi = mid;
      }
      breakevenSharePct = (lo + hi) / 2;
    } else if (pvAt(0) >= 0) {
      breakevenSharePct = 0;
    }
  }

  return {
    type: inp.jv.type,
    baseMode,
    landValueAed: landValue,
    landownerSharePct: sharePct,
    shareIsDerived,
    project: {
      totalCostAed: core.totalCostAed,
      netRevenueAed: core.netRevenueAed,
      profitAed: core.profitAed,
      roiPct: core.roiPct,
      irrPct: core.irrPct,
    },
    landowner: {
      contributionAed: contribution,
      receiptsAed: main.entitled,
      profitAed: main.entitled - contribution,
      multiple: contribution > 0 ? main.entitled / contribution : 0,
      irrPct: irr(main.lo),
      cashflows: main.lo,
    },
    developer: {
      contributionAed: devIn,
      receiptsAed: devOut,
      profitAed: devOut - devIn,
      multiple: devIn > 0 ? devOut / devIn : 0,
      irrPct: irr(dev),
      cashflows: dev,
      peakFundingAed: peakEquity(dev),
    },
    entitlementCapped: main.capped,
    breakevenSharePct,
    sellVsJv,
  };
}

/** The base project a JV is struck on — exposed so the UI can show its lines. */
function jvCore(inp: StudyInputs, area: ResolvedArea, baseMode: 'bts' | 'btr'): CoreResult {
  const landValue = pos(inp.jv.landValueAed) || pos(inp.land.costAed);
  return simulate(inp, { mode: baseMode, area, landInKind: { valueAed: landValue, feePct: Math.max(0, inp.jv.developmentAgreementFeePct) } });
}

// ── Sensitivity + residual land ──────────────────────────────────────────

function scaled(inp: StudyInputs, revenueF: number, costF: number): StudyInputs {
  return {
    ...inp,
    components: inp.components.map((c) => ({
      ...c,
      salesPsfSfa: c.salesPsfSfa * revenueF,
      rentPsfSfaYear: c.rentPsfSfaYear * revenueF,
      revenuePerUnit: c.revenuePerUnit * revenueF,
      constructionPsfGfa: c.constructionPsfGfa * costF,
      parkingPsf: c.parkingPsf * costF,
      capexPerUnitAed: c.capexPerUnitAed * costF,
      equipmentPerUnitAed: c.equipmentPerUnitAed * costF,
    })),
  };
}

function headlineIrr(inp: StudyInputs, area: ResolvedArea, base: 'bts' | 'btr'): { irrPct: number; profitAed: number } {
  const core = inp.mode === 'jv' ? jvCore(inp, area, base) : simulate(inp, { mode: base, area });
  return { irrPct: core.irrPct, profitAed: core.profitAed };
}

function withLand(inp: StudyInputs, landAed: number): StudyInputs {
  return inp.mode === 'jv'
    ? { ...inp, jv: { ...inp.jv, landValueAed: landAed } }
    : { ...inp, land: { ...inp.land, costAed: landAed } };
}

function solveLand(
  inp: StudyInputs,
  area: ResolvedArea,
  base: 'bts' | 'btr',
  test: (r: { irrPct: number; profitAed: number }) => boolean,
): number | null {
  // `test` is true while the deal still clears the bar; it is monotone
  // decreasing in the land cost. Find the highest land cost that passes.
  const at = (land: number) => test(headlineIrr(withLand(inp, land), area, base));
  if (!at(1)) return null;
  let lo = 1;
  let hi = Math.max(1_000_000, (pos(inp.land.costAed) || 1_000_000) * 2);
  let guard = 0;
  while (at(hi) && guard < 40) {
    lo = hi;
    hi *= 2;
    guard += 1;
  }
  if (guard >= 40) return null;
  for (let i = 0; i < 50; i++) {
    const mid = (lo + hi) / 2;
    if (at(mid)) lo = mid;
    else hi = mid;
  }
  return lo;
}

/** Engines whose price / rent defaults depend on where the plot is. */
export const LOCATION_SENSITIVE: EngineId[] = ['residential', 'offplan', 'office', 'retail', 'industrial', 'mixeduse'];

// ── Placeholder inputs ───────────────────────────────────────────────────

const PARAM_LABEL: Partial<Record<ParamKey, string>> = {
  salesPsfSfa: 'sale price',
  rentPsfSfaYear: 'rent',
  revenuePerUnit: 'revenue per unit',
  gfaPerUnitSqm: 'area per unit',
  exitCapRatePct: 'exit cap rate',
  constructionPsfGfa: 'construction cost',
};

/**
 * Revenue-critical inputs that are still an untouched placeholder. A
 * placeholder is a number for which no market data was found at all
 * (engines.ts provenance). While one is in play the result is arithmetic on a
 * guess, so the verdict is withheld — entering any figure of your own clears it.
 */
export function unverifiedInputs(inp: StudyInputs, base: 'bts' | 'btr'): string[] {
  const out: string[] = [];
  for (const c of inp.components) {
    const eng = ENGINES[c.engineId];
    const keys: ParamKey[] =
      eng.kind === 'operating'
        ? ['revenuePerUnit', 'exitCapRatePct', 'constructionPsfGfa', ...(c.units == null ? (['gfaPerUnitSqm'] as ParamKey[]) : [])]
        : base === 'bts'
          ? ['salesPsfSfa', 'constructionPsfGfa']
          : ['rentPsfSfaYear', 'exitCapRatePct', 'constructionPsfGfa'];
    for (const k of keys) {
      if (eng.prov[k]?.s !== 'placeholder') continue;
      if (c[k] !== eng[k]) continue; // the user has supplied their own
      const label = `${PARAM_LABEL[k] ?? k} (${c.label})`;
      if (!out.includes(label)) out.push(label);
    }
  }
  return out;
}

// ── Entry point ──────────────────────────────────────────────────────────

export interface ComputeOptions {
  /** The FAR came from the user, not the affection plan (labelling only). */
  farIsUserInput?: boolean;
  /** Skip the sensitivity grid and residual land (compare / bulk use). */
  light?: boolean;
}

export function computeFeasibility(inp: StudyInputs, opts?: ComputeOptions): FeasibilityModel {
  const blockers = findBlockers(inp, opts);
  const area = resolveArea(inp.site, opts?.farIsUserInput);
  const route = routeLandUse(inp.site.landUse);

  const caveats: string[] = [];
  if (!route.developable && inp.site.changeOfUseAck)
    caveats.push(`Hypothetical: "${inp.site.landUse}" is ${route.reason}. These numbers assume a change of use that has not been granted.`);
  const research = inp.components.filter((c) => !ENGINES[c.engineId].validated);
  if (research.length > 0)
    caveats.push(`Research defaults, not validated: ${[...new Set(research.map((c) => ENGINES[c.engineId].label))].join(', ')}.`);

  if (area) {
    for (const c of inp.components) {
      const eng = ENGINES[c.engineId];
      if (!eng.unitsMustBeEntered || !(c.units != null && c.units > 0) || !(c.gfaPerUnitSqm > 0)) continue;
      const gfaSqm = (area.gfaSqft * (c.sharePct / 100)) / SQM_TO_SQFT;
      if (c.units * c.gfaPerUnitSqm > gfaSqm)
        caveats.push(`${c.units} ${eng.unitLabel} needs about ${Math.round(c.units * c.gfaPerUnitSqm).toLocaleString('en-US')} sqm of building (${c.gfaPerUnitSqm} sqm per ${eng.unitLabel}); this plot's GFA allows ${Math.round(gfaSqm).toLocaleString('en-US')} sqm.`);
    }
  }

  const stampComponents =
    inp.components.length > 1
      ? `Mixed-use composite · ${inp.components.length} uses — ${inp.components.map((c) => `${c.label} ${Math.round(c.sharePct * 10) / 10}%`).join(' · ')}`
      : `Single engine · ${inp.components[0] ? ENGINES[inp.components[0].engineId].label : '—'}`;
  const modelStamp = `Model v${MODEL_VERSION} · ${stampComponents}`;

  // What can be said even when blocked: how big, and what it costs to build.
  const partial = { gfaSqft: null as number | null, buaSqft: null as number | null, constructionAed: null as number | null };
  if (area && inp.components.length > 0 && inp.components.every((c) => ENGINES[c.engineId].kind !== 'none')) {
    partial.gfaSqft = area.gfaSqft;
    let bua = 0;
    let build = 0;
    for (const c of inp.components) {
      const gfa = area.gfaSqft * (c.sharePct / 100);
      const b = gfa * c.buaGfaRatio;
      const u = componentUnits(c, gfa);
      const hard = gfa * c.constructionPsfGfa + u * c.capexPerUnitAed + Math.max(0, b - gfa) * c.parkingPsf;
      const base = hard * (1 + c.consultancyPct / 100) + gfa * (c.brandPsfGfa + c.infrastructurePsfGfa);
      bua += b;
      build += base * (1 + c.contingencyPct / 100) + u * (c.equipmentPerUnitAed + c.preOpeningPerUnitAed);
    }
    partial.buaSqft = bua;
    partial.constructionAed = build;
  }

  const blocked: FeasibilityModel = {
    modelVersion: MODEL_VERSION,
    defaultsVersion: ENGINE_DEFAULTS_VERSION,
    status: 'blocked',
    blockers,
    caveats,
    mode: inp.mode,
    partial,
    core: null,
    jv: null,
    verdict: null,
    sensitivity: null,
    breakEvenRevenueFactor: null,
    residualLand: null,
    modelStamp,
  };
  if (blockers.length > 0 || !area) return blocked;

  const base: 'bts' | 'btr' = inp.mode === 'jv' ? (jvBaseMode(inp.components) as 'bts' | 'btr') : inp.mode;
  const jv = inp.mode === 'jv' ? computeJv(inp, area, base) : null;
  const core = inp.mode === 'jv' ? jvCore(inp, area, base) : simulate(inp, { mode: base, area });

  // Audit M3: a city-wide price on a specific plot is a known weakness, so it
  // is said out loud whenever a location-sensitive default is still in play.
  {
    const blind = inp.components.filter((c) => {
      const eng = ENGINES[c.engineId];
      if (!LOCATION_SENSITIVE.includes(c.engineId)) return false;
      return base === 'bts' ? c.salesPsfSfa === eng.salesPsfSfa : c.rentPsfSfaYear === eng.rentPsfSfaYear;
    });
    if (blind.length > 0)
      caveats.push(`${base === 'bts' ? 'Sale price' : 'Rent'} is the Dubai city-wide average, not this plot's location (${[...new Set(blind.map((c) => ENGINES[c.engineId].label))].join(', ')}). Replace it with a local figure before relying on the result.`);
  }

  const unverified = unverifiedInputs(inp, base);
  if (unverified.length > 0)
    caveats.push(`No market data exists for: ${unverified.join(', ')}. These are placeholders — the verdict is withheld until you enter your own figures.`);
  if (base === 'bts' && inp.components.some((c) => ENGINES[c.engineId].kind === 'operating'))
    caveats.push('Operating assets (hotel, hospital, school, data centre) are modelled as build → stabilise → sell: the sale happens once income has ramped up, not at handover.');

  const verdict = verdictFor({
    mode: base,
    irrPct: core.irrPct,
    roiPct: core.roiPct,
    yieldPct: core.yieldOnCostPct,
    unverified,
    hypothetical: !route.developable && inp.site.changeOfUseAck,
  });

  let sensitivity: FeasibilityModel['sensitivity'] = null;
  let residualLand: FeasibilityModel['residualLand'] = null;
  let breakEvenRevenueFactor: number | null = null;
  if (!opts?.light) {
    const profitAt = (f: number) => headlineIrr(scaled(inp, f, 1), area, base).profitAed;
    if (profitAt(0.2) < 0 && profitAt(5) > 0) {
      let lo = 0.2;
      let hi = 5;
      for (let i = 0; i < 40; i++) {
        const mid = (lo + hi) / 2;
        if (profitAt(mid) < 0) lo = mid;
        else hi = mid;
      }
      breakEvenRevenueFactor = (lo + hi) / 2;
    }
    const steps = [-10, 0, 10];
    const irrGrid: number[][] = [];
    const profitGrid: number[][] = [];
    for (const cs of steps) {
      const irrRow: number[] = [];
      const profitRow: number[] = [];
      for (const rs of steps) {
        const r = headlineIrr(scaled(inp, 1 + rs / 100, 1 + cs / 100), area, base);
        irrRow.push(r.irrPct);
        profitRow.push(r.profitAed);
      }
      irrGrid.push(irrRow);
      profitGrid.push(profitRow);
    }
    sensitivity = { revenueSteps: steps, costSteps: steps, irrPct: irrGrid, profitAed: profitGrid };

    const target = base === 'bts' ? STRONG_IRR_BTS : STRONG_IRR_BTR;
    residualLand = {
      targetIrrPct: target,
      atTargetIrrAed: solveLand(inp, area, base, (r) => Number.isFinite(r.irrPct) && r.irrPct >= target),
      atBreakevenAed: solveLand(inp, area, base, (r) => r.profitAed >= 0),
    };
  }

  return {
    ...blocked,
    status: 'ok',
    core,
    jv,
    verdict,
    sensitivity,
    breakEvenRevenueFactor,
    residualLand,
  };
}

// ── Building inputs from a parcel ────────────────────────────────────────

export interface SeedSite {
  plotAreaSqft: number | null;
  far: number | null;
  maxGfaSqft: number | null;
  landUse: string;
  landCostAed: number | null;
  priceBasis?: string | null;
  mix?: Array<{ category: string; sub?: string; pct: number; engineId: EngineId }> | null;
}

export function componentFor(engineId: EngineId, key = 'main', label?: string, sharePct = 100): ComponentInputs {
  return {
    ...engineParams(engineId),
    key,
    label: label ?? ENGINES[engineId].label,
    engineId,
    sharePct,
    units: null,
  };
}

/** Project-level defaults implied by a set of components. */
export function projectDefaultsFor(components: ComponentInputs[]): Pick<StudyInputs, 'programme' | 'sales' | 'softCosts' | 'rental'> {
  const engines = components.map((c) => ENGINES[c.engineId]);
  const lead = components.length > 0
    ? ENGINES[[...components].sort((a, b) => b.sharePct - a.sharePct)[0].engineId]
    : ENGINES.residential;
  return {
    programme: {
      preConstructionMonths: Math.max(0, ...engines.map((e) => e.preConstructionMonths)),
      constructionMonths: Math.max(1, ...engines.map((e) => e.constructionMonths)),
    },
    sales: {
      commissionPct: lead.commissionPct,
      marketingPct: lead.marketingPct,
      devServicesPct: 0,
      offPlan: lead.offPlanDefault,
      soldAtLaunchPct: PROJECT_DEFAULTS.soldAtLaunchPct,
      soldByHandoverPct: PROJECT_DEFAULTS.soldByHandoverPct,
      paidDuringConstructionPct: PROJECT_DEFAULTS.paidDuringConstructionPct,
      selloutMonthsAfterHandover: PROJECT_DEFAULTS.selloutMonthsAfterHandover,
      escrowRetentionPct: PROJECT_DEFAULTS.escrowRetentionPct,
      assetSaleFeePct: PROJECT_DEFAULTS.assetSaleFeePct,
    },
    softCosts: {
      authorityFeesPct: PROJECT_DEFAULTS.authorityFeesPct,
      developerOverheadPct: PROJECT_DEFAULTS.developerOverheadPct,
      reraFeesAed: PROJECT_DEFAULTS.reraFeesAed,
      landHoldingPctPa: PROJECT_DEFAULTS.landHoldingPctPa,
      irrecoverableVatPct: Math.max(0, ...engines.map((e) => e.irrecoverableVatPct)),
      serviceChargeUnsoldPsfYear: lead.serviceChargePsfYear,
    },
    rental: {
      rentGrowthPct: PROJECT_DEFAULTS.rentGrowthPct,
      holdYears: PROJECT_DEFAULTS.holdYears,
      exitSaleCostPct: PROJECT_DEFAULTS.exitSaleCostPct,
      debtAtHandover: 'refinance',
      termRatePct: PROJECT_DEFAULTS.termRatePct,
    },
  };
}

export function defaultInputs(seed: SeedSite, engineId: EngineId | null, engineChosenByUser = false): StudyInputs {
  const components: ComponentInputs[] =
    seed.mix && seed.mix.length > 1
      ? seed.mix.map((m) =>
          componentFor(m.engineId, `${m.category}|${m.sub ?? ''}`, m.sub ? `${m.category} · ${m.sub}` : m.category, m.pct),
        )
      : [componentFor(engineId ?? 'residential')];
  return {
    schema: 1,
    mode: 'bts',
    site: {
      plotAreaSqft: seed.plotAreaSqft,
      far: seed.far,
      maxGfaSqft: seed.maxGfaSqft,
      landUse: seed.landUse,
      changeOfUseAck: false,
      engineChosenByUser,
      priceBasis: seed.priceBasis ?? null,
    },
    components,
    land: {
      costAed: seed.landCostAed,
      dldPct: 4,
      brokeragePct: 0,
      paymentMode: 'full',
      downPaymentPct: 30,
      installmentMonths: 24,
    },
    ...projectDefaultsFor(components),
    finance: { enabled: false, loanAed: 0, ratePct: PROJECT_DEFAULTS.loanRatePct },
    jv: {
      type: 'profit_share',
      landValueAed: null,
      landownerCashAed: 0,
      landownerSharePct: PROJECT_DEFAULTS.jvProfitSharePct,
      developmentAgreementFeePct: PROJECT_DEFAULTS.jvDevelopmentAgreementFeePct,
    },
    discountRatePct: PROJECT_DEFAULTS.discountRatePct,
  };
}

// Re-exported here so callers have one import for "the model and its defaults".
import { PROJECT_DEFAULTS } from './engines';
export { PROJECT_DEFAULTS };
