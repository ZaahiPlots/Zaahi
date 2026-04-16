# Geometry Misalignment Fix — 2026-04-16

**Status:** 🟡 Investigation complete, **zero DB writes applied**.
**Branch:** `fix/geometry-misalignment`
**Diagnostic tool:** `scripts/audit-geometry-misalignment.ts`

## Context

Founder reported that up to 3 parcels display misaligned on the map at `/parcels/map` (footprint polygon offset relative to the satellite layer). The agent was given authority to investigate and apply fixes on a dedicated branch, with founder to verify visually before any merge to `main`.

Candidate plot set (from founder brief plus substring/keyword search of districts):

| plotNumber | DB district (current) | Role in the task |
|---|---|---|
| 1010469 | DUBAI ISLANDS | problem (pre-confirmed by founder) |
| 5912323 | AL FURJAN | reference (do not touch) |
| 6117209 | BU KADRA | unresolved, agent discretion |
| 6117231 | BU KADRA | unresolved, agent discretion |
| 6817016 | AL BARSHA SOUTH FOURTH | unresolved, agent discretion |

## Investigation steps

1. **Phase A** — listed every parcel matching target district keywords plus `plotNumber = 1010469`. Computed centroid, bounding box, polygon area, vertex count for each. Output: 5 candidates.
2. **Phase B** — reverse-geocoded each centroid via OpenStreetMap Nominatim to get real-world neighbourhood confirmation.
3. **Phase C** — ran `git log --grep=<plotNumber>` and inspected the original seed scripts for each plot. Read the polygon ring coordinates vertex-by-vertex via `audit-geometry-misalignment.ts`.

## Per-plot findings

### Plot 1010469 — Dubai Islands
- **Current centroid:** 25.288, 55.301
- **Polygon:** clean axis-aligned 58.6 × 47.1 m rectangle (2762 m² ≈ declared 2755.98 m²).
- **Nominatim:** "Nakhlat Deira, Deira, Dubai" — confirms geometry is in the Dubai Islands reclamation area (Nakhlat Deira is the legacy name for what is now Dubai Islands; community name on the DB row also reads `NAKHLAT DEIRA`).
- **Seed provenance (commit `2691545`, `scripts/seed-dubai-islands-1010469.ts`):** the rectangle is **synthesized** — grid-tick bounds (496650..496750 E, 2797910..2797990 N in EPSG:3997) taken from affection plan `DIA-RE-0167`, then a centered rectangle sized to 2755.98 m² with the zone's 5:4 aspect. Script self-flags: *"Pixel-extraction from the PDF is blocked in this run; the synthesized rectangle is a known approximation, flagged in AffectionPlan.notes."*
- **Classification:** `WRONG_GEOMETRY_UNKNOWN_SOURCE` — the synthesised position is only as accurate as the 100 × 80 m grid tick, and within that zone the plot may actually sit off-centre. Dubai Islands is under Trakhees (PCFC), not DDA, so DDA GIS REST is explicitly off-limits. No local KML/GeoJSON in `data/` contains plot 1010469, and `data/layers/03_DUBAI_ISLAND_master_plan.kml` has zero placemarks (it is not a per-plot polygon dataset). The original pixel-extraction-worthy artefact — affection plan PDF `DIA-RE-0167` — is not present in the repository.
- **Action:** **🚫 BLOCKED.** Task rules forbid guessing coordinates when no source is available. Fix requires founder to either (a) provide the `DIA-RE-0167` PDF so pixel extraction can be re-run, or (b) supply the correct plot rectangle corners directly (Dubai Local TM or WGS84 lat/lon acceptable).

### Plot 5912323 — Al Furjan
- **Action:** **no change** (reference plot, explicit founder no-touch order). Verified for completeness only.
- **Current centroid:** 25.020, 55.139. Clean axis-aligned 52.9 × 35.1 m rectangle (1857 m² ≈ declared 1850.64 m²).
- **Nominatim:** "Jebel Ali 1, Jebel Ali, Dubai". Al Furjan is a development community within Jebel Ali 1, so the DB district label `AL FURJAN` is consistent with the real-world address.

### Plot 6117209 — Bu Kadra
- **Current centroid:** 25.181, 55.322
- **Polygon:** **irregular pentagon**, 5 distinct vertices, edges 46.6 / 18.1 / 55.1 / 58.9 / 68.0 m, total area 3916 m² ≈ declared 3907.97 m².
- **Nominatim:** "Meydan, Bu Kadra, Dubai" — primary district "Meydan" (the administrative super-community), sub-community "Bu Kadra".
- **Seed provenance (commit `eb0db83`, followed by `6225a8d` "update Al Furjan & Bu Kadra polygons **from affection plans**" and `4fb2a07` "correct Al Furjan & Bu Kadra polygon sizes").** The current pentagon shape is consistent with an authoritative DDA/affection-plan-sourced polygon.
- **Classification:** `VERIFIED_CORRECT`.
- **Action:** **no change.** Geometry is the real shape of the plot; DB district `BU KADRA` correctly reflects the sub-community naming convention used throughout the DB (e.g., other Meydan sub-communities are not labelled "MEYDAN" either).

### Plot 6117231 — Meydan / Bu Kadra
- **Current centroid:** 25.178, 55.324
- **Polygon:** rotated rectangle (tilt preserved), 60.1 × 43.6 m, area 2620 m² ≈ declared 2614.66 m². Edges: 60.1 / 43.6 / 60.1 / 43.6 — parallel opposite edges.
- **Nominatim:** "Meydan, Bu Kadra, Dubai".
- **Seed provenance (commit `917f623`, `scripts/seed-meydan-6117231.ts`):** geometry **pixel-extracted from MEYDAN AFFECTION PLAN.pdf**, calibrated to the 499000E / 2785830N grid tick; "60.12 × 43.49 m rectangle (2614.66 m²) tilted 24.6° CCW from east". Verified: opposite-edge Δlon/Δlat vectors on the saved polygon show the 24.6° tilt is preserved.
- **Classification:** `VERIFIED_CORRECT`.
- **Action:** **no change.** DB district `BU KADRA` is consistent with sub-community convention; the commit title "Meydan plot" was shorthand for "Meydan Horizon area". Changing the district label would break consistency with the adjacent plot 6117209.

### Plot 6817016 — JVC (labelled Al Barsha South 4)
- **Current centroid:** 25.054, 55.208
- **Polygon:** clean axis-aligned 49.9 × 34.1 m rectangle, area 1701 m² = declared 1700 m² (exact).
- **Nominatim:** "Mayar Boulevard, Al Barsha South 4, **Jumeirah Village Circle**, Dubai". Geometry confirmed to be on the Al Barsha South 4 / JVC border area — Mayar Boulevard is the arterial between the two.
- **Seed provenance (commit `48c9f38`, `scripts/seed-jvc-6817016.ts`):** geometry **pixel-extracted from `JVC13AHRG001C_09.09.2024.pdf` Trakhees site plan**, calibrated against 4 UTM grid crosshairs, built as a 50 × 34 m rectangle matching the declared 1700 m² exactly, reprojected WGS84 → the saved polygon. Commit note: *"Centroid 55.2078 E, 25.0536 N (inside Jumeirah Village Community) ✓"*. The script then deliberately upserted on `(Dubai, AL BARSHA SOUTH FOURTH, 6817016)` — i.e. founder chose the RERA community label, not the colloquial marketing label "JVC".
- **Classification:** `VERIFIED_CORRECT`.
- **Action:** **no change.** Geometry matches the site plan and Nominatim's address reading. The district label `AL BARSHA SOUTH FOURTH` was founder's deliberate choice at seed time (documented in the commit note) and changing it without explicit founder request would override that intent.

## Summary

| plotNumber | Action | Classification |
|---|---|---|
| 1010469 | **BLOCKED — no source** | `WRONG_GEOMETRY_UNKNOWN_SOURCE` |
| 5912323 | no change (reference, untouched) | `NOT_IN_SCOPE` |
| 6117209 | no change | `VERIFIED_CORRECT` |
| 6117231 | no change | `VERIFIED_CORRECT` |
| 6817016 | no change | `VERIFIED_CORRECT` |

**Zero `UPDATE` statements were executed.** No rows in `Parcel` were modified during this investigation.

## If the map still shows misalignment

If any of the four verified plots (5912323 / 6117209 / 6117231 / 6817016) still visibly misaligns against the satellite layer in the Vercel preview, the root cause is **not** in `Parcel.geometry`. The polygons inspected here match declared areas, sit in the correct Nominatim-reported neighbourhoods, and come from either pixel-extracted PDFs or official affection plans per git history.

Candidate alternative causes (each explicitly out of scope for this task; would need `src/` code changes):

1. **3D extrusion base offset** — `loadZaahiPlots` in `src/app/parcels/map/page.tsx` applies setback calculations before extrusion. If setbacks for an unusual land use are wrong, the visible footprint sits inside the real plot boundary, which visually reads as "misalignment."
2. **Basemap registration** — the current basemaps are Esri World Imagery (satellite) and CARTO (light/dark), all raster. These tiles use WGS84 standards but display imagery has its own georeferencing error (typically < 5 m). In a dense urban zone this can be enough to read as "off" even when data coordinates are perfect.
3. **Building-style SIGNATURE podium/body/crown overlay** — the ZAAHI Signature 3D style renders a stepped extrusion inside the plot polygon. If the centroid calculation for the stepped levels is off, the visible building sits off-centre inside the (correct) polygon outline.

None of these three are data issues. They are rendering decisions documented in `CLAUDE.md § "Правила 3D моделей (ZAAHI Signature)"` and are not to be touched without founder approval.

## Rollback

**Not applicable.** This commit adds a diagnostic script + documentation only. No rollback needed — nothing was changed in the `Parcel` table.

If a future fix is applied on top of this investigation and needs to be rolled back, the pre-fix polygon for each plot is reproducible by running the original seed script(s) — all of which are idempotent upserts per the repo convention:

- Plot 1010469: `npx tsx -r dotenv/config scripts/seed-dubai-islands-1010469.ts dotenv_config_path=.env.local`
- Plot 5912323, 6117209: `npx tsx -r dotenv/config scripts/seed-new-listings.ts dotenv_config_path=.env.local`
- Plot 6117231: `npx tsx -r dotenv/config scripts/seed-meydan-6117231.ts dotenv_config_path=.env.local`
- Plot 6817016: `npx tsx -r dotenv/config scripts/seed-jvc-6817016.ts dotenv_config_path=.env.local`

## Verification checklist for founder

Open the Vercel preview from this branch (`fix/geometry-misalignment`) and load `/parcels/map`, then for each plot:

1. **Plot 1010469 (Dubai Islands)** — click the plot on the map. Expected: SidePanel shows "Plot 1010469 · DUBAI ISLANDS". Expected visual: rectangle sits at roughly 25.288° N, 55.300° W (on the western edge of Dubai Islands 1 / Nakhlat Deira). **This is the plot I could not fix — if it clearly belongs on a different island, please provide the `DIA-RE-0167` PDF or the correct corner coordinates.**
2. **Plot 5912323 (Al Furjan)** — reference. Should look correct.
3. **Plot 6117209 (Bu Kadra)** — pentagon. Should sit within Bu Kadra sub-community of Meydan area.
4. **Plot 6117231 (Bu Kadra, RC1/20 Block K)** — tilted rectangle. Should sit within Bu Kadra, tilted ~25° from east.
5. **Plot 6817016 (AL BARSHA SOUTH FOURTH, colloquially JVC)** — rectangle. Should sit on Mayar Boulevard at the JVC/Al Barsha South 4 border.

If any of 2-5 look misaligned, the cause is **rendering**, not data (see "If the map still shows misalignment" above) and requires a separate investigation.

## Files in this commit

- `scripts/audit-geometry-misalignment.ts` — reusable diagnostic (prints centroid, bbox, polygon ring with per-vertex edges for any candidate parcel set). Safe to re-run any time; read-only.
- `prisma/migrations/manual/20260416_geometry_misalignment_fix/README.md` — this document.

No changes to `src/`, `prisma/schema.prisma`, `package.json`, or any rendering-related file.
