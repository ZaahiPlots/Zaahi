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
  computeBtS,
  btsVerdict,
  deriveBtRRental,
  computeBtR,
  btrVerdict,
  computeJv,
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
import FieldLabel from './FieldLabel';
import DiffBadge from './DiffBadge';
import EngineSelector from './EngineSelector';
import FullscreenToggle from './FullscreenToggle';

// ── Palette (CLAUDE.md UI STYLE GUIDE) ───────────────────────────────
const GOLD = '#C8A96E';
const NAVY = '#1A1A2E';
const TXT = '#f5f1e8';
const DIM = 'rgba(245, 241, 232, 0.70)';
const SUBTLE = 'rgba(245, 241, 232, 0.55)';
const LINE = 'rgba(200, 169, 110, 0.15)';
const LINE_HARD = 'rgba(200, 169, 110, 0.30)';

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
function NumberInput({
  value,
  onChange,
  unit,
  readonly,
  widthPx,
}: {
  value: number;
  onChange?: (n: number) => void;
  unit?: string;
  readonly?: boolean;
  widthPx?: number;
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
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        padding: '6px 10px',
        background: readonly ? 'transparent' : 'rgba(255,255,255,0.04)',
        border: readonly ? '1px solid transparent' : `1px solid ${LINE}`,
        borderRadius: 8,
        transition: 'border-color 150ms ease, background 150ms ease',
        minWidth: widthPx ?? 130,
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
function Row({
  label,
  tooltipKey,
  badge,
  children,
}: {
  label: string;
  tooltipKey?: string;
  badge?: React.ReactNode;
  children: React.ReactNode;
}) {
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

// ── Main calculator component ────────────────────────────────────────
export interface FeasibilityV6CalculatorProps {
  parcel: ParcelInput;
  // Optional banner override — preview route uses the RED warning, production
  // SidePanel + internal-test full-screen route omit it. Default = preview.
  banner?: 'preview' | 'none';
  // Layout density. 'sidepanel' (~350 px wide) is the canonical production
  // mode mounted inside /parcels/map SidePanel post-Sprint-1.5; 'fullscreen'
  // is the wider two-column layout for the internal-test route + Sprint 7's
  // viewport-overlay toggle. Default = fullscreen for backward compat with
  // the preview + internal-test route. Sprint 1.6 will refine the sidepanel
  // mode with at-a-glance hierarchy (verdict block sticky, panels collapsed).
  mode?: 'sidepanel' | 'fullscreen';
}

export default function FeasibilityV6Calculator({
  parcel,
  banner = 'preview',
  mode = 'fullscreen',
}: FeasibilityV6CalculatorProps) {
  const [engineId, setEngineId] = useState<EngineId>(defaultEngineFor(parcel.landUse));
  const engine = ENGINES[engineId];

  // Tab + fullscreen
  const [tab, setTab] = useState<Tab>('bts');
  const [fullscreen, setFullscreen] = useState(false);

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
  const [paymentMode, setPaymentMode] = useState<LandPaymentMode>('full');
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

  const btsRevenue = useMemo(
    () =>
      deriveBtSRevenue(
        {
          salesPricePsfSfa: dSales,
          commissionPct: dComm,
          marketingPct: dMkt,
          devServicesPct: dDev,
        },
        area.sfa,
      ),
    [dSales, dComm, dMkt, dDev, area.sfa],
  );

  const btsResult = useMemo(
    () => computeBtS(area, land, construction, finance, btsRevenue, paymentMode),
    [area, land, construction, finance, btsRevenue, paymentMode],
  );

  const btrRental = useMemo(
    () =>
      deriveBtRRental(
        {
          monthlyRentPsfSfa: dRent,
          occupancyPct: dOcc,
          annualIncreasePct: dAnn,
          operatingPct: dOp,
        },
        area.sfa,
      ),
    [dRent, dOcc, dAnn, dOp, area.sfa],
  );

  const btrResult = useMemo(
    () => computeBtR(land, construction, finance, btrRental, dAnn),
    [land, construction, finance, btrRental, dAnn],
  );

  const developerCashAuto =
    construction.totalConstructionAed + finance.totalInterestAed + land.dldFeeAed;

  const jv = useMemo(
    () =>
      computeJv(
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
      ),
    [jvType, dLoCont, dLoCash, developerCashAuto, dLoShare, land, construction, finance, btsRevenue],
  );

  const btsV = btsVerdict(btsResult.roiPct);
  const btrV = btrVerdict(btrResult.yieldPct);

  // ── PDF export (jsPDF, no weasyprint)
  const downloadPDF = useCallback(() => {
    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    const W = 210;
    const M = 15;
    let y = 15;
    const gold: [number, number, number] = [200, 169, 110];
    const dark: [number, number, number] = [26, 26, 46];
    const gray: [number, number, number] = [107, 114, 128];
    const red: [number, number, number] = [230, 57, 70];

    const footer = () => {
      doc.setFontSize(6.5);
      doc.setTextColor(...gray);
      doc.setFont('helvetica', 'normal');
      doc.text(
        'ZAAHI Real Estate OS — Feasibility v6.0 INTERNAL PREVIEW — Confidential — DO NOT SHARE EXTERNALLY',
        W / 2,
        290,
        { align: 'center' },
      );
    };
    const check = (need: number) => {
      if (y + need > 275) {
        doc.addPage();
        y = 15;
        footer();
      }
    };
    const h1 = (t: string) => {
      check(12);
      doc.setFontSize(13);
      doc.setTextColor(...gold);
      doc.setFont('helvetica', 'bold');
      doc.text(t, M, y);
      y += 7;
    };
    const h2 = (t: string) => {
      check(10);
      doc.setFontSize(10);
      doc.setTextColor(...gold);
      doc.setFont('helvetica', 'bold');
      doc.text(t, M, y);
      y += 5;
    };
    const row = (l: string, v: string, bold = false) => {
      check(6);
      doc.setFontSize(9);
      doc.setFont('helvetica', bold ? 'bold' : 'normal');
      doc.setTextColor(...gray);
      doc.text(l, M, y);
      doc.setTextColor(...dark);
      doc.text(v, W - M, y, { align: 'right' });
      y += 5;
    };

    footer();

    // Cover banner
    doc.setFillColor(...red);
    doc.rect(0, 0, W, 8, 'F');
    doc.setFontSize(7);
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.text('INTERNAL PREVIEW · v6.0 spec rev-2 · DO NOT SHARE EXTERNALLY', W / 2, 5.5, { align: 'center' });
    y = 18;

    doc.setFontSize(20);
    doc.setTextColor(...gold);
    doc.setFont('helvetica', 'bold');
    doc.text('ZAAHI Feasibility v6.0', M, y);
    y += 8;
    doc.setFontSize(9);
    doc.setTextColor(...gray);
    doc.setFont('helvetica', 'normal');
    doc.text(
      `Generated ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })} — Engine: ${engine.label}`,
      M,
      y,
    );
    y += 6;

    h1('PARCEL');
    row('Plot Number', parcel.plotNumber);
    row('District', parcel.district);
    if (parcel.community) row('Community', parcel.community);
    if (parcel.projectName) row('Project', parcel.projectName);
    if (parcel.masterDeveloper) row('Master Developer', parcel.masterDeveloper);
    row('Land Use', parcel.landUse);
    row('Plot Area', `${fmtInt(plotAreaSqft)} sqft`);
    row('FAR', far.toFixed(2));
    row('GFA', `${fmtInt(area.gfa)} sqft`);
    row('BUA', `${fmtInt(area.bua)} sqft (ratio ${area.buaGfaRatio.toFixed(2)})`);
    row('Efficiency', `${efficiencyPct.toFixed(1)}%`);
    row('SFA', `${fmtInt(area.sfa)} sqft`);
    row('Listed Price', fmtAedExact(parcel.plotPriceAed));
    y += 3;

    h1('BUILD-TO-SELL');
    h2('Costs');
    row('Land Cost', fmtAedExact(land.landCostAed));
    row('DLD Registration (4%)', fmtAedExact(land.dldFeeAed));
    row('Construction (base)', fmtAedExact(construction.constructionAed));
    row('Brand & Collaboration', fmtAedExact(construction.brandAed));
    row('Consultancy', fmtAedExact(construction.consultancyAed));
    row('Infrastructure', fmtAedExact(construction.infrastructureAed));
    row(`Contingency (${contingencyPct}%)`, fmtAedExact(construction.contingencyAed));
    if (financeEnabled) row('Finance Cost', fmtAedExact(finance.totalInterestAed));
    row('TOTAL INVESTMENT', fmtAedExact(btsResult.totalInvestmentAed), true);
    y += 2;
    h2('Revenue');
    row('SFA', `${fmtInt(area.sfa)} sqft`);
    row('Sales Price', `AED ${fmtInt(salesPsf)} / sqft SFA`);
    row('Gross Revenue', fmtAedExact(btsRevenue.grossRevenueAed));
    row(`- Commission (${commissionPct}%)`, `-${fmtAedExact(btsRevenue.commissionAed)}`);
    row(`- Marketing (${marketingPct}%)`, `-${fmtAedExact(btsRevenue.marketingAed)}`);
    row(`- Developer Services (${devServicesPct}%)`, `-${fmtAedExact(btsRevenue.devServicesAed)}`);
    row('NET REVENUE', fmtAedExact(btsResult.netRevenueAed), true);
    y += 2;
    h2('Profit');
    row('NET PROFIT', fmtAedExact(btsResult.netProfitAed), true);
    row('ROI', fmtPct(btsResult.roiPct));
    row('Profit / sqft SFA', fmtAedExact(btsResult.profitPerSqftSfa));
    row('Verdict', btsV.label);

    doc.addPage();
    y = 15;
    footer();
    h1('BUILD-TO-RENT');
    row('Total Investment', fmtAedExact(btrResult.totalInvestmentAed), true);
    row('Monthly Rent psf SFA', `AED ${fmtInt(monthlyRentPsf)}`);
    row(`Occupancy`, `${occupancyPct}%`);
    row('Gross Annual', fmtAedExact(btrRental.grossAnnualAed), true);
    row(`- Operating (${operatingPct}%)`, `-${fmtAedExact(btrRental.operatingCostAed)}`);
    row('NET ANNUAL', fmtAedExact(btrRental.netAnnualAed), true);
    row('YIELD', fmtPct(btrResult.yieldPct), true);
    row('Payback (years)', btrResult.paybackYears.toFixed(1));
    row('Verdict', btrV.label);

    doc.addPage();
    y = 15;
    footer();
    h1(`JOINT VENTURE — ${jvType === 'equity' ? 'Equity' : 'Profit Sharing'}`);
    row('Total Investment', fmtAedExact(jv.totalInvestmentAed));
    row('Total Revenue', fmtAedExact(jv.totalRevenueAed));
    row('Total Net Profit', fmtAedExact(jv.totalProjectProfitAed), true);
    row('Project ROI', fmtPct(jv.projectRoiPct));
    y += 2;
    h2('Landowner');
    row('Land Contribution', fmtAedExact(dLoCont));
    row('Cash', fmtAedExact(dLoCash));
    row('Profit Share', `${jv.landownerSharePct.toFixed(1)}%`);
    row('Net Profit', fmtAedExact(jv.landownerProfitAed), true);
    row('ROI on Contribution', fmtPct(jv.landownerRoiPct));
    y += 2;
    h2('Developer');
    row('Cash', fmtAedExact(developerCashAuto));
    row('Profit Share', `${jv.developerSharePct.toFixed(1)}%`);
    row('Net Profit', fmtAedExact(jv.developerProfitAed), true);
    row('ROI on Contribution', fmtPct(jv.developerRoiPct));

    doc.save(
      `ZAAHI-v6-Preview-${parcel.plotNumber}-${engine.label.replace(/\s+/g, '_')}-${new Date().toISOString().slice(0, 10)}.pdf`,
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
    contingencyPct,
    finance,
    financeEnabled,
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
    btrV,
    jv,
    jvType,
    dLoCont,
    dLoCash,
    developerCashAuto,
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
    background: 'rgba(10, 22, 40, 0.5)',
    backdropFilter: 'blur(24px) saturate(150%)',
    WebkitBackdropFilter: 'blur(24px) saturate(150%)',
    border: `1px solid ${LINE_HARD}`,
    borderRadius: 16,
    color: TXT,
    boxShadow: '0 12px 32px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
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
          padding: fullscreen ? 0 : '24px 24px 64px 24px',
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
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
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
          maxWidth: mode === 'sidepanel' ? '100%' : fullscreen ? '100%' : 1280,
          margin: '0 auto',
          padding:
            mode === 'sidepanel'
              ? 0
              : fullscreen
                ? '24px 24px 64px 24px'
                : '24px 0 0 0',
        }}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 16,
            marginBottom: 20,
          }}
        >
          <div>
            <div
              style={{
                fontFamily: 'Georgia, serif',
                fontSize: 26,
                fontWeight: 700,
                color: GOLD,
                letterSpacing: '-0.01em',
              }}
            >
              ZAAHI Feasibility v6.0
            </div>
            <div style={{ color: SUBTLE, fontSize: 12, marginTop: 2 }}>
              {banner === 'preview'
                ? 'Localhost preview · 13 engines · live diff badges · jsPDF export'
                : '13 engines · live diff badges · jsPDF export'}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <FullscreenToggle active={fullscreen} onToggle={() => setFullscreen((f) => !f)} />
            <button
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
              Export PDF
            </button>
          </div>
        </div>

        {/* Selectors */}
        <div
          style={{
            ...shellStyle,
            display: 'grid',
            gridTemplateColumns: mode === 'sidepanel' ? '1fr' : '1fr 1fr',
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
          <EngineSelector value={engineId} onChange={setEngineId} />
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          {tabBtn('bts', 'Build to Sell')}
          {tabBtn('btr', 'Build to Rent')}
          {tabBtn('jv', 'Joint Venture')}
        </div>

        {/* Body — two column on wide screens */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns:
              mode === 'sidepanel'
                ? '1fr' // single column on narrow SidePanel; inputs above results
                : fullscreen
                  ? '1fr 1fr'
                  : 'minmax(0, 1fr) minmax(0, 0.95fr)',
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
            {tab === 'bts' && (
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
                  Verdict: {btsV.label}
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

            {tab === 'btr' && (
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
                  Verdict: {btrV.label}
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

            {tab === 'jv' && (
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

        {/* Footer */}
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
      </div>
    </div>
  );
}
