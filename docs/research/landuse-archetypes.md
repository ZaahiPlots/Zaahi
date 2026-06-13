# Land-Use Archetypes — recon + visual preview

Branch: `research/landuse-archetypes` (от `main` 40060d8). Date 2026-06-13.
Status: **STOP — awaits founder approval, archetype-by-archetype. Tiles untouched.**

Founder concept (2026-06-13): здания должны читаться как **ТИП** назначения, не
просто цветные коробки. Полупрозрачный фирменный стиль + канонический цвет 9/10
категорий **СОХРАНЯЮТСЯ**. Меняется только **ФОРМА массинга (силуэт)** под landUse.

This round delivers: (1) data inventory, (2) the `landUse → силуэт` archetype table,
(3) implementation inside the existing `emitSignatureTiers()` behind an opt-in flag
(default off → prod + vault renderer byte-identical), (4) real screenshots of every
archetype on a real plot, (5) a **reviewed-but-not-applied** `?archetypes=1` wiring
diff for `parcels/map/page.tsx` (page.tsx-review gate).

---

## 1. Data inventory (read-only DB query, prod region eu-central-1)

`scripts/_inventory-landuse.mjs` — mirrors `deriveLandUse()` from page.tsx.

**147 curated parcels** — 141 Dubai + 6 Abu Dhabi. By derived land-use:

| Land use            | # parcels | Archetype example used in shots |
|---------------------|-----------|---------------------------------|
| MIXED_USE           | 58        | 6460178 (City of Arabia, 66 fl) |
| RESIDENTIAL         | 56        | 4158723 (56 fl)                 |
| COMMERCIAL          | 14        | 202-613-000-C9 (AD, 60 fl)      |
| HOTEL               | 5         | 6757711 (Dubai Studio City, 16 fl) |
| HEALTHCARE          | 4         | 6455948 (Majan, 9 fl)           |
| FUTURE_DEVELOPMENT  | 4         | 6464982 (flat — no massing)     |
| EDUCATIONAL         | 3         | 6850743 (Dubai Production City, 5 fl) |
| INDUSTRIAL          | 2         | 6854560 (5 fl)                  |
| UNCLASSIFIED        | 1         | 4168033 (empty landUseMix)      |

**No curated AGRICULTURAL and no curated INVESTMENT parcels exist** (INVESTMENT is the
AD off-plan tile category, not yet in the curated set). Both are shown in the visual set
on **synthetic square plots** so the founder can still approve the silhouette rule.

The 10 canonical category keys (unchanged, NOT touched): `RESIDENTIAL, COMMERCIAL,
MIXED_USE, HOTEL, INDUSTRIAL, EDUCATIONAL, HEALTHCARE, AGRICULTURAL, FUTURE_DEVELOPMENT,
INVESTMENT` — source `ZAAHI_LANDUSE_COLOR` (page.tsx:290).

### 1a. DLRC hotels — ⚠️ data discrepancy to confirm

Founder said **12 hotel plots in DLRC**. They are **not** in the curated DB (the curated
set has 5 hotels total, none in DLRC). I swept the **DDA z18 PMTiles** over the DLRC /
Wadi Al Safa 5 bbox (`scripts/_probe-dlrc-hotels.py`, 550 tiles). Result:

**8 dedicated HOTEL/HOSPITALITY plots** in DLRC-proper — the `6489xxx` cluster:

| plot | lat | lng | sub land use | area sqft | status |
|---|---|---|---|---|---|
| 6489099 | 25.090931 | 55.376318 | HOTEL | 83 763 | Suspended |
| 6489024 | 25.091932 | 55.377704 | HOTEL - HOTEL APARTMENT | 34 730 | Empty |
| 6489023 | 25.090236 | 55.379177 | HOTEL | 34 608 | Empty |
| 6489017 | 25.086202 | 55.386195 | HOTEL | 32 809 | Empty |
| 6489008 | 25.088135 | 55.386857 | HOTEL APARTMENT | 46 840 | Empty |
| 6489009 | 25.087689 | 55.387413 | HOTEL APARTMENT | 39 943 | Empty |
| 6489015 | 25.086261 | 55.386838 | HOTEL APARTMENT | 33 795 | Empty |
| 6489014 | 25.086212 | 55.387355 | HOTEL APARTMENT | 33 795 | Empty |

Two more HOTEL hits sit just outside DLRC-proper and look unrelated: `6430106`
(lat 25.105, north — Liwan side) and `64811085` (a 2.5M-sqft multi-use recreational
facility that merely *includes* a hotel use, Falconcity-type). Excluding those → **8**.

**Q for founder:** is the "12" from a newer DDA cut / a wider boundary / counting
hotel+hotel-apartment+serviced separately? I can re-sweep an exact polygon if you give
the DLRC boundary, or pull DDA GIS live. For now the confirmed DLRC hotel cluster = the
8 plots above.

---

## 2. `landUse → силуэт` archetype table

Each tier ring is the building footprint (DDA `buildingLimitGeometry`, else the setback
inset) scaled toward its own centroid → **every tier stays strictly inside the plot**
(CLAUDE.md inside-the-plot invariant holds automatically). Colour + opacity + setback
rules are untouched — only tier rings + height splits change.

| Land use | Silhouette rule | Tiers (scale → height band) |
|---|---|---|
| **HOTEL / HOSPITALITY** | narrow tower on a wide low stylobate | 1.00 (0→~7m) · 0.42 (→top) |
| **COMMERCIAL / RETAIL** | sheer curtain-wall prism + thin parapet | 1.00 (0→top−3) · 0.94 (→top) |
| **INVESTMENT** | (AD off-plan) → sheer commercial tower | same as COMMERCIAL |
| **RESIDENTIAL** | stepped terraces / balcony bands | steps scale by height: >30fl → 1.0/0.84/0.68/0.52 · >15 → 1.0/0.80/0.60 · >8 → 1.0/0.72 · else 1.0 |
| **MIXED_USE** | retail podium + tower (+crown) — reference massing | 1.00 (0→14) · 0.70 (→top−7) · 0.50 (→top) |
| **HEALTHCARE** | compact: inset base block + smaller upper block | 0.90 (0→55%) · 0.72 (→top) |
| **EDUCATIONAL** | horizontal low-rise slab | 1.00 single block |
| **INDUSTRIAL / WAREHOUSE** | low long block | 1.00 single block |
| **AGRICULTURAL** | barn — low block, large setback (10m default) | 1.00 single block |
| **FUTURE_DEVELOPMENT** | flat fill, **no 3D massing** (existing rule) | flat block / outline-only |

Height stays **honest** — it comes from `maxFloors`/`maxHeightMeters` (DDA) via the
unchanged `resolveTotalHeightMeters()`. Educational/industrial/agricultural already get
low per-type defaults, so "horizontal" reads naturally on their wide plots. The
silhouette difference is in the **massing strategy**, not in faking height.

---

## 3. Implementation

All in the **library only** — `src/lib/zaahi-3d-tiers.ts` (freely editable; page.tsx not
touched in this commit):

- New opt-in `archetype?: boolean` on `TierEmitInput` (default `false`).
- New pure `emitArchetypeTiers(footprintRing, totalH, landUse)` — the table above.
- `emitSignatureTiers()` routes to it only when `input.archetype === true` and the plot
  is not `forceFlat`. **Default path unchanged** → the vault renderer (`loadVaultShared`)
  and any other consumer keep byte-identical output until a caller opts in.

Verified: `npx tsc --noEmit` clean (exit 0). The screenshots below were produced by
running the **real** `emitSignatureTiers` via `scripts/_compute-tiers.ts`.

---

## 4. Screenshots — `docs/research/archetype-shots/`

Each archetype, rendered on its real plot footprint in the brand translucent style
(canonical land-use colour, fill ~0.45, white edges 0.8, gold plot boundary showing the
setback gap). `<CAT>-archetype.png` = new massing; `<CAT>-legacy.png` = current
podium/body/crown for side-by-side comparison.

- `HOTEL-archetype.png` — wide stylobate + slim tower ✅ (DLRC-first not possible: no DLRC
  hotel in curated DB; used 6757711, the tallest curated hotel — see §1a).
- `RESIDENTIAL-archetype.png` — 4 receding terraces ✅
- `COMMERCIAL-archetype.png` — sheer tower + parapet ✅
- `EDUCATIONAL-archetype.png` — long horizontal slab ✅
- `INDUSTRIAL-archetype.png` — low long block ✅
- `HEALTHCARE-archetype.png` — compact base + upper block ✅
- `MIXED_USE-archetype.png` — podium/body/crown reference ✅
- `INVESTMENT-archetype.png` / `AGRICULTURAL-archetype.png` — synthetic plots ✅
- `FUTURE_DEVELOPMENT-archetype.png` — intentionally flat (no 3D), reads as bare land ✅

Harness: `docs/research/archetype-shots/_harness.html` (Three.js) +
`tiers.json` (computed by the real lib) + `footprints.json` (real plot geometry).
Re-render: `python3 -m http.server 8088` at repo root, then headless-chrome
`--screenshot` of `?cat=<CAT>&mode=archetype|legacy`.

---

## 5. PROPOSED `?archetypes=1` map wiring — GATED on founder approval

The live map (`/parcels/map`) paints buildings from `loadZaahiPlots`, which has its own
**inline** tier copy (page.tsx:3404–3432). To preview archetypes on the real map we route
that inline block through `emitArchetypeTiers` when `?archetypes=1`. Per the page.tsx
review rule this diff is **proposed, not applied** — founder approves first.

### Plan
1. Read the flag once inside `loadZaahiPlots`:
   `const ARCHETYPES = new URLSearchParams(window.location.search).get("archetypes") === "1";`
2. Import `emitArchetypeTiers` (already exported) alongside the existing `emitSignatureTiers` import (page.tsx:53).
3. In the tier section, gate the new path:

```diff
         const forceFlat =
           it.plan?.buildingStyle === "FLAT" ||
           landUse === "FUTURE_DEVELOPMENT" ||
           landUse === "FUTURE DEVELOPMENT";
         if (forceFlat) {
           pushTier(footprintRing, 0, totalH);
+        } else if (ARCHETYPES) {
+          // ?archetypes=1 preview — per-land-use silhouette massing.
+          for (const t of emitArchetypeTiers(footprintRing, totalH, landUse)) {
+            pushTier(t.ring, t.baseMeters, t.topMeters);
+          }
         } else if (floors <= 4) {
           pushTier(footprintRing, 0, totalH);
         } else if (floors <= 10) {
```

```diff
-import { emitSignatureTiers, type SetbackEntry } from "@/lib/zaahi-3d-tiers";
+import { emitArchetypeTiers, emitSignatureTiers, type SetbackEntry } from "@/lib/zaahi-3d-tiers";
```

### Invariant-confirmation table (page.tsx-review rule)

| Invariant | Before | After (flag OFF) | After (`?archetypes=1`) |
|---|---|---|---|
| 9/10 legend + colours | `buildingHex` per legend | unchanged | unchanged (colour untouched) |
| `fill-extrusion-opacity` literal 1 | literal `1` | literal `1` | literal `1` |
| Tiers inside plot boundary | yes | yes | yes (centroid-scaled footprint) |
| Setback / footprint logic | `computeSetbackM`+`insetRingByMeters` | unchanged | unchanged (same `footprintRing`) |
| forceFlat (FLAT / FUTURE_DEV) | flat block | flat block | flat block (gated before archetype) |
| Default prod render | podium/body/crown | **identical** | only when `?archetypes=1` |
| `loadZaahiPlots` function preserved | present | present | present (additive branch only) |
| No hardcoded per-plot overrides | none | none | none (data-driven by landUse) |

> ⚠️ Cannot self-screenshot the live flag on this box: `pnpm dev` OOMs compiling
> `/parcels/map` (memory `env_dev_server_map_page.md`). The §4 standalone shots are the
> visual proof; the live `?archetypes=1` smoke is a founder/preview-deploy step after
> approval.

---

## 6. Open questions for founder

1. **DLRC hotels: 8 vs 12** — confirm boundary / source (see §1a).
2. **Per-archetype sign-off** — approve HOTEL first, then the rest one by one. Tune any
   tier scale / height split before we wire the live flag or touch tiles.
3. **Footprint reshaping (future)** — v1 keeps the real plot footprint and varies massing
   via tier scale + height. A stronger "long block" (warehouse) / "narrow tower" read
   would need oriented-bounding-box footprint reshaping inscribed in the plot — out of
   scope this round; flag if wanted.
4. **Apply order** — after archetype approval: (a) apply the §5 page.tsx wiring →
   preview-deploy `?archetypes=1`, then (b) separately decide the **tile** rebuild
   (tiles carry their own pre-baked tiers; archetypes on the 99K/362K background is a
   `scripts/prepare-tiles.ts` change — STOP-gated, separate decision).

**Tiles NOT touched. Nothing pushed to main. Nothing deployed.**
