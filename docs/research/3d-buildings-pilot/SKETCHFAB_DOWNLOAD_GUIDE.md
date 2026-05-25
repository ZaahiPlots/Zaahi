# Sketchfab / Sketchfab-like 3D model download guide

For sourcing pre-made 3D building models for ZAAHI's Dubai 3D-city
view. Targets: Business Bay heroes (Burj Khalifa, Museum of the
Future, Dubai Frame, Vision Tower, etc.) and any other landmark
buildings.

The pipeline expects models to drop straight into `public/glb/buildings/`
and be referenced from `src/app/parcels/map/page.tsx`. To minimise
re-export / cleanup work, follow this guide when downloading.

---

## 1. Where to search

Best sources, in order of preference:

1. **Sketchfab** — `sketchfab.com/search?q=burj+khalifa&type=models`
   Filter: free/paid + downloadable (toggle "Downloadable models").
2. **CGTrader** — `cgtrader.com/3d-models?keywords=dubai+business+bay`
   Mostly paid but high quality; check license is royalty-free / commercial.
3. **TurboSquid** — `turbosquid.com/3d-models/dubai`
   Paid, professional. Often game-ready GLB exports.
4. **3D Warehouse** (SketchUp) — `3dwarehouse.sketchup.com`
   Free but `.skp` format; needs conversion in SketchUp or Blender.
5. **Google Earth via Blosm/Blosm-Pro** — last resort, big polygons + Google ToS issues.

Skip: Open3DModel, Free3D — usually low quality / broken UVs.

---

## 2. Format to download — strict preference order

| Format | Use? | Notes |
|---|---|---|
| **`.glb` (Binary glTF)** | ✅ BEST | Single file, textures embedded, deck.gl-native. Pick this whenever offered. |
| `.gltf` + `.bin` + textures | ✅ OK | Multi-file; we'll re-pack to `.glb` via Blender. Keep folder intact. |
| `.fbx` | ⚠ Convert | Re-export via Blender to `.glb`. Common from 3ds Max. |
| `.obj` + `.mtl` + textures | ⚠ Convert | Re-export via Blender to `.glb`. No animations or PBR materials. |
| `.usdz` | ⚠ Convert | Apple format — convert via Blender's USD importer. |
| `.skp` (SketchUp) | ❌ Avoid | Needs SketchUp Pro to open. Bad geometry usually. |
| `.dae` (Collada) | ❌ Avoid | Deprecated, broken textures often. |
| `.blend` | ⚠ OK | Open in Blender, export `.glb`. |
| `.max` / `.c4d` / `.lwo` | ❌ Skip | Proprietary; can't open without paid software. |

**Rule of thumb:** if the model isn't available in `.glb` or `.gltf`,
ask whether you actually need that specific model — there are usually
similar Dubai building scans available in `.glb`.

---

## 3. Download settings (Sketchfab specifically)

When clicking "Download 3D Model" on Sketchfab:

- **Format**: `glTF (Auto-converted)` → produces `.glb`. ALWAYS choose this if available.
  Fallback: `Original format` (whatever the artist uploaded) — only if glTF auto-convert is broken / missing textures.
- **Textures**: leave default (embedded). If a "low-resolution" toggle exists, **use it** for files >50 MB to keep mobile-friendly.
- **License acknowledge**: tick the box (CC-BY / royalty-free models usually).

Don't worry about "rigged" or "animated" toggles — buildings are static.

---

## 4. Where to put files

All hero building models go in:

```
public/glb/buildings/
├── millennium-tower.glb              ← our parametric (current prod hero)
├── burj-khalifa.glb                  ← downloaded
├── museum-of-the-future.glb          ← downloaded
├── dubai-frame.glb                   ← downloaded
├── vision-tower.glb                  ← downloaded
└── …one per building
```

Create the `buildings/` subdirectory if it doesn't exist. Don't drop
files into `public/glb/` root (reserved for special cases / legacy).

**License / attribution files:** put alongside the GLB:

```
public/glb/buildings/burj-khalifa.LICENSE.txt
```

with the license text (CC-BY artist name, source URL, date downloaded).
ZAAHI is a commercial product — license trail must exist.

---

## 5. File naming convention

`<building-slug>.glb` — lowercase, kebab-case, no spaces, no diacritics, no version suffix.

| Building | Filename |
|---|---|
| Burj Khalifa | `burj-khalifa.glb` |
| Museum of the Future | `museum-of-the-future.glb` |
| The Opus | `the-opus.glb` |
| Cayan Tower / Infinity Tower | `cayan-tower.glb` |
| Princess Tower | `princess-tower.glb` |
| Marina 101 | `marina-101.glb` |
| Vision Tower | `vision-tower.glb` |
| Churchill Tower | `churchill-tower.glb` |
| Ubora Tower 1 | `ubora-tower-1.glb` |
| Atlantis The Royal | `atlantis-the-royal.glb` |

Match the slug to what's in the corresponding `Parcel.name` field if
that building has a ZAAHI plot listing. The map renders pick this up
via the building name → slug lookup we'll add to `page.tsx` once
files start landing.

If you have multiple variants (LOD, different artists), append a
qualifier: `burj-khalifa.lod0.glb`, `burj-khalifa.lod1.glb`. Default
build picks `.glb` (no qualifier) — qualifiers are opt-in.

---

## 6. Size / polygon limits

**Per-file targets** (per deck.gl + mobile constraints):

| Bucket | File size | Triangles | Use case |
|---|---|---|---|
| ✅ Ideal | < 2 MB | < 30 000 | most heroes |
| ✅ OK | 2–6 MB | 30K–100K | iconic landmarks (Burj Khalifa) |
| ⚠ Heavy | 6–15 MB | 100K–300K | only for plot-detail close-ups |
| ❌ Too big | > 15 MB | > 300 000 | requires decimation in Blender — reject by default |

**Total scene budget** for combined BB district view: **~40 MB combined GLB** /
~5M triangles. So you can afford ~5–10 high-quality heroes + ~440
low-poly long-tail buildings. Don't pull more than 3–4 hero models
over 5 MB each.

**Check before downloading**: Sketchfab shows a "Statistics" panel
on each model page with vertex / triangle count and file size. If
either exceeds the limits above, look for an alternative.

---

## 7. Texture handling

- **Embedded** textures in `.glb` — default, preferred. Single file.
- **Separate** texture files (when downloading multi-file glTF):
  keep the whole folder intact; we'll re-pack via Blender. Don't
  manually rename texture files.
- **4K+ textures** (4096×4096 or higher): re-export at 1024 or 2048
  via Blender. Most building exteriors don't need more than 2K.
- **PNG vs JPG**: doesn't matter inside a GLB — both work. JPG saves
  ~30 % file size on photo-derived textures.

---

## 8. What to AVOID

- **Models with built-in terrain** — they ship with a ground plane,
  trees, surrounding cars that ZAAHI doesn't want. **Reject** unless
  you can isolate just the building in Blender first. Symptom: file
  size > 30 MB for one tower, or polygon count > 500K.
- **Models with baked-in cameras / lights / animations** — deck.gl
  ignores these but they bloat the file. Re-export via Blender with
  cameras/lights stripped.
- **Models with weird scale** — should be roughly real-world meters
  (e.g., Burj Khalifa at 828 m tall, footprint ~50 m). If a model is
  scaled to 1 unit total, it'll render as a 1 m blob on the map.
  Symptom: open in Blender, building's height in meters ≠ real-world
  height.
- **Models with `Empty` objects, armatures, rigs** — strip in Blender
  before exporting.
- **Models with multiple disconnected meshes** (one per floor) —
  these often render with z-fighting / depth artifacts. Prefer
  single-mesh models or fewer parts.
- **Models > 100 MB** — almost always overkill (archviz interiors,
  every window modeled). Skip.
- **Models that look photoreal in the Sketchfab preview but use
  Sketchfab's PBR renderer** — the renderer flatters; the model
  itself may be average. Look at wireframe / matcap view to assess.
- **"Building pack" bundles** — a pack of 20 generic skyscrapers
  often produces lower quality than picking individual hero models.

---

## 9. Pre-flight check before committing a downloaded GLB

Before you copy the file to `public/glb/buildings/`, open it in
Blender once to verify:

```bash
blender --background \
  --python-expr "
import bpy
bpy.ops.import_scene.gltf(filepath='/path/to/downloaded.glb')
import sys
n = sum(1 for o in bpy.data.objects if o.type == 'MESH')
tris = sum(sum(len(p.vertices)-2 for p in o.data.polygons)
           for o in bpy.data.objects if o.type == 'MESH')
print(f'MESH OBJECTS: {n}, TRIANGLES: {tris}')
for o in bpy.data.objects:
    if o.type == 'MESH':
        print(f'  {o.name}: dims={o.dimensions}')
"
```

Acceptance checklist:

- [ ] `MESH OBJECTS` ≤ 100 (more = scene clutter, not just the building)
- [ ] `TRIANGLES` matches the table in §6
- [ ] Building dimensions in meters look right (Burj Khalifa Z ≈ 828; BB tower Z ≈ 150–250)
- [ ] No unexpected objects (`Ground`, `Tree*`, `Camera*`, `Lamp*`) — if present, strip in Blender first
- [ ] glTF magic verified: `xxd file.glb | head -1` → starts with `676c5446`

---

## 10. Quick handoff workflow

Per downloaded model:

1. Click **Download 3D Model → glTF (Auto-converted)** on Sketchfab
2. Save the `.glb` to `~/Downloads/<artist-slug>-<model-slug>.glb`
3. Open in Blender (Files → Import → glTF), eyeball the building
4. If acceptable per §6 + §8 above, rename to `<our-slug>.glb` and
   copy to `public/glb/buildings/<our-slug>.glb`
5. Drop a `<our-slug>.LICENSE.txt` next to it with attribution
6. Ping me with the slug + Sketchfab URL — I'll wire it up in
   `page.tsx` (deck.gl ScenegraphLayer per hero) and verify it
   renders correctly on the map at the building's real-world coords

If any step fails (file too big, weird scale, broken texture), skip
that model and find another. Don't try to fix bad downloads — it's
faster to find a clean source.

---

## 11. Recommended initial pull list (priority order)

For ZAAHI's first 3D-city pass, prioritise iconic Dubai landmarks
visible from BB district:

| # | Building | Why |
|---|---|---|
| 1 | **Burj Khalifa** | Tallest building world; signature Dubai shot |
| 2 | **Museum of the Future** | Unique torus form; instant Dubai-recognition |
| 3 | **Dubai Frame** | Iconic landmark; relatively low-poly geometry |
| 4 | **The Opus** (Zaha Hadid) | In BB itself; void cube is photogenic |
| 5 | **Burj Al Arab** | World-famous sail; if at all reachable in BB camera |
| 6 | **Cayan Tower** (Marina) | Twisted form; visible from BB on clear days |
| 7 | **Princess Tower** | Tall Marina backdrop |
| 8 | **Marina 101** | Marina skyline |
| 9 | **Atlantis The Royal** | Palm Jumeirah signature |
| 10 | **Address Downtown** | Next to Burj Khalifa, fills downtown skyline |

Once you have these 5–10, ZAAHI's `/parcels/map` 3D view goes from
"one Millennium hero" to "recognisable Dubai skyline". The remaining
~440 long-tail BB buildings can stay parametric (already handled
by `build-all-bb.py`).
