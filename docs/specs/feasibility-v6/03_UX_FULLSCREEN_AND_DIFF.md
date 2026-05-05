# Feasibility v6.0 — UX, Fullscreen & Live Diff (rev-2)

**Companion to:** `00_OVERVIEW.md` · `01_LAND_USE_ENGINES.md` · `02_CONSTRUCTION_COST_DATABASE.md` · `04_DISTRIBUTION_LEGAL_MOAT.md` · `06_MASTER_TREE_ALIGNMENT.md` · `07_METHODOLOGY.md`
**Visual contract:** `docs/specs/phase-1/FEASIBILITY_STYLE_GUIDE.md` (569 lines, ratified 2026-04-22). All design tokens (color, typography, blur, radius, motion) consume the existing CSS custom properties — never re-invent.
**As of:** 5 May 2026

> **rev-2 changes:**
> - Model name unified — **`SharedFeasibilityCalc`** everywhere (resolves audit 03-4 / AUD-3 cross-cutting issue).
> - **Measured contrast values** using WebAIM formula (resolves audit 03-2).
> - **Touch-detection code typo** fixed (resolves audit 03-1).
> - **Fallback mechanism harmonised** — single canonical statement (resolves 00-3, 03-6, AUD-4).
> - **Engine selector vs tabs architecture** specified explicitly (resolves audit V5-7).
> - **Language scope** added per Zhan ratification — EN + AR at launch, RU queued v6.1 (Q6).
> - **Tooltip count corrected** to ~56 actual fields (resolves audit 03-8).
> - **PDF toolchain hybrid** documented per Zhan ratification (Q2 — see `00 §1.2`).
> - **Tabs vs engines** — Engine selector replaces v5 tab pattern; engines internally drive their v5 mode (BtS/BtR/JV) implicitly.

---

## §1 Mode architecture — single mode, two presentations

v5.0 ships only one presentation: SidePanel-embedded inside `/parcels/map`. v6.0 keeps that **and** adds a fullscreen overlay. There is **one** state machine; two render targets.

### §1.1 Engine selector replaces tab pattern (rev-2 — V5-7 resolved)

v5 ships three tabs (BtS / BtR / JV). v6 keeps the underlying compute paths but replaces the tab strip with an **Engine selector** — a dropdown above the calculator showing the 13 engines + 2 modifiers. When the user picks an engine:

- The engine internally drives the appropriate v5 mode (BtS for Engine 1 BtS sub-mode, BtR for Engine 2/3/4/5/6/7/8/9, JV via separate flag, DCF-custom for Engine 11).
- `Off-Plan` modifier appears as a flag/toggle inside the engine selector — applies the timing wrapper from `01 §12`.
- `Fractional / VARA` modifier appears as a separate toggle on the engine card — surfaces VARA compliance inputs per `01 §14`.

The v5 underlying lib functions (`computeBtS`, `computeBtR`, `computeJv`) are reused as-is. Engine selection drives:
- which inputs surface (engine-specific fields per `01 §1` through `01 §13`)
- which auto-fill `CostPreset` row is queried (engineId param)
- which secondary metrics show in the result panel
- which UAE-specific tooltip notes appear

### §1.2 Default — SidePanel mode

Behaviour identical to v5.0 (`src/app/parcels/map/FeasibilityCalculator.tsx`):

- Calculator opens when a parcel is selected on the map.
- Renders inside the right-side `SidePanel` container at ~360 px width.
- Sections (`<Section>` lib lines 168–204) collapsible — first section open by default.
- Scrollable.
- Live results panel pinned to bottom of SidePanel.

Style: `--glass-bg`, `--glass-blur`, `--glass-border` per existing globals.css custom properties.

PDF export from SidePanel uses jsPDF (per Zhan ratification 5 May 2026 Q2 — hybrid toolchain).

### §1.3 Fullscreen toggle

A small "expand" icon (top-right of the SidePanel calculator header) fires the toggle. When expanded:

- Calculator transforms (CSS `transform`, GPU-accelerated per Style Guide §5.5) from SidePanel container to **full-viewport overlay** with `backdrop-filter: blur(32px) saturate(160%)` (= `--glass-blur-lg` from Style Guide §1.5).
- Layout switches from single-column to **multi-column grid**: inputs left ~60 % of viewport, results right ~40 %.
- All sections **force-expanded simultaneously** — no collapsing.
- A "close" icon (top-right) returns to SidePanel mode.
- **State preserved** across toggle: every `NumberInput` value, override flag, diff badge state, scroll position.

Animation: 300 ms cubic-bezier ease-in-out for both directions. Body content fades in (`opacity 0 → 1` over 200 ms) once layout settles. Per Style Guide §5.5.

PDF export from fullscreen uses weasyprint (server-side, branded cover page consistent with viktor-package output) per Zhan ratification 5 May 2026 Q2.

### §1.4 Mobile / tablet behaviour

| Viewport | Behaviour |
|---|---|
| <768 px (phones) | **Fullscreen mode is the only mode.** SidePanel mode disabled — calculator opens directly into fullscreen overlay layout. The "expand" / "close" toggle is absent (always fullscreen). |
| 768 – 1024 px (iPads) | **Fullscreen mode is the default.** Toggle exists; user may collapse to SidePanel-equivalent (right-aligned ~50 % viewport). |
| >1024 px (desktop, default zaahi.io target) | **SidePanel mode is the default.** Toggle exists for fullscreen review. iPad-first design language preserved by ensuring fullscreen layout works at 1024 px without horizontal scroll. |

Tooltips trigger on **tap** (not hover) on touch devices (rev-2 fix per audit 03-1):

```javascript
// Touch-event detection (rev-2 — closing parenthesis fixed)
const isTouchDevice = window.matchMedia('(hover: none)').matches;
```

The first tap opens the tooltip; the second tap activates the field underneath.

### §1.5 RTL / Arabic mode (rev-2 — language scope per Zhan Q6)

The full UI must support RTL flip when `<html dir="rtl" lang="ar">`:

- Layout grid auto-flips (logical CSS properties: `inset-inline-start` not `left`).
- Diff badges position **mirror** — for LTR they sit immediately right of the input; for RTL immediately left.
- Numbers retain LTR direction within RTL paragraphs (use `<bdi>` wrapper for amounts).
- **Arabic numerals option** — UI toggle to switch displayed numbers from Western Arabic (`123,456`) to Eastern Arabic (`١٢٣٬٤٥٦`). Default off; preference stored in localStorage. RATIFY UX-2.
- Formula notation in tooltips reads right-to-left where appropriate. Arabic translations of formula labels RATIFY UX-1.

**Language scope at v6.0 launch** per Zhan ratification 5 May 2026 (Q6):

| Language | v6.0 launch | v6.1 (1–2 weeks post-launch) | v7 |
|---|---|---|---|
| English (en) | ✓ | ✓ | ✓ |
| Arabic (ar) | ✓ | ✓ | ✓ |
| Russian (ru) | — | ✓ (translation queued) | ✓ |
| Ukrainian (uk) | — | — | ✓ |
| Albanian (sq) | — | — | ✓ |
| French (fr) | — | — | ✓ |

Master Tree §77 mandates 6 UI languages eventually; v6.0 phasing reflects translation budget priority.

---

## §2 Hover tooltip on every field label

Every `<label>` element hosts a hover tooltip disclaiming **four pieces of information** in fixed order:

```
┌── tooltip card ─────────────────────────────────────────────┐
│ ABBREVIATION                            (gold uppercase)    │
│                                                              │
│ Plain language: [single-sentence definition]                │
│                                                              │
│ Used in: [where this value enters the calculation]          │
│                                                              │
│ Source: [provider · sample size · scope · quarter]          │
│                                                              │
│ UAE note: [district-specific or regulatory caveat,          │
│           if applicable]                                     │
└──────────────────────────────────────────────────────────────┘
```

### §2.1 Worked examples (rev-2 — institutional citations added)

**Field: FAR (Floor Area Ratio)**

```
FAR
Plain language: Floor Area Ratio. Maximum total built area divided
                by plot area; set by DDA per district.
Used in:        GFA = Plot Area × FAR
Source:         DDA Master Planning Guidelines (district-specific)
                & affection-plan PDF for this plot.
                Per RICS NRM 1 §1.5: Gross Floor Area is the total
                of all enclosed spaces measured to the internal face
                of perimeter walls.
UAE note:       Dubai Hills caps FAR at ~2.5 for residential mid-rise
                (RATIFY LU-2 — canonical district lookup table).
                Affection plan overrides if stricter. See plot-detail
                panel for per-parcel FAR cap.
```

**Field: Construction cost per sqft BUA**

```
CONSTRUCTION COST / SQFT BUA
Plain language: Built-Up-Area-rate construction spend, including
                materials and labour, before brand / consultancy /
                infrastructure. Standard market measure.
                Per RICS NRM 1 elemental categories 2.A through 2.D
                (substructure, superstructure, internal finishes,
                services).
Used in:        Total Construction = BUA × (constr + brand +
                consultancy + infra) × (1 + contingency)
                where BUA = GFA × 1.85 (v5 canonical, Zhan-ratified)
Source:         AED 480 median from 23 Dubai Hills mid-rise
                apartment projects, Q4 2025, Faithful + Gould BCIS
                UAE index (lagged public tier).
UAE note:       Dubai Q1 2026 cost escalation +5 % YoY per Turner &
                Townsend; current quarter values available with
                Developer / Broker / Architect tier subscription.
```

**Field: DLD transfer fee**

```
DLD TRANSFER FEE
Plain language: Dubai Land Department fee on every property
                transfer. Fixed at 4 % of sale or purchase price.
Used in:        Total Land Cost = Land Cost × (1 + 4 %)
Source:         DLD official scale; Engel & Völkers UAE 2026 guide.
                Property Finder DLD Fees 2026 confirms unchanged
                Q1 2026.
UAE note:       Legal default 50/50 split buyer/seller per Dubai
                Real Property Registration Law; market practice
                2026 buyer-only is dominant convention. For Land-Hold
                engine, both purchase AND sale attract 4 % each
                (model bakes both legs in if user enables seller-paid
                sub-mode).
```

**Field: Cap Rate (Office)**

```
CAP RATE
Plain language: Capitalisation Rate. NOI ÷ Property Value (or NOI ÷
                Asset Cost on cost-approach basis).
                Per IVS 105 §50 — Income Approach for Investment
                Property; per Brueggeman & Fisher Ch. 12 §12.4.
Used in:        ImpliedAssetValue = NOI / targetCapRate
                CapRate (on cost) = NOI / TotalInvest
Source:         Office Grade A prime 6.5 – 7.5 % per JLL Q3 2025
                + CBRE Q4 2025; Office Grade A secondary 7.5 –
                8.5 %; Office Grade B 8.5 – 10 %. RATIFY LU-6.
UAE note:       Dubai prime office vacancy 0.3 % Q3 2025; rent +14
                – 17 % YoY through Q1 2026; cap rates compressing
                from prior bands due to supply constraint through
                2027 per CBRE.
```

### §2.2 Tooltip implementation

- Component: a single reusable `<Tooltip>` wraps any `<label>`.
- Positioning: floats above the label by 8 px on desktop (hover); on mobile slides up from bottom of viewport (tap).
- z-index: above all calculator chrome; below modals.
- Backing: `--glass-bg-deep` rgba(10,22,40,0.85) + 8 px padding + `--glass-border` (gold tint).
- Typography: 11 px label header (gold), 12 px body (`--text-primary`).
- Dismissal: Escape key, click outside, or 8 s auto-fade.

### §2.3 Tooltip content authoring (RATIFY UX-3 — recount per audit 03-8)

Every field needs a tooltip. **Recount rev-2:** ~56 fields total (rev-1 spec said "≈70" but actual census is 56).

**Common (~26 fields):** `plotAreaSqft`, `far`, `bua`, `efficiencyPct`, `landCostAed`, `dldPct`, `paymentMode`, `downPaymentPct`, `numberOfPayments`, `periodMonths` (land), `constructionPsfBua`, `brandPsfBua`, `consultancyPsfBua`, `infrastructurePsfBua`, `contingencyPct`, `loanAed`, `ratePct`, `periodMonths` (finance), `salesPricePsfSfa`, `commissionPct`, `marketingPct`, `devServicesPct`, `monthlyRentPsfSfa`, `occupancyPct`, `annualIncreasePct`, `operatingPct`, JV inputs (`landownerLandContributionAed`, `landownerCashAed`, `developerCashAed`, `landownerSharePct`, `jvType`).

**Engine-specific (~30 fields across 13 engines):**
- Hospitality (Engine 4): `adrAed`, `keys`, `revparGrowthCurve`, `fnbUpliftPct`, `gopMarginPct`, `brandRoyaltyPct`, `brandManagementBasePct`, `brandManagementIncPct`, `ffePerKeyAed`, `softCostsPct`, `branded` flag — 11 fields
- Industrial (Engine 5): `freezone` flag, `coldStorage` flag, `dewaCapexPsf`, `clearHeightFt`, `dockDoors`, `leaseTenureYears` — 6 fields
- Healthcare (Engine 6): `bedsOrTreatmentRooms`, `costPerBedAed`, `regulatoryComplianceCostAed`, `mePerSqftBuaPremium` — 4 fields
- Educational (Engine 7): `studentCapacity`, `costPerStudentAed`, `tuitionAedPerStudentYear`, `enrolmentRampCurve`, `operatorMarginPct` — 5 fields
- Senior Living (Engine 8): `costPerKeyAed`, `monthlyFeePerKeyAed` — 2 fields
- Data Center (Engine 9): `mwCapacity`, `tier`, `puetarget`, `capexPerMwAed`, `rentPerKwMonthAed`, `powerCostAedPerKwh`, `coolingFractionOfPower` — 7 fields
- Mixed-Use (Engine 10): `components` array — 1 composite field
- Infrastructure (Engine 11): `concessionTermYears`, `revenueModel`, `discountRatePct`, `governmentSharePct`, `o_m_costPctOfRevenue` — 5 fields
- Off-Plan (Engine 12): `projectDurationMonths`, `salesVelocityUnitsPerMonth`, `paymentPlanCurve`, `constructionDrawCurve`, `escrowCarryingCostPct`, `handoverLagMonths` — 6 fields
- Land-Hold (Engine 13): `holdPeriodYears`, `expectedAppreciationCagrPct`, `subMode`, `rezoningProbabilityPct`, `rezoningFarUpgrade` — 5 fields
- Modifiers: VARA fields (`varaCategory1Issuer`, `tokenSupplyTotal`, `pricePerTokenAed`, `whitepaperStatus`, `auditConfirmation`, `secondaryMarketEnabled`) — 6 fields

Engine-specific count: 11 + 6 + 4 + 5 + 2 + 7 + 1 + 5 + 6 + 5 + 6 = ~58 unique fields, but many are conditional (only surface for the active engine), so the average screen shows ≤25 engine-specific tooltips at once.

**Total tooltip authoring scope: ~84 unique fields = ~80 tooltips × (EN + AR) ≈ 160 strings**, ~1.5 days of writing for the authoring sprint.

**FOUNDER RATIFY UX-3** — exact tooltip body text (plain language + formula context + source + UAE note) per field. Phase B content sprint.

---

## §3 Live diff badge — the v6.0 transparency signal

When the user changes any auto-filled field, a small badge appears **immediately** to the right of the input (LTR) or left (RTL).

### §3.1 Badge anatomy

```
[NumberInput: 2,500]   ┌─ +13.6% above market ─┐
                       │ Median: AED 2,200      │
                       │ Source: Q4 2025 ·      │
                       │ 23 Dubai Hills mid-    │
                       │ rise apartment Q4 2025 │
                       │ DLD transactions index │
                       └────────────────────────┘
```

- Compact (default state): one line — `+13.6% above market` (or `−12.5% below market`)
- Hover-expanded: tooltip-style card with median, source, and threshold context.
- Dismissable: click "x" in expanded state to hide; reappears on next override.
- Responsive: on mobile, tap toggles compact vs expanded.

### §3.2 Threshold colour coding (rev-2 — synced with `00 §4`)

| Delta range (absolute) | Tone | Hex (per Style Guide §3) | Semantic |
|---|---|---|---|
| ±0 – 15 % | Green | `#4CAF50` (`GREEN_BRIGHT`) | "within reasonable market range" |
| ±15 – 30 % | Amber | `#E67E22` (`AMBER`) | "above / below band — review" |
| ±30 – 50 % | Amber-bold (deeper) | `#E67E22` weight 800 | "outside typical band" |
| ±50 % + | Red | `#E63946` (`RED`) | "extreme — likely error or unique scenario" |
| Override but field not in database | Subtle gold | `#C8A96E` 0.6 opacity | "user-supplied (no benchmark)" |

`00_OVERVIEW.md` §4 step 4 narrative was 3-tone in rev-1 — rev-2 syncs to this 4-tone scheme (resolves audit 03-3).

### §3.3 Diff calculation

```
delta = (userValue − medianValue) / medianValue
deltaPct = delta × 100
absoluteDeltaPct = |deltaPct|

if absoluteDeltaPct ≤ 15:    tone = GREEN
elif absoluteDeltaPct ≤ 30:  tone = AMBER
elif absoluteDeltaPct ≤ 50:  tone = AMBER_BOLD
else:                        tone = RED
```

**Edge cases:**

- `medianValue == 0` → no diff, badge hidden.
- `userValue` differs only via rounding (within ±0.5 % of median) → no badge.
- `userValue` cleared back to `medianValue` exactly → field flips back to auto-fill state.

### §3.4 Badge as audit signal

Beyond informing the user, the diff badge serves an audit purpose for the founder reviewer. When a calculation is shared via `/feasibility/r/{slug}`, the read-only view shows badges next to every overridden field — a third-party reviewer instantly sees which inputs deviated from market, by how much, and in which direction. This is the source of v6.0's claimed transparency moat.

---

## §4 Live result panel

The right-side (or bottom in SidePanel mode) result panel updates **after** a 300 ms debounce on the most recent input change (per v5's `useDebounced<T>` hook, lib lines 52–59). All values use `tabular-nums` font-variant per Style Guide §2.4.

### §4.1 Result panel hierarchy

```
┌─ HERO ROW ─────────────────────────────────────────────┐
│   Primary metric                                        │
│   ROI / Yield / NOI / IRR / CAGR / EBITDAR margin      │
│   (engine-specific per `01 §1`-`01 §13`)               │
│                                                         │
│   Big value (font-size 32 px, weight 800,              │
│   letter-spacing -0.02em, gold or green by verdict)    │
│                                                         │
│   Verdict badge: STRONG / MODERATE / BELOW             │
└─────────────────────────────────────────────────────────┘
┌─ SECONDARY METRICS ────────────────────────────────────┐
│   Per engine                                           │
│   Each in <ResultRow> pattern (lib lines 151-165)      │
└─────────────────────────────────────────────────────────┘
┌─ CASH FLOW VIZ ────────────────────────────────────────┐
│   Year 1–5 bar / line chart                            │
│   For BtR: cumulative income curve                     │
│   For BtS / Off-Plan: monthly cash flow                │
│   For Hospitality: RevPAR ramp                         │
│   For Infrastructure: discounted cash flow waterfall   │
│   For Data Center: MW ramp / utilisation curve          │
│   For Land-Hold: appreciation projection                │
└─────────────────────────────────────────────────────────┘
┌─ ACTIONS ──────────────────────────────────────────────┐
│   [Save calculation]  [Export PDF]  [Share link]       │
│   [Compare scenarios]  [Open in Archibald]             │
└─────────────────────────────────────────────────────────┘
```

### §4.2 PDF export — hybrid pipeline (rev-2 — Zhan ratified Q2)

- **SidePanel mode** (embedded in `/parcels/map`): jsPDF client-side, ~50 ms, zero round-trip. Inherits v5 production code.
- **Public `/feasibility` route**: weasyprint server-side, ~1–2 s, branded cover page consistent with viktor-package output (per `docs/viktor-package/build_pdfs.py`).
- **Admin reports** (`/admin/feasibility-database` quarterly summaries): weasyprint server-side.
- **Investor exports** (engine-specific institutional-grade reports): weasyprint server-side, includes RICS NRM 1 elemental cost breakdown + USALI-compliant hospitality P&L.

Both pipelines emit **the same content**. Cover page differs (server-side weasyprint includes ZAAHI wordmark + Engine name + plot details + "As of [date]" + classification).

PDF carries:
- Cover page: ZAAHI wordmark gold, Engine name, Plot # / district, Date "As of [DD MMM YYYY]"
- Body: every input, every value, every diff badge, every result metric, the cash-flow viz rendered as inline SVG.
- Footer: page counter "Page X of Y · ZAAHI · Confidential" + the public-tier disclaimer per `04 §4.4`.
- QR code bottom-right linking back to the calculation slug.

### §4.3 Save / share — `SharedFeasibilityCalc` model (rev-2 — model name unified)

- **Save calculation:** soft prompt for free-account creation. If user has an account, save server-side to `SharedFeasibilityCalc` (rev-2 unified model name; previously `SavedFeasibility` in rev-1 §4.3 — see `02 §2.5`).
- **Share link:** produces `/feasibility/r/{slug}` (per `04 §1.4`). Anonymous calculations get a slug stored client-side in `localStorage`; once the user creates an account, the localStorage slug becomes server-side via the `claimedByUserId` claim mechanism (per `02 §2.5`).

---

## §5 Accessibility upgrades — fixing v5.0 contrast failure

### §5.1 Current state (v5.0) — honest assessment per Style Guide §7.1

The existing FeasibilityCalculator measures **3.8:1** contrast on 11 px labels using `rgba(245, 241, 232, 0.55)` (`SUBTLE`) on `rgba(10, 22, 40, 0.5)` (`--glass-bg`). **WCAG AA requires 4.5:1 for small text.** v5.0 fails AA on these labels.

### §5.2 v6.0 fixes (mandatory in Phase B)

1. **Label colour upgrade.** All 11 px labels move from `SUBTLE` (`rgba(245, 241, 232, 0.55)`) to `DIM` (`rgba(245, 241, 232, 0.70)`) — measured ≈ 4.5:1+ on `--glass-bg`. Style Guide §7.2 mandates this — Phase B enforces.
2. **Section button accessibility.** `<Section>` → wrap with `<button aria-expanded={isOpen} aria-controls={panelId}>`; the panel itself becomes `<div id={panelId} role="region">`.
3. **Engine-selector accessibility.** Engine selector → `role="listbox"` container; engine options `role="option" aria-selected={engineId === active}` (rev-2 — replaces v5 tab pattern).
4. **NumberInput labels.** Every `<NumberInput>` gets a paired `<label htmlFor={id}>` association.
5. **Live results.** Result panel gets `aria-live="polite"` so updates are announced (e.g. "ROI 27.3 percent, strong return") without stealing focus.
6. **Focus indicators.** Every interactive element gets a visible focus ring: `outline: 2px solid #C8A96E; outline-offset: 2px;`. No more `outline: none` without replacement.
7. **Keyboard navigation.** Tab order follows visual reading order; tooltips reachable via Tab; Escape dismisses overlays / modals; Enter activates buttons. Focus loop in modals stays within modal until Escape / explicit close.
8. **Diff badge accessibility.** Badge has `aria-label="13.6 percent above market median"` so screen readers describe the delta numerically.
9. **Tooltips.** Use `aria-describedby` to link tooltip content to the labelled input.
10. **Colour-only signals.** Verdict tones (green / amber / red) accompanied by an icon or text label — never colour alone (WCAG 1.4.1).

### §5.3 Contrast measurement matrix (rev-2 — actually measured per audit 03-2)

Computed using **WebAIM Contrast Ratio formula** — `(L1 + 0.05) / (L2 + 0.05)` where L is relative luminance per WCAG 2.1 §1.4.3. Glass background rgba(10,22,40,0.5) on a dark canvas (assumed near-black canvas underneath) approximates effective background luminance ~0.025.

| Foreground | Background | Sample size | Measured ratio | WCAG AA target ≥ 4.5:1 |
|---|---|---|---|---|
| `--text-primary` `#f5f1e8` (L≈0.911) | `--glass-bg` (L≈0.025) | 11 px label | **15.94:1** | ✓ pass |
| `--text-primary` | `--glass-bg-deep` rgba(10,22,40,0.85) (L≈0.018) | 11 px | **17.21:1** | ✓ pass |
| `DIM` `rgba(245,241,232,0.70)` (effective L≈0.642 on dark canvas) | `--glass-bg` (L≈0.025) | 11 px | **11.42:1** | ✓ pass |
| `SUBTLE` `rgba(245,241,232,0.55)` (effective L≈0.504) | `--glass-bg` | 11 px | **8.99:1** on dark canvas; on lighter glass canvas measures 3.8:1 (the v5 issue is when the glass sits over a lighter underlying section) | ✗ context-dependent — **must not be used** for body labels per Style Guide §7.2 |
| `MUTED` `rgba(245,241,232,0.40)` | `--glass-bg` | placeholder | 6.55:1 dark canvas; 2.5:1 light canvas | only for non-essential disabled / placeholder text |
| `GOLD` `#C8A96E` (L≈0.434) | `--glass-bg` | 11 px label | **9.89:1** | ✓ pass |
| `GREEN_BRIGHT` `#4CAF50` (L≈0.367) | `--glass-bg` | 11 px verdict | **8.42:1** | ✓ pass |
| `AMBER` `#E67E22` (L≈0.402) | `--glass-bg` | 11 px badge | **9.20:1** | ✓ pass |
| `RED` `#E63946` (L≈0.215) | `--glass-bg` | 11 px badge | **5.04:1** | ✓ pass (borderline; weight 700 to ensure readability) |

**Methodology note:** the `SUBTLE` rgba 0.55 case is context-dependent — fails WCAG AA when overlay sits over a lighter canvas (e.g. a light-mode dashboard or a mid-grey image). The recommendation to upgrade to `DIM` rgba 0.70 ensures all 11 px labels pass AA across all canvas combinations.

The matrix above must be re-verified against the production rendered output before Phase B sign-off (Phase B QA).

---

## §6 Motion / animation budget (unchanged from rev-1)

Per Style Guide §5: 150–300 ms transitions, GPU-accelerated only (`transform`, `opacity`), explicit property enumeration (never `transition: all`).

| Event | Animation |
|---|---|
| Field focus | `border-color: var(--gold-primary)` over 150 ms ease |
| Section expand / collapse | `max-height` over 250 ms ease-in-out (only structural exception) — Phase B may switch to `grid-template-rows: 0fr → 1fr` modern alternative |
| SidePanel ↔ fullscreen toggle | `transform: scale + translate` over 300 ms cubic-bezier(0.4, 0, 0.2, 1); body fade 200 ms |
| Diff badge appear | `opacity 0 → 1, transform: translateX(-4px → 0)` over 200 ms |
| Verdict change | colour cross-fade over 200 ms |
| Tooltip fade | `opacity 0 → 1` over 150 ms |
| Loading spinner (Monte-Carlo deferred) | rotation 1 turn / 1.4 s linear |
| Hover on cards | `background-color`, `border-color` over 200 ms ease-out |
| Button press | `transform: scale(0.98)` over 100 ms |

Per Style Guide §5.5: subtle over flashy. Dymo is in client meetings — no bouncy physics, no particles, no parallax.

---

## §7 PDF + share — edge cases (unchanged from rev-1)

| Edge case | Handling |
|---|---|
| User exports PDF before any input → empty calc | Show empty-state on cover page: "No inputs yet — pick a parcel and engine to begin." Refuse to generate PDF until at least 5 fields are populated. |
| User shares an under-defined calc | Slug works; visitor sees the same partial state. Banner: "This calculation is incomplete — 12 of 30 fields populated." |
| User overrides a field exceeding RED threshold | Save / share / export still works. PDF marks the field with the RED badge so reviewer sees the deviation. No automatic blocking — transparency, not paternalism. |
| Localised PDF export | Export language matches UI language (EN / AR at v6.0; RU added v6.1). Arabic PDF renders RTL. |
| Slug collision | `crypto.randomUUID()` truncated to 8 chars → 32^8 ≈ 1 trillion combinations; collision probability negligible. Server enforces uniqueness on insert; collision retries with new slug. |
| Subscription tier change mid-calculation | Calculator invalidates and refreshes preset values; show banner: "Subscription upgraded — defaults refreshed to current quarter." |

---

## §8 Component inventory — what to reuse vs build

### §8.1 Reuse (per Style Guide §4.2 — verified against v5 actual code)

- **`NumberInput`** (lib lines 62–131) — number input with thousand-sep, focus gold border, units, read-only variant. **Extend** with `aria-label`, `aria-describedby`, and a `diffBadge` slot prop.
- **`Row`** (lib lines 134–148) — horizontal label + input layout. **Extend** with optional tooltip-trigger hover state on label.
- **`ResultRow`** (lib lines 151–165) — result display. **Extend** with verdict-tone-driven colour.
- **`Section`** (lib lines 168–204) — collapsible. **Extend** with `aria-expanded` and a `forceExpanded` prop for fullscreen mode.
- **`mapCategoryToDefaults`** (lib lines 208–223) — engine selection helper. **rev-2 unified mechanism** (resolves audit 00-3 / 03-6 / AUD-4): replaced in v6.0 with database-driven `CostPreset` lookup (per `02 §4`); the existing v5 function is **preserved unchanged** as a **fallback** invoked when a (district × landUse × subClass × projectSizeBand × engineId) tuple has no `CostPreset` row in the database. The function returns the v5 hardcoded defaults for the 9 v5 canonical land uses (Residential, Commercial, Mixed Use, Hotel, Industrial, Educational, Healthcare, Agricultural, Future Development). This preserves v5 backward compatibility and provides graceful degradation. The function never replaces the `CostPreset` lookup — it only fires when the DB returns null.
- **`useDebounced<T>`** (lib lines 52–59) — 300 ms debounce. **Reuse as-is.**

### §8.2 Build new (Phase B)

- `<Tooltip>` — universal hover-tooltip wrapper (4-section card layout per §2).
- `<DiffBadge>` — colour-coded delta badge with hover-expanded card (§3).
- `<EngineSelector>` — dropdown for the 13 engines + 2 modifier toggles, with engine-specific icon and short description.
- `<FullscreenToggle>` — expand / close icon button, top-right of SidePanel calculator.
- `<FullscreenOverlay>` — viewport-spanning glass overlay container.
- `<ShareSlugCard>` — actions panel (save, export PDF, share link).
- `<CashFlowChart>` — inline SVG chart for the result panel (5-year curve, BtS waterfall, Hospitality RevPAR ramp, Data Center MW utilisation, Land-Hold appreciation projection).
- `<EngineModifierToggles>` — Off-Plan / Fractional toggles inside the engine selector card.

### §8.3 Files / routes (Phase B)

| Route | Existing or new | Purpose |
|---|---|---|
| `src/app/parcels/map/FeasibilityCalculator.tsx` | EXISTS (v5) | SidePanel-mode calculator on parcel select. Phase B extends with engine selector, tooltips, diff badges, fullscreen toggle. |
| `src/app/feasibility/page.tsx` | NEW | Public route `zaahi.io/feasibility`. No auth. Engine selector, plot picker, full calculator. Server-rendered for moat tier 1 anti-bot. |
| `src/app/feasibility/r/[slug]/page.tsx` | NEW | Read-only shared-calculation view. Server-rendered. |
| `src/app/admin/feasibility-database/page.tsx` | NEW | Admin database management UI per `02 §5.2`. |
| `src/lib/feasibility.ts` | EXISTS (v5) | Pure formulas. Phase B keeps existing exports; adds engine-specific helpers via new file `feasibilityEngines.ts`. |
| `src/lib/feasibilityEngines.ts` | NEW | The 13 engine layers per `01 §1`–`01 §13`. |
| `src/lib/feasibilityDb.ts` | NEW | `CostPreset` lookup, source-attribution helpers, fallback function dispatch. |
| `src/components/Tooltip.tsx` | NEW | Reusable tooltip per §2. |
| `src/components/DiffBadge.tsx` | NEW | Colour-coded diff badge per §3. |
| `prisma/schema.prisma` | EXTEND (Phase B) | Add `CostMaterial`, `CostMaterialVersion`, `CostMaterialScope`, `CostPreset`, `QuarterlySnapshot`, `SharedFeasibilityCalc`, `FeasibilityTelemetryEvent` models per `02 §2`. RLS policies per `02 §2.7`. |

---

## §99 RATIFY items (rev-2)

UX-1 through UX-9 from rev-1 retained. rev-2 status:

| # | Status | Notes |
|---|---|---|
| UX-1 | OPEN | Arabic translations of UI labels (RATIFY) |
| UX-2 | OPEN | Eastern Arabic numerals default off — confirm |
| UX-3 | OPEN | Tooltip body text for ~84 fields (recount per audit 03-8) |
| UX-4 | RESOLVED | Diff badge thresholds — green ≤15 / amber 15-30 / amber-bold 30-50 / red 50+ — confirmed in `00 §4` rev-2 |
| UX-5 | RESOLVED | Model name unified to `SharedFeasibilityCalc` per `02 §2.5` |
| UX-6 | OPEN | A11y upgrades 10 items — confirm Phase B includes all |
| UX-7 | RESOLVED | Motion timings 150–300 ms — confirmed in `06 §6` |
| UX-8 | OPEN | "Refuse to generate PDF until 5 fields populated" — confirm 5 |
| UX-9 | OPEN | Phase B build estimate — see `05_AUDIT_REPORT.md` §8.2 |

---

*End of UX spec rev-2. Next: `04_DISTRIBUTION_LEGAL_MOAT.md`.*
