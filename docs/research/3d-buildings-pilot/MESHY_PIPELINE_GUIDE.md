# Meshy AI Building Pipeline — Best Practices

Permanent reference for any Meshy generation of Dubai buildings.
Captured 2026-05-27 after 10+ buildings ran through the pipeline.

## Photo preparation (before Meshy submit)

1. **Remove background** — crop sky, ground, neighboring buildings.
   The target object should sit on a clean white or transparent
   background. Use Python PIL or `rembg` if automation is needed.
2. **Resolution: minimum 1040 × 1040 px.** Higher is better; Meshy
   internally resizes anyway, but lossy source = lossy reconstruction.
3. **4 photos at distinct angles** — front, side, back, 3/4. Different
   compositions of the same angle are wasted; rotate around the
   building.
4. **Object centered, fills 70%+ of the frame.** Photos where the
   building is a small part of a wider cityscape consistently fail.
5. **Consistent visual style across the four** — all daytime OR all
   night, similar exposure, similar weather. Mixed styles confuse
   Meshy's reconstruction.

## Image-to-3D API parameters

```json
{
  "image_urls": [/* 4 base64 data URIs or remote URLs */],
  "ai_model": "meshy-6",
  "topology": "quad",
  "should_texture": true,
  "target_formats": ["glb"]
}
```

POST to `https://api.meshy.ai/openapi/v1/multi-image-to-3d`. Bearer
auth, key from `~/.meshy-key`. Expect 30 credits per job and 2–10 min
wall-clock depending on raw mesh density.

## Text-to-3D prompt template (fallback when photos unavailable)

```
A modern Dubai skyscraper, {NAME}, {HEIGHT}m tall, {FLOORS} floors,
{SHAPE DESCRIPTION}, glass and steel facade,
{COLOR} tinted windows, {UNIQUE FEATURES},
architectural visualization, photorealistic,
highly detailed, clean geometry
```

Worked example (Millennium Tower):

```
A modern Dubai skyscraper, Millennium Tower, 285m tall, 60 floors,
rectangular tower with prominent white V-shaped diagonal bracing on
front facade, teal-blue tinted glass windows, dark slate side walls,
cylindrical glass drum crown with horizontal louvers, thin antenna
spire on top, dark podium base, architectural visualization,
photorealistic, highly detailed, clean geometry
```

## Post-Meshy pipeline

1. Download raw GLB from `model_urls.glb` in the SUCCEEDED response.
2. Blender headless: decimate to `< 300K tris / < 15 MB` via
   `pipeline_simple.py` or `pipeline_force_zup.py`. Default ratio
   0.05–0.18 depending on raw size.
3. Scale to real-world dimensions — height/width/depth from
   skyscrapercenter.com or CTBUH PDF.
4. Y-up fix if Meshy emits an axis-confused mesh. `pipeline_force_zup.py`
   bypasses auto-detect for cases like Burj Al Arab v2 / Royal Atlantis
   where stray debris extends one horizontal axis past the true vertical.
5. Texture downscale 2048 → 1024 (the `TEXTURE_MAX_DIM` cap in the
   pipeline scripts). Saves ~30% of final GLB size with no visible loss
   at z14 map zoom.
6. Vision-API compare against the reference photos. View the four
   renders side-by-side with the originals.
7. Material fix in Blender if colors are off. Disconnect any image
   texture from Base Color, set flat warm-beige (or matching) Principled
   BSDF + metallic / roughness — see `fix_materials.py` precedent.
8. Export clean `.glb` to `public/glb/buildings/{name}.glb`. File path
   must be kebab-case matching the `HERO_GLB_URL_*` constant.

## Anti-patterns — do not do

- **Don't submit photos with multiple buildings in frame.** Meshy
  fragments multi-building scenes into floating disconnected meshes
  (the Address Fountain Views failure, the Burj Al Arab v2 debris).
- **Don't lean on aerial / top-down photos as the primary set.**
  They give too little vertical information; result comes out as a
  flat plate. One aerial mixed with three ground views is OK.
- **Don't submit photos where the sky occupies 60%+ of the frame.**
  Meshy's reconstruction starves on near-empty pixels.
- **Don't use Meshy for multi-tower complexes** with disconnected
  tower-blocks (Address Fountain Views — three towers + podium —
  failed catastrophically). For those, build procedurally in Blender.
- **Don't use Meshy for open-frame structures** (Kempinski The
  Boulevard's X-frame crown was lost on both attempts). Open lattice
  geometry confuses the neural reconstruction.

## Scripts available in `meshy-test/`

- `submit_*.py` — per-building submit script template (4-photo
  multi-image POST)
- `poll_*.py` — poll until SUCCEEDED then download GLB
- `pipeline_simple.py` — import → decimate → Y-up auto-detect →
  non-uniform scale → texture cap → export
- `pipeline_force_zup.py` — same but skips auto-detect; use when
  raw mesh has horizontal-extending debris
- `fix_materials.py` — disconnect texture, set flat BSDF
- `render_*.py` — 4-view Blender headless render for Vision-API
  comparison
- `decimate_*.py` — variations with loose-separate fragment cleanup
  (avoid for textured meshes — Decimate Collapse + UV delimit creates
  thousands of UV-island fragments and `keep largest` returns < 1K
  faces; see Burj Vista 1 v1 failure)
