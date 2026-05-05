# Feasibility Style Guide — Grounded in zaahi.io Design System

**Status:** DRAFT v1.0 · 2026-04-22
**Scope:** Visual + functional language for the Feasibility Calculator only. Governs `src/app/parcels/map/FeasibilityCalculator.tsx` (existing, 1001 lines) and any future Feasibility UI surface (`/admin/feasibility`, `/parcels/[id]` widget, PDF output).
**Source authority:** `src/app/globals.css` (founder-spec 2026-04-16 design tokens) · existing `FeasibilityCalculator.tsx` · `src/app/page.tsx` landing · `src/app/join/page.tsx` · CLAUDE.md UI Style Guide section.
**Audience:** Zhan (primary). When the §04 spec goes to v3/v4, this document is the visual contract.
**Classification:** CONFIDENTIAL — internal

---

## §0 Critical context — existing Feasibility component

There is already a **1001-line `FeasibilityCalculator.tsx`** in production at `src/app/parcels/map/FeasibilityCalculator.tsx`. Header comment: *"ZAAHI FEASIBILITY CALCULATOR v5.0 · Three tabs: BUILD-TO-SELL · BUILD-TO-RENT · JOINT VENTURE · BUA-based construction · SFA-based revenue · land payment plans. Number inputs only (no sliders). Flat glassmorphism — no nested cards."*

This means Spec 04 is **not a greenfield build**. It is:
- An extension layer (IRR + ±20 % sensitivity + PDF export) wrapping existing v5 formulas.
- A UI polish pass (move from `SidePanel`-embedded mode to a full `/admin/feasibility` route).
- A scenario CRUD layer (save/load/rename).

Every style decision below flows from what already exists — the Style Guide documents the established language, it does not invent one.

---

## §1 Design tokens (CSS custom properties)

Defined in `src/app/globals.css` lines 33-80. All Feasibility components **must** consume these, not hardcoded hex.

### 1.1 Brand core (never change — founder lock)

```css
--gold-primary: #C8A96E;      /* brand gold — every accent, hover, border */
--gold-text: #e8d5a8;         /* warmer gold for body emphasis */
```

### 1.2 Glass backgrounds

```css
--glass-bg: rgba(10, 22, 40, 0.5);      /* primary card backdrop */
--glass-bg-deep: rgba(10, 22, 40, 0.85); /* sticky headers, dropdowns */
--glass-bg-hover: rgba(10, 22, 40, 0.6);
```

### 1.3 Glass borders (gold-tinted — the signature detail)

```css
--glass-border: 1px solid rgba(200, 169, 110, 0.15);         /* default */
--glass-border-hover: 1px solid rgba(200, 169, 110, 0.25);
--glass-border-active: 1px solid rgba(200, 169, 110, 0.4);

--glass-border-color: rgba(200, 169, 110, 0.15);             /* raw for composition */
--glass-border-color-hover: rgba(200, 169, 110, 0.25);
--glass-border-color-active: rgba(200, 169, 110, 0.4);
```

### 1.4 Elevation (3 levels + hover)

```css
--glass-shadow:       0 12px 32px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255,255,255,0.1);
--glass-shadow-sm:    0 8px 20px rgba(0, 0, 0, 0.3),  inset 0 1px 0 rgba(255,255,255,0.08);
--glass-shadow-lg:    0 20px 48px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255,255,255,0.12);
--glass-shadow-hover: 0 16px 40px rgba(0, 0, 0, 0.45), inset 0 1px 0 rgba(255,255,255,0.12);
```

### 1.5 Blur (luxury frosted-glass feel)

```css
--glass-blur:    blur(24px) saturate(150%);    /* standard */
--glass-blur-lg: blur(32px) saturate(160%);    /* heavy cards / modals */
```

### 1.6 Radius scale

```css
--radius-sm: 8px;   /* inputs, small chips */
--radius-md: 12px;  /* buttons, tabs */
--radius-lg: 14px;  /* cards (primary) */
--radius-xl: 16px;  /* modals */
```

### 1.7 Warm text palette (NOT cold white — this is a brand signal)

```css
--text-primary:   #f5f1e8;                        /* warm off-white */
--text-secondary: rgba(245, 241, 232, 0.55);      /* body secondary */
--text-muted:     rgba(245, 241, 232, 0.4);       /* disabled / placeholder */
--text-gold:      #e8d5a8;                        /* emphasis */
--text-gold-label: rgba(200, 169, 110, 0.8);      /* uppercase labels */
```

### 1.8 Gold accents (soft backgrounds)

```css
--gold-bg-soft:   rgba(200, 169, 110, 0.08);  /* passive gold wash */
--gold-bg-hover:  rgba(200, 169, 110, 0.15);
--gold-bg-active: rgba(200, 169, 110, 0.25);
```

---

## §2 Typography scale

### 2.1 Font families

```css
/* Body + UI (default inherit) */
font-family: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;

/* Headings, logo, section titles */
font-family: Georgia, "Times New Roman", serif;
```

**Rule:** Georgia serif is for ZAAHI brand moments (logo, section titles, PDF headers). Body UI uses system fonts for speed + platform-native feel.

### 2.2 Scale (grounded in FeasibilityCalculator.tsx + landing page)

| Size | Usage | Example |
|---:|---|---|
| 9-10 px | Micro-label, unit suffix ("AED / sqft") | `<span style={{ fontSize: 10, letterSpacing: 0.5 }}>AED</span>` |
| 11 px | Uppercase label, section heading | `zaahi-label` class · `<Section>` title |
| 12 px | Body secondary, table rows | `<ResultRow>` standard value |
| 13 px | Body primary, inputs | `<NumberInput>` value |
| 14 px | Emphasised body, button | `.zaahi-btn-primary` |
| 18-22 px | Hero number, panel title | `<ResultRow hero>` final IRR / ROI |
| 32-44 px | Brand moments (logo, landing hero) | ZAAHI logotype |

### 2.3 Letter-spacing

- Labels / micro-labels: `0.08em` to `0.30em` (more spacing = more uppercase-like formality)
- Brand logo: `0.18em`
- Button labels: `0.12em`
- Numbers (hero): `-0.02em` (tighter for big numbers)

### 2.4 `font-variant-numeric` rule

All currency / percentage / integer values use `tabular-nums` for aligned decimal columns:

```css
fontVariantNumeric: "tabular-nums"
```

This is non-negotiable — it's in `<ResultRow>` line 162 of existing FeasibilityCalculator.

### 2.5 Weights

- 300 — ZAAHI logo (thin, elegant)
- 400 — body default
- 500 — buttons
- 600 — emphasis inline
- 700 — section titles, hover emphasis, bold values
- 800 — hero numbers

---

## §3 Color palette (hex + usage)

### 3.1 Core palette constants (export from `src/lib/constants.ts` or re-declare per component)

```typescript
// Existing in FeasibilityCalculator.tsx + join/page.tsx — harmonise into a shared const
export const COLORS = {
  GOLD:        "#C8A96E",  // brand primary
  GOLD_BRIGHT: "#E8C77A",  // brighter variant (join page)
  GOLD_TEXT:   "#e8d5a8",  // body emphasis
  NAVY:        "#1A1A2E",  // dark stone — deepest surface
  TEAL:        "#1B4965",  // secondary accent (Investment cards)
  TXT:         "#f5f1e8",  // warm off-white primary text
  DIM:         "rgba(245, 241, 232, 0.70)",
  SUBTLE:      "rgba(245, 241, 232, 0.55)",
  MUTED:       "rgba(245, 241, 232, 0.40)",
  LINE:        "rgba(200, 169, 110, 0.15)",  // gold-tinted default border
  GREEN:       "#2D6A4F",  // profitable / approved (join page)
  GREEN_BRIGHT:"#4CAF50",  // positive delta (Feasibility — verdict "strong")
  RED:         "#E63946",  // loss / danger
  AMBER:       "#E67E22",  // marginal / caution
  GRAY:        "#888888",  // neutral / placeholder
};
```

### 3.2 Semantic tokens (which hex for which meaning)

| Token | Hex | Semantic role |
|---|---|---|
| GOLD | `#C8A96E` | accent · CTA · active state · brand |
| NAVY | `#1A1A2E` | darkest surface · overlay base |
| TEAL | `#1B4965` | Total Investment card · secondary emphasis |
| TXT | `#f5f1e8` | primary text (NEVER pure white `#FFFFFF`) |
| DIM | rgba warm 70 % | body secondary |
| SUBTLE | rgba warm 55 % | tertiary, units |
| LINE | rgba gold 15 % | default card/input border |
| GREEN / GREEN_BRIGHT | `#2D6A4F` / `#4CAF50` | profitable · approved · verdict "strong" |
| RED | `#E63946` | loss · danger · below-target verdict |
| AMBER | `#E67E22` | marginal · caution · pending |

### 3.3 Forbidden colours (per CLAUDE.md + existing codebase)

- ❌ Pure black `#000000` on large surfaces (use NAVY `#1A1A2E`)
- ❌ Pure white `#FFFFFF` on body text (use TXT `#f5f1e8`)
- ❌ Neutral grey `#888` on body text (use SUBTLE `rgba(245, 241, 232, 0.55)`)
- ❌ Random Tailwind utility colors (`blue-500`, `gray-700`) — **not in zaahi.io palette**
- ❌ Custom hex not in this palette without founder approval

---

## §4 Component inventory — what exists that Feasibility should reuse

### 4.1 Utility CSS classes (globals.css)

| Class | Effect | Example use |
|---|---|---|
| `.zaahi-glass` | Primary glass card (bg + blur + border + shadow + radius-lg) | Feasibility panel container |
| `.zaahi-glass-deep` | Denser glass (for sticky headers, dropdowns) | Tab bar, modal backdrop |
| `.zaahi-label` | Uppercase gold micro-label (10 px, 0.22em tracking, Georgia serif 700) | Section title pre-line |
| `.zaahi-btn-primary` | Gold CTA button (rgba 20 % gold bg, 40 % border, uppercase 11 px) | "Export PDF" button |
| `.zaahi-btn-secondary` | Ghost button (glass bg + border) | "Reset", "Cancel" |

### 4.2 Inline-component patterns from existing FeasibilityCalculator

These are **already written and battle-tested**. Feasibility v2+ must reuse, not re-invent:

| Component | Location | Role |
|---|---|---|
| `NumberInput` | lines 62-131 | Number input with thousand-sep, focus gold border, placeholder, units, read-only variant |
| `Row` | lines 134-148 | `<label>[hint]<input/></label>` horizontal line-item; 7px vertical padding + 1px gold-tinted bottom border |
| `ResultRow` | lines 151-165 | Label-left / value-right result display with hero / bold / gold / dim variants |
| `Section` | lines 168-204 | Collapsible section with Georgia-serif gold title + ▾ / ▸ indicator |
| `mapCategoryToDefaults` | lines 208-223 | Land-use → sensible cost / sales / rent defaults by category |
| `useDebounced<T>` | lines 52-59 | 300 ms debounce hook for live-update calcs |

### 4.3 Tab pattern (from existing FeasibilityCalculator + inferred)

```typescript
type Tab = "bts" | "btr" | "jv";
const [tab, setTab] = useState<Tab>("bts");
// Render tab strip with GOLD active + LINE inactive; each tab shows its own Section tree
```

v3+ adds: `| "compare" | "sensitivity-detail" | "monte-carlo"`.

### 4.4 Other existing components to be aware of

- `AuthGuard` (`src/components/AuthGuard.tsx`) — wrap any protected Feasibility route.
- `CatChat` (`src/components/CatChat.tsx`) — Archibald AI helper (may later surface in Feasibility for explanations).
- `DealTimeline` (`src/components/DealTimeline.tsx`) — 28-line; Spec 01 reference but also shows timeline pattern applicable to multi-year cash flow viz.
- `ParcelCard` (`src/components/ParcelCard.tsx`) — 28-line mini card pattern for "pick a parcel" browser.
- `CookieConsent` — global, no need to touch.

---

## §5 Motion / interaction patterns

### 5.1 Transition timings

```typescript
// existing tokens — match everywhere
transition: "all 150ms ease"                         // inputs (focus)
transition: "background 200ms ease-out, border-color 200ms ease-out, transform 200ms ease-out"  // buttons
transition: "border-color 150ms ease, background 150ms ease"  // NumberInput focus
```

**Rule:** never `transition: all` unconstrained (CLAUDE.md forbids). Enumerate properties explicitly. 150-200 ms is the window.

### 5.2 Hover effects

- **Cards:** background tone shifts ~10 % (e.g., `--glass-bg` → `--glass-bg-hover`) + border saturates (`0.15` → `0.25`).
- **Buttons:** gold saturates (`0.2` → `0.3`), border saturates (`0.4` → `0.6`), `translateY(-2px)` lift.
- **Inputs:** on focus, border flips from LINE to GOLD; transition 150 ms.
- **Links:** gold underline appears (or background tint for pill links).

### 5.3 Active / pressed states

```css
/* Buttons active state — mild press-down */
transform: translateY(0) scale(0.98);
transition-duration: 100ms;
```

### 5.4 Loading states

Grounded in existing admin layout pattern:

```tsx
// "minimal glass spinner so the admin UI never flashes before auth is proven" — admin/layout.tsx
<div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
  <div className="zaahi-glass" style={{ padding: 24, color: "var(--gold-text)" }}>
    Loading…
  </div>
</div>
```

Feasibility compute endpoint should show spinner inline on results panel (not modal) during Monte Carlo runs.

### 5.5 Animation philosophy

- Subtle over flashy. Dymo is in client meetings — flashes look unserious.
- GPU-friendly only: `transform` + `opacity`. Avoid animating `width` / `height` / `top` / `left` (CLAUDE.md rule).
- Page transitions: none by default (let Next.js handle).
- Page reveals: inline `@keyframes zaahiBannerSlide` pattern from landing — see `src/app/page.tsx` lines 148-158. Feasibility result reveal uses a similar 400 ms `fadeInUp` or `opacity 0→1` over 300 ms.

---

## §6 Brand identity cheatsheet

### 6.1 Logo usage

```tsx
<div style={{
  fontFamily: 'Georgia, serif',
  fontSize: 44,               // scale to context: 24 in navbar, 44 in hero
  fontWeight: 300,             // thin weight is intentional
  letterSpacing: '0.18em',
  color: '#C8A96E',            // GOLD
  lineHeight: 1,
}}>ZAAHI</div>
<div style={{
  marginTop: 10,
  fontSize: 11,
  letterSpacing: '0.2em',
  color: 'rgba(255,255,255,0.5)',
  textTransform: 'uppercase',
}}>Real Estate OS</div>
```

Same treatment on PDF header — Georgia serif 36-44 px gold + uppercase tagline.

### 6.2 Anno-1800 / Arabian-gold + dark-stone aesthetic

The codebase **does not** have literal Anno-1800 ornamental framing (carved borders, heraldry). It expresses the aesthetic through:
- **Dark stone surface** — navy backgrounds with 85 % opacity frosted glass.
- **Arabian gold** — `#C8A96E` accent throughout (border, CTA, active state).
- **Warm parchment text** — `#f5f1e8` off-white, never pure white.
- **Serif for formal moments** — Georgia for logo + section titles + PDF headers.
- **Uppercase formal labels** — 0.22em tracking evokes engraved plaques.

Feasibility output — **especially PDF** — should feel like a curated gallery artefact: generous margins, carefully placed Georgia serif headers, gold rule-lines between sections.

### 6.3 Decorative iconography

- SVG stars (5-pointed, see landing page line 203-205) — brand signal for Ambassador / milestone moments.
- Arrow glyphs (`→`, `▾`, `▸`) — minimal chevrons, never elaborate.
- No emoji in production UI (CLAUDE.md rule) — exception for rare landing hero moments only.

### 6.4 Signature details for PDF output

- Gold 2-pt rule line under each section header.
- ZAAHI logotype top-left on every page.
- Page number + "Feasibility Analysis · <Plot #> · <Date UAE>" footer in SUBTLE color.
- Branded verdict badge (Strong / Moderate / Below) in section-specific colour.
- QR code in bottom-right linking to parcel / scenario (uses existing `qrcode` npm library, already installed).

### 6.5 "Game feel" — does it apply?

- Dymo's client meeting is not a game. **Game feel manifests only as**: confident snappy feedback (150 ms), satisfying tick ("mark paid" flip), progress indicator on Monte Carlo runs. No bouncy physics, no particles.

---

## §7 Accessibility defaults

### 7.1 Current state — honest assessment

The existing FeasibilityCalculator (1001 lines) has **limited explicit accessibility**:
- No `aria-label` on `<NumberInput>` containers (implicit label via surrounding Row).
- `<Section>` collapsible uses `<button>` with no `aria-expanded`.
- Tab bar pattern (inferred) — no `role="tablist"` / `role="tab"` / `aria-selected`.
- Contrast: warm text on navy generally meets WCAG AA at 14 px+, but 11 px labels at `rgba 0.55` on `rgba(10, 22, 40, 0.5)` measure ~3.8:1 — **below WCAG AA 4.5:1** for small text.

### 7.2 Required upgrades for v2+ per Enhancement Proposal §1.A S-10b + Q-2 D §77 completeness

- `<Section>` → `<button aria-expanded={isOpen} aria-controls={panelId}>` + `<div id={panelId} role="region">`.
- Tab bar → `role="tablist"` container, tabs `role="tab" aria-selected={tab === 'bts'}`.
- `<NumberInput>` → wrapper has `<label htmlFor>` association.
- IRR "n/a" state → `aria-live="polite"` announcement.
- "Download PDF" button → visible focus ring (gold 2px outline-offset: 2px).
- Keyboard escape closes any modal; tab loop stays within modal.
- Colour contrast: label minimum `rgba(245, 241, 232, 0.70)` (DIM) on navy meets 4.5:1 — use this for all 11 px labels.

### 7.3 Screen-reader patterns

- Every interactive element gets `aria-label` or `<label>`.
- Dynamic result updates use `aria-live="polite"` on results panel.
- PDF download state: "Generating PDF, please wait…" → "PDF ready, starting download." both announced.

### 7.4 Focus management

- Gold focus ring (2 px, offset 2 px) on every focusable element.
- Skip-to-content link at top of `/admin/feasibility`.
- Modal focus trap + return-focus to trigger on close.

---

## §8 Breakpoints — mobile / tablet / desktop

### 8.1 Breakpoints used in existing code

Landing page line 155-158:
```css
@media (max-width: 520px) { /* mobile */ }
```

This is the **only formal breakpoint** in the landing code. Other responsiveness is via flex / max-width / clamp.

### 8.2 Feasibility-specific breakpoints (recommendation, not yet coded)

| Breakpoint | Width | Target device | Layout |
|---|---|---|---|
| Mobile | < 600 px | phones (fallback) | stacked, single column, inputs full-width |
| Tablet | 600-1024 px | iPad (**Dymo primary**) | 2-column: inputs left 45 %, results right 55 % |
| Desktop | 1024+ px | laptop / monitor | 2-column preserved, possibly 3-column (inputs / results / chart sidebar) at 1440+ |

### 8.3 iPad-first discipline

Dymo uses iPad at client meetings (per Spec 04 §5.3). This means:
- Touch targets minimum 44 × 44 px (Apple HIG).
- `<NumberInput>` padding must accommodate tap (existing "6px 10px" + min-width 120 is borderline — increase tablet padding to 10px 14px).
- Landscape orientation optimised.
- No hover-only interactions (everything touchable).
- Font-size 13 px is OK at iPad viewing distance but below on phones.

### 8.4 PDF export breakpoint

PDF is rendered at A4 landscape 297 × 210 mm, or A4 portrait 210 × 297 mm. Existing `jsPDF` library (installed v4.2.1) handles both. Content must fit — wide tables in portrait mean scroll, not ideal.

---

## §9 RTL + multilingual considerations

### 9.1 Current state — honest assessment

**No RTL support exists in the codebase.** `src/app/layout.tsx` hardcodes `<html lang="en">`. Globals.css has zero `[dir="rtl"]` rules. FeasibilityCalculator's inline styles use `flex-direction: row` without logical equivalents. AR labels are not present.

### 9.2 Required work for v2+ Arabic PDF export (per Spec 04 §8.4)

**Phase 1 MVP (minimum viable Arabic):**
1. Translate ~80 static labels (AED, sqft, ROI, IRR, "Build-to-Sell", section titles, verdict text).
2. Store translations in `src/lib/feasibility-i18n.ts` as `{ en: {...}, ar: {...}, ru: {...} }` object.
3. PDF output only — UI stays EN for v1 (Dymo + Zhan speak English).
4. Arabic PDF: wrap document body in `dir="rtl"` · use `xxx-arabic.ttf` font embedded in jsPDF (Noto Sans Arabic or Amiri).
5. Numbers stay LTR Western in Arabic section (per Spec 04 convention).

**v3+ full RTL UI:**
1. Add `dir="rtl"` at root when language === "ar".
2. Replace `flex-direction: row` with `flex-direction: row-reverse` or use logical properties (`inline-start`, `inline-end`).
3. Replace `marginLeft` / `marginRight` with `marginInlineStart` / `marginInlineEnd`.
4. Mirror arrow glyphs (`→` becomes `←` in AR).
5. Test with Dymo native-speaking client before promoting to production.

### 9.3 Translation coverage plan

| Language | Phase | Coverage |
|---|---|---|
| **EN** | v1 | 100 % UI + PDF |
| **AR** | v1 | PDF only (~80 labels) |
| **RU** | v1 | PDF only (~80 labels) — Dymo's HNWI pipeline |
| **UK** | v3 | Extend RU infrastructure |
| **SQ / FR** | v4 | Full RTL-aware UI + PDF |

### 9.4 Font embedding for Arabic PDF

`jsPDF` requires manual TTF load. Recommendation:
- **Amiri Regular** (open-source, optimised for print) for body.
- **Tajawal** or **IBM Plex Sans Arabic** for headings.
- Both free / SIL licence / commercial-compatible.
- Store in `public/fonts/` and load at PDF render time.

---

## §10 Tech stack specifics

### 10.1 What's in the stack

- **Tailwind v4** — no `tailwind.config.ts`; config is in `@import` + CSS custom properties (globals.css).
- **React 19** + **Next.js 15.3**.
- **Zod v4** for validation.
- **jsPDF v4.2.1** for PDF (NOT Puppeteer — correction to Spec 04 §5.5 / §6.3 which assumed Puppeteer). jsPDF runs client-side; simpler, no server Puppeteer setup.
- **qrcode v1.5.4** for QR code generation.
- **Supabase JS** + **Prisma v7.7**.
- **MapLibre GL** + **Three.js / R3F** for maps and 3D.

### 10.2 What's **NOT** in the stack

- ❌ No shadcn/ui (every component inline / custom).
- ❌ No framer-motion (animations are CSS keyframes inline).
- ❌ No headless-ui.
- ❌ No react-query / tanstack-query (add if needed, not present).
- ❌ No date-fns / dayjs (add if needed — Feasibility needs date math).
- ❌ No recharts / d3 / react-financial-charts (add for sensitivity chart + Monte Carlo viz).
- ❌ No xlsx.js (add for Excel export when v3 ships).
- ❌ No Puppeteer (jsPDF already installed; favour it).

### 10.3 Library additions recommended for Feasibility v3

| Library | Purpose | Size | Licence |
|---|---|---|---|
| `recharts` | Sensitivity tornado / Monte Carlo histograms | ~95 KB gzip | MIT |
| `xlsx-js-style` | Excel export with styling | ~400 KB | Apache 2.0 |
| `date-fns` | IRR period / date math | ~20 KB | MIT |
| `@tanstack/react-query` | Scenario list caching | ~35 KB | MIT |

**All free. Total bundle growth ~550 KB for v3.** Tree-shakeable. Current landing is already ~1.2 MB (MapLibre + R3F heavy).

### 10.4 Spec 04 correction — jsPDF over Puppeteer

Spec 04 §5.5 / §6.3 assumed Puppeteer-based PDF generation (reusing `src/lib/generate-site-plan-pdf.ts` pattern).

**Reality:** `jsPDF` is already in `package.json` dependencies and already imported in `FeasibilityCalculator.tsx` line 3. Feasibility v2+ should extend the existing jsPDF usage rather than introduce Puppeteer.

**Trade-off:**
- jsPDF: client-side, fast, no server footprint. Arabic TTF must be bundled.
- Puppeteer: server-side, consistent rendering, heavier setup.

Stick with jsPDF. Simpler.

---

## Gaps identified in existing design system

**These are honest findings, not criticism:**

1. **`src/components/Navbar.tsx`** is a 16-line Tailwind stub not matching the landing design. Actual navigation is inline on `src/app/page.tsx`. Feasibility should NOT use `Navbar.tsx` — it's a placeholder.
2. **No formal component library.** Each page owns its own styles inline. This is manageable at current scale but will drift as Feasibility grows. Consider extracting `NumberInput`, `Row`, `ResultRow`, `Section` from `FeasibilityCalculator.tsx` to `src/components/ui/` for reuse (not urgent, but worth flagging).
3. **Accessibility incomplete.** Tab bars, collapsible sections, and number inputs lack ARIA attributes. Small-text contrast at 55 % opacity may fail WCAG AA. Enhancement Proposal §1.A S-10b requires fix by Month 9.
4. **No RTL foundation.** `<html dir>` is hardcoded EN. Arabic support requires retrofit at language-toggle time — scope non-trivial.
5. **Mobile breakpoint only 520 px.** Feasibility should introduce tablet (600-1024 px) and desktop (1024 px+) explicitly for iPad-first workflow.
6. **Design tokens partially migrated.** `--glass-bg` etc. defined in globals.css but many components (including FeasibilityCalculator) still use raw `rgba(...)`. Long-term migrate to `var(--glass-bg)` everywhere; short-term match values.
7. **Puppeteer vs jsPDF inconsistency** between Spec 04 assumption and actual stack — see §10.4.
8. **No testing infrastructure visible** for UI (no Jest / Vitest / Playwright in `package.json`). Spec 04 §7.2 E2E tests assume Playwright — founder should approve adding it (~300 KB dev dep).

---

## Screenshots Zhan should capture (for future reference)

Take these today and archive in `docs/screenshots/phase-1-style-baseline/`:

1. `landing-auth-card.png` — `src/app/page.tsx` rendered at 1440 × 900 desktop.
2. `landing-mobile-520.png` — same, viewport width 520 px.
3. `join-page-hero.png` — `/join` landing full height.
4. `join-payment-modal.png` — modal open with QR code.
5. `admin-loading-state.png` — `/admin/ambassadors` during auth probe.
6. `admin-ambassadors-list.png` — `/admin/ambassadors` list + detail modal open.
7. `parcels-map.png` — `/parcels/map` with SidePanel open.
8. `parcels-map-feasibility.png` — `FeasibilityCalculator` opened in SidePanel, all 3 tabs.
9. `dashboard.png` — `/dashboard` full view.
10. `feasibility-pdf-export.png` — existing jsPDF output (if any triggered).

These are the **visual contract** against which Feasibility v2+ is measured. Any new component should match the look of these baseline captures.

---

## Summary — compact cheatsheet for Zhan

- **Gold:** `#C8A96E` · **Warm off-white:** `#f5f1e8` · **Navy:** `#1A1A2E` · **Line:** `rgba(200, 169, 110, 0.15)`
- **Radius:** 8 inputs · 12 buttons · 14 cards · 16 modals
- **Blur:** 24 px + saturate 150 %
- **Font:** system-ui body · Georgia serif brand
- **Transitions:** 150-200 ms · explicit properties, never `all`
- **Numbers:** `fontVariantNumeric: "tabular-nums"` always
- **No:** pure white / pure black / Tailwind colors / emoji in buttons / shadcn / framer-motion
- **Reuse:** `NumberInput` · `Row` · `ResultRow` · `Section` from existing `FeasibilityCalculator.tsx` lines 62-204
- **PDF:** jsPDF v4.2.1 (already installed) · Arabic = Amiri TTF bundled
- **iPad-first** for Dymo client meetings
- **Accessibility:** add ARIA during v2+ build, not retrofit later
- **Test against baseline screenshots** before every PR

---

**End of FEASIBILITY_STYLE_GUIDE.md.**

Companion documents: `04-FEASIBILITY_CALC_V2_SPEC.md` (tactical MVP) · `MASTER_TREE_ENHANCEMENT_PROPOSAL.md` §1.C AU-2 (strategic commitment) · `CLAUDE.md` UI Style Guide (master rules).

Next step — awaiting founder approval on Framework Architecture approach (Q1-Q3 from previous analysis).
