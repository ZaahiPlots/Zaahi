---
paths:
  - "src/**/*.tsx"
---

# UI STYLE GUIDE — MANDATORY FOR ALL COMPONENTS

The single visual language of the ZAAHI platform. The landing page (`src/app/page.tsx`) is
the reference. Any new component must look like part of the landing page.

**Aesthetic:** Apple-like glassmorphism over a dark navigation backdrop. High contrast for numbers and actions, minimal chrome, smooth transitions.

### Mandatory elements

**Cards / panels:**
- `background: rgba(10, 22, 40, 0.85)` (semi-transparent navy) — **raised from 0.4
  by founder decision D-20, 2026-09-04.** Text contrast measured over the map:
  at 0.4 the gold figure (`#C8A96E`) over a light backdrop gave **1.45** —
  the NET PROFIT figure was unreadable (bug PART 4, item 3). At 0.85 — **5.36**
  (gold) and **10.67** (text `#f5f1e8`). Blur does not solve the problem: blurring
  a light map leaves it light.
  Source of truth in code: `PANEL_BG` in `src/lib/design-tokens.ts`
- `backdrop-filter: blur(16px)` (glassmorphism — `backdrop-blur-xl` in Tailwind)
- `border: 1px solid rgba(255, 255, 255, 0.1)` (barely visible outline)
- `border-radius: 12px`
- Soft shadow: `box-shadow: 0 6px 20px rgba(0,0,0,0.2)`
- On light contexts (dashboard in light mode) — replace navy with `rgba(255,255,255,0.6)` with the same blur

**Buttons:**
- Background: `rgba(10, 22, 40, 0.92)` over the map (`CHROME_BTN_BG`) — **raised
  from `rgba(0,0,0,0.35)` by founder decision D-20, 2026-09-04.** Requirement:
  the background must not depend on the backdrop, contrast ≥ 4.5 over both.
  Measured: at 0.35 text over the light map gave **2.20**, over the dark — 13.89
  (spread 11.69). At 0.92 — **13.25 / 15.85** (spread 2.60), gold
  **6.65 / 7.96**. On the dark background of panels — `rgba(255,255,255,0.06)`
- Border: `1px solid rgba(200, 169, 110, 0.3)` (gold tint)
- `color: #C8A96E` (gold text/icons)
- Hover: `background: rgba(200, 169, 110, 0.25)`, `border-color: #C8A96E`
- Transition: `all 150ms ease` — not `transition: all`, specify concrete properties (`border-color, background, transform`)
- No native browser styles

**Inputs / selects:**
- Background: `rgba(255, 255, 255, 0.04)` (barely noticeable)
- Border: `1px solid rgba(255, 255, 255, 0.1)`
- Focus: `border-color: #C8A96E`, `outline: none`
- Typography: inherit from the parent, not the system default
- Never use browser default `<input>` elements that look different on iOS/Android/desktop

**Sliders:**
- `accent-color: #C8A96E` (gold thumb)
- Track: `rgba(255, 255, 255, 0.1)`
- Smooth drag — not step-by-step

**Animations:**
- `ease-in-out` or `cubic-bezier(0.4, 0, 0.2, 1)`
- Duration: 150-300ms (no more)
- Smooth `fade-in`, `slide-in`, `scale` — not abrupt toggles
- Prefer `transform` and `opacity` (GPU-accelerated) over `width/height/top/left`

**Numbers / amounts:**
- Large: `font-weight: 800`, `font-size: 22-32px`, `letter-spacing: -0.02em`
- Thousands separator: `toLocaleString("en-US")` or `.toFixed()` + regex for commas
- AED prefix: a separate smaller span with `opacity: 0.6`
- Never render raw bigint/number without formatting

**Icons:**
- Inline SVG or unicode characters (◯ ⌄ × ↓)
- Minimalist, monochrome, thin stroke
- Gold (#C8A96E) or textDim depending on context
- No emoji in production UI (except landing/dashboard hero elements where appropriate)

**Typography:**
- Georgia serif for headings (H1, H2, H3)
- `-apple-system, Segoe UI, Roboto, sans-serif` for body
- `letter-spacing: 0.04-0.08em` for section labels ("TOTAL REVENUE")
- `text-transform: uppercase` for category/status
- Size scale: 9 (micro), 10 (small label), 11 (label), 12 (body), 14 (emphasized), 18-32 (numbers/titles)

### ZAAHI palette (unified)

| Name | Hex | Usage |
|---|---|---|
| GOLD | `#C8A96E` | Accent, hover, CTAs, active state |
| NAVY | `#1A1A2E` | Primary text, dark background |
| TEAL | `#1B4965` | Secondary accent (Total Investment, teal hover) |
| GREEN | `#2D6A4F` | Profitable, positive, PAID |
| RED | `#E63946` | Loss, negative, REVERSED |
| AMBER | `#E67E22` | Marginal, pending, warnings |
| SUBTLE | `#6B7280` | Secondary text, labels |
| LINE | `#E5E7EB` | Border subtle |
| BG | `#FAFAF9` | Light background |

**Do not use:** pure black `#000`, pure white `#FFF` on large surfaces, neutral gray `#888` (use `#6B7280`).

### Checklist for every new component

Before commit, check:
- [ ] Cards have `backdrop-filter: blur(16px)` + a semi-transparent background
- [ ] Buttons are semi-transparent with gold hover + border transition 150ms
- [ ] Inputs do not look like browser default (custom border, padding, focus)
- [ ] Numbers are formatted (AED prefix, thousands separator, bold, correct size)
- [ ] Section headings are Georgia serif, uppercase, letter-spaced
- [ ] No abrupt appearances/disappearances — smooth ease-in-out transitions
- [ ] Colors from the palette above — no custom hex
- [ ] Minimalist icons, not emoji (except dashboard hero)
- [ ] Responsive: works at 320px (mobile) and 1440px (desktop)

### Reference examples in code

- **Landing page:** `src/app/page.tsx` — the primary reference
- **SidePanel over the map:** glassmorphism navy (transparent blur)
- **Map HeaderBar:** transparent, gold icons, gold hover
- **Map buttons (ChromeBtn):** see `src/app/parcels/map/page.tsx` — `rgba(10,22,40,0.4)` bg, gold border, hover background change
- **Dashboard cards (profile/deals):** white version of glassmorphism on a light background

### What is forbidden

- ❌ Browser default styles for `<input>` / `<button>` / `<select>`
- ❌ Bright plain colors (`#FF0000`, `#00FF00`) — only from the palette
- ❌ `transition: all` — always concrete properties
- ❌ Abrupt `display: none` → `display: block` toggles — use opacity/transform + animation
- ❌ Emoji instead of icons in action buttons
- ❌ Native `<select>` dropdown with system chrome — customize the appearance
- ❌ Different styles in different parts of the UI — consistency matters more than variety

When in doubt — open `src/app/page.tsx` and copy the style from there.
