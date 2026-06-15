# Archetype 3D — method research (2026-06-15, research-only)

Procedural JS geometry hit its ceiling (residential/mixed-use OK as simple volumes;
hotel "too solid, not a hotel"). This evaluates every realistic path to make
**recognizable per-category archetype building models**. No code changed.

## What's actually available here (probed, not assumed)

| Capability | State |
|---|---|
| **Meshy Pro** | key present, **balance = 200 credits**. Image-to-3D = 30 cr/job (2–10 min); text-to-3D cheaper. Proven in prod (hero GLBs: burj-al-arab, royal-atlantis, ciel-tower, … via `MESHY_PIPELINE_GUIDE.md`). |
| **Blender 5.1.2** | installed, `bpy` headless works (`blender -b -P script.py`). |
| **GPU** | NVIDIA GTX 1070, **8 GB VRAM**, driver 580, CUDA 13. (Pascal, no tensor cores.) |
| **torch / trimesh** | not installed (installable). |
| Internet | open — Poly Haven / Kenney / Sketchfab APIs all reachable (200). |
| Image-gen key (Gemini "Nano Banana" / OpenAI) | **none locally** (`.env.local` has no OpenAI/Gemini image key). |
| **Live GLB→map pipeline** | `src/app/parcels/map/buildings/BuildingGlbLayer.ts` — already loads a GLB at a WGS84 centroid with `scaleFactor` + `rotationDeg`, in prod. The archetype "one model, scaled per plot" concept is already supported infra. |

## Concept check (founder's "one model per category, scaled to footprint")

**Confirmed — and the infra already exists** (BuildingGlbLayer pattern: one GLB → instanced per plot, scaled to footprint XY + height Z, rotated to plot orientation, recoloured). One caveat: a single fixed model uniformly fit to wildly different footprint aspect ratios will stretch (a square hotel on a long thin plot). Mitigation: uniform-fit + center (mild), or 2–3 variants per category (wide / square / tall) picked by footprint aspect. Recommend starting with 1/category, add variants only where stretch is visible.

## Method comparison

| Method | Quality | Time | Cost | Available to me |
|---|---|---|---|---|
| **Meshy text-to-3D** (category prompt, low-poly) | recognizable, category-distinct | ~3–8 min + Blender cleanup | ~5–10 cr each | ✅ Pro |
| **Meshy image-to-3D** (from a reference image) | highest control of the look | ~5–10 min + cleanup | 30 cr/job | ✅ (needs ref images) |
| **Image-gen → Meshy image-to-3D** | best art-direction | + image step | img-gen $ + 30 cr | ⚠️ no image-gen key here |
| **Blender headless procedural (bpy) + render-preview loop** | medium-high, schematic, full control; **adds the visual feedback the JS path lacked** | high (script per category) | free | ✅ Blender 5.1.2 + GPU render |
| Blender manual modeling | highest | founder/artist labor | free | ❌ no GUI for me |
| Local TripoSR (image→3D) | low–med, blobby single-view | med setup | free | ⚠️ GTX 1070 marginal (~6–8 GB) |
| Local Trellis / Hunyuan3D-2 | high | — | free | ❌ need 12–24 GB VRAM (8 too small) |
| **Kenney CC0 low-poly city kit** | medium, stylized — **matches the schematic massing aesthetic** | instant | **free, CC0 (no attribution)** | ✅ download |
| Sketchfab CC0 buildings | varies | per-asset vetting | free (CC0 only) | ⚠️ needs Sketchfab OAuth token + per-model licence check |
| Poly Haven | n/a — no building archetypes (HDRIs/textures/props) | — | — | ✅ reachable but not useful |

Key reality checks: local high-end gen (Trellis/Hunyuan) **won't fit 8 GB**; only TripoSR-class would run and its quality is low. Photoreal Meshy, once **recoloured to a single legend colour** (to match the schematic style), loses its texture detail — but its **geometric** detail (window grid, roof, wings) still reads under lighting. So a *low-poly* generated/library model recoloured to legend colour is the sweet spot, not a photoreal one.

## Recommendation

**Hybrid: Meshy text-to-3D (low-poly, category-specific prompts) for the distinctive
types + Kenney CC0 as a free baseline + Blender headless as the normalize/preview
glue.** Pipeline:

1. **Generate** one low-poly model per category — Meshy text-to-3D with a category
   prompt ("low-poly modern hotel, regular window grid, entrance canopy, flat roof",
   "low-poly hospital, H-plan wings, main entrance", "low-poly school campus,
   courtyard, low wings"). For categories where a Kenney CC0 asset already nails the
   shape, use that (free) instead.
2. **Normalize in Blender headless** (`bpy`): center at origin, drop to z=0, orient,
   scale to a unit box, decimate to low-poly, export GLB. **Render the GLB to a PNG
   headlessly in the same step** → this is the visual-feedback loop that fixes the
   "blind sculptor" ceiling: I (and founder) see each model before it ships.
3. **Place** via the existing BuildingGlbLayer instancing pattern: one GLB/category,
   scaled to each plot's footprint (XY) + data height (Z), rotated to the plot OBB,
   clamped inside the plot — reusing all the proven anchor/clamp work.
4. **Recolour** every mesh of the GLB to the land-use legend colour (flat, opaque,
   the same material rules as the current archetype layer) so it stays on-brand and
   consistent with the approved residential/mixed-use look — geometry gives the
   recognizability, colour gives the brand.

Why this over alternatives: Meshy is Pro + proven in prod; Kenney is free/instant and
its low-poly style already matches the schematic aesthetic; Blender adds the missing
preview loop and the GLB→map pipeline already exists. Local gen and manual modeling
are ruled out (hardware / no-GUI).

Keep procedural for the already-fine simple types (industrial shed, agricultural barn,
future-dev flat) — no need to regenerate those.

## What I need from founder (before I build)

1. **Money approval (Autonomy-v2 STOP).** Meshy = paid credits. 200 now ≈ 6 image-to-3D
   OR ~20 text-to-3D jobs — enough for ~one pass of 7 categories with little iteration.
   For proper iteration, please approve either (a) spending from the current 200, and/or
   (b) a top-up (~300–500 credits). **I will not spend any Meshy credits without your OK.**
2. **Image-gen key (optional, for image-to-3D art-direction):** there's no Gemini
   ("Nano Banana") / OpenAI image key in `.env.local`. If you want image-driven control
   (cleaner than text-to-3D), provide an image-gen API key OR drop reference images into
   a folder. Text-to-3D needs neither.
3. **Sketchfab (only if we want their CC0 catalog):** a Sketchfab account + API token.
   Likely unnecessary if Meshy + Kenney cover it.
4. **Two taste calls:** (a) keep the schematic single-legend-colour recolour, or allow
   richer materials? (b) 1 model/category (may stretch on odd plots) or 2–3 aspect
   variants/category?

## How a finished model plugs into the archetype layer

- **Plot fit:** load GLB once; per plot create a group at the footprint centroid's
  MercatorCoordinate (existing per-building anchor), scale GLB bbox → footprint width/
  depth (XY) and data height (Z), rotate to the plot OBB angle, clamp to the plot ring.
- **Colour:** traverse the GLB meshes and replace materials with the legend colour
  (`ZAAHI_LANDUSE_COLOR`), same Lambert + emissive + edge/line treatment (variant G)
  used today → on-brand, opaque body.
- **Opacity / height:** opacity 1 solid (as ratified); height strictly from GFA/floors
  (data truth) by scaling Z, never inventing height.
- **LOD / parity:** same as now — show at zoom ≥ 14, fill-extrusion fallback below;
  clicks/hover via the flat `ZAAHI_PLOTS_FILL`; ghost-kill of the flat fill.

**STOP — research only. Nothing built, no credits spent, no merge, tiles untouched.**
Awaiting your go + the approvals above.
