// ZAAHI Feasibility v6.0 — plain-language field tooltips.
//
// Per founder direction (B2 2026-06-06): each tooltip in three short
// sentences max — what the field is · what it means for the deal · what
// to enter (and the formula if helpful). No jargon, no academic citations.
// English only at v6 launch; AR/RU translations deferred per spec Q3.

export const TOOLTIPS: Record<string, string> = {
  // ── Engine selector ───────────────────────────────────────────────
  engine:
    "Picks the asset class (Residential, Office, Hotel...). Each engine seeds different per-sqft cost and price assumptions. Switching engines won't wipe values you've already typed.",

  // ── Area block ────────────────────────────────────────────────────
  plotArea:
    "Land area of the plot in square feet (sqft), as registered with DLD. Comes from the title deed. 1 sqm ≈ 10.76 sqft.",
  far:
    "Floor Area Ratio — how many times the plot area you can build above ground. Set by the master developer / DDA. Formula: GFA = Plot × FAR.",
  gfa:
    "Gross Floor Area — total built space above ground (sqft). Auto: GFA = Plot × FAR.",
  bua:
    "Built-Up Area — GFA plus podiums, parking, basements, terraces. In Dubai, BUA is usually ~1.85 × GFA. You build (and pay) for BUA, you sell SFA.",
  buaRatio:
    "BUA divided by GFA. Default 1.85 in Dubai; villas can be lower, hotels with big podiums higher.",
  efficiency:
    "Sellable share of GFA in %. The rest is cores, walls, common areas. Residential 75–85%, office 80–88%, retail 65–75%. Formula: SFA = GFA × Efficiency.",
  sfa:
    "Saleable Floor Area — the part you actually sell or lease. Revenue is calculated on SFA, not BUA or GFA.",

  // ── Land block ────────────────────────────────────────────────────
  landCost:
    "What you pay the seller for the plot (AED). Loaded from the listing or typed manually. Excludes DLD and any broker fee.",
  dldFee:
    "Dubai Land Department transfer fee at 4% of the land price. Paid once at closing. Auto-computed.",
  brokerageOnLand:
    "Buyer-side broker commission on the land purchase, in %. Default 0 — most users transact direct with the developer. Formula: Brokerage = Land × %.",
  paymentMode:
    "Full = pay land in one shot at closing. Installments = down payment + scheduled tranches. Installments delay the land outflow and free up early cash.",
  downPayment:
    "First chunk of the land price paid at closing, in %. UAE land is usually 20–30%. Below 20% is rare and may need a bank.",
  numberOfPayments:
    "How many tranches you pay after the down payment. Typical 4–12 tranches over the agreed period.",
  periodMonths:
    "Total months the remaining land balance is spread over. Separate from the construction schedule.",

  // ── Construction block ────────────────────────────────────────────
  constructionPsf:
    "Bare construction cost per sqft of BUA (AED). Excludes consultants, brand, infra, contingency. Engine default = market benchmark; override with your contractor quote.",
  brandPsf:
    "Extra cost per sqft BUA when you partner with a luxury/operator brand (Aman, Six Senses, etc.). Zero for unbranded. Hospitality often 100+.",
  consultancyPsf:
    "Architect, structural, MEP, QS fees per sqft BUA. Industry norm ~15–25 for residential; higher for healthcare.",
  infrastructurePsf:
    "On-plot infrastructure cost per sqft BUA — utilities trenches, hardscape, landscape. Typically 15–30 AED.",
  contingency:
    "Reserve buffer as % of base construction. RICS guidance: 5–10% pre-tender, 3–5% once contractor is signed.",
  totalConstruction:
    "Sum of construction + brand + consultancy + infra (× BUA), plus contingency. Auto.",

  // ── Finance block ─────────────────────────────────────────────────
  financeEnabled:
    "Turn on if the project carries a construction loan. Off = pure equity, no interest.",
  loanAed:
    "Construction-loan principal (AED) — borrowed by the developer, not by the buyer. Typically 50–70% of total construction cost. The CBUAE off-plan 50% LTV cap is a retail buyer rule; it does NOT apply to this developer loan.",
  ratePct:
    "Annual interest rate in %. Q2 2026 reference: 3M EIBOR ~4.8–5.0% + bank spread 1.5–3% = ~6.3–8.0% all-in.",
  financePeriodMonths:
    "Loan tenor in months. Construction loans 24–48 months typical; refinanced to a permanent loan at handover.",

  // ── BtS revenue ──────────────────────────────────────────────────
  salesPsf:
    "Average sales price per sqft of SFA (AED). Engine default = current market median; off-plan typically prices ~10–15% above secondary.",
  commission:
    "Brokerage / aggregator commission on the SALE, in % of gross revenue. Direct sales 2% per side; mass-market aggregator launches 6–10% all-in.",
  marketing:
    "Marketing budget in % of gross revenue. 1–3% boutique launches, 4–8% mass-market.",
  devServices:
    "Optional developer management / brand fee in % of gross revenue. Branded-residence operators usually take 2–8%.",
  netRevenue:
    "Gross revenue minus commission, marketing, developer-services. Auto.",
  roi:
    "Return on Investment = Net Profit ÷ Total Investment × 100. Quick read but ignores how long the project runs. See IRR for the time-weighted view.",

  // ── BtR rental ────────────────────────────────────────────────────
  monthlyRent:
    "Average monthly rent per sqft of SFA (AED). Engine default = recent CBRE/JLL leasing data. Annual rent = monthly × 12.",
  occupancy:
    "Stabilised occupancy of SFA in %. Dubai residential 88–95%, office 80–88%, hospitality 65–78%.",
  annualIncrease:
    "Year-over-year rent escalation %. RERA caps renewals, but new leases are free-market. Default 3%.",
  operating:
    "Operating expenses as % of gross rent — service charge, FM, voids, marketing. Residential 25–35%, hotel 55–65%.",
  yieldPct:
    "Net Annual rent ÷ Total Investment × 100. First-year cap rate. 7%+ strong for Dubai resi.",

  // ── JV ────────────────────────────────────────────────────────────
  jvType:
    "Equity = profit split mirrors capital contribution. Profit-sharing = a direct negotiated %, regardless of capital share.",
  landownerLandContribution:
    "Value of the land brought to the JV by the landowner. Treated as their in-kind capital contribution.",
  landownerSharePct:
    "Landowner's slice of net JV profit. Equity mode auto-locks this to capital ratio; profit-share lets you set it manually.",

  // ── Diff badge ────────────────────────────────────────────────────
  diffBadge:
    "How far your value sits from the engine default, in %. Green up to 15%, amber 15–30%, deeper amber 30–50%, red 50%+. Click to reset to the default.",
};

export function getTooltip(key: string): string | undefined {
  return TOOLTIPS[key];
}
