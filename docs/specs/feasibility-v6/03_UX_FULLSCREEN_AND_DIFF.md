# Feasibility v6.0 — UX, Fullscreen & Live Diff

**Companion to:** `00_OVERVIEW.md` · `01_LAND_USE_ENGINES.md` · `02_CONSTRUCTION_COST_DATABASE.md` · `04_DISTRIBUTION_LEGAL_MOAT.md`
**Visual contract:** `docs/specs/phase-1/FEASIBILITY_STYLE_GUIDE.md` (569 lines, ratified 2026-04-22). All design tokens (color, typography, blur, radius, motion) consume the existing CSS custom properties — never re-invent.
**As of:** 5 May 2026

This file specifies the v6.0 UX behaviour: single-mode vs fullscreen,
the live diff badge mechanic, hover tooltips, mobile / iPad
behaviour, RTL, and accessibility upgrades that fix v5.0's WCAG AA
contrast failure.

---

## §1 Mode architecture — single mode, two presentations

v5.0 ships only one presentation: SidePanel-embedded inside
`/parcels/map`. v6.0 keeps that **and** adds a fullscreen overlay.
There is **one** state machine; two render targets.

### §1.1 Default — SidePanel mode

Behaviour identical to v5.0 (`src/app/parcels/map/FeasibilityCalculator.tsx`):

- Calculator opens when a parcel is selected on the map.
- Renders inside the right-side `SidePanel` container at ~360 px width.
- Sections (`<Section>` component, lib lines 168-204) are **collapsible** — first section open by default, others collapsed.
- Scrollable.
- Live results panel pinned to bottom of SidePanel.

Style: `--glass-bg`, `--glass-blur`, `--glass-border`, all per
existing globals.css custom properties.

### §1.2 Fullscreen toggle

A small "expand" icon (top-right of the SidePanel calculator header)
fires the toggle. When expanded:

- Calculator transforms (CSS `transform`, GPU-accelerated per Style Guide §5.5) from SidePanel container to **full-viewport overlay** with `backdrop-filter: blur(32px) saturate(160%)` (= `--glass-blur-lg` from Style Guide §1.5).
- Layout switches from single-column to **multi-column grid**: inputs left ~60 % of viewport, results right ~40 %.
- All sections **force-expanded simultaneously** — no collapsing, no progressive disclosure. The whole model is visible.
- A "close" icon (top-right) returns to SidePanel mode.
- **State preserved** across toggle: every `NumberInput` value, every override flag, every override diff badge state, the current scroll position within the result panel — all retained.

Animation: 300 ms cubic-bezier ease-in-out for both directions.
Body content fades in (`opacity 0 → 1` over 200 ms) once the
overlay layout settles. Per Style Guide §5.5.

### §1.3 Mobile / tablet behaviour

| Viewport | Behaviour |
|---|---|
| <768 px (phones) | **Fullscreen mode is the only mode.** SidePanel mode is disabled — the calculator opens directly into the fullscreen overlay layout. The "expand" / "close" toggle is absent (always fullscreen). |
| 768 – 1024 px (iPads) | **Fullscreen mode is the default.** The toggle exists; the user may collapse to a SidePanel-equivalent if they prefer (right-aligned ~50 % viewport instead of full overlay). |
| >1024 px (desktop, default zaahi.io target) | **SidePanel mode is the default.** Toggle exists for fullscreen review. iPad-first design language preserved by ensuring fullscreen layout works at 1024 px exactly without horizontal scroll. |

Tooltips trigger on **tap** (not hover) on touch devices. The first
tap opens the tooltip; the second tap activates the field
underneath. Touch-event detection: `(window.matchMedia('(hover: none)').matches`.

### §1.4 RTL / Arabic mode

The full UI must support RTL flip when `<html dir="rtl" lang="ar">`:

- Layout grid auto-flips (logical CSS properties: `inset-inline-start` not `left`).
- Diff badges position **mirror** — for LTR they sit immediately right of the input; for RTL they sit immediately left.
- Numbers retain LTR direction within RTL paragraphs (use `<bdi>` wrapper for amounts).
- **Arabic numerals option** — UI toggle to switch all displayed numbers from Western Arabic (`123,456`) to Eastern Arabic (`١٢٣٬٤٥٦`). Default off; preference stored in localStorage.
- Formula notation in tooltips reads right-to-left (e.g. instead of `GFA = Plot × FAR` the Arabic version reads `العلوم = القطعة × FAR`). FOUNDER RATIFY — Arabic translations of formula labels.

The existing v5 calculator does not support RTL — flagged as Phase B
implementation work; layout primitives use logical properties
throughout.

---

## §2 Hover tooltip on every field label

Every `<label>` element in the calculator hosts a hover tooltip that
disclaims **four pieces of information** in a fixed order:

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

### §2.1 Worked examples

**Field: FAR (Floor Area Ratio)**

```
FAR
Plain language: Floor Area Ratio. Maximum total built area divided
                by plot area; set by DDA per district.
Used in:        GFA = Plot Area × FAR
Source:         DDA Master Planning Guidelines (district-specific)
                & affection-plan PDF for this plot.
UAE note:       Dubai Hills caps FAR at 2.5 for residential
                mid-rise. Affection plan overrides if stricter.
                See plot-detail panel for per-parcel FAR cap.
```

**Field: Construction cost per sqft BUA**

```
CONSTRUCTION COST / SQFT BUA
Plain language: Built-Up-Area-rate construction spend, including
                materials and labour, before brand / consultancy /
                infrastructure. Standard market measure.
Used in:        Total Construction = BUA × (constr + brand +
                consultancy + infra) × (1 + contingency)
Source:         AED 480 median from 23 Dubai Hills mid-rise
                apartment projects, Q4 2025, Faithful + Gould
                BCIS UAE index (lagged public tier).
UAE note:       Dubai Q1 2026 cost escalation +5 % YoY per Turner
                & Townsend; current quarter values available with
                Developer / Broker / Architect tier subscription.
```

**Field: DLD transfer fee**

```
DLD TRANSFER FEE
Plain language: Dubai Land Department fee on every property transfer.
                Fixed at 4 % of sale or purchase price.
Used in:        Total Land Cost = Land Cost × (1 + 4 %)
Source:         DLD official scale; Engel & Völkers UAE 2026 guide.
UAE note:       Convention is buyer-only (or 50/50 by negotiation).
                For Land-Hold engine, both purchase AND sale
                attract 4 % each — model bakes both legs in.
```

### §2.2 Tooltip implementation

- Component: a single reusable `<Tooltip>` that wraps any `<label>`.
- Positioning: floats above the label by 8 px on desktop (hover); on mobile slides up from bottom of viewport (tap).
- z-index: above all calculator chrome; below modals.
- Backing: `--glass-bg-deep` (rgba(10, 22, 40, 0.85)) + 8 px padding + `--glass-border` (gold tint).
- Typography: 11 px label header (gold), 12 px body (`--text-primary`).
- Dismissal: Escape key, click outside, or 8 s auto-fade.

### §2.3 Tooltip content authoring (FOUNDER RATIFY)

Every field label needs a tooltip. The full inventory below maps to
v5 + v6 inputs across all 8 engines. Tooltips for all "Common" fields
are universal; engine-specific fields appear only when the engine is
active.

**Common (≈30 fields):** `plotAreaSqft`, `far`, `bua`, `efficiencyPct`,
`landCostAed`, `dldPct`, `paymentMode`, `downPaymentPct`,
`numberOfPayments`, `periodMonths` (land), `constructionPsfBua`,
`brandPsfBua`, `consultancyPsfBua`, `infrastructurePsfBua`,
`contingencyPct`, `loanAed`, `ratePct`, `periodMonths` (finance),
`salesPricePsfSfa`, `commissionPct`, `marketingPct`, `devServicesPct`,
`monthlyRentPsfSfa`, `occupancyPct`, `annualIncreasePct`, `operatingPct`,
JV inputs (`landownerLandContributionAed`, `landownerCashAed`,
`developerCashAed`, `landownerSharePct`, `jvType`).

**Engine-specific (≈40 fields):** ADR, RevPAR, GOP margin, F&B
uplift, brand royalty, FF&E per key (Hospitality); free-zone premium,
DEWA capex, clear height (Industrial); concession term, discount
rate, government share (Infrastructure); construction draw curve,
sales velocity, escrow milestones (Off-Plan); appreciation CAGR,
hold period, leveraged equity (Land-Hold); component split,
sequencing phase (Mixed-Use).

**FOUNDER RATIFY** — exact tooltip body text (plain language +
formula context + source + UAE note) for each of ~70 fields. Phase B
content sprint, ~1 day of writing.

---

## §3 Live diff badge — the v6.0 transparency signal

When the user changes any auto-filled field, a small badge appears
**immediately** to the right of the input (LTR) or left (RTL).

### §3.1 Badge anatomy

```
[NumberInput: 2,500]   ┌─ +13.6% above market ─┐
                       │ Median: AED 2,200      │
                       │ Source: Q4 2025 ·      │
                       │ 23 Dubai Hills mid-    │
                       │ rise apartment Q4 2025 │
                       └────────────────────────┘
```

- Compact (default state): one line — `+13.6% above market` (or `−12.5% below market`)
- Hover-expanded: tooltip-style card with median, source, and threshold context.
- Dismissable: click "x" in expanded state to hide; reappears on next override.
- Responsive: on mobile, tap toggles compact vs expanded.

### §3.2 Threshold colour coding

| Delta range (absolute) | Tone | Hex (per Style Guide §3) | Semantic |
|---|---|---|---|
| ±0 – 15 % | Green | `#4CAF50` (`GREEN_BRIGHT`) | "within reasonable market range" |
| ±15 – 30 % | Amber | `#E67E22` (`AMBER`) | "above / below band — review" |
| ±30 – 50 % | Amber-bold (deeper) | `#E67E22` 800 weight | "outside typical band" |
| ±50 % + | Red | `#E63946` (`RED`) | "extreme — likely error or unique scenario" |
| Override but field not in database (no median to compare) | Subtle gold | `#C8A96E` 0.6 opacity | "user-supplied (no benchmark)" |

The thresholds match the existing v5 verdict tones (`GREEN`, `GOLD`,
`GRAY`) and extend with `AMBER` and `RED` for the badge-specific
range.

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
- `userValue` differs only via rounding (within ±0.5 % of median) → no badge — avoids visual noise on auto-fill round-trip.
- `userValue` cleared back to `medianValue` exactly → field flips back to auto-fill state (no badge).

### §3.4 Badge as audit signal

Beyond informing the user, the diff badge serves an audit purpose for
the founder reviewer. When a calculation is shared via
`/feasibility/r/{slug}`, the read-only view shows badges next to
every overridden field — a third-party reviewer instantly sees which
inputs deviated from market, by how much, and in which direction.
This is the source of v6.0's claimed transparency moat against
incumbent calculators.

---

## §4 Live result panel

The right-side (or bottom in SidePanel mode) result panel updates
**after** a 300 ms debounce on the most recent input change (per
v5's `useDebounced<T>` hook, lib lines 52-59). All values use
`tabular-nums` font-variant per Style Guide §2.4.

### §4.1 Result panel hierarchy

```
┌─ HERO ROW ─────────────────────────────────────────────┐
│   Primary metric                                        │
│   ROI / Yield / NOI / IRR / CAGR                       │
│                                                         │
│   Big value (font-size 32 px, weight 800,              │
│   letter-spacing -0.02em, gold or green by verdict)    │
│                                                         │
│   Verdict badge: STRONG / MODERATE / BELOW             │
└─────────────────────────────────────────────────────────┘
┌─ SECONDARY METRICS ────────────────────────────────────┐
│   Per engine §1.3 / §2.3 / §3.3 / etc.                │
│   Each in <ResultRow> pattern (lib §1.7 layout)        │
└─────────────────────────────────────────────────────────┘
┌─ CASH FLOW VIZ ────────────────────────────────────────┐
│   Year 1–5 bar / line chart                            │
│   For BtR: cumulative income curve                     │
│   For BtS / Off-Plan: monthly cash flow                │
│   For Hospitality: RevPAR ramp                         │
│   For Infrastructure: discounted cash flow waterfall   │
└─────────────────────────────────────────────────────────┘
┌─ ACTIONS ──────────────────────────────────────────────┐
│   [Save calculation]  [Export PDF]  [Share link]       │
│   [Compare scenarios]  [Open in Archibald]             │
└─────────────────────────────────────────────────────────┘
```

### §4.2 PDF export

Re-uses the proven weasyprint PDF pipeline from
`docs/viktor-package/build_pdfs.py` (Phase C of investor package,
2026-05-05). The PDF carries:

- Cover page: ZAAHI wordmark gold, Engine name, Plot # / district,
  Date "As of [DD MMM YYYY]"
- Body: every input, every value, every diff badge, every result
  metric, the cash-flow viz rendered as inline SVG.
- Footer: page counter "Page X of Y · ZAAHI · Confidential" + the
  required public-tier disclaimer (per `04_DISTRIBUTION_LEGAL_MOAT.md` §4).
- QR code bottom-right linking back to the calculation slug.

### §4.3 Save / share

- "Save calculation" — soft prompt for free-account creation. If the
  user has an account, save server-side (`SavedFeasibility` Prisma
  model, FOUNDER RATIFY exact shape).
- "Share link" — produces `/feasibility/r/{slug}` (see
  `04_DISTRIBUTION_LEGAL_MOAT.md` §1.3). Anonymous calculations get
  a slug stored client-side in `localStorage`; once the user creates
  an account, the localStorage slug becomes server-side.

---

## §5 Accessibility upgrades — fixing v5.0 contrast failure

### §5.1 Current state (v5.0) — honest assessment per Style Guide §7.1

The existing FeasibilityCalculator measures **3.8:1** contrast on 11 px
labels using `rgba(245, 241, 232, 0.55)` (`SUBTLE`) on
`rgba(10, 22, 40, 0.5)` (`--glass-bg`). **WCAG AA requires 4.5:1 for
small text.** v5.0 fails AA on these labels.

### §5.2 v6.0 fixes (mandatory in Phase B)

1. **Label colour upgrade.** All 11 px labels move from `SUBTLE`
   (`rgba(245, 241, 232, 0.55)`) to `DIM`
   (`rgba(245, 241, 232, 0.70)`) — measured ≈ 4.5:1+ on `--glass-bg`.
   Style Guide §7.2 already mandates this — Phase B must enforce.

2. **Section button accessibility.** `<Section>` → wrap with `<button
   aria-expanded={isOpen} aria-controls={panelId}>`; the panel itself
   becomes `<div id={panelId} role="region">`. v5 currently misses
   ARIA attributes per Style Guide §7.1.

3. **Tab bar.** v5 inferred tab pattern → upgrade to `role="tablist"`
   container; tabs are `role="tab" aria-selected={tab === 'bts'}`.

4. **NumberInput labels.** Every `<NumberInput>` gets a paired
   `<label htmlFor={id}>` association so screen readers announce field
   purpose.

5. **Live results.** Result panel gets `aria-live="polite"` so updates
   are announced (e.g. "ROI 27.3 percent, strong return") without
   stealing focus.

6. **Focus indicators.** Every interactive element gets a visible
   focus ring: `outline: 2px solid #C8A96E; outline-offset: 2px;`.
   No more `outline: none` without replacement (CLAUDE.md UI Style
   Guide rule).

7. **Keyboard navigation.** Tab order follows visual reading order;
   tooltips reachable via Tab; Escape dismisses overlays / modals;
   Enter activates buttons. Focus loop in modals stays within
   modal until Escape / explicit close.

8. **Diff badge accessibility.** The badge has `aria-label="13.6
   percent above market median"` so screen readers describe the
   delta numerically rather than reading raw badge text.

9. **Tooltips.** Use `aria-describedby` to link the tooltip content
   to the labelled input.

10. **Colour-only signals.** Verdict tones (green / amber / red) are
    accompanied by an icon or text label — never colour alone (WCAG
    1.4.1).

### §5.3 Contrast spot-check matrix

| Foreground | Background | Sample size | Ratio (target ≥ 4.5:1) |
|---|---|---|---|
| `--text-primary` `#f5f1e8` | `--glass-bg` rgba(10,22,40,0.5) on dark canvas | 11 px label | ≈ 12:1 ✓ |
| `--text-primary` | `--glass-bg-deep` rgba(10,22,40,0.85) | 11 px | ≈ 14:1 ✓ |
| `DIM` `rgba(245,241,232,0.70)` | `--glass-bg` | 11 px | ≈ 8.5:1 ✓ |
| `SUBTLE` `rgba(245,241,232,0.55)` | `--glass-bg` | 11 px | **3.8:1 ✗** — must not be used for body labels |
| `MUTED` `rgba(245,241,232,0.40)` | `--glass-bg` | placeholder | ≈ 2.5:1 — only for non-essential disabled / placeholder text |
| `GOLD` `#C8A96E` | `--glass-bg` | 11 px label | ≈ 4.6:1 ✓ |
| `GREEN_BRIGHT` `#4CAF50` | `--glass-bg` | 11 px verdict | ≈ 5.0:1 ✓ |
| `AMBER` `#E67E22` | `--glass-bg` | 11 px badge | ≈ 4.7:1 ✓ |
| `RED` `#E63946` | `--glass-bg` | 11 px badge | ≈ 4.5:1 ✓ (borderline; weight 700 to ensure readability) |

The matrix above must be re-verified against the production rendered
output before Phase B sign-off. Reference Style Guide §7 for the
v2-onwards required upgrades.

---

## §6 Motion / animation budget

Per Style Guide §5: 150–300 ms transitions, GPU-accelerated only
(`transform`, `opacity`), explicit property enumeration (never
`transition: all`).

| Event | Animation |
|---|---|
| Field focus | `border-color: var(--gold-primary)` over 150 ms ease |
| Section expand / collapse | `max-height` (height-based, but acceptable here as the only structural exception) over 250 ms ease-in-out |
| SidePanel ↔ fullscreen toggle | `transform: scale + translate` over 300 ms cubic-bezier(0.4, 0, 0.2, 1); body fade 200 ms |
| Diff badge appear | `opacity 0 → 1, transform: translateX(-4px → 0)` over 200 ms |
| Verdict change | colour cross-fade over 200 ms |
| Tooltip fade | `opacity 0 → 1` over 150 ms |
| Loading spinner (Monte-Carlo, deferred) | rotation 1 turn / 1.4 s linear |
| Hover on cards | `background-color`, `border-color` over 200 ms ease-out |
| Button press | `transform: scale(0.98)` over 100 ms |

Per Style Guide §5.5: subtle over flashy. Dymo is in client meetings —
no bouncy physics, no particles, no parallax.

---

## §7 PDF + share — coverage of edge cases

| Edge case | Handling |
|---|---|
| User exports PDF before any input → empty calc | Show empty-state on cover page: "No inputs yet — pick a parcel and engine to begin." Refuse to generate PDF until at least 5 fields are populated. |
| User shares an under-defined calc | Slug works; visitor sees the same partial state. Banner: "This calculation is incomplete — 12 of 30 fields populated." |
| User overrides a field with a value that exceeds RED threshold | Save / share / export still works. PDF marks the field with the RED badge so reviewer sees the deviation. No automatic blocking — transparency, not paternalism. |
| Localised PDF export | Export language matches UI language (EN / AR). Arabic PDF renders RTL. |
| Slug collision | `crypto.randomUUID()` truncated to 8 chars → 32^8 ≈ 1 trillion combinations; collision probability negligible. Server enforces uniqueness on insert; collision retries with new slug. |
| Subscription tier change mid-calculation | Calculator invalidates and refreshes preset values; show banner: "Subscription upgraded — defaults refreshed to current quarter." |

---

## §8 Component inventory — what to reuse vs build

### §8.1 Reuse (per Style Guide §4.2)

- `NumberInput` (lib lines 62–131) — number input with thousand-sep, focus gold border, units, read-only variant. **Extend** with `aria-label`, `aria-describedby`, and a `diffBadge` slot prop.
- `Row` (lib lines 134–148) — horizontal label + input layout. **Extend** with optional tooltip-trigger hover state on label.
- `ResultRow` (lib lines 151–165) — result display. **Extend** with verdict-tone-driven colour.
- `Section` (lib lines 168–204) — collapsible. **Extend** with `aria-expanded` and a `forceExpanded` prop for fullscreen mode.
- `mapCategoryToDefaults` (lib lines 208–223) — engine selection helper. **Replace** in v6.0 with database-driven `CostPreset` lookup (per `02_CONSTRUCTION_COST_DATABASE.md` §4); keep the existing function as a fallback for the 4 v5 land uses not in v6's 8 engines.
- `useDebounced<T>` (lib lines 52–59) — 300 ms debounce. **Reuse as-is.**

### §8.2 Build new (Phase B)

- `<Tooltip>` — universal hover-tooltip wrapper (4-section card layout per §2).
- `<DiffBadge>` — colour-coded delta badge with hover-expanded card (§3).
- `<EngineSelector>` — dropdown for the 8 engines, with engine-specific icon and short description.
- `<FullscreenToggle>` — expand / close icon button, top-right of SidePanel calculator.
- `<FullscreenOverlay>` — viewport-spanning glass overlay container.
- `<ShareSlugCard>` — actions panel (save, export PDF, share link).
- `<CashFlowChart>` — inline SVG chart for the result panel (5-year curve, BtS waterfall, Hospitality RevPAR ramp).

### §8.3 Files / routes (Phase B)

| Route | Existing or new | Purpose |
|---|---|---|
| `src/app/parcels/map/FeasibilityCalculator.tsx` | EXISTS (v5) | SidePanel-mode calculator on parcel select. Phase B extends with engine selector, tooltips, diff badges, fullscreen toggle. |
| `src/app/feasibility/page.tsx` | NEW | Public route `zaahi.io/feasibility`. No auth. Engine selector, plot picker, full calculator. |
| `src/app/feasibility/r/[slug]/page.tsx` | NEW | Read-only shared-calculation view. |
| `src/app/admin/feasibility-database/page.tsx` | NEW | Admin database management UI (per `02_CONSTRUCTION_COST_DATABASE.md` §5.2). |
| `src/lib/feasibility.ts` | EXISTS (v5) | Pure formulas. Phase B keeps existing exports; adds engine-specific helpers. |
| `src/lib/feasibilityEngines.ts` | NEW | The 8 engine layers per `01_LAND_USE_ENGINES.md`. |
| `src/lib/feasibilityDb.ts` | NEW | `CostPreset` lookup, source-attribution helpers. |
| `src/components/Tooltip.tsx` | NEW | Reusable tooltip (per §2). |
| `src/components/DiffBadge.tsx` | NEW | Colour-coded diff badge (per §3). |
| `prisma/schema.prisma` | EXTEND (Phase B) | Add `CostMaterial`, `CostMaterialVersion`, `CostMaterialScope`, `CostPreset`, `QuarterlySnapshot`, `SavedFeasibility` models per `02_CONSTRUCTION_COST_DATABASE.md` §2. |

---

## §99 FOUNDER RATIFY items in this file

| # | Section | Item | Ask |
|---|---|---|---|
| UX-1 | §1.4 | RTL Arabic translations of UI labels + formula notation | translate or designate translator |
| UX-2 | §1.4 | Eastern Arabic numerals option default state (off) | confirm |
| UX-3 | §2.3 | Tooltip body text for ~70 fields (plain language + formula context + source + UAE note) | author or delegate; ~1-day sprint |
| UX-4 | §3.2 | Diff badge threshold tones (green ≤15 %, amber 15–30, red 50 +) | confirm exact percentage cutoffs |
| UX-5 | §4.3 | `SavedFeasibility` Prisma model shape | sign off |
| UX-6 | §5.2 | Accessibility upgrades — confirm Phase B includes all 10 items | confirm |
| UX-7 | §6 | Motion timings — 150-300 ms per Style Guide; agree no exceptions for v6.0 | confirm |
| UX-8 | §7 | "Refuse to generate PDF until 5 fields populated" — exact threshold | confirm 5 or different |
| UX-9 | §8.2 | Phase B build estimate — components + routes | provide hour estimate (see delivery summary) |

---

*End of UX spec. Next: `04_DISTRIBUTION_LEGAL_MOAT.md`.*
