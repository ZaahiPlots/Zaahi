---
title: Sprint 9 — PDF + IRR/ROE + Escrow Drawdown Design Proposal
audience: Founder Dymo + Zhan
status: AWAITING APPROVAL — research + design only, no code changes yet
revision: rev-1
date: 2026-05-06
related: 11_IMPLEMENTATION_PLAN.md · 15_FINAL_DEPLOY_STATE.md
classification: CONFIDENTIAL — internal
---

# Sprint 9 — PDF + IRR/ROE + Escrow Drawdown — Design Proposal

After the Sprint 2-fast deploy unlocked all 13 engines on zaahi.io, founder
Dymo identified four issues + one new feature. This document is the
research + design output. **Zero code changed.** Ready for go/no-go.

---

## §1 Executive Summary (3-minute read)

| # | Issue / feature | Severity | Hours | Note |
|---|---|---|---:|---|
| 1 | PDF visual style not branded | Medium | 6–8 h | jsPDF supports custom fonts via base64; can deliver Georgia headings + Inter body + gold/navy print palette without switching engines |
| 2 | PDF prints all 3 modes regardless of selected tab | Low (cosmetic but confusing) | 1–2 h | Single conditional gate; logic already in scope — bug, not architecture |
| 3 | **IRR + ROE missing — actually a math gap, not a PDF gap** | **HIGH (institutional credibility)** | 6–8 h | Neither the v5 nor v6 math layer computes IRR / ROE / NPV / peak-equity. Calculator is not RICS / IVS-compliant on these specific metrics today. |
| 4 | Escrow Drawdown engine | Medium-High (Dubai material) | 10–14 h | Without it, Dubai off-plan IRR-on-equity is understated by 20-40 %. New module. Ratification needed for default schedule. |
|   | **TOTAL** | | **23–32 h** | |

**Critical finding:** Issue 3 is the most consequential. The current calculator
does **not compute IRR or ROE anywhere in the math library**, so the PDF
correctly cannot render them. This is institutionally significant — RICS NRM 1
and IVS 2025 both treat IRR + ROE as mandatory metrics for development feasibility.
Recommend fixing Issue 3 before Issue 1 (no point rendering a beautifully branded
PDF that's missing the metrics it should be rendering).

**Recommended sequencing**

1. **Issue 3 — IRR + ROE math** (6–8 h) — adds the metrics; PDF immediately
   gains them in the existing un-styled output.
2. **Issue 2 — PDF mode-aware** (1–2 h) — quick win, removes confusing 3-mode dump.
3. **Issue 4 — Escrow Drawdown engine** (10–14 h) — only after IRR/ROE land,
   because drawdown's main purpose is improving IRR-on-equity. Without IRR
   computed, the drawdown feature has no place to display its impact.
4. **Issue 1 — PDF branded style** (6–8 h) — last because by then the content
   is final and visual polish has stable inputs to dress up.

**Calendar: 4 sprints over ~2 weeks** at the current pace. Hub71 demo
9 June 2026 still comfortably in reach.

---

## §2 IRR + ROE Diagnostic (HIGHEST PRIORITY)

### Current state — what the math layer computes

`src/lib/feasibility.ts` is the single math library. v6 calculator imports
its primitives without modification. Comprehensive grep on the file plus
`src/lib/feasibility-v6/engines.ts` confirms:

```
grep -E "IRR|ROE|NPV|irr|roe|npv|peakEquity|equityRequired|leverage"
   → no matches in src/lib/feasibility.ts
   → no matches in src/lib/feasibility-v6/engines.ts (data-only)
```

**Result interface contents:**

| Metric | BtSResult | BtRResult | JvDerived |
|---|:---:|:---:|:---:|
| Total Investment | ✅ | ✅ | ✅ |
| Net Revenue / Net Annual | ✅ | ✅ | ✅ |
| Net Profit | ✅ | — | ✅ |
| **ROI** (return on total investment) | ✅ | — | ✅ project, ✅ landowner share, ✅ developer share |
| **Yield** (rental annual / investment) | — | ✅ | — |
| **ROI on Initial Capital** (BtS installments only) | ✅ | — | — |
| Profit / sqft SFA | ✅ | — | — |
| Payback (years) | — | ✅ | — |
| 5-year projection (linear) | — | ✅ | — |
| Sell vs JV table | — | — | ✅ |
| Breakeven JV share | — | — | ✅ |
| **IRR** | ❌ | ❌ | ❌ |
| **ROE** (Net Profit / equity invested) | ❌ | ❌ | ❌ |
| **NPV** | ❌ | ❌ | ❌ |
| **Peak equity invested** | ❌ | ❌ | ❌ |

ROI and ROE are different metrics:
- **ROI = Net Profit / Total Investment × 100** (currently computed)
- **ROE = Net Profit / Peak Equity × 100** (NOT computed)

The two diverge as soon as the project takes on debt. ROE isolates the
leverage effect — the metric institutional investors look at. Without ROE,
the calculator silently understates the value of leverage.

### Where the gap actually is

**Math library layer.** The PDF can't render what doesn't exist. Fixing the
PDF without fixing the math would be cosmetic. Founder Dymo's complaint
("потом нет ирр. и рое") accurately diagnoses the symptom; the cause is
deeper.

### Fix scope

#### IRR — Internal Rate of Return

Discount rate where NPV of cash flows = 0. Critical for multi-period
projects (BtR holding, JV, off-plan with payment plans).

**Inputs needed:**
- Cash-flow timeline by period: capex outflows during construction, revenue
  inflows on completion / over rental hold, exit value.
- Discount-rate seeker (Newton-Raphson over 30-50 iterations, well-known
  algorithm — implementations are 30-50 lines of TypeScript).

**Application per mode:**
- **BtS**: cash flow = land at t=0 + construction over 12-24 months + sales
  receipts at completion. IRR = annualised return rate. Differs from ROI
  because IRR weights money's time value.
- **BtR**: cash flow = total investment at t=0 + 5-10 years of rental net +
  exit value (sale at year 5 or 10). IRR is the natural metric; ROI is
  almost meaningless for hold-strategy.
- **JV**: separate IRR for landowner and developer cash-flow streams.

**Time periods**: monthly resolution is institutional-standard for
construction-intensive projects; quarterly or annual is acceptable for
simpler models. Proposal: monthly for Dubai off-plan, annual for steady-state
BtR holding.

**No external dependency** — pure math library function, ~80 lines.
Recommended location: extend `src/lib/feasibility.ts` (still 0-modify
during current cutover) → a NEW file `src/lib/feasibility-v6/irr.ts`
(additive only, doesn't violate read-only on v5).

#### ROE — Return on Equity

`Net Profit / Peak Equity Invested × 100`.

**Inputs needed:**
- Equity injection schedule (depends on debt + drawdown — see §5)
- Peak equity = max cumulative equity invested at any point

**Per mode:**
- **BtS without finance**: peak equity = total investment. ROE = ROI.
- **BtS with finance**: peak equity = total investment − loan amount. ROE > ROI.
- **BtS with installments**: peak equity = first 6 mo construction + down
  payment − loan; lower than total investment.
- **BtR**: peak equity = total investment − loan principal at closing.
- **JV**: peak equity per partner = their cash + land contribution.

**No external dependency** — pure arithmetic on existing inputs once the
peak-equity timeline is built (~30 lines).

#### NPV — Net Present Value

Optional. `NPV = Σ (cashflow_t / (1+r)^t)` for chosen discount rate `r`.
Useful for what-if comparisons but the founder didn't request it. Defer to a
later sprint unless ratified now (~20 lines once IRR machinery is in place).

### Total fix scope for §2

- 1 new file `src/lib/feasibility-v6/irr.ts` (~150 lines): IRR + ROE + NPV
  + the cash-flow timeline builder per mode.
- 3 result interfaces extended: `BtSResult`, `BtRResult`, `JvDerived` gain
  `irrPct`, `roePct`, `peakEquityAed`, `npvAed` (or just IRR/ROE if NPV
  deferred).
- 3 calculator code paths updated: `computeBtS`, `computeBtR`, `computeJv`
  call into IRR/ROE.
- 1 PDF section updated to render the new fields.
- ~6–8 hours including tests + verdict-band recalibration.

**Math is correct without external library.** Recommended algorithm: bisection
or Newton-Raphson on NPV(r) = 0. Bisection is bulletproof; Newton is faster.
Either is ~50 lines of TS. Bisection preferred for the calculator (no
convergence-failure surprises).

---

## §3 PDF Mode-Aware Output (Issue 2)

### Current behaviour

`src/components/feasibility/FeasibilityV6Calculator.tsx` lines 769-830:

```ts
const downloadPDF = useCallback(() => {
  // ...header, parcel info...
  h1('BUILD-TO-SELL');
  // ... unconditional BtS fields ...
  doc.addPage();
  h1('BUILD-TO-RENT');
  // ... unconditional BtR fields ...
  doc.addPage();
  h1('JOINT VENTURE');
  // ... unconditional JV fields ...
}, [parcel, engine, ..., btsResult, btrResult, jv, jvType, ...]);
```

The current `tab` state (`'bts' | 'btr' | 'jv'`) is in the closure but never
read inside the callback. The PDF iterates all three modes regardless of
which tab the user has selected.

### Fix

Wrap each section in a conditional:

```ts
const downloadPDF = useCallback(() => {
  // header + parcel always rendered
  // ...

  if (tab === 'bts') {
    h1('BUILD-TO-SELL');
    // ... BtS fields ...
  } else if (tab === 'btr') {
    h1('BUILD-TO-RENT');
    // ... BtR fields ...
  } else if (tab === 'jv') {
    h1(`JOINT VENTURE — ${jvType === 'equity' ? 'Equity' : 'Profit Sharing'}`);
    // ... JV fields ...
  }
}, [tab, ...]);
```

Also need to add `tab` to the `useCallback` dependency list.

**Filename should reflect mode** for downloads — current pattern
`ZAAHI-v6-Preview-{plot}-{engine}-{date}.pdf` could become
`ZAAHI-Feasibility-{plot}-{engine}-{mode}-{date}.pdf` (where mode = `BtS`
/ `BtR` / `JV`). Drops "Preview" since v6 is now production.

### Estimate: 1–2 hours

Trivial JS change + testing PDF in 3 modes on a real parcel.

---

## §4 PDF Branded Visual Style (Issue 1)

### Current style

- Helvetica throughout (jsPDF default)
- Gold accent on h1/h2 (#C8A96E equivalent in RGB 200/169/110)
- Dark-navy body (RGB 26/26/46)
- Gray secondary (RGB 107/114/128)
- Red banner across top: "INTERNAL PREVIEW · v6.0 spec rev-2 · DO NOT SHARE EXTERNALLY"
- Footer: "ZAAHI Real Estate OS — Feasibility v6.0 INTERNAL PREVIEW — Confidential — DO NOT SHARE EXTERNALLY"

The colour palette is on-brand. The fonts are not (Helvetica vs the
ZAAHI Georgia + Inter combo). The banners reference "PREVIEW" — outdated
since v6 is now public production.

### Branded design proposal

**A. Fonts.** jsPDF supports custom fonts via base64-encoded TTF / OTF embedded
into a font catalogue. Recommended:

- **Headings**: Georgia (serif). Web-safe, available everywhere, no licensing
  concern, matches `/parcels/map` SidePanel headings exactly.
- **Body**: Inter or fallback to Helvetica. Inter is open-licensed
  (SIL OFL), commonly bundled. About 200 KB additional bundle weight when
  embedded — acceptable.

For Sprint 9 v1: register Georgia + use jsPDF's default sans (`helvetica`)
as Inter substitute. v2 can swap to embedded Inter if Dymo wants pixel-perfect
brand match.

**B. Layout — A4 portrait, 6 pages.**

| Page | Content | Approx height |
|---:|---|---|
| 1 | **Cover.** Gold rule top, ZAAHI logotype Georgia 44 px gold, parcel one-liner, engine name, large verdict block (Net Profit hero + ROI + IRR + ROE + Verdict band). Date generated. Bottom: small disclaimer. | full |
| 2 | **Inputs table.** Two columns: every input value alongside the engine's default + diff-tone badge color. Dark-mode-on-print: subtle gold separator lines, alternating row tint (rgba 200/169/110/0.06 — prints as a faint warm cream). | full |
| 3 | **Results breakdown.** Step-by-step math: Plot Area → GFA → BUA → SFA → Gross Revenue → Net Revenue → Net Profit → ROI → IRR → ROE. Each line annotated with formula reference. | full |
| 4 | **Glossary.** Each term used in the PDF defined in plain language. Pulled from `tooltips.ts` plus PDF-specific terms (verdict bands, RICS / IVS metric definitions). 2 columns to fit. | full |
| 5 | **Optimization recommendations.** Auto-generated savings advice based on |Δ| ≥ 15 % vs engine defaults. Each recommendation tied to AED magnitude. Conservative tone. ~6-8 lines on a typical parcel. | half typical |
| 6 | **Disclaimer + sources.** Standard disclaimer (estimates, not appraisals). Citations to engine sources (`engine.source` field per engine). Production version line: "Generated by ZAAHI Feasibility v6.0 · {date} · zaahi.io". | half |

**C. Visual elements.**

- **Header band.** Gold #C8A96E 8 mm strip at top, ZAAHI gold-on-black wordmark
  in 9 px Georgia centered.
- **Footer.** Page number "1 / 6" right, "ZAAHI · zaahi.io · Feasibility v6.0 · Generated {date}" centered, in 7 px gray.
- **Section heads.** 13 px Georgia gold uppercase 0.08em letter-spacing.
- **Tables.** 1 px gold rule under each row, slightly heavier rule under totals.
  Alternating row tint 6 % gold for readability.
- **Hero numbers.** 22-26 px Georgia bold, gold if positive, red if negative.
  Verdict band 1 px coloured border + light tint.
- **Replace the red INTERNAL PREVIEW banner.** v6 is public. The cover page just
  carries the disclaimer in normal-weight gray text at the bottom.

**D. Print-safety**

- All colors are RGB tuples (jsPDF requirement). Glassmorphism doesn't translate
  to print (no transparency in PDF). Substitute: warm cream tint `[251, 248, 240]`
  for backgrounds, gold strokes for borders. Gives the same "warm, executive"
  feel without trying to fake a backdrop blur.
- Avoid pure black on body text; use dark navy `[26, 26, 46]` (already in code)
  for print legibility.

### Estimate: 6–8 hours

- 1 h: register Georgia font (download TTF, base64, addFileToVFS / addFont)
- 2 h: Cover page + verdict block + brand header / footer
- 2 h: Inputs table with diff-badge tones + alternating tints
- 1 h: Glossary page
- 1 h: Optimization recommendations engine
- 1 h: Disclaimer + sources footer + final polish

Most of the v5 row helpers (`row(label, value)`, `h1`, `h2`) are reusable.
The expansion is mostly net-new content per the founder's directive
(documented in 11_IMPLEMENTATION_PLAN.md Sprint 9 update at commit `4fb103f`).

---

## §5 Escrow Drawdown Engine (Issue 4)

### Why this matters

For Dubai off-plan projects, RERA Law 8/2007 requires buyer payments to flow
into a project-specific escrow account. The developer can draw funds from
that account as construction milestones are RERA-engineer-certified. This is
**material** for project economics:

- Without escrow modeling, the calculator assumes the developer equity-finances
  the entire construction cost up front.
- In reality, by the time a developer hits 80 % construction, ~70-80 % of buyer
  payments have flowed in via escrow drawdowns — replacing equity with buyer
  capital.
- Peak equity required is typically 20-30 % of total construction cost, not 100 %.
- IRR-on-equity for a typical Dubai 80/20 off-plan project is therefore
  20-40 % higher than the model currently produces.

This is a Dubai-specific gap that doesn't exist in markets without mandatory
escrow (no escrow = developer equity-finances everything).

### Regulatory framework (research-cited)

| Source | Provision |
|---|---|
| **Dubai Law No. 8 of 2007** ("Trust Account Law") Article 14 | Escrow agent must retain 5 % of total escrow account for one year after handover, as defects guarantee. |
| **Dubai Law No. 9 of 2007** | Developer must deposit 20 % of project construction cost upfront in cash or bank guarantee before marketing/sales begin. |
| **DLD technical procedure** | Escrow account is activated for drawdowns once construction reaches 20 % completion (per DLD published technical report, cited in industry guides). |
| **RERA-approved consultant** verification | Each milestone draw requires an independent engineer's certification submitted via DLD's "Receive a payment from the project's Escrow Account" e-service. |

The law itself **does not specify drawdown percentages** — only the 5 %
retention. The actual schedule is contractual (per project SPA) but follows
industry standards described below.

### Standard industry drawdown schedule (Dubai off-plan)

Synthesised from search results across Emaar, Damac, Sobha guidance and
industry articles. **No single source publishes a canonical schedule** —
each developer's SPA differs slightly. Common pattern:

| Milestone | Construction completion | Cumulative drawdown allowed |
|---|---:|---:|
| Foundation complete (substructure) | 20 % | 15 % |
| Structure / superstructure topped out | 40 % | 30 % |
| MEP rough-in complete | 60 % | 50 % |
| Internal finishes complete | 80 % | 70 % |
| Handover (BCC issued) | 100 % | 95 % |
| Defects-liability period ends | 100 % + 1 year | 100 % |

**Note**: this is a conservative midpoint. Some projects (lower-margin
developers) draw faster (80 % at 80 % completion); some institutional
projects draw slower. **Founder ratification needed for ZAAHI's default
schedule.**

The cumulative figures above are **% of total escrow account funds** (which
in turn is % of total project sales receipts). They are NOT the same as the
buyer's "80/20" payment plan — that's the buyer-side schedule. The drawdown
schedule is the developer-side schedule.

### Math model

**Inputs (new):**
- `enableEscrow: boolean` — toggle
- `escrowSchedule: Array<{ pctComplete: number, pctDrawdown: number }>` — the
  default table above, user-overridable
- `monthsToCompletion: number` — total construction duration (already inferred
  from finance period or new field)
- `salesPercentSold: number` — % of units sold ahead of completion (defaults
  to 80 % per typical Dubai off-plan rate)

**Computation:**

1. **Sales receipts schedule**: total Gross Revenue × % sold per month over
   the construction period. Standard assumption: linear sales rate from launch
   to handover, with a small jump at launch (10–20 % sold in month 1) and
   tapering. Simplest viable model: linear with a 15 % launch bump.
2. **Escrow inflows**: equal to sales receipts × 95 % (the 5 % held back
   per Article 14).
3. **Drawdown allowance per month**: cumulative drawdown ramp from the schedule
   table, interpolated to monthly resolution.
4. **Actual drawdown per month**: `min(escrow_balance, allowed_drawdown,
   construction_cost_to_pay_this_month)`.
5. **Equity injection per month**: `construction_cost_this_month - drawdown_this_month`.
6. **Peak equity**: `max(cumulative_equity_at_any_month)`.
7. **IRR-on-equity**: IRR over the equity injection / repayment timeline.

This is straightforward time-series math, ~120 lines of TS. Recommended file:
`src/lib/feasibility-v6/escrowDrawdown.ts`.

### UI implications

**Where to live:** new "ESCROW" panel between FINANCE and REVENUE in the
calculator, per same collapsible-Panel pattern. Default closed. Header
metric: "Peak equity AED X" or "Disabled".

**Toggle gate:** Escrow makes sense only for off-plan projects. Suggest
default ON only when the engine is `offplan` modifier; default OFF for
`landhold`, `infrastructure`. For standard residential / office sale, default
OFF (developer choice).

**Inputs surfaced:**
- "Enable escrow drawdown" on/off
- "Construction duration (months)" — defaults from engine (e.g. 24 mo for
  residential mid-rise)
- "Sales rate at launch (% sold month 1)" — default 15 %
- "Final sales (% sold by handover)" — default 80 %
- "Drawdown schedule" — preset 5-row table (foundation/structure/MEP/finishes/
  handover) with editable percentages

**Tooltips** to add:
- `escrowEnabled`: "Models RERA-mandated escrow drawdowns for Dubai off-plan
  projects. Buyer payments flow into a ring-fenced trust account; developer
  draws funds as RERA-engineer-certified construction milestones complete.
  Reduces peak equity requirement → lifts IRR on equity."
- `salesRateAtLaunch`: "% of units pre-sold at project launch. Dubai market
  typical: 10-25 %, depending on developer brand strength and pricing tier."
- `drawdownSchedule`: "Cumulative % of escrow account the developer is
  permitted to draw at each construction-completion stage. RERA-engineer
  certification required before each release. Default mirrors typical
  developer SPA (Emaar / Damac / Sobha pattern)."

### Verdict block extension

When escrow is enabled, the verdict block adds a third hero row:
- **Net Profit** (existing)
- **ROI on Total Investment** (existing) → renamed clearer "Project ROI"
- **NEW: ROE / IRR on Equity** — the leverage-aware return that drawdown
  makes meaningful.

### Estimate: 10–14 hours

- 2 h: research-default schedule confirmed with founder, codify as default
- 4 h: math module `escrowDrawdown.ts` + cash-flow timeline builder
- 2 h: integration into `computeBtS` + result interface extension
- 3 h: ESCROW panel UI + tooltip content + diff badges
- 2 h: PDF rendering of escrow schedule + impact section
- 1 h: smoke + a real-parcel test against Dubai Hills off-plan
  comparable

---

## §6 UI Implications

| Panel | Change | Owner |
|---|---|---|
| Verdict block | Add IRR + ROE rows below ROI. Hero number = max(ROI, ROE) when leverage present. | Issue 3 |
| FINANCE panel | No change to existing fields. New "Loan term scenario" optional row for IRR purposes. | Issue 3 |
| **ESCROW** (NEW) | Toggle + 4 input rows + 5-row drawdown table editor. Default closed. Header metric: "Peak equity AED X" or "Disabled". | Issue 4 |
| Engine selector | Off-plan modifier auto-enables ESCROW by default; user can flip off. | Issue 4 |
| Tab strip | No change. | — |
| All tabs | Issue 3 metrics (IRR, ROE) flow into Detail panel + verdict block per mode. | Issue 3 |
| PDF Cover | New verdict layout: Net Profit + ROI + IRR + ROE all featured | Issue 1 |
| PDF Inputs page | New escrow section if enabled | Issue 4 |
| PDF Results page | New "Time-Value Returns" subsection: IRR, ROE, NPV (if enabled) | Issue 3 |

---

## §7 Math Implications

### New formulas to implement

```typescript
// src/lib/feasibility-v6/irr.ts (NEW, ~150 lines)

// Bisection-based IRR — robust convergence, no divergence surprises.
// Converges on a root of NPV(r) = 0 across the user-provided cashflow
// timeline. Returns annualised IRR in percent.
export function irr(
  cashflows: { month: number; aed: number }[], // chronological
  guess?: number,                                // optional initial annual rate
): number;

export function npv(
  cashflows: { month: number; aed: number }[],
  annualRatePct: number,
): number;

export function buildBtSCashflowTimeline(
  area: AreaDerived,
  land: LandDerived,
  construction: ConstructionDerived,
  finance: FinanceDerived,
  revenue: BtSRevenueDerived,
  escrow?: EscrowDrawdownResult,
  totalMonths?: number,
): { month: number; aed: number }[];

export function buildBtRCashflowTimeline(
  /* ... */
  exitYear: number, // typically 5 or 10
): { month: number; aed: number }[];

export function buildJvCashflowTimeline(
  /* ... */
  perspective: 'landowner' | 'developer' | 'project',
): { month: number; aed: number }[];
```

```typescript
// src/lib/feasibility-v6/escrowDrawdown.ts (NEW, ~120 lines)

export interface EscrowDrawdownInputs {
  enabled: boolean;
  monthsToCompletion: number;
  salesAtLaunchPct: number;       // default 15
  salesAtHandoverPct: number;     // default 80
  schedule: Array<{ pctComplete: number; pctDrawdown: number }>; // 5-row default
  retentionPct: number;            // default 5 (RERA Article 14)
}

export interface EscrowDrawdownResult {
  monthlyEscrowInflow: number[];      // by month
  monthlyDrawdownAllowed: number[];   // cumulative cap by month
  monthlyDrawdownActual: number[];    // bounded by allowed + escrow balance
  monthlyEquityInjection: number[];
  peakEquityAed: number;
  totalDrawnFromEscrow: number;
  retentionHeldAed: number;
}

export const DEFAULT_DUBAI_ESCROW_SCHEDULE = [
  { pctComplete: 20, pctDrawdown: 15 },
  { pctComplete: 40, pctDrawdown: 30 },
  { pctComplete: 60, pctDrawdown: 50 },
  { pctComplete: 80, pctDrawdown: 70 },
  { pctComplete: 100, pctDrawdown: 95 },
];

export function deriveEscrowDrawdown(
  inputs: EscrowDrawdownInputs,
  totalRevenueAed: number,
  totalConstructionAed: number,
): EscrowDrawdownResult;
```

### Existing `src/lib/feasibility.ts` extensions

| Type | Add |
|---|---|
| `BtSResult` | `irrPct: number`, `roePct: number`, `peakEquityAed: number` |
| `BtRResult` | `irrPct: number`, `roePct: number`, `peakEquityAed: number` |
| `JvDerived` | `landownerIrrPct: number`, `landownerRoePct: number`, `developerIrrPct: number`, `developerRoePct: number` |

`computeBtS`, `computeBtR`, `computeJv` gain optional `EscrowDrawdownResult`
parameter and call into IRR / ROE helpers from the new file.

### Strangler Fig invariant

`src/lib/feasibility.ts` was treated as **read-only** during cutover. The
proposed extension to `BtSResult` etc. is technically a modification.
**Recommendation:** keep the v5 result interfaces untouched; have v6 use a
**v6-specific result wrapper** that extends the v5 result with new fields.
Concretely:

```typescript
// src/lib/feasibility-v6/results.ts (NEW)
export interface BtSResultV6 extends BtSResult {
  irrPct: number;
  roePct: number;
  peakEquityAed: number;
}

export function computeBtSV6(
  /* same args + escrow */
): BtSResultV6;
```

Preserves the read-only commitment on `feasibility.ts`. v5 SidePanel keeps
working byte-identically. v6 calls the V6 wrappers which delegate to v5
primitives + the new IRR / ROE / escrow modules.

---

## §8 PDF Content Spec (founder priority — recap from Sprint 1.6 directive)

Sprint 1.6 founder directive (recorded in 11_IMPLEMENTATION_PLAN.md commit
`4fb103f` Sprint 9 expansion section): the PDF must stand alone — broker
hands it to a buyer who wasn't in the room and the buyer can read it cover
to cover and understand both the verdict AND how to argue it down.

### Page-by-page content

**Page 1 — Cover**

- Top: gold rule + ZAAHI logotype
- Middle: parcel one-liner (Plot # · district · land use), engine name
- Verdict block:
  - NET PROFIT (hero) — Georgia 30 px gold/red
  - ROI · IRR · ROE on three lines
  - Verdict band ("STRONG" / "MODERATE" / "BELOW TARGET") with colour-coded border
- Bottom: date generated · short disclaimer one-liner

**Page 2 — Inputs**

Two-column table per panel (Area / Land / Construction / Finance / Revenue /
Escrow if enabled). For each input row:

| Field | User value | Engine default | Δ % | Tone |
|---|---:|---:|---:|---|
| Construction psf BUA | AED 580 | AED 500 | +16 % | amber |
| Sales psf SFA | AED 2,300 | AED 2,183 | +5 % | green |
| (etc) | | | | |

Tone column = a coloured cell (or a coloured Δ % printed). Aimed at the
buyer reading the PDF: "this developer is assuming construction will cost
16 % more than the engine baseline — argue it down."

**Page 3 — Results breakdown**

Step-by-step math, narrated:

```
PLOT AREA              17,500 sqft (DLD title deed)
× FAR                       1.8
= GFA                  31,500 sqft

× BUA / GFA ratio         1.85 (Dubai standard, RICS NRM 1)
= BUA                  58,275 sqft

× Efficiency               80%
= SFA                  46,620 sqft (saleable / leasable)

LAND COST          AED 12,000,000
+ DLD Fee 4%        AED    480,000
= Land total       AED 12,480,000

CONSTRUCTION       AED 33,500 / sqft × 58,275 sqft BUA =
                   AED 33,791,000
+ 5% Contingency   AED  1,690,000
= Construction     AED 35,481,000

TOTAL INVESTMENT   AED 47,961,000

REVENUE
SFA 46,620 × Sales psf AED 2,300 = Gross AED 107,226,000
- 8.5% commission                 (AED 9,114,210)
- 2% marketing                    (AED 2,144,520)
= NET REVENUE                     AED 95,967,270

NET PROFIT     AED 48,006,270

ROI = Net Profit / Total Investment × 100 = 100.1%
IRR = 38.2% (annualised, 18-month build, monthly cashflow basis)
ROE = 142% (peak equity AED 33.8M after escrow drawdowns)
```

Annotations next to each formula.

**Page 4 — Glossary**

Two-column term definitions. Examples:

- **BUA (Built-Up Area)** — Total covered area. Includes podiums, basements,
  terraces, walls. RICS NRM 1 standard. In Dubai, BUA / GFA ratio is typically
  1.85 (founder-ratified 5 May 2026).
- **SFA (Saleable Floor Area)** — The portion of GFA that can be sold or
  leased. Excludes circulation, common areas. Residential 75-85 %, office
  80-88 %, retail 65-75 %.
- **ROI** — Net Profit / Total Investment × 100. The headline return.
- **IRR (Internal Rate of Return)** — The annualised return that makes the
  Net Present Value of project cash flows = 0. Time-weighted; preferred for
  multi-year holds.
- **ROE (Return on Equity)** — Net Profit / Peak Equity Invested × 100.
  Isolates leverage; ROE > ROI when debt is used.
- **Escrow Drawdown** — RERA-mandated trust account from which the developer
  withdraws funds as construction milestones are certified. (See §5.)
- **Verdict bands** — Strong (ROI ≥ 25 % or yield ≥ 8 %), Moderate (15–25 %
  or 5–8 %), Below Target (< 15 % or < 5 %). Bands are founder-ratified for
  the Dubai market (4 Apr 2026).

**Page 5 — Optimization recommendations**

Auto-generated walking each input vs `engine.<field>` baseline; for each
|Δ| ≥ 15 % emit a one-line recommendation tied to the AED magnitude.
Conservative tone. Examples on a typical residential parcel:

- "Construction psf is 18 % above the Dubai Hills baseline (AED 590 vs
  AED 500). Aligning to baseline would reduce construction cost by AED 5.7 M
  and lift Net Profit by ~12 %. Consider RICS NRM 1 unit-rate review with
  contractor."
- "Sales psf is 5 % below DLD Q1 2026 secondary median for Dubai Hills
  (AED 2,183). Pricing aligned to secondary comp would lift Gross Revenue
  by AED 5.4 M. Consider commissioning a comp study from a RERA-licensed
  valuer."
- "Contingency 8 % is above 5 % spec. The extra AED 2 M reserve can be
  released post-tender (RICS NRM 1 recommends 5 % post-tender, 8-10 %
  pre-tender)."

3-8 lines on a typical parcel. No spam — only recommendations where Δ is
material.

**Page 6 — Disclaimer + Sources**

```
DISCLAIMER

This report is a feasibility estimate, not a formal valuation or appraisal.
Numbers are based on the engine's research-defaults and on the user's
inputs; they have not been verified against this specific project's
contracts, tender packages, or RERA-certified construction reports. Final
investment decisions should be supported by an independent RICS-registered
valuer. ZAAHI Real Estate OS bears no responsibility for outcomes derived
from this estimate.

SOURCES (per input field)
• Construction psf — RICS NRM 1 unit-rate library, Cushman & Wakefield UAE
  Construction Cost Survey 2025.
• Sales psf — DLD secondary Q1 2026, Dubai Hills median.
• Office rents — CBRE Q1 2026 Dubai Office MarketView.
• Hospitality ADR — HVS Middle East 2025.
• Healthcare cost/bed — DHA / VPS Healthcare 2025.
• Educational cost/student — KHDA 2025.
• Data center capex/MW — Khazna / Equinix Tier-3 UAE 2025.
• Industrial rents — Cushman & Wakefield UAE Logistics 2025.
• Retail rents — JLL Dubai Retail Market H2 2025.
• BUA / GFA ratio 1.85 — Dubai Municipality Circular 168/2018, RICS NRM 1
  application notes for the GCC.
• Escrow drawdown — Dubai Law No. 8 of 2007 (Trust Account Law)
  Article 14, Dubai Law No. 9 of 2007 Article 13, DLD escrow activation
  technical procedure.

Generated by ZAAHI Feasibility v6.0 · {date} · zaahi.io
```

---

## §9 Total implementation estimate

| Sprint | Issue | Hours | Calendar |
|---:|---|---:|---|
| 9a | IRR + ROE math layer (Issue 3) | 6–8 | 2 working days |
| 9b | PDF mode-aware (Issue 2) | 1–2 | 0.5 day |
| 9c | Escrow Drawdown engine (Issue 4) | 10–14 | 3 working days |
| 9d | PDF branded style (Issue 1) | 6–8 | 2 working days |
| | **Total** | **23–32 h** | **~7-9 working days** |

**Critical path:** 9a → 9b (cosmetic but blocks visual review) → 9c (depends on
9a's IRR machinery) → 9d (decorates final content).

**Calendar at current pace** (12 h/week active dev): **2-3 calendar weeks** to
complete all four. Hub71 demo target 9 June 2026 = ~5 weeks out. Ample buffer.

**Parallelisable**: 9b can run any time. 9d can start in parallel with 9c
once the result interfaces are agreed.

---

## §10 Open questions for founder

Each blocks a specific implementation step. **Default proposed for each.**
Founder can blanket-approve all defaults to unblock immediately.

### BLOCKING

**Q1 — IRR computation period resolution**
Monthly cashflow timeline (more accurate, ~1.5 % more code) vs annual
(simpler, common for high-level feasibility).
A) Monthly ★ recommended (Dubai off-plan benefits from monthly resolution
because escrow drawdowns are monthly events)
B) Annual

**Q2 — IRR algorithm**
A) Bisection ★ recommended (bulletproof convergence, ~50 lines)
B) Newton-Raphson (faster but can diverge on pathological cashflows)

**Q3 — Default Dubai escrow drawdown schedule**
The 5-row table (foundation 15 % / structure 30 % / MEP 50 % / finishes 70 %
/ handover 95 %). Options:
A) Use the proposed table as ZAAHI default ★ recommended
B) Different percentages — specify
C) Defer the Escrow engine entirely until founder consults a RERA-approved
trustee for the actual contractual norm
D) Build with the proposed table but mark as "research default" with the
italic disclaimer (consistent with engine validation pattern)

**Q4 — Escrow auto-enable**
A) Auto-ON for `offplan` modifier engine, OFF for everything else ★ recommended
B) Always OFF; user opts in
C) Always ON for any engine where construction > 6 months

**Q5 — PDF font strategy**
A) Embed Georgia + Helvetica fallback ★ recommended (immediate, no licensing
concerns, ~50 KB bundle add)
B) Embed Georgia + Inter — pixel-perfect ZAAHI brand match, ~250 KB add
C) Stay on jsPDF default Helvetica throughout — no brand match but smallest
bundle

### NON-BLOCKING

**N1 — NPV display**
A) Compute + show in PDF only ★ recommended (founder-asked it as part of
"Results breakdown")
B) Add to verdict block too
C) Defer to a later sprint

**N2 — Verdict bands recalibration**
With IRR + ROE in scope, the existing verdict bands ("Strong ≥ 25 % ROI")
may need a separate band system for ROE / IRR.
A) Use ROE > 25 % or IRR > 18 % as "Strong" alongside the existing ROI
band ★ recommended (mirrors how RICS treats leverage)
B) Keep ROI as the only verdict signal; surface IRR / ROE as informational

**N3 — Escrow modeling exit timing**
For BtR projects holding past handover, model the 5 % retention release at
year 1 post-handover.
A) Yes ★ recommended (it's a real cashflow event; small but affects IRR)
B) Skip for v6.0; document as a known simplification

**N4 — Optimization recommendations engine on/off**
A) On by default ★ recommended (founder directive Sprint 1.6)
B) Toggle in PDF settings (founder can hide for confidential client)

**N5 — Filename convention**
Current: `ZAAHI-v6-Preview-{plot}-{engine}-{date}.pdf`. Production should
drop "Preview".
A) `ZAAHI-Feasibility-{plot}-{engine}-{mode}-{date}.pdf` ★ recommended
B) Keep current pattern but drop "Preview"

**N6 — Sales rate at launch default**
A) 15 % ★ recommended (Dubai market typical)
B) 25 % (aggressive launch developers)
C) 10 % (conservative)

---

## Appendix A — Sources cited

- [Dubai Law No. 8 of 2007 (Trust Account Law) — full text](https://dlp.dubai.gov.ae/Legislation%20Reference/2007/Law%20No.%20(8)%20of%202007.html)
- [How Developers Protect Buyer Funds in Dubai (Escrow & RERA)](https://makdevelopers.com/how-developers-protect-buyer-funds-in-dubai-escrow-rera/)
- [How The UAE Escrow Law Protects Off-Plan Property Buyers — Global Law Experts](https://globallawexperts.com/how-the-uae-escrow-law-protects-off-plan-property-buyers/)
- [Escrow Accounts in Dubai — godubai.estate](https://www.godubai.estate/broker-hub/escrow-accounts-for-off-plan-projects-in-dubai-how-they-protect-buyers/)
- [Dubai Land Department — Escrow Account activation](https://dubailand.gov.ae/en/eservices/request-to-activate-an-escrow-account/)
- [Dubai Land Department — Receive a payment from the project's Escrow Account](https://dubailand.gov.ae/en/eservices/request-to-receive-a-payment-from-the-projects-escrow-account/)
- [Compare Dubai Escrow Account Options — Oliva](https://joinoliva.com/en/learn/blog/dld-and-escrow-regulatory-framework)
- [Off-Plan Payment Plans 80/20 — sbaproperties](https://sbaproperties.ae/off-plan/off-plan-payment-plans-dubai/)
- [80/20 Off-Plan Projects — westgatedubai](https://westgatedubai.com/80-20-payment-plan-off-plan-projects-in-dubai/)
- [Developer Compliance — BSA Law](https://bsalaw.com/insight/navigating-dubais-off-plan-real-estate-laws-compliance-essentials-for-developers/)
- [RERA Escrow Account Audit Guide 2025/2026 — youngandright](https://www.youngandright.ae/blogs/rera-escrow-account-audit-dubai-the-complete-20252026-guide)
- [How to Check Construction Progress Online under RERA — youandhouseproperties](https://youandhouseproperties.com/how-to-check-construction-progress-online-for-any-off-plan-project-in-dubai/)
- [RERA Laws Every Property Buyer In Dubai 2026 — AWS Legal Group](https://aws-legalgroup.com/rera-laws-every-property-buyer-should-know/)

---

## Sign-off

This proposal is **research + design only**. No code modified. Branch
`research/feasibility-v6-spec` carries the spec. `feature/feasibility-v6` and
`main` are untouched.

Founder action: review §1 (3 minutes) → review §10 open questions → reply
either:

```
all defaults approved, start sprint 9a
```

or with specific overrides per question. Agent then begins implementation
on `feature/feasibility-v6` per the sequencing in §9.
