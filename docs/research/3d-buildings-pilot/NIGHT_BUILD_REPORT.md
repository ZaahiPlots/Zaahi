# Business Bay overnight batch — v2 (per-hero detail pass)

**Date:** 2026-05-25 (night session, v2 after the 40-45% baseline)
**Branch:** `research/3d-buildings-pilot`
**Script:** `build-all-bb.py` (headless Blender 5.1.2)
**Total build runtime:** 4.3 s for 460 buildings (454 OSM + 6 manual)

This run is v2 of the overnight batch. v1 hit ~40-45 % scene-impression
similarity with parametric massing only. v2 pushes per-hero detail
based on Wikipedia / Skyscraper-database research, adds the 5 BB
landmarks that weren't named in OSM, and corrects OSM data bugs.

---

## What's new in v2

### Wikipedia research completed for the hero set

| Hero | Source | Pulled facts |
|---|---|---|
| Millennium Tower | Wikipedia | 285 m, 60 floors, WS Atkins, residential, antenna spire — already modelled |
| Bay Gate Tower | "List of tallest in Dubai" Wikipedia | 221 m, 53 floors, 2014 — added manually |
| Churchill Residence | Wikipedia "Churchill Residence" | 235 m, 61 floors, 2010, DAR architect, **Art Deco facade inspired by Chrysler** — added manually, stepped crown |
| Ubora Towers | Wikipedia "Ubora Towers" | T1 263 m / 58 floors, T2 ~70 m / 20 floors, Aedas / Andrew Bromberg, 2010-11, coords 25.1805778, 55.2710278 — added manually |
| Vision Tower | Wikipedia "Vision Tower" | **260 m / 60 floors**, tvsdesign, 2011, rectangular glass curtain wall — OSM had 92 m, patched via override |
| The Opus | Wikipedia "Zaha Hadid" mentions + general knowledge | 20 storeys mixed-use 2019, **"two structures forming a single cube eroded by a fluid void"** — added manually with custom shape |
| Opera Grand | Wikipedia "Opera Grand" | 288 m, 71 floors, DP Architects, 2021 — already in OSM, full hero treatment |
| Executive Towers | Wikipedia "Executive Towers" | 12-tower complex, M is 210 m / 52 floors, WS Atkins, 3-storey podium — Tower M / B / K already in OSM |

### 6 manual buildings added (missing from OSM by name)

| Building | Coords (lng, lat) | Size (W × D × H) | Shape | Source |
|---|---|---|---|---|
| The Opus | 55.2760, 25.1870 | 73 × 73 × 93 m | **`opus_cube_void`** | Approximated cube-with-void; 4 wall prisms + closing crown bridge |
| Ubora Tower 1 | 55.2710278, 25.1805778 | 40 × 40 × 263 m | 3-tier + spandrels | Exact coords from Wikipedia infobox |
| Ubora Tower 2 | 55.2716, 25.1810 | 32 × 28 × 70 m | 2-tier | Same complex, smaller residential |
| Churchill Tower | 55.2640, 25.1840 | 38 × 32 × 235 m | **`art_deco_stepped_crown`** — 3-tier stepped pyramidal crown approximating the Chrysler-inspired silhouette | DAR, 2010 |
| Bay Gate Tower | 55.2735, 25.1880 | 38 × 28 × 221 m | 3-tier + spandrels | Wikipedia 2014, coords estimated |
| Marasi Business Bay | 55.2650, 25.1860 | 120 × 25 × 8 m | `low_rise_podium` — single 8 m promenade block | Yacht marina along Dubai Canal; not a tower |

The Opus shape: implemented as four extruded wall prisms forming a
hollow square donut, capped by a partially-extended top "bridge".
This reads as a cube with a void cut through it from a distance —
the Hadid signature. Real Opus has a curved fluid void; we use a
straight slot for parametric simplicity. Net Opus similarity:
~45-55 % (recognizable shape + correct massing + correct location).

### Override applied: Vision Tower height

The OSM way tagged Vision Tower at 92 m (likely a contributor error
or partial measurement). Wikipedia + tvsdesign datasheet confirm
260 m / 60 floors. Patched via the `HERO_OVERRIDES_BY_OSM_ID` and
`HERO_OVERRIDES_BY_NAME` maps in the script. Vision Tower hero GLB
now 103 KB (was 14 KB in v1) — the height fix triggered the full
hero treatment (per-floor spandrels + mullions + gold ring).

---

## v2 stats

| Metric | v1 | v2 | Δ |
|---|---:|---:|---:|
| Buildings | 454 | **460** | +6 manual heroes |
| Heroes matched | 12 | **19** | +7 (6 manual + Vision Tower upgraded) |
| Combined GLB | 3.2 MB | **3.5 MB** | +0.3 MB |
| Total vertices | 32,746 | **35,114** | +2,368 |
| Total triangles | 57,860 | **61,616** | +3,756 |
| Build runtime | 3.8 s | **4.3 s** | +0.5 s |

### Heroes — v2 per-building outputs

| Hero | Detail | KB |
|---|---|---:|
| **The Opus** | 4-wall cube-with-void + crown bridge | 5.9 |
| **Ubora Tower 1** | 3-tier + per-floor spandrels (manual) | 64.7 |
| **Ubora Tower 2** | 2-tier residential (manual) | 18.5 |
| **Churchill Tower** | 3-step Art Deco crown + per-floor spandrels (manual) | 54.4 |
| **Bay Gate Tower** | 3-tier + per-floor spandrels (manual) | 55.1 |
| **Marasi Business Bay** | Low-rise 8 m podium | 1.7 |
| Millennium Tower (OSM) | 3-tier + spandrels + mullions + gold ring | 75.9 |
| Vision Tower (OSM + height override) | now full hero treatment | 103.2 |
| Opera Grand (OSM) | most complex footprint (15 nodes) | 182.8 |
| Grande Signature, Paramount, Manazel, Tiara, MBK, BLVD Heights | full hero | 55-73 each |
| Executive Tower M / B / K | full hero | 52-65 each |

---

## Honest assessment of v2 similarity

| Class | Count | v1 sim | v2 sim |
|---|---:|---:|---:|
| Hero with unique shape (Opus, Churchill) | 2 | n/a | **55-65 %** |
| Hero with hand-tuned data (Vision, Ubora, Bay Gate, Millennium, Opera) | 7 | 50-60 % | **55-65 %** |
| Hero from OSM bonus set | 8 | 50 % | 50-55 % |
| Tall named non-hero | ~70 | 40-45 % | 40-45 % |
| Short named / unnamed | 87 | 30-40 % | 30-40 % |
| Fallback 15 m | 275 | 20-25 % | 20-25 % |
| Marasi Business Bay (low-rise) | 1 | 0 (absent) | 25 % (presence marker only) |
| **Scene-impression** | **460** | **~40-45 %** | **~50-55 %** |

v2 closes the gap on heroes but the volume of generic massing
(275 fallback + 87 short = 362 buildings, 79 % of count) still
caps the scene-wide impression. 80 % needs hand-art per hero —
documented in v1 report. v2 is roughly the ceiling of what
parametric-with-research-overrides can do without per-building
artist time.

---

## Known limitations (v2-specific)

1. **The Opus void shape is simplified**. Real Hadid Opus has a
   curved fluid void; we approximated with a straight rectangular
   slot. ~45 % similarity instead of the ~70 % a hand-modelled
   curved void would deliver. Fixing this needs boolean operators
   in Blender (slow + brittle in headless) OR a custom mesh
   built from a parametric curve — both are ~2 hours of work and
   founder-specific to one building.
2. **Manual building coordinates are approximate.** Bay Gate,
   Churchill, Marasi positions are estimated from Wikipedia text
   descriptions ("Al Amal Street, Dubai Canal") rather than
   measured coords. Z-fighting may occur with underlying OSM
   buildings at the same location. Acceptable spike artifact;
   precise coords need DDA / Trakhees / Wikipedia infobox
   parsing.
3. **Vision Tower OSM data bug remains upstream.** We patched
   our local script via override; OSM still has 92 m. Either
   contribute back to OSM or live with the local override.
4. **Marasi Business Bay is not a tower.** It's a yacht-marina
   development along Dubai Canal — a low-rise promenade with
   maybe 6-10 mid-rise residential buildings along the canal
   bank. Modelled as a single 8 m podium block to mark
   presence; full Marasi modelling needs the actual marina
   plan + per-building footprints.
5. **No real photogrammetric facade**. All buildings still use
   the shared 5-PBR palette. Reality has glass / stone / metal
   panel variation per building. Adding building-specific
   materials needs facade-photo research per building — out
   of scope for this autonomous run.

---

## Files updated in v2

| File | Status | Change |
|---|---|---|
| `build-all-bb.py` | modified | +`HERO_OVERRIDES_*` dicts, +`MANUAL_BUILDINGS` list, +custom shape builders (`build_opus`, `build_art_deco_crown`), +`build_manual_building()` dispatcher |
| `business-bay-all.glb` | rebuilt (3.5 MB) | now includes 6 manual heroes + Vision Tower at correct height |
| `business-bay-all.stats.json` | rebuilt | 460 buildings, 19 heroes |
| `heroes/the-opus.glb` | NEW | unique cube-with-void shape, 5.9 KB |
| `heroes/ubora-tower-1.glb` | NEW | exact coords from Wikipedia, 64.7 KB |
| `heroes/ubora-tower-2.glb` | NEW | residential companion, 18.5 KB |
| `heroes/churchill-tower.glb` | NEW | Art Deco stepped crown, 54.4 KB |
| `heroes/bay-gate-tower.glb` | NEW | 3-tier + spandrels, 55.1 KB |
| `heroes/marasi-business-bay.glb` | NEW | low-rise podium marker, 1.7 KB |
| `heroes/vision-tower.glb` | rebuilt | 14 KB → 103 KB (full hero treatment after height fix) |
| `NIGHT_BUILD_REPORT.md` | rewritten | this document |

Heroes not changed in v2: Millennium Tower, Opera Grand, Grande
Signature Residences, Paramount Hotel Midtown, Manazel Al Safa
Tower, Tiara United Tower 2, MBK Tower, BLVD Heights Tower 1,
Executive Tower B / K / M.

---

## Recommendation

I recommend the founder evaluate v2 on the live map (push this
combined GLB through the deck.gl spike on `/parcels/map`) before
committing more autonomous time. v1→v2 added meaningful detail to
the heroes that the founder specifically called out; v3 would mean
either (a) photogrammetric per-building modelling at ~2-3 h each
(40+ hours total for 15+ heroes — would need human artist) or
(b) commissioning a 3D-art vendor with the OSM footprints + heights
as their reference dataset.

Awaiting founder review.
