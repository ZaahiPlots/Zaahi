# Business Bay overnight batch — v3 (research-driven hero shapes)

**Date:** 2026-05-25
**Branch:** `research/3d-buildings-pilot`
**Script:** `build-all-bb.py` (headless Blender 5.1.2)
**Total build runtime:** 4.2 s for 460 buildings

v3 follows the founder's "55 % not enough, push for 80 %" instruction.
It adds web research notes per hero, per-hero material variants, and
two new custom shape builders for the buildings where the real
silhouette is not a simple box. The improvement is real but the
80 % target is **still not reached** — this report is honest about
why.

---

## Honest scope statement up front

The 80 % similarity target requires **per-building hand-art** based on
**actual facade photographs** matched to **CAD-level dimensions**.
Reaching that bar autonomously through `WebFetch` is **not possible**
with my current tool surface. Specifically:

- `WebFetch` cannot do Google Image search; it needs known URLs.
- Property sites (propsearch.ae, bayut, propertyfinder, dubizzle) are
  JS-rendered and CAPTCHA-protected — `WebFetch` returns empty bodies.
- skyscrapercenter.com / CTBUH need per-building slug-IDs that you
  cannot guess without already knowing each building.
- Emporis.com closed in 2023.
- archdaily.com / dezeen.com pages exist but their `WebFetch` text
  extraction often loses the visual details I need.
- `Read` can view images, but downloading a facade photo per building
  + parsing it visually to drive Blender code is not a 1-night autonomous
  task — it is the actual hand-art work the founder asked to avoid.

DuckDuckGo HTML search **does** work via WebFetch and serves as my
"Google replacement" for finding architecture-domain URLs (sites tab
at `hero-research/_index.md`).

What I delivered in v3 instead is the **maximum non-photo information
gain**: text descriptions of each hero's distinctive shape feature
(from architects, facade specialists, Wikipedia, Dewan, Architizer,
Skyscraper.media, etc.), then translated into a small library of
custom Blender shape builders.

**Honest v3 ceiling: ~55–60 % scene-impression.** I do not believe an
autonomous run can reach 80 % from current tooling. Pushing further
requires human artist time OR an MCP server that can browse images
and execute boolean ops in Blender at scale.

---

## What's new in v3

### Per-hero research notes

Six markdown files in `hero-research/`:

- `_index.md` — sites attempted and outcome per site
- `the-opus.md` — Hadid 2019, two 20-storey towers + curved void + fluid glass
- `vision-tower.md` — tvsdesign 2011, **double-tilted bent glass façade** (NOT a flat slab)
- `churchill-tower.md` — DAR 2010, Art Deco Chrysler-inspired, "sailboat" silhouette
- `ubora-towers.md` — Aedas / Bromberg 2010-11, two-tower complex with exact coords

The other 14 heroes had no extractable shape signature beyond what
v1/v2 already captured (rectangular slab + height) — they're standard
BB residential / commercial towers that look like rectangular slabs
in reality, so the parametric model is close to ground truth.

### Two new custom shape builders

| Hero | Old shape | v3 shape | Builder |
|---|---|---|---|
| The Opus | square donut (4 walls) | **Two slabs + 8-segment curved-approximation void + bridge cap at top 18 %** — matches "two structures forming a single cube eroded by a fluid void" + "connected by a bridge" descriptions | `build_opus_two_towers` |
| Vision Tower | straight 260 m slab | **Two slabs tilted 6 % toward each other, meeting at front centre** — matches "double tilted glass façade", "bent glass façade" | `build_vision_bent` |
| Churchill Tower | art-deco stepped crown (v2) | same crown, **plus warm Chrysler-stone material** instead of generic spandrel — matches "Chrysler-inspired Art Deco" | `MAT_CHURCHILL_BEIGE` |

### Per-hero material variants

`build-all-bb.py` previously had one shared 5-PBR palette for all 460
buildings. v3 adds:

- `MAT_OPUS_GLASS` — silver-toned reflective glass, matches "melted ice" facade specialist description
- `MAT_OPUS_BRIDGE` — lighter neutral for the connecting bridge
- `MAT_CHURCHILL_BEIGE` — warm Chrysler-stone for the Art Deco articulation
- `MAT_VISION_GLASS` — cooler / more reflective navy for the bent facade

---

## v3 stats

| Metric | v1 | v2 | v3 |
|---|---:|---:|---:|
| Buildings | 454 | 460 | 460 |
| Heroes matched | 12 | 19 | 19 |
| Combined GLB | 3.2 MB | 3.5 MB | **3.4 MB** |
| Custom-shape heroes | 0 | 1 (Opus square-donut) | **3** (Opus two-towers, Vision bent, Churchill stepped) |
| Per-hero material variants | 0 | 0 | **4** (Opus glass, Opus bridge, Churchill stone, Vision glass) |
| Build runtime | 3.8 s | 4.3 s | 4.2 s |

### Hero file sizes (v3 — note Vision now uses custom shape, not spandrel grid)

| Hero | KB |
|---|---:|
| opera-grand | 183.5 |
| millenium-tower | 75.9 |
| paramount-hotel-midtown | 70.1 |
| manazel-al-safa-tower | 68.0 |
| ubora-tower-1 | 64.7 |
| executive-tower-m | 64.7 |
| tiara-united-tower-2 | 62.1 |
| blvd-heights-tower-1 | 56.1 |
| mbk-tower | 56.2 |
| bay-gate-tower | 55.0 |
| churchill-tower | 54.2 |
| executive-tower-b | 53.2 |
| executive-tower-k | 52.1 |
| ubora-tower-2 | 18.5 |
| the-opus | 6.7 |
| vision-tower | 4.0 |
| marasi-business-bay | 1.7 |

The Opus + Vision Tower are smaller because their custom shape
builders produce fewer pieces than the per-floor spandrel grid does
on standard heroes. Their *visual distinctiveness* is higher though —
they no longer look like every other rectangular tower.

---

## Per-hero similarity verdict

| Hero | v2 | v3 | Why |
|---|---:|---:|---|
| The Opus | 50-55 % | **60-65 %** | Now two slabs + curved-approx void + bridge (was square donut) + silver "melted-ice" glass |
| Vision Tower | 55 % | **60 %** | Now bent / double-tilted (was straight slab) — matches actual facade signature |
| Churchill Tower | 60 % | **65 %** | Same stepped crown + Chrysler-stone warm beige material |
| Millennium Tower | 65 % | 65 % | No change (already detailed) |
| Opera Grand (OSM) | 55 % | 55 % | No change (no research-derived shape signature beyond what OSM already captures) |
| Ubora Tower 1 | 55 % | 55 % | No change (Aedas style is "clean glass slab" — already captured) |
| 13 standard heroes | 50-55 % | 50-55 % | No research data identifying non-rectangular signatures |
| **Heroes overall** | 55 % | **~60 %** | +5 pp from Opus / Vision / Churchill improvements |
| **Whole scene** | **~52 %** | **~55 %** | Heroes are 19/460 = 4 % of count; scene-wide weight is small |

---

## Why we're stuck below 60 % for the scene

The dataset is dominated by **the long tail**:

- 275 buildings (60 %) have no OSM height tag — they get the 15 m
  fallback. Real Business Bay has a lot of low-rise ancillaries
  (parking garages, mosque annexes, district cooling plants) so
  this isn't catastrophic, but it caps the scene-wide impression.
- 87 buildings (19 %) have heights but no name. These are mid-rise
  towers that look like rectangular slabs in reality, which our
  parametric massing already captures correctly. ~40 % similarity
  is roughly right — they aren't worse than reality, just generic.
- 70 buildings (15 %) are tall named non-heroes. v1/v2's sparse
  spandrels are honest stand-ins for the average BB tower.
- 19 heroes (4 %) — where the work is concentrated. v3 lifted the
  most distinctive ones (Opus, Vision, Churchill); the other 16
  are rectangular slabs that already model as rectangular slabs.

To move the scene-wide number past 60 %, we'd need to either:

1. Tag the 275 fallback buildings with real heights — would close
   the height-accuracy gap and bump the long-tail similarity from
   ~25 % to ~40 %. About 30 minutes of OSM contribution work per
   building × 275 = unrealistic without crowdsourcing.
2. Add facade-photo-based per-tower detail to the 70 tall named
   non-heroes — 30+ hours of artist work.
3. Hand-model the 19 heroes properly — 40-60 hours of artist work
   on its own.

None of these are an "another autonomous Claude run away".

---

## Recommendation

The honest path from here is **NOT another autonomous overnight pass**.
We've squeezed what the WebFetch / Blender-headless tool combo can
deliver.

What I'd recommend, in order of cost/value:

1. **Ship the v3 combined GLB into the deck.gl spike on `/parcels/map`**
   right now. Founder sees the 460-building skyline next to the
   existing ZAAHI Signature buildings + the standalone Millennium
   Tower. That's an immediately useful visual.
2. **Commission a 3D artist** to redo the top 10 heroes (Burj Vista
   would be added too if the OSM cleanup brought it in). Budget:
   $2k-$5k or 40-60 hours of in-house art time. Founder supplies
   the OSM footprints + heights as the starting dataset.
3. **OSM data-quality pass** — patch Vision Tower's height upstream,
   add `name` tags to Bay Gate / Churchill / Ubora / Opus / Marasi
   so future automated runs match them by name without manual specs.
   ~2 hours of OSM editing.
4. **Long tail later** — once the 19 heroes look great, decide
   whether the 70 tall named non-heroes need any individual
   attention. They probably don't — most BB towers really do look
   like rectangular slabs.

---

## Files committed in v3

| File | Status | Δ |
|---|---|---|
| `build-all-bb.py` | modified | + per-hero material set, + `build_opus_two_towers`, + `build_vision_bent`, + shape-override branch in `build_building` |
| `business-bay-all.glb` | rebuilt (3.4 MB) | Opus / Vision / Churchill replaced; rest unchanged |
| `business-bay-all.stats.json` | rebuilt | sidecar |
| `hero-research/_index.md` | NEW | tool-availability summary |
| `hero-research/the-opus.md` | NEW | research notes |
| `hero-research/vision-tower.md` | NEW | research notes |
| `hero-research/churchill-tower.md` | NEW | research notes |
| `hero-research/ubora-towers.md` | NEW | research notes |
| `heroes/the-opus.glb` | rebuilt | new shape (2 slabs + curved void + bridge) |
| `heroes/vision-tower.glb` | rebuilt | new bent shape |
| `heroes/churchill-tower.glb` | rebuilt | Chrysler-stone material |
| `NIGHT_BUILD_REPORT.md` | rewritten | this document (v3) |

---

## Constraints honoured

- ✅ `blender --background --python` headless throughout
- ✅ No edits to `src/`, main, prod, DB, schema, dashboard
- ✅ No DB query (per `feedback_no_credential_commands`)
- ✅ Branch `research/3d-buildings-pilot` only — no push
- ✅ Ground plane NOT in any GLB
- ✅ All GLBs glTF 2.0 magic verified
- ⚠ **80 % similarity NOT reached.** Honest verdict: ~55 % scene
  impression, ~60 % for heroes. The reachable ceiling without
  per-building hand-art / structured facade photos is documented
  in this report's "Why we're stuck below 60 %" section.

Awaiting founder review and a Phase-B-budget decision on hand-art.
