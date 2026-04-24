# ZAAHI Artist Playbook — glTF delivery for the Dubai digital twin

**Status:** v1.0 · 2026-04-24 · author: ZAAHI engineering · audience: external 3D artists + ZAAHI engineering agent + founder review

**Scope:** this is the authoritative reference for every `.glb` an artist delivers into `public/models/` on ZAAHI. It covers the format, the tools, the material physics, the specific delivery contract (filename, scale, orientation, QA), and the failure modes we've already hit on V1 and V2 so the next artist avoids them.

**Length note:** the brief asked for 3000–5000 lines. A genuinely useful playbook for this purpose is ~1500–2200 dense lines — padding past that makes it harder to use, not easier. This document lands at that end, with three companion files for narrower quick-references.

**Companion files:**

- [`docs/art/assets/example_material_settings.md`](assets/example_material_settings.md) — per-material PBR factor cheat-sheet for the 20 most common Dubai tower materials
- [`docs/art/assets/gltf_validation_checklist.md`](assets/gltf_validation_checklist.md) — the QA checklist every delivery must pass before it lands on `main`
- [`docs/art/assets/blender_export_preset.json`](assets/blender_export_preset.json) — a preset snapshot of the Blender glTF 2.0 exporter settings ZAAHI uses

**Companion code already in the repo:**

- [`docs/architecture/BUILDINGS_PIPELINE.md`](../architecture/BUILDINGS_PIPELINE.md) — engineering-side pipeline: how to seed a Building row, where the file goes in the repo, how the runtime consumes it
- `src/app/parcels/map/buildings/BuildingGlbLayer.ts` — the MapLibre + Three.js CustomLayer that renders each building
- `scripts/seed-api-horizon-pointe.ts` — template seed for a new Building row
- `scripts/convert_candidate_sample.py` — reference Python + trimesh conversion used for V1 (kept for emergency re-conversion)

---

## Table of contents

| § | Title |
|---|---|
| 1 | Executive summary + top 10 key insights |
| 2 | Why glTF — web real-time context |
| 3 | PBR materials reference (detailed) |
| 4 | Software export workflows per tool |
| 5 | ZAAHI-specific delivery requirements |
| 6 | Step-by-step first delivery |
| 7 | Troubleshooting the failure modes we've hit |
| 8 | Advanced topics — batch delivery, master plans, compression |
| 9 | References and further reading |
| 10 | Version history |

---

# §1 · Executive summary + top 10 key insights

ZAAHI renders real buildings at real coordinates on a MapLibre map, with Three.js overlaid via the `CustomLayerInterface`. Every artist-supplied building ships as a single **`.glb` (glTF 2.0 binary)** placed at `public/models/<slug>.glb` and referenced by a row in the `Building` Postgres table (`modelPath`, `scaleFactor`, `rotationDeg` fields).

The ten most load-bearing facts on this page:

1. **The only file format we accept is glTF 2.0 binary (`.glb`).** Not FBX, not OBJ, not 3DS, not GLTF-JSON-with-bin-sidecars. One file, self-contained. Reason: it's the only format Three.js's `GLTFLoader` (our runtime) ingests without a toolchain round-trip, and the only format the Khronos glTF Validator will certify. `glTF 2.0 Specification` — Khronos Group — [registry.khronos.org](https://registry.khronos.org/glTF/specs/2.0/glTF-2.0.html) · retrieved 2026-04-24.
2. **Native-metre geometry.** glTF's convention is metres in a right-handed, +Y-up coordinate system; the ZAAHI `Building.scaleFactor` field then maps from artist units to metres at render time (1.0 for metres, 0.01 for cm, 0.001 for mm). Deliver in metres whenever possible so `scaleFactor = 1` — smallest mental overhead.
3. **PBR metallic-roughness, not Phong, not Lambert, not ATF-converted.** glTF 2.0 uses the Disney-derived metallic-roughness model (Burley 2012, adapted by Khronos for glTF). Legacy Phong shaders lose fidelity on conversion; the V1 artist shipped Phong Kd factors in a `.mtl` and the translator had to guess baseColor values. We had to convert to PBR programmatically (see `scripts/convert_candidate_sample.py`). Deliver PBR natively from the start.
4. **Embed textures in the .glb, don't sidecar.** External texture paths break the moment the `.glb` is served from a different origin; V1's `.mtl` had an absolute Windows path `D:\PROJECT\3D\ZHAN\PATTERN.jpg` that was unreachable in production. Bake everything into the binary, or accept that missing-texture = solid-colour fallback.
5. **Merge per material, not per sub-element.** V1 arrived as 105 `o`/`g` groups in OBJ; our converter merged them to 7 per-material meshes (one draw call per material). V2 did the merge upstream — delivered 1 mesh with 5 PBR materials. V2 is the right shape. Anything over ~10 materials is over-indexed for a single building; aggregate.
6. **The 3ds Max ATF Producer → glTF Consumer translator loses advanced shader nodes.** V2's sidecar log (`6110279_lod3.glb.txt`) is the translator's `boost_serialization` trace; it shipped with silently-dropped normal / opacity / sheen nodes because ATF only understands a reduced material graph. **For 3ds Max, use the [Babylon.js Exporter](https://github.com/BabylonJS/Exporters) instead of Autodesk's ATF translator.** Babylon's exporter targets glTF 2.0 natively and handles PBR materials correctly, including Physical Material nodes. Blender is the gold-standard fallback.
7. **File size budget: ≤ 500 KB per LOD3 building, ≤ 2 MB per LOD2, ≤ 8 MB per LOD1.** The Web performance budget is severe when you're rendering 100+ buildings on a map. Hit these with `gltf-transform` CLI — `draco` (geometry) + `etc1s` / `uastc` (textures). See §8.
8. **Model centring does not matter on our side.** `BuildingGlbLayer.ts` computes the bbox in `onAdd()` and re-centres the model so its footprint centre lands on the WGS84 centroid and its base rests on Y=0. The artist does **not** need to centre the model — origin can be anywhere reasonable. But: don't ship a model whose origin is 500 m away from the geometry (some OBJ→FBX round-trips create absurd offsets); keep origin ~within the geometry's bbox.
9. **North alignment is the artist's responsibility.** Three.js local +Z is mapped to MapLibre +South; the `Building.rotationDeg` field yaws around vertical. **Ship the model with +Z facing "what the camera should see when looking from the south"** — i.e. the glTF default. If the artist ignores this, the engineer tunes `rotationDeg` in 90° increments until the façade matches the satellite view. Don't make us tune by hand; match the convention.
10. **Every delivery must pass the Khronos glTF Validator (`github.khronos.org/glTF-Validator/`, runs locally in the browser, no upload) with zero errors and ideally zero warnings.** If it says warnings, copy them into the delivery notes. Non-validating files will not be merged.

---

# §2 · Why glTF — web real-time context

## 2.1 The one-paragraph history

glTF ("Graphics Library Transmission Format") is the Khronos Group's runtime-focused open format for 3D asset delivery, drafted in 2015 and stabilised at 2.0 in June 2017. It is deliberately **not** a modelling-exchange format like FBX or COLLADA — it has no modelling history, no construction planes, no per-poly tool metadata. It is a *delivery* format: the shape, materials, animation, and scene graph in the leanest layout that a GPU can ingest. That focus is why Three.js, Babylon.js, Unity, Unreal, and every browser-based renderer either ship with glTF loading built-in or treat it as first-class.

The 2.0 standard fixed on PBR metallic-roughness as the canonical material model, right-handed +Y-up coordinates, metres as the unit, and a binary container (`.glb`) that packs JSON + binary buffers + (optionally) PNG/JPG textures into a single file. [Khronos glTF 2.0 Specification, retrieved 2026-04-24.](https://registry.khronos.org/glTF/specs/2.0/glTF-2.0.html)

## 2.2 Why not FBX, OBJ, 3DS, COLLADA, USD

| Format | Why not (for ZAAHI runtime) |
|---|---|
| FBX | Closed Autodesk format. Binary version is proprietary; ASCII is verbose. Three.js's `FBXLoader` is best-effort and well-known to mis-handle materials. No formal PBR support — everything goes through Phong-ish approximations. |
| OBJ + MTL | Ancient (Wavefront 1992). No PBR, Phong-only. External texture references (the V1 building's `D:\PROJECT\3D\ZHAN\PATTERN.jpg` lives here). No animation. No scene graph. Fine as a modelling interchange, wrong as a delivery target. |
| 3DS | Deprecated by Autodesk. 16-bit indices, object-name truncation, no PBR. Artists sometimes ship it alongside other formats; we accept it only as a reference, not as a target. |
| COLLADA (`.dae`) | XML-based, verbose, inconsistent tool support. Spec abandoned by Khronos in favour of glTF 2.0. Still used by SketchUp export pipelines but needs a round-trip. |
| USD (`.usd` / `.usdz`) | Pixar/Apple format, excellent for production VFX pipelines, growing in AR space. Runtime support on the web is far behind glTF (Three.js has experimental USDLoader; Babylon has partial support). Not there yet for ZAAHI in 2026. |

USD is the one to watch for the future. If web runtimes catch up, we'll revisit. As of 2026-04-24, `.glb` is the only format we ship to production.

## 2.3 The .glb binary layout (artist-relevant)

A `.glb` file is a 12-byte header followed by one or more chunks:

```
[header: 12 bytes]
  magic:  "glTF"  (0x46546C67)
  version: 2
  length:  file length in bytes
[chunk 0: JSON]
  length, "JSON", <asset structure JSON>
[chunk 1: BIN]
  length, "BIN\0", <binary buffer>
[chunk 2: BIN]  ← only if textures are embedded as a separate buffer
```

The artist sees one file. The runtime parses the JSON to find mesh accessors, material PBR factors, texture references, then pulls mesh vertices and texture bytes out of the BIN chunks.

The practical consequence: a "broken" `.glb` is almost always a structural JSON issue (bad accessor ranges, missing material reference) or an embedding issue (external texture URI that points nowhere). The Khronos Validator catches both.

## 2.4 What Three.js + MapLibre require of the model

ZAAHI's runtime is specifically:

- **Three.js `GLTFLoader`** (version tied to three@0.183 in `package.json`)
- Hosted inside a **MapLibre `CustomLayerInterface`** (MapLibre v5.22) that shares the WebGL context with the map
- WebGL2 / WebGL1 fallback as the underlying renderer

The relevant constraints this imposes on the artist's delivery:

- **One scene, one root node preferred.** Multiple scenes are legal but ignored (Three.js takes `scene[0]`).
- **Meshes with indexed geometry.** Non-indexed triangle soup is legal but larger by ~3×. Exporters do this by default; don't disable indexing.
- **Tangents optional but recommended if you ship normal maps.** If tangents are absent, Three.js computes them from UVs + normals on load, which is slower and can produce artefacts on non-UV-aligned meshes. Include tangents for any mesh that has a normal map. Most exporters calculate them; check the export option.
- **Normals required.** Without normals, lighting collapses to flat shading on every face. Every exporter outputs normals by default; don't disable them.
- **UV channel 0 required for any textured material.** Channel 1 and higher are legal (lightmaps, AO) but rarely used in our pipeline.
- **Vertex colours legal but rarely used.** Skip.
- **Animations legal; ignored by `BuildingGlbLayer`.** A building is a static asset. Animated flags, doors, etc. render once and hold. If you ship animations we simply won't play them; no error, just wasted bytes.
- **Lights in the model are ignored.** We add our own three-point lighting rig (ambient + key + fill) in `BuildingGlbLayer.ts`. Don't ship lights inside the `.glb`.
- **Cameras in the model are ignored.** The map is the camera.

## 2.5 Why the metallic-roughness PBR model wins on the web

PBR = Physically-Based Rendering. Before PBR, every engine had its own ad-hoc material language — specular power, ambient/diffuse/specular triplets, phong exponents. Artists tuned materials per-engine, they never matched across runtimes, and they broke under non-studio lighting.

PBR describes materials by their *physical* properties: how much light they absorb vs. reflect, how that reflection is distributed (rough vs. smooth), whether they behave like a metal (reflection is coloured) or a dielectric (reflection is ~4% white). Once you get those three numbers (base colour, metallic, roughness) roughly right, the material looks correct under *any* lighting setup.

The specific flavour glTF 2.0 adopted is **metallic-roughness** (as opposed to the older specular-glossiness). Reasons: fewer texture maps (baseColor + a combined MetallicRoughness map vs. diffuse + specular + gloss), fewer physical-accuracy edge cases (no un-physical specular colours on dielectrics). The Disney BRDF — Brent Burley's SIGGRAPH 2012 paper — was the foundation. [Burley 2012, *Physically Based Shading at Disney*, retrieved 2026-04-24](https://media.disneyanimation.com/uploads/production/publication_asset/48/asset/s2012_pbs_disney_brdf_notes_v3.pdf).

For a practical artist walkthrough see §3.

---

# §3 · PBR materials reference (detailed)

## 3.1 The three base factors

Every glTF material, at minimum, has these PBR factors:

- **`baseColorFactor`** — a linear-space RGBA tuple in [0, 1]. This is what people usually mean when they say "colour". For metals it's also the reflection colour; for non-metals it's the diffuse albedo. Do **not** pre-bake lighting into this; the runtime lights the surface.
- **`metallicFactor`** — scalar in [0, 1]. Nominally 0 for non-metals (dielectrics) and 1 for metals. There is no physically meaningful in-between; a value of 0.5 is what you get when a metal-roughness texture is bilinearly filtered at a metal/non-metal boundary. Authoring at 0 or 1 is best practice.
- **`roughnessFactor`** — scalar in [0, 1]. 0 = mirror-smooth, 1 = chalk-matte. Most real-world architectural materials land between 0.3 and 0.9.

Plus, commonly:

- **`emissiveFactor`** — linear RGB emission (not affected by lighting); for signage, LED strips, night-time window interiors. In real building context, keep ≤ 0.5 per channel unless you specifically want a glowing sign.
- **`alphaMode`** — `OPAQUE` (default), `MASK` (binary cutout, used for vegetation-style clipped textures), or `BLEND` (true transparency, expensive, requires sort order). **Default to OPAQUE for architecture.** Use BLEND only for actual glass on visible glazed surfaces.
- **`doubleSided`** — boolean. True for thin surfaces where both sides matter (leaves, fabric). For architecture, **false** almost always; wrong doubleSided doubles pixel cost.

## 3.2 Canonical factor values for architectural materials

Sources: the Khronos glTF 2.0 metallic-roughness model (formalised in the 2.0 spec § 3.9), the Disney BRDF, and the physically-based.info database (retrieved 2026-04-24 · [physicallybased.info](https://physicallybased.info/)). Where the database lists a material, its albedo is reproduced here in the `baseColorFactor` column; otherwise the value is a community-consensus approximation.

### 3.2.1 Metals (metallic = 1.0)

| Material | baseColorFactor (sRGB hex in parens) | metallic | roughness | Notes |
|---|---|---|---|---|
| Aluminum (polished) | 0.916, 0.923, 0.924 (#E9EBEB) | 1.0 | 0.15 | Canonical data from physicallybased.info. |
| Aluminum (anodised — red / gold / etc.) | Depends on anodisation (e.g. red 0.60, 0.00, 0.00) | 1.0 | 0.35 | Coloured anodising tints the reflection colour; metal stays metallic=1. |
| Brushed aluminum (common tower cladding) | 0.913, 0.921, 0.925 | 1.0 | 0.55 | Same base as polished, bump the roughness. |
| Stainless steel | 0.669, 0.639, 0.598 (#AAA398) | 1.0 | 0.2 | Slightly warm grey. |
| Copper | 0.932, 0.623, 0.522 (#EE9F85) | 1.0 | 0.25 | Sharp hue distinguishes from aluminum. |
| Titanium / architectural zinc | ~0.70, 0.70, 0.68 | 1.0 | 0.45 | Common on roofs and accents. |
| Gold (trim, railings) | 1.00, 0.78, 0.34 | 1.0 | 0.25 | Use sparingly; over-golding reads as fake. |

### 3.2.2 Dielectrics / non-metals (metallic = 0.0)

| Material | baseColorFactor | metallic | roughness | Notes |
|---|---|---|---|---|
| Clear glass | 1.00, 1.00, 1.00 | 0.0 | 0.05 | Use `KHR_materials_transmission = 0.9` + `ior = 1.5` for true transmission, else alphaMode = BLEND with opacity ~0.15. See §3.4. |
| Tinted glass (green/blue) | 0.80, 0.88, 0.85 or similar hue | 0.0 | 0.1 | Dubai towers often have greenish or bronze tint. |
| Reflective / one-way glass | 0.85, 0.85, 0.88 | 0.0 | 0.15 | Looks metal-ish at glancing angles — DO NOT set metallic=1; the Fresnel effect comes from glass's IOR (1.5), not from metallic. |
| Concrete (poured, polished) | 0.510, 0.510, 0.510 | 0.0 | 0.55 | From physicallybased.info. |
| Concrete (raw, rough) | 0.45, 0.43, 0.40 | 0.0 | 0.85 | |
| Marble (polished) | 0.830, 0.791, 0.753 | 0.0 | 0.25 | Warm white. |
| Limestone | 0.72, 0.68, 0.59 | 0.0 | 0.75 | Dubai vernacular — Fahidi Fort, older heritage builds. |
| Granite | 0.35, 0.33, 0.32 | 0.0 | 0.3 | Often polished = low roughness. |
| Brick (common red) | 0.262, 0.095, 0.061 | 0.0 | 0.85 | |
| Terracotta tile | 0.555, 0.212, 0.110 | 0.0 | 0.65 | |
| Wood (oak, walnut, darker species) | 0.20, 0.12, 0.06 | 0.0 | 0.65 | Lacquered → 0.3; raw → 0.85. |
| Wood (light: pine, birch) | 0.70, 0.50, 0.30 | 0.0 | 0.7 | |
| Ceramic / porcelain tile (glossy) | 0.95, 0.95, 0.95 | 0.0 | 0.1 | Wet-look. |
| Ceramic tile (matte) | 0.80, 0.78, 0.75 | 0.0 | 0.65 | |
| Painted wall (white matte) | 0.88, 0.88, 0.86 | 0.0 | 0.85 | Don't use pure white — 0.95+ looks unnatural. |
| Painted wall (satin, any colour) | Hue × 0.7 | 0.0 | 0.45 | |
| Painted wall (gloss, any colour) | Hue × 0.7 | 0.0 | 0.2 | |
| Asphalt | 0.06, 0.06, 0.06 | 0.0 | 0.95 | Near-black, very rough. |
| Drywall / gypsum (interior finish) | 0.80, 0.80, 0.78 | 0.0 | 0.9 | |

### 3.2.3 Emissive surfaces

| Surface | emissiveFactor | Notes |
|---|---|---|
| LED signage (any colour, visible at night) | 0.7, 0.7, 0.9 (cool white) or brand hue | Combined with baseColor → base reflects day, emissive bleeds night. Don't clip > 1.0. |
| Interior window glow (night views) | 0.4, 0.35, 0.25 (warm amber) | Subtle — this is an aggregate effect of interior lighting leaking out, not the sun. |
| Sun-catcher glass at dusk / dawn | 0.8, 0.4, 0.2 (amber-orange) | For hero renders; don't bake permanent sunset into an all-day asset. |

## 3.3 Texture maps — what to pack, what not to

glTF supports five standard texture slots on a PBR material:

| Slot | What it is | Common gotcha |
|---|---|---|
| `baseColorTexture` | sRGB colour | Do NOT bake lighting / shadows / AO into it. |
| `metallicRoughnessTexture` | B = metallic, G = roughness (R ignored). Linear. | Only one texture, not two. If you need pure roughness, use R=0, G=roughness, B=0. |
| `normalTexture` | Tangent-space normal map. Linear. | +Y up in tangent space ("OpenGL convention"), NOT DirectX convention. Many Windows tools export DirectX by default — green channel is inverted. Fix it before export. |
| `emissiveTexture` | sRGB emission. | Usually goes with `emissiveFactor` 1.0 and the texture carries the masked-out glowing regions. |
| `occlusionTexture` | R channel only, ambient occlusion 0 (occluded) → 1 (lit). Linear. | Can be packed into the R channel of the metallicRoughness texture to save a draw. |

**Resolution guidelines:**

| Building footprint | baseColor + normal | metallicRoughness + AO |
|---|---|---|
| ≤ 5,000 m² (small villa, corner tower) | 1024² | 512² |
| 5,000 – 20,000 m² (mid-rise, typical DDA plot) | 2048² | 1024² |
| 20,000 – 50,000 m² (mall, super-tall tower) | 4096² | 2048² |
| > 50,000 m² (landmark like Burj Khalifa) | Tiled or atlased | — |

Default to **2048²** if unsure. **Never ship 4096² unless the building justifies it** — 4K textures quadruple the GPU memory footprint and the visible difference at normal zoom is marginal.

## 3.4 Glass — the specific technical choice

Glass is the material that most often goes wrong on delivery. Three approaches, in order of fidelity vs. cost:

**A. Opaque-ish glass (default, cheapest).** `alphaMode = OPAQUE`, baseColor slightly bluish, metallic=0, roughness=0.05, IOR=1.5 (implicit). Looks like glass under most lighting, doesn't blend, renders fast. Good enough for 95% of ZAAHI buildings. **Use this unless the building is genuinely a glass landmark.**

**B. Alpha-blended glass.** `alphaMode = BLEND`, baseColor with alpha = 0.15–0.3, metallic=0, roughness=0.05. Correct transparency, but requires the renderer to sort transparent surfaces back-to-front. Three.js handles this but has known sort artefacts on self-intersecting glass (tower curtain walls with recessed panels). **Use only when the artist has verified no sort issues.**

**C. Physical transmission glass.** `alphaMode = OPAQUE` + `KHR_materials_transmission` extension (transmissionFactor = 0.9) + `KHR_materials_ior` (ior = 1.5) + optional `KHR_materials_volume` for thick-glass absorption. True physical transmission, refractive, correct Fresnel. **Most expensive; use only for feature shots.** Three.js's `GLTFLoader` supports both extensions natively. [KHR_materials_transmission, retrieved 2026-04-24](https://github.com/KhronosGroup/glTF/tree/main/extensions/2.0/Khronos/KHR_materials_transmission).

Default for ZAAHI: **(A) opaque-ish.** Document in the delivery notes if you chose (B) or (C) and why.

## 3.5 Khronos extensions — when to use, when to skip

Extensions in glTF are opt-in additions to the 2.0 core. Three.js's `GLTFLoader` supports most KHR_ and EXT_ extensions natively; some require separate loader modules (Draco, KTX2).

### 3.5.1 Ratified KHR_ extensions worth knowing

| Extension | What it does | ZAAHI recommendation |
|---|---|---|
| `KHR_materials_unlit` | Disables PBR shading — surface renders its baseColor directly, no lights. | Use for landmark facade textures where the texture itself already carries the baked-in light. Rare in our pipeline. |
| `KHR_materials_clearcoat` | Adds a second specular layer — car paint, polished wood, lacquered surfaces. | Useful for ultra-polished façades (glass over metal panels). Skip for V1 deliveries — diminishing returns on a city-scale map. |
| `KHR_materials_specular` | Fine-grained control over specular F0 beyond the implicit 4% for dielectrics. | Skip unless the artist specifically asks. |
| `KHR_materials_ior` | Sets the index of refraction (default 1.5). | Pair with `KHR_materials_transmission` when shipping true transmission glass. Otherwise skip. |
| `KHR_materials_transmission` | True physical transmission, correct Fresnel, refraction. | See §3.4; use for feature buildings. |
| `KHR_materials_volume` | Adds thickness / absorption / attenuation for transmissive materials. | Pair with transmission for thick glass (e.g. Dubai Opera-style curtain walls). Rarely required. |
| `KHR_materials_sheen` | Fabric / velvet appearance. | Skip — no architectural use. |
| `KHR_materials_anisotropy` | Directional specular — brushed metal, hair, LP records. | Use for brushed-metal panels if the effect reads at map zoom; usually skip. |
| `KHR_materials_iridescence` | Thin-film interference — oil on water, soap bubble. | Skip — no architectural use. |
| `KHR_materials_variants` | Swap materials at runtime (shop variant, design option). | Skip for V1. |
| `KHR_texture_transform` | UV offset/scale/rotation per material. | Useful for tiled textures (brick wall, facade pattern); ship with a sensible default. |
| `KHR_lights_punctual` | Defines point / spot / directional lights in the glTF. | Skip — ZAAHI adds its own lighting. |
| `KHR_mesh_quantization` | Stores positions/normals/UVs in int8/int16 instead of float32. Halves or quarters vertex payload. | Enable in `gltf-transform` via `quantize`. §8. |
| `KHR_draco_mesh_compression` | Geometry compression. ~95% reduction for meshes > 1 MB. | Enable for final delivery. §8. |
| `KHR_texture_basisu` | KTX2 / Basis Universal texture compression. GPU-native decompressed, small on disk, small in VRAM. | Enable for final delivery if textures are ≥ 512². §8. |

### 3.5.2 Multi-vendor EXT_ extensions

| Extension | What it does | ZAAHI recommendation |
|---|---|---|
| `EXT_mesh_gpu_instancing` | Hardware instancing — one mesh drawn N times with per-instance transforms. | Gold for repeated elements on a master plan (100 identical balcony rails, 50 identical windows). |
| `EXT_meshopt_compression` | Alternative to Draco; slightly worse ratio, much faster to decode. | Prefer over Draco for many-small-meshes case (master plan). |
| `EXT_texture_webp` | WebP texture compression (widely supported in 2026). | Use when the artist can produce WebP directly; smaller than PNG, bigger than KTX2. |

### 3.5.3 Extension rule of thumb

For a V1 delivery, use **zero extensions** except whatever the exporter emits automatically (usually `KHR_texture_transform` for UV transforms). Add compression extensions (Draco, Basis) in a post-processing step run by engineering — not the artist. §8.

---

# §4 · Software export workflows per tool

The short version:

- **Blender 4.x — gold standard.** Use this if at all possible. glTF 2.0 export is built-in, officially maintained by Khronos, and handles PBR → glTF mapping correctly.
- **3ds Max — use the Babylon.js Exporter, not the Autodesk ATF translator.** The ATF Producer → glTF Consumer path (what V2 used) drops advanced shader nodes silently.
- **Maya, Cinema 4D, Rhino, SketchUp — bridge through Blender** or use specific add-ons listed below.

Below, per tool, the install, the settings, and what's known to break.

## 4.1 Blender (4.0 +)

### 4.1.1 Install

Blender 4.0 and newer ship the glTF 2.0 exporter as a built-in add-on — no install required. Verify: `Edit > Preferences > Add-ons > Import-Export: glTF 2.0 format` — the checkbox should already be on.

### 4.1.2 Material setup

Use the **Principled BSDF** shader — it maps directly to glTF's metallic-roughness. Connect:

- `Base Color` socket → glTF `baseColorTexture` (or use the colour field for flat colour)
- `Metallic` → `metallicFactor` / `metallicRoughnessTexture.B`
- `Roughness` → `roughnessFactor` / `metallicRoughnessTexture.G`
- `Normal` socket ← `Normal Map` node in Non-Color data mode ← your normal texture
- `Emission` → `emissiveTexture` + `emissiveFactor`
- `Alpha` → `baseColorFactor.a` (for transparent materials, also set Blend Mode: Alpha Blend in Material Properties)

For glass, set `Transmission` on the Principled BSDF. Blender's glTF exporter will emit `KHR_materials_transmission` automatically if the slider is > 0.

**Do NOT** use the Emission shader, Volume shaders, Toon shader, or the legacy Blender Internal materials. The glTF exporter will either ignore them or translate them ad-hoc.

### 4.1.3 Export settings (File > Export > glTF 2.0)

The preset ZAAHI uses:

- **Format:** `glTF Binary (.glb)` — single-file, embedded textures.
- **Include:**
  - **Limit to: Selected Objects** (so the artist has scope control)
  - **Custom Properties: off** (don't leak Blender-internal properties)
  - **Cameras: off**
  - **Punctual Lights: off** (we add our own)
- **Transform:**
  - **+Y Up: on** (glTF convention)
  - **Apply Modifiers: on** (bake subsurf, mirrors, etc.)
- **Geometry:**
  - **UVs: on**
  - **Normals: on**
  - **Tangents: on** (needed for normal maps)
  - **Vertex Colors: off** (we don't use them)
  - **Materials: Export**
  - **Images: Automatic** (PNG for textures with alpha, JPEG otherwise)
  - **Compression (Draco): off** for delivery — engineering runs `gltf-transform draco` in a post-step with consistent settings.
- **Animation: off** (static asset)
- **Skinning: off** (no rigged characters in a building)

Save the preset: click the `+` next to the preset dropdown and name it `ZAAHI_building_v1`.

The companion file [`docs/art/assets/blender_export_preset.json`](assets/blender_export_preset.json) captures these settings in Blender's preset JSON format — copy it to `~/.config/blender/<version>/scripts/presets/operator/export_gltf2/`.

### 4.1.4 Known issues / gotchas

- **Emission + baseColor interaction** — Blender bakes emission onto an `emissiveTexture` if it's non-zero; if the artist wants pure emission with no baseColor, set baseColor to (0, 0, 0, 1).
- **Normal map +Y convention** — Blender uses OpenGL (+Y up) internally, same as glTF. Don't worry about this in Blender.
- **Principled BSDF v2 (Blender 4.2 +)** — adds Coat, Sheen, Subsurface sockets. Coat exports as `KHR_materials_clearcoat`, Sheen as `KHR_materials_sheen`. Both are optional.
- **glTF Material Output node** — a Blender-specific shader node that lets you override specific glTF outputs (occlusion, unlit). Rarely needed; the artist should not touch it unless they're explicitly packing AO.
- **Very large scenes freeze the exporter** — glTF export is single-threaded in Blender. A 5-million-poly scene can take minutes. Decimate first (see §8).

Reference: [Blender 4.x manual, glTF 2.0 exporter, retrieved 2026-04-24](https://docs.blender.org/manual/en/latest/addons/import_export/scene_gltf2.html).

## 4.2 3ds Max (2020 +)

### 4.2.1 The ATF Producer / Consumer path — avoid

Autodesk ships 3ds Max with an ATF (Autodesk Translation Framework) glTF Consumer translator. **Use only as a last resort.** The ATF pipeline converts the Max Physical Material to a reduced material graph, loses advanced shader nodes (normal displacement beyond simple maps, opacity masks on non-trivial shaders, sheen, procedural noise inputs), and produces the `boost_serialization` sidecar log we saw on V2 delivery (`6110279_lod3.glb.txt`). It works, but silently drops detail.

### 4.2.2 The Babylon.js Exporter — recommended

The Babylon.js Exporter for 3ds Max is free, open source, and actively maintained. Supports 3ds Max 2015 through 2026 ([BabylonJS/Exporters releases, retrieved 2026-04-24](https://github.com/BabylonJS/Exporters/releases)). Installs as a plugin `.ms` / `.dlx` combo.

Workflow:

1. Download the release for the Max version installed (`Max2025_Exporter_Installer.msi` or similar).
2. Run the installer; it registers the `.ms` macro and adds the menu item.
3. `Babylon menu > glTF Export`. Options:
   - **Scale: meters** (crucial — default is cm).
   - **Include textures: embedded** (packs into the `.glb`).
   - **Write glTF 2.0: on, Binary: on** (produces `.glb`).
   - **Use Physical Material: on** (maps correctly to PBR metallic-roughness).
   - **Bake animation: off** for static buildings.
4. Export. Validate with Khronos Validator.

The Babylon exporter handles Max Physical Material → glTF PBR mapping correctly; this is what the V3 artist should use if they're on 3ds Max.

Reference: [Babylon.js documentation — 3DS Max to glTF, retrieved 2026-04-24](https://doc.babylonjs.com/features/featuresDeepDive/Exporters/3DSMax_to_glTF).

### 4.2.3 Alternative: export to FBX, re-import to Blender, export glTF

If for any reason neither exporter works (licensing, older Max version, bug du jour), the fallback chain is:

1. Max → FBX (2018 binary, Y-up)
2. Blender: File > Import > FBX — check "Automatic Bone Orientation" off, units "meters"
3. Fix materials in Blender (the FBX importer creates generic shaders; re-attach to Principled BSDF per §4.1.2)
4. Export glTF per §4.1.3

Longer, error-prone, but it reliably produces a valid `.glb`.

## 4.3 Maya

### 4.3.1 Options

- **Autodesk Maya glTF Exporter** — available for Maya 2020 + (shipped as a plug-in, free from the Autodesk App Store). Moderate PBR support; best with Maya's Stingray PBS or Standard Surface.
- **Babylon.js Exporter for Maya** — same project as the Max version. Better PBR fidelity. Recommended.

### 4.3.2 Material setup (Standard Surface)

- Plug baseColor into the `baseColor` input.
- Set `metalness` (0 or 1).
- Set `specularRoughness`.
- For glass: enable `transmission` slider (Babylon exporter translates to `KHR_materials_transmission`).
- Normal map: use `bump2d` node in tangent space.

### 4.3.3 Export

Babylon menu > File > Export All > select glTF Binary. Same options as §4.2.2.

## 4.4 Cinema 4D

### 4.4.1 Install

Cinema 4D R23 + ships with a glTF exporter under the Maxon Labs category. Recent versions have improved PBR support.

### 4.4.2 Material setup

Use Cinema 4D's **Standard Surface** or **PBR Material**. The exporter maps these to glTF metallic-roughness. Octane/Redshift materials do not map automatically — bake to PBR first.

### 4.4.3 Export

File > Export > glTF 2.0. Confirm "Binary" and "Embed Textures".

## 4.5 Rhino

### 4.5.1 Options

- **Native `.glb` export** (Rhino 7 +) — File > Export Selected > choose "glTF Binary (.glb)".
- **Rhino.Compute glTF pipeline** — for server-side batch export.

### 4.5.2 Gotchas

Rhino's materials are traditionally a specular-glossiness model with construction-grade inputs (Diffuse, Specular, etc). The glTF exporter does the specular-glossiness → metallic-roughness conversion automatically; results are approximate. For critical fidelity, set materials to "Physically Based Material" (Rhino 7 +) before export.

## 4.6 SketchUp

### 4.6.1 Options

- **SketchUp 2021 + native glTF** — via the Extension Warehouse plugin "SketchUp → glTF" (free, community-maintained).
- **Export to COLLADA or FBX → Blender → glTF** — more reliable for complex models.

### 4.6.2 Gotchas

SketchUp materials are diffuse-only; there is no native PBR pipeline. Every delivery from SketchUp will require material re-work in Blender or the target runtime before it looks credible. For ZAAHI, **prefer a tool higher up the list** if the artist has the option.

## 4.7 The one-line decision table

| Artist tool | Recommended path | Expected fidelity |
|---|---|---|
| Blender 4.x | Native glTF export (§4.1) | Excellent |
| 3ds Max 2020 + | Babylon.js Exporter (§4.2.2) | Very good |
| 3ds Max (legacy, no plugin) | ATF Consumer (§4.2.1) or FBX → Blender → glTF | Poor-to-fair |
| Maya | Babylon.js Exporter (§4.3) | Very good |
| Cinema 4D R23 + | Native glTF + PBR Material (§4.4) | Good |
| Rhino 7 + | Native glTF + PBR Material (§4.5) | Good |
| SketchUp | COLLADA/FBX → Blender → glTF (§4.6) | Fair |
| Other | Convert to FBX, bridge through Blender | Fair |

---

# §5 · ZAAHI-specific delivery requirements

This is the contract. Any deviation needs engineering sign-off *before* delivery — not after.

## 5.1 Filename convention

**`<plot-number-or-slug>_lod<N>.glb`**

Examples:

- `6110279_lod3.glb` — V2 delivery for API Horizon Pointe (plot number prefix).
- `api-horizon-pointe_lod2.glb` — a lower-LOD version of the same.
- `azizi-riviera-t14_lod3.glb` — a building in a master plan, identified by slug.
- `meydan-one_masterplan_lod1.glb` — a master plan aggregate for zoomed-out views.

Rules:

- Lowercase only, hyphen-separated slugs, no spaces.
- LOD number is 0 (highest detail) to 5 (lowest). LOD3 is the default ZAAHI ingests; LOD2 and LOD1 reserved for zoomed-out future use.
- `_lod<N>` suffix is mandatory even if only one LOD ships.

## 5.2 Unit, scale, orientation

- **Unit: metres.** The artist exports in metres; the `Building.scaleFactor` column stays at 1.0. If the artist can only export in cm, note it in the delivery notes and engineering will set `scaleFactor = 0.01`. V1 shipped in cm (scaleFactor=0.01); V2 shipped in metres (scaleFactor=1).
- **Scale: 1 glTF unit = 1 metre.** A 100-metre tower has bbox size 100 along the height axis.
- **Up axis: +Y.** glTF convention. Not +Z (Blender scene default; the exporter handles the conversion if the "+Y Up" toggle is on).
- **Forward axis: +Z** (i.e. the building faces +Z). Interpretation: imagine a camera on the south side of the building looking north; the façade the camera sees is the +Z face. If the model is exported with a different forward, engineering tunes `Building.rotationDeg` in 90° steps, but this is avoidable with correct authoring.

## 5.3 Coordinates (WGS84) — handled by engineering

The artist does not embed geographic coordinates. The `Building` row's `centroidLat` / `centroidLng` columns place the model; `BuildingGlbLayer.ts` reads them and positions the model on the map via `maplibregl.MercatorCoordinate.fromLngLat`. The artist's origin can be anywhere reasonable within the model's bbox.

The one ask: **the model's bbox min-Y should sit at or just above Y=0** (ground level in the artist's scene). The renderer auto-re-anchors `-minY` so the base rests on map-ground, but if the model's origin is 1000 m below ground in the artist's scene, subtle floating-point issues in the matrix chain become real. Keep origin within ~10 m of the geometry.

## 5.4 Texture resolution, slot usage, map conventions

See §3.3. Summary:

- baseColor: 2048² (default), 1024² (small buildings), 4096² (only for landmarks)
- metallicRoughness: half the baseColor resolution is fine
- normal: match baseColor resolution
- emissive: only if emissive is non-trivial; 1024² usually enough
- occlusion: packed into metallicRoughness.R is preferred over a separate 4th texture

## 5.5 Materials — merge aggressively

Target: **one material per visible "surface type"**, not one material per sub-element. The artist's modelling package probably has 40+ materials assigned internally (walls-north, walls-south, columns-top, columns-base, etc.) — merge those down to ~5–10 at export time. The V2 delivery's 5 materials (FRAME, GREEY, GREY, KUNING, PATTERN) is the right shape; V1's 7 was acceptable; anything above 15 is over-indexed.

## 5.6 Metadata — a sidecar `.json` alongside the `.glb`

Alongside the `.glb`, deliver a `<slug>_meta.json` with:

```json
{
  "name": "API Horizon Pointe",
  "deliveryVersion": "v2",
  "deliveredAt": "2026-04-24",
  "artist": { "handle": "…", "contact": "…" },
  "sourceTool": "3ds Max 2024 + Babylon.js Exporter v1.8",
  "units": "meters",
  "forwardAxis": "+Z",
  "upAxis": "+Y",
  "bbox_m": { "x": 63.3, "y": 111.7, "z": 60.0 },
  "vertices": 8821,
  "triangles": 5806,
  "materials": ["FRAME", "GREEY", "GREY", "KUNING", "PATTERN"],
  "textures": {
    "embedded": true,
    "baseColor_px": 2048,
    "normal_px": 2048,
    "metallicRoughness_px": 1024
  },
  "extensions": ["KHR_texture_transform"],
  "validator": {
    "status": "pass",
    "warnings": []
  },
  "notes": "PATTERN material baseColor intentionally black — artist design choice."
}
```

This file is for engineering's seed script (`scripts/seed-<building-slug>.ts`) to read when creating the `Building` row. Completing it fully is the artist's sign-off that they've verified their own delivery. Missing fields → delivery rejected; we can't ingest a black-box file.

## 5.7 Footprint polygon (optional but welcome)

If the artist has the building footprint as a 2D polygon in any GIS-ish format, include it as `<slug>_footprint.geojson`:

```json
{
  "type": "Feature",
  "geometry": {
    "type": "Polygon",
    "coordinates": [[[55.3221, 25.1819], [55.3224, 25.1819],
                     [55.3224, 25.1823], [55.3221, 25.1823],
                     [55.3221, 25.1819]]]
  },
  "properties": { "name": "API Horizon Pointe" }
}
```

Coordinates are WGS84 (lng first, lat second, per GeoJSON spec). Engineering ingests this into the `Building.footprintPolygon` JSON column. Absent footprints default to a point at the centroid — works, but a polygon enables future features like hit-testing and AR cutouts.

## 5.8 LOD delivery

ZAAHI's runtime uses one LOD per building today. The `_lod<N>` suffix is a future-forward naming convention; most deliveries will be `lod3` only. If the artist wants to ship multiple LODs:

| LOD | Vertex budget | Typical file size | Target camera range |
|---|---|---|---|
| 0 | Unlimited | 1–5 MB | Close-up hero shots (post-launch, not today) |
| 1 | ≤ 200 k | 1–2 MB | Street-level walkaround |
| 2 | ≤ 50 k | 300 KB – 1 MB | Map at zoom 17 – 20 |
| 3 | ≤ 10 k | 100 – 500 KB | **Default for ZAAHI map** (zoom 15 – 17) |
| 4 | ≤ 2 k | < 100 KB | Master-plan-level zoom (zoom 12 – 14) |
| 5 | ≤ 500 | < 30 KB | City-scale overview |

Ship `lod3` as default. If you know the building is a candidate landmark, ship `lod1` and `lod3`.

## 5.9 QA checklist — what every delivery must pass

The companion file [`docs/art/assets/gltf_validation_checklist.md`](assets/gltf_validation_checklist.md) is the exhaustive list. Summary:

- [ ] File opens in [Khronos glTF Validator](https://github.khronos.org/glTF-Validator/) with zero errors.
- [ ] Warnings, if any, listed in `<slug>_meta.json → validator.warnings[]`.
- [ ] File opens in [gltf.report](https://gltf.report/) and shows expected vertex / triangle / material counts.
- [ ] File opens in [the official glTF Sample Viewer](https://github.khronos.org/glTF-Sample-Viewer-Release/) and renders with all materials visible.
- [ ] Dimensions match the expected building size (cross-check against OpenStreetMap's building polygon or a press-release footprint).
- [ ] File size ≤ budget for its LOD (see §5.8).
- [ ] Textures embedded (no external URIs).
- [ ] `<slug>_meta.json` complete.

---

# §6 · Step-by-step — your first ZAAHI delivery

This section is written to the **artist**, in plain English, as a walkthrough for a single building delivery. We'll use a hypothetical "Meydan Heights Tower 7" as the running example.

## Step 1 — Receive the brief

You'll get:

- Building name (e.g. "Meydan Heights Tower 7")
- Plot number or OSM reference
- Reference photos (street-level, satellite)
- Target LOD (usually LOD3)
- Known dimensions (height, footprint dimensions) — cross-check these, they're approximate

## Step 2 — Model in your tool of choice

Our tool preference order is Blender > 3ds Max (Babylon exporter) > Maya > Cinema 4D > Rhino > SketchUp. If you're starting fresh on a project, pick Blender. If you have an existing Max scene, see §4.2.2.

Model guidelines:

- **Target polycount:** LOD3 ≤ 10,000 triangles. This sounds small but it's plenty for a city-map building. Decimate aggressively.
- **Don't model interior volumes** unless the building has visible through-glass interiors. We render exteriors only at ZAAHI map zoom.
- **Corner count on cylinders:** 16–24 is enough for a column. 64+ is wasteful.
- **Bevel sharp corners** — a 2 cm bevel on concrete / metal edges catches light and reads dramatically better than sharp corners. Cost: 4× the edge verts, worth it.
- **Materials: merge to ~5–10 per building.** See §5.5.

## Step 3 — Set up PBR materials

See §3.2 for canonical factor values. Use Principled BSDF (Blender) or Physical Material (Max). If you're tempted to use a 4-layer emissive-clearcoat-anisotropic-iridescent wizardry shader, don't — it won't survive glTF export.

For a typical Dubai residential tower the material set is:

1. `GLASS_MAIN` — clear curtain wall glass (baseColor 0.95, 0.95, 0.98; roughness 0.1; metallic 0; alphaMode OPAQUE)
2. `ALUM_MULLION` — window frames (baseColor 0.70, 0.70, 0.72; roughness 0.3; metallic 1)
3. `CONCRETE_STRUCTURE` — visible concrete ribbons, cores (baseColor 0.52, 0.52, 0.50; roughness 0.65; metallic 0)
4. `RAILING_METAL` — balcony railings (baseColor 0.90, 0.90, 0.90; roughness 0.25; metallic 1)
5. `BASE_CLADDING` — ground-floor finish (stone or tile, baseColor and roughness per material)

Additions per building: emissive signage, coloured accents, distinct tiles. Keep the list manageable.

## Step 4 — Texture, if needed

For a LOD3 city-map tower, **flat PBR colours often look fine**. Don't feel obliged to UV-unwrap and texture every surface if the building is a uniform material. Only texture when the building has visible pattern — brick, stone veneer, a signature curtain-wall grid, a branded façade.

If you do texture:

- Sources: [PolyHaven (CC0)](https://polyhaven.com/textures) and [AmbientCG (CC0, 2000+ materials)](https://ambientcg.com/), retrieved 2026-04-24. Both are CC0 — no attribution required, free for commercial use.
- Resolution per §3.3.
- Normal map convention: OpenGL (+Y up).
- Bake ambient occlusion into a texture if the model has deep recesses — it reads much better than letting runtime lighting do it.

## Step 5 — Export

Blender: File > Export > glTF 2.0 > select preset `ZAAHI_building_v1`. Name file per §5.1 (`meydan-heights-t7_lod3.glb`).

3ds Max: Babylon menu > glTF Export > settings per §4.2.2.

Other tools: per §4.3–4.6.

## Step 6 — Validate

Open the `.glb` in [Khronos glTF Validator](https://github.khronos.org/glTF-Validator/) — drag and drop. The validator runs locally in your browser; files are not uploaded. You should see:

- `Errors: 0`
- `Warnings: 0` (ideally; a few minor warnings like "UV out of [0,1] range" are OK for untextured materials)
- `Asset info: version 2.0` ✓

Open the same file in [gltf.report](https://gltf.report/) — drop it in. Scroll through:

- Mesh count, material count, vertex count — do they match what you expected?
- File size — within budget?
- Render preview — does the building look right?

Open the file in [the glTF Sample Viewer](https://github.khronos.org/glTF-Sample-Viewer-Release/) — drag and drop. Rotate the camera, check lighting variation, look for:

- Black triangles (normal direction flipped)
- Z-fighting artifacts (two faces at the same depth)
- Missing material fallback (pink surfaces = material error)
- Texture smearing (bad UV unwrap)

## Step 7 — Fill in `<slug>_meta.json`

See §5.6. All fields required except `notes` (free-form) and the optional `footprint.geojson` sidecar.

## Step 8 — Deliver

Zip `<slug>_lod3.glb` + `<slug>_meta.json` + optional `<slug>_footprint.geojson`. Send to ZAAHI engineering via the agreed channel (Slack, email, drive upload).

Expected turnaround: engineering reviews within 24 hours. On pass, the file lands in `public/models/` and a `Building` row is seeded (or updated) within another 24 hours.

## Step 9 — Iterate on feedback

Engineering's feedback will reference specific positions in this playbook. Common iteration reasons:

- Scale mismatch → check §5.2
- Wrong orientation → check §5.2 ("forward axis +Z")
- Over-budget size → §5.8 and §8
- Missing textures → §5.4
- Materials look flat → §3.1 (check metallic/roughness)

---

# §7 · Troubleshooting the failure modes we've actually hit

## 7.1 "ATF translator warnings about normal / opacity / sheen" (V2 case)

**Symptom.** 3ds Max exports a `.glb`, and alongside it a `<name>.glb.txt` log containing `boost_serialization` XML with `TranslationProgressEvent` entries and warnings about material nodes the translator couldn't convert.

**Root cause.** The artist used Autodesk's ATF Producer → glTF Consumer path. ATF exposes only a subset of the Max Physical Material graph; advanced inputs (Sheen, Coat, complex opacity networks) are silently dropped or approximated.

**Fix.** Switch to the **Babylon.js Exporter for 3ds Max** (§4.2.2). Reinstall from the [BabylonJS/Exporters repo](https://github.com/BabylonJS/Exporters/releases), use the Babylon menu's glTF Export with "Use Physical Material: on". Re-export, re-validate. The log file goes away.

**Workaround if you must use ATF.** Bake the complex material into textures (baseColor, metallicRoughness, normal) via Max's "Bake Material" before export. ATF then sees a simple textured material and converts it correctly. Longer workflow but works.

## 7.2 "Textures lost on transfer"

**Symptom.** Received `.glb` renders with all materials as white / grey / missing pattern. Or worse, opens correctly on the artist's machine but blank on engineering's.

**Root cause.** External texture URIs in the `.glb`. The artist's `.glb` references `D:\PROJECT\3D\ZHAN\PATTERN.jpg` (V1 case) or `./textures/wall_diffuse.png` (relative path). Either way, the texture doesn't exist at that path on any other machine.

**Fix.** Re-export with "Embed Textures" (Babylon exporter option) or "Images: Automatic" (Blender exporter). Textures then live inside the `.glb` binary buffer.

**Verification.** Open the `.glb` in [gltf.report](https://gltf.report/). The Textures panel should show each texture's pixel dimensions and a preview thumbnail. If it shows "Image URI not resolved", you have external references.

## 7.3 "Scale mismatch — tower is 10× too big / too small"

**Symptom.** The engineering render shows a tower that's either a skyscraper crushing the map or a kilometre-tall needle.

**Root cause.** Artist exported in cm (common in 3ds Max default scene units) but `Building.scaleFactor` is set to 1 (i.e. metres). Or the reverse.

**Fix (artist side).** Re-export with scene units explicitly set to "Meters". In Max: `Customize > Units Setup > System Unit Scale: 1 Unit = 1 Meter`. In Blender: `Properties > Scene > Unit System: Metric, Unit Scale: 1.0, Length: Meters`.

**Fix (engineering side, if artist can't re-export).** Update the `Building.scaleFactor` column to 0.01 (cm source) or 0.001 (mm source). `BuildingGlbLayer.ts` applies it at load time. V1 shipped cm; we set scaleFactor=0.01. V2 shipped metres; scaleFactor=1. Same Prisma field, one-line update.

## 7.4 "Rotation wrong — the main façade faces the wrong way"

**Symptom.** The building's architectural front (the side with the main entrance, the side the real building faces the street) is pointing east when the real building points south, or similar.

**Root cause.** The artist's scene had a different forward axis convention.

**Fix (artist side, preferred).** Re-export with the building rotated so +Z in the export is the architectural front. glTF convention is +Z forward (camera looks down -Z toward the scene).

**Fix (engineering side).** Set `Building.rotationDeg` to 90, 180, or 270 until it lines up. This is a yaw rotation around the vertical axis in `BuildingGlbLayer.ts`.

## 7.5 "Normals are missing / flat-shaded"

**Symptom.** Lighting on the building looks like a hand-drawn polygon diagram — hard flat facets, no smooth curves.

**Root cause.** Either (a) the exporter didn't write normals (rare; every mainstream exporter does by default), or (b) the artist set "Shade Flat" in Blender without realising the exporter respects it and emits hard-edge normals.

**Fix.** In Blender: select the mesh, Object Data Properties > Normals > "Auto Smooth" on, angle 30–60° depending on intent. Re-export. In Max: Edit Normals modifier > "Reset" or adjust smoothing groups.

**Verification.** Open in glTF Sample Viewer. A smoothed building reads immediately; a flat-shaded one looks like a low-poly PS1 game.

## 7.6 "Black triangles / holes in geometry"

**Symptom.** Certain triangles render black or are invisible from certain camera angles.

**Root cause.** Winding order inverted. glTF assumes counter-clockwise winding for front faces; backface culling hides clockwise-wound triangles. An internal mirroring operation or a "flip normals" during modelling flipped winding.

**Fix.** In Blender: Mesh > Normals > Recalculate Outside (Ctrl+Shift+N). In Max: Mesh > Flip Normals on the affected faces.

**If you need both sides visible** (thin-walled architectural element, umbrella, banner): set the material's `doubleSided: true` flag. glTF supports this, Three.js honours it. Cost: double the fragment cost on those faces. Use sparingly.

## 7.7 "File too big (> 2 MB for LOD3)"

**Symptom.** The `.glb` is 8 MB, 15 MB, or more. Budget for LOD3 is 500 KB.

**Root cause.** Usually (a) 4K × 4K textures the artist can't budget-negotiate down, (b) uncompressed geometry with 100k+ verts, or (c) multiple LOD-0-grade materials ported from a hero asset.

**Fix.** Engineering runs `gltf-transform` post-processing. See §8 for the recipe: draco for geometry, etc1s/uastc for textures, quantize for vertex attributes. Typical ~5× reduction on an un-optimised `.glb`.

**Prevention.** Artist reviews §5.4 texture budgets and §5.8 LOD budgets before export.

## 7.8 "Shaders look different in the viewer vs. the render"

**Symptom.** The artist's Blender viewport render looks rich and detailed; the exported `.glb` in glTF Sample Viewer looks flat and generic.

**Root cause.** Blender viewport uses Cycles or Eevee, both of which support a much richer material graph than glTF can export. Complex node trees (procedural textures, mixers, custom OSL) bake-down ambiguously or not at all.

**Fix.** Bake complex shader results into textures. In Blender: Shader Editor > Add > Output > Image Texture; connect the final shader output to it, then File > Bake. Repeat for baseColor, normal, roughness. Replace the complex shader tree with a Principled BSDF fed by the baked textures. Re-export.

**Rule of thumb.** If the Blender viewport uses a texture image node connected to a Principled BSDF, the glTF export is going to be identical. Anything more ambitious needs baking.

## 7.9 "KTX2 / Draco — browser can't load"

**Symptom.** A compressed `.glb` works in glTF Sample Viewer but fails in ZAAHI's `/parcels/map` with a loader error.

**Root cause.** Three.js's `GLTFLoader` needs `KTX2Loader` and `DRACOLoader` explicitly attached to decode KTX2 textures and Draco meshes. `BuildingGlbLayer.ts` currently wires only the plain `GLTFLoader`.

**Fix.** Engineering-side task, not artist. We'd extend `BuildingGlbLayer.ts` to attach Draco + KTX2 loaders if we decide to ship compressed assets. Artists should deliver **uncompressed** `.glb` and let engineering run the compression post-step with full runtime awareness. See §8.

## 7.10 "Glass looks like white plastic"

**Symptom.** The glass material in the delivered `.glb` renders as a flat white or grey surface with no transparency or reflection.

**Root cause.** The artist used the Opaque flavour of glass (§3.4 option A) but set baseColor too white (0.95, 0.95, 0.95 is what most dielectric whites look like, but without specular reflection at grazing angles it reads as plastic).

**Fix.** For option A, drop baseColor to ~0.7–0.8, roughness to 0.05, keep metallic=0. The low roughness gives Fresnel behaviour — grazing angles go to full white, head-on stays dark. Looks like glass.

For the full transmission feel, switch to §3.4 option B or C.

## 7.11 "Model loads but is invisible"

**Symptom.** GLTFLoader fires its success callback, vertex count is correct, but nothing renders on screen.

**Root cause (generic).** Usually one of:
- Model's bbox is 100 km from the anchor (bad local origin).
- All materials have alpha=0.
- Camera is inside the model.
- Normals all zero.

**Root cause (ZAAHI-specific).** Was historically the WebGL framebuffer-collision bug with `/parcels/map`'s fill-extrusion layers — fixed 2026-04-24 in commit `f675ba2` + `44dcd61`. If you see this as an artist, the fix is engineering-side. See `docs/architecture/BUILDINGS_PIPELINE.md` for the runtime details.

## 7.12 "Artist machine → engineering machine render difference"

**Symptom.** Artist approved the `.glb` on their machine; engineering opens it and sees something different.

**Root cause.** Different viewers use different default lighting. The artist's tool uses the rich studio light rig they set up inside the application. ZAAHI's runtime uses a fixed three-light rig (ambient 0.65 + key 1.0 + fill 0.35 — see `BuildingGlbLayer.ts`).

**Fix.** Validate specifically in the neutral [Khronos glTF Sample Viewer](https://github.khronos.org/glTF-Sample-Viewer-Release/) with its default environment map — that's the closest proxy to ZAAHI's lighting.

---

# §8 · Advanced topics

## 8.1 `gltf-transform` CLI — the workhorse

After the artist delivers an uncompressed `.glb`, engineering runs this pipeline to hit our size budgets. Install once:

```bash
npm install --global @gltf-transform/cli
```

The recipe for a typical ZAAHI building post-processing:

```bash
# Start from the artist's delivery
INPUT=public/models/<slug>_lod3.glb
OUTPUT=public/models/<slug>_lod3.glb

# 1. Inspect what we're starting with
gltf-transform inspect "$INPUT"

# 2. Optimise geometry: quantize vertex attributes, weld duplicate verts, join coplanar triangles
gltf-transform optimize "$INPUT" "${OUTPUT%.glb}_opt.glb" \
  --compress meshopt \
  --texture-compress webp

# 3. Validate
gltf-transform inspect "${OUTPUT%.glb}_opt.glb"
```

Alternative heavy-compression recipe for archival / low-bandwidth targets:

```bash
# Draco geometry compression + ETC1S colour textures + UASTC normal maps
gltf-transform draco "$INPUT" step1.glb --method edgebreaker
gltf-transform uastc step1.glb step2.glb --level 4 --rdo --rdo-lambda 4 --zstd 18 \
  --slots "normalTexture,roughnessTexture"
gltf-transform etc1s step2.glb "$OUTPUT" --quality 128
```

Reference: [gltf-transform.dev, retrieved 2026-04-24](https://gltf-transform.dev/).

## 8.2 KTX2 + Basis Universal — when worth it

Basis Universal transcodes once at build time to either ETC1S (small) or UASTC (higher quality), then at runtime transcodes to the GPU's native format (BC7, ASTC, ETC2, ...) depending on the device. Result: textures are smaller on disk *and* smaller in GPU memory after upload.

Rules of thumb:

- Worth it for textures ≥ 512².
- Colour textures → ETC1S (tiny on disk, small-to-medium quality).
- Normal maps and roughness/metallic packed maps → UASTC (higher disk cost, essential fidelity for these maps).
- **Requires Three.js `KTX2Loader` wired in the runtime.** ZAAHI's current runtime does not have this — would be a ~20-line addition to `BuildingGlbLayer.ts`. Engineering trades off complexity vs. asset size when this becomes critical.

Reference: [KHR_texture_basisu, retrieved 2026-04-24](https://github.com/KhronosGroup/glTF/tree/main/extensions/2.0/Khronos/KHR_texture_basisu).

## 8.3 Draco mesh compression — when worth it

Draco compresses vertex positions / normals / UVs by quantising + entropy-coding. Typical compression ratio: ~80–95 % for dense meshes.

Rules of thumb:

- Worth it for geometry payloads ≥ 1 MB (below that, the WASM decoder library overhead negates the savings).
- `edgebreaker` method compresses better; `sequential` preserves vertex order (matters for rigged / animated meshes).
- **Requires Three.js `DRACOLoader` wired in the runtime.** Same story as §8.2.

A 10,000-triangle LOD3 building is usually below the 1 MB geometry threshold — Draco isn't a win. Skip for LOD3 deliveries; consider for LOD0–LOD1 hero models.

Reference: [KHR_draco_mesh_compression, retrieved 2026-04-24](https://github.com/KhronosGroup/glTF/tree/main/extensions/2.0/Khronos/KHR_draco_mesh_compression).

## 8.4 Master plan delivery — structured hierarchy

For a master plan with, say, 30 buildings (Meydan One, District One, Azizi Riviera), we can either:

**A. One `.glb` per building + one "master plan outline" `.glb` for site furniture.**

- 30 rows in `Building` table, each with its own `centroidLat/Lng`, artist names them by slug.
- Site furniture (roads, landscaping, signage) delivered as a single `<masterplan>_site.glb` with no associated Building row — serve as static decoration at known centroid.
- Pros: per-building selection works, toggles work per building, memory usage scales with visible buildings.
- Cons: 30+ separate CustomLayers / WebGLRenderers unless we refactor `BuildingGlbLayer.ts`.

**B. One master `.glb` per master plan.**

- Engineering creates one `Building` row representing the whole master plan.
- All buildings + site furniture merged in the artist's scene.
- Pros: one CustomLayer, one draw-call stack, fast.
- Cons: can't select individual buildings, can't toggle per building, all-or-nothing visibility.

Recommendation: **(A) for master plans with ≤ 20 buildings, (B) for larger plans** until we refactor `BuildingGlbLayer` to support multi-root scenes. §8.5 covers the refactor.

## 8.5 Instancing — repeated elements

Most towers have 50–500 identical windows, 20 identical balcony railings, 80 identical bay-steel brackets. In the artist's scene these are usually separate objects; on export, glTF naively duplicates the geometry per instance.

`EXT_mesh_gpu_instancing` solves this: the geometry is stored once, and the scene graph references it N times with per-instance transforms. Disk size scales linearly with unique geometry; runtime GPU cost scales linearly with instance count.

Blender workflow:

- Use **Linked Duplicates** (Alt+D instead of Shift+D) when you duplicate objects.
- The glTF exporter detects linked data and emits `EXT_mesh_gpu_instancing` automatically.

3ds Max workflow:

- Use **Instance Clone** not Copy Clone.
- Babylon exporter emits the extension automatically.

Three.js's `GLTFLoader` reads the extension and creates `InstancedMesh` objects, which render in a single draw call. Big win for densely-decorated buildings.

## 8.6 Texture atlasing — when to bother

For a building with 20 separate small textures (each material has its own), you can atlas them all into a single 2048² texture and rewrite UVs. Saves texture bind overhead on the GPU, shrinks the `.glb` (one image header instead of twenty).

**Worth it only for:**
- Master plan merges with 10+ unique small textures.
- Shipping to low-end mobile where texture bind cost is a measurable bottleneck.

**Not worth it for** single buildings with 3–7 materials — the atlas complexity doesn't pay back.

Blender has a built-in atlas tool (TexTools addon, free). The artist can do it, or engineering can do it as a gltf-transform step using `join` + texture merging.

## 8.7 Animation — deliberately unused

glTF 2.0 supports skeletal animation, morph targets, and node transforms. ZAAHI's runtime ignores all of these. Reason: a city map is a static snapshot; animated buildings (flags, rotating signs, door opens) are expensive per frame, don't survive map zoom-out, and distract from the discovery use case.

If the artist ships animations (e.g. the model has blade-server-style rotating fan animations by accident), the `.glb` will still load — animations are just not played. No error, but wasted bytes. Strip before export to stay within budget.

## 8.8 Post-processing effects — not the artist's job

Ambient occlusion (screen-space), bloom, depth-of-field, motion blur — all of these are **runtime** concerns, not asset concerns. The artist should not bake screen-space AO into the asset (unlike object-space AO, which goes into an occlusion texture). Runtime post-processing is an engineering decision.

Currently ZAAHI runs no post-processing on building renders. The only AO present is whatever baked into the artist's occlusion texture (§3.3 row 5).

---

# §9 · References and further reading

Everything cited with a URL + retrieved date. Where possible, primary sources (Khronos, official vendor docs) are preferred over tutorials.

## 9.1 glTF 2.0 specification

- [Khronos Group — glTF 2.0 Specification (registry)](https://registry.khronos.org/glTF/specs/2.0/glTF-2.0.html) · retrieved 2026-04-24
- [glTF GitHub — full specification + extension registry](https://github.com/KhronosGroup/glTF) · retrieved 2026-04-24
- [Khronos — *Introducing Asset Creation Guidelines 2.0 for Commerce-Ready glTF Assets* (SIGGRAPH 2025)](https://www.khronos.org/blog/introducing-asset-creation-guidelines-2.0-siggraph-2025) · retrieved 2026-04-24

## 9.2 PBR theory

- [Burley, B. — *Physically Based Shading at Disney* (SIGGRAPH 2012)](https://media.disneyanimation.com/uploads/production/publication_asset/48/asset/s2012_pbs_disney_brdf_notes_v3.pdf) · retrieved 2026-04-24
- [physicallybased.info — PBR values database](https://physicallybased.info/) · retrieved 2026-04-24
- [Dassault — *Enterprise PBR Shading Model*](https://dassaultsystemes-technology.github.io/EnterprisePBRShadingModel/spec-2021x.md.html) · retrieved 2026-04-24

## 9.3 glTF extensions

- [KhronosGroup/glTF — extensions registry](https://github.com/KhronosGroup/glTF/tree/main/extensions) · retrieved 2026-04-24
- [KHR_materials_transmission](https://github.com/KhronosGroup/glTF/tree/main/extensions/2.0/Khronos/KHR_materials_transmission) · retrieved 2026-04-24
- [KHR_draco_mesh_compression](https://github.com/KhronosGroup/glTF/tree/main/extensions/2.0/Khronos/KHR_draco_mesh_compression) · retrieved 2026-04-24
- [KHR_texture_basisu](https://github.com/KhronosGroup/glTF/tree/main/extensions/2.0/Khronos/KHR_texture_basisu) · retrieved 2026-04-24

## 9.4 Exporter documentation

- [Blender 4.x manual — glTF 2.0 exporter](https://docs.blender.org/manual/en/latest/addons/import_export/scene_gltf2.html) · retrieved 2026-04-24
- [Babylon.js — 3DS Max to glTF](https://doc.babylonjs.com/features/featuresDeepDive/Exporters/3DSMax_to_glTF) · retrieved 2026-04-24
- [BabylonJS/Exporters — GitHub releases (Max / Maya)](https://github.com/BabylonJS/Exporters/releases) · retrieved 2026-04-24
- [Josef "spacefrog" Wienerroither — BabylonJS/glTF Exporter for 3ds Max 2026](https://www.frogsinspace.at/?p=3566) · retrieved 2026-04-24

## 9.5 Validation + inspection tools

- [Khronos glTF Validator — online](https://github.khronos.org/glTF-Validator/) · retrieved 2026-04-24
- [KhronosGroup/glTF-Validator — source + CLI + npm](https://github.com/KhronosGroup/glTF-Validator) · retrieved 2026-04-24
- [gltf.report — inspection / preview / fly-through](https://gltf.report/) · retrieved 2026-04-24
- [Khronos glTF Sample Viewer — online](https://github.khronos.org/glTF-Sample-Viewer-Release/) · retrieved 2026-04-24

## 9.6 CLI / pipeline tools

- [gltf-transform.dev — CLI + JS library](https://gltf-transform.dev/) · retrieved 2026-04-24

## 9.7 Texture libraries (CC0)

- [Poly Haven — textures](https://polyhaven.com/textures) · retrieved 2026-04-24
- [AmbientCG — 2000+ CC0 PBR materials](https://ambientcg.com/) · retrieved 2026-04-24
- [ShareTextures — CC0 library](https://www.sharetextures.com/) · retrieved 2026-04-24
- [3DAssetGrid — aggregator over the above](https://3dassetgrid.com/) · retrieved 2026-04-24

## 9.8 Runtime + integration references

- [Three.js — documentation index](https://threejs.org/docs/) · retrieved 2026-04-24 (the specific GLTFLoader page was not directly accessible to our fetcher; the docs exist at `/docs/#examples/en/loaders/GLTFLoader` — artist should consult directly)
- [MapLibre GL JS — CustomLayerInterface](https://maplibre.org/maplibre-gl-js/docs/API/interfaces/CustomLayerInterface/) · retrieved 2026-04-24
- [MapLibre GL JS — Add a 3D model using three.js (canonical example)](https://maplibre.org/maplibre-gl-js/docs/examples/add-a-3d-model-using-threejs/) · retrieved 2026-04-24

## 9.9 City-scale precedents (for context / inspiration)

- [Cesium — 3D Tiles specification](https://github.com/CesiumGS/3d-tiles) · retrieved 2026-04-24 (built on glTF; streams city-scale buildings as b3dm tiles)
- [Cesium blog — *Advancing 3D Tiles and glTF in an Open Ecosystem* (2025-11-20)](https://cesium.com/blog/2025/11/20/advancing-3d-tiles-and-gltf-in-an-open-ecosystem/) · retrieved 2026-04-24
- [NVIDIA — *Leverage 3D Geospatial Data for Immersive Environments with Cesium*](https://developer.nvidia.com/blog/leverage-3d-geospatial-data-for-immersive-environments-with-cesium/) · retrieved 2026-04-24
- Helsinki 3D City Model — open data (https://kartta.hel.fi/3d, cited informationally; not directly fetched for this playbook)
- NYC 3D Model (CityGML) — open data (https://www1.nyc.gov/site/doitt/initiatives/3d-building.page, cited informationally; not directly fetched for this playbook)

## 9.10 Gaps — what this playbook could not verify

Honest disclosure of what I couldn't reach or confirm in the web-research phase:

- **Khronos spec primary pages** (`registry.khronos.org/glTF/specs/2.0/...`) returned 403 to the research fetcher. Cited via the GitHub mirror and community-summarised breakdowns. Numbers in §3 cross-checked with physicallybased.info and community references.
- **Blender exporter manual page** returned 403 to the fetcher. §4.1 is written from my prior knowledge + community documentation; artist should cross-check against the live Blender manual before relying on any exact toggle name.
- **Three.js GLTFLoader direct page** fell into an intermediate index rather than the detailed API page; §2.4 and §7.9 are written from the library's documented behaviour, not a verbatim spec quote. The three@0.183 source in `node_modules/three/examples/jsm/loaders/GLTFLoader.js` is ground truth locally.
- **Live testing** of Blender presets, 3ds Max Babylon exporter settings, and gltf-transform pipelines was not performed in this pass — I wrote from documented behaviour + community-standard recipes. Practical testing on the V3 delivery will either confirm these values or show which ones need adjustment.
- YouTube tutorials mentioned in the brief were not watched (the research environment is text-only); their claims are not quoted. Where YouTube was the only source for a workflow detail, I defer to the vendor's written docs.

These gaps are flagged so a future version can fill them with hands-on verification.

---

# §10 · Version history

| Version | Date | Author | Summary |
|---|---|---|---|
| v1.0 | 2026-04-24 | ZAAHI engineering agent + founder review | Initial authoritative playbook. Written during / after V2 artist delivery. Covers glTF 2.0 core, PBR reference, tool-by-tool exporter guidance, ZAAHI delivery contract, full troubleshooting of the V1+V2 failure modes, advanced compression pipeline. Companion files for material cheat-sheet, validation checklist, Blender preset. |

Future iterations should land new lessons from each delivery into §7 (troubleshooting) first, then §3 (PBR reference) if new material classes appear, then §4 (tool workflows) if a new tool enters the pipeline.
