/* ═══════════════════════════════════════════════════════════════════
   ZAAHI FEASIBILITY ENGINE v5.0 — Pure formulas, no UI.
   Build-to-Sell · Build-to-Rent · Joint Venture.
   All math spec'd verbatim from founder's v5 brief (2026-04-15).
   ═══════════════════════════════════════════════════════════════════ */

// ── Shared area inputs ──────────────────────────────────────────────

export interface AreaInputs {
  plotAreaSqft: number;
  far: number;
  bua: number;       // sqft
  efficiencyPct: number; // 0..100
}

export interface AreaDerived {
  plotAreaSqft: number;
  far: number;
  gfa: number;
  bua: number;
  buaGfaRatio: number;
  efficiencyPct: number;
  sfa: number;
}

export function deriveArea(a: AreaInputs): AreaDerived {
  const gfa = a.plotAreaSqft * a.far;
  const bua = a.bua > 0 ? a.bua : 0;
  const buaGfaRatio = gfa > 0 ? bua / gfa : 0;
  const sfa = gfa * (a.efficiencyPct / 100);
  return {
    plotAreaSqft: a.plotAreaSqft,
    far: a.far,
    gfa,
    bua,
    buaGfaRatio,
    efficiencyPct: a.efficiencyPct,
    sfa,
  };
}

// ── Land ────────────────────────────────────────────────────────────

export type LandPaymentMode = "full" | "installments";

export interface LandInputs {
  landCostAed: number;
  dldPct: number;            // default 4
  paymentMode: LandPaymentMode;
  downPaymentPct: number;    // only if installments, default 30
  numberOfPayments: number;  // default 8
  periodMonths: number;      // default 24
}

export interface LandDerived {
  landCostAed: number;
  pricePerSqftGfa: number;
  dldFeeAed: number;
  totalLandCostAed: number;   // land + DLD
  // installments:
  downPaymentAed: number;
  remainingAed: number;
  installmentPerPayment: number;
  monthlyInstallmentAed: number;
}

export function deriveLand(l: LandInputs, gfa: number): LandDerived {
  const dldFeeAed = l.landCostAed * (l.dldPct / 100);
  const totalLandCostAed = l.landCostAed + dldFeeAed;
  const pricePerSqftGfa = gfa > 0 ? l.landCostAed / gfa : 0;

  let downPaymentAed = 0;
  let remainingAed = 0;
  let installmentPerPayment = 0;
  let monthlyInstallmentAed = 0;
  if (l.paymentMode === "installments") {
    downPaymentAed = l.landCostAed * (l.downPaymentPct / 100);
    remainingAed = l.landCostAed - downPaymentAed;
    installmentPerPayment = l.numberOfPayments > 0 ? remainingAed / l.numberOfPayments : 0;
    monthlyInstallmentAed = l.periodMonths > 0 ? remainingAed / l.periodMonths : 0;
  }
  return {
    landCostAed: l.landCostAed,
    pricePerSqftGfa,
    dldFeeAed,
    totalLandCostAed,
    downPaymentAed,
    remainingAed,
    installmentPerPayment,
    monthlyInstallmentAed,
  };
}

// ── Construction ────────────────────────────────────────────────────

export interface ConstructionInputs {
  constructionPsfBua: number;    // default 500
  brandPsfBua: number;           // default 0
  consultancyPsfBua: number;     // default 20
  infrastructurePsfBua: number;  // default 20
  contingencyPct: number;        // default 5
}

export interface ConstructionDerived {
  perSqftBuaTotal: number;       // construction+brand+consultancy+infrastructure
  perSqftBuaWithContingency: number;
  baseConstructionAed: number;   // BUA * perSqftBuaTotal
  contingencyAed: number;
  totalConstructionAed: number;  // base + contingency
  // individual line items (for results / PDF)
  constructionAed: number;
  brandAed: number;
  consultancyAed: number;
  infrastructureAed: number;
}

export function deriveConstruction(c: ConstructionInputs, bua: number): ConstructionDerived {
  const perSqftBuaTotal = c.constructionPsfBua + c.brandPsfBua + c.consultancyPsfBua + c.infrastructurePsfBua;
  const perSqftBuaWithContingency = perSqftBuaTotal * (1 + c.contingencyPct / 100);
  const constructionAed = bua * c.constructionPsfBua;
  const brandAed = bua * c.brandPsfBua;
  const consultancyAed = bua * c.consultancyPsfBua;
  const infrastructureAed = bua * c.infrastructurePsfBua;
  const baseConstructionAed = constructionAed + brandAed + consultancyAed + infrastructureAed;
  const contingencyAed = baseConstructionAed * (c.contingencyPct / 100);
  return {
    perSqftBuaTotal,
    perSqftBuaWithContingency,
    baseConstructionAed,
    contingencyAed,
    totalConstructionAed: baseConstructionAed + contingencyAed,
    constructionAed,
    brandAed,
    consultancyAed,
    infrastructureAed,
  };
}

// ── Finance ─────────────────────────────────────────────────────────

export interface FinanceInputs {
  enabled: boolean;
  loanAed: number;          // default 0
  ratePct: number;          // annual, default 0
  periodMonths: number;     // default 36
}

export interface FinanceDerived {
  totalInterestAed: number;
}

export function deriveFinance(f: FinanceInputs): FinanceDerived {
  if (!f.enabled) return { totalInterestAed: 0 };
  const totalInterestAed = f.loanAed * (f.ratePct / 100) * (f.periodMonths / 12);
  return { totalInterestAed };
}

// ── Total investment (shared across all 3 tabs) ─────────────────────

export function totalInvestment(
  land: LandDerived,
  construction: ConstructionDerived,
  finance: FinanceDerived,
): number {
  return land.totalLandCostAed + construction.totalConstructionAed + finance.totalInterestAed;
}

// ── BtS revenue ─────────────────────────────────────────────────────

export interface BtSRevenueInputs {
  salesPricePsfSfa: number;
  commissionPct: number;      // default 8.5
  marketingPct: number;       // default 2.0
  devServicesPct: number;     // default 0
}

export interface BtSRevenueDerived {
  grossRevenueAed: number;
  commissionAed: number;
  marketingAed: number;
  devServicesAed: number;
  salesCostsAed: number;
  netRevenueAed: number;
}

export function deriveBtSRevenue(r: BtSRevenueInputs, sfa: number): BtSRevenueDerived {
  const grossRevenueAed = sfa * r.salesPricePsfSfa;
  const commissionAed = grossRevenueAed * (r.commissionPct / 100);
  const marketingAed = grossRevenueAed * (r.marketingPct / 100);
  const devServicesAed = grossRevenueAed * (r.devServicesPct / 100);
  const salesCostsAed = commissionAed + marketingAed + devServicesAed;
  return {
    grossRevenueAed,
    commissionAed,
    marketingAed,
    devServicesAed,
    salesCostsAed,
    netRevenueAed: grossRevenueAed - salesCostsAed,
  };
}

export interface BtSResult {
  totalInvestmentAed: number;
  netRevenueAed: number;
  netProfitAed: number;
  roiPct: number;
  profitPerSqftSfa: number;
  // installments add-on (only if payment mode = installments):
  initialCapitalAed: number;
  roiOnInitialCapitalPct: number;
}

export function computeBtS(
  area: AreaDerived,
  land: LandDerived,
  construction: ConstructionDerived,
  finance: FinanceDerived,
  revenue: BtSRevenueDerived,
  paymentMode: LandPaymentMode,
): BtSResult {
  const tI = totalInvestment(land, construction, finance);
  const netProfit = revenue.netRevenueAed - tI;
  const roiPct = tI > 0 ? (netProfit / tI) * 100 : 0;
  const profitPerSqftSfa = area.sfa > 0 ? netProfit / area.sfa : 0;

  // InitialCapital = DownPayment + first 6 months construction
  // We approximate "first 6 months construction" as half of total
  // construction budget (incl. contingency). Founder spec says
  // exactly: "InitialCapital = DownPayment + first 6 months construction".
  let initialCapitalAed = 0;
  let roiOnInitialCapitalPct = 0;
  if (paymentMode === "installments") {
    const first6moConstruction = construction.totalConstructionAed * 0.5;
    initialCapitalAed = land.downPaymentAed + first6moConstruction;
    roiOnInitialCapitalPct = initialCapitalAed > 0 ? (netProfit / initialCapitalAed) * 100 : 0;
  }

  return {
    totalInvestmentAed: tI,
    netRevenueAed: revenue.netRevenueAed,
    netProfitAed: netProfit,
    roiPct,
    profitPerSqftSfa,
    initialCapitalAed,
    roiOnInitialCapitalPct,
  };
}

// ── BtR rental income ───────────────────────────────────────────────

export interface BtRRentalInputs {
  monthlyRentPsfSfa: number;
  occupancyPct: number;       // default 85
  annualIncreasePct: number;  // default 3
  operatingPct: number;       // default 30
}

export interface BtRRentalDerived {
  grossMonthlyAed: number;
  effectiveMonthlyAed: number;
  grossAnnualAed: number;
  operatingCostAed: number;
  netAnnualAed: number;
}

export function deriveBtRRental(r: BtRRentalInputs, sfa: number): BtRRentalDerived {
  const grossMonthlyAed = sfa * r.monthlyRentPsfSfa;
  const effectiveMonthlyAed = grossMonthlyAed * (r.occupancyPct / 100);
  const grossAnnualAed = effectiveMonthlyAed * 12;
  const operatingCostAed = grossAnnualAed * (r.operatingPct / 100);
  const netAnnualAed = grossAnnualAed - operatingCostAed;
  return {
    grossMonthlyAed,
    effectiveMonthlyAed,
    grossAnnualAed,
    operatingCostAed,
    netAnnualAed,
  };
}

export interface BtRResult {
  totalInvestmentAed: number;
  grossAnnualAed: number;
  netAnnualAed: number;
  yieldPct: number;
  paybackYears: number;
  monthlyCashFlowAed: number;
  projection5y: Array<{ year: number; incomeAed: number; cumulativeAed: number }>;
  total5yAed: number;
}

export function computeBtR(
  land: LandDerived,
  construction: ConstructionDerived,
  finance: FinanceDerived,
  rental: BtRRentalDerived,
  annualIncreasePct: number,
): BtRResult {
  const tI = totalInvestment(land, construction, finance);
  const yieldPct = tI > 0 ? (rental.netAnnualAed / tI) * 100 : 0;
  const paybackYears = rental.netAnnualAed > 0 ? tI / rental.netAnnualAed : 0;
  const monthlyCashFlowAed = rental.netAnnualAed / 12;

  const projection5y: Array<{ year: number; incomeAed: number; cumulativeAed: number }> = [];
  let cumulative = 0;
  for (let n = 1; n <= 5; n++) {
    const income = rental.netAnnualAed * Math.pow(1 + annualIncreasePct / 100, n - 1);
    cumulative += income;
    projection5y.push({ year: n, incomeAed: income, cumulativeAed: cumulative });
  }

  return {
    totalInvestmentAed: tI,
    grossAnnualAed: rental.grossAnnualAed,
    netAnnualAed: rental.netAnnualAed,
    yieldPct,
    paybackYears,
    monthlyCashFlowAed,
    projection5y,
    total5yAed: cumulative,
  };
}

// ── JV ──────────────────────────────────────────────────────────────

export type JvType = "equity" | "profit_sharing";

export interface JvInputs {
  jvType: JvType;
  landownerLandContributionAed: number; // default = currentValuation if present
  landownerCashAed: number;             // default 0
  developerCashAed: number;             // default = construction + contingency + finance + DLD
  landownerSharePct: number;            // manual in profit sharing; linked in equity
}

export interface JvDerived {
  landownerTotalContribution: number;
  developerTotalContribution: number;
  totalContribution: number;
  landownerSharePct: number;
  developerSharePct: number;
  // project-level (BtS assumed for the "what the project produces")
  totalInvestmentAed: number;
  totalRevenueAed: number;
  totalProjectProfitAed: number;
  projectRoiPct: number;
  // returns
  landownerProfitAed: number;
  landownerRoiPct: number;
  developerProfitAed: number;
  developerRoiPct: number;
  breakevenJvSharePct: number;
  // sell-vs-JV compare
  sellVsJv: Array<{
    sharePct: number;
    jvProfitAed: number;
    vsSellDeltaAed: number;
  }>;
}

export function computeJv(
  jv: JvInputs,
  land: LandDerived,
  construction: ConstructionDerived,
  finance: FinanceDerived,
  revenue: BtSRevenueDerived,
): JvDerived {
  const landownerTotalContribution = jv.landownerLandContributionAed + jv.landownerCashAed;
  const developerTotalContribution = jv.developerCashAed;
  const totalContribution = landownerTotalContribution + developerTotalContribution;

  // Share computation
  let landownerSharePct = jv.landownerSharePct;
  if (jv.jvType === "equity") {
    // In equity mode default share = landContribution / totalContribution (overridable)
    landownerSharePct = jv.landownerSharePct; // caller is responsible for preseeding
  }
  // clamp 0..100
  landownerSharePct = Math.max(0, Math.min(100, landownerSharePct));
  const developerSharePct = 100 - landownerSharePct;

  const tI = totalInvestment(land, construction, finance);
  const totalRevenueAed = revenue.netRevenueAed;
  const totalProjectProfit = totalRevenueAed - tI;
  const projectRoiPct = tI > 0 ? (totalProjectProfit / tI) * 100 : 0;

  const landownerProfit = totalProjectProfit * (landownerSharePct / 100);
  const developerProfit = totalProjectProfit * (developerSharePct / 100);
  const landownerRoi = landownerTotalContribution > 0 ? (landownerProfit / landownerTotalContribution) * 100 : 0;
  const developerRoi = developerTotalContribution > 0 ? (developerProfit / developerTotalContribution) * 100 : 0;

  // Breakeven JV share: share at which landownerProfit === landValue
  // landValue / totalProjectProfit * 100 (spec formula)
  const breakevenJvSharePct = totalProjectProfit > 0
    ? (jv.landownerLandContributionAed / totalProjectProfit) * 100
    : 0;

  const sellVsJv = [20, 30, 40, 50].map((sharePct) => {
    const jvProfitAed = totalProjectProfit * (sharePct / 100);
    const vsSellDeltaAed = jvProfitAed - jv.landownerLandContributionAed;
    return { sharePct, jvProfitAed, vsSellDeltaAed };
  });

  return {
    landownerTotalContribution,
    developerTotalContribution,
    totalContribution,
    landownerSharePct,
    developerSharePct,
    totalInvestmentAed: tI,
    totalRevenueAed,
    totalProjectProfitAed: totalProjectProfit,
    projectRoiPct,
    landownerProfitAed: landownerProfit,
    landownerRoiPct: landownerRoi,
    developerProfitAed: developerProfit,
    developerRoiPct: developerRoi,
    breakevenJvSharePct,
    sellVsJv,
  };
}

// ── Verdict thresholds ──────────────────────────────────────────────

export type VerdictTone = "strong" | "moderate" | "below";
export interface Verdict { tone: VerdictTone; label: string; color: string }

export function btsVerdict(roiPct: number): Verdict {
  if (roiPct > 20) return { tone: "strong", label: "Strong return", color: "#4CAF50" };
  if (roiPct >= 10) return { tone: "moderate", label: "Moderate — review costs", color: "#C8A96E" };
  return { tone: "below", label: "Below target — reconsider", color: "#888888" };
}

export function btrVerdict(yieldPct: number): Verdict {
  if (yieldPct > 7) return { tone: "strong", label: "Strong return", color: "#4CAF50" };
  if (yieldPct >= 4) return { tone: "moderate", label: "Moderate — review costs", color: "#C8A96E" };
  return { tone: "below", label: "Below target — reconsider", color: "#888888" };
}

// ── Formatting helpers ──────────────────────────────────────────────

export function fmtAed(n: number): string {
  if (!isFinite(n)) return "—";
  const sign = n < 0 ? "-" : "";
  const v = Math.abs(n);
  if (v >= 1_000_000_000) return `${sign}AED ${(v / 1_000_000_000).toFixed(2)}B`;
  if (v >= 1_000_000) return `${sign}AED ${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `${sign}AED ${(v / 1_000).toFixed(1)}K`;
  return `${sign}AED ${v.toFixed(0)}`;
}

export function fmtAedExact(n: number): string {
  if (!isFinite(n)) return "—";
  return `AED ${Math.round(n).toLocaleString("en-US")}`;
}

export function fmtPct(n: number): string {
  if (!isFinite(n)) return "—";
  return `${n.toFixed(1)}%`;
}

export function fmtInt(n: number): string {
  if (!isFinite(n)) return "—";
  return Math.round(n).toLocaleString("en-US");
}

export function parseNumberInput(s: string): number {
  if (!s) return 0;
  const cleaned = s.replace(/[^\d.-]/g, "");
  const n = Number(cleaned);
  return isFinite(n) ? n : 0;
}

// Format a number for display in a numeric input: thousand-separated, preserving optional decimals.
export function fmtInputNumber(n: number): string {
  if (!isFinite(n)) return "";
  if (n === 0) return "0";
  const abs = Math.abs(n);
  const isInt = Math.abs(abs - Math.round(abs)) < 1e-9;
  if (isInt) return Math.round(n).toLocaleString("en-US");
  // Up to 2 decimals, still grouped
  const parts = n.toFixed(2).split(".");
  const intPart = Number(parts[0]).toLocaleString("en-US");
  return `${intPart}.${parts[1]}`;
}

// ── 9 canonical categories — for defaults mapping only (no new ones) ─

export const CANONICAL_LAND_USES = [
  "Residential",
  "Commercial",
  "Mixed Use",
  "Hotel",
  "Industrial",
  "Educational",
  "Healthcare",
  "Agricultural",
  "Future Development",
] as const;
export type CanonicalLandUse = typeof CANONICAL_LAND_USES[number];
