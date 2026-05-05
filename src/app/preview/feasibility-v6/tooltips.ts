// ZAAHI Feasibility v6.0 — top 30 field tooltips, EN-only.
//
// Per docs/specs/feasibility-v6/03_UX_FULLSCREEN_AND_DIFF.md §4 and Q3 in
// docs/specs/feasibility-v6/10_FOUNDER_RATIFY_P0.md (Option C: hybrid =
// short EN-only tooltips for top 30 fields, full institutional explanation
// in 07_METHODOLOGY.md). AR/RU translations deferred to Phase B per Q5.
//
// Each tooltip ≤ 140 chars. Sources are short tags; long form lives in
// 07_METHODOLOGY.md. Keep this file as the single map — do not inline copy.

export const TOOLTIPS: Record<string, string> = {
  // ── Engine selector ───────────────────────────────────────────────
  engine:
    'Specialised cost / revenue model for the asset class. Switching engines re-seeds psf defaults but preserves your manual overrides.',

  // ── Area block ────────────────────────────────────────────────────
  plotArea:
    'Plot area in sqft as registered with DLD. Source of truth: Title Deed / DDA polygon. 1 sqm = 10.7639 sqft.',
  far:
    'Floor Area Ratio = GFA ÷ plot area. Set by master-developer affection plan. Manual override allowed for what-if.',
  gfa:
    'Gross Floor Area = plot area × FAR. Total covered area regardless of use, including circulation and walls.',
  bua:
    'Built-Up Area = GFA × ~1.85 in Dubai (covers podiums, basements, terraces). Founder-ratified ratio 5 May 2026.',
  buaRatio:
    'BUA / GFA ratio. Default 1.85 in Dubai (RICS NRM 1 + DM circular 168/2018). Range 1.50–2.20 typical.',
  efficiency:
    'Saleable Floor Area / GFA. Higher = more leasable space. Residential 75–85%, office 80–88%, retail 65–75%.',
  sfa:
    'Saleable / leasable Floor Area = GFA × efficiency. Revenue is calculated on SFA, not GFA.',

  // ── Land block ────────────────────────────────────────────────────
  landCost:
    'All-cash land acquisition price in AED. From Excel feed, Add-Plot form, or owner-edited. Never auto-calculated.',
  dldFee:
    '4% Dubai Land Department registration fee on land transfer. Applies once at acquisition, not at unit sales.',
  paymentMode:
    'Full = pay at closing. Installments = downpayment + N tranches over period. Affects ROI on initial capital.',
  downPayment:
    'Percent paid at closing if installments. UAE land norm 20–30%. Below 20% rare and usually requires bank involvement.',
  numberOfPayments:
    'How many post-downpayment tranches. Typical 4–12 over 12–36 months. Spec defaults to 8.',
  periodMonths:
    'Total months over which the remaining land cost is paid. Independent of construction schedule.',

  // ── Construction block ────────────────────────────────────────────
  constructionPsf:
    'Pure construction cost per sqft of BUA, excluding consultancy / brand / infra. RICS NRM 1 base. Engine-seeded; override freely.',
  brandPsf:
    'Brand / collaboration premium psf BUA — luxury or signature partner uplift. Zero by default, hospitality 100+.',
  consultancyPsf:
    'Architecture, MEP, structural, QS fees psf BUA. Industry norm 15–25 AED/sqft for residential, higher for healthcare.',
  infrastructurePsf:
    'On-plot infrastructure psf BUA (utilities, hardscape, landscape). 15–30 AED typical. Off-plot infra excluded.',
  contingency:
    'Reserve as % of base construction. RICS NRM 1 recommends 5–10% pre-tender, 3–5% post-tender. Default 5%.',
  totalConstruction:
    'Sum of construction + brand + consultancy + infra, multiplied by BUA, plus contingency. Server-rounded to AED.',

  // ── Finance block ─────────────────────────────────────────────────
  financeEnabled:
    'Toggle whether project carries debt. When off, no interest cost flows into total investment.',
  loanAed:
    'Principal in AED. Construction loans typically 50–70% of total construction cost. UAE LTV cap by SCA / CBUAE.',
  ratePct:
    'Annual interest rate %. Q1 2026 UAE benchmark 5.4–6.2% for development loans, +risk margin per project.',
  financePeriodMonths:
    'Loan tenor in months. Construction loans 24–48 months Dubai-typical, refinanced to permanent on stabilisation.',

  // ── BtS revenue ──────────────────────────────────────────────────
  salesPsf:
    'Sales price per sqft of SFA. Engine-seeded from CBRE / DLD recents. Off-plan engine adds ~12% over secondary.',
  commission:
    'Sales commission as % of gross revenue. Dubai broker norm 2% per side; aggregator-led launches 6–10% all-in.',
  marketing:
    'Marketing spend as % of gross revenue. 1–3% boutique, 4–8% mass-market launches.',
  devServices:
    'Developer services / management fee as % of gross revenue. Branded-residence managers charge 2–8%.',
  netRevenue:
    'Gross revenue minus commission, marketing, developer services. Excludes finance and construction (those are costs).',
  roi:
    'Net profit ÷ total investment × 100. Strong ≥ 25%, moderate 15–25%, below < 15% per founder verdict bands.',

  // ── BtR rental ────────────────────────────────────────────────────
  monthlyRent:
    'Monthly rent psf SFA in AED. Annual = monthly × 12. Engine-seeded from CBRE / JLL recent leasing data.',
  occupancy:
    'Stabilised occupancy as % of SFA. Dubai residential 88–95%, office 80–88%, hospitality 65–78%.',
  annualIncrease:
    'Year-on-year rent escalation %. RERA index caps for renewals; new leases free-market. Default 3%.',
  operating:
    'Operating expenses as % of gross rent. Includes service charges, FM, voids, marketing. Residential 25–35%, hotel 55–65%.',
  yieldPct:
    'Net annual rent ÷ total investment × 100. Strong ≥ 8%, moderate 5–8%, below < 5%.',

  // ── JV ────────────────────────────────────────────────────────────
  jvType:
    'Equity = profit split by capital share. Profit-sharing = direct % of net profit, decoupled from capital ratio.',
  landownerLandContribution:
    'Land valuation contributed by landowner to the JV. Treated as in-kind capital at appraised value.',
  landownerSharePct:
    'Landowner % of net JV profit. Equity mode auto-snaps to capital ratio; profit-share mode is freely negotiated.',

  // ── Diff badge ────────────────────────────────────────────────────
  diffBadge:
    'Live deviation vs engine default. Green ≤15%, amber 15–30%, amber-bold 30–50%, red ≥50%. Click to reset to default.',
};

export function getTooltip(key: string): string | undefined {
  return TOOLTIPS[key];
}
