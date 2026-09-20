---
paths:
  - "src/app/parcels/map/**"
  - "scripts/prepare-tiles.ts"
  - "src/lib/filter-state.ts"
  - "src/lib/keyboard-nav.ts"
---

# Rules for adding plots for sale

### Data sources
- DDA plots (7-digit numbers like 6457940): polygon, affection plan, and building limit are parsed automatically via the DDA API
- Non-DDA plots (9-digit numbers like 91415109): placeholder polygon from coordinates, data entered manually

### Colors by Land Use — APPROVED 10 categories (palette revised; 1-to-1 with code 2026-06-15)
**DO NOT change without explicit founder consent.** This is the final list.

These hex values are aligned 1-to-1 with the live code `ZAAHI_LANDUSE_COLOR` (`src/app/parcels/map/page.tsx`)
2026-06-15 (founder sanction). The previous table (Residential `#FFD700` yellow, etc.,
palette of 2026-04-11) was outdated — the code was recolored but CLAUDE.md was not updated.

| # | Category | Hex | Color |
|---|---|---|---|
| 1 | Residential | `#2D6A4F` | green |
| 2 | Commercial | `#1B3A5C` | dark blue (navy) |
| 3 | Mixed Use | `#6B4C9A` | purple |
| 4 | Hotel / Hospitality | `#E8732A` | carrot orange (founder 2026-06-15, was burgundy `#7B1E2B`) |
| 5 | Industrial / Warehouse | `#495057` | gray |
| 6 | Educational | `#0077B6` | sky blue |
| 7 | Healthcare | `#E63946` | red |
| 8 | Agricultural / Farm | `#606C38` | olive |
| 9 | Future Development | `#A8926E` | sandstone (warm earth · distinct from brand gold) |
| 10 | Investment | `#14B8A6` | turquoise-teal (AD off-plan) |

DDA district / master-plan outlines on the map use the brand gold `#C8A96E` (NOT a land-use category — it's the layer-outline colour). Future Development = `#A8926E` is intentionally DIFFERENT from the brand gold `#C8A96E`, so that plots under development do not blend into district outlines.

**⚠️ FutureDev color drift in code (2026-06-15, partially closed):** `ZAAHI_LANDUSE_COLOR` + `LAND_USE_LEGEND` are aligned to `#A8926E`. NOT synchronized (the tail): `SidePanel.tsx` (`#C8A96E`), `filter-state.ts` (`#84CC16` — the old lime), `scripts/prepare-tiles.ts` (`#C8A96E`, tile-build — change only when rebuilding tiles). Align on the next pass.

**Mapping from DDA land use strings to categories** (case-insensitive `contains`, implemented in `deriveLandUse` in `src/app/parcels/map/page.tsx`):
- `residential`, `villa`, `townhouse`, `apartment` → Residential
- `commercial`, `office`, `retail`, `showroom`, `cbd` → Commercial
- `mixed`, `mixed use`, `mixed-use` → Mixed Use
- `hotel`, `hospitality`, `resort`, `serviced apartment` → Hotel/Hospitality
- `industrial`, `warehouse`, `factory`, `logistics`, `storage` → Industrial
- `education`, `school`, `university`, `academy`, `nursery` → Educational
- `health`, `hospital`, `clinic`, `medical` → Healthcare
- `agriculture`, `farm`, `agricultural` → Agricultural
- `future development` → Future Development
- AD `primaryUse="Investment"` without another devCategory mapping → Investment (strategy B — added 2026-06-03; plots already classified via devCategory keep their existing category)
- Several different categories in `landUseMix` → Mixed Use
- Empty or unknown → `null` → the plot is rendered only as an outline, with no 3D model, until DDA assigns a category

**Source-of-truth in code:** `ZAAHI_LANDUSE_COLOR` in `src/app/parcels/map/page.tsx` AND `scripts/prepare-tiles.ts` (tile-build mirror — both must stay in sync). The 3D `fill-extrusion-color` match expression in `loadZaahiPlots`, the `LANDUSE_COLORS` map in `src/app/parcels/map/SidePanel.tsx`, the `LAND_USE_LEGEND` array in the map page, and `LAND_USE_OPTIONS` in `src/lib/filter-state.ts` MUST stay in sync. CLAUDE.md is the human-readable source of truth — code is the machine-readable one.

**Land Use legend (10 categories) — 9 approved by the founder 2026-04-11, INVESTMENT added 2026-06-03. DO NOT change without explicit consent.**

### 3D models — ZAAHI Signature style
Opacity is fixed: fill 0.35-0.45, outline 0.8. DO NOT change without approval.
Each land use has its own 3D style (colors — see the section above "Colors by Land Use").

**3D buildings opacity — two different values by layer type (founder spec 2026-04-15):**
- **ZAAHI listings 3D buildings (`ZAAHI_BUILDINGS_3D`, source `zaahi-plots-buildings`, our 114 plots): `fill-extrusion-opacity: 1` — SOLID.** These are our plots, they must stand out on the map as solid objects.
- **PMTiles 3D buildings (DDA / AD / Oman via `addLandTileSource`): `fill-extrusion-opacity: 0.45` — TRANSPARENT.** This is background data, it must not dominate the listings.
- `fill-extrusion-opacity` MUST be a literal number, MapLibre does not accept data expressions. Any highlighting of a selected building is done via `fill-extrusion-color` (brightness) or a glow outline on the plot layer, NOT via opacity.

FUTURE DEVELOPMENT (land without buildings) — fill polygon only, no 3D extrusion.

### 3D model rules (ZAAHI Signature) — FOREVER
Approved by the founder 2026-04-11. Implementation: `loadZaahiPlots` →
`computeSetbackM` + `insetRingByMeters` in `src/app/parcels/map/page.tsx`.

Each 3D model consists of three layers:
1. **PLOT BOUNDARY** — polygon from DDA, rendered as `ZAAHI_PLOTS_FILL` + `ZAAHI_PLOTS_LINE`. Fill-opacity 0.35-0.45 (when there is a land use), 0 (outline-only when there is none).
2. **BUILDING FOOTPRINT** — polygon with setbacks from the plot boundaries. NOT directly visible on the map, used as the base for the extrusion.
3. **FILL-EXTRUSION** — the 3D building, rises from the building footprint, **NOT from the plot boundary**. "Ground" is visible between the building and the plot boundary — this is the setback.

#### Setback source (by priority)
1. **`affectionPlan.buildingLimitGeometry`** — if DDA provides an explicit building limit polygon, use it as the footprint as-is.
2. **`affectionPlan.setbacks[]`** — if there is an array of sides with `building` / `podium`, take the average non-zero value in meters and inset the plot polygon by that delta.
3. **Land-use defaults** — if the affection plan has no setback data:
   - Residential **villa / townhouse**: 3 m on all sides
   - Residential **apartment** (everything else residential): ~4 m (5 m from the road + 3 m from neighbors, averaged)
   - Commercial / Office / Retail: **0 m** (built edge to edge)
   - Hotel / Hospitality: 3 m
   - Industrial / Warehouse: 4 m
   - Educational / Healthcare: 5 m
   - Agricultural / Farm: 10 m
   - Mixed Use: 4 m

#### Bypass for small plots
If `plotAreaSqft < 5000` — building footprint **=** plot boundary (no setbacks). The building occupies the entire plot, so that a thin villa-plot does not turn into a box in the middle of the ground.

#### What not to do
- DO NOT build the extrusion directly from the plot polygon (without setback) on normal plots. Without setbacks the 3D looks like a lego block that occupies the entire plot — this contradicts ZAAHI Signature.
- DO NOT build the extrusion outside the plot polygon. All tiers (podium / body / crown) must be **inside** the building footprint.
- DO NOT change the default setbacks by land use without explicit founder consent.
- DO NOT change `computeSetbackM` or `insetRingByMeters` without explicit founder consent.

#### Stepped 3D — podium / body / crown (founder spec 2026-04-12)
**Each building consists of 1, 2, or 3 tiers** depending on the number of floors. All tiers are features in **one** GeoJSON source and **one** fill-extrusion layer (`ZAAHI_BUILDINGS_3D`). No filters by `kind`. The color is the same for all tiers of one building (per the land use legend). A single opacity of 0.4 for the whole layer. The stepping is visible through the **difference in width**, not through color or transparency.

| Floors | What is drawn | Footprint scale | base → top |
|---|---|---|---|
| ≤ 4 | **podium only** | 1.00 (100%) | 0 → totalH |
| 5–10 | podium + **body** | 1.00 / 0.70 (70%) | 0 → 14 / 14 → totalH |
| > 10 | podium + body + **crown** | 1.00 / 0.70 / 0.50 (50%) | 0 → 14 / 14 → totalH−7 / totalH−7 → totalH |

Constants:
- `FLOOR_H = 3.5` meters per floor
- `PODIUM_TOP = 14` meters (4 podium floors)
- `CROWN_H = 7` meters (the last 2 floors)
- `floors = round(totalH / FLOOR_H)` — determines how many tiers to draw

The footprint of each upper tier is obtained via `scaleRingFromCentroid(footprintRing, scale)` — a uniform centered narrowing toward the centroid of the original footprint. All tiers stay inside the plot polygon because they are geometrically nested in the footprint, and the footprint already accounts for the setback.

Implementation: inside `loadZaahiPlots` in `src/app/parcels/map/page.tsx`, right after the block that computes `totalH` and `buildingHex`. **DO NOT change without explicit founder consent.**

**All future plots (new seeds, manual additions, Excel import) automatically get this style through the same loadZaahiPlots — separate hardcoded overrides for specific plots are FORBIDDEN.**

### Default layers
- ALWAYS on: ZAAHI Plots (plot polygons + 3D Signature buildings)
- OFF by default: all DDA districts, master plans, Communities, Major Roads, Metro and other overlays. The user turns them on via the Layers panel.

### Map navigation
- **Always-on keyboard nav** — no modes, no UI toggle. W/A/S/D (via `e.code`, layout-independent) — movement in the camera direction, Q/E — bearing rotation, Space/C — up/down, R/F — pitch, Shift — speed boost. Always works, in parallel with the standard MapLibre mouse navigation.
  - Ignore keys when focus is in input/textarea/contenteditable.
  - Implementation: `src/lib/keyboard-nav.ts` (controller pattern: `{ destroy }`), installed in the map-init useEffect. MapLibre's own keyboard handler is disabled when constructing the map (`keyboard: false`), so that arrows / +/- do not conflict.

> **Drone mode removed 2026-06-11.** The FPS free-flight mode (`3bac358`) was
> reverted the same day (`6e87fd4`) and then removed entirely (`6d02f28`):
> `DroneHUD.tsx` and `src/lib/drone-controls.ts` no longer exist, the key
> `localStorage["zaahi-drone-mode"]` is not read. The replacement is the always-on
> keyboard nav above (`be1bac2`). Postmortem:
> `docs/research/drone-fps-postmortem-2026-06-11.md`. Do not restore
> without an explicit founder decision.

### UI
- Hover on a plot: mini-card (plotNumber | district | sqft | price | landUse)
- Click on a plot: 350px side panel with price, project, dimensions, land use, documents
- The card is compact, with no empty space

### Questions and suggestions
If unsure about the data or an architectural decision — write to founder Zhan (`zhanrysbayev@gmail.com`) with co-founder Dymo (`d.tsvyk@gmail.com`) in copy on strategic questions. See the `FOUNDER CONTACTS` section in CLAUDE.md.
