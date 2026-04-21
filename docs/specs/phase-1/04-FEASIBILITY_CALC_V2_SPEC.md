# SPEC 04 — Feasibility Calculator v2 (Phase 1 Priority 4)

**Status:** DRAFT v1.1 · 2026-04-22
**Priority:** **4 of 13** (Q-11 owner-modified ranking)
**Target ship:** Month 4-5
**Effort:** 1.5-2 engineer-weeks
**Depends on:** None (standalone)
**Blocks:** None
**Supersedes:** v1.0 (2026-04-21, commit `ec6f65f`)
**Source commitments:**
- `docs/architecture/MASTER_TREE_ENHANCEMENT_PROPOSAL.md` §1.C AU-2 (ratified)
- `docs/roadmap/POST_MEETING_BUILD_PLAN.md` §A2 — full inputs/outputs spec
- `docs/specs/phase-1/FEASIBILITY_STYLE_GUIDE.md` (2026-04-22 · binding visual language + §10.4 jsPDF decision)
- Master Tree v3 §58 Feasibility Calculator
**Classification:** CONFIDENTIAL — internal engineering spec

## v1.1 amendment note

v1.0 (2026-04-21) assumed **Puppeteer** server-side PDF generation. Style Guide survey (2026-04-22) confirmed reality: **jsPDF v4.2.1 is already installed** in `package.json` + **already imported** on line 3 of the existing `src/app/parcels/map/FeasibilityCalculator.tsx` (1001 lines · v5.0 production component). v1.1 corrects every PDF-pipeline reference from Puppeteer to jsPDF and adds the instruction to **extend** the existing component rather than introduce a parallel server-side pipeline. See FEASIBILITY_STYLE_GUIDE §10.4 for the full rationale.

---

## §1 Goal & Scope

**One-sentence goal:** Wrap the existing `src/lib/feasibility.ts` v5 pure-formulas engine in an owner-facing UI that adds **IRR · ±20 % sensitivity band · client-takeaway PDF export**, so Dymo walks into every HNWI + developer meeting with a live real-time feasibility tool that closes objections in seconds.

### Context — what already exists

`src/lib/feasibility.ts` (500 lines, v5.0 per founder brief 2026-04-15):

- `deriveArea()` — plot / FAR / GFA / BUA / SFA / efficiency.
- `deriveLand()` — full-purchase vs installments with DLD 4 % + down-payment %.
- `deriveConstruction()` — BUA × cost/sqft + build timeline.
- `deriveFinance()` — debt + interest rate + timeline.
- `totalInvestment()` — summation.
- `computeBtS()` — Build-to-Sell → ROI %.
- `computeBtR()` — Build-to-Rent → yield %.
- `computeJv()` — Joint Venture (equity + profit-sharing).
- `btsVerdict()` / `btrVerdict()` — "strong / moderate / below" tone helpers.
- Formatters: `fmtAed`, `fmtAedExact`, `fmtPct`, `fmtInt`, `parseNumberInput`.
- `CANONICAL_LAND_USES` constant.

**"Pure formulas, no UI"** per source file header.

### What's missing for v2

1. **IRR computation** — not in v5. New: `computeIRR()` taking cash-flow series by period.
2. **±20 % sensitivity band** — new: `computeSensitivity()` varies 3 key inputs (build cost / sell price / timeline months) ±20 % and returns output range.
3. **PDF export** — new: branded client-takeaway PDF render via **jsPDF v4.2.1** (already installed + imported in existing `src/app/parcels/map/FeasibilityCalculator.tsx` line 3). Client-side rendering, no Puppeteer required. See FEASIBILITY_STYLE_GUIDE §10.4.
4. **UI page** — new: `/admin/feasibility` (Dymo's client-meeting tool) + embedded widget on `/parcels/[id]` (one-click from plot detail).
5. **Scenario save / load** — new: persist named scenarios to Prisma so Dymo replays client meeting.
6. **Multi-language output** — new: PDF has EN + AR + RU toggles (Dymo's pipeline is multi-lingual).

### In scope (MVP v1 Month 4-5)

All 6 items above, with these scope limits:

- **IRR v1:** annual IRR only (not monthly); tolerance 0.01 %; max 100 iterations Newton-Raphson. Handles standard real-estate cash flows (outflow-then-inflows pattern).
- **Sensitivity v1:** 3-axis (build cost · sell price · timeline) with ±20 % default. Configurable range per axis (0 — ±50 %).
- **PDF v1:** single-language at a time (EN default, AR / RU via language toggle). Arabic layout right-to-left; math numerals Western throughout (consistency over authenticity).
- **Save scenario v1:** per-user, name-tagged, filter by parcel.
- **Plot-detail integration v1:** "Run Feasibility" button opens `/admin/feasibility?parcelId=X` with affection-plan pre-filled (area, FAR, setbacks).

### v2+ polish (OUT of MVP)

- Monthly IRR + full sensitivity tables (not just ±20 % on 3 axes).
- Multi-scenario comparison (2 scenarios side-by-side on one PDF).
- External client sharing (signed URL via email — today it's founder-download-and-share).
- Monte Carlo variance simulation.
- Integration with DLD transaction comps (auto-suggest realistic sell-price range).

### Explicit non-goals v1

- NOT rebuilding v5 formulas — treat as source of truth; extend with IRR + sensitivity only.
- NOT external client access — Phase 2 scope (external user portals).
- NOT historical scenario versioning — save overwrites (v2 adds versions).
- NOT Excel export — PDF only v1.

---

## §2 User Stories

### MUST

**U-1 (Dymo, broker).** As the Agency broker, I want to open `/admin/feasibility` + pick Plot 1 + have area/FAR/setbacks auto-populate from the affection plan, so my client meeting starts with live accurate data in 10 seconds.

**U-2 (Dymo, broker).** As the Agency broker, I want to see IRR prominently on the results panel next to ROI %, so my investor client's first question ("what's the IRR?") is answered without me opening another tool.

**U-3 (Dymo, broker).** As the Agency broker, I want a ±20 % sensitivity band visible on the results (e.g., "ROI 28 % base case · range 21 % – 35 %"), so I can counter "what if construction overruns?" in real time.

**U-4 (Dymo, broker).** As the Agency broker, I want to export a branded PDF of the current feasibility scenario + download it to iPad, so I hand it to the client as a takeaway at meeting end.

**U-5 (Dymo, broker).** As the Agency broker, I want to save today's scenario as "Plot 1 · Base Case" and re-load next week without re-entering numbers, so follow-up meetings are 30 seconds of prep, not 20 minutes.

### SHOULD

**U-6 (Zhan, admin).** As admin, I want a `/parcels/[id]` "Run Feasibility" button that opens the calculator pre-loaded with that parcel's data, so owner exploration of any plot takes 2 clicks.

**U-7 (Dymo, broker).** As the Agency broker, I want the PDF in Arabic or Russian (toggle before export), so GCC + CIS clients get language-matched takeaways.

**U-8 (Dymo, broker).** As the Agency broker, I want "Compare BtS vs BtR" toggle on the results panel, so clients comparing rent-vs-sell strategies see both outputs at once.

### COULD

**U-9 (Dymo, broker).** As the Agency broker, I want to share a PDF link with the client (expiring signed URL). **Defer v2.**

**U-10 (Dymo, broker).** As the Agency broker, I want Monte Carlo simulation for stochastic sensitivity. **Defer v2.**

---

## §3 Data Model

### 3.1 New Prisma model — `FeasibilityScenario`

```prisma
model FeasibilityScenario {
  id              String   @id @default(cuid())
  name            String                        // "Plot 1 · Base Case"
  userId          String                        // owner of this scenario
  user            User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  parcelId        String?                        // optional link
  parcel          Parcel?  @relation(fields: [parcelId], references: [id], onDelete: SetNull)

  mode            String                        // "BtS" | "BtR" | "JV"

  // Inputs — JSON bundle (matches shapes in feasibility.ts)
  inputs          Json                           // { area: {...}, land: {...}, construction: {...}, finance: {...}, revenue: {...} }

  // Outputs at save time (cached for list views; re-computed on load)
  cachedOutputs   Json?                          // { totalInvestmentAed, netProfitAed, roiPct, irrPct, sensitivity: {...} }

  // Display
  language        String   @default("en")        // "en" | "ar" | "ru"

  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  @@index([userId])
  @@index([parcelId])
}
```

Migration adds relation on `User` + `Parcel`:

```prisma
// User
feasibilityScenarios  FeasibilityScenario[]
// Parcel
feasibilityScenarios  FeasibilityScenario[]
```

### 3.2 No schema changes to feasibility inputs

v5 engine uses plain TypeScript interfaces (`AreaInputs`, `LandInputs`, etc.). Persisted as `Json` in `FeasibilityScenario.inputs`. Zod validation on save.

### 3.3 Migration

Single migration `<ts>_feasibility_scenarios/migration.sql`.

---

## §4 API Design

### 4.1 Endpoints

| Method | Path | Purpose | Auth |
|---|---|---|---|
| GET | `/api/feasibility/scenarios` | List current user's scenarios | Approved user |
| POST | `/api/feasibility/scenarios` | Save new scenario | Approved user |
| GET | `/api/feasibility/scenarios/[id]` | Scenario detail | Approved user (owner-only) |
| PATCH | `/api/feasibility/scenarios/[id]` | Update scenario (overwrite) | Approved user (owner-only) |
| DELETE | `/api/feasibility/scenarios/[id]` | Delete scenario | Approved user (owner-only) |
| POST | `/api/feasibility/compute` | Stateless compute (for live-edit UI without save) · body has inputs · returns outputs incl. IRR + sensitivity | Approved user |
| POST | `/api/feasibility/scenarios/[id]/pdf` | Generate PDF · returns Supabase signed URL | Approved user (owner-only) |

### 4.2 Zod schemas

```typescript
export const FeasibilityInputsSchema = z.object({
  mode: z.enum(["BtS", "BtR", "JV"]),
  area: z.object({
    plotAreaSqft: z.number().positive(),
    far: z.number().positive().max(20),
    bua: z.number().nonnegative(),
    efficiencyPct: z.number().min(0).max(100),
  }),
  land: z.object({
    landCostAed: z.number().nonnegative(),
    dldPct: z.number().min(0).max(10).default(4),
    paymentMode: z.enum(["full", "installments"]),
    downPaymentPct: z.number().min(0).max(100).optional(),
    installmentMonths: z.number().int().positive().optional(),
  }),
  construction: z.object({
    costPerSqftAed: z.number().positive(),
    buildMonths: z.number().int().positive(),
  }),
  finance: z.object({
    debtAed: z.number().nonnegative(),
    interestPct: z.number().min(0).max(30),
    termMonths: z.number().int().positive(),
  }),
  revenue: z.object({
    sellPricePerSqftAed: z.number().nonnegative(),
    saleableRatio: z.number().min(0).max(1),
    salesTimelineMonths: z.number().int().positive(),
    // BtR extras
    annualRentPerSqftAed: z.number().nonnegative().optional(),
    occupancyPct: z.number().min(0).max(100).optional(),
    opExPct: z.number().min(0).max(100).optional(),
    exitCapRatePct: z.number().positive().optional(),
  }),
  // JV extras
  jv: z.object({
    type: z.enum(["equity", "profit_sharing"]),
    landownerSharePct: z.number().min(0).max(100),
  }).optional(),

  // v2 sensitivity config
  sensitivity: z.object({
    buildCostPct: z.number().min(0).max(50).default(20),
    sellPricePct: z.number().min(0).max(50).default(20),
    timelinePct: z.number().min(0).max(50).default(20),
  }).optional(),
});

export const SaveScenarioSchema = z.object({
  name: z.string().min(1).max(100),
  parcelId: z.string().cuid().optional(),
  language: z.enum(["en", "ar", "ru"]).default("en"),
  inputs: FeasibilityInputsSchema,
});
```

### 4.3 Rate limits

- POST `/api/feasibility/compute`: 120 req/min/user (live-edit sliders fire frequently).
- POST `/api/feasibility/scenarios`: 30 req/min/user.
- POST `/api/feasibility/scenarios/[id]/pdf`: 20 req/min/user (jsPDF client-side render + Supabase upload if shared URL requested).

---

## §5 UI Components

### 5.1 Page routes

- `/admin/feasibility` — main calculator (Dymo's client-meeting tool).
- `/admin/feasibility?parcelId=X` — same page pre-loaded with parcel data.
- `/admin/feasibility?scenarioId=X` — load saved scenario.
- `/admin/feasibility/scenarios` — scenario list (for Dymo browsing previous work).
- Widget embedded in `/parcels/[id]` — "Run Feasibility" button (CTA).

### 5.2 Component hierarchy

```
/admin/feasibility/
  page.tsx                    — FeasibilityCalculator
    ScenarioSelector          — load saved · save new · export PDF
    ModeToggle                — BtS / BtR / JV
    LanguageToggle            — EN / AR / RU

    InputsPanel               — left column (40% width)
      AreaInputs              — plot area · FAR · BUA · efficiency %
      LandInputs              — cost · DLD % · payment mode · down payment
      ConstructionInputs      — cost/sqft · build months
      FinanceInputs           — debt · interest % · term months
      RevenueInputs           — mode-specific fields
      JvInputs                — if mode=JV
      SensitivityControls     — 3 sliders (±%)

    ResultsPanel              — right column (60% width)
      AreaResults             — GFA · BUA · SFA derived values
      TotalInvestmentCard     — big number, AED prefix
      NetProfitCard           — for BtS
      ROICard                 — base case + sensitivity band
      IRRCard                 — base case + sensitivity band (v2 addition — prominent)
      ChartSensitivity        — 3 bars showing ROI range per axis
      VerdictBadge            — strong/moderate/below
      ComparisonPanel         — (SHOULD) BtS vs BtR side-by-side when mode=BtS or BtR
      BreakEvenCard           — break-even floor count (construction pipeline)

    ActionsBar
      ExportPdfButton
      SaveScenarioButton
      ResetButton
      ShareButton (v2, disabled)
```

### 5.3 Design

Per CLAUDE.md UI Style Guide. Calculator is **landscape-oriented** on iPad (Dymo's primary device at client meetings). Left panel: inputs (sliders + number inputs — big touch targets). Right panel: results (numeric cards + 1 chart). Live-update on input change (debounced 300 ms to reduce compute load).

### 5.4 Plot-detail widget

On `/parcels/[id]`, add a CTA card:

```
┌────────────────────────────────┐
│ 📐 Run Feasibility            │
│                                │
│ Area: 12 345 sqft · FAR: 2.5   │
│ Estimated GFA: 30 863 sqft     │
│                                │
│     [ Open Calculator →  ]     │
└────────────────────────────────┘
```

Click opens `/admin/feasibility?parcelId=X` with affection plan data pre-filled.

---

## §6 Business Logic

### 6.1 IRR computation (NEW in v2)

```typescript
// src/lib/feasibility-irr.ts — NEW
/**
 * Newton-Raphson IRR solver.
 * Input: array of period cash flows (index 0 = today, [i] = period i).
 * Output: annualised IRR as decimal (e.g., 0.28 = 28%).
 * Returns NaN if no convergence in 100 iterations or cash flow all-same-sign.
 */
export function computeIRR(cashFlows: number[], guess = 0.1): number {
  const MAX_ITER = 100;
  const TOL = 1e-6;
  let rate = guess;
  for (let iter = 0; iter < MAX_ITER; iter++) {
    const { npv, dnpv } = npvAndDerivative(cashFlows, rate);
    if (Math.abs(npv) < TOL) return rate;
    if (Math.abs(dnpv) < TOL) return NaN;   // flat; no convergence
    rate = rate - npv / dnpv;
    if (rate < -0.99 || !isFinite(rate)) return NaN;
  }
  return NaN;
}

function npvAndDerivative(cf: number[], rate: number): { npv: number; dnpv: number } {
  let npv = 0;
  let dnpv = 0;
  for (let t = 0; t < cf.length; t++) {
    const disc = Math.pow(1 + rate, t);
    npv += cf[t] / disc;
    dnpv -= (t * cf[t]) / (disc * (1 + rate));
  }
  return { npv, dnpv };
}

/**
 * Build annual cash-flow series for a BtS deal.
 * Year 0: land purchase (negative).
 * Years 1..buildYears: construction + interest (negative).
 * Year (buildYears + salesYear): sell revenue (positive).
 */
export function buildBtSCashFlow(bts: BtSResult, landFull: number, constr: ConstructionDerived, finance: FinanceDerived, salesYears: number): number[] {
  const buildYears = Math.ceil(constr.buildMonths / 12);
  const cf = new Array(buildYears + salesYears + 1).fill(0);
  cf[0] = -landFull;
  for (let y = 1; y <= buildYears; y++) {
    cf[y] = -(constr.totalCostAed / buildYears + finance.annualInterestAed);
  }
  const netProfit = bts.netProfitAed;
  const totalInvestment = landFull + constr.totalCostAed;
  // distribute sale revenue evenly across salesYears
  const revenuePerYear = (totalInvestment + netProfit) / salesYears;
  for (let y = 1; y <= salesYears; y++) {
    cf[buildYears + y] = revenuePerYear;
  }
  return cf;
}
```

### 6.2 Sensitivity analysis (NEW in v2)

```typescript
// src/lib/feasibility-sensitivity.ts — NEW
interface SensitivityInputs {
  base: FeasibilityInputsAll;             // same shape as FeasibilityInputsSchema
  buildCostPct: number;                   // ±%
  sellPricePct: number;
  timelinePct: number;
}

interface SensitivityOutput {
  roi: { low: number; base: number; high: number };
  irr: { low: number; base: number; high: number };
  netProfit: { low: number; base: number; high: number };
  perAxis: {
    buildCost: { low: number; high: number };       // ROI at ±buildCostPct (holding others base)
    sellPrice: { low: number; high: number };
    timeline: { low: number; high: number };
  };
}

export function computeSensitivity(inputs: SensitivityInputs): SensitivityOutput {
  // 1. Compute base case
  const baseOutput = fullCompute(inputs.base);

  // 2. Low case: cost +pct · price -pct · timeline +pct (all pessimistic)
  const lowInputs = mutateInputs(inputs.base, { buildCostPct: +inputs.buildCostPct, sellPricePct: -inputs.sellPricePct, timelinePct: +inputs.timelinePct });
  const lowOutput = fullCompute(lowInputs);

  // 3. High case: cost -pct · price +pct · timeline -pct (all optimistic)
  const highInputs = mutateInputs(inputs.base, { buildCostPct: -inputs.buildCostPct, sellPricePct: +inputs.sellPricePct, timelinePct: -inputs.timelinePct });
  const highOutput = fullCompute(highInputs);

  // 4. Per-axis isolated sensitivities (for bar chart)
  const perAxis = {
    buildCost: varyOne(inputs.base, "buildCost", inputs.buildCostPct),
    sellPrice: varyOne(inputs.base, "sellPrice", inputs.sellPricePct),
    timeline:  varyOne(inputs.base, "timeline",  inputs.timelinePct),
  };

  return {
    roi: { low: lowOutput.roiPct, base: baseOutput.roiPct, high: highOutput.roiPct },
    irr: { low: lowOutput.irrPct, base: baseOutput.irrPct, high: highOutput.irrPct },
    netProfit: { low: lowOutput.netProfitAed, base: baseOutput.netProfitAed, high: highOutput.netProfitAed },
    perAxis,
  };
}
```

### 6.3 PDF generation

**Extend existing jsPDF usage** in `src/app/parcels/map/FeasibilityCalculator.tsx` (line 3 already imports `jsPDF` from the `jspdf` package v4.2.1). **Do NOT introduce Puppeteer** — it would add ~300 MB server dependency + Vercel Edge compatibility concerns for zero functional gain. jsPDF renders client-side, direct-downloads to iPad, and optionally uploads to Supabase for shared-URL scenarios.

Arabic support uses **Amiri** (body) + **Tajawal** (headings) TTFs bundled into jsPDF at render time — see FEASIBILITY_STYLE_GUIDE §9.4.

```typescript
// src/lib/feasibility-pdf.ts — NEW
// Client-side module. Runs in the browser on "Export PDF" button click.
// Shared upload path: after rendering, optionally POST the blob to
// /api/feasibility/scenarios/[id]/pdf-upload which stores it in Supabase.

import { jsPDF } from "jspdf";

export async function renderFeasibilityPdf(
  scenario: FeasibilityScenario,
  outputs: ReturnType<typeof fullCompute>,
  sensitivity: ReturnType<typeof computeSensitivity>,
  language: "en" | "ar" | "ru",
): Promise<Blob> {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

  // Arabic font loading (only if language === "ar") — Amiri + Tajawal
  if (language === "ar") {
    // Fonts stored in public/fonts/; loaded once and cached
    await loadFont(doc, "Amiri-Regular", "/fonts/Amiri-Regular.ttf", "normal");
    await loadFont(doc, "Tajawal-Bold",   "/fonts/Tajawal-Bold.ttf",   "bold");
    doc.setR2L(true);  // right-to-left body
  }

  // Page 1: cover — logo + plot summary + hero numbers (Total Investment · Net Profit · ROI · IRR)
  renderCoverPage(doc, scenario, outputs, language);

  // Page 2: full inputs table + derived values (GFA/BUA/SFA/land/construction/finance)
  doc.addPage();
  renderInputsPage(doc, scenario, outputs, language);

  // Page 3: sensitivity analysis + 3-axis bars + base/low/high + verdict + disclaimers
  doc.addPage();
  renderSensitivityPage(doc, sensitivity, language);

  return doc.output("blob");
}

// Upload path (optional, invoked only if user clicked "Get Shareable Link")
export async function uploadFeasibilityPdf(scenarioId: string, blob: Blob, language: "en"|"ar"|"ru"): Promise<string> {
  const filePath = `feasibility/${scenarioId}-${language}.pdf`;
  const { error } = await supabase.storage.from("zaahi-pdfs").upload(filePath, blob, { contentType: "application/pdf", upsert: true });
  if (error) throw error;
  const { data: signed } = await supabase.storage.from("zaahi-pdfs").createSignedUrl(filePath, 60 * 60 * 24 * 7);  // 7-day expiry
  return signed!.signedUrl;
}

// Client download path (default) — no server involvement
// doc.save(`zaahi-feasibility-${scenarioId}-${language}.pdf`);  // triggers browser download
```

**Call sites:**
- Client download button on `/admin/feasibility` → `renderFeasibilityPdf(...)` → `blob` → `saveAs(blob, filename)` (using `file-saver` OR just `doc.save(filename)` which handles it natively).
- "Get shareable link" button → `renderFeasibilityPdf(...)` → `uploadFeasibilityPdf(...)` → signed URL → clipboard + email template.

PDF template structure (2-3 pages):
- **Page 1:** Cover · plot summary · parties · ZAAHI Signature 3D render thumbnail (if parcel has one) · big headline numbers (Total Investment · Net Profit · ROI · IRR).
- **Page 2:** Full inputs table + derived (GFA / BUA / SFA breakdowns · land / construction / finance totals).
- **Page 3:** Sensitivity analysis · 3-axis bars · base/low/high scenarios · verdict · disclaimers.

Footer every page: `ZAAHI Real Estate LLC · zaahi.io · Generated DD MMM YYYY HH:MM UAE Time · Commercial assumptions, not a formal valuation.`

### 6.4 Pre-fill from Parcel

```typescript
// src/lib/feasibility-prefill.ts — NEW
export async function prefillFromParcel(parcelId: string): Promise<Partial<FeasibilityInputsAll>> {
  const parcel = await prisma.parcel.findUnique({
    where: { id: parcelId },
    include: { affectionPlans: { orderBy: { fetchedAt: "desc" }, take: 1 } },
  });
  if (!parcel) throw new Error("Parcel not found");
  const ap = parcel.affectionPlans[0];
  return {
    area: {
      plotAreaSqft: parcel.area,
      far: ap?.far ?? 2.5,
      bua: ap?.maxGfaSqft ?? parcel.area * (ap?.far ?? 2.5),
      efficiencyPct: 85,                        // standard default
    },
    land: {
      landCostAed: parcel.currentValuation ? Number(parcel.currentValuation) / 100 : 0,
      dldPct: 4,
      paymentMode: "full",
    },
    // construction / finance / revenue defaults left for user entry
  };
}
```

### 6.5 Edge cases

1. **IRR diverges (construction-heavy, no revenue).** `computeIRR` returns NaN. UI shows "IRR — n/a" with tooltip "Cash-flow profile doesn't support IRR."
2. **Negative ROI.** Show red color + verdict "below target." PDF notes "Consider alternate strategy."
3. **Extreme sensitivity shift (ROI 40 % → -10 %).** UI warns "High variance — deal risk category." PDF flags prominently.
4. **Non-numeric input (user pastes " 12,500.00 AED ").** `parseNumberInput` already handles whitespace / commas / units. Reuse existing helper.
5. **Save over existing scenario.** PATCH overwrites; no version history v1.
6. **Very large BUA (1 M+ sqft).** Performance: single compute < 50 ms regardless of size. No issue.
7. **RTL rendering in Arabic PDF.** CSS `direction: rtl` on document body; numbers stay LTR; Verdict labels translated (`strong`/`moderate`/`below` → `قوي`/`متوسط`/`ضعيف`).
8. **Parcel has no AffectionPlan.** Prefill uses parcel.area + defaults (FAR 2.5, BUA plot×FAR). User sees "Affection plan missing — assumed defaults."

---

## §7 Testing Criteria

### 7.1 Unit tests

- `computeIRR()` — standard case (known IRR 15 %) · edge (all negative cash flows → NaN) · edge (zero cash flows → NaN) · multi-root case (sign flip > 1).
- `computeSensitivity()` — ±20 % on 3 axes produces expected low/high pair; perAxis isolated correctly.
- `prefillFromParcel()` — with affection plan · without · with extreme FAR.
- PDF generation produces valid PDF buffer (content-type + page count).

### 7.2 Integration tests

- **E2E 1 — Plot 1 full cycle.** Load `/admin/feasibility?parcelId=<plot1>`. Inputs pre-filled. Adjust sellPrice slider. Results update < 300 ms. Export PDF. Download.
- **E2E 2 — Scenario save/load.** Save "Plot 1 Base" · navigate away · load by ID · inputs + outputs match.
- **E2E 3 — Sensitivity-band display.** ROI base case shows with "21 % – 35 %" range inline when default ±20 % enabled.
- **E2E 4 — AR language PDF.** Set language=ar · Export. PDF renders RTL · Verdict label "قوي" present · numbers are LTR Western.
- **E2E 5 — IRR NaN handling.** Input construction-heavy zero-revenue scenario. UI shows "IRR — n/a" not "IRR NaN."

### 7.3 Manual acceptance test checklist

- [ ] Dymo opens Calculator on iPad → input panel renders full-width below results panel (responsive).
- [ ] Moving a slider updates results within 300 ms.
- [ ] IRR displayed prominently next to ROI.
- [ ] ±20 % sensitivity band shown under ROI + IRR numbers (e.g., "28 % · range 21–35 %").
- [ ] Export PDF: downloads to iPad within 5 seconds; opens in Apple Files + Adobe Reader; branded header + footer.
- [ ] Save scenario: appears in `/admin/feasibility/scenarios` list; click to load re-populates inputs.
- [ ] `/parcels/[id]` Run Feasibility button opens calculator pre-filled.
- [ ] Language toggle AR renders PDF right-to-left.
- [ ] `pnpm build` green; CLAUDE.md SMOKE TEST passes.

### 7.4 Real-world pilot

- Dymo uses Calculator in Plot 1 first viewing (Week 5 Mon May 18 2026).
- Dymo reports: "Did client engagement improve vs paper Excel?" attestation in `docs/decisions/`.
- Dymo uses Calculator in developer meeting (Week 5 Wed May 20 or Thu May 21).
- 2 real-world pilots before Plot 1 close Week 9. Iterate based on pilot feedback.

---

## §8 Non-Functional Requirements

### 8.1 Performance

- Compute endpoint response < 100 ms (p95).
- Sensitivity endpoint < 300 ms (3 full computes).
- PDF generation < 2 s (jsPDF client-side render); < 5 s end-to-end if "Get shareable link" requested (adds Supabase upload).
- Slider-driven live-update debounced 300 ms.

### 8.2 Security

- All routes via `getApprovedUserId`.
- Scenarios scoped to owner userId; access by others returns 403.
- Parcel prefill doesn't expose private fields (e.g., currentValuation only shared if parcel is LISTED or owner is the current user).
- PDF signed URLs expire 7 days (Supabase).
- Rate limits per Enhancement Proposal S-7.

### 8.3 Accessibility

- Sliders have `aria-valuetext` readable labels.
- IRR result "n/a" case has screen-reader explanation.
- PDF export button keyboard-navigable; announces download state.

### 8.4 Internationalisation

- UI labels EN / AR / RU via existing `src/lib/translate.ts` pattern.
- Arabic RTL in PDF output; numbers stay LTR.
- AED / % / sqft / months units localized where appropriate.

### 8.5 Browser support

- iPad Safari (Dymo's primary device) — tested.
- Chrome / Firefox / Edge desktop.
- iOS / Android mobile Safari — usable but suboptimal (landscape iPad is target).

---

## §9 Effort Estimate

| Phase | Hours | Description |
|---|:-:|---|
| DB migration + seed | 1-2 | FeasibilityScenario model + relation hooks |
| IRR helper | 3-4 | Newton-Raphson solver + unit tests + cash-flow builder |
| Sensitivity helper | 3-4 | Low/high/base compute + perAxis + unit tests |
| Compute endpoint | 3-4 | Stateless live-edit API · Zod schemas · rate limit |
| Scenario CRUD endpoints | 3-4 | 5 routes · Zod · RBAC |
| UI — inputs panel | 6-8 | 5 input sub-panels · sliders + number inputs · live update |
| UI — results panel | 6-8 | Cards + sensitivity chart + verdict badge + iPad landscape layout |
| UI — scenario CRUD | 3-4 | Save / load / list / delete modals |
| PDF template | 6-8 | jsPDF imperative drawing + Amiri/Tajawal Arabic font embedding + optional Supabase upload for shared URL |
| Parcel prefill + widget | 3-4 | Prefill helper + `/parcels/[id]` CTA card |
| Multi-language | 3-4 | EN / AR / RU translation + RTL PDF |
| Tests | 5-7 | Unit + 5 E2E + accessibility |
| Real-world pilot iteration | 3-5 | Post-Dymo pilot feedback + polish |
| **TOTAL** | **48-66 hours** | **= ~1.5-2 engineer-weeks at 40 hrs/week** |

Realistic at Phase 1 Zhan allocation (~14 hrs / week eng + deal support): **3-4 calendar weeks**.

**Target start:** Week 12 (Mon Jul 6 2026) — after Spec 02 + 01 + 03 ship.
**Target complete:** Week 15 end (Fri Jul 31 2026) — OR earlier if Dymo signals urgency for developer-pilot Week 5.

**Earlier-ship caveat:** Dymo's developer partnership meeting Week 5 (May 18-24) per WEEKLY_CADENCE uses Feasibility Calc v1 already. V2 ship could slip to Q3 without blocking that meeting. Real value is v2 at Week 9+ for Plot 1 deal-close client meeting.

---

## §10 Success Criteria

### Zhan knows it's done when

- `pnpm build` + `pnpm test` green.
- 5 E2E scenarios pass.
- Dymo successfully produced PDF in real client meeting ≥ 1 time.
- CLAUDE.md SMOKE TEST passes.

### Dymo verifies it works for daily workflow when

- He opens Calculator on iPad in front of client · enters numbers · exports PDF · hands to client all within 10 minutes.
- Client asks "what's IRR if costs overrun 20 %?" — Dymo adjusts sensitivity slider in 5 seconds · answer visible.
- He saves 2+ scenarios for follow-up.

### Founder attestation Month 5 end

- ≥ 3 real deals used Calculator v2 + ≥ 2 PDF exports handed to clients. Signed attestation in `docs/decisions/`.

---

## §10.A Zhan Quick Start Hints

### First 5 minutes opening this spec

1. Read §1 Context — v5 formulas exist; don't rewrite them.
2. Open `src/lib/feasibility.ts` · scroll to `computeBtS` · that's the entry point your UI wraps.
3. Skim §6.1 IRR implementation — Newton-Raphson; ~40 lines of code.
4. Glance at §5.2 component hierarchy.
5. Check §7.4 Real-world pilot — Dymo is the acceptance test.

### 30-minute smoke test to validate your understanding

- Write a failing test: `expect(computeIRR([-1000, 0, 0, 0, 0, 2011])).toBeCloseTo(0.15, 2)` (known 15 % IRR case). Implement `computeIRR` to make it pass.
- Run existing `deriveArea` from feasibility.ts in a scratch Node REPL with plot=10000, far=2.5. Assert GFA = 25 000 sqft.
- Open `/parcels/[id]` in browser and add a placeholder "Run Feasibility" button. Does it look right per CLAUDE.md Style Guide? You've validated the integration surface.

### If stuck, check these files first

- `src/lib/feasibility.ts` (500 lines — ALL existing pure formulas). **Do not rewrite.**
- `src/app/parcels/map/FeasibilityCalculator.tsx` line 3 (existing `jsPDF` import — **extend this implementation, do not introduce Puppeteer**).
- `src/app/parcels/[id]/page.tsx` (existing parcel detail — you add CTA card here).
- `src/lib/translate.ts` (existing i18n pattern for EN/AR/RU).
- CLAUDE.md UI Style Guide (iPad landscape layout per §5.3).

### Common pitfalls from research

- **Do NOT** reimplement v5 pure formulas. The 500 lines are tested founder-approved as-is. Wrap, don't replace.
- **Do NOT** skip IRR NaN handling. Half of construction-heavy scenarios don't have a real IRR; silently showing "NaN" is worse than "n/a."
- **Do NOT** auto-save on every slider move. 300 ms debounce + explicit Save button. Auto-save floods DB with noise.
- **Do NOT** introduce Puppeteer. jsPDF v4.2.1 is already installed + already used in the existing FeasibilityCalculator.tsx (line 3). Client-side rendering is the correct path for this spec. Saves ~300 MB server dependency + Vercel Edge compatibility work.
- **Do NOT** skip AR right-to-left testing. Al Tamimi + GCC clients expect legible Arabic output.
- **Do NOT** forget the "Run Feasibility" button on `/parcels/[id]` — it's the primary entry point for owner exploration.
- **Do NOT** store cached outputs as source-of-truth. Re-compute on load; `cachedOutputs` is for list-view display only.

---

**End of SPEC 04 — Feasibility Calculator v2.**

This concludes Spec 04 of 4. Next in writing sequence: `README.md` (index + execution-order guide).

Execution order per Q-11 owner-modified ranking: **Spec 02 → Spec 01 → Spec 03 → this spec**. Earlier ship possible if developer-meeting Week 5 demand is strong; real acceptance test is Plot 1 client meeting Weeks 5-8.
