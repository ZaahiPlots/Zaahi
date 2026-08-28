'use client';

// ZAAHI Feasibility Calculator v6.0 — shared client component.
//
// Used by both:
//   - /preview/feasibility-v6      (banner='preview', drives via parcel-picker UI)
//   - /parcels/[id]/feasibility    (banner='none', drives from real Prisma fetch)
//
// Reuses pure formula primitives from src/lib/feasibility.ts (v5 ratified math)
// and adds v6-specific UX:
//   • Engine selector (13 engines + 2 modifiers, per 01_LAND_USE_ENGINES.md)
//   • Live diff badges vs engine defaults (4-tone, per 03_UX_FULLSCREEN_AND_DIFF.md)
//   • Hover tooltips on top 30 fields (EN-only, per Q3 in 10_FOUNDER_RATIFY_P0.md)
//   • Fullscreen toggle
//   • jsPDF export (no weasyprint server endpoint per task constraint)
//
// READ-ONLY references:
//   - @/lib/feasibility — pure math, do NOT modify
//   - src/app/parcels/map/FeasibilityCalculator.tsx — v5 reference (style + flow)

import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { jsPDF } from 'jspdf';
import {
  deriveArea,
  deriveLand,
  deriveConstruction,
  deriveFinance,
  deriveBtSRevenue,
  btsVerdict,
  deriveBtRRental,
  btrVerdict,
  fmtAedExact,
  fmtPct,
  fmtInt,
  parseNumberInput,
  fmtInputNumber,
  type LandPaymentMode,
  type JvType,
} from '@/lib/feasibility';
import { ENGINES, type EngineId } from '@/lib/feasibility-v6/engines';
import { type ParcelInput, defaultEngineFor } from '@/lib/feasibility-v6/parcelInput';
import { computeBtSV6, computeBtRV6, computeJvV6 } from '@/lib/feasibility-v6/results';
import { btsIrrVerdict, btrIrrVerdict, jvProjectIrrVerdict } from '@/lib/feasibility-v6/verdict';
import {
  PER_UNIT_DEFAULTS,
  isPerUnitEngine,
  synthesiseBtSPsf,
  synthesiseBtRRentPsf,
  autoUnitCount,
} from '@/lib/feasibility-v6/perUnitRevenue';
import {
  computeMixedUseBtSV6,
  landUseMixToShares,
  shareToEngine,
  type MixedUseShare,
} from '@/lib/feasibility-v6/mixedUse';
import { generateRecommendations } from '@/lib/feasibility-v6/recommendations';
import FieldLabel from './FieldLabel';
import DiffBadge from './DiffBadge';
import EngineSelector from './EngineSelector';
// FullscreenToggle stays on disk for future re-introduction but is NOT
// imported in production. Sprint 7 fullscreen-route work was dropped per
// founder-corrected plan (2026-05-06). Reintroduce when v6 visual surface
// includes a viewport-overlay mode that doesn't conflict with SidePanel.

// ── Palette (CLAUDE.md UI STYLE GUIDE) ───────────────────────────────
const GOLD = '#C8A96E';
const NAVY = '#1A1A2E';
const TXT = '#f5f1e8';
const DIM = 'rgba(245, 241, 232, 0.70)';
const SUBTLE = 'rgba(245, 241, 232, 0.55)';
const LINE = 'rgba(200, 169, 110, 0.15)';
const LINE_HARD = 'rgba(200, 169, 110, 0.30)';
const AMBER = '#E67E22';

type Tab = 'bts' | 'btr' | 'jv';

// ── Debounce hook ────────────────────────────────────────────────────
function useDebounced<T>(value: T, ms = 300): T {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}

// FieldLabel + DiffBadge are now standalone components in src/components/feasibility/
// (extracted in Sprint 0 of v6 implementation). Tooltip lookup is internal to
// FieldLabel; diffTone live in src/lib/feasibility-v6/diffBadge.ts.

// ── NumberInput (mirrors v5 pattern, glass styling) ──────────────────
// `fullWidth` makes the input stretch to its container (used in sidepanel
// stacked-Row mode so unit suffixes like "AED/sqft" never truncate).
function NumberInput({
  value,
  onChange,
  unit,
  readonly,
  widthPx,
  fullWidth,
}: {
  value: number;
  onChange?: (n: number) => void;
  unit?: string;
  readonly?: boolean;
  widthPx?: number;
  fullWidth?: boolean;
}) {
  const [focused, setFocused] = useState(false);
  const [raw, setRaw] = useState<string>(fmtInputNumber(value));
  const lastExternal = useRef(value);
  useEffect(() => {
    if (!focused && lastExternal.current !== value) {
      setRaw(fmtInputNumber(value));
      lastExternal.current = value;
    }
  }, [value, focused]);

  return (
    <div
      style={{
        display: fullWidth ? 'flex' : 'inline-flex',
        alignItems: 'center',
        gap: 6,
        padding: '6px 10px',
        background: readonly ? 'transparent' : 'rgba(255,255,255,0.04)',
        border: readonly ? '1px solid transparent' : `1px solid ${LINE}`,
        borderRadius: 8,
        transition: 'border-color 150ms ease, background 150ms ease',
        width: fullWidth ? '100%' : undefined,
        minWidth: fullWidth ? undefined : (widthPx ?? 130),
      }}
    >
      <input
        type="text"
        inputMode="decimal"
        readOnly={readonly}
        value={focused ? raw : fmtInputNumber(value)}
        onFocus={(e) => {
          setFocused(true);
          setRaw(String(value));
          e.currentTarget.select();
        }}
        onBlur={() => {
          setFocused(false);
          onChange?.(parseNumberInput(raw));
        }}
        onChange={(e) => {
          const s = e.target.value;
          setRaw(s);
          if (onChange) onChange(parseNumberInput(s));
        }}
        style={{
          flex: 1,
          width: '100%',
          background: 'transparent',
          border: 'none',
          outline: 'none',
          color: readonly ? DIM : TXT,
          fontFamily: 'inherit',
          fontSize: 13,
          textAlign: 'right',
          padding: 0,
          fontVariantNumeric: 'tabular-nums',
        }}
      />
      {unit && (
        <span
          style={{
            color: SUBTLE,
            fontSize: 10,
            letterSpacing: 0.5,
            whiteSpace: 'nowrap',
          }}
        >
          {unit}
        </span>
      )}
    </div>
  );
}

// ── Row ──────────────────────────────────────────────────────────────
// `stacked` mode (sidepanel) places label on top and the input below it,
// preventing unit truncation in narrow ~350-px containers (founder fix #3).
// Inline mode (fullscreen) keeps label-left / input-right.
function Row({
  label,
  tooltipKey,
  badge,
  children,
  stacked,
}: {
  label: string;
  tooltipKey?: string;
  badge?: React.ReactNode;
  children: React.ReactNode;
  stacked?: boolean;
}) {
  if (stacked) {
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 4,
          padding: '8px 0',
          borderBottom: `1px solid ${LINE}`,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <FieldLabel label={label} tooltipKey={tooltipKey} />
          {badge}
        </div>
        <div>{children}</div>
      </div>
    );
  }
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 10,
        padding: '7px 0',
        borderBottom: `1px solid ${LINE}`,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1 }}>
        <FieldLabel label={label} tooltipKey={tooltipKey} />
        {badge}
      </div>
      <div style={{ flexShrink: 0 }}>{children}</div>
    </div>
  );
}

// ── ResultRow ────────────────────────────────────────────────────────
function ResultRow({
  label,
  value,
  hero,
  bold,
  gold,
}: {
  label: string;
  value: string;
  hero?: boolean;
  bold?: boolean;
  gold?: boolean;
}) {
  const size = hero ? 24 : bold ? 14 : 12;
  const weight = hero ? 800 : bold ? 700 : 400;
  const color = gold ? GOLD : TXT;
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'baseline',
        padding: '5px 0',
        gap: 10,
      }}
    >
      <span
        style={{
          color: DIM,
          fontSize: hero ? 11 : 11,
          letterSpacing: hero ? 0.5 : 0.2,
          textTransform: hero ? 'uppercase' : 'none',
        }}
      >
        {label}
      </span>
      <span
        style={{
          color,
          fontSize: size,
          fontWeight: weight,
          letterSpacing: hero ? '-0.02em' : 0,
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        {value}
      </span>
    </div>
  );
}

// ── Section heading ──────────────────────────────────────────────────
function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        color: GOLD,
        fontFamily: 'Georgia, serif',
        fontSize: 11,
        fontWeight: 700,
        textTransform: 'uppercase',
        letterSpacing: '0.08em',
        marginTop: 16,
        marginBottom: 6,
        paddingBottom: 4,
        borderBottom: `1px solid ${LINE_HARD}`,
      }}
    >
      {children}
    </div>
  );
}

// ── Engine selector disclosure ───────────────────────────────────────
// Hides the full selector behind one click — the current engine label
// stays visible so the user always knows what's driving defaults, but
// the dropdown only shows when explicitly opened. Saves ~80 px of header
// real estate above the panels (founder scroll-reduction 2026-06-08).
function EngineSelectorDisclosure({
  currentLabel,
  currentValidated,
  children,
}: {
  currentLabel: string;
  currentValidated: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ marginBottom: 8 }}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        style={{
          width: '100%',
          background: 'rgba(255,255,255,0.04)',
          border: `1px solid ${LINE}`,
          borderRadius: 8,
          padding: '8px 10px',
          color: TXT,
          fontFamily: 'inherit',
          fontSize: 11,
          cursor: 'pointer',
          textAlign: 'left',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 8,
        }}
      >
        <span>
          <span style={{ color: SUBTLE, fontSize: 9, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            Engine{' '}
          </span>
          <span style={{ color: GOLD, fontWeight: 700 }}>{currentLabel}</span>
          {!currentValidated && (
            <span style={{ color: SUBTLE, fontSize: 9, marginLeft: 6, fontStyle: 'italic' }}>
              research-default
            </span>
          )}
        </span>
        <span style={{ color: SUBTLE, fontSize: 11 }}>{open ? '▾ close' : '▸ change'}</span>
      </button>
      {open && (
        <div style={{ marginTop: 8 }}>
          {children}
        </div>
      )}
    </div>
  );
}

// ── Collapsible Panel (sidepanel-mode at-a-glance hierarchy) ─────────
// Founder fix #5: each panel header shows a primary metric inline so the
// broker sees BUA / Land Cost / Construction total / Revenue total without
// expanding. Default closed in sidepanel; default open in fullscreen.
function Panel({
  title,
  metric,
  defaultOpen,
  changed,
  children,
}: {
  title: string;
  metric?: string;
  defaultOpen?: boolean;
  // True when user has overridden a default value inside this panel — header
  // shows a small gold dot next to the chevron. Founder Sprint 1.6 spec.
  changed?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen ?? false);
  return (
    <div
      style={{
        background: 'rgba(0, 0, 0, 0.3)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        border: `1px solid ${LINE}`,
        borderRadius: 12,
        marginBottom: 10,
        overflow: 'hidden',
        transition: 'border-color 150ms ease',
      }}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 10,
          padding: '12px 14px',
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
          color: TXT,
          textAlign: 'left',
          fontFamily: 'inherit',
        }}
      >
        <span style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
          <span
            style={{
              color: GOLD,
              fontFamily: 'Georgia, serif',
              fontSize: 11,
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              whiteSpace: 'nowrap',
            }}
          >
            {title}
          </span>
          {metric && (
            <span
              style={{
                color: SUBTLE,
                fontSize: 11,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              · {metric}
            </span>
          )}
          {changed && (
            <span
              aria-label="modified"
              title="You have overridden defaults inside this panel"
              style={{
                width: 6,
                height: 6,
                borderRadius: '50%',
                background: GOLD,
                flexShrink: 0,
              }}
            />
          )}
        </span>
        <span style={{ color: SUBTLE, fontSize: 11, transition: 'transform 150ms ease', transform: open ? 'rotate(0deg)' : 'rotate(-90deg)' }}>
          ▾
        </span>
      </button>
      {open && (
        <div style={{ padding: '0 14px 14px 14px', borderTop: `1px solid ${LINE}` }}>
          {children}
        </div>
      )}
    </div>
  );
}

// ── Main calculator component ────────────────────────────────────────
export interface FeasibilityV6CalculatorProps {
  parcel: ParcelInput;
  // Optional banner override — preview route uses the RED warning, production
  // SidePanel + internal-test full-screen route omit it. Default = preview.
  banner?: 'preview' | 'none';
  // Layout density. 'sidepanel' (~350 px wide) is the canonical production
  // mode mounted inside /parcels/map SidePanel; 'fullscreen' is the wider
  // two-column layout for the internal-test route + preview. Default =
  // fullscreen for backward compat. Sidepanel mode (Sprint 1.6) renders
  // sticky verdict block + collapsible panels for at-a-glance readability.
  mode?: 'sidepanel' | 'fullscreen';
  // Restrict the engine dropdown to a subset of the 13-engine catalogue.
  // Production ships only founder-validated engines (Residential first,
  // expanding per sprint). Omit for full catalogue access (preview + internal-test).
  availableEngines?: EngineId[];
}

export default function FeasibilityV6Calculator({
  parcel,
  banner = 'preview',
  mode = 'fullscreen',
  availableEngines,
}: FeasibilityV6CalculatorProps) {
  // Clamp initial engine to the allowed list. If the auto-derived engine for
  // the parcel's land use isn't in availableEngines, fall back to the first
  // available one (so production never shows a dropdown value not in options).
  const initialEngine: EngineId = (() => {
    const auto = defaultEngineFor(parcel.landUse);
    if (!availableEngines || availableEngines.includes(auto)) return auto;
    return availableEngines[0] ?? 'residential';
  })();
  const [engineId, setEngineId] = useState<EngineId>(initialEngine);
  const engine = ENGINES[engineId];

  // Tab. (`fullscreen` viewport-overlay state was removed in Sprint 1.6 along
  // with FullscreenToggle — founder dropped Sprint 7 dedicated-route work in
  // favour of mounting v6 directly in SidePanel. Reintroduce if a future sprint
  // builds a true viewport-overlay mode.)
  const [tab, setTab] = useState<Tab>('bts');

  // ── Area
  const plotAreaSqft = parcel.plotAreaSqft;
  const far = parcel.far > 0 ? parcel.far : 2.5;
  const gfaAuto = plotAreaSqft * far;

  const [buaRatio, setBuaRatio] = useState<number>(1.85);
  const [buaManual, setBuaManual] = useState<number>(Math.round(gfaAuto * 1.85));
  const [efficiencyPct, setEfficiencyPct] = useState<number>(80);

  const seedRef = useRef<string>('');
  useEffect(() => {
    const k = `${parcel.id}|${far}`;
    if (seedRef.current !== k) {
      seedRef.current = k;
      setBuaManual(Math.round(gfaAuto * 1.85));
      setBuaRatio(1.85);
    }
  }, [parcel.id, far, gfaAuto]);

  // ── Land
  const [landCostAed, setLandCostAed] = useState<number>(parcel.plotPriceAed);
  useEffect(() => {
    setLandCostAed(parcel.plotPriceAed);
  }, [parcel.plotPriceAed]);
  // ── Unpriced-land guard ────────────────────────────────────────────────
  // A parcel with no currentValuation arrives with plotPriceAed = 0. Feeding
  // that to the model is not 'free land', it is 'we do not know', and the
  // difference matters: with land at 0 the engine happily reports a healthy
  // ROI/IRR on a plot whose price nobody has established (reported on 5310367
  // and 3456896, both showing ROI 4.3% / IRR 6.1%). That is a number a buyer
  // could act on, so the results are suppressed until a land cost exists.
  //
  // The user can clear it by typing a Land Cost — the input stays live. We do
  // NOT derive a price from area or GFA: CLAUDE.md makes currentValuation a
  // manual field and forbids the system computing it.
  const landPriceMissing = !parcel.landPriceKnown && !(landCostAed > 0);

  const [paymentMode, setPaymentMode] = useState<LandPaymentMode>('full');
  // Brokerage on land purchase — default 0% (most users transact direct
  // with the developer). Separate from sales-side commission.
  const [brokerageOnLandPct, setBrokerageOnLandPct] = useState(0);

  // Per-unit revenue model (hospitality / healthcare / educational /
  // datacenter). Founder 2026-06-09 — these engines' revenue isn't
  // psf-driven, so v5's SFA × salesPsf produces zero. We synthesise an
  // equivalent psf from the real per-unit model so the kernel stays
  // untouched. The default unit count is derived from BUA; the user
  // overrides everything via the Asset Model panel.
  const perUnitDef = PER_UNIT_DEFAULTS[engineId];
  const usesPerUnit = isPerUnitEngine(engineId);
  const [unitCount, setUnitCount] = useState<number>(autoUnitCount(plotAreaSqft * far * 1.85, engineId));
  const [perUnitRev, setPerUnitRev] = useState<number>(
    perUnitDef?.perUnitAnnualRevenueAed ?? perUnitDef?.adrAed ?? 0,
  );
  const [exitCapPct, setExitCapPct] = useState<number>(perUnitDef?.exitCapRatePct ?? 7.5);

  // Re-seed per-unit inputs when the engine changes (preserves user
  // overrides by snapshotting the engine id we last seeded for).
  const lastPerUnitEngineRef = useRef<EngineId>(engineId);
  useEffect(() => {
    if (lastPerUnitEngineRef.current !== engineId) {
      lastPerUnitEngineRef.current = engineId;
      const def = PER_UNIT_DEFAULTS[engineId];
      if (def) {
        setUnitCount(autoUnitCount(plotAreaSqft * far * 1.85, engineId));
        setPerUnitRev(def.perUnitAnnualRevenueAed ?? def.adrAed ?? 0);
        setExitCapPct(def.exitCapRatePct);
      }
    }
  }, [engineId, plotAreaSqft, far]);

  // Mixed-use breakdown — seeded from parcel.landUseMix when multi-use.
  const initialMixShares = useMemo(
    () => landUseMixToShares(parcel.landUseMix),
    [parcel.landUseMix],
  );
  const [mixShares, setMixShares] = useState<MixedUseShare[] | null>(initialMixShares);
  const lastParcelMixRef = useRef(parcel.id);
  useEffect(() => {
    if (lastParcelMixRef.current !== parcel.id) {
      lastParcelMixRef.current = parcel.id;
      setMixShares(landUseMixToShares(parcel.landUseMix));
    }
  }, [parcel.id, parcel.landUseMix]);
  const [downPaymentPct, setDownPaymentPct] = useState(30);
  const [numberOfPayments, setNumberOfPayments] = useState(8);
  const [periodMonths, setPeriodMonths] = useState(24);

  // ── Construction (engine-seeded)
  const [constructionPsf, setConstructionPsf] = useState<number>(engine.constructionPsfBua);
  const [brandPsf, setBrandPsf] = useState<number>(engine.brandPsfBua);
  const [consultancyPsf, setConsultancyPsf] = useState<number>(engine.consultancyPsfBua);
  const [infrastructurePsf, setInfrastructurePsf] = useState<number>(engine.infrastructurePsfBua);
  const [contingencyPct, setContingencyPct] = useState<number>(engine.contingencyPct);

  // Re-seed construction whenever engine changes
  const lastEngineRef = useRef<EngineId>(engineId);
  useEffect(() => {
    if (lastEngineRef.current !== engineId) {
      lastEngineRef.current = engineId;
      setConstructionPsf(engine.constructionPsfBua);
      setBrandPsf(engine.brandPsfBua);
      setConsultancyPsf(engine.consultancyPsfBua);
      setInfrastructurePsf(engine.infrastructurePsfBua);
      setContingencyPct(engine.contingencyPct);
      setSalesPsf(engine.salesPsfSfa);
      setMonthlyRentPsf(engine.monthlyRentPsfSfa);
      setOccupancyPct(engine.occupancyPct);
      setOperatingPct(engine.operatingPct);
    }
  }, [engineId, engine]);

  // ── Finance
  const [financeEnabled, setFinanceEnabled] = useState(false);
  const [loanAed, setLoanAed] = useState<number>(0);
  const [ratePct, setRatePct] = useState<number>(0);
  const [financePeriodMonths, setFinancePeriodMonths] = useState<number>(36);

  // ── Escrow (Sprint 9c) — RERA Law 8/2007 mandatory trust account.
  // Auto-on when engine is the off-plan modifier (founder Q4=A default).
  // Off otherwise — user opts in for non-off-plan projects.
  const [escrowEnabled, setEscrowEnabled] = useState<boolean>(engineId === 'offplan');
  const [salesAtLaunchPct, setSalesAtLaunchPct] = useState<number>(15);  // founder N6 default
  const [salesAtHandoverPct, setSalesAtHandoverPct] = useState<number>(80);
  const [constructionMonths, setConstructionMonths] = useState<number>(18);

  // When engine flips to/from offplan, auto-enable / disable escrow once.
  const lastEngineForEscrowRef = useRef<EngineId>(engineId);
  useEffect(() => {
    if (lastEngineForEscrowRef.current !== engineId) {
      lastEngineForEscrowRef.current = engineId;
      setEscrowEnabled(engineId === 'offplan');
    }
  }, [engineId]);

  // ── BtS revenue (engine-seeded)
  const [salesPsf, setSalesPsf] = useState<number>(engine.salesPsfSfa);
  const [commissionPct, setCommissionPct] = useState<number>(8.5);
  const [marketingPct, setMarketingPct] = useState<number>(2.0);
  const [devServicesPct, setDevServicesPct] = useState<number>(0);

  // ── BtR rental (engine-seeded)
  const [monthlyRentPsf, setMonthlyRentPsf] = useState<number>(engine.monthlyRentPsfSfa);
  const [occupancyPct, setOccupancyPct] = useState<number>(engine.occupancyPct);
  const [annualIncreasePct, setAnnualIncreasePct] = useState<number>(3);
  const [operatingPct, setOperatingPct] = useState<number>(engine.operatingPct);

  // ── JV
  const [jvType, setJvType] = useState<JvType>('equity');
  const [landownerLandContribution, setLandownerLandContribution] = useState<number>(parcel.plotPriceAed);
  const [landownerCash, setLandownerCash] = useState<number>(0);
  const [landownerSharePct, setLandownerSharePct] = useState<number>(30);
  useEffect(() => {
    setLandownerLandContribution(parcel.plotPriceAed);
  }, [parcel.plotPriceAed]);

  // ── Debounced
  const dBuaManual = useDebounced(buaManual);
  const dEff = useDebounced(efficiencyPct);
  const dLand = useDebounced(landCostAed);
  const dDown = useDebounced(downPaymentPct);
  const dN = useDebounced(numberOfPayments);
  const dPeriod = useDebounced(periodMonths);
  const dBrokerage = useDebounced(brokerageOnLandPct);
  const dConst = useDebounced(constructionPsf);
  const dBrand = useDebounced(brandPsf);
  const dConsult = useDebounced(consultancyPsf);
  const dInfra = useDebounced(infrastructurePsf);
  const dCont = useDebounced(contingencyPct);
  const dLoan = useDebounced(loanAed);
  const dRate = useDebounced(ratePct);
  const dFinPeriod = useDebounced(financePeriodMonths);
  const dSales = useDebounced(salesPsf);
  const dComm = useDebounced(commissionPct);
  const dMkt = useDebounced(marketingPct);
  const dDev = useDebounced(devServicesPct);
  const dRent = useDebounced(monthlyRentPsf);
  const dOcc = useDebounced(occupancyPct);
  const dAnn = useDebounced(annualIncreasePct);
  const dOp = useDebounced(operatingPct);
  const dLoCont = useDebounced(landownerLandContribution);
  const dLoCash = useDebounced(landownerCash);
  const dLoShare = useDebounced(landownerSharePct);

  // ── Derived
  const area = useMemo(
    () =>
      deriveArea({
        plotAreaSqft,
        far,
        bua: dBuaManual,
        efficiencyPct: dEff,
      }),
    [plotAreaSqft, far, dBuaManual, dEff],
  );

  const land = useMemo(
    () =>
      deriveLand(
        {
          landCostAed: dLand,
          dldPct: 4,
          paymentMode,
          downPaymentPct: dDown,
          numberOfPayments: dN,
          periodMonths: dPeriod,
        },
        area.gfa,
      ),
    [dLand, paymentMode, dDown, dN, dPeriod, area.gfa],
  );

  const construction = useMemo(
    () =>
      deriveConstruction(
        {
          constructionPsfBua: dConst,
          brandPsfBua: dBrand,
          consultancyPsfBua: dConsult,
          infrastructurePsfBua: dInfra,
          contingencyPct: dCont,
        },
        area.bua,
      ),
    [dConst, dBrand, dConsult, dInfra, dCont, area.bua],
  );

  const finance = useMemo(
    () =>
      deriveFinance({
        enabled: financeEnabled,
        loanAed: dLoan,
        ratePct: dRate,
        periodMonths: dFinPeriod,
      }),
    [financeEnabled, dLoan, dRate, dFinPeriod],
  );

  // Per-unit BtS revenue synth — for hospitality/healthcare/etc. the
  // v5 kernel needs a psf; we back-derive it from the real per-unit
  // model. Result also exposed to the UI for transparency.
  const perUnitBtSResult = useMemo(() => {
    if (!usesPerUnit || !perUnitDef) return null;
    return synthesiseBtSPsf({
      engineId,
      unitCount,
      perUnitAnnualRevenueAed: perUnitRev,
      occupancyPct,
      operatingPct,
      exitCapRatePct: exitCapPct,
      sfaSqft: area.sfa,
    });
  }, [usesPerUnit, perUnitDef, engineId, unitCount, perUnitRev, occupancyPct, operatingPct, exitCapPct, area.sfa]);

  const effectiveSalesPsf = perUnitBtSResult
    ? perUnitBtSResult.equivalentSalesPsfSfa
    : dSales;

  const btsRevenue = useMemo(
    () =>
      deriveBtSRevenue(
        {
          salesPricePsfSfa: effectiveSalesPsf,
          commissionPct: dComm,
          marketingPct: dMkt,
          devServicesPct: dDev,
        },
        area.sfa,
      ),
    [effectiveSalesPsf, dComm, dMkt, dDev, area.sfa],
  );

  const btsResult = useMemo(
    () =>
      computeBtSV6(area, land, construction, finance, btsRevenue, paymentMode, {
        loanAed: financeEnabled ? dLoan : 0,
        ratePct: financeEnabled ? dRate : 0,
        financePeriodMonths: financeEnabled ? dFinPeriod : 0,
        constructionMonths,
        brokerageOnLandPct: dBrokerage,
        escrow: {
          enabled: escrowEnabled,
          salesAtLaunchPct,
          salesAtHandoverPct,
        },
      }),
    [
      area,
      land,
      construction,
      finance,
      btsRevenue,
      paymentMode,
      financeEnabled,
      dLoan,
      dRate,
      dFinPeriod,
      constructionMonths,
      escrowEnabled,
      salesAtLaunchPct,
      salesAtHandoverPct,
    ],
  );

  // Per-unit BtR rent synth — same idea as the BtS path but for rent.
  // Hospitality is BtS-only so doesn't apply here; healthcare /
  // educational / datacenter need the synth for meaningful BtR.
  const perUnitBtRResult = useMemo(() => {
    if (!usesPerUnit || !perUnitDef || engineId === 'hospitality') return null;
    return synthesiseBtRRentPsf({
      unitCount,
      perUnitAnnualRevenueAed: perUnitRev,
      sfaSqft: area.sfa,
    });
  }, [usesPerUnit, perUnitDef, engineId, unitCount, perUnitRev, area.sfa]);

  const effectiveMonthlyRent = perUnitBtRResult
    ? perUnitBtRResult.equivalentMonthlyRentPsfSfa
    : dRent;

  const btrRental = useMemo(
    () =>
      deriveBtRRental(
        {
          monthlyRentPsfSfa: effectiveMonthlyRent,
          occupancyPct: dOcc,
          annualIncreasePct: dAnn,
          operatingPct: dOp,
        },
        area.sfa,
      ),
    [effectiveMonthlyRent, dOcc, dAnn, dOp, area.sfa],
  );

  const btrResult = useMemo(
    () =>
      computeBtRV6(land, construction, finance, btrRental, dAnn, {
        loanAed: financeEnabled ? dLoan : 0,
        ratePct: financeEnabled ? dRate : 0,
        constructionMonths,
        brokerageOnLandPct: dBrokerage,
      }),
    [land, construction, finance, btrRental, dAnn, financeEnabled, dLoan, dRate, constructionMonths, dBrokerage],
  );

  const developerCashAuto =
    construction.totalConstructionAed + finance.totalInterestAed + land.dldFeeAed;

  const jv = useMemo(
    () =>
      computeJvV6(
        {
          jvType,
          landownerLandContributionAed: dLoCont,
          landownerCashAed: dLoCash,
          developerCashAed: developerCashAuto,
          landownerSharePct: dLoShare,
        },
        land,
        construction,
        finance,
        btsRevenue,
        {
          constructionMonths,
          loanAed: financeEnabled ? dLoan : 0,
          ratePct: financeEnabled ? dRate : 0,
          brokerageOnLandPct: dBrokerage,
        },
      ),
    [
      jvType, dLoCont, dLoCash, developerCashAuto, dLoShare,
      land, construction, finance, btsRevenue,
      constructionMonths, financeEnabled, dLoan, dRate, dBrokerage,
    ],
  );

  // Mixed-use composite — STRICTLY only when the plot's category is
  // MIXED USE (more than one distinct land-use category in the DDA
  // affection plan). Single-use plots with multiple sub-classifications
  // of the same category (e.g. RESIDENTIAL · Permanent Apt +
  // RESIDENTIAL · Townhouse) do NOT show this panel. Founder 2026-06-08.
  const showMixedUse =
    parcel.landUse === 'MIXED USE' &&
    !!mixShares &&
    mixShares.length > 1 &&
    tab === 'bts';
  const mixedResult = useMemo(() => {
    if (!showMixedUse || !mixShares) return null;
    return computeMixedUseBtSV6({
      parentArea: area,
      shares: mixShares,
      commissionPct: dComm,
      marketingPct: dMkt,
      devServicesPct: dDev,
    });
  }, [showMixedUse, mixShares, area, dComm, dMkt, dDev]);
  const mixShareSum = mixShares ? mixShares.reduce((s, x) => s + x.pct, 0) : 0;
  const mixShareValid = !mixShares || Math.abs(mixShareSum - 100) < 0.5;

  // Founder-ratified 2026-06-08: IRR is the PRIMARY verdict band
  // (developer language); v5 ROI/yield bands stay as the secondary read.
  const btsV = btsIrrVerdict(btsResult.irrPct);
  const btsRoiV = btsVerdict(btsResult.roiPct);
  const btrV = btrIrrVerdict(btrResult.irrPct);
  const btrYieldV = btrVerdict(btrResult.yieldPct);
  const jvIrrV = jvProjectIrrVerdict(jv.projectIrrPct);

  // ── PDF export — Sprint 9d branded layout
  // Six-page A4 portrait: Cover · Inputs · Results breakdown · Glossary ·
  // Optimization recommendations · Disclaimer + sources. Per founder
  // Sprint 1.6 directive: PDF must stand alone — buyer reads it cover to
  // cover and understands both the verdict AND how to argue it down.
  const downloadPDF = useCallback(() => {
    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    const W = 210;
    const H = 297;
    const M = 15;
    const gold: [number, number, number] = [200, 169, 110];     // brand
    const goldDark: [number, number, number] = [148, 119, 71];  // headings on white
    const dark: [number, number, number] = [26, 26, 46];        // body text
    const gray: [number, number, number] = [107, 114, 128];     // secondary
    const cream: [number, number, number] = [251, 248, 240];    // alt row tint
    const green: [number, number, number] = [45, 106, 79];      // diff green
    const amber: [number, number, number] = [230, 126, 34];     // diff amber
    const red: [number, number, number] = [230, 57, 70];        // diff red

    let y = 0;
    let pageNum = 0;
    const dateStr = new Date().toISOString().slice(0, 10);

    // Branded header band — gold #C8A96E 4mm at top of every page.
    const headerBand = () => {
      doc.setFillColor(...gold);
      doc.rect(0, 0, W, 4, 'F');
    };

    const newPage = () => {
      if (pageNum > 0) doc.addPage();
      pageNum += 1;
      headerBand();
      y = 14;
    };

    // Section gap — small vertical margin between sections on the same
    // page (founder 2026-06-08 PDF compaction: don't force newPage
    // between sections, let content flow). The next sectionTitle calls
    // checkPage so if there's no room left, we break naturally.
    const sectionGap = () => {
      y += 8;
    };

    // Heading helpers — `times` is jsPDF's built-in serif (Georgia substitute).
    const sectionTitle = (t: string) => {
      doc.setFontSize(10);
      doc.setTextColor(...goldDark);
      doc.setFont('times', 'bold');
      // Add letter-spacing-ish via uppercase
      doc.text(t.toUpperCase(), M, y);
      // Underline rule
      doc.setDrawColor(...gold);
      doc.setLineWidth(0.3);
      doc.line(M, y + 1.5, W - M, y + 1.5);
      y += 7;
    };

    const subhead = (t: string) => {
      doc.setFontSize(9);
      doc.setTextColor(...goldDark);
      doc.setFont('times', 'bold');
      doc.text(t, M, y);
      y += 5;
    };

    const body = (t: string, opts?: { color?: [number, number, number]; size?: number; bold?: boolean; align?: 'left' | 'right' | 'center'; x?: number }) => {
      doc.setFontSize(opts?.size ?? 9);
      doc.setTextColor(...(opts?.color ?? dark));
      doc.setFont('helvetica', opts?.bold ? 'bold' : 'normal');
      doc.text(t, opts?.x ?? M, y, { align: opts?.align ?? 'left' });
    };

    // Two-column row with optional alternating tint and bold totals.
    const tableRow = (
      label: string,
      value: string,
      opts?: { tint?: boolean; bold?: boolean; valueColor?: [number, number, number] },
    ) => {
      if (opts?.tint) {
        doc.setFillColor(...cream);
        doc.rect(M - 1, y - 4, W - 2 * M + 2, 6, 'F');
      }
      doc.setFontSize(9);
      doc.setFont('helvetica', opts?.bold ? 'bold' : 'normal');
      doc.setTextColor(...gray);
      doc.text(label, M, y);
      doc.setTextColor(...(opts?.valueColor ?? dark));
      doc.text(value, W - M, y, { align: 'right' });
      y += 6;
    };

    // Three-column row for inputs table: label, user value, default + Δ%.
    const inputRow = (
      label: string,
      userVal: string,
      defaultVal: string,
      deltaPct: number | null,
      tint: boolean,
    ) => {
      if (tint) {
        doc.setFillColor(...cream);
        doc.rect(M - 1, y - 4, W - 2 * M + 2, 6, 'F');
      }
      doc.setFontSize(8.5);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...gray);
      doc.text(label, M, y);
      doc.setTextColor(...dark);
      doc.text(userVal, W / 2 + 8, y, { align: 'right' });
      doc.setTextColor(...gray);
      doc.text(defaultVal, W - M - 22, y, { align: 'right' });
      if (deltaPct !== null && Number.isFinite(deltaPct)) {
        const abs = Math.abs(deltaPct);
        const tone = abs <= 15 ? green : abs <= 30 ? amber : red;
        doc.setTextColor(...tone);
        doc.setFont('helvetica', 'bold');
        const sign = deltaPct > 0 ? '+' : '';
        doc.text(`${sign}${deltaPct.toFixed(0)}%`, W - M, y, { align: 'right' });
      }
      y += 6;
    };

    const checkPage = (need: number) => {
      if (y + need > H - 14) newPage();
    };

    // Pull mode-specific headline metrics. verdictColor is a hex string for
    // consistency with btsVerdict / btrVerdict (which return string colors).
    const goldHex = '#C8A96E';
    const modeHero: { label: string; value: string; positive: boolean; verdictColor: string; verdictLabel: string } =
      tab === 'bts'
        ? { label: 'NET PROFIT', value: fmtAedExact(btsResult.netProfitAed), positive: btsResult.netProfitAed >= 0, verdictColor: btsV.color, verdictLabel: btsV.label }
        : tab === 'btr'
          ? { label: 'YIELD', value: fmtPct(btrResult.yieldPct), positive: btrResult.yieldPct >= 5, verdictColor: btrV.color, verdictLabel: btrV.label }
          : { label: 'PROJECT ROI', value: fmtPct(jv.projectRoiPct), positive: jv.projectRoiPct >= 0, verdictColor: goldHex, verdictLabel: 'JOINT VENTURE' };

    // ═══ PAGE 1 — COVER ═══════════════════════════════════════════════
    newPage();
    y = 22;

    // ZAAHI logotype
    doc.setFontSize(28);
    doc.setTextColor(...goldDark);
    doc.setFont('times', 'bold');
    doc.text('ZAAHI', M, y);

    doc.setFontSize(8);
    doc.setTextColor(...gray);
    doc.setFont('helvetica', 'normal');
    doc.text('FEASIBILITY  ·  v6.0', M, y + 5);
    y += 14;

    // Gold rule
    doc.setDrawColor(...gold);
    doc.setLineWidth(0.5);
    doc.line(M, y, W - M, y);
    y += 6;

    // Parcel + engine summary
    doc.setFontSize(13);
    doc.setTextColor(...dark);
    doc.setFont('times', 'bold');
    doc.text(`Plot ${parcel.plotNumber}`, M, y);
    y += 5;
    doc.setFontSize(9);
    doc.setTextColor(...gray);
    doc.setFont('helvetica', 'normal');
    doc.text(
      `${parcel.district}${parcel.community ? ' · ' + parcel.community : ''}${parcel.projectName ? ' · ' + parcel.projectName : ''}`,
      M,
      y,
    );
    y += 4;
    doc.text(
      `${parcel.landUse} · ${fmtInt(parcel.plotAreaSqft)} sqft · FAR ${parcel.far.toFixed(2)} · Listed ${fmtAedExact(parcel.plotPriceAed)}`,
      M,
      y,
    );
    y += 4;
    doc.setFontSize(8);
    doc.text(
      `Engine: ${engine.label} (${engine.validated ? 'Validated' : 'Research defaults'}) · Mode: ${tab === 'bts' ? 'Build to Sell' : tab === 'btr' ? 'Build to Rent' : 'Joint Venture'}${tab === 'bts' && btsResult.escrow?.enabled ? ' · Escrow ON' : ''}`,
      M,
      y,
    );
    y += 16;

    // Verdict block — large hero number.
    // 36pt ascender = ~12.7 mm above baseline; bump y advance high enough
    // so the hero number's top doesn't crash into the label above.
    doc.setFontSize(8);
    doc.setTextColor(...gray);
    doc.setFont('helvetica', 'normal');
    doc.text(modeHero.label, M, y);
    y += 16;
    doc.setFontSize(36);
    doc.setTextColor(...(modeHero.positive ? goldDark : red));
    doc.setFont('times', 'bold');
    doc.text(modeHero.value, M, y);
    y += 14;

    // Secondary metrics line
    if (tab === 'bts') {
      doc.setFontSize(10);
      doc.setTextColor(...dark);
      doc.setFont('helvetica', 'normal');
      doc.text(
        `ROI ${fmtPct(btsResult.roiPct)}   ·   IRR ${Number.isFinite(btsResult.irrPct) ? fmtPct(btsResult.irrPct) : '—'}   ·   ROE ${btsResult.peakEquityAed > 0 ? fmtPct(btsResult.roePct) : '—'}   ·   Profit/sqft ${fmtAedExact(btsResult.profitPerSqftSfa)}`,
        M,
        y,
      );
    } else if (tab === 'btr') {
      doc.setFontSize(10);
      doc.setTextColor(...dark);
      doc.setFont('helvetica', 'normal');
      doc.text(
        `Payback ${btrResult.paybackYears.toFixed(1)} yr   ·   IRR ${Number.isFinite(btrResult.irrPct) ? fmtPct(btrResult.irrPct) : '—'}   ·   ROE ${btrResult.peakEquityAed > 0 ? fmtPct(btrResult.roePct) : '—'}   ·   Total 5Y ${fmtAedExact(btrResult.total5yAed)}`,
        M,
        y,
      );
    } else {
      doc.setFontSize(10);
      doc.setTextColor(...dark);
      doc.setFont('helvetica', 'normal');
      doc.text(
        `Project IRR ${Number.isFinite(jv.projectIrrPct) ? fmtPct(jv.projectIrrPct) : '—'}   ·   LO Profit ${fmtAedExact(jv.landownerProfitAed)}   ·   Dev Profit ${fmtAedExact(jv.developerProfitAed)}`,
        M,
        y,
      );
    }
    y += 14;

    // Verdict band — verdictColor is hex string; jsPDF accepts string form.
    doc.setDrawColor(modeHero.verdictColor);
    doc.setFillColor(...cream);
    doc.setLineWidth(0.4);
    doc.rect(M, y, W - 2 * M, 10, 'FD');
    doc.setFontSize(9);
    doc.setTextColor(modeHero.verdictColor);
    doc.setFont('helvetica', 'bold');
    doc.text(`VERDICT  ·  ${modeHero.verdictLabel.toUpperCase()}`, W / 2, y + 6.5, { align: 'center' });
    y += 18;

    // Cover footer note
    doc.setFontSize(8);
    doc.setTextColor(...gray);
    doc.setFont('helvetica', 'italic');
    doc.text(
      'Feasibility estimate. Not a formal valuation. See page 6 for full disclaimer + sources.',
      M,
      H - 16,
    );

    // ═══ PAGE 2 — INPUTS TABLE ════════════════════════════════════════
    newPage();
    sectionTitle('Inputs');

    doc.setFontSize(8);
    doc.setTextColor(...gray);
    doc.setFont('helvetica', 'italic');
    // ASCII only — jsPDF default Helvetica/Times use WinANSI and would
    // substitute Δ / ≤ / ≥ with garbage glyphs. UI keeps Unicode; the
    // PDF rewrites to plain English.
    const inputsIntro = doc.splitTextToSize(
      'Side-by-side: your inputs vs the engine baseline. Diff % colour-coded green up to 15%, amber 15-30%, red 30% or more.',
      W - 2 * M,
    );
    doc.text(inputsIntro, M, y);
    y += inputsIntro.length * 4 + 2;

    // Column headers
    doc.setFontSize(8);
    doc.setTextColor(...goldDark);
    doc.setFont('helvetica', 'bold');
    doc.text('FIELD', M, y);
    doc.text('YOUR VALUE', W / 2 + 8, y, { align: 'right' });
    doc.text('BASELINE', W - M - 22, y, { align: 'right' });
    doc.text('Diff %', W - M, y, { align: 'right' });
    y += 5;
    doc.setDrawColor(...gold);
    doc.line(M, y - 2, W - M, y - 2);

    // Helper to compute delta percentage
    const dPct = (cur: number, base: number) => (base === 0 ? null : ((cur - base) / base) * 100);

    let tint = false;
    inputRow('Plot Area', `${fmtInt(plotAreaSqft)} sqft`, '—', null, tint); tint = !tint;
    inputRow('FAR', far.toFixed(2), '—', null, tint); tint = !tint;
    inputRow('GFA', `${fmtInt(area.gfa)} sqft`, '—', null, tint); tint = !tint;
    inputRow('BUA', `${fmtInt(area.bua)} sqft`, `${fmtInt(area.gfa * 1.85)} sqft`, dPct(area.bua, area.gfa * 1.85), tint); tint = !tint;
    inputRow('Efficiency', `${efficiencyPct.toFixed(1)}%`, '80%', dPct(efficiencyPct, 80), tint); tint = !tint;
    inputRow('SFA', `${fmtInt(area.sfa)} sqft`, '—', null, tint); tint = !tint;
    inputRow('Land Cost', fmtAedExact(land.landCostAed), fmtAedExact(parcel.plotPriceAed), dPct(land.landCostAed, parcel.plotPriceAed), tint); tint = !tint;
    inputRow('DLD Fee (4%)', fmtAedExact(land.dldFeeAed), '—', null, tint); tint = !tint;
    if (brokerageOnLandPct > 0) {
      inputRow('Brokerage on land', `${brokerageOnLandPct}%`, '0%', null, tint); tint = !tint;
      inputRow('Brokerage fee', fmtAedExact(btsResult.brokerageOnLandAed), '—', null, tint); tint = !tint;
    }
    inputRow('Construction psf', `AED ${constructionPsf}`, `AED ${engine.constructionPsfBua}`, dPct(constructionPsf, engine.constructionPsfBua), tint); tint = !tint;
    inputRow('Brand psf', `AED ${brandPsf}`, `AED ${engine.brandPsfBua}`, dPct(brandPsf, engine.brandPsfBua), tint); tint = !tint;
    inputRow('Consultancy psf', `AED ${consultancyPsf}`, `AED ${engine.consultancyPsfBua}`, dPct(consultancyPsf, engine.consultancyPsfBua), tint); tint = !tint;
    inputRow('Infrastructure psf', `AED ${infrastructurePsf}`, `AED ${engine.infrastructurePsfBua}`, dPct(infrastructurePsf, engine.infrastructurePsfBua), tint); tint = !tint;
    inputRow('Contingency', `${contingencyPct}%`, `${engine.contingencyPct}%`, dPct(contingencyPct, engine.contingencyPct), tint); tint = !tint;
    if (tab === 'bts') {
      inputRow('Sales psf SFA', `AED ${salesPsf}`, `AED ${engine.salesPsfSfa}`, dPct(salesPsf, engine.salesPsfSfa), tint); tint = !tint;
      inputRow('Commission', `${commissionPct}%`, '8.5%', dPct(commissionPct, 8.5), tint); tint = !tint;
      inputRow('Marketing', `${marketingPct}%`, '2%', dPct(marketingPct, 2), tint); tint = !tint;
      inputRow('Dev Services', `${devServicesPct}%`, '0%', null, tint); tint = !tint;
      if (escrowEnabled && btsResult.escrow) {
        y += 2;
        subhead('Escrow drawdown (RERA Law 8/2007)');
        inputRow('Construction (months)', `${constructionMonths}`, '18', dPct(constructionMonths, 18), tint); tint = !tint;
        inputRow('Sales at launch', `${salesAtLaunchPct}%`, '15%', dPct(salesAtLaunchPct, 15), tint); tint = !tint;
        inputRow('Sales at handover', `${salesAtHandoverPct}%`, '80%', dPct(salesAtHandoverPct, 80), tint); tint = !tint;
        inputRow('Total drawn from escrow', fmtAedExact(btsResult.escrow.totalDrawnFromEscrow), '—', null, tint); tint = !tint;
        inputRow('Retention released (1y post-handover)', fmtAedExact(btsResult.escrow.totalRetentionReleased), '—', null, tint); tint = !tint;
      }
    } else if (tab === 'btr') {
      inputRow('Monthly Rent psf', `AED ${monthlyRentPsf}`, `AED ${engine.monthlyRentPsfSfa}`, dPct(monthlyRentPsf, engine.monthlyRentPsfSfa), tint); tint = !tint;
      inputRow('Occupancy', `${occupancyPct}%`, `${engine.occupancyPct}%`, dPct(occupancyPct, engine.occupancyPct), tint); tint = !tint;
      inputRow('Annual Increase', `${annualIncreasePct}%`, '3%', dPct(annualIncreasePct, 3), tint); tint = !tint;
      inputRow('Operating', `${operatingPct}%`, `${engine.operatingPct}%`, dPct(operatingPct, engine.operatingPct), tint); tint = !tint;
    } else {
      inputRow('JV Type', jvType === 'equity' ? 'Equity' : 'Profit Sharing', '—', null, tint); tint = !tint;
      inputRow('Land Contribution', fmtAedExact(landownerLandContribution), fmtAedExact(parcel.plotPriceAed), dPct(landownerLandContribution, parcel.plotPriceAed), tint); tint = !tint;
      inputRow('Cash Contribution', fmtAedExact(landownerCash), '—', null, tint); tint = !tint;
      inputRow('Landowner Share', `${landownerSharePct}%`, '—', null, tint); tint = !tint;
    }
    if (financeEnabled) {
      y += 2;
      subhead('Finance');
      inputRow('Loan', fmtAedExact(loanAed), '—', null, tint); tint = !tint;
      inputRow('Rate', `${ratePct}%`, '—', null, tint); tint = !tint;
      inputRow('Period', `${financePeriodMonths}mo`, '—', null, tint); tint = !tint;
    }

    // ═══ PAGE 3 — RESULTS BREAKDOWN ════════════════════════════════════
    newPage();
    sectionTitle('Results — step by step');

    if (tab === 'bts') {
      doc.setFontSize(9);
      doc.setTextColor(...dark);
      doc.setFont('helvetica', 'normal');

      tableRow('Plot Area', `${fmtInt(plotAreaSqft)} sqft`);
      tableRow('× FAR', far.toFixed(2), { tint: true });
      tableRow('= GFA', `${fmtInt(area.gfa)} sqft`, { bold: true });
      y += 2;
      tableRow('× BUA / GFA ratio', area.buaGfaRatio.toFixed(2));
      tableRow('= BUA', `${fmtInt(area.bua)} sqft`, { tint: true, bold: true });
      y += 2;
      tableRow('× Efficiency', `${efficiencyPct.toFixed(1)}%`);
      tableRow('= SFA (saleable)', `${fmtInt(area.sfa)} sqft`, { tint: true, bold: true });
      y += 4;

      subhead('Investment');
      tint = false;
      tableRow('Land cost', fmtAedExact(land.landCostAed), { tint }); tint = !tint;
      tableRow('+ DLD fee (4%)', fmtAedExact(land.dldFeeAed), { tint }); tint = !tint;
      if (btsResult.brokerageOnLandAed > 0) {
        tableRow(`+ Brokerage on land (${brokerageOnLandPct}%)`, fmtAedExact(btsResult.brokerageOnLandAed), { tint }); tint = !tint;
      }
      tableRow('+ Construction (incl. contingency)', fmtAedExact(construction.totalConstructionAed), { tint }); tint = !tint;
      if (financeEnabled) { tableRow('+ Finance interest', fmtAedExact(finance.totalInterestAed), { tint }); tint = !tint; }
      tableRow('= Total Investment', fmtAedExact(btsResult.totalInvestmentAed), { tint, bold: true }); tint = !tint;
      y += 4;

      subhead('Revenue');
      tableRow('SFA × Sales psf', `${fmtInt(area.sfa)} × AED ${fmtInt(salesPsf)}`, { tint }); tint = !tint;
      tableRow('= Gross Revenue', fmtAedExact(btsRevenue.grossRevenueAed), { tint, bold: true }); tint = !tint;
      tableRow(`- Commission (${commissionPct}%)`, `-${fmtAedExact(btsRevenue.commissionAed)}`, { tint }); tint = !tint;
      tableRow(`- Marketing (${marketingPct}%)`, `-${fmtAedExact(btsRevenue.marketingAed)}`, { tint }); tint = !tint;
      tableRow(`- Dev Services (${devServicesPct}%)`, `-${fmtAedExact(btsRevenue.devServicesAed)}`, { tint }); tint = !tint;
      tableRow('= Net Revenue', fmtAedExact(btsResult.netRevenueAed), { tint, bold: true }); tint = !tint;
      y += 4;

      subhead('Returns');
      tableRow('Net Revenue - Total Investment', '');
      tableRow('= Net Profit', fmtAedExact(btsResult.netProfitAed), { tint: true, bold: true, valueColor: btsResult.netProfitAed >= 0 ? goldDark : red });
      tableRow('Net Profit / Total Investment × 100', '');
      tableRow('= ROI', fmtPct(btsResult.roiPct), { tint: true, bold: true, valueColor: goldDark });
      y += 2;
      checkPage(20);
      tableRow('Peak equity (max cumulative outflow)', fmtAedExact(btsResult.peakEquityAed));
      tableRow('Net Profit / Peak Equity × 100', '', { tint: true });
      tableRow('= ROE', btsResult.peakEquityAed > 0 ? fmtPct(btsResult.roePct) : '—', { bold: true, valueColor: goldDark });
      tableRow(`IRR (annualised, ${btsResult.constructionMonths}mo build)`, Number.isFinite(btsResult.irrPct) ? fmtPct(btsResult.irrPct) : '—', { tint: true, bold: true, valueColor: goldDark });
      tableRow('NPV @ 10% discount rate', fmtAedExact(btsResult.npvAed));
    } else if (tab === 'btr') {
      doc.setFontSize(9);
      doc.setTextColor(...dark);
      doc.setFont('helvetica', 'normal');
      tableRow('Total Investment', fmtAedExact(btrResult.totalInvestmentAed), { bold: true });
      y += 2;
      subhead('Annual rental');
      tableRow('Monthly rent psf', `AED ${fmtInt(monthlyRentPsf)}`);
      tableRow('× Occupancy', `${occupancyPct}%`, { tint: true });
      tableRow('= Effective monthly rent', fmtAedExact(btrRental.effectiveMonthlyAed), { bold: true });
      tableRow('× 12', '', { tint: true });
      tableRow('= Gross Annual', fmtAedExact(btrRental.grossAnnualAed), { bold: true });
      tableRow(`- Operating (${operatingPct}%)`, `-${fmtAedExact(btrRental.operatingCostAed)}`, { tint: true });
      tableRow('= Net Annual', fmtAedExact(btrRental.netAnnualAed), { bold: true });
      y += 4;
      subhead('Returns');
      tableRow('Yield (Net Annual / Total Investment)', fmtPct(btrResult.yieldPct), { bold: true, valueColor: goldDark });
      tableRow('Payback (years)', btrResult.paybackYears.toFixed(1), { tint: true });
      tableRow('5-year cumulative', fmtAedExact(btrResult.total5yAed));
      tableRow('Peak Equity', fmtAedExact(btrResult.peakEquityAed), { tint: true });
      tableRow('ROE (yield-on-equity)', btrResult.peakEquityAed > 0 ? fmtPct(btrResult.roePct) : '—', { bold: true, valueColor: goldDark });
      tableRow(`IRR (${btrResult.holdYears}y hold + ${btrResult.constructionMonths}mo build)`, Number.isFinite(btrResult.irrPct) ? fmtPct(btrResult.irrPct) : '—', { tint: true, bold: true, valueColor: goldDark });
      tableRow(`Exit value (cap @ ${btrResult.terminalCapRatePct}%)`, fmtAedExact(btrResult.exitValueAed));
    } else {
      doc.setFontSize(9);
      doc.setTextColor(...dark);
      doc.setFont('helvetica', 'normal');
      tableRow('Total Investment', fmtAedExact(jv.totalInvestmentAed), { bold: true });
      tableRow('Total Revenue', fmtAedExact(jv.totalRevenueAed), { tint: true });
      tableRow('Total Net Profit', fmtAedExact(jv.totalProjectProfitAed), { bold: true });
      tableRow('Project ROI', fmtPct(jv.projectRoiPct), { tint: true, bold: true, valueColor: goldDark });
      tableRow('Project IRR', Number.isFinite(jv.projectIrrPct) ? fmtPct(jv.projectIrrPct) : '—', { bold: true, valueColor: goldDark });
      y += 4;
      subhead('Landowner');
      tableRow('Total Contribution', fmtAedExact(jv.landownerTotalContribution));
      tableRow('Profit Share', `${jv.landownerSharePct.toFixed(1)}%`, { tint: true });
      tableRow('Net Profit', fmtAedExact(jv.landownerProfitAed), { bold: true });
      tableRow('ROI on Contribution', fmtPct(jv.landownerRoiPct), { tint: true });
      tableRow('IRR (annualised)', Number.isFinite(jv.landownerIrrPct) ? fmtPct(jv.landownerIrrPct) : '—');
      y += 4;
      subhead('Developer');
      tableRow('Cash Contribution', fmtAedExact(developerCashAuto));
      tableRow('Profit Share', `${jv.developerSharePct.toFixed(1)}%`, { tint: true });
      tableRow('Net Profit', fmtAedExact(jv.developerProfitAed), { bold: true });
      tableRow('ROI on Contribution', fmtPct(jv.developerRoiPct), { tint: true });
      tableRow('IRR (annualised)', Number.isFinite(jv.developerIrrPct) ? fmtPct(jv.developerIrrPct) : '—');
    }

    // ═══ GLOSSARY ════════════════════════════════════════════════════
    // No forced page break — sectionGap + checkPage let the section
    // continue on the same page when there's room (founder 2026-06-08).
    sectionGap();
    checkPage(160);
    sectionTitle('Glossary');

    doc.setFontSize(8);
    doc.setTextColor(...gray);
    doc.setFont('helvetica', 'italic');
    doc.text('Plain-language definitions for every metric in this report.', M, y);
    y += 6;

    const glossaryEntries: Array<[string, string]> = [
      ['BUA', 'Built-Up Area. Total covered area including podiums, basements, terraces. RICS NRM 1 standard. Dubai BUA / GFA ratio typically 1.85.'],
      ['SFA', 'Saleable / leasable Floor Area = GFA × efficiency. Revenue is calculated on SFA, not GFA.'],
      ['FAR', 'Floor Area Ratio = GFA ÷ plot area. Set by master-developer affection plan.'],
      ['ROI', 'Return on Investment = Net Profit / Total Investment × 100. Headline return without leverage adjustment.'],
      ['ROE', 'Return on Equity = Net Profit / Peak Equity × 100. Isolates leverage; ROE > ROI when debt is used.'],
      ['IRR', 'Internal Rate of Return. Annualised return that makes Net Present Value of project cash flows = 0. Time-weighted.'],
      ['NPV', 'Net Present Value. Sum of cash flows discounted to today at a chosen rate. Default 10% in this report.'],
      ['Peak Equity', 'Most equity ever tied up in the project (max cumulative outflow before revenue inflows reverse the sign).'],
      ['Yield', 'BtR-only metric. Net Annual rent / Total Investment × 100. First-year unleveraged income return.'],
      ['Payback', 'Years needed for cumulative net rent to equal the total investment.'],
      ['DLD Fee', '4% Dubai Land Department registration fee on land transfer. Applies once at acquisition.'],
      ['Verdict bands', 'Strong (ROI 25% or more / yield 8% or more), Moderate (15-25 / 5-8), Below Target (under 15 / under 5). Founder-ratified bands for the Dubai market.'],
      ['Diff %', 'Live deviation vs the engine baseline. Green up to 15%, amber 15-30%, amber-bold 30-50%, red 50% or more.'],
      ['Engine', 'Specialised cost / revenue model for the asset class. Validated engines (Residential, Office) carry founder-ratified defaults; Research-default engines carry sourced research midpoints with the italic disclaimer.'],
    ];
    if (escrowEnabled) {
      glossaryEntries.push(
        ['Escrow Drawdown', 'RERA-mandated trust account (Dubai Law 8/2007). Buyer payments flow into escrow; developer draws funds as milestones complete. 5% retained 1 year post-handover (Article 14). Reduces peak equity → lifts IRR-on-equity.'],
        ['Sales at launch', 'Percentage of units pre-sold at project launch. Dubai market typical 10-25% depending on developer brand strength and pricing tier.'],
      );
    }

    doc.setFontSize(8.5);
    for (const [term, definition] of glossaryEntries) {
      checkPage(10);
      doc.setTextColor(...goldDark);
      doc.setFont('helvetica', 'bold');
      doc.text(term, M, y);
      doc.setTextColor(...dark);
      doc.setFont('helvetica', 'normal');
      // Wrap definition
      const lines = doc.splitTextToSize(definition, W - 2 * M - 28);
      doc.text(lines, M + 28, y);
      y += Math.max(4, lines.length * 3.5) + 2;
    }

    // ═══ OPTIMISATION RECOMMENDATIONS ════════════════════════════════
    sectionGap();
    checkPage(50);
    sectionTitle('Optimisation recommendations');

    doc.setFontSize(8);
    doc.setTextColor(...gray);
    doc.setFont('helvetica', 'italic');
    const recsIntro = doc.splitTextToSize(
      'Auto-generated savings advice based on absolute deviations of 15% or more vs the engine baseline. Conservative tone — flags opportunities, not prescriptions.',
      W - 2 * M,
    );
    doc.text(recsIntro, M, y);
    y += recsIntro.length * 4 + 4;

    const recs = generateRecommendations({
      engine,
      constructionPsfBua: constructionPsf,
      brandPsfBua: brandPsf,
      consultancyPsfBua: consultancyPsf,
      infrastructurePsfBua: infrastructurePsf,
      contingencyPct,
      salesPsfSfa: salesPsf,
      monthlyRentPsfSfa: monthlyRentPsf,
      occupancyPct,
      operatingPct,
      buaSqft: area.bua,
      sfaSqft: area.sfa,
      totalConstructionAed: construction.totalConstructionAed,
      grossRevenueAed: btsRevenue.grossRevenueAed,
      netAnnualAed: btrRental.netAnnualAed,
      commissionPct,
      marketingPct,
    });

    if (recs.length === 0) {
      doc.setFontSize(9);
      doc.setTextColor(...dark);
      doc.setFont('helvetica', 'normal');
      doc.text(
        'No material deviations from engine baseline. Inputs are aligned to the engine\'s research defaults; no automated savings recommendations to surface.',
        M,
        y,
        { maxWidth: W - 2 * M },
      );
    } else {
      doc.setFontSize(9);
      for (let i = 0; i < recs.length; i++) {
        checkPage(15);
        const rec = recs[i];
        // Number badge
        doc.setFillColor(...gold);
        doc.circle(M + 3, y - 1.5, 3, 'F');
        doc.setFontSize(8);
        doc.setTextColor(255, 255, 255);
        doc.setFont('helvetica', 'bold');
        doc.text(`${i + 1}`, M + 3, y, { align: 'center' });
        // Recommendation body
        doc.setTextColor(...dark);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        const lines = doc.splitTextToSize(rec.text, W - 2 * M - 10);
        doc.text(lines, M + 10, y);
        y += lines.length * 4 + 4;
      }
    }

    // ═══ DISCLAIMER + SOURCES ════════════════════════════════════════
    sectionGap();
    checkPage(70);
    sectionTitle('Disclaimer + sources');

    doc.setFontSize(9);
    doc.setTextColor(...dark);
    doc.setFont('helvetica', 'normal');
    const disclaimer = doc.splitTextToSize(
      'This report is a feasibility estimate, not a formal valuation or appraisal. Numbers are based on the engine\'s research-defaults and on the user\'s inputs; they have not been verified against this specific project\'s contracts, tender packages, or RERA-certified construction reports. Final investment decisions should be supported by an independent RICS-registered valuer. ZAAHI Real Estate OS bears no responsibility for outcomes derived from this estimate.',
      W - 2 * M,
    );
    doc.text(disclaimer, M, y);
    y += disclaimer.length * 4.5 + 6;

    subhead('Sources');
    doc.setFontSize(8);
    doc.setTextColor(...dark);
    doc.setFont('helvetica', 'normal');
    const sources: string[] = [
      `Engine "${engine.label}" defaults — ${engine.source}`,
      'Construction unit-rates — RICS NRM 1, Cushman & Wakefield UAE Construction Cost Survey 2025.',
      'BUA / GFA ratio 1.85 — Dubai Municipality Circular 168/2018, RICS NRM 1 GCC application notes.',
      'Verdict bands — founder-ratified for the Dubai market 4 Apr 2026.',
    ];
    if (tab === 'bts' && escrowEnabled) {
      sources.push(
        'Escrow drawdown — Dubai Law No. 8 of 2007 (Trust Account Law) Article 14, Dubai Law No. 9 of 2007, DLD escrow activation technical procedure.',
      );
    }
    for (const s of sources) {
      checkPage(8);
      const lines = doc.splitTextToSize(`• ${s}`, W - 2 * M - 4);
      doc.text(lines, M + 4, y);
      y += lines.length * 3.8 + 1;
    }

    // Render footers AFTER all content so the "X / N" counter reflects
    // the actual page count (founder 2026-06-08 PDF compaction —
    // previously hardcoded as "1 / 6" which lied about the document).
    const totalCount = doc.getNumberOfPages();
    for (let i = 1; i <= totalCount; i++) {
      doc.setPage(i);
      doc.setFontSize(7);
      doc.setTextColor(...gray);
      doc.setFont('helvetica', 'normal');
      doc.text(
        `Generated by ZAAHI Feasibility v6.0 · ${dateStr} · zaahi.io`,
        M,
        H - 8,
      );
      doc.text(`${i} / ${totalCount}`, W - M, H - 8, { align: 'right' });
    }

    // ═══ Save ═════════════════════════════════════════════════════════
    const modeTag = tab === 'bts' ? 'BtS' : tab === 'btr' ? 'BtR' : 'JV';
    doc.save(
      `ZAAHI-Feasibility-${parcel.plotNumber}-${engine.label.replace(/\s+/g, '_')}-${modeTag}-${dateStr}.pdf`,
    );
  }, [
    parcel,
    engine,
    plotAreaSqft,
    far,
    area,
    efficiencyPct,
    land,
    construction,
    constructionPsf,
    brandPsf,
    consultancyPsf,
    infrastructurePsf,
    contingencyPct,
    finance,
    financeEnabled,
    loanAed,
    ratePct,
    financePeriodMonths,
    btsResult,
    btsRevenue,
    salesPsf,
    commissionPct,
    marketingPct,
    devServicesPct,
    btsV,
    btrResult,
    btrRental,
    monthlyRentPsf,
    occupancyPct,
    operatingPct,
    annualIncreasePct,
    btrV,
    jv,
    jvType,
    landownerLandContribution,
    landownerCash,
    landownerSharePct,
    developerCashAuto,
    tab,
    escrowEnabled,
    salesAtLaunchPct,
    salesAtHandoverPct,
    constructionMonths,
  ]);

  // ── Reset helpers (diff badge → click to reset)
  const resetConstruction = () => setConstructionPsf(engine.constructionPsfBua);
  const resetBrand = () => setBrandPsf(engine.brandPsfBua);
  const resetConsultancy = () => setConsultancyPsf(engine.consultancyPsfBua);
  const resetInfra = () => setInfrastructurePsf(engine.infrastructurePsfBua);
  const resetSales = () => setSalesPsf(engine.salesPsfSfa);
  const resetRent = () => setMonthlyRentPsf(engine.monthlyRentPsfSfa);

  // ── Tabs
  const tabBtn = (key: Tab, label: string) => {
    const active = tab === key;
    return (
      <button
        type="button"
        key={key}
        onClick={() => setTab(key)}
        style={{
          flex: 1,
          padding: '10px 8px',
          background: active ? 'rgba(200,169,110,0.18)' : 'transparent',
          border: `1px solid ${active ? GOLD : LINE}`,
          borderRadius: 6,
          color: active ? GOLD : DIM,
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          cursor: 'pointer',
          transition: 'background 150ms ease, border-color 150ms ease, color 150ms ease',
        }}
      >
        {label}
      </button>
    );
  };

  // ── Layout
  const shellStyle: React.CSSProperties = {
    background: 'rgba(0, 0, 0, 0.3)',
    backdropFilter: 'blur(16px)',
    WebkitBackdropFilter: 'blur(16px)',
    border: `1px solid ${LINE_HARD}`,
    borderRadius: 16,
    color: TXT,
    boxShadow: '0 16px 64px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
    fontFamily: '-apple-system, Segoe UI, Roboto, sans-serif',
    padding: 20,
  };

  // Outer wrapper styling differs by mode. SidePanel mounts inside its own
  // container (padding + width already set by parent), so we strip the page-
  // level chrome (100vh, radial gradient, 24px padding) and let content flow.
  // Fullscreen mode keeps the gradient + min-height for the standalone page.
  const outerStyle: React.CSSProperties =
    mode === 'sidepanel'
      ? {
          color: TXT,
          fontFamily: '-apple-system, Segoe UI, Roboto, sans-serif',
        }
      : {
          minHeight: '100vh',
          background: `radial-gradient(circle at 20% 0%, ${NAVY} 0%, #0A1428 60%, #050912 100%)`,
          padding: '24px 24px 64px 24px',
          color: TXT,
          fontFamily: '-apple-system, Segoe UI, Roboto, sans-serif',
        };

  return (
    <div style={outerStyle}>
      {/* RED warning banner — preview only. Production renders without it. */}
      {banner === 'preview' && (
        <div
          style={{
            position: 'sticky',
            top: 0,
            left: 0,
            right: 0,
            zIndex: 50,
            background: 'rgba(230, 57, 70, 0.95)',
            color: '#fff',
            padding: '8px 16px',
            textAlign: 'center',
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            borderBottom: '1px solid rgba(255,255,255,0.2)',
          }}
          role="alert"
          aria-live="polite"
        >
          ⚠️ INTERNAL PREVIEW · v6.0 spec rev-2 · DO NOT SHARE EXTERNALLY · founder-review only
        </div>
      )}

      <div
        style={{
          maxWidth: mode === 'sidepanel' ? '100%' : 1280,
          margin: '0 auto',
          padding: mode === 'sidepanel' ? 0 : '24px 0 0 0',
        }}
      >
        {/* Header — simplified per founder Sprint 1.6 directive: just the
            product name + Export PDF. No version number (Bayut / Property
            Finder don't show one), no fullscreen toggle (Sprint 7 dropped per
            corrected plan). Version + generation timestamp moved to PDF footer
            per Sprint 9 spec. */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 16,
            marginBottom: mode === 'sidepanel' ? 12 : 20,
          }}
        >
          <div
            style={{
              fontFamily: 'Georgia, serif',
              fontSize: mode === 'sidepanel' ? 16 : 22,
              fontWeight: 700,
              color: GOLD,
              letterSpacing: '0.02em',
              textTransform: 'uppercase',
            }}
          >
            Feasibility Calculator
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              disabled={landPriceMissing}
              type="button"
              onClick={downloadPDF}
              style={{
                background: 'rgba(200,169,110,0.18)',
                border: `1px solid ${GOLD}`,
                color: GOLD,
                padding: '8px 14px',
                borderRadius: 8,
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                cursor: 'pointer',
                transition: 'background 150ms ease, border-color 150ms ease',
              }}
            >
              {landPriceMissing ? 'Export PDF — land price needed' : 'Export PDF'}
            </button>
          </div>
        </div>

        {/* Selectors — compact one-liner in sidepanel mode (founder
            "Plot 3830345 · BARSHA HEIGHTS · MIXED USE" hierarchy);
            full-card layout in fullscreen mode. */}
        {mode === 'sidepanel' ? (
          <div style={{ marginBottom: 12 }}>
            <div
              style={{
                color: TXT,
                fontSize: 13,
                fontWeight: 600,
                fontVariantNumeric: 'tabular-nums',
                lineHeight: 1.3,
                marginBottom: 2,
              }}
            >
              Plot {parcel.plotNumber}{' '}
              <span style={{ color: SUBTLE, fontWeight: 400 }}>
                · {parcel.district} · {parcel.landUse}
              </span>
            </div>
            <div style={{ color: SUBTLE, fontSize: 11, marginBottom: 8 }}>
              {fmtInt(parcel.plotAreaSqft)} sqft · FAR {parcel.far.toFixed(2)} · Listed{' '}
              {fmtAedExact(parcel.plotPriceAed)}
            </div>
            {/* Engine selector hidden behind a single disclosure click in
                sidepanel mode (founder 2026-06-08). Auto-route from
                landUse keeps the right default; only power users open the
                picker. The current engine label stays visible so the user
                always knows what's driving defaults. */}
            <EngineSelectorDisclosure
              currentLabel={ENGINES[engineId].label}
              currentValidated={ENGINES[engineId].validated}
            >
              <EngineSelector value={engineId} onChange={setEngineId} availableEngines={availableEngines} />
            </EngineSelectorDisclosure>
          </div>
        ) : (
          <div
            style={{
              ...shellStyle,
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: 16,
              marginBottom: 20,
            }}
          >
            <div>
              <SectionTitle>Parcel</SectionTitle>
              <div style={{ color: TXT, fontSize: 14, fontWeight: 600, lineHeight: 1.4 }}>
                Plot {parcel.plotNumber}
              </div>
              <div style={{ color: SUBTLE, fontSize: 11, marginTop: 6, lineHeight: 1.5 }}>
                <div>
                  {parcel.district}
                  {parcel.community ? ` · ${parcel.community}` : ''}
                </div>
                {parcel.projectName && <div>Project: {parcel.projectName}</div>}
                {parcel.masterDeveloper && <div>Master developer: {parcel.masterDeveloper}</div>}
                <div>Land use: {parcel.landUse}</div>
                <div>
                  Plot: {fmtInt(parcel.plotAreaSqft)} sqft · FAR {parcel.far.toFixed(2)} · GFA{' '}
                  {fmtInt(parcel.gfaSqft)} sqft
                </div>
                <div>Listed: {fmtAedExact(parcel.plotPriceAed)}</div>
              </div>
            </div>
            <EngineSelector value={engineId} onChange={setEngineId} availableEngines={availableEngines} />
          </div>
        )}

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          {tabBtn('bts', 'Build to Sell')}
          {tabBtn('btr', 'Build to Rent')}
          {tabBtn('jv', 'Joint Venture')}
        </div>

        {/* Body — sidepanel mode renders below; fullscreen renders the
            two-column layout further down. Both branches share the same
            state, so inputs typed in sidepanel mode survive a mode switch
            (not exposed in production but useful for the internal-test route). */}
        {mode === 'sidepanel' && (
          <>
            {/* ── Sticky verdict block — at-a-glance "выгодно или нет?".
                Stays visible while user scrolls input panels. */}
            <div
              style={{
                position: 'sticky',
                top: 0,
                zIndex: 20,
                background: 'rgba(0, 0, 0, 0.3)',
                backdropFilter: 'blur(16px)',
                WebkitBackdropFilter: 'blur(16px)',
                border: `1px solid ${LINE_HARD}`,
                borderRadius: 14,
                padding: '14px 16px',
                marginBottom: 12,
                boxShadow: '0 8px 20px rgba(0,0,0,0.3)',
              }}
            >
              {tab === 'bts' && (
                <>
                  <div
                    style={{
                      color: DIM,
                      fontSize: 10,
                      letterSpacing: '0.16em',
                      textTransform: 'uppercase',
                      marginBottom: 4,
                    }}
                  >
                    Net Profit
                  </div>
                  <div
                    style={{
                      fontFamily: 'Georgia, serif',
                      fontSize: 26,
                      fontWeight: 800,
                      letterSpacing: '-0.02em',
                      color: btsResult.netProfitAed >= 0 ? GOLD : '#E63946',
                      fontVariantNumeric: 'tabular-nums',
                      lineHeight: 1.1,
                    }}
                  >
                    {fmtAedExact(btsResult.netProfitAed)}
                  </div>
                  <div
                    style={{
                      color: DIM,
                      fontSize: 12,
                      marginTop: 6,
                      fontVariantNumeric: 'tabular-nums',
                    }}
                  >
                    ROI{' '}
                    <span style={{ color: TXT, fontWeight: 700 }}>
                      {fmtPct(btsResult.roiPct)}
                    </span>
                    <span style={{ color: SUBTLE }}> · </span>
                    Profit / sqft{' '}
                    <span style={{ color: TXT }}>
                      {fmtAedExact(btsResult.profitPerSqftSfa)}
                    </span>
                  </div>
                  <div
                    style={{
                      color: DIM,
                      fontSize: 11,
                      marginTop: 4,
                      fontVariantNumeric: 'tabular-nums',
                    }}
                  >
                    IRR{' '}
                    <span style={{ color: TXT, fontWeight: 700 }}>
                      {Number.isFinite(btsResult.irrPct) ? fmtPct(btsResult.irrPct) : '—'}
                    </span>
                    <span style={{ color: SUBTLE }}> · </span>
                    ROE{' '}
                    <span style={{ color: TXT, fontWeight: 700 }}>
                      {btsResult.peakEquityAed > 0 ? fmtPct(btsResult.roePct) : '—'}
                    </span>
                  </div>
                  {/* IRR-primary verdict (founder-ratified 2026-06-08).
                      ROI verdict shown below as the secondary read. */}
                  <div
                    style={{
                      marginTop: 10,
                      padding: '6px 10px',
                      border: `1px solid ${btsV.color}`,
                      borderRadius: 8,
                      color: btsV.color,
                      fontSize: 10,
                      fontWeight: 700,
                      letterSpacing: '0.08em',
                      textTransform: 'uppercase',
                      textAlign: 'center',
                      background: 'rgba(255,255,255,0.02)',
                    }}
                    role="status"
                    title={`IRR verdict band: ${btsV.threshold}`}
                  >
                    IRR · {btsV.label}
                  </div>
                  <div
                    style={{
                      marginTop: 4,
                      fontSize: 9,
                      color: SUBTLE,
                      textAlign: 'center',
                      letterSpacing: '0.06em',
                      textTransform: 'uppercase',
                    }}
                  >
                    ROI · {btsRoiV.label}
                  </div>
                </>
              )}
              {tab === 'btr' && (
                <>
                  <div
                    style={{
                      color: DIM,
                      fontSize: 10,
                      letterSpacing: '0.16em',
                      textTransform: 'uppercase',
                      marginBottom: 4,
                    }}
                  >
                    Yield
                  </div>
                  <div
                    style={{
                      fontFamily: 'Georgia, serif',
                      fontSize: 26,
                      fontWeight: 800,
                      letterSpacing: '-0.02em',
                      color: btrResult.yieldPct >= 5 ? GOLD : '#E63946',
                      fontVariantNumeric: 'tabular-nums',
                      lineHeight: 1.1,
                    }}
                  >
                    {fmtPct(btrResult.yieldPct)}
                  </div>
                  <div
                    style={{
                      color: DIM,
                      fontSize: 12,
                      marginTop: 6,
                      fontVariantNumeric: 'tabular-nums',
                    }}
                  >
                    Payback{' '}
                    <span style={{ color: TXT, fontWeight: 700 }}>
                      {btrResult.paybackYears.toFixed(1)} yr
                    </span>
                    <span style={{ color: SUBTLE }}> · </span>
                    Monthly{' '}
                    <span style={{ color: TXT }}>
                      {fmtAedExact(btrResult.monthlyCashFlowAed)}
                    </span>
                  </div>
                  <div
                    style={{
                      color: DIM,
                      fontSize: 11,
                      marginTop: 4,
                      fontVariantNumeric: 'tabular-nums',
                    }}
                  >
                    IRR{' '}
                    <span style={{ color: TXT, fontWeight: 700 }}>
                      {Number.isFinite(btrResult.irrPct) ? fmtPct(btrResult.irrPct) : '—'}
                    </span>
                    <span style={{ color: SUBTLE }}> · </span>
                    ROE{' '}
                    <span style={{ color: TXT, fontWeight: 700 }}>
                      {btrResult.peakEquityAed > 0 ? fmtPct(btrResult.roePct) : '—'}
                    </span>
                  </div>
                  {/* IRR-primary verdict; Yield verdict as secondary. */}
                  <div
                    style={{
                      marginTop: 10,
                      padding: '6px 10px',
                      border: `1px solid ${btrV.color}`,
                      borderRadius: 8,
                      color: btrV.color,
                      fontSize: 10,
                      fontWeight: 700,
                      letterSpacing: '0.08em',
                      textTransform: 'uppercase',
                      textAlign: 'center',
                      background: 'rgba(255,255,255,0.02)',
                    }}
                    role="status"
                    title={`IRR verdict band: ${btrV.threshold}`}
                  >
                    IRR · {btrV.label}
                  </div>
                  <div
                    style={{
                      marginTop: 4,
                      fontSize: 9,
                      color: SUBTLE,
                      textAlign: 'center',
                      letterSpacing: '0.06em',
                      textTransform: 'uppercase',
                    }}
                  >
                    Yield · {btrYieldV.label}
                  </div>
                </>
              )}
              {tab === 'jv' && (
                <>
                  <div
                    style={{
                      color: DIM,
                      fontSize: 10,
                      letterSpacing: '0.16em',
                      textTransform: 'uppercase',
                      marginBottom: 4,
                    }}
                  >
                    Project ROI
                  </div>
                  <div
                    style={{
                      fontFamily: 'Georgia, serif',
                      fontSize: 26,
                      fontWeight: 800,
                      letterSpacing: '-0.02em',
                      color: jv.projectRoiPct >= 0 ? GOLD : '#E63946',
                      fontVariantNumeric: 'tabular-nums',
                      lineHeight: 1.1,
                    }}
                  >
                    {fmtPct(jv.projectRoiPct)}
                  </div>
                  <div
                    style={{
                      color: DIM,
                      fontSize: 12,
                      marginTop: 6,
                      fontVariantNumeric: 'tabular-nums',
                    }}
                  >
                    Landowner{' '}
                    <span style={{ color: TXT, fontWeight: 700 }}>
                      {fmtAedExact(jv.landownerProfitAed)}
                    </span>
                    <span style={{ color: SUBTLE }}> · </span>
                    Developer{' '}
                    <span style={{ color: TXT }}>
                      {fmtAedExact(jv.developerProfitAed)}
                    </span>
                  </div>
                  <div
                    style={{
                      color: DIM,
                      fontSize: 11,
                      marginTop: 4,
                      fontVariantNumeric: 'tabular-nums',
                    }}
                  >
                    Project IRR{' '}
                    <span style={{ color: TXT, fontWeight: 700 }}>
                      {Number.isFinite(jv.projectIrrPct) ? fmtPct(jv.projectIrrPct) : '—'}
                    </span>
                    <span style={{ color: SUBTLE }}> · </span>
                    LO IRR{' '}
                    <span style={{ color: TXT }}>
                      {Number.isFinite(jv.landownerIrrPct) ? fmtPct(jv.landownerIrrPct) : '—'}
                    </span>
                    <span style={{ color: SUBTLE }}> · </span>
                    Dev IRR{' '}
                    <span style={{ color: TXT }}>
                      {Number.isFinite(jv.developerIrrPct) ? fmtPct(jv.developerIrrPct) : '—'}
                    </span>
                  </div>
                </>
              )}
            </div>

            {/* ── Collapsible panels — primary metric in header so the
                broker sees BUA / Land Cost / Construction without expanding. */}
            <Panel title="Area" metric={`BUA ${fmtInt(area.bua)} sqft · GFA ${fmtInt(area.gfa)} sqft`}>
              <Row label="Plot Area" tooltipKey="plotArea" stacked>
                <NumberInput value={plotAreaSqft} unit="sqft" readonly fullWidth />
              </Row>
              <Row label="FAR" tooltipKey="far" stacked>
                <NumberInput value={far} readonly fullWidth />
              </Row>
              <Row label="GFA" tooltipKey="gfa" stacked>
                <NumberInput value={Math.round(area.gfa)} unit="sqft" readonly fullWidth />
              </Row>
              <Row
                label="BUA"
                tooltipKey="bua"
                stacked
                badge={<DiffBadge current={buaRatio} baseline={1.85} onReset={() => setBuaRatio(1.85)} />}
              >
                <NumberInput
                  value={buaManual}
                  unit="sqft"
                  fullWidth
                  onChange={(n) => {
                    setBuaManual(n);
                    if (area.gfa > 0) setBuaRatio(Number((n / area.gfa).toFixed(3)));
                  }}
                />
              </Row>
              <Row label="BUA / GFA" tooltipKey="buaRatio" stacked>
                <NumberInput
                  value={Number(buaRatio.toFixed(3))}
                  fullWidth
                  onChange={(n) => {
                    setBuaRatio(n);
                    setBuaManual(Math.round(area.gfa * n));
                  }}
                />
              </Row>
              <Row label="Efficiency" tooltipKey="efficiency" stacked>
                <NumberInput value={efficiencyPct} unit="%" onChange={setEfficiencyPct} fullWidth />
              </Row>
              <Row label="SFA" tooltipKey="sfa" stacked>
                <NumberInput value={Math.round(area.sfa)} unit="sqft" readonly fullWidth />
              </Row>
            </Panel>

            {/* Mixed-use breakdown — Panel sits between Area and Land
                so the share % drives downstream construction + revenue
                via the composite engine path. Auto-rendered when the
                DDA affection plan lists more than one sub-use. */}
            {showMixedUse && mixShares && mixedResult && (
              <Panel
                title="Mix breakdown"
                metric={`${mixShares.length} uses · Σ ${mixShareSum.toFixed(0)}%`}
                defaultOpen
                changed={!mixShareValid}
              >
                {!mixShareValid && (
                  <div
                    role="alert"
                    style={{
                      fontSize: 10,
                      color: '#E63946',
                      marginBottom: 6,
                      lineHeight: 1.4,
                    }}
                  >
                    Share % must sum to 100. Current sum: {mixShareSum.toFixed(1)}%.
                  </div>
                )}
                {mixShares.map((share, i) => {
                  const engineId = shareToEngine(share);
                  const slice = mixedResult.slices[i];
                  return (
                    <Row
                      key={`${share.category}-${share.sub ?? ''}-${i}`}
                      label={`${share.category}${share.sub ? ' · ' + share.sub : ''}`}
                      stacked
                    >
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        <NumberInput
                          value={share.pct}
                          unit="%"
                          fullWidth
                          onChange={(n) => {
                            const next = mixShares.slice();
                            next[i] = { ...next[i], pct: n };
                            setMixShares(next);
                          }}
                        />
                        <span style={{ color: SUBTLE, fontSize: 10 }}>
                          Engine: {ENGINES[engineId].label} · GFA {fmtInt(slice.area.gfa)} sqft ·
                          Net rev {fmtAedExact(slice.netRevenueAed)}
                        </span>
                      </div>
                    </Row>
                  );
                })}
                <div
                  style={{
                    marginTop: 8,
                    paddingTop: 8,
                    borderTop: `1px solid ${LINE_HARD}`,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 3,
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11 }}>
                    <span style={{ color: DIM }}>Total construction (composite)</span>
                    <span style={{ color: TXT, fontVariantNumeric: 'tabular-nums' }}>
                      {fmtAedExact(mixedResult.totalConstructionAed)}
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11 }}>
                    <span style={{ color: DIM }}>Total net revenue (composite)</span>
                    <span style={{ color: TXT, fontVariantNumeric: 'tabular-nums' }}>
                      {fmtAedExact(mixedResult.totalNetRevenueAed)}
                    </span>
                  </div>
                </div>
              </Panel>
            )}

            <Panel
              title="Land"
              metric={`${fmtAedExact(land.landCostAed)} + DLD ${fmtAedExact(land.dldFeeAed)}`}
              changed={landCostAed !== parcel.plotPriceAed}
            >
              <Row label="Land Cost" tooltipKey="landCost" stacked>
                <NumberInput value={landCostAed} unit="AED" onChange={setLandCostAed} fullWidth />
              </Row>
              <Row label="DLD Fee (4%)" tooltipKey="dldFee" stacked>
                <NumberInput value={Math.round(land.dldFeeAed)} unit="AED" readonly fullWidth />
              </Row>
              <Row label="Brokerage on land (%)" tooltipKey="brokerageOnLand" stacked>
                <NumberInput
                  value={brokerageOnLandPct}
                  unit="%"
                  onChange={setBrokerageOnLandPct}
                  fullWidth
                />
              </Row>
              {brokerageOnLandPct > 0 && (
                <Row label="Brokerage fee" stacked>
                  <NumberInput
                    value={Math.round(btsResult.brokerageOnLandAed)}
                    unit="AED"
                    readonly
                    fullWidth
                  />
                </Row>
              )}
              <Row label="Payment Mode" tooltipKey="paymentMode" stacked>
                <div style={{ display: 'flex', gap: 4 }}>
                  {(['full', 'installments'] as LandPaymentMode[]).map((m) => (
                    <button
                      type="button"
                      key={m}
                      onClick={() => setPaymentMode(m)}
                      style={{
                        padding: '6px 10px',
                        background: paymentMode === m ? 'rgba(200,169,110,0.2)' : 'transparent',
                        border: `1px solid ${paymentMode === m ? GOLD : LINE}`,
                        borderRadius: 6,
                        color: paymentMode === m ? GOLD : DIM,
                        fontSize: 10,
                        fontWeight: 700,
                        letterSpacing: '0.06em',
                        textTransform: 'uppercase',
                        cursor: 'pointer',
                      }}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </Row>
              {paymentMode === 'installments' && (
                <>
                  <Row label="Down Payment" tooltipKey="downPayment" stacked>
                    <NumberInput value={downPaymentPct} unit="%" onChange={setDownPaymentPct} fullWidth />
                  </Row>
                  <Row label="# Payments" tooltipKey="numberOfPayments" stacked>
                    <NumberInput value={numberOfPayments} onChange={setNumberOfPayments} fullWidth />
                  </Row>
                  <Row label="Period" tooltipKey="periodMonths" stacked>
                    <NumberInput value={periodMonths} unit="months" onChange={setPeriodMonths} fullWidth />
                  </Row>
                </>
              )}
            </Panel>

            <Panel
              title="Construction"
              metric={fmtAedExact(construction.totalConstructionAed)}
              changed={
                constructionPsf !== engine.constructionPsfBua ||
                brandPsf !== engine.brandPsfBua ||
                consultancyPsf !== engine.consultancyPsfBua ||
                infrastructurePsf !== engine.infrastructurePsfBua ||
                contingencyPct !== engine.contingencyPct
              }
            >
              <Row
                label="Construction"
                tooltipKey="constructionPsf"
                stacked
                badge={
                  <DiffBadge
                    current={constructionPsf}
                    baseline={engine.constructionPsfBua}
                    onReset={resetConstruction}
                  />
                }
              >
                <NumberInput value={constructionPsf} unit="AED/sqft" onChange={setConstructionPsf} fullWidth />
              </Row>
              <Row
                label="Brand & Coll."
                tooltipKey="brandPsf"
                stacked
                badge={<DiffBadge current={brandPsf} baseline={engine.brandPsfBua} onReset={resetBrand} />}
              >
                <NumberInput value={brandPsf} unit="AED/sqft" onChange={setBrandPsf} fullWidth />
              </Row>
              <Row
                label="Consultancy"
                tooltipKey="consultancyPsf"
                stacked
                badge={
                  <DiffBadge
                    current={consultancyPsf}
                    baseline={engine.consultancyPsfBua}
                    onReset={resetConsultancy}
                  />
                }
              >
                <NumberInput value={consultancyPsf} unit="AED/sqft" onChange={setConsultancyPsf} fullWidth />
              </Row>
              <Row
                label="Infrastructure"
                tooltipKey="infrastructurePsf"
                stacked
                badge={
                  <DiffBadge
                    current={infrastructurePsf}
                    baseline={engine.infrastructurePsfBua}
                    onReset={resetInfra}
                  />
                }
              >
                <NumberInput value={infrastructurePsf} unit="AED/sqft" onChange={setInfrastructurePsf} fullWidth />
              </Row>
              <Row label="Contingency" tooltipKey="contingency" stacked>
                <NumberInput value={contingencyPct} unit="%" onChange={setContingencyPct} fullWidth />
              </Row>
            </Panel>

            <Panel
              title="Finance"
              metric={
                financeEnabled
                  ? `${fmtAedExact(finance.totalInterestAed)} interest`
                  : 'Disabled'
              }
              changed={financeEnabled}
            >
              <Row label="Enable finance" tooltipKey="financeEnabled" stacked>
                <button
                  type="button"
                  onClick={() => setFinanceEnabled((b) => !b)}
                  style={{
                    padding: '6px 14px',
                    background: financeEnabled ? 'rgba(200,169,110,0.2)' : 'transparent',
                    border: `1px solid ${financeEnabled ? GOLD : LINE}`,
                    borderRadius: 6,
                    color: financeEnabled ? GOLD : DIM,
                    fontSize: 10,
                    fontWeight: 700,
                    letterSpacing: '0.06em',
                    textTransform: 'uppercase',
                    cursor: 'pointer',
                  }}
                  aria-pressed={financeEnabled}
                >
                  {financeEnabled ? 'On' : 'Off'}
                </button>
              </Row>
              {financeEnabled && (
                <>
                  <Row label="Loan" tooltipKey="loanAed" stacked>
                    <NumberInput value={loanAed} unit="AED" onChange={setLoanAed} fullWidth />
                  </Row>
                  <Row label="Rate" tooltipKey="ratePct" stacked>
                    <NumberInput value={ratePct} unit="%" onChange={setRatePct} fullWidth />
                  </Row>
                  <Row label="Period" tooltipKey="financePeriodMonths" stacked>
                    <NumberInput value={financePeriodMonths} unit="months" onChange={setFinancePeriodMonths} fullWidth />
                  </Row>
                </>
              )}
            </Panel>

            {/* Escrow panel — Sprint 9c. Models RERA Law 8/2007 mandatory
                trust account for off-plan projects. Auto-on for off-plan
                engine, off otherwise. Reduces peak equity → lifts ROE / IRR. */}
            {tab === 'bts' && (
              <Panel
                title="Escrow (off-plan)"
                metric={
                  escrowEnabled && btsResult.escrow
                    ? `Drawn ${fmtAedExact(btsResult.escrow.totalDrawnFromEscrow)} · Peak equity ${fmtAedExact(btsResult.peakEquityAed)}`
                    : 'Disabled'
                }
                changed={engineId !== 'offplan' && escrowEnabled}
              >
                <Row label="Enable escrow" stacked>
                  <button
                    type="button"
                    onClick={() => setEscrowEnabled((b) => !b)}
                    style={{
                      padding: '6px 14px',
                      background: escrowEnabled ? 'rgba(200,169,110,0.2)' : 'transparent',
                      border: `1px solid ${escrowEnabled ? GOLD : LINE}`,
                      borderRadius: 6,
                      color: escrowEnabled ? GOLD : DIM,
                      fontSize: 10,
                      fontWeight: 700,
                      letterSpacing: '0.06em',
                      textTransform: 'uppercase',
                      cursor: 'pointer',
                    }}
                    aria-pressed={escrowEnabled}
                  >
                    {escrowEnabled ? 'On' : 'Off'}
                  </button>
                </Row>
                {escrowEnabled && (
                  <>
                    <div
                      style={{
                        color: SUBTLE,
                        fontSize: 10,
                        fontStyle: 'italic',
                        marginTop: 6,
                        marginBottom: 8,
                        lineHeight: 1.4,
                      }}
                    >
                      Models RERA Law 8/2007 trust account. Buyer payments flow
                      into escrow; developer draws funds as RERA-engineer-
                      certified milestones complete. 5% retained 1 year post-
                      handover (Article 14). Default schedule: foundation 15% /
                      structure 30% / MEP 50% / finishes 70% / handover 95%.
                    </div>
                    <Row label="Construction (months)" stacked>
                      <NumberInput
                        value={constructionMonths}
                        unit="months"
                        onChange={setConstructionMonths}
                        fullWidth
                      />
                    </Row>
                    <Row label="Sales at launch" stacked>
                      <NumberInput
                        value={salesAtLaunchPct}
                        unit="%"
                        onChange={setSalesAtLaunchPct}
                        fullWidth
                      />
                    </Row>
                    <Row label="Sales at handover" stacked>
                      <NumberInput
                        value={salesAtHandoverPct}
                        unit="%"
                        onChange={setSalesAtHandoverPct}
                        fullWidth
                      />
                    </Row>
                    {btsResult.escrow && (
                      <div
                        style={{
                          color: SUBTLE,
                          fontSize: 11,
                          marginTop: 8,
                          padding: '8px 10px',
                          background: 'rgba(200,169,110,0.06)',
                          border: `1px solid ${LINE}`,
                          borderRadius: 6,
                          lineHeight: 1.5,
                          fontVariantNumeric: 'tabular-nums',
                        }}
                      >
                        <div>
                          Total drawn:{' '}
                          <span style={{ color: TXT, fontWeight: 700 }}>
                            {fmtAedExact(btsResult.escrow.totalDrawnFromEscrow)}
                          </span>
                        </div>
                        <div>
                          Retention released (1y post-handover):{' '}
                          <span style={{ color: TXT, fontWeight: 700 }}>
                            {fmtAedExact(btsResult.escrow.totalRetentionReleased)}
                          </span>
                        </div>
                        <div>
                          Peak equity:{' '}
                          <span style={{ color: GOLD, fontWeight: 700 }}>
                            {fmtAedExact(btsResult.peakEquityAed)}
                          </span>
                          {' '}(without escrow would equal Total Investment)
                        </div>
                      </div>
                    )}
                  </>
                )}
              </Panel>
            )}

            {/* Mode-gating banner — when the active tab isn't in the
                engine's supported modes, show a clear message instead of
                garbage numbers (founder 2026-06-09 — Stage 2 fix). */}
            {!engine.modes.includes(tab as 'bts' | 'btr') && tab !== 'jv' && (
              <Panel
                title="Mode not supported"
                metric={`${engine.label} · ${tab.toUpperCase()}`}
                defaultOpen
                changed
              >
                <div
                  role="alert"
                  style={{
                    color: AMBER,
                    fontSize: 11,
                    lineHeight: 1.5,
                    padding: '8px 10px',
                    background: 'rgba(230, 126, 34, 0.08)',
                    border: `1px solid ${AMBER}`,
                    borderRadius: 8,
                  }}
                >
                  The <strong>{engine.label}</strong> engine doesn&apos;t support{' '}
                  <strong>{tab === 'bts' ? 'Build to Sell' : 'Build to Rent'}</strong>{' '}
                  — its revenue model is{' '}
                  {engineId === 'hospitality' ? 'ADR-driven (hotel operating asset)'
                    : engineId === 'datacenter' ? 'per-MW colocation revenue'
                    : engineId === 'senior' ? 'rental hold only'
                    : engineId === 'offplan' ? 'off-plan sales only'
                    : engineId === 'landhold' ? 'speculative land appreciation (CAGR exit)'
                    : engineId === 'infrastructure' ? 'PPP / concession DCF (not in v6)'
                    : 'not modelled in this view'}
                  . Switch to{' '}
                  {engine.modes.length === 0
                    ? 'another engine'
                    : engine.modes.includes('bts') ? 'Build to Sell' : 'Build to Rent'}{' '}
                  for meaningful outputs. (Investment cost is shown above; revenue / IRR
                  on this tab are not applicable.)
                </div>
              </Panel>
            )}

            {/* Per-unit Asset Model — for engines whose revenue is not
                psf-driven (hospitality, healthcare, educational,
                datacenter). Computed values flow back into the v5
                math kernel as a synthesised psf. */}
            {usesPerUnit && perUnitDef && engine.modes.includes(tab as 'bts' | 'btr') && (
              <Panel
                title="Asset model"
                metric={
                  tab === 'bts' && perUnitBtSResult
                    ? `${unitCount} ${perUnitDef.unitLabel} · sale value ${fmtAedExact(perUnitBtSResult.exitValueAed)}`
                    : tab === 'btr' && perUnitBtRResult
                      ? `${unitCount} ${perUnitDef.unitLabel} · gross ${fmtAedExact(perUnitBtRResult.annualGrossRevenueAed)}/yr`
                      : 'unit-driven revenue'
                }
                defaultOpen
              >
                <div
                  style={{
                    color: SUBTLE,
                    fontSize: 10,
                    fontStyle: 'italic',
                    marginBottom: 8,
                    lineHeight: 1.5,
                  }}
                >
                  Revenue model: {engineId === 'hospitality' ? 'ADR × keys × occupancy × 365'
                    : engineId === 'healthcare' ? 'AED revenue per bed × bed count × occupancy'
                    : engineId === 'educational' ? 'tuition per student × student count × occupancy'
                    : 'AED revenue per MW × MW capacity'}
                  . The v5 kernel sees an equivalent SFA × psf, but the
                  numbers are driven from these per-unit inputs.
                </div>
                <Row label={`Number of ${perUnitDef.unitLabel}`} stacked>
                  <NumberInput value={unitCount} unit={perUnitDef.unitLabel} onChange={setUnitCount} fullWidth />
                </Row>
                <Row
                  label={engineId === 'hospitality' ? 'ADR (AED / night)' : `Annual revenue per ${perUnitDef.unitLabel.replace(/s$/, '')}`}
                  stacked
                >
                  <NumberInput
                    value={perUnitRev}
                    unit={engineId === 'hospitality' ? 'AED' : 'AED / year'}
                    onChange={setPerUnitRev}
                    fullWidth
                  />
                </Row>
                {tab === 'bts' && (
                  <Row label="Exit cap rate (sale of operating asset)" stacked>
                    <NumberInput value={exitCapPct} unit="%" onChange={setExitCapPct} fullWidth />
                  </Row>
                )}
                {tab === 'bts' && perUnitBtSResult && (
                  <div
                    style={{
                      color: SUBTLE,
                      fontSize: 11,
                      marginTop: 8,
                      padding: '8px 10px',
                      background: 'rgba(200,169,110,0.06)',
                      border: `1px solid ${LINE}`,
                      borderRadius: 6,
                      lineHeight: 1.5,
                      fontVariantNumeric: 'tabular-nums',
                    }}
                  >
                    <div>Annual gross: <span style={{ color: TXT, fontWeight: 700 }}>{fmtAedExact(perUnitBtSResult.annualGrossRevenueAed)}</span></div>
                    <div>Annual NOI: <span style={{ color: TXT, fontWeight: 700 }}>{fmtAedExact(perUnitBtSResult.annualNoiAed)}</span></div>
                    <div>Exit value: <span style={{ color: GOLD, fontWeight: 700 }}>{fmtAedExact(perUnitBtSResult.exitValueAed)}</span></div>
                    <div style={{ marginTop: 4, color: SUBTLE, fontSize: 10 }}>
                      Equivalent SFA psf: {fmtAedExact(perUnitBtSResult.equivalentSalesPsfSfa)}
                    </div>
                  </div>
                )}
                {tab === 'btr' && perUnitBtRResult && (
                  <div
                    style={{
                      color: SUBTLE,
                      fontSize: 11,
                      marginTop: 8,
                      padding: '8px 10px',
                      background: 'rgba(200,169,110,0.06)',
                      border: `1px solid ${LINE}`,
                      borderRadius: 6,
                      lineHeight: 1.5,
                      fontVariantNumeric: 'tabular-nums',
                    }}
                  >
                    <div>Annual gross: <span style={{ color: TXT, fontWeight: 700 }}>{fmtAedExact(perUnitBtRResult.annualGrossRevenueAed)}</span></div>
                    <div style={{ marginTop: 4, color: SUBTLE, fontSize: 10 }}>
                      Equivalent monthly rent psf: {fmtAedExact(perUnitBtRResult.equivalentMonthlyRentPsfSfa)}
                    </div>
                  </div>
                )}
              </Panel>
            )}

            {tab === 'bts' && engine.modes.includes('bts') && !usesPerUnit && (
              <Panel
                title="Revenue"
                metric={fmtAedExact(btsResult.netRevenueAed)}
                changed={salesPsf !== engine.salesPsfSfa}
              >
                <Row
                  label="Sales Price"
                  tooltipKey="salesPsf"
                  stacked
                  badge={<DiffBadge current={salesPsf} baseline={engine.salesPsfSfa} onReset={resetSales} />}
                >
                  <NumberInput value={salesPsf} unit="AED/sqft" onChange={setSalesPsf} fullWidth />
                </Row>
                <Row label="Commission" tooltipKey="commission" stacked>
                  <NumberInput value={commissionPct} unit="%" onChange={setCommissionPct} fullWidth />
                </Row>
                <Row label="Marketing" tooltipKey="marketing" stacked>
                  <NumberInput value={marketingPct} unit="%" onChange={setMarketingPct} fullWidth />
                </Row>
                <Row label="Dev Services" tooltipKey="devServices" stacked>
                  <NumberInput value={devServicesPct} unit="%" onChange={setDevServicesPct} fullWidth />
                </Row>
              </Panel>
            )}
            {/* For per-unit BtS engines, still show commission/marketing
                (they apply to the sale of the operating asset). */}
            {tab === 'bts' && usesPerUnit && (
              <Panel
                title="Sales costs"
                metric={fmtAedExact(btsResult.netRevenueAed)}
                changed
              >
                <Row label="Commission" tooltipKey="commission" stacked>
                  <NumberInput value={commissionPct} unit="%" onChange={setCommissionPct} fullWidth />
                </Row>
                <Row label="Marketing" tooltipKey="marketing" stacked>
                  <NumberInput value={marketingPct} unit="%" onChange={setMarketingPct} fullWidth />
                </Row>
                <Row label="Dev Services" tooltipKey="devServices" stacked>
                  <NumberInput value={devServicesPct} unit="%" onChange={setDevServicesPct} fullWidth />
                </Row>
              </Panel>
            )}

            {tab === 'btr' && engine.modes.includes('btr') && !usesPerUnit && (
              <Panel
                title="Rental"
                metric={fmtAedExact(btrRental.netAnnualAed)}
                changed={monthlyRentPsf !== engine.monthlyRentPsfSfa}
              >
                <Row
                  label="Monthly Rent"
                  tooltipKey="monthlyRent"
                  stacked
                  badge={
                    <DiffBadge
                      current={monthlyRentPsf}
                      baseline={engine.monthlyRentPsfSfa}
                      onReset={resetRent}
                    />
                  }
                >
                  <NumberInput value={monthlyRentPsf} unit="AED/sqft" onChange={setMonthlyRentPsf} fullWidth />
                </Row>
                <Row label="Occupancy" tooltipKey="occupancy" stacked>
                  <NumberInput value={occupancyPct} unit="%" onChange={setOccupancyPct} fullWidth />
                </Row>
                <Row label="Annual Increase" tooltipKey="annualIncrease" stacked>
                  <NumberInput value={annualIncreasePct} unit="%" onChange={setAnnualIncreasePct} fullWidth />
                </Row>
                <Row label="Operating" tooltipKey="operating" stacked>
                  <NumberInput value={operatingPct} unit="%" onChange={setOperatingPct} fullWidth />
                </Row>
              </Panel>
            )}

            {tab === 'jv' && (
              <Panel
                title="JV Structure"
                metric={`${jvType === 'equity' ? 'Equity' : 'Profit-share'} · ${landownerSharePct.toFixed(0)}% landowner`}
              >
                <Row label="JV Type" tooltipKey="jvType" stacked>
                  <div style={{ display: 'flex', gap: 4 }}>
                    {(['equity', 'profit_sharing'] as JvType[]).map((t) => (
                      <button
                        type="button"
                        key={t}
                        onClick={() => setJvType(t)}
                        style={{
                          padding: '6px 10px',
                          background: jvType === t ? 'rgba(200,169,110,0.2)' : 'transparent',
                          border: `1px solid ${jvType === t ? GOLD : LINE}`,
                          borderRadius: 6,
                          color: jvType === t ? GOLD : DIM,
                          fontSize: 10,
                          fontWeight: 700,
                          letterSpacing: '0.06em',
                          textTransform: 'uppercase',
                          cursor: 'pointer',
                        }}
                      >
                        {t === 'equity' ? 'Equity' : 'Profit'}
                      </button>
                    ))}
                  </div>
                </Row>
                <Row label="Land Contribution" tooltipKey="landownerLandContribution" stacked>
                  <NumberInput
                    value={landownerLandContribution}
                    unit="AED"
                    onChange={setLandownerLandContribution}
                    fullWidth
                  />
                </Row>
                <Row label="Cash Contribution" stacked>
                  <NumberInput value={landownerCash} unit="AED" onChange={setLandownerCash} fullWidth />
                </Row>
                <Row label="Landowner Share" tooltipKey="landownerSharePct" stacked>
                  <NumberInput value={landownerSharePct} unit="%" onChange={setLandownerSharePct} fullWidth />
                </Row>
              </Panel>
            )}

            {/* Detail panel — full result breakdown, collapsed by default. */}
            <Panel
              title="Detail"
              metric={
                tab === 'bts'
                  ? `Total inv ${fmtAedExact(btsResult.totalInvestmentAed)}`
                  : tab === 'btr'
                    ? `Total inv ${fmtAedExact(btrResult.totalInvestmentAed)}`
                    : `Total inv ${fmtAedExact(jv.totalInvestmentAed)}`
              }
            >
              {tab === 'bts' && (
                <>
                  <ResultRow label="Total Investment" value={fmtAedExact(btsResult.totalInvestmentAed)} bold />
                  <ResultRow label="Net Revenue" value={fmtAedExact(btsResult.netRevenueAed)} />
                  <ResultRow label="Gross Revenue" value={fmtAedExact(btsRevenue.grossRevenueAed)} />
                  <ResultRow
                    label={`- Commission (${commissionPct}%)`}
                    value={`-${fmtAedExact(btsRevenue.commissionAed)}`}
                  />
                  <ResultRow
                    label={`- Marketing (${marketingPct}%)`}
                    value={`-${fmtAedExact(btsRevenue.marketingAed)}`}
                  />
                  {/* Time-Value Returns (Sprint 9a) */}
                  <ResultRow label="Peak Equity" value={fmtAedExact(btsResult.peakEquityAed)} />
                  <ResultRow label="ROE (on equity)" value={btsResult.peakEquityAed > 0 ? fmtPct(btsResult.roePct) : '—'} bold />
                  <ResultRow
                    label={`IRR (annualised, ${btsResult.constructionMonths}mo)`}
                    value={Number.isFinite(btsResult.irrPct) ? fmtPct(btsResult.irrPct) : '—'}
                    bold
                    gold
                  />
                  <ResultRow label="NPV @ 10%" value={fmtAedExact(btsResult.npvAed)} />
                  {paymentMode === 'installments' && (
                    <>
                      <ResultRow label="Down Payment" value={fmtAedExact(land.downPaymentAed)} />
                      <ResultRow label="Monthly Installment" value={fmtAedExact(land.monthlyInstallmentAed)} />
                      <ResultRow label="Initial Capital" value={fmtAedExact(btsResult.initialCapitalAed)} bold />
                      <ResultRow
                        label="ROI on Initial"
                        value={fmtPct(btsResult.roiOnInitialCapitalPct)}
                        bold
                        gold
                      />
                    </>
                  )}
                </>
              )}
              {tab === 'btr' && (
                <>
                  <ResultRow label="Total Investment" value={fmtAedExact(btrResult.totalInvestmentAed)} bold />
                  <ResultRow label="Gross Annual" value={fmtAedExact(btrRental.grossAnnualAed)} />
                  <ResultRow
                    label={`- Operating (${operatingPct}%)`}
                    value={`-${fmtAedExact(btrRental.operatingCostAed)}`}
                  />
                  <ResultRow label="Net Annual" value={fmtAedExact(btrRental.netAnnualAed)} bold />
                  <ResultRow label="Total 5Y" value={fmtAedExact(btrResult.total5yAed)} bold gold />
                  {/* Time-Value Returns (Sprint 9a) */}
                  <ResultRow label="Peak Equity" value={fmtAedExact(btrResult.peakEquityAed)} />
                  <ResultRow label="ROE (yield-on-equity)" value={btrResult.peakEquityAed > 0 ? fmtPct(btrResult.roePct) : '—'} bold />
                  <ResultRow
                    label={`IRR (${btrResult.holdYears}y hold + ${btrResult.constructionMonths}mo build)`}
                    value={Number.isFinite(btrResult.irrPct) ? fmtPct(btrResult.irrPct) : '—'}
                    bold
                    gold
                  />
                  <ResultRow
                    label={`Exit value (cap @ ${btrResult.terminalCapRatePct}%)`}
                    value={fmtAedExact(btrResult.exitValueAed)}
                  />
                  <ResultRow label="NPV @ 10%" value={fmtAedExact(btrResult.npvAed)} />
                </>
              )}
              {tab === 'jv' && (
                <>
                  <ResultRow label="Total Investment" value={fmtAedExact(jv.totalInvestmentAed)} bold />
                  <ResultRow label="Total Revenue" value={fmtAedExact(jv.totalRevenueAed)} />
                  <ResultRow label="Net Profit" value={fmtAedExact(jv.totalProjectProfitAed)} bold />
                  <ResultRow label="Landowner Profit" value={fmtAedExact(jv.landownerProfitAed)} bold />
                  <ResultRow label="Developer Profit" value={fmtAedExact(jv.developerProfitAed)} bold />
                  <ResultRow
                    label="Breakeven JV Share"
                    value={`${jv.breakevenJvSharePct.toFixed(1)}%`}
                    bold
                    gold
                  />
                  {/* Time-Value Returns (Sprint 9a) */}
                  <ResultRow
                    label={`Project IRR (${jv.constructionMonths}mo)`}
                    value={Number.isFinite(jv.projectIrrPct) ? fmtPct(jv.projectIrrPct) : '—'}
                    bold
                    gold
                  />
                  <ResultRow
                    label="Landowner IRR"
                    value={Number.isFinite(jv.landownerIrrPct) ? fmtPct(jv.landownerIrrPct) : '—'}
                  />
                  <ResultRow
                    label="Developer IRR"
                    value={Number.isFinite(jv.developerIrrPct) ? fmtPct(jv.developerIrrPct) : '—'}
                  />
                </>
              )}
            </Panel>
          </>
        )}

        {/* Body — fullscreen layout (internal-test route + preview mode).
            Two-column inputs/results grid. Left intact from Sprint 1.5. */}
        {mode !== 'sidepanel' && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 0.95fr)',
            gap: 20,
          }}
        >
          {/* Inputs column */}
          <div style={shellStyle}>
            <SectionTitle>Area</SectionTitle>
            <Row label="Plot Area" tooltipKey="plotArea">
              <NumberInput value={plotAreaSqft} unit="sqft" readonly />
            </Row>
            <Row label="FAR" tooltipKey="far">
              <NumberInput value={far} readonly />
            </Row>
            <Row label="GFA" tooltipKey="gfa">
              <NumberInput value={Math.round(area.gfa)} unit="sqft" readonly />
            </Row>
            <Row
              label="BUA"
              tooltipKey="bua"
              badge={<DiffBadge current={buaRatio} baseline={1.85} onReset={() => setBuaRatio(1.85)} />}
            >
              <NumberInput
                value={buaManual}
                unit="sqft"
                onChange={(n) => {
                  setBuaManual(n);
                  if (area.gfa > 0) setBuaRatio(Number((n / area.gfa).toFixed(3)));
                }}
              />
            </Row>
            <Row label="BUA / GFA" tooltipKey="buaRatio">
              <NumberInput value={Number(buaRatio.toFixed(3))} onChange={(n) => {
                setBuaRatio(n);
                setBuaManual(Math.round(area.gfa * n));
              }} />
            </Row>
            <Row label="Efficiency" tooltipKey="efficiency">
              <NumberInput value={efficiencyPct} unit="%" onChange={setEfficiencyPct} />
            </Row>
            <Row label="SFA" tooltipKey="sfa">
              <NumberInput value={Math.round(area.sfa)} unit="sqft" readonly />
            </Row>

            <SectionTitle>Land</SectionTitle>
            <Row label="Land Cost" tooltipKey="landCost">
              <NumberInput value={landCostAed} unit="AED" onChange={setLandCostAed} widthPx={160} />
            </Row>
            <Row label="DLD Fee (4%)" tooltipKey="dldFee">
              <NumberInput value={Math.round(land.dldFeeAed)} unit="AED" readonly widthPx={160} />
            </Row>
            <Row label="Payment Mode" tooltipKey="paymentMode">
              <div style={{ display: 'flex', gap: 4 }}>
                {(['full', 'installments'] as LandPaymentMode[]).map((m) => (
                  <button
                    type="button"
                    key={m}
                    onClick={() => setPaymentMode(m)}
                    style={{
                      padding: '6px 10px',
                      background: paymentMode === m ? 'rgba(200,169,110,0.2)' : 'transparent',
                      border: `1px solid ${paymentMode === m ? GOLD : LINE}`,
                      borderRadius: 6,
                      color: paymentMode === m ? GOLD : DIM,
                      fontSize: 10,
                      fontWeight: 700,
                      letterSpacing: '0.06em',
                      textTransform: 'uppercase',
                      cursor: 'pointer',
                    }}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </Row>
            {paymentMode === 'installments' && (
              <>
                <Row label="Down Payment" tooltipKey="downPayment">
                  <NumberInput value={downPaymentPct} unit="%" onChange={setDownPaymentPct} />
                </Row>
                <Row label="# Payments" tooltipKey="numberOfPayments">
                  <NumberInput value={numberOfPayments} onChange={setNumberOfPayments} />
                </Row>
                <Row label="Period" tooltipKey="periodMonths">
                  <NumberInput value={periodMonths} unit="mo" onChange={setPeriodMonths} />
                </Row>
              </>
            )}

            <SectionTitle>Construction</SectionTitle>
            <Row
              label="Construction"
              tooltipKey="constructionPsf"
              badge={
                <DiffBadge
                  current={constructionPsf}
                  baseline={engine.constructionPsfBua}
                  onReset={resetConstruction}
                />
              }
            >
              <NumberInput value={constructionPsf} unit="AED/sqft" onChange={setConstructionPsf} widthPx={150} />
            </Row>
            <Row
              label="Brand & Coll."
              tooltipKey="brandPsf"
              badge={<DiffBadge current={brandPsf} baseline={engine.brandPsfBua} onReset={resetBrand} />}
            >
              <NumberInput value={brandPsf} unit="AED/sqft" onChange={setBrandPsf} widthPx={150} />
            </Row>
            <Row
              label="Consultancy"
              tooltipKey="consultancyPsf"
              badge={
                <DiffBadge
                  current={consultancyPsf}
                  baseline={engine.consultancyPsfBua}
                  onReset={resetConsultancy}
                />
              }
            >
              <NumberInput value={consultancyPsf} unit="AED/sqft" onChange={setConsultancyPsf} widthPx={150} />
            </Row>
            <Row
              label="Infrastructure"
              tooltipKey="infrastructurePsf"
              badge={
                <DiffBadge
                  current={infrastructurePsf}
                  baseline={engine.infrastructurePsfBua}
                  onReset={resetInfra}
                />
              }
            >
              <NumberInput value={infrastructurePsf} unit="AED/sqft" onChange={setInfrastructurePsf} widthPx={150} />
            </Row>
            <Row label="Contingency" tooltipKey="contingency">
              <NumberInput value={contingencyPct} unit="%" onChange={setContingencyPct} />
            </Row>

            <SectionTitle>Finance</SectionTitle>
            <Row label="Enable finance" tooltipKey="financeEnabled">
              <button
                type="button"
                onClick={() => setFinanceEnabled((b) => !b)}
                style={{
                  padding: '6px 14px',
                  background: financeEnabled ? 'rgba(200,169,110,0.2)' : 'transparent',
                  border: `1px solid ${financeEnabled ? GOLD : LINE}`,
                  borderRadius: 6,
                  color: financeEnabled ? GOLD : DIM,
                  fontSize: 10,
                  fontWeight: 700,
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                  cursor: 'pointer',
                }}
                aria-pressed={financeEnabled}
              >
                {financeEnabled ? 'On' : 'Off'}
              </button>
            </Row>
            {financeEnabled && (
              <>
                <Row label="Loan" tooltipKey="loanAed">
                  <NumberInput value={loanAed} unit="AED" onChange={setLoanAed} widthPx={160} />
                </Row>
                <Row label="Rate" tooltipKey="ratePct">
                  <NumberInput value={ratePct} unit="%" onChange={setRatePct} />
                </Row>
                <Row label="Period" tooltipKey="financePeriodMonths">
                  <NumberInput value={financePeriodMonths} unit="mo" onChange={setFinancePeriodMonths} />
                </Row>
              </>
            )}

            {tab === 'bts' && (
              <>
                <SectionTitle>BtS Revenue</SectionTitle>
                <Row
                  label="Sales Price"
                  tooltipKey="salesPsf"
                  badge={<DiffBadge current={salesPsf} baseline={engine.salesPsfSfa} onReset={resetSales} />}
                >
                  <NumberInput value={salesPsf} unit="AED/sqft" onChange={setSalesPsf} widthPx={150} />
                </Row>
                <Row label="Commission" tooltipKey="commission">
                  <NumberInput value={commissionPct} unit="%" onChange={setCommissionPct} />
                </Row>
                <Row label="Marketing" tooltipKey="marketing">
                  <NumberInput value={marketingPct} unit="%" onChange={setMarketingPct} />
                </Row>
                <Row label="Dev Services" tooltipKey="devServices">
                  <NumberInput value={devServicesPct} unit="%" onChange={setDevServicesPct} />
                </Row>
              </>
            )}

            {tab === 'btr' && (
              <>
                <SectionTitle>BtR Rental</SectionTitle>
                <Row
                  label="Monthly Rent"
                  tooltipKey="monthlyRent"
                  badge={
                    <DiffBadge
                      current={monthlyRentPsf}
                      baseline={engine.monthlyRentPsfSfa}
                      onReset={resetRent}
                    />
                  }
                >
                  <NumberInput value={monthlyRentPsf} unit="AED/sqft" onChange={setMonthlyRentPsf} widthPx={150} />
                </Row>
                <Row label="Occupancy" tooltipKey="occupancy">
                  <NumberInput value={occupancyPct} unit="%" onChange={setOccupancyPct} />
                </Row>
                <Row label="Annual Increase" tooltipKey="annualIncrease">
                  <NumberInput value={annualIncreasePct} unit="%" onChange={setAnnualIncreasePct} />
                </Row>
                <Row label="Operating" tooltipKey="operating">
                  <NumberInput value={operatingPct} unit="%" onChange={setOperatingPct} />
                </Row>
              </>
            )}

            {tab === 'jv' && (
              <>
                <SectionTitle>JV Structure</SectionTitle>
                <Row label="JV Type" tooltipKey="jvType">
                  <div style={{ display: 'flex', gap: 4 }}>
                    {(['equity', 'profit_sharing'] as JvType[]).map((t) => (
                      <button
                        type="button"
                        key={t}
                        onClick={() => setJvType(t)}
                        style={{
                          padding: '6px 10px',
                          background: jvType === t ? 'rgba(200,169,110,0.2)' : 'transparent',
                          border: `1px solid ${jvType === t ? GOLD : LINE}`,
                          borderRadius: 6,
                          color: jvType === t ? GOLD : DIM,
                          fontSize: 10,
                          fontWeight: 700,
                          letterSpacing: '0.06em',
                          textTransform: 'uppercase',
                          cursor: 'pointer',
                        }}
                      >
                        {t === 'equity' ? 'Equity' : 'Profit'}
                      </button>
                    ))}
                  </div>
                </Row>
                <Row label="Land Contribution" tooltipKey="landownerLandContribution">
                  <NumberInput
                    value={landownerLandContribution}
                    unit="AED"
                    onChange={setLandownerLandContribution}
                    widthPx={160}
                  />
                </Row>
                <Row label="Cash Contribution">
                  <NumberInput value={landownerCash} unit="AED" onChange={setLandownerCash} widthPx={160} />
                </Row>
                <Row label="Landowner Share" tooltipKey="landownerSharePct">
                  <NumberInput value={landownerSharePct} unit="%" onChange={setLandownerSharePct} />
                </Row>
              </>
            )}
          </div>

          {/* Results column */}
          <div style={shellStyle}>
            {landPriceMissing && (
              <div
                role="status"
                style={{
                  padding: '16px 18px',
                  border: `1px solid ${GOLD}`,
                  borderRadius: 8,
                  background: 'rgba(200, 169, 110, 0.08)',
                  color: GOLD,
                  fontSize: 12,
                  lineHeight: 1.55,
                }}
              >
                <div
                  style={{
                    fontWeight: 700,
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                    marginBottom: 6,
                  }}
                >
                  Land price not set
                </div>
                <div style={{ color: 'rgba(255,255,255,0.82)' }}>
                  This plot has no price on record, so there is nothing to base a
                  return on. Enter a <b>Land Cost</b> on the left and the full
                  result — Net Profit, ROI, IRR and the verdict — appears
                  immediately.
                </div>
                <div style={{ color: 'rgba(255,255,255,0.55)', marginTop: 8, fontSize: 11 }}>
                  Results are hidden rather than shown with land at AED 0, which
                  would report a healthy return on a plot nobody has priced.
                </div>
              </div>
            )}
            {!landPriceMissing && tab === 'bts' && (
              <>
                <SectionTitle>Build to Sell — Result</SectionTitle>
                <ResultRow label="Total Investment" value={fmtAedExact(btsResult.totalInvestmentAed)} bold />
                <ResultRow label="Net Revenue" value={fmtAedExact(btsResult.netRevenueAed)} bold />
                <ResultRow
                  label="Net Profit"
                  value={fmtAedExact(btsResult.netProfitAed)}
                  hero
                  gold={btsResult.netProfitAed > 0}
                />
                <ResultRow label="ROI" value={fmtPct(btsResult.roiPct)} bold gold />
                <ResultRow label="Profit / sqft SFA" value={fmtAedExact(btsResult.profitPerSqftSfa)} />
                <div
                  style={{
                    marginTop: 12,
                    padding: '8px 12px',
                    border: `1px solid ${btsV.color}`,
                    borderRadius: 8,
                    color: btsV.color,
                    fontSize: 11,
                    fontWeight: 700,
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                    textAlign: 'center',
                    background: 'rgba(255,255,255,0.02)',
                  }}
                >
                  IRR · {btsV.label}
                </div>
                {paymentMode === 'installments' && (
                  <>
                    <SectionTitle>Payment plan</SectionTitle>
                    <ResultRow label="Down Payment" value={fmtAedExact(land.downPaymentAed)} />
                    <ResultRow label="Remaining" value={fmtAedExact(land.remainingAed)} />
                    <ResultRow label="Monthly Installment" value={fmtAedExact(land.monthlyInstallmentAed)} />
                    <ResultRow label="Initial Capital" value={fmtAedExact(btsResult.initialCapitalAed)} bold />
                    <ResultRow
                      label="ROI on Initial"
                      value={fmtPct(btsResult.roiOnInitialCapitalPct)}
                      bold
                      gold
                    />
                  </>
                )}
              </>
            )}

            {!landPriceMissing && tab === 'btr' && (
              <>
                <SectionTitle>Build to Rent — Result</SectionTitle>
                <ResultRow label="Total Investment" value={fmtAedExact(btrResult.totalInvestmentAed)} bold />
                <ResultRow label="Gross Annual" value={fmtAedExact(btrRental.grossAnnualAed)} />
                <ResultRow
                  label={`- Operating (${operatingPct}%)`}
                  value={`-${fmtAedExact(btrRental.operatingCostAed)}`}
                />
                <ResultRow label="Net Annual" value={fmtAedExact(btrRental.netAnnualAed)} bold />
                <ResultRow label="Yield" value={fmtPct(btrResult.yieldPct)} hero gold />
                <ResultRow label="Payback (years)" value={btrResult.paybackYears.toFixed(1)} bold />
                <ResultRow label="Monthly Cash Flow" value={fmtAedExact(btrResult.monthlyCashFlowAed)} />
                <div
                  style={{
                    marginTop: 12,
                    padding: '8px 12px',
                    border: `1px solid ${btrV.color}`,
                    borderRadius: 8,
                    color: btrV.color,
                    fontSize: 11,
                    fontWeight: 700,
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                    textAlign: 'center',
                    background: 'rgba(255,255,255,0.02)',
                  }}
                >
                  IRR · {btrV.label}
                </div>

                <SectionTitle>5-Year Projection</SectionTitle>
                {btrResult.projection5y.map((p) => (
                  <ResultRow
                    key={p.year}
                    label={`Year ${p.year}`}
                    value={`${fmtAedExact(p.incomeAed)}  (cum: ${fmtAedExact(p.cumulativeAed)})`}
                  />
                ))}
                <ResultRow label="Total 5Y" value={fmtAedExact(btrResult.total5yAed)} bold gold />
              </>
            )}

            {!landPriceMissing && tab === 'jv' && (
              <>
                <SectionTitle>Joint Venture — Result</SectionTitle>
                <ResultRow label="Total Investment" value={fmtAedExact(jv.totalInvestmentAed)} />
                <ResultRow label="Total Revenue" value={fmtAedExact(jv.totalRevenueAed)} />
                <ResultRow label="Total Net Profit" value={fmtAedExact(jv.totalProjectProfitAed)} bold />
                <ResultRow label="Project ROI" value={fmtPct(jv.projectRoiPct)} bold gold />

                <SectionTitle>Landowner</SectionTitle>
                <ResultRow label="Total Contribution" value={fmtAedExact(jv.landownerTotalContribution)} />
                <ResultRow label="Profit Share" value={`${jv.landownerSharePct.toFixed(1)}%`} />
                <ResultRow label="Net Profit" value={fmtAedExact(jv.landownerProfitAed)} hero gold />
                <ResultRow label="ROI on Contribution" value={fmtPct(jv.landownerRoiPct)} bold />

                <SectionTitle>Developer</SectionTitle>
                <ResultRow label="Cash Contribution" value={fmtAedExact(developerCashAuto)} />
                <ResultRow label="Profit Share" value={`${jv.developerSharePct.toFixed(1)}%`} />
                <ResultRow label="Net Profit" value={fmtAedExact(jv.developerProfitAed)} hero gold />
                <ResultRow label="ROI on Contribution" value={fmtPct(jv.developerRoiPct)} bold />

                <SectionTitle>Sell vs JV (Landowner)</SectionTitle>
                {jv.sellVsJv.map((s) => (
                  <ResultRow
                    key={s.sharePct}
                    label={`@ ${s.sharePct}%`}
                    value={`${fmtAedExact(s.jvProfitAed)}  (Δ ${s.vsSellDeltaAed >= 0 ? '+' : ''}${fmtAedExact(s.vsSellDeltaAed)})`}
                  />
                ))}
                <ResultRow
                  label="Breakeven JV Share"
                  value={`${jv.breakevenJvSharePct.toFixed(1)}%`}
                  bold
                  gold
                />
              </>
            )}
          </div>
        </div>
        )}

        {/* Developer footer — fullscreen / preview only. Production
            SidePanel hides this; PDF footer (Sprint 9) carries the version
            metadata instead. */}
        {mode !== 'sidepanel' && (
          <div
            style={{
              color: SUBTLE,
              fontSize: 10,
              textAlign: 'center',
              marginTop: 24,
              lineHeight: 1.6,
            }}
          >
            Math reused from <code style={{ color: GOLD }}>src/lib/feasibility.ts</code> (v5 ratified). Engine
            defaults from <code style={{ color: GOLD }}>docs/specs/feasibility-v6/01_LAND_USE_ENGINES.md</code>.
            <br />
            Tooltips EN-only · 30 fields · institutional reference in 07_METHODOLOGY.md · Mock parcels are
            in-memory.
          </div>
        )}
      </div>
    </div>
  );
}
