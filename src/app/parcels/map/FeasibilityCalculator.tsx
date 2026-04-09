"use client";
import { useEffect, useMemo, useState, useCallback } from "react";

interface Props {
  plotAreaSqft: number;
  plotPriceAed: number;
  gfaSqft: number;
  far: number | null;
  landUse: string;
  landUseMix?: Array<{ category: string; sub: string }> | null;
}

const GOLD = "#C8A96E";
const RED = "#B91C1C";
const GREEN = "#15803D";
const TXT = "#1A1A2E";

const fmt = (n: number): string => {
  if (!Number.isFinite(n)) return "—";
  return Math.round(n).toLocaleString("en-US");
};
const fmtAed = (n: number): string => {
  if (!Number.isFinite(n)) return "—";
  if (Math.abs(n) >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (Math.abs(n) >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return Math.round(n).toLocaleString("en-US");
};

// ── Property type detection & defaults ─────────────────────────────
type PropType = "APARTMENT" | "VILLA" | "COMMERCIAL" | "HOTEL" | "RETAIL" | "MIXED_USE";
const DEFAULTS: Record<PropType, { construction: number; sell: number }> = {
  APARTMENT:  { construction: 450, sell: 1800 },
  VILLA:      { construction: 350, sell: 1200 },
  COMMERCIAL: { construction: 500, sell: 2200 },
  HOTEL:      { construction: 650, sell: 2500 },
  RETAIL:     { construction: 400, sell: 2800 },
  MIXED_USE:  { construction: 480, sell: 2000 },
};
function detectType(
  landUse: string,
  mix?: Array<{ category: string; sub: string }> | null,
): PropType {
  if (mix && mix.length > 1) return "MIXED_USE";
  const s = `${landUse} ${(mix ?? []).map((u) => `${u.category} ${u.sub}`).join(" ")}`.toUpperCase();
  if (/HOTEL|RESORT/.test(s)) return "HOTEL";
  if (/RETAIL|MALL|SHOP/.test(s)) return "RETAIL";
  if (/OFFICE|COMMERCIAL/.test(s)) return "COMMERCIAL";
  if (/VILLA|TOWNHOUSE/.test(s)) return "VILLA";
  if (/MIXED/.test(s)) return "MIXED_USE";
  return "APARTMENT";
}

export default function FeasibilityCalculator({
  plotAreaSqft,
  plotPriceAed: plotPriceAedProp,
  gfaSqft: gfaSqftProp,
  far,
  landUse,
  landUseMix,
}: Props) {
  const propType = useMemo(() => detectType(landUse, landUseMix), [landUse, landUseMix]);
  const def = DEFAULTS[propType];

  // Editable when missing from DDA — fall back to user input.
  const [plotPriceAed, setPlotPriceAed] = useState(plotPriceAedProp);
  const [gfaSqft, setGfaSqft] = useState(gfaSqftProp);
  // If parent props change (different parcel), reset.
  useEffect(() => {
    setPlotPriceAed(plotPriceAedProp);
    setGfaSqft(gfaSqftProp);
  }, [plotPriceAedProp, gfaSqftProp]);

  // ── Group 1: Land Acquisition ──
  const [agentLandPct, setAgentLandPct] = useState(2);
  const [brokerPct, setBrokerPct] = useState(0);
  const [legalNoc, setLegalNoc] = useState(15_000);
  const [oqood, setOqood] = useState(0);

  // ── Group 2: Construction ──
  const [sellableAreaPct, setSellableAreaPct] = useState(80);
  const [constCost, setConstCost] = useState(def.construction);
  const [fitoutCost, setFitoutCost] = useState(150);
  const [landscaping, setLandscaping] = useState(500_000);
  const [mepCost, setMepCost] = useState(80);

  // ── Group 3: Soft Costs ──
  const [designPct, setDesignPct] = useState(7);
  const [pmPct, setPmPct] = useState(3);
  const [approvals, setApprovals] = useState(200_000);
  const [muniPct, setMuniPct] = useState(2);
  const [dewa, setDewa] = useState(300_000);
  const [insurancePct, setInsurancePct] = useState(1.5);
  const [marketingPct, setMarketingPct] = useState(3);

  // ── Group 4: Finance ──
  const [equityPct, setEquityPct] = useState(40);
  const [interestRate, setInterestRate] = useState(6.5);
  const [loanTermMonths, setLoanTermMonths] = useState(36);
  const [arrangePct, setArrangePct] = useState(1);

  // ── Group 5: Revenue ──
  const [sellPrice, setSellPrice] = useState(def.sell);
  const [parkingPerSpace, setParkingPerSpace] = useState(50_000);
  const [parkingCount, setParkingCount] = useState(0);
  const [rentalYield, setRentalYield] = useState(7);

  // Collapsible
  const [open, setOpen] = useState({ land: true, build: false, soft: false, fin: false, rev: true });
  const toggle = useCallback((k: keyof typeof open) => setOpen((o) => ({ ...o, [k]: !o[k] })), []);

  const reset = useCallback(() => {
    setAgentLandPct(2); setBrokerPct(0); setLegalNoc(15_000); setOqood(0);
    setSellableAreaPct(80); setConstCost(def.construction); setFitoutCost(150);
    setLandscaping(500_000); setMepCost(80);
    setDesignPct(7); setPmPct(3); setApprovals(200_000); setMuniPct(2);
    setDewa(300_000); setInsurancePct(1.5); setMarketingPct(3);
    setEquityPct(40); setInterestRate(6.5); setLoanTermMonths(36); setArrangePct(1);
    setSellPrice(def.sell); setParkingPerSpace(50_000); setParkingCount(0); setRentalYield(7);
  }, [def]);

  const r = useMemo(() => {
    // ── LAND ──
    const dldFee = plotPriceAed * 0.04;
    const agentLandFee = plotPriceAed * (agentLandPct / 100);
    const brokerFee = plotPriceAed * (brokerPct / 100);
    const totalLand = plotPriceAed + dldFee + agentLandFee + brokerFee + legalNoc + oqood;

    // ── CONSTRUCTION (hard) ──
    const buildCost = gfaSqft * constCost;
    const fitoutTotal = gfaSqft * fitoutCost;
    const mepTotal = gfaSqft * mepCost;
    const totalHard = buildCost + fitoutTotal + mepTotal + landscaping;

    // ── REVENUE (need this before soft for marketing %) ──
    const sellableArea = gfaSqft * (sellableAreaPct / 100);
    const grossSales = sellableArea * sellPrice;
    const parkingRevenue = parkingPerSpace * parkingCount;
    const grossRevenue = grossSales + parkingRevenue;
    const salesAgentFee = grossRevenue * 0.02;
    const netRevenue = grossRevenue - salesAgentFee;

    // ── SOFT ──
    const designCost = totalHard * (designPct / 100);
    const pmCost = totalHard * (pmPct / 100);
    const muniCost = totalHard * (muniPct / 100);
    const insuranceCost = totalHard * (insurancePct / 100);
    const marketingCost = grossRevenue * (marketingPct / 100);
    const totalSoft = designCost + pmCost + approvals + muniCost + dewa + insuranceCost + marketingCost;

    // ── FINANCE ──
    const bankPct = 100 - equityPct;
    const preFinance = totalLand + totalHard + totalSoft;
    const loanAmount = preFinance * (bankPct / 100);
    const interest = loanAmount * (interestRate / 100) * (loanTermMonths / 12);
    const arrangeFee = loanAmount * (arrangePct / 100);
    const totalFinance = interest + arrangeFee;

    // ── TOTAL ──
    const totalInvestment = totalLand + totalHard + totalSoft + totalFinance;
    const equityInvested = totalInvestment - loanAmount;

    // ── BOTTOM ──
    const netProfit = netRevenue - totalInvestment;
    const roi = totalInvestment > 0 ? (netProfit / totalInvestment) * 100 : 0;
    const irr = loanTermMonths > 0
      ? (Math.pow(1 + roi / 100, 12 / loanTermMonths) - 1) * 100
      : 0;
    const profitPerSqft = sellableArea > 0 ? netProfit / sellableArea : 0;
    const breakeven = sellableArea > 0 ? totalInvestment / sellableArea : 0;
    const costPerSqftGfa = gfaSqft > 0 ? totalInvestment / gfaSqft : 0;
    const equityMultiple = equityInvested > 0 ? netRevenue / equityInvested : 0;
    const annualRentalRevenue = grossRevenue * (rentalYield / 100);

    return {
      dldFee, agentLandFee, brokerFee, totalLand,
      buildCost, fitoutTotal, mepTotal, totalHard,
      designCost, pmCost, muniCost, insuranceCost, marketingCost, totalSoft,
      bankPct, loanAmount, interest, arrangeFee, totalFinance,
      totalInvestment, equityInvested,
      sellableArea, grossSales, parkingRevenue, grossRevenue, salesAgentFee, netRevenue,
      netProfit, roi, irr, profitPerSqft, breakeven, costPerSqftGfa, equityMultiple,
      annualRentalRevenue,
    };
  }, [
    plotPriceAed, gfaSqft, agentLandPct, brokerPct, legalNoc, oqood,
    sellableAreaPct, constCost, fitoutCost, landscaping, mepCost,
    designPct, pmPct, approvals, muniPct, dewa, insurancePct, marketingPct,
    equityPct, interestRate, loanTermMonths, arrangePct,
    sellPrice, parkingPerSpace, parkingCount, rentalYield,
  ]);

  const roiColor = r.roi >= 25 ? GOLD : r.roi >= 0 ? GREEN : RED;
  const profitColor = r.netProfit >= 0 ? GREEN : RED;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8, color: TXT }}>
      {/* Context — Plot/FAR/Type are read-only; Price + GFA are editable
           so the calculator works even when DDA didn't return them. */}
      <div className="grid grid-cols-2 gap-x-3 gap-y-0.5" style={{ fontSize: 10 }}>
        <KV k="Plot" v={`${fmt(plotAreaSqft)} sqft`} />
        <KV k="FAR" v={far?.toString() ?? "—"} />
        <KV k="Type" v={propType.replace("_", " ")} />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginTop: 2 }}>
        <Num label="Plot Price AED" value={plotPriceAed} onChange={setPlotPriceAed} step={100_000} />
        <Num label="Max GFA sqft" value={gfaSqft} onChange={setGfaSqft} step={500} />
      </div>
      {(plotPriceAed === 0 || gfaSqft === 0) && (
        <div style={{ fontSize: 9, color: "#B45309", fontStyle: "italic" }}>
          ⚠ Enter Plot Price and Max GFA above to see real numbers.
        </div>
      )}

      <Group title="Land Acquisition" open={open.land} onToggle={() => toggle("land")}>
        <RowRO k="Plot Price" v={fmtAed(plotPriceAed)} />
        <RowRO k="DLD Fee (4%)" v={fmtAed(r.dldFee)} />
        <Num label="Agent Fee %" value={agentLandPct} onChange={setAgentLandPct} step={0.5} />
        <Num label="Broker Fee %" value={brokerPct} onChange={setBrokerPct} step={0.5} />
        <Num label="Legal & NOC AED" value={legalNoc} onChange={setLegalNoc} step={1000} />
        <Num label="Oqood AED" value={oqood} onChange={setOqood} step={1000} />
        <Total k="Total Land" v={fmtAed(r.totalLand)} />
      </Group>

      <Group title="Construction" open={open.build} onToggle={() => toggle("build")}>
        <Num label="Sellable Area %" value={sellableAreaPct} onChange={setSellableAreaPct} step={1} />
        <Num label="Constr. AED/sqft" value={constCost} onChange={setConstCost} step={10} />
        <Num label="Fit-out AED/sqft" value={fitoutCost} onChange={setFitoutCost} step={10} />
        <Num label="MEP AED/sqft" value={mepCost} onChange={setMepCost} step={5} />
        <Num label="Landscaping AED" value={landscaping} onChange={setLandscaping} step={50_000} />
        <Total k="Total Hard" v={fmtAed(r.totalHard)} />
      </Group>

      <Group title="Soft Costs" open={open.soft} onToggle={() => toggle("soft")}>
        <Num label="Design %" value={designPct} onChange={setDesignPct} step={0.5} />
        <Num label="PM %" value={pmPct} onChange={setPmPct} step={0.5} />
        <Num label="Approvals AED" value={approvals} onChange={setApprovals} step={10_000} />
        <Num label="Municipality %" value={muniPct} onChange={setMuniPct} step={0.5} />
        <Num label="DEWA AED" value={dewa} onChange={setDewa} step={10_000} />
        <Num label="Insurance %" value={insurancePct} onChange={setInsurancePct} step={0.5} />
        <Num label="Marketing %" value={marketingPct} onChange={setMarketingPct} step={0.5} />
        <Total k="Total Soft" v={fmtAed(r.totalSoft)} />
      </Group>

      <Group title="Finance" open={open.fin} onToggle={() => toggle("fin")}>
        <Num label="Equity %" value={equityPct} onChange={setEquityPct} step={5} />
        <RowRO k="Bank %" v={`${r.bankPct}%`} />
        <Num label="Interest %" value={interestRate} onChange={setInterestRate} step={0.25} />
        <Num label="Term (months)" value={loanTermMonths} onChange={setLoanTermMonths} step={6} />
        <Num label="Arrangement %" value={arrangePct} onChange={setArrangePct} step={0.25} />
        <RowRO k="Loan Amount" v={fmtAed(r.loanAmount)} />
        <RowRO k="Interest" v={fmtAed(r.interest)} />
        <Total k="Total Finance" v={fmtAed(r.totalFinance)} />
      </Group>

      <Group title="Revenue" open={open.rev} onToggle={() => toggle("rev")}>
        <Num label="Sell AED/sqft" value={sellPrice} onChange={setSellPrice} step={50} />
        <Num label="Parking AED/spot" value={parkingPerSpace} onChange={setParkingPerSpace} step={5_000} />
        <Num label="Parking spots" value={parkingCount} onChange={setParkingCount} step={1} />
        <Num label="Rental Yield %" value={rentalYield} onChange={setRentalYield} step={0.5} />
        <RowRO k="Sellable Area" v={`${fmt(r.sellableArea)} sqft`} />
        <RowRO k="Gross Sales" v={fmtAed(r.grossSales)} />
        <RowRO k="− Agent (2%)" v={fmtAed(r.salesAgentFee)} />
        <Total k="Net Revenue" v={fmtAed(r.netRevenue)} />
      </Group>

      {/* RESULTS */}
      <div
        style={{
          marginTop: 4,
          padding: 10,
          border: `1px solid ${GOLD}`,
          borderRadius: 6,
          background: "rgba(200,169,110,0.06)",
          display: "flex",
          flexDirection: "column",
          gap: 4,
        }}
      >
        <SumLine label="Total Investment" value={fmtAed(r.totalInvestment)} color={RED} />
        <SumLine label="Net Revenue" value={fmtAed(r.netRevenue)} color={GREEN} />
        <SumLine label="Net Profit" value={fmtAed(r.netProfit)} color={profitColor} />

        <div
          style={{
            borderTop: "1px solid #E5E7EB",
            marginTop: 4,
            paddingTop: 6,
            display: "flex",
            alignItems: "baseline",
            justifyContent: "space-between",
          }}
        >
          <span style={{ fontSize: 11, color: "#6B7280", textTransform: "uppercase", letterSpacing: 1 }}>
            ROI
          </span>
          <span style={{ color: roiColor, fontWeight: 800, fontSize: 28, lineHeight: 1 }}>
            {r.roi.toFixed(1)}%
          </span>
        </div>

        <div className="grid grid-cols-2 gap-x-3 gap-y-0.5" style={{ fontSize: 10, marginTop: 2 }}>
          <KV k="IRR (annualized)" v={`${r.irr.toFixed(1)}%`} />
          <KV k="Equity Multiple" v={`${r.equityMultiple.toFixed(2)}×`} />
          <KV k="Profit / sqft" v={`${fmt(r.profitPerSqft)} AED`} />
          <KV k="Breakeven / sqft" v={`${fmt(r.breakeven)} AED`} />
          <KV k="Cost / GFA sqft" v={`${fmt(r.costPerSqftGfa)} AED`} />
          <KV k="Annual Rental" v={fmtAed(r.annualRentalRevenue)} />
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-1.5">
        <button
          disabled
          title="PDF export — coming next"
          className="flex-1 rounded border"
          style={{
            fontSize: 11,
            padding: "5px 8px",
            borderColor: GOLD,
            color: GOLD,
            background: "white",
            cursor: "not-allowed",
            opacity: 0.7,
          }}
        >
          Export PDF
        </button>
        <button
          onClick={reset}
          className="flex-1 rounded border"
          style={{
            fontSize: 11,
            padding: "5px 8px",
            borderColor: "#D1D5DB",
            color: TXT,
            background: "white",
            cursor: "pointer",
          }}
        >
          Reset
        </button>
      </div>
    </div>
  );
}

// ── primitives ─────────────────────────────────────────────────────
function Group({
  title, open, onToggle, children,
}: { title: string; open: boolean; onToggle: () => void; children: React.ReactNode }) {
  return (
    <div style={{ borderTop: "1px solid #E5E7EB", paddingTop: 6 }}>
      <button
        onClick={onToggle}
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          background: "transparent",
          border: 0,
          padding: 0,
          cursor: "pointer",
          color: GOLD,
          fontWeight: 700,
          fontSize: 10,
          textTransform: "uppercase",
          letterSpacing: 1.2,
        }}
      >
        <span>{title}</span>
        <span style={{ color: "#9CA3AF" }}>{open ? "▾" : "▸"}</span>
      </button>
      {open && (
        <div style={{ marginTop: 6, display: "flex", flexDirection: "column", gap: 4 }}>
          {children}
        </div>
      )}
    </div>
  );
}

function Num({
  label, value, onChange, step = 1,
}: { label: string; value: number; onChange: (v: number) => void; step?: number }) {
  return (
    <label style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 6 }}>
      <span style={{ fontSize: 10, color: "#6B7280", flex: 1 }}>{label}</span>
      <input
        type="number"
        value={value}
        step={step}
        onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
        style={{
          width: 90,
          fontSize: 11,
          padding: "3px 6px",
          color: TXT,
          background: "white",
          border: "1px solid #D1D5DB",
          borderRadius: 4,
          textAlign: "right",
          outline: "none",
        }}
        onFocus={(e) => (e.currentTarget.style.borderColor = GOLD)}
        onBlur={(e) => (e.currentTarget.style.borderColor = "#D1D5DB")}
      />
    </label>
  );
}

function RowRO({ k, v }: { k: string; v: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "#374151" }}>
      <span style={{ color: "#6B7280" }}>{k}</span>
      <span>{v}</span>
    </div>
  );
}
function Total({ k, v }: { k: string; v: string }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        fontSize: 11,
        fontWeight: 700,
        color: TXT,
        borderTop: "1px dashed #D1D5DB",
        marginTop: 2,
        paddingTop: 3,
      }}
    >
      <span>{k}</span>
      <span>{v}</span>
    </div>
  );
}
function KV({ k, v }: { k: string; v: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between" }}>
      <span style={{ color: "#6B7280" }}>{k}</span>
      <span style={{ color: TXT, fontWeight: 600 }}>{v}</span>
    </div>
  );
}
function SumLine({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11 }}>
      <span style={{ color: "#6B7280" }}>{label}</span>
      <span style={{ color, fontWeight: 800 }}>{value}</span>
    </div>
  );
}
