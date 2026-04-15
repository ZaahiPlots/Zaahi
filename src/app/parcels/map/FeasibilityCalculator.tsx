"use client";
import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { jsPDF } from "jspdf";
import {
  deriveArea, deriveLand, deriveConstruction, deriveFinance,
  deriveBtSRevenue, computeBtS, btsVerdict,
  deriveBtRRental, computeBtR, btrVerdict,
  computeJv,
  fmtAed, fmtAedExact, fmtPct, fmtInt,
  parseNumberInput, fmtInputNumber,
  type LandPaymentMode, type JvType,
} from "@/lib/feasibility";

/* ═══════════════════════════════════════════════════════════════════
   ZAAHI FEASIBILITY CALCULATOR v5.0
   Three tabs: BUILD-TO-SELL · BUILD-TO-RENT · JOINT VENTURE
   BUA-based construction · SFA-based revenue · land payment plans.
   Number inputs only (no sliders). Flat glassmorphism — no nested cards.
   ═══════════════════════════════════════════════════════════════════ */

// ── Palette (ZAAHI Style Guide) ─────────────────────────────────────
const GOLD = "#C8A96E";
const TXT = "#FFFFFF";
const DIM = "rgba(255,255,255,0.70)";
const SUBTLE = "rgba(255,255,255,0.55)";
const LINE = "rgba(255,255,255,0.10)";
const GREEN = "#4CAF50";
const GRAY = "#888888";

// ── Props (kept identical to v4 for SidePanel compat) ──────────────
interface Props {
  plotAreaSqft: number;
  plotPriceAed: number;
  gfaSqft: number;
  far: number | null;
  landUse: string;
  landUseMix?: Array<{ category: string; sub: string; areaSqm?: number | null }> | null;
  maxFloors?: number | null;
  community?: string | null;
  plotNumber?: string | null;
  district?: string | null;
  projectName?: string | null;
  masterDeveloper?: string | null;
  maxHeightCode?: string | null;
  // New (optional) — lets SidePanel wire its existing OfferModal.
  onStartNegotiation?: () => void;
}

type Tab = "bts" | "btr" | "jv";

// ── Debounce hook (300 ms per spec) ─────────────────────────────────
function useDebounced<T>(value: T, ms = 300): T {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}

// ── Number input with thousand separators ───────────────────────────
function NumberInput({
  value, onChange, unit, placeholder, readonly, step, widthPx,
}: {
  value: number;
  onChange?: (n: number) => void;
  unit?: string;
  placeholder?: string;
  readonly?: boolean;
  step?: number;
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
        display: "flex",
        alignItems: "center",
        gap: 6,
        padding: "6px 10px",
        background: readonly ? "transparent" : "rgba(255,255,255,0.04)",
        border: readonly ? "1px solid transparent" : `1px solid ${LINE}`,
        borderRadius: 8,
        transition: "border-color 150ms ease, background 150ms ease",
        minWidth: widthPx ?? 120,
      }}
      onFocus={(e) => { (e.currentTarget as HTMLDivElement).style.borderColor = GOLD; }}
      onBlur={(e) => { (e.currentTarget as HTMLDivElement).style.borderColor = readonly ? "transparent" : LINE; }}
    >
      <input
        type="text"
        inputMode="decimal"
        readOnly={readonly}
        value={focused ? raw : fmtInputNumber(value)}
        placeholder={placeholder}
        onFocus={(e) => { setFocused(true); setRaw(String(value === 0 && placeholder ? "" : value)); e.currentTarget.select(); }}
        onBlur={() => { setFocused(false); onChange?.(parseNumberInput(raw)); }}
        onChange={(e) => {
          const s = e.target.value;
          setRaw(s);
          if (onChange) onChange(parseNumberInput(s));
        }}
        step={step}
        style={{
          flex: 1,
          width: "100%",
          background: "transparent",
          border: "none",
          outline: "none",
          color: readonly ? DIM : TXT,
          fontFamily: "inherit",
          fontSize: 13,
          textAlign: "right",
          padding: 0,
        }}
      />
      {unit && (
        <span style={{ color: SUBTLE, fontSize: 10, letterSpacing: 0.5, whiteSpace: "nowrap" }}>{unit}</span>
      )}
    </div>
  );
}

// ── Row: label + input ──────────────────────────────────────────────
function Row({
  label, hint, children,
}: {
  label: string; hint?: string; children: React.ReactNode;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 3, padding: "7px 0", borderBottom: `1px solid ${LINE}` }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
        <label style={{ flex: 1, color: DIM, fontSize: 11, letterSpacing: 0.3 }}>{label}</label>
        <div style={{ flexShrink: 0 }}>{children}</div>
      </div>
      {hint && <div style={{ color: SUBTLE, fontSize: 10, fontStyle: "italic" }}>{hint}</div>}
    </div>
  );
}

// ── Result row (label left / value right) ──────────────────────────
function ResultRow({
  label, value, bold, hero, gold, dim,
}: {
  label: string; value: string; bold?: boolean; hero?: boolean; gold?: boolean; dim?: boolean;
}) {
  const size = hero ? 22 : bold ? 14 : 12;
  const weight: React.CSSProperties["fontWeight"] = hero ? 800 : bold ? 700 : 400;
  const color = gold ? GOLD : dim ? SUBTLE : TXT;
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", padding: "5px 0", gap: 10 }}>
      <span style={{ color: DIM, fontSize: hero ? 12 : 11, letterSpacing: hero ? 0.5 : 0.2, textTransform: hero ? "uppercase" as const : "none" }}>{label}</span>
      <span style={{ color, fontSize: size, fontWeight: weight, letterSpacing: hero ? "-0.02em" : 0, fontVariantNumeric: "tabular-nums" }}>{value}</span>
    </div>
  );
}

// ── Collapsible section ─────────────────────────────────────────────
function Section({
  title, children, defaultOpen = true, lockOpen = false,
}: {
  title: string; children: React.ReactNode; defaultOpen?: boolean; lockOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const isOpen = lockOpen || open;
  return (
    <div style={{ borderTop: `1px solid ${LINE}`, padding: "10px 0" }}>
      <button
        type="button"
        onClick={() => !lockOpen && setOpen((o) => !o)}
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          background: "transparent",
          border: "none",
          color: GOLD,
          fontFamily: "Georgia, serif",
          fontSize: 11,
          fontWeight: 700,
          textTransform: "uppercase",
          letterSpacing: "0.08em",
          cursor: lockOpen ? "default" : "pointer",
          padding: 0,
          textAlign: "left",
        }}
      >
        <span>{title}</span>
        {!lockOpen && <span style={{ color: SUBTLE }}>{isOpen ? "▾" : "▸"}</span>}
      </button>
      {isOpen && <div style={{ marginTop: 8, display: "flex", flexDirection: "column" }}>{children}</div>}
    </div>
  );
}

// ── Land-use → default construction & sales values ──────────────────
// Only the 9 canonical categories — no new ones introduced.
function mapCategoryToDefaults(cat: string) {
  const c = cat.toUpperCase().trim();
  // Construction default ~500 AED/sqft BUA per spec. We vary brand/sales
  // per category to give useful starting points — user can overwrite.
  if (c.includes("RESIDENTIAL")) return { construction: 500, brand: 0, sales: 1800, rent: 100 };
  if (c.includes("COMMERCIAL")) return { construction: 580, brand: 0, sales: 2200, rent: 160 };
  if (c.includes("MIXED")) return { construction: 520, brand: 0, sales: 1700, rent: 140 };
  if (c.includes("HOTEL") || c.includes("HOSPITAL") && c.includes("HOSPITALITY")) return { construction: 1200, brand: 100, sales: 0, rent: 0 };
  if (c.includes("HOTEL")) return { construction: 1200, brand: 100, sales: 0, rent: 0 };
  if (c.includes("INDUSTRIAL") || c.includes("WAREHOUSE")) return { construction: 150, brand: 0, sales: 400, rent: 55 };
  if (c.includes("EDUCATIONAL")) return { construction: 380, brand: 0, sales: 0, rent: 0 };
  if (c.includes("HEALTHCARE")) return { construction: 850, brand: 0, sales: 0, rent: 0 };
  if (c.includes("AGRICULTURAL") || c.includes("FARM")) return { construction: 45, brand: 0, sales: 0, rent: 0 };
  if (c.includes("FUTURE")) return { construction: 500, brand: 0, sales: 1500, rent: 90 };
  return { construction: 500, brand: 0, sales: 1800, rent: 100 };
}

// ─────────────────────────────────────────────────────────────────────

export default function FeasibilityCalculator(props: Props) {
  const [tab, setTab] = useState<Tab>("bts");

  const defaults = useMemo(() => mapCategoryToDefaults(props.landUse ?? ""), [props.landUse]);

  // ── Area (shared across all tabs) ────────────────────────────────
  const plotAreaSqft = props.plotAreaSqft || 0;
  const far = props.far && props.far > 0 ? props.far : (plotAreaSqft > 0 && props.gfaSqft > 0 ? props.gfaSqft / plotAreaSqft : 2.5);
  const gfaAuto = plotAreaSqft * far;

  // BUA (input) — user can enter BUA directly OR change ratio
  const [buaRatio, setBuaRatio] = useState<number>(1.85);
  const [buaManual, setBuaManual] = useState<number>(Math.round(gfaAuto * 1.85));
  const [efficiencyPct, setEfficiencyPct] = useState<number>(80);

  // Re-seed BUA whenever plot/far change (new parcel loaded)
  const seedRef = useRef<string>("");
  useEffect(() => {
    const k = `${plotAreaSqft}|${far}`;
    if (seedRef.current !== k) {
      seedRef.current = k;
      setBuaManual(Math.round(gfaAuto * 1.85));
      setBuaRatio(1.85);
    }
  }, [plotAreaSqft, far, gfaAuto]);

  // ── Land ─────────────────────────────────────────────────────────
  const [landCostAed, setLandCostAed] = useState<number>(props.plotPriceAed || 0);
  useEffect(() => { setLandCostAed(props.plotPriceAed || 0); }, [props.plotPriceAed]);
  const [paymentMode, setPaymentMode] = useState<LandPaymentMode>("full");
  const [downPaymentPct, setDownPaymentPct] = useState(30);
  const [numberOfPayments, setNumberOfPayments] = useState(8);
  const [periodMonths, setPeriodMonths] = useState(24);

  // ── Construction ─────────────────────────────────────────────────
  const [constructionPsf, setConstructionPsf] = useState<number>(defaults.construction);
  const [brandPsf, setBrandPsf] = useState<number>(defaults.brand);
  const [consultancyPsf, setConsultancyPsf] = useState<number>(20);
  const [infrastructurePsf, setInfrastructurePsf] = useState<number>(20);
  const [contingencyPct, setContingencyPct] = useState<number>(5);

  // Re-seed construction defaults when the parcel's land-use changes
  useEffect(() => {
    setConstructionPsf(defaults.construction);
    setBrandPsf(defaults.brand);
  }, [defaults.construction, defaults.brand]);

  // ── Finance ──────────────────────────────────────────────────────
  const [financeEnabled, setFinanceEnabled] = useState(false);
  const [loanAed, setLoanAed] = useState<number>(0);
  const [ratePct, setRatePct] = useState<number>(0);
  const [financePeriodMonths, setFinancePeriodMonths] = useState<number>(36);

  // ── BtS revenue ──────────────────────────────────────────────────
  const [salesPsf, setSalesPsf] = useState<number>(0);
  const [commissionPct, setCommissionPct] = useState<number>(8.5);
  const [marketingPct, setMarketingPct] = useState<number>(2.0);
  const [devServicesPct, setDevServicesPct] = useState<number>(0);

  // ── BtR rental ───────────────────────────────────────────────────
  const [monthlyRentPsf, setMonthlyRentPsf] = useState<number>(0);
  const [occupancyPct, setOccupancyPct] = useState<number>(85);
  const [annualIncreasePct, setAnnualIncreasePct] = useState<number>(3);
  const [operatingPct, setOperatingPct] = useState<number>(30);

  // ── JV ───────────────────────────────────────────────────────────
  const [jvType, setJvType] = useState<JvType>("equity");
  const [landownerLandContribution, setLandownerLandContribution] = useState<number>(props.plotPriceAed || 0);
  const [landownerCash, setLandownerCash] = useState<number>(0);
  const [landownerSharePct, setLandownerSharePct] = useState<number>(30);
  useEffect(() => { setLandownerLandContribution(props.plotPriceAed || 0); }, [props.plotPriceAed]);

  // ── Debounced values (300 ms per spec) ───────────────────────────
  const dBuaManual = useDebounced(buaManual, 300);
  const dBuaRatio = useDebounced(buaRatio, 300);
  const dEff = useDebounced(efficiencyPct, 300);
  const dLand = useDebounced(landCostAed, 300);
  const dDown = useDebounced(downPaymentPct, 300);
  const dN = useDebounced(numberOfPayments, 300);
  const dPeriod = useDebounced(periodMonths, 300);
  const dConst = useDebounced(constructionPsf, 300);
  const dBrand = useDebounced(brandPsf, 300);
  const dConsult = useDebounced(consultancyPsf, 300);
  const dInfra = useDebounced(infrastructurePsf, 300);
  const dCont = useDebounced(contingencyPct, 300);
  const dLoan = useDebounced(loanAed, 300);
  const dRate = useDebounced(ratePct, 300);
  const dFinPeriod = useDebounced(financePeriodMonths, 300);
  const dSales = useDebounced(salesPsf, 300);
  const dComm = useDebounced(commissionPct, 300);
  const dMkt = useDebounced(marketingPct, 300);
  const dDev = useDebounced(devServicesPct, 300);
  const dRent = useDebounced(monthlyRentPsf, 300);
  const dOcc = useDebounced(occupancyPct, 300);
  const dAnn = useDebounced(annualIncreasePct, 300);
  const dOp = useDebounced(operatingPct, 300);
  const dLoCont = useDebounced(landownerLandContribution, 300);
  const dLoCash = useDebounced(landownerCash, 300);
  const dLoShare = useDebounced(landownerSharePct, 300);

  // ── Derived ──────────────────────────────────────────────────────
  const area = useMemo(() => deriveArea({
    plotAreaSqft, far, bua: dBuaManual, efficiencyPct: dEff,
  }), [plotAreaSqft, far, dBuaManual, dEff]);

  const land = useMemo(() => deriveLand({
    landCostAed: dLand, dldPct: 4, paymentMode,
    downPaymentPct: dDown, numberOfPayments: dN, periodMonths: dPeriod,
  }, area.gfa), [dLand, paymentMode, dDown, dN, dPeriod, area.gfa]);

  const construction = useMemo(() => deriveConstruction({
    constructionPsfBua: dConst, brandPsfBua: dBrand,
    consultancyPsfBua: dConsult, infrastructurePsfBua: dInfra,
    contingencyPct: dCont,
  }, area.bua), [dConst, dBrand, dConsult, dInfra, dCont, area.bua]);

  const finance = useMemo(() => deriveFinance({
    enabled: financeEnabled, loanAed: dLoan, ratePct: dRate, periodMonths: dFinPeriod,
  }), [financeEnabled, dLoan, dRate, dFinPeriod]);

  const btsRevenue = useMemo(() => deriveBtSRevenue({
    salesPricePsfSfa: dSales, commissionPct: dComm, marketingPct: dMkt, devServicesPct: dDev,
  }, area.sfa), [dSales, dComm, dMkt, dDev, area.sfa]);

  const btsResult = useMemo(() => computeBtS(area, land, construction, finance, btsRevenue, paymentMode),
    [area, land, construction, finance, btsRevenue, paymentMode]);

  const btrRental = useMemo(() => deriveBtRRental({
    monthlyRentPsfSfa: dRent, occupancyPct: dOcc, annualIncreasePct: dAnn, operatingPct: dOp,
  }, area.sfa), [dRent, dOcc, dAnn, dOp, area.sfa]);

  const btrResult = useMemo(() => computeBtR(land, construction, finance, btrRental, dAnn),
    [land, construction, finance, btrRental, dAnn]);

  // For JV: developer cash auto = construction (incl. contingency) + finance + DLD
  const developerCashAuto = construction.totalConstructionAed + finance.totalInterestAed + land.dldFeeAed;

  // In equity mode we default landowner share to landContrib / totalContrib.
  // In profit_sharing mode the user controls it directly.
  const equityDefaultShare = useMemo(() => {
    const total = dLoCont + dLoCash + developerCashAuto;
    if (total <= 0) return 0;
    return ((dLoCont + dLoCash) / total) * 100;
  }, [dLoCont, dLoCash, developerCashAuto]);

  // When user switches to equity mode we snap share to the default once.
  const lastJvType = useRef<JvType>("equity");
  useEffect(() => {
    if (jvType === "equity" && lastJvType.current !== "equity") {
      setLandownerSharePct(Math.round(equityDefaultShare * 10) / 10);
    }
    lastJvType.current = jvType;
  }, [jvType, equityDefaultShare]);

  const jv = useMemo(() => computeJv({
    jvType,
    landownerLandContributionAed: dLoCont,
    landownerCashAed: dLoCash,
    developerCashAed: developerCashAuto,
    landownerSharePct: dLoShare,
  }, land, construction, finance, btsRevenue), [jvType, dLoCont, dLoCash, developerCashAuto, dLoShare, land, construction, finance, btsRevenue]);

  // ── BUA ↔ Ratio wiring ───────────────────────────────────────────
  function onBuaChange(n: number) {
    setBuaManual(n);
    if (area.gfa > 0) setBuaRatio(Number((n / area.gfa).toFixed(3)));
  }
  function onRatioChange(n: number) {
    setBuaRatio(n);
    setBuaManual(Math.round(area.gfa * n));
  }

  // ── Verdicts ─────────────────────────────────────────────────────
  const btsV = btsVerdict(btsResult.roiPct);
  const btrV = btrVerdict(btrResult.yieldPct);

  // ── Header strings ───────────────────────────────────────────────
  const headerLine1 = `Plot ${props.plotNumber ?? "—"} — ${props.community ?? props.district ?? "—"}`;
  const plotSqm = plotAreaSqft / 10.7639;
  const gfaSqm = area.gfa / 10.7639;
  const headerLine2 = `${props.landUse || "—"} | Plot: ${fmtInt(plotSqm)} sqm (${fmtInt(plotAreaSqft)} sqft) | FAR: ${far.toFixed(2)} | GFA: ${fmtInt(gfaSqm)} sqm`;

  // ── PDF Export (all 3 tabs) ──────────────────────────────────────
  const downloadPDF = useCallback(() => {
    const doc = new jsPDF({ unit: "mm", format: "a4" });
    const W = 210, M = 15;
    let y = 15;
    const gold: [number, number, number] = [200, 169, 110];
    const dark: [number, number, number] = [26, 26, 46];
    const gray: [number, number, number] = [107, 114, 128];

    const footer = () => {
      doc.setFontSize(6.5); doc.setTextColor(...gray); doc.setFont("helvetica", "normal");
      doc.text("ZAAHI Real Estate OS — zaahi.io — Confidential", W / 2, 290, { align: "center" });
    };
    const check = (need: number) => { if (y + need > 275) { doc.addPage(); y = 15; footer(); } };
    const h1 = (t: string) => { check(12); doc.setFontSize(13); doc.setTextColor(...gold); doc.setFont("helvetica", "bold"); doc.text(t, M, y); y += 7; };
    const h2 = (t: string) => { check(10); doc.setFontSize(10); doc.setTextColor(...gold); doc.setFont("helvetica", "bold"); doc.text(t, M, y); y += 5; };
    const row = (l: string, v: string, bold = false) => {
      check(6);
      doc.setFontSize(9); doc.setFont("helvetica", bold ? "bold" : "normal");
      doc.setTextColor(...gray); doc.text(l, M, y);
      doc.setTextColor(...dark); doc.text(v, W - M, y, { align: "right" });
      y += 5;
    };
    const rule = () => { doc.setDrawColor(...gold); doc.setLineWidth(0.3); doc.line(M, y, W - M, y); y += 4; };

    footer();

    // Cover
    doc.setFontSize(20); doc.setTextColor(...gold); doc.setFont("helvetica", "bold");
    doc.text("ZAAHI Feasibility Report", M, y); y += 8;
    doc.setFontSize(9); doc.setTextColor(...gray); doc.setFont("helvetica", "normal");
    doc.text(`Generated ${new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}`, M, y); y += 4;
    rule();

    h1("PLOT");
    if (props.plotNumber) row("Plot Number", props.plotNumber);
    if (props.district) row("District", props.district);
    if (props.community) row("Community", props.community);
    if (props.projectName) row("Project", props.projectName);
    if (props.masterDeveloper) row("Master Developer", props.masterDeveloper);
    row("Land Use", props.landUse || "—");
    row("Plot Area", `${fmtInt(plotAreaSqft)} sqft (${fmtInt(plotSqm)} sqm)`);
    row("FAR", far.toFixed(2));
    row("GFA", `${fmtInt(area.gfa)} sqft`);
    row("BUA", `${fmtInt(area.bua)} sqft (ratio ${area.buaGfaRatio.toFixed(2)})`);
    row("Efficiency", `${efficiencyPct.toFixed(1)}%`);
    row("SFA", `${fmtInt(area.sfa)} sqft`);
    if (props.plotPriceAed > 0) row("Listed Price", fmtAedExact(props.plotPriceAed));
    y += 3;

    // === TAB 1: BUILD-TO-SELL ===
    h1("BUILD-TO-SELL");
    h2("Costs");
    row("Land Cost", fmtAedExact(land.landCostAed));
    row("DLD Registration (4%)", fmtAedExact(land.dldFeeAed));
    row("Construction (base)", fmtAedExact(construction.constructionAed));
    row("Brand & Collaboration", fmtAedExact(construction.brandAed));
    row("Consultancy", fmtAedExact(construction.consultancyAed));
    row("Infrastructure", fmtAedExact(construction.infrastructureAed));
    row(`Contingency (${contingencyPct}%)`, fmtAedExact(construction.contingencyAed));
    if (financeEnabled) row("Finance Cost", fmtAedExact(finance.totalInterestAed));
    row("TOTAL INVESTMENT", fmtAedExact(btsResult.totalInvestmentAed), true);
    y += 2;
    h2("Revenue");
    row("SFA", `${fmtInt(area.sfa)} sqft`);
    row("Sales Price", `AED ${fmtInt(salesPsf)} / sqft SFA`);
    row("Gross Revenue", fmtAedExact(btsRevenue.grossRevenueAed));
    row(`- Commission (${commissionPct}%)`, `-${fmtAedExact(btsRevenue.commissionAed)}`);
    row(`- Marketing (${marketingPct}%)`, `-${fmtAedExact(btsRevenue.marketingAed)}`);
    row(`- Developer Services (${devServicesPct}%)`, `-${fmtAedExact(btsRevenue.devServicesAed)}`);
    row("NET REVENUE", fmtAedExact(btsResult.netRevenueAed), true);
    y += 2;
    h2("Profit");
    row("NET PROFIT", fmtAedExact(btsResult.netProfitAed), true);
    row("ROI", fmtPct(btsResult.roiPct));
    row("Profit / sqft SFA", fmtAedExact(btsResult.profitPerSqftSfa));
    row("Verdict", btsV.label);
    if (paymentMode === "installments") {
      y += 2;
      h2("Payment Plan");
      row("Down Payment", fmtAedExact(land.downPaymentAed));
      row("Remaining", fmtAedExact(land.remainingAed));
      row("Monthly", fmtAedExact(land.monthlyInstallmentAed));
      row("Initial Capital", fmtAedExact(btsResult.initialCapitalAed));
      row("ROI on Initial Capital", fmtPct(btsResult.roiOnInitialCapitalPct));
    }

    // === TAB 2: BUILD-TO-RENT ===
    doc.addPage(); y = 15; footer();
    h1("BUILD-TO-RENT");
    h2("Costs");
    row("Total Investment", fmtAedExact(btrResult.totalInvestmentAed), true);
    y += 2;
    h2("Annual Rental Income");
    row("Leasable (SFA)", `${fmtInt(area.sfa)} sqft`);
    row("Monthly Rent", `AED ${fmtInt(monthlyRentPsf)} / sqft SFA`);
    row("Gross Monthly", fmtAedExact(btrRental.grossMonthlyAed));
    row(`× Occupancy (${occupancyPct}%)`, "");
    row("Effective Monthly", fmtAedExact(btrRental.effectiveMonthlyAed));
    row("GROSS ANNUAL", fmtAedExact(btrRental.grossAnnualAed), true);
    row(`- Operating (${operatingPct}%)`, `-${fmtAedExact(btrRental.operatingCostAed)}`);
    row("NET ANNUAL", fmtAedExact(btrRental.netAnnualAed), true);
    y += 2;
    h2("Key Metrics");
    row("YIELD", fmtPct(btrResult.yieldPct), true);
    row("Payback (years)", btrResult.paybackYears.toFixed(1));
    row("Monthly Cash Flow", fmtAedExact(btrResult.monthlyCashFlowAed));
    row("Verdict", btrV.label);
    y += 2;
    h2("5-Year Projection");
    btrResult.projection5y.forEach((p) => {
      row(`Year ${p.year}`, `${fmtAedExact(p.incomeAed)}   (cum: ${fmtAedExact(p.cumulativeAed)})`);
    });
    row("Total 5Y", fmtAedExact(btrResult.total5yAed), true);

    // === TAB 3: JOINT VENTURE ===
    doc.addPage(); y = 15; footer();
    h1(`JOINT VENTURE — ${jvType === "equity" ? "Equity" : "Profit Sharing"}`);
    h2("Project Summary");
    row("Total Investment", fmtAedExact(jv.totalInvestmentAed));
    row("Total Revenue", fmtAedExact(jv.totalRevenueAed));
    row("Total Net Profit", fmtAedExact(jv.totalProjectProfitAed), true);
    row("Project ROI", fmtPct(jv.projectRoiPct));
    y += 2;
    h2("Landowner");
    row("Land Contribution", fmtAedExact(dLoCont));
    row("Cash", fmtAedExact(dLoCash));
    row("Total Contribution", fmtAedExact(jv.landownerTotalContribution));
    row("Profit Share", `${jv.landownerSharePct.toFixed(1)}%`);
    row("Net Profit", fmtAedExact(jv.landownerProfitAed), true);
    row("ROI on Contribution", fmtPct(jv.landownerRoiPct));
    y += 2;
    h2("Developer");
    row("Cash", fmtAedExact(developerCashAuto));
    row("Total Contribution", fmtAedExact(jv.developerTotalContribution));
    row("Profit Share", `${jv.developerSharePct.toFixed(1)}%`);
    row("Net Profit", fmtAedExact(jv.developerProfitAed), true);
    row("ROI on Contribution", fmtPct(jv.developerRoiPct));
    y += 2;
    h2("Sell vs JV (Landowner)");
    jv.sellVsJv.forEach((s) => {
      row(`JV @ ${s.sharePct}%`, `${fmtAedExact(s.jvProfitAed)}   (vs sell: ${s.vsSellDeltaAed >= 0 ? "+" : ""}${fmtAedExact(s.vsSellDeltaAed)})`);
    });
    row("Breakeven JV Share", `${jv.breakevenJvSharePct.toFixed(1)}%`);

    const tag = props.plotNumber ? `-Plot-${props.plotNumber}` : "";
    doc.save(`ZAAHI-Feasibility${tag}-${new Date().toISOString().slice(0, 10)}.pdf`);
  }, [
    props, plotAreaSqft, plotSqm, far, area, efficiencyPct, land, construction,
    contingencyPct, finance, financeEnabled, btsResult, btsRevenue, salesPsf,
    commissionPct, marketingPct, devServicesPct, paymentMode, btsV,
    btrResult, btrRental, monthlyRentPsf, occupancyPct, operatingPct, btrV,
    jv, jvType, dLoCont, dLoCash, developerCashAuto,
  ]);

  // ── Styles ───────────────────────────────────────────────────────
  const shellStyle: React.CSSProperties = {
    background: "rgba(10, 22, 40, 0.40)",
    backdropFilter: "blur(16px)",
    WebkitBackdropFilter: "blur(16px)",
    border: `1px solid ${LINE}`,
    borderRadius: 12,
    color: TXT,
    boxShadow: "0 6px 20px rgba(0,0,0,0.2)",
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
    fontFamily: "-apple-system, Segoe UI, Roboto, sans-serif",
  };

  // ── Tab button ───────────────────────────────────────────────────
  const tabBtn = (key: Tab, label: string) => {
    const active = tab === key;
    return (
      <button
        type="button"
        key={key}
        onClick={() => setTab(key)}
        style={{
          flex: 1,
          padding: "9px 6px",
          background: active ? "rgba(200,169,110,0.18)" : "transparent",
          border: `1px solid ${active ? GOLD : LINE}`,
          borderRadius: 6,
          color: active ? GOLD : DIM,
          fontSize: 10.5,
          fontWeight: 700,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          cursor: "pointer",
          transition: "background 150ms ease, border-color 150ms ease, color 150ms ease",
          fontFamily: "inherit",
        }}
      >
        {label}
      </button>
    );
  };

  return (
    <div style={shellStyle}>
      {/* Header (readonly) */}
      <div style={{ padding: "12px 14px", borderBottom: `1px solid ${LINE}` }}>
        <div style={{ color: TXT, fontSize: 13, fontWeight: 700, letterSpacing: 0.3 }}>{headerLine1}</div>
        <div style={{ color: SUBTLE, fontSize: 10.5, marginTop: 3 }}>{headerLine2}</div>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 6, padding: "10px 14px 0 14px" }}>
        {tabBtn("bts", "Build-to-Sell")}
        {tabBtn("btr", "Build-to-Rent")}
        {tabBtn("jv", "Joint Venture")}
      </div>

      {/* Scrollable body */}
      <div style={{ flex: 1, overflowY: "auto", padding: "6px 14px", maxHeight: "70vh" }}>
        {/* ─── AREA (all tabs) ─── */}
        <Section title="Area Parameters">
          <Row label="Plot Area"><NumberInput value={plotAreaSqft} readonly unit="sqft" /></Row>
          <Row label="FAR"><NumberInput value={far} readonly /></Row>
          <Row label="GFA (auto = Plot × FAR)"><NumberInput value={area.gfa} readonly unit="sqft" /></Row>
          <Row label="BUA"><NumberInput value={buaManual} onChange={onBuaChange} unit="sqft" /></Row>
          <Row label="BUA / GFA Ratio" hint="Default 1.85 — enter BUA OR ratio, the other updates automatically.">
            <NumberInput value={buaRatio} onChange={onRatioChange} step={0.01} />
          </Row>
          <Row label="Efficiency (Net-to-Gross)" hint="High Rise 80% | Low Rise 68% | Villas 90%">
            <NumberInput value={efficiencyPct} onChange={setEfficiencyPct} unit="%" />
          </Row>
          <Row label="SFA (auto = GFA × Efficiency)"><NumberInput value={area.sfa} readonly unit="sqft" /></Row>
        </Section>

        {/* ─── LAND (all tabs) ─── */}
        <Section title="Land Cost">
          <Row label="Land Cost"><NumberInput value={landCostAed} onChange={setLandCostAed} unit="AED" /></Row>
          <Row label="Per sqft GFA"><NumberInput value={land.pricePerSqftGfa} readonly unit="AED/sqft" /></Row>
          <Row label="DLD Registration (4%)"><NumberInput value={land.dldFeeAed} readonly unit="AED" /></Row>
          <div style={{ display: "flex", gap: 6, padding: "8px 0", borderBottom: `1px solid ${LINE}` }}>
            {(["full", "installments"] as LandPaymentMode[]).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setPaymentMode(m)}
                style={{
                  flex: 1,
                  padding: "6px 10px",
                  background: paymentMode === m ? "rgba(200,169,110,0.18)" : "transparent",
                  border: `1px solid ${paymentMode === m ? GOLD : LINE}`,
                  borderRadius: 6,
                  color: paymentMode === m ? GOLD : DIM,
                  fontSize: 10.5,
                  textTransform: "uppercase",
                  letterSpacing: 0.6,
                  cursor: "pointer",
                  fontFamily: "inherit",
                  transition: "background 150ms ease, border-color 150ms ease, color 150ms ease",
                }}
              >
                {m === "full" ? "Full Payment" : "Installments"}
              </button>
            ))}
          </div>
          {paymentMode === "installments" && (
            <>
              <Row label="Down Payment"><NumberInput value={downPaymentPct} onChange={setDownPaymentPct} unit="%" /></Row>
              <Row label="Number of Payments"><NumberInput value={numberOfPayments} onChange={setNumberOfPayments} /></Row>
              <Row label="Period"><NumberInput value={periodMonths} onChange={setPeriodMonths} unit="months" /></Row>
              <Row label="Down Amount"><NumberInput value={land.downPaymentAed} readonly unit="AED" /></Row>
              <Row label="Monthly Installment"><NumberInput value={land.monthlyInstallmentAed} readonly unit="AED" /></Row>
            </>
          )}
        </Section>

        {/* ─── CONSTRUCTION (all tabs) ─── */}
        <Section title="Construction Costs (per sqft BUA)">
          <Row label="Construction"><NumberInput value={constructionPsf} onChange={setConstructionPsf} unit="AED/sqft" /></Row>
          <Row label="Brand & Collaboration"><NumberInput value={brandPsf} onChange={setBrandPsf} unit="AED/sqft" /></Row>
          <Row label="Consultancy"><NumberInput value={consultancyPsf} onChange={setConsultancyPsf} unit="AED/sqft" /></Row>
          <Row label="Infrastructure"><NumberInput value={infrastructurePsf} onChange={setInfrastructurePsf} unit="AED/sqft" /></Row>
          <Row label="Contingency"><NumberInput value={contingencyPct} onChange={setContingencyPct} unit="%" /></Row>
          <Row label="Total / sqft BUA"><NumberInput value={construction.perSqftBuaWithContingency} readonly unit="AED/sqft" /></Row>
          <Row label="Total Construction"><NumberInput value={construction.totalConstructionAed} readonly unit="AED" /></Row>
        </Section>

        {/* ─── FINANCE (optional, all tabs) ─── */}
        <Section title="Finance (optional)">
          <div style={{ display: "flex", gap: 6, padding: "8px 0", borderBottom: `1px solid ${LINE}` }}>
            {[false, true].map((v) => (
              <button
                key={String(v)}
                type="button"
                onClick={() => setFinanceEnabled(v)}
                style={{
                  flex: 1,
                  padding: "6px 10px",
                  background: financeEnabled === v ? "rgba(200,169,110,0.18)" : "transparent",
                  border: `1px solid ${financeEnabled === v ? GOLD : LINE}`,
                  borderRadius: 6,
                  color: financeEnabled === v ? GOLD : DIM,
                  fontSize: 10.5,
                  textTransform: "uppercase",
                  letterSpacing: 0.6,
                  cursor: "pointer",
                  fontFamily: "inherit",
                  transition: "background 150ms ease, border-color 150ms ease, color 150ms ease",
                }}
              >
                {v ? "Yes" : "No"}
              </button>
            ))}
          </div>
          {financeEnabled && (
            <>
              <Row label="Loan Amount"><NumberInput value={loanAed} onChange={setLoanAed} unit="AED" /></Row>
              <Row label="Interest Rate"><NumberInput value={ratePct} onChange={setRatePct} unit="%" /></Row>
              <Row label="Loan Period"><NumberInput value={financePeriodMonths} onChange={setFinancePeriodMonths} unit="months" /></Row>
              <Row label="Total Interest Cost"><NumberInput value={finance.totalInterestAed} readonly unit="AED" /></Row>
            </>
          )}
        </Section>

        {/* ─── TAB-SPECIFIC BLOCKS ─── */}
        {tab === "bts" && (
          <>
            <Section title="Revenue (per sqft SFA)">
              <Row label="Sales Price"><NumberInput value={salesPsf} onChange={setSalesPsf} unit="AED/sqft" /></Row>
              <Row label="Commission"><NumberInput value={commissionPct} onChange={setCommissionPct} unit="%" /></Row>
              <Row label="Marketing"><NumberInput value={marketingPct} onChange={setMarketingPct} unit="%" /></Row>
              <Row label="Developer Services"><NumberInput value={devServicesPct} onChange={setDevServicesPct} unit="%" /></Row>
            </Section>

            <Section title="Results" lockOpen>
              <div style={{ color: GOLD, fontSize: 10, fontWeight: 700, letterSpacing: 0.08 * 10, textTransform: "uppercase", marginBottom: 4 }}>Costs</div>
              <ResultRow label="Land Cost" value={fmtAedExact(land.landCostAed)} />
              <ResultRow label="DLD (4%)" value={`-${fmtAedExact(land.dldFeeAed)}`} />
              <ResultRow label={`Construction (${fmtInt(area.bua)} × ${fmtInt(construction.perSqftBuaTotal)} AED)`} value={fmtAedExact(construction.baseConstructionAed)} />
              <ResultRow label={`Contingency (${contingencyPct}%)`} value={fmtAedExact(construction.contingencyAed)} />
              {financeEnabled && <ResultRow label="Finance Cost" value={fmtAedExact(finance.totalInterestAed)} />}
              <div style={{ borderTop: `1px solid ${LINE}`, marginTop: 6, paddingTop: 6 }} />
              <ResultRow label="TOTAL INVESTMENT" value={fmtAed(btsResult.totalInvestmentAed)} hero />

              <div style={{ color: GOLD, fontSize: 10, fontWeight: 700, letterSpacing: 0.08 * 10, textTransform: "uppercase", marginTop: 14, marginBottom: 4 }}>Revenue</div>
              <ResultRow label={`SFA (${fmtInt(area.sfa)} sqft)`} value={`× AED ${fmtInt(salesPsf)}`} dim />
              <ResultRow label="Gross Revenue" value={fmtAedExact(btsRevenue.grossRevenueAed)} bold />
              <ResultRow label={`- Commission (${commissionPct}%)`} value={`-${fmtAedExact(btsRevenue.commissionAed)}`} />
              <ResultRow label={`- Marketing (${marketingPct}%)`} value={`-${fmtAedExact(btsRevenue.marketingAed)}`} />
              <ResultRow label={`- Dev Services (${devServicesPct}%)`} value={`-${fmtAedExact(btsRevenue.devServicesAed)}`} />
              <div style={{ borderTop: `1px solid ${LINE}`, marginTop: 6, paddingTop: 6 }} />
              <ResultRow label="NET REVENUE" value={fmtAed(btsResult.netRevenueAed)} hero />

              <div style={{ color: GOLD, fontSize: 10, fontWeight: 700, letterSpacing: 0.08 * 10, textTransform: "uppercase", marginTop: 14, marginBottom: 4 }}>Profit</div>
              <ResultRow label="NET PROFIT" value={fmtAed(btsResult.netProfitAed)} hero gold />
              <ResultRow label="ROI" value={fmtPct(btsResult.roiPct)} bold />
              <ResultRow label="Profit / sqft SFA" value={fmtAedExact(btsResult.profitPerSqftSfa)} />
              <Verdict color={btsV.color} label={btsV.label} />

              {paymentMode === "installments" && (
                <>
                  <div style={{ color: GOLD, fontSize: 10, fontWeight: 700, letterSpacing: 0.08 * 10, textTransform: "uppercase", marginTop: 14, marginBottom: 4 }}>Payment Plan Impact</div>
                  <ResultRow label="Down Payment" value={fmtAedExact(land.downPaymentAed)} />
                  <ResultRow label="Remaining" value={fmtAedExact(land.remainingAed)} />
                  <ResultRow label="Monthly Installment" value={fmtAedExact(land.monthlyInstallmentAed)} />
                  <ResultRow label="Initial Capital" value={fmtAedExact(btsResult.initialCapitalAed)} bold />
                  <ResultRow label="ROI on Initial Capital" value={fmtPct(btsResult.roiOnInitialCapitalPct)} gold bold />
                </>
              )}
            </Section>
          </>
        )}

        {tab === "btr" && (
          <>
            <Section title="Rental Income">
              <Row label="Monthly Rent"><NumberInput value={monthlyRentPsf} onChange={setMonthlyRentPsf} unit="AED/sqft" /></Row>
              <Row label="Occupancy"><NumberInput value={occupancyPct} onChange={setOccupancyPct} unit="%" /></Row>
              <Row label="Annual Rent Increase"><NumberInput value={annualIncreasePct} onChange={setAnnualIncreasePct} unit="%" /></Row>
              <Row label="Operating & Maintenance" hint="% of gross rental">
                <NumberInput value={operatingPct} onChange={setOperatingPct} unit="%" />
              </Row>
            </Section>

            <Section title="Results" lockOpen>
              <div style={{ color: GOLD, fontSize: 10, fontWeight: 700, letterSpacing: 0.08 * 10, textTransform: "uppercase", marginBottom: 4 }}>Costs</div>
              <ResultRow label="Land + DLD" value={fmtAedExact(land.totalLandCostAed)} />
              <ResultRow label="Construction + Contingency" value={fmtAedExact(construction.totalConstructionAed)} />
              {financeEnabled && <ResultRow label="Finance Cost" value={fmtAedExact(finance.totalInterestAed)} />}
              <div style={{ borderTop: `1px solid ${LINE}`, marginTop: 6, paddingTop: 6 }} />
              <ResultRow label="TOTAL INVESTMENT" value={fmtAed(btrResult.totalInvestmentAed)} hero />

              <div style={{ color: GOLD, fontSize: 10, fontWeight: 700, letterSpacing: 0.08 * 10, textTransform: "uppercase", marginTop: 14, marginBottom: 4 }}>Annual Rental Income</div>
              <ResultRow label="Leasable (SFA)" value={`${fmtInt(area.sfa)} sqft`} dim />
              <ResultRow label="Monthly Rent" value={`AED ${fmtInt(monthlyRentPsf)} / sqft`} dim />
              <ResultRow label="Gross Monthly" value={fmtAedExact(btrRental.grossMonthlyAed)} />
              <ResultRow label={`× Occupancy (${occupancyPct}%)`} value="" dim />
              <ResultRow label="Effective Monthly" value={fmtAedExact(btrRental.effectiveMonthlyAed)} />
              <ResultRow label="GROSS ANNUAL" value={fmtAed(btrRental.grossAnnualAed)} hero />
              <ResultRow label={`- Operating (${operatingPct}%)`} value={`-${fmtAedExact(btrRental.operatingCostAed)}`} />
              <ResultRow label="NET ANNUAL" value={fmtAed(btrRental.netAnnualAed)} hero gold />

              <div style={{ color: GOLD, fontSize: 10, fontWeight: 700, letterSpacing: 0.08 * 10, textTransform: "uppercase", marginTop: 14, marginBottom: 4 }}>Key Metrics</div>
              <ResultRow label="YIELD" value={fmtPct(btrResult.yieldPct)} hero gold />
              <ResultRow label="Payback" value={`${btrResult.paybackYears.toFixed(1)} years`} bold />
              <ResultRow label="Monthly Cash Flow" value={fmtAedExact(btrResult.monthlyCashFlowAed)} />
              <Verdict color={btrV.color} label={btrV.label} />

              <div style={{ color: GOLD, fontSize: 10, fontWeight: 700, letterSpacing: 0.08 * 10, textTransform: "uppercase", marginTop: 14, marginBottom: 4 }}>5-Year Projection</div>
              {btrResult.projection5y.map((p) => (
                <ResultRow key={p.year} label={`Year ${p.year}`} value={fmtAedExact(p.incomeAed)} />
              ))}
              <div style={{ borderTop: `1px solid ${LINE}`, marginTop: 6, paddingTop: 6 }} />
              <ResultRow label="Total 5Y" value={fmtAed(btrResult.total5yAed)} bold gold />
            </Section>
          </>
        )}

        {tab === "jv" && (
          <>
            <Section title="JV Type">
              <div style={{ display: "flex", gap: 6, padding: "6px 0" }}>
                {(["equity", "profit_sharing"] as JvType[]).map((v) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setJvType(v)}
                    style={{
                      flex: 1,
                      padding: "8px 10px",
                      background: jvType === v ? "rgba(200,169,110,0.18)" : "transparent",
                      border: `1px solid ${jvType === v ? GOLD : LINE}`,
                      borderRadius: 6,
                      color: jvType === v ? GOLD : DIM,
                      fontSize: 10.5,
                      textTransform: "uppercase",
                      letterSpacing: 0.6,
                      cursor: "pointer",
                      fontFamily: "inherit",
                      transition: "background 150ms ease, border-color 150ms ease, color 150ms ease",
                    }}
                  >
                    {v === "equity" ? "Equity" : "Profit Sharing"}
                  </button>
                ))}
              </div>
            </Section>

            <Section title="Partners">
              <div style={{ color: GOLD, fontSize: 10, fontWeight: 700, letterSpacing: 0.08 * 10, textTransform: "uppercase", marginBottom: 4 }}>Landowner</div>
              <Row label="Land Contribution"><NumberInput value={landownerLandContribution} onChange={setLandownerLandContribution} unit="AED" /></Row>
              <Row label="Cash"><NumberInput value={landownerCash} onChange={setLandownerCash} unit="AED" /></Row>
              <Row label="Total"><NumberInput value={jv.landownerTotalContribution} readonly unit="AED" /></Row>
              <Row label="Profit Share"
                hint={jvType === "equity"
                  ? `Linked — default ${equityDefaultShare.toFixed(1)}% based on contribution`
                  : "Manual — developer share auto-balances to 100%"}>
                <NumberInput value={landownerSharePct} onChange={setLandownerSharePct} unit="%" />
              </Row>

              <div style={{ color: GOLD, fontSize: 10, fontWeight: 700, letterSpacing: 0.08 * 10, textTransform: "uppercase", marginTop: 12, marginBottom: 4 }}>Developer</div>
              <Row label="Cash (auto)" hint="Construction + Contingency + Finance + DLD">
                <NumberInput value={developerCashAuto} readonly unit="AED" />
              </Row>
              <Row label="Total"><NumberInput value={jv.developerTotalContribution} readonly unit="AED" /></Row>
              <Row label="Profit Share (auto)"><NumberInput value={jv.developerSharePct} readonly unit="%" /></Row>
            </Section>

            <Section title="Revenue & Commissions (per sqft SFA)">
              <Row label="Sales Price"><NumberInput value={salesPsf} onChange={setSalesPsf} unit="AED/sqft" /></Row>
              <Row label="Commission"><NumberInput value={commissionPct} onChange={setCommissionPct} unit="%" /></Row>
              <Row label="Marketing"><NumberInput value={marketingPct} onChange={setMarketingPct} unit="%" /></Row>
              <Row label="Developer Services"><NumberInput value={devServicesPct} onChange={setDevServicesPct} unit="%" /></Row>
            </Section>

            <Section title="Results" lockOpen>
              <div style={{ color: GOLD, fontSize: 10, fontWeight: 700, letterSpacing: 0.08 * 10, textTransform: "uppercase", marginBottom: 4 }}>Project Summary</div>
              <ResultRow label="Total Investment" value={fmtAedExact(jv.totalInvestmentAed)} bold />
              <ResultRow label="Total Revenue" value={fmtAedExact(jv.totalRevenueAed)} bold />
              <ResultRow label="Total Net Profit" value={fmtAed(jv.totalProjectProfitAed)} hero />
              <ResultRow label="Project ROI" value={fmtPct(jv.projectRoiPct)} bold />

              <div style={{ color: GOLD, fontSize: 10, fontWeight: 700, letterSpacing: 0.08 * 10, textTransform: "uppercase", marginTop: 14, marginBottom: 4 }}>Partner Returns</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <div>
                  <div style={{ color: SUBTLE, fontSize: 10, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 }}>Landowner</div>
                  <ResultRow label="Contribution" value={fmtAedExact(jv.landownerTotalContribution)} />
                  <ResultRow label="Share" value={`${jv.landownerSharePct.toFixed(1)}%`} />
                  <ResultRow label="Net Profit" value={fmtAed(jv.landownerProfitAed)} gold bold />
                  <ResultRow label="ROI" value={fmtPct(jv.landownerRoiPct)} />
                </div>
                <div>
                  <div style={{ color: SUBTLE, fontSize: 10, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 }}>Developer</div>
                  <ResultRow label="Contribution" value={fmtAedExact(jv.developerTotalContribution)} />
                  <ResultRow label="Share" value={`${jv.developerSharePct.toFixed(1)}%`} />
                  <ResultRow label="Net Profit" value={fmtAed(jv.developerProfitAed)} gold bold />
                  <ResultRow label="ROI" value={fmtPct(jv.developerRoiPct)} />
                </div>
              </div>

              <div style={{ color: GOLD, fontSize: 10, fontWeight: 700, letterSpacing: 0.08 * 10, textTransform: "uppercase", marginTop: 14, marginBottom: 4 }}>Sell vs JV — Landowner View</div>
              <div style={{ display: "grid", gridTemplateColumns: "60px 1fr 1fr", rowGap: 4, columnGap: 8, fontSize: 11 }}>
                <div style={{ color: SUBTLE, textTransform: "uppercase", letterSpacing: 0.5 }}>Share</div>
                <div style={{ color: SUBTLE, textTransform: "uppercase", letterSpacing: 0.5 }}>JV Profit</div>
                <div style={{ color: SUBTLE, textTransform: "uppercase", letterSpacing: 0.5 }}>vs Sell</div>
                {jv.sellVsJv.map((s) => (
                  <SellVsJvRow key={s.sharePct} share={s.sharePct} profit={s.jvProfitAed} delta={s.vsSellDeltaAed} />
                ))}
              </div>
              <div style={{ borderTop: `1px solid ${LINE}`, marginTop: 10, paddingTop: 6 }} />
              <ResultRow label="Breakeven JV Share" value={`${jv.breakevenJvSharePct.toFixed(1)}%`} bold gold />
            </Section>
          </>
        )}
      </div>

      {/* Fixed footer */}
      <div style={{
        display: "flex", gap: 8, padding: "10px 14px", borderTop: `1px solid ${LINE}`,
        background: "rgba(10, 22, 40, 0.65)",
      }}>
        <button
          type="button"
          onClick={downloadPDF}
          style={{
            flex: 1,
            padding: "10px 12px",
            background: "rgba(255,255,255,0.04)",
            border: `1px solid rgba(200,169,110,0.3)`,
            borderRadius: 8,
            color: GOLD,
            fontSize: 10.5,
            letterSpacing: 0.08 * 10,
            textTransform: "uppercase",
            fontWeight: 700,
            cursor: "pointer",
            fontFamily: "inherit",
            transition: "background 150ms ease, border-color 150ms ease",
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(200,169,110,0.25)"; e.currentTarget.style.borderColor = GOLD; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.04)"; e.currentTarget.style.borderColor = "rgba(200,169,110,0.3)"; }}
        >
          Download Report
        </button>
        {props.onStartNegotiation && (
          <button
            type="button"
            onClick={props.onStartNegotiation}
            style={{
              flex: 1,
              padding: "10px 12px",
              background: GOLD,
              border: `1px solid ${GOLD}`,
              borderRadius: 8,
              color: "#1A1A2E",
              fontSize: 10.5,
              letterSpacing: 0.08 * 10,
              textTransform: "uppercase",
              fontWeight: 800,
              cursor: "pointer",
              fontFamily: "inherit",
              transition: "background 150ms ease, border-color 150ms ease",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = "#D8B97E"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = GOLD; }}
          >
            Start Negotiation
          </button>
        )}
      </div>
    </div>
  );
}

// ── Sub-components ──────────────────────────────────────────────────

function Verdict({ color, label }: { color: string; label: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 0" }}>
      <span style={{ width: 10, height: 10, borderRadius: "50%", background: color, display: "inline-block" }} />
      <span style={{ color, fontSize: 12, fontWeight: 700, letterSpacing: 0.3 }}>{label}</span>
    </div>
  );
}

function SellVsJvRow({ share, profit, delta }: { share: number; profit: number; delta: number }) {
  const deltaColor = delta >= 0 ? GREEN : GRAY;
  return (
    <>
      <div style={{ color: TXT, fontSize: 11 }}>{share}%</div>
      <div style={{ color: TXT, fontSize: 11, fontVariantNumeric: "tabular-nums" }}>{fmtAedExact(profit)}</div>
      <div style={{ color: deltaColor, fontSize: 11, fontVariantNumeric: "tabular-nums" }}>
        {delta >= 0 ? "+" : ""}{fmtAedExact(delta)}
      </div>
    </>
  );
}
