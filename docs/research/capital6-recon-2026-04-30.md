# CAPITAL 6 Office Building — Reconstruction Recon

**Source PDF:** `~/Загрузки/CAPITAL 6 OFFICE BUILDING.pdf` (9.5 MB, 28 pages, A3)
**Date:** 2026-04-30
**Branch:** `research/blender-mcp-eval`
**Scope:** Recon-only, text-output, no production deployment.

---

## Project metadata (cover sheet, page 1)

| Field | Value |
|---|---|
| Project | CAPITAL 6 OFFICE BUILDING (3B+G+7+R) |
| Plot No. | 6458042 |
| Location | WADI AL SAFA 3, Dubai |
| Plot area | 1,917.28 m² |
| Floors proposed | 3B + G + 7 + R |
| Floors allowed | G + 7 |
| Land use | COMMERCIAL |
| FAR proposed | 3.99 |
| Total BUA | 14,123.88 m² (152,029.41 sqft) |
| Total GFA | 7,664.63 m² |
| Parking required / provided | 113 / 116 |
| Stage | Preliminary Design |
| Architect | Sandybay Architectural Prospective Drawings Services Co. L.L.C (Berik Sandybayev) |
| Consultant | CVTEC Consulting Engineers (Ontario Tower, Business Bay, Dubai) |
| Client / Developer / Contractor | AAMANI Real Estate Investments Ltd |

---

## 1. Scope — what the PDF actually contains

28 sheets, all A3, all PRELIMINARY DESIGN stage, all vector content (text + line geometry — `pdftotext` extracts numeric data verbatim). Producer: Adobe Acrobat Pro DC 21.1.20150.

| # | Sheet | Coverage |
|---|---|---|
| 1 | Cover sheet | All metadata above |
| 2 | Drawing list | 28-sheet index |
| 3-4 | Perspective 01-02 | Two photoreal renders (NE + SW corners), facade material reference |
| 5-9 | Area calc 01-05 | Per-floor footprints (small scale colour-coded), elevator + sanitation specs |
| 10 | Setting-out plan 1:150 | **6 surveyed plot corners with E/N in metres** + setback callouts (7.5 m, 13 m, 1.95 m) |
| 11-13 | 3B / 2B / 1B floor plans 1:100 | Parking, ramps, slab levels (-11.4 → -8.1 → -4.8 → 0) |
| 14-21 | GF + 1F-7F floor plans 1:100 | Per-floor outline, terraces, core, partition |
| 22 | Roof plan 1:100 | Roof envelope |
| 23-26 | Elevation 01-04 1:100 | All four facades with **exact level marks (mm)** |
| 27-28 | Sections A-A, B-B 1:100 | Vertical structure, slabs, basement-to-roof |

**Coverage verdict: A-grade for preliminary.** Not IFC-ready (no MEP, no structural details, no door/window schedule, no specs/BoQ). For envelope reconstruction (elevations + sections + per-floor plans) it is complete.

---

## 2. Extractable data — what AI can pull programmatically

### Trivially extractable (vector text + lines)

**Plot polygon — 6 surveyed corners with full E / N coordinates** (page 10):

| Point | Easting (m) | Northing (m) |
|---|---|---|
| P1 | 497,981.778 | 2,775,843.719 |
| P2 | 497,984.989 | 2,775,853.574 |
| P3 | 498,011.996 | 2,775,864.909 |
| P4 | 498,033.477 | 2,775,813.873 |
| P5 | 498,006.410 | 2,775,802.537 |
| P6 | 497,998.555 | 2,775,805.762 |

These are in a Dubai local projected grid (metres) — likely Dubai Local Transverse Mercator / DCS-95 or Nahrwan-67 UTM 40N. Datum not stated on the sheet; needs verification before tying to lat/lng on the ZAAHI map.

**Exact floor levels** (mm above ground floor 0.000, from elevations pages 23-26):

| Level | Elevation | Δ floor-to-floor |
|---|---|---|
| Top of parapet | +34,200 | +1,500 |
| Roof Floor | +32,700 | +3,900 |
| 7th Floor | +28,800 | +3,900 |
| 6th Floor | +24,900 | +3,900 |
| 5th Floor | +21,000 | +3,900 |
| 4th Floor | +17,100 | +3,900 |
| 3rd Floor | +13,200 | +3,900 |
| 2nd Floor | +9,300 | +3,900 |
| 1st Floor | +5,400 | +5,400 (double-height retail) |
| Ground Floor | 0 | — |
| 1st Basement | -4,800 | |
| 2nd Basement | -8,100 | |
| 3rd Basement | -11,400 | |

Total above-grade height: **34.2 m**.

**Per-floor BUA** (m², from area calc tables pages 5-7):

| Floor | BUA (m²) |
|---|---|
| GF | 1,189.54 |
| 1F | 1,175.97 |
| 2F | 1,257.02 |
| 3F | 1,245.74 |
| 4F | 1,261.35 |
| 5F | 1,261.31 |
| 6F | 1,261.28 |
| 7F | 581.55 (partial — gym + roof terrace) |
| 1B | 1,629.60 |
| 2B | 1,629.60 |
| 3B | 1,630.92 |

The footprint **steps in at level 4** and **steps in again at level 7** — two distinct setbacks visible.

**Setback annotations** (page 10): 7,500 mm (side 2 / north neighbour), 13,000 mm (tower step-back at 4F), 1,950 mm minor offset.

**Plot dimensions:** ~52,900 mm × ~31,300 mm (gridlines 1-8 × A-F).

### Extractable with vector-extraction tooling (`pdftocairo -svg`, `pdfminer.six`, `mutool`)

- Per-floor footprint polygons for GF, 1F, 2F, 3F, 4F, 5F, 6F, 7F, Roof — distinct shapes, vector lines, can be vectorised separately.
- Core / lift / staircase positions from each plan.
- Terrace boundaries (cyan-coded on area calcs).
- Curtain-wall mullion grid (vertical lines on elevations are vector strokes).
- Section structural slab thicknesses.

### Hard / not auto-extractable

- The two photoreal perspectives (pages 3-4) — embedded raster JPEGs; vision model can describe them but can't extract numeric facade specs.
- **Material identification** — "champagne perforated screen", "blue reflective glass", "aluminium fins" are visible in renders but not in any spec sheet.
- Glazing module spacing — visible in elevations as ~1.5 m mullion repetition, never dimensioned numerically.
- Decorative perforated screen pattern — geometric pattern visible as raster fill in vector PDF, not parametrically described.
- Plot lat/lng — only projected E/N is given; needs datum confirmation.

---

## 3. Reconstruction feasibility (Blender via MCP)

| LOD | Description | AI fit |
|---|---|---|
| **L1 — Massing block** | Single 34.2 m extrusion of plot polygon. | Trivial. Identical to ZAAHI Phase 2.0 toolchain. |
| **L2 — Stepped massing** | Per-floor extrusion using the 9 different floor footprints (GF / 1-2F band / 3F / 4-6F tower / 7F crown / Roof). | **AI sweet spot.** Vector floor plans → 9 polygons → 9 prisms stacked at exact level marks. Reads as an architectural model from any angle. |
| **L3 — Detailed envelope** | L2 + curtain-wall procedural facade (mullion grid 1.5 m × 3.9 m, two materials: glass + aluminium fin, plus champagne perforated bands). | Doable but slow. Needs procedural Geometry Nodes or a Python loop placing window panels per face per floor. The perforated screen needs an alpha-mapped pattern from the elevation raster. |
| **L4 — Interior cutaway** | L3 + section-cut interior with slabs, core, parking ramps. | Marginal. Sections give slab thicknesses + interior partition lines but no rooms are dimensioned individually. Output looks impressive but is not architecturally accurate at room scale. |

**What AI does well:** setting-out polygon from 6 points, stacking N footprints at exact level marks, procedural mullion grid from line-spacing arithmetic, two-material glass/aluminium assignment, glass shader, viewport renders.

**What AI does poorly:** reproducing the decorative perforated screen pattern (needs custom alpha texture), soft architectural judgement (orientation of crown / which face is the entrance), landscape (palms, planters), interior layouts.

---

## 4. Time estimate (single-developer-agent, MCP-driven)

| Level | Honest hours | What you ship |
|---|---|---|
| **L1 — Massing block 34.2 m + plot footprint** | **1.5–2 h** | Real plot polygon (from 6 surveyed points), single extrusion to 34.2 m, .glb. Validates plot coords and projection toolchain. |
| **L2 — Per-floor stepped extrusion (9 tiers)** | **5–7 h** | Vector-extract each floor polygon, snap to gridlines, build 9 prisms at exact levels, stack. Looks like the building. |
| **L3 — Procedural curtain wall + materials** | **+10–14 h on top of L2** | Mullion grid per facade, glass + aluminium fin materials, podium band, terrace railings. With separately-OCR'd perforated screen alpha, "convincing from 10 m". |
| **L4 — Interior cutaway sections** | **+8–12 h** | Cut planes through A-A and B-B, hatched slabs, parking visible. Marginal ROI. |

**Total to "credible architectural model" (L1+L2+L3): 16–23 hours.**
**Founder-demo "wow" model: L1+L2 in 7–9 hours.**

---

## 5. Blockers / risks

- **Coordinate system unknown.** 6 setting-out points are in metres but datum not named on the sheet. Likely Dubai LTM / DCS-95 or Nahrwan-67 UTM 40N. Until verified, we can't tie the model to lat/lng. Mitigation: ask CVTEC, or reverse-geocode P1-P6 against DLD GIS for plot 6458042. Risk: medium, ~30 min.
- **Vector-to-polygon extraction quality.** PDFs from Adobe Acrobat sometimes flatten linework into clipped paths that aren't clean closed polygons — the floor plan outline may need stitching after `pdftocairo -svg`. Risk: medium, +1-2 h on L2.
- **Perforated screen pattern.** Rendered as a vector cross-hatch in the PDF — visually distinctive but reproducing the exact rhythm needs raster OCR or hand-traced alpha. Risk: medium, blocks photo-fidelity not silhouette-fidelity.
- **Floor 7 is partial** (~580 m² of ~1,260 m² typical) — gym + roof terrace, irregular footprint — needs care during L2 extraction. Risk: low.
- **Render dimensions don't have scale callouts.** The two photoreal images are great for material judgement but can't be measured. Risk: low — elevations cover dimensions, renders cover materials.
- **Geometry irregularities:** plot is a 6-sided convex polygon, not rectangular. Building footprints curve to follow it (visible in GF + 1F plans — SE corner has a chamfer). Standard ZAAHI Signature setback insets work fine here.
- **Scope creep:** the perspectives are seductive — easy to commit "let me also model the palms / cars / cobblestones" and burn 5 extra hours. Discipline required.

---

## 6. Recommended path

**Multi-phase. Three milestones, each independently shippable.**

1. **Phase 2.A — Real-plot massing (1.5–2 h, ROI proof).** Replace synthetic 30 m extrusion from Phase 2.0 with the actual 6-point plot polygon at 34.2 m. Validates that the setting-out projection works end-to-end. Same toolchain as Phase 2.0; only inputs change. **Cheapest 'wow' milestone.**
2. **Phase 2.B — Per-floor stepped massing (5–7 h, the real architectural model).** Vector-extract the 9 floor polygons + place at exact level marks. Reads as a real building from any angle. **Milestone proving AI can reconstruct from preliminary CVTEC packs.**
3. **Phase 2.C — Optional façade (10–14 h, marketing-grade).** Procedural curtain wall + materials. Skip the perforated screen unless founder explicitly wants it (saves ~5 h; without it the model is still 80 % convincing). Skip interior cutaway entirely — bad ROI.

**Why split:** Phase 2.A unlocks "real plot, real height" demo in <2 h — high information per hour. Phase 2.B is the actual architectural feat. Phase 2.C is polish. After 2.B, decide whether 2.C is worth the time given other priorities.

**ROI-first phase: 2.A.** Small, reuses the entire Phase 2.0 pipeline, gives founder concrete validation that this single PDF can drive a real Blender scene at correct world coordinates.

---

## Scope flags

- Recon only — no production deployment.
- Not a listing for AAMANI Real Estate Investments — no authorization.
- Pure technical capability proof in local Blender on the dev box.
- Founder approval required before any public-facing use of the source PDF or derived 3D model.
