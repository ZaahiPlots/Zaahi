# Site Plan PDF v2 — General Notes Explanations + 2D Locator Map

**Status:** RESEARCH / DESIGN — Phase A. No production code touched.
**Branch:** `research/site-plan-v2`
**Date drafted:** 2026-05-24
**Author note:** This is a design document. Phase B (implementation)
proceeds only after founder sign-off below.

---

## Why this exists

Our Site Plan PDF (current generator: `src/lib/generate-site-plan-pdf.ts`)
is positioned as the platform's answer to a DDA affection plan, with
two things DDA does not have: a 3D extrusion of the building envelope,
and toggleable thematic layers. Today the PDF has two visible gaps
against the DDA reference:

1. **General Notes are pasted verbatim from DDA without any
   interpretation.** Buyers and brokers read sentences like
   *"Approved master plan is required prior to any submittals"* or
   *"Subject to obtain approval from Dubai Civil Aviation Authority
   (DCAA)"* and have no idea what that practically means for closing
   a deal or starting construction.
2. **There is no 2D vicinity/locator map.** The DDA reference plan
   shows a small black-and-white "Location Map" pane (bottom-left of
   the DDA PDF — confirmed visually against plot 9235849, Al Yalayis 3)
   so a non-resident can answer "where in Dubai is this?". Our PDF
   has the 3D parcel view (our edge) but skips the orientation map.

This document specifies both improvements as a single coordinated
change, since they share infrastructure (jsPDF layout, MiniMap canvas
capture, and `AffectionPlan.notes` rendering).

Constraints inherited from CLAUDE.md and prior memories:
- `feedback_pmtiles_verification` — no PMTiles work in this scope.
- `feedback_page_tsx_review_before_edit` — Phase B touches
  `src/app/parcels/map/page.tsx` only via a small props change to
  `<MiniMap>`. Full diff + invariants in Phase B kickoff.
- `feedback_no_credential_commands` — this design draws on the seed
  scripts and a real DDA PDF the founder shared; no live DB queries.
- Canonical files (`prisma/schema.prisma`, `src/app/page.tsx`,
  `loadZaahiPlots`, color palette) are not modified.

---

## PART 1 — General Notes with ZAAHI explanations

### 1.1 Where the notes currently render

Path: `src/lib/generate-site-plan-pdf.ts` lines ~378–382:

```ts
// NOTES (truncated if long)
if (plan?.notes && plan.notes.trim().length > 0) {
  rh('General Notes');
  rwrap(plan.notes.trim(), 10);
}
```

`plan.notes` arrives already-rewritten via `src/lib/notes-rewriter.ts`
(the API response runs the abbreviation/phrase expander). The
rewriter is purely lexical — it turns *"FAR 1.8 applicable"* into
*"the total floor area can be up to 1.8 times the plot size"* — but
it does not add explanatory context for **what regulatory category
the note belongs to** or **what action the reader should take**.

`AffectionPlan.notes` upstream comes from two sources:
1. **Live DDA scraper** (`src/lib/dda.ts`, regex `General Notes\s+(.+?)\s+Coordinates`)
   — captures the official text below the plot diagram.
2. **Hand-seeded scripts** (`scripts/seed-*.ts`) for plots outside
   DDA jurisdiction (Trakhees, Nakheel, ADM). These scripts
   concatenate ZAAHI-internal context with the official text — see
   §1.4 for the leakage problem.

### 1.2 Catalog of typical DDA / Dubai authority notes

The catalog below is derived from:
- `scripts/seed-9235849-al-yalayis-3.ts` (DDA "DUBAI 2040" wording, verbatim)
- `scripts/seed-jvc-6817016.ts` (Trakhees / DCAA wording)
- `scripts/seed-dubai-islands-1010469.ts` (PCFC / Nakheel wording)
- DLD / RERA / DDA / Dubai Civil Aviation Authority public pages
  (regulatory references, not verbatim PDF text)

Each entry: **pattern → official text (left untouched) → ZAAHI plain
explanation (appended)**. Patterns are hand-written regex; matching is
case-insensitive. If no pattern matches, the official text is shown
alone — never invent an explanation.

| # | Pattern (regex, case-insensitive) | Official DDA / authority text (example, kept verbatim in PDF) | ZAAHI explanation (appended under) | Source for explanation |
|---|---|---|---|---|
| 1 | `\bAPPROVED\s+MASTER\s+PLAN\s+IS\s+REQUIRED\s+PRIOR\s+TO\s+ANY\s+SUBMITTAL` | "APPROVED MASTER PLAN IS REQUIRED PRIOR TO ANY SUBMITTALS." | The plot sits inside a master-planned community whose overall plan has not yet been signed off by DDA. Until that happens, no individual building permit, NOC, or affection plan request will be accepted. The master developer (see "Master Developer" field) is the one who files the master plan — buyers cannot bypass this. | DDA Plot Details PDF, plot 9235849; DDA submittals workflow |
| 2 | `\bDUBAI\s+2040\s+PLAN\b` | "MASTER DEVELOPER MUST COMPLY WITH … THE DUBAI 2040 PLAN AND RELEVANT PLANNING AND SERVICE AUTHORITIES PRIOR TO MASTER PLAN APPROVAL." | The plot's permitted uses, height, and density are set by Dubai 2040 Urban Master Plan (the 20-year zoning framework, 5 urban centres + green-network rules). Future Development plots are placeholders until 2040 sub-zones are finalised — GFA/height/FAR shown as "SEE NOTES" means *not yet set*. | DDA Plot Details PDF, plot 9235849; Dubai 2040 Urban Master Plan |
| 3 | `\bsubject\s+to\s+(?:obtain\s+)?approval\s+from\s+Dubai\s+Civil\s+Aviation\s+Authority\b\|DCAA\b` | "Subject to obtain approval from Dubai Civil Aviation Authority (DCAA)." | The plot is inside an aviation height-restriction zone (typically within 6 km of DXB or DWC). Any structure above ~45 m / G+12 needs a separate NOC from DCAA before construction starts. Failing to get DCAA approval before pouring foundations is the #1 cause of stop-work orders on tall projects in West Dubai. | Trakhees affection plan (plot 6817016); UAE GCAA / DCAA NOC procedure |
| 4 | `\bTrakhees\b\|TECOM\|\bPCFC\b` | "Owner/Possessor shall follow Trakhees Regulations & Dubai Building Code … Trakhees and Master Developer's NOC/approvals shall be obtained prior starting construction." | The plot is under Trakhees jurisdiction (Ports, Customs & Free Zone Corporation), not DDA. Building permits, fire approvals, and infrastructure NOCs all go through Trakhees in Jebel Ali, NOT the DDA portal. Lead time is longer (~6–12 weeks) and the building code is the federal Dubai Building Code, with Trakhees-specific overlays for free-zone parcels. | seed-jvc-6817016 (real Trakhees note); Trakhees public permit guide |
| 5 | `\bRERA\b` | "RERA approval required prior to off-plan launch." | RERA (the Dubai real-estate regulator) must approve any sale-to-public of units before the building exists. Without RERA pre-approval the project cannot accept down-payments from buyers; Escrow accounts cannot be opened. Applies only when units are sold off-plan. | RERA off-plan approval process (Dubai Land Department) |
| 6 | `\bOqood\b` | "Plot units must be Oqood-registered." | Oqood is the off-plan unit registration system run by DLD. Every individual unit in the future building gets its own Oqood entry. Without Oqood, off-plan unit transfers cannot be DLD-recorded and the SPA is not legally enforceable. | DLD Oqood portal (`oqood.dubailand.gov.ae`) |
| 7 | `\bParking\s+ratio\b\|\b1\s*per\s+(?:unit\|bedroom)\b\|\bparking\s+(?:per\|ratio)\b` | "Parking ratio: 1.0 per residential unit + 0.2 per visitor." | This is the minimum on-plot parking the developer must build. For 100 residential units at 1.0 + 0.2 visitor = 120 spaces. Under-providing is the #1 reason plan revisions get rejected. The municipality publishes ratios per land use; check the Dubai Municipality Building Permission Manual for the latest table. | Dubai Municipality Building Regulations (parking provision tables) |
| 8 | `\bset\s*backs?\b.{0,40}\bROW\b\|\bset\s*backs?\b.{0,80}\bsides?\b` | "GF & Podium: 3 m all sides. Tower: Front & Rear 5 m, Right 5 m, Left 10 m." | These are the minimum distances the building must stand back from each side of the plot. Podium (the wide low base) usually has smaller setbacks than the tower above. The ground inside the setback stays unbuilt — landscaping, driveway, walkway — and counts against your effective buildable footprint. Tip: compare with the GFA limit; the bigger of (footprint × floors) or (FAR × plot area) wins. | seed-dubai-islands-1010469 (real Trakhees setback example); DDA Plot Details Setbacks table |
| 9 | `\bFAR\b.{0,40}\d` (already partially handled by notes-rewriter) | "FAR 2.50 applicable." | Floor-area ratio. Multiplies plot area to give the maximum total floor area allowed (sum of all floors). FAR 2.5 on a 1,000 m² plot = 2,500 m² of buildable floor area total, regardless of how tall or wide. | DDA / DLD definition (already in notes-rewriter abbreviation pass) |
| 10 | `\bSEE\s+NOTES\b` (appears in DDA tables when a value isn't set) | "Maximum GFA — SEE NOTES" | The value is not yet fixed by the authority — usually because the master plan for this community is still pending approval (see entry #1 / #2). Buyers should treat the plot as **subject to revision** for GFA/height/coverage until the master plan goes through. Do not commit to a build-volume assumption based on the affection plan alone. | DDA Plot Details PDF, plot 9235849 (literal "SEE NOTES" placeholders) |
| 11 | `\bCovered\s+area\b\|\bplot\s+coverage\b.{0,40}\d{1,3}\s*%` | "Plot coverage: GF & Podium max 70%, Tower max 55%." | Hard cap on the footprint at each level: at ground & podium, the building can occupy at most 70 % of the plot area; above the podium the tower must shrink to ≤ 55 %. Coverage is independent of FAR — both limits must be respected. | seed-dubai-islands-1010469 (real Nakheel coverage rule) |
| 12 | `\bG\s*\+\s*\d\|P\s*\+\s*G\s*\+\s*\d` (already in notes-rewriter) | "G+P+6 / 31.20 m" | Building height code: Ground floor + Podium + 6 upper floors, total cap 31.2 m. Used together with FAR to size a project envelope. | notes-rewriter abbreviation pass (line 119–132) |
| 13 | `\bFuture\s+Development\b` (Land Use entry) | "Land Use: FUTURE DEVELOPMENT" | DDA placeholder land-use class — the parcel exists on the master plan but its final land use (residential / commercial / mixed / etc.) is not yet decided. Treat the plot as raw land. ZAAHI does not render a 3D building envelope for Future Development plots, only the outline. | CLAUDE.md "Цвета по Land Use" §9; loadZaahiPlots Future Development branch |

### 1.3 PDF rendering format (proposed)

The current rendering puts everything in one block:

```
GENERAL NOTES
─────────────
Approved master plan is required prior to any submittals. Master
developer must comply with requirements...
```

New rendering keeps the official line, then under it adds a single
italic ZAAHI line in slightly smaller / lighter type — *not a
sidebar*, so layout doesn't reflow:

```
GENERAL NOTES
─────────────
Approved master plan is required prior to any submittals.
↳ ZAAHI: The plot's community master plan is still pending DDA sign-
  off. Until that's done, no building permit or NOC can be filed.

Master developer must comply with… Dubai 2040 Plan…
↳ ZAAHI: GFA / height / FAR for this plot will only be set after
  Dubai 2040 zoning is locked in for the sub-area. Treat current
  envelope numbers as placeholders.
```

Typography:
- Official line — `helvetica`, 7.5pt, dark (#333), as today.
- Explanation arrow + line — `helvetica italic`, 7pt, gray (#6B7280),
  with a leading "↳ ZAAHI:" lead. The "↳" glyph is a U+21B3
  character; jsPDF helvetica supports it without a font swap.
- Max 3 lines per explanation, hard truncate with `…` at line 3 end.

Layout impact: the Notes block is currently capped at 10 wrapped
lines via `rwrap(plan.notes.trim(), 10)`. With explanations, the cap
must rise to ~16 lines OR Notes overflow to a second page. **Decision
needed in Phase B kickoff** — recommendation is to bump to 18 lines
and shrink the right column slightly if needed (drop "Per sqft (GFA)"
from the Price block when notes are long).

### 1.4 Internal-debug-prefix filter (the "ZAAHI: …" leak)

Founder flagged a service line *"ZAAHI: land use defaulted… Override
per founder spec"* showing up in client-facing PDFs. The literal
string is not in the source tree — it lives in
`AffectionPlan.notes` rows in the DB, written by seed scripts that
concatenate ZAAHI context with the official text. Two confirmed
seeding patterns produce similar leakage:

- `scripts/seed-9235849-al-yalayis-3.ts` writes
  `` `Plot ${PLOT_NUMBER} · ${COMMUNITY} · …` + GENERAL_NOTES ``
  — the plot-id prefix is internal context bleeding into the user
  field.
- `scripts/seed-dubai-islands-1010469.ts` writes a multi-sentence
  prefix that explicitly says *"Geometry: centered rectangle
  synthesized from the affection plan…"* — an internal debug aside
  about how the geometry was produced.

**Proposed systemic filter** — runs in the PDF generator (and the
side-panel notes display, so it benefits the UI too), not in the DB.
The database keeps the raw string because it's also our internal
audit trail of "how was this plot's data assembled". The filter is
one-way (rendering only) and case-sensitive on the leading prefix:

```
const INTERNAL_PREFIXES = [
  /^ZAAHI:/,                        // explicit debug prefix
  /^Plot \d+ · /,                   // seed-script context line
  /^Geometry: /,                    // geometry-synthesis aside
  /^Master developer: .+ Owner.+/,  // seed-script identity dump
  /^Override per founder spec/,     // founder-spec note
  /^NOTE: synthetic /,              // future-proof for synthetic-data flags
];

function stripInternalLines(notes: string): string {
  return notes
    .split(/(?<=[.!?])\s+|\n/)        // split into sentences
    .filter((s) => !INTERNAL_PREFIXES.some((rx) => rx.test(s.trim())))
    .join(' ')
    .trim();
}
```

The strip runs **before** the explanation expander in Part 1.3 and
**before** `notes-rewriter` (so the rewriter doesn't waste cycles on
internal text). Applied in:

1. `src/lib/generate-site-plan-pdf.ts` — just before the Notes
   block render.
2. `src/app/api/parcels/[id]/route.ts` — applied to both `notes` and
   `notesOriginal` keys in the API response. The side-panel reads
   from there.

Open question for Phase B kickoff: should the side panel show the
internal lines to **admin** users (for audit) while hiding them from
buyers? Recommend yes — gate via the `isAdmin` probe that
`HeaderBar` already runs. Defer if it complicates the side-panel
contract.

---

## PART 2 — 2D Locator Map (and reuse for PDF)

### 2.1 Current MiniMap.tsx behaviour (read-only summary)

File: `src/app/parcels/map/MiniMap.tsx` (345 lines).
- Independent MapLibre instance, raster-only (CARTO Positron
  `light_all`), no 3D, no labels.
- `interactive: false` plus all gestures disabled in the constructor;
  click / drag handlers attached manually to translate container px
  → LngLat via `mini.unproject` → `main.flyTo`.
- **Initial view: centred at `[55.6, 24.3]`, zoom 5.9** — covers the
  entire UAE plus a bit of northern Oman. This is the "global
  navigator" framing that the founder flagged: it does not orient
  the user inside a specific district.
- Overlays:
  - Plot dots (one per ZAAHI listing) colored by land use — fetched
    once from `/api/parcels/map`.
  - Red viewport rectangle reflecting `mainMap.getBounds()`,
    redrawn on every main-map `move` + `moveend`.
- No selection state: nothing knows which parcel the side panel is
  currently showing.
- No locator-style overlays (district names, surrounding road labels,
  plot polygon highlight).
- No `preserveDrawingBuffer` — `mini.getCanvas().toDataURL()` would
  return a blank image in WebGL when called outside a render frame.

### 2.2 Locator design — what the founder asked for

Reference: the bottom-left "Location Map" pane of the DDA affection
plan, confirmed visually against plot 9235849 (Al Yalayis 3). The DDA
locator shows:
- Plot's neighbourhood at district scale (zoom equivalent ≈ 12–14).
- Simplified black-and-white road network with major road names.
- The plot itself marked clearly (filled outline).
- Surrounding community names in plain serif type
  (AL YALAYIS 1, AL HEBIAH FOURTH, MADINAT HIND 4, …).
- North arrow top-right, scale bar bottom-left.

Design for ZAAHI MiniMap rev 2 — same dock chrome, new content:

| Element | Today | Locator rev 2 |
|---|---|---|
| Centre | `[55.6, 24.3]` (UAE-wide) | Selected parcel centroid; falls back to `[55.27, 25.20]` (Dubai default) when nothing is selected |
| Zoom | 5.9 (country) | **12** when no selection, **13.5** when a parcel is selected — district scale |
| Basemap | CARTO Positron `light_all` (raster, 256 px) | **Unchanged** (founder confirmed in last session) |
| Plot polygon overlay | Dot per listing | New `GeoJSON` source carrying the selected parcel's polygon, rendered as `fill-opacity 0.45 GOLD` + `line-color GOLD line-width 2`. All other ZAAHI listings still render as small dots (same source, dot layer untouched). |
| District labels | None (relies on basemap labels) | Reuse the `district-names-src` source we built on 2026-05-24 in the main map; instantiate a separate symbol layer on the mini with `text-size: 8, text-color: #1A1A2E, text-halo-width: 1.2` so names stay legible on the smaller canvas. minzoom 11. |
| Road labels | Basemap only | Basemap only — adding a road symbol layer risks crowding the 280×160 canvas; the basemap's own labels are enough at zoom 13.5. |
| Viewport rectangle | Always on, red | Keep when **no parcel is selected** (mini behaves like the old global navigator). Hide when a parcel **is** selected — the gold plot fill + recentre serves the same purpose and red+gold competes for attention. |
| North arrow | None | Add — small inline SVG at top-right of the canvas, GOLD-stroked. 16 × 16 px. |
| Scale bar | None | Skip for now — adds clutter; bring back in v3 if PDF reviewers ask. |
| Recentre on selection change | N/A | New `selectedParcelId` + `selectedParcelGeometry` props passed from `page.tsx`. `useEffect` on prop change calls `mini.flyTo({ center: centroid, zoom: 13.5, duration: 600 })` and updates the polygon-overlay source. |

The dock chrome (open/close toggle, gridTemplateAreas, three rails,
footer cursor coords) **stays exactly as it is** — founder
confirmation 2026-05-24, only the canvas contents change.

### 2.3 Wiring into `page.tsx`

Minimal prop surface — two new props:

```ts
<MiniMap
  mainMapRef={mapRef}
  selectedParcelId={selectedParcelId}
  selectedParcelGeometry={selectedParcelGeometry}
/>
```

`selectedParcelId` already exists in the page (drives the side
panel). `selectedParcelGeometry` is new — derive it inside
`page.tsx` from the same parcel list that powers the existing dot
layer, lookup by id. No new API call.

The `page.tsx` edit footprint:
- Two prop additions on the one `<MiniMap>` call site.
- One memo derivation of `selectedParcelGeometry`.
- That's it. Guarded by `feedback_page_tsx_review_before_edit`:
  Phase B kickoff will present this diff + invariants table.

### 2.4 Reuse for PDF Location Map

The current PDF takes a single snapshot from the main map (3D, gold-
highlighted plot) and shows it in the left 60 % column. The DDA
reference shows the 3D-equivalent (main diagram) in the **right** big
pane, and the Location Map in the **bottom-left** as a smaller pane.

Proposed layout change for the new PDF, on the same landscape A4:

```
┌──────────────────────────────────┬───────────────────────────────┐
│                                  │  PROJECT                       │
│   3D MAIN VIEW                   │  DIMENSIONS                    │
│   (ZAAHI Signature, gold plot)   │  LAND USE                      │
│   ~55% width × 65% height        │  PRICE                         │
│                                  │  GENERAL NOTES (with ZAAHI     │
├──────────────────────────────────┤   explanation lines)           │
│  LOCATION MAP                    │                                │
│  (MiniMap canvas snapshot,       │                                │
│  2D, locator centred on plot)    │                                │
│  ~55% width × 30% height         │                                │
└──────────────────────────────────┴───────────────────────────────┘
```

Technical path — reuse the same canvas-capture mechanism that
`captureMap()` uses today, on the MiniMap's MapLibre instance:

1. **Add `preserveDrawingBuffer: true`** to the `new maplibregl.Map`
   options inside `MiniMap.tsx` (one line — same flag the main map
   already sets in `page.tsx`, per the comment at `page.tsx:3399`
   about the Site Plan PDF generator).
2. **Expose a `miniMapRef`** via `useImperativeHandle` so the page
   component can call `miniMapRef.current.captureCanvas()` from the
   PDF button handler. Implementation inside MiniMap returns
   `mini.getCanvas().toDataURL('image/jpeg', 0.92)` — same line the
   main capture uses.
3. **In `generateSitePlanPdf`**, accept an optional second image
   blob `locationMapImage?: string | null` alongside the main `map`.
   When the locator image is provided, render it as the bottom-left
   pane per the layout above; when missing, fall back to today's
   single-column layout (so non-MiniMap callers still work).
4. **The page-level button handler** that triggers PDF generation:
   - Capture the MiniMap first (recentred on the selected parcel —
     `miniMapRef.current.recenterAndCapture(parcel)` blocks for the
     `idle` event then returns the data URL).
   - Capture the main map (`captureMap` continues as today).
   - Pass both into `generateSitePlanPdf({ … , map, locationMapImage })`.

This keeps the existing capture mechanism intact and the new
MiniMap is just a second consumer of it. No new heavyweight
dependency, no server-side rendering, no Mapbox Static API.

Risk callouts:
- The DDA Location Map is **black-and-white**. CARTO Positron is
  light-coloured but already low-saturation. Visually it will read
  close to DDA's reference; a true B/W treatment would require a
  desaturation pass (HTMLCanvas `filter: grayscale(100%)` before
  `toDataURL`). Defer to v3 unless founder explicitly wants it.
- Capturing at 280×160 (current MiniMap container) gives a low-res
  pane in the PDF. Recommend bumping the MiniMap to **320×200** for
  Phase B so the PDF pane is sharper at A4 print scale — UI footprint
  changes by 40 × 40 px, dock chrome adapts because of `auto auto
  auto` grid.

---

## Phase B — estimated effort

| # | Task | Hours |
|---|---|---:|
| 1 | Notes catalog: 13 patterns + per-pattern hard-coded explanations as `EXPLANATIONS` constant. Tests on 5 real plots. | 2 |
| 2 | `explainNotes()` function — splits notes into sentences, matches each against the pattern catalog, emits `[{official, explanation?}]` tuples. | 2 |
| 3 | `stripInternalLines()` filter (§1.4) + unit tests on the three confirmed prefix patterns. | 1 |
| 4 | `generate-site-plan-pdf.ts` integration — wire strip → rewriter → explainer → renderer. New typography for the `↳ ZAAHI:` line. Notes-block cap raised to 18 lines. | 1.5 |
| 5 | Side-panel `/api/parcels/[id]` integration — apply the strip in the API response. Admin-bypass deferred. | 0.5 |
| 6 | `MiniMap.tsx` rev 2 — props for `selectedParcelId` + `selectedParcelGeometry`, polygon overlay source/layer, district-names symbol layer reuse, recentre effect, North arrow SVG, `preserveDrawingBuffer`, `useImperativeHandle` for `captureCanvas`. | 3 |
| 7 | `page.tsx` minimal edit — two props on `<MiniMap>`, one geometry memo, optional MiniMap container resize 280→320. Phase B will present a full diff + invariant table at kickoff (gated by `feedback_page_tsx_review_before_edit`). | 1 |
| 8 | `generate-site-plan-pdf.ts` layout — split left column into 3D-main (top 65 %) + locator (bottom 30 %); accept `locationMapImage?` param. | 2 |
| 9 | PDF trigger handler — capture MiniMap canvas, then main canvas, then call generator. Sequencing + error fallback. | 1 |
| 10 | Manual verification on 5 plots (4 emirates + 1 Trakhees/Nakheel mix) — open PDF, check both panes, check Notes explanations. | 1 |

**Total: ~15 hours** (mid-estimate; cluster into one PR for review).

Constraints during Phase B:
- All edits land on a new branch `feat/site-plan-v2`, not on
  `research/site-plan-v2` and not directly on `main`.
- `tsc --noEmit` must be 0 before commit; no `// @ts-expect-error`,
  no ESLint disables.
- `feedback_page_tsx_review_before_edit` — plan + diff + invariants
  before any `page.tsx` edit.
- `feedback_pmtiles_verification` — out of scope, untouched.
- No changes to `loadZaahiPlots` or any `fill-extrusion-*` value.
- No new env var.
- No new heavy dependency. `↳` is U+21B3 (renders fine in
  helvetica); no font swap.

---

## Open questions for founder before Phase B starts

1. **Confirm pattern catalog scope.** §1.2 covers 13 patterns
   distilled from seed scripts + the DDA reference PDF. If the
   founder has a list of additional notes that should get ZAAHI
   explanations (e.g. specific Nakheel boilerplate, DEWA-related
   wording, Dubai Municipality fire-code clauses), name them now —
   adding more patterns later is cheap, but baseline correctness
   matters more than coverage.
2. **Admin-bypass for internal lines** — §1.4 closing question:
   should the side panel show the stripped internal lines to admin
   users? Yes / no / defer.
3. **MiniMap canvas size** — bump 280 × 160 → 320 × 200 for sharper
   PDF? Yes / no.
4. **DDA-style desaturation on the locator pane** — apply
   `grayscale(100%)` filter for true DDA visual parity, or keep
   CARTO Positron light colours? Yes (grayscale) / no (keep colours).

Phase B does not start until these four are answered.
