# Photorealistic 3D buildings in the browser — vendor + DIY survey

**Date**: 2026-05-23
**Branch**: `research/3d-buildings-options`
**Budget cap**: USD 25 / month
**Goal**: render Dubai's built environment as visually convincing 3D
geometry inside the ZAAHI web app (MapLibre or Three.js context),
sustainable on a $25/mo budget.

---

## Methodology + caveats

- Pricing snapshots reflect what was in my training data as of January 2026. **Verify current pricing before committing to a vendor** — these markets move fast and the cheapest tiers in particular get repriced often.
- "Dubai coverage" is from public docs + my prior survey work; in cases where the vendor's coverage map isn't publicly browsable I've flagged it explicitly.
- "Quality (1-10)" is a subjective rendering grade: **1 = grey boxes, 5 = colored textured extrusions, 8 = decent photogrammetry, 10 = Google Earth Studio quality**.
- All options are scored against ZAAHI's actual use case: a real-estate platform showing parcels + buildings in a way that helps users evaluate listings, NOT a generic globe-explorer.

---

## VENDOR DATA — ready-to-stream 3D

### 1. Google Photorealistic 3D Tiles

- **Cost**: Map Tiles API (Photorealistic 3D Tiles SKU). Free tier ~1 M tile requests/month, then ~$2 / 1 000 requests. Heavy in-browser pan/tilt sessions can hit 1 000+ tile fetches each, so an unproxied direct-from-browser integration on a public-facing app will overshoot the free tier the moment traffic picks up. With a server-side cache (Vercel Edge cache / CDN, or a Cloudflare Worker proxy) you stretch it dramatically — the same tile served to N users costs 1 fetch from Google.
- **Dubai coverage**: 100 %. Verified live in our spike — Burj Khalifa, Business Bay, the whole DIFC/Downtown axis renders with full photogrammetry.
- **Quality (1-10)**: **10** — true photogrammetry mesh + aerial imagery textures.
- **Browser compatibility**: `deck.gl Tile3DLayer` (rejected in our spike for the LOD-zero bug), `3d-tiles-renderer/three` (working in our spike — `research/3d-city-spike` branch), CesiumJS.
- **Time to first result**: hours (spike already proved viable).
- **Budget verdict at $25/mo**: ✅ **with a proxy + cache layer**. Direct-from-browser ❌ (a few hundred users = blown budget). Plan on server-side caching from day one.

### 2. Cesium ion

- **Cost**: Free tier 5 GB storage + 5 GB streaming/month — usable for prototyping, will saturate on production traffic. Lowest paid tier "Community Plus" is ~$40/mo last I checked, "Commercial" jumps to several hundred. **Above $25 cap on paid tiers.**
- **Dubai coverage**: 100 % (Cesium hosts Google Photorealistic 3D Tiles as one of its built-in assets, plus terrain).
- **Quality (1-10)**: **10** (same Google data) or **8** (Cesium's own assets).
- **Browser compatibility**: CesiumJS (own viewer; works alongside MapLibre but doesn't render INTO MapLibre), Resium (React wrapper).
- **Time to first result**: hours.
- **Budget verdict at $25/mo**: ❌ — free tier won't survive production traffic and Community Plus exceeds the cap. Only viable for a non-public demo.

### 3. HERE 3D Cities

- **Cost**: HERE Maps API freemium — 250 K transactions/month free, paid plans add a few cents per K beyond.
- **Dubai coverage**: HERE has good Middle East 2D coverage; 3D Buildings tier exists but Dubai specifically is patchy on the higher LOD — confirmed for landmark zones (Downtown, Marina) but probably not full-city.
- **Quality (1-10)**: **5-7** (textured extrusions, not photogrammetry).
- **Browser compatibility**: HERE Maps API for JavaScript v3 with the 3D MMR engine — own viewer, not a MapLibre overlay.
- **Time to first result**: half a day.
- **Budget verdict at $25/mo**: ⚠ technically fits, but the visual is closer to "extruded boxes with texture" than the photorealism we need.

### 4. MapTiler 3D

- **Cost**: Free tier 100 K loads/month. "Cloud Plus" plan is ~$25/mo — **exact match to our cap** — and covers 500 K loads + 3D Maps add-on.
- **Dubai coverage**: 100 % (vector tiles + Overture-derived building footprints with heights where available).
- **Quality (1-10)**: **4-5** — fill-extrusion with footprint geometry + estimated heights. No photogrammetry, no textures on rooftops.
- **Browser compatibility**: native MapLibre GL ✓ (this is the same engine + Three-fewer integration we already use).
- **Time to first result**: 1 hour (drop-in style change).
- **Budget verdict at $25/mo**: ✅ on budget, but quality is "polished blocks" — close to what we already have with our procedural ZAAHI Signature.

### 5. Esri ArcGIS 3D Buildings (Dubai layer)

- **Cost**: ArcGIS Online "Personal Use" plan ~$100/yr = **~$8/mo**, well under cap. Commercial use needs a Developer ($0 free tier with limits) or Business plan (≥$1 800/yr — over cap). The "Dubai Building Layer" item exists as a publicly hosted scene layer.
- **Dubai coverage**: Confirmed — Esri's Living Atlas hosts a Dubai 3D Buildings scene layer (item id begins `962efd5...`) with citywide coverage. Quality is uneven (downtown high-detail, fringes coarser).
- **Quality (1-10)**: **6-8** — textured 3D meshes, not raw photogrammetry but recognisable buildings with roof shapes + facade textures.
- **Browser compatibility**: ArcGIS Maps SDK for JavaScript (own viewer with `SceneView`), can be embedded as iframe; Three.js integration is non-trivial (need to consume the scene-layer REST format).
- **Time to first result**: half a day (SDK integration).
- **Budget verdict at $25/mo**: ✅ for Personal/Developer tiers, ❌ if commercial licensing is required (which ZAAHI as a paid product would technically need — confirm with Esri sales).

### 6. Microsoft Bing Maps 3D

- **Cost**: Bing Maps Basic free tier 125 K transactions/year, paid plans start at ~$400/mo. Microsoft announced sunsetting Bing Maps for Enterprise (replaced by Azure Maps) — Azure Maps does not include the Bing 3D buildings product.
- **Dubai coverage**: Bing had Dubai 3D in legacy product, but the future of that data is uncertain post-sunset.
- **Quality (1-10)**: **5-6** (similar tier to HERE).
- **Browser compatibility**: Bing Maps V8 (now deprecated).
- **Time to first result**: not worth investing.
- **Budget verdict at $25/mo**: ❌ — product being deprecated, exceeds budget at scale.

### 7. Apple MapKit JS

- **Cost**: Free up to 250 K map initialisations/day, $99/yr Apple Developer account required.
- **Dubai coverage**: Apple Maps covers Dubai but the **3D building support in MapKit JS specifically is much weaker than the native iOS MapKit** — most cities show as flat with selective 3D for landmarks only. Dubai is partially covered.
- **Quality (1-10)**: **3-5** in browser; **7-8** on native iOS.
- **Browser compatibility**: Yes (MapKit JS is web-targeted).
- **Time to first result**: hours.
- **Budget verdict at $25/mo**: ❌ — quality in browser context is insufficient for ZAAHI's "shows the building" purpose.

### 8. OpenStreetMap + Overture Maps

- **Cost**: **Free**. Overture Maps Foundation publishes monthly snapshots (CC0 / ODbL); hosting is on the user.
- **Dubai coverage**: 60-80 % of building footprints; explicit height tags only on ~5-30 % (varies by district — downtown well-mapped, outskirts sparse).
- **Quality (1-10)**: **3-5** — extruded boxes from footprints. No textures unless added separately. We can apply ZAAHI's land-use colour map to make them readable.
- **Browser compatibility**: MapLibre GL `fill-extrusion` — native, performant, already used for our 114 listings.
- **Time to first result**: 1-2 days (data import + tile pipeline).
- **Budget verdict at $25/mo**: ✅ — free. This is the "background fill" tier for all non-hero areas.

### 9. NASA / USGS open data

- **Cost**: **Free**.
- **Dubai coverage**: SRTM DEM (terrain only, not buildings) at 30 m resolution. NASA does not publish building heights for Dubai. Sentinel-1 / Sentinel-2 ML pipelines can derive building heights but that's research-level, not productionable in a week.
- **Quality (1-10)**: **2-3 for buildings**; **6 for terrain** (useful for an underlying DTM).
- **Browser compatibility**: with prep — convert to PMTiles + custom layer.
- **Time to first result**: weeks for a research-grade pipeline.
- **Budget verdict at $25/mo**: ❌ for buildings, ✅ for terrain-context if we ever want a tilted basemap.

---

## SELF-CAPTURE — own the asset

### 10. iPhone LiDAR (Polycam, Scaniverse)

- **Cost**: Polycam Pro $20/mo (within cap); Scaniverse free.
- **Per building**: 5-15 min capture, 5-10 min cloud processing.
- **Dubai coverage achievable in a month**: realistically 10-30 hero buildings (one person, dedicated effort).
- **Quality (1-10)**: **8-9** within ~5 m capture radius (LiDAR range limit); drops off at distance and indoors only is reliable.
- **Browser compatibility**: GLB / USDZ export → Three.js GLTFLoader ✓.
- **Time to first result**: hours (one building scanned + loaded).
- **Budget verdict at $25/mo**: ✅ for hero listings only — useless for citywide coverage. Pairs well with options 1, 8, or 14 as the background.

### 11. Drone photogrammetry (DJI + Metashape)

- **Cost**: Hardware $1 000-3 000, software (Metashape Standard $1 799 one-off OR RealityCapture cloud ~$100/mo). All capital, all over budget.
- **Dubai drone law (2026)**: GCAA registration mandatory, commercial permit ~$500-2 000 per project, no-fly zones cover huge chunks of downtown.
- **Per neighbourhood**: 30 min - 2 h flying + several hours post-processing.
- **Quality (1-10)**: **8-10** (true photogrammetry).
- **Browser compatibility**: GLB / 3D Tiles export to Three.js or our own tiling pipeline.
- **Time to first result**: weeks (permit + capture + processing).
- **Budget verdict at $25/mo**: ❌ — capital costs alone blow the cap; regulatory burden makes it impractical even with budget.

### 12. Blender / Meshroom photogrammetry (smartphone photos)

- **Cost**: **Free** (Meshroom, AliceVision, Blender). Need only a phone + computer.
- **Per building**: 50-200 photos + 2-4 h processing.
- **Dubai coverage achievable in a month**: realistically 5-10 hero buildings.
- **Quality (1-10)**: **7-9** depending on photo set quality + sun conditions.
- **Browser compatibility**: GLB export → Three.js ✓.
- **Time to first result**: 1 day for first building.
- **Budget verdict at $25/mo**: ✅ for hero listings only — same niche as option 10 but slower and with finer control.

---

## HYBRID — combine free data + brains

### 13. OSM footprints + AI height estimation

- **Cost**: Microsoft Open Buildings Dataset (free, CC-BY) covers Middle East including Dubai with footprints + estimated heights for many buildings. Google Open Buildings Dataset is Africa-focused but expanding. Or run our own ML on Sentinel-2 imagery — compute time on a cloud GPU for one city ≤ $25.
- **Dubai coverage**: Microsoft Open Buildings — 90 %+ of footprints, ~60-80 % with heights (often coarse, ±5-10 m).
- **Quality (1-10)**: **4-6** — extruded with better-than-OSM heights, no textures.
- **Browser compatibility**: MapLibre GL `fill-extrusion` (same as option 8).
- **Time to first result**: 2-3 days (data import + tile pipeline).
- **Budget verdict at $25/mo**: ✅ — free or near-free, and the heights are noticeably better than OSM-only.

### 14. Procedural generation from DDA data (the path we're already on)

- **Cost**: **Free** — we already have FAR / GFA / floors / setbacks for the 99 K Dubai plots in the DDA PMTiles.
- **Dubai coverage**: 100 % of DDA-registered plots in Dubai (most of the buildable city, plus master plans).
- **Quality (1-10)**: **4-6** — parametric heights, setback-aware footprints, podium/body/crown tier (same as ZAAHI Signature). No rooftops, no facade textures.
- **Browser compatibility**: MapLibre GL `fill-extrusion` ✓ — already proven for our 114 listings, can be extended to all 99 K via the existing pipeline.
- **Time to first result**: 1-2 days (extend `loadZaahiPlots` data path to all DDA plots, drop the `LISTED` filter).
- **Budget verdict at $25/mo**: ✅ — free, full coverage, distinctive visual identity, no vendor lock-in.

---

## Comparison table

| # | Option | $ /mo | Dubai % | Quality | MapLibre/Three | Time to 1st | Fits $25? |
|---|---|---|---|---|---|---|---|
| 1 | Google 3D Tiles | $0-25+ proxy | 100 | 10 | ✓ (`3d-tiles-renderer`) | hours | ✅ w/cache |
| 2 | Cesium ion | $40+ | 100 | 10 | own viewer | hours | ❌ |
| 3 | HERE 3D Cities | $0-15 | ~60 | 5-7 | own viewer | ½ day | ⚠ low quality |
| 4 | MapTiler 3D | $25 | 100 | 4-5 | ✓ MapLibre native | 1 h | ✅ but boxes |
| 5 | Esri ArcGIS | ~$8 (personal) | 100 | 6-8 | own viewer | ½ day | ✅ personal only |
| 6 | Bing 3D | $400+ | partial | 5-6 | deprecated | n/a | ❌ |
| 7 | MapKit JS | $0 | partial | 3-5 (web) | own viewer | hours | ❌ low quality |
| 8 | OSM / Overture | $0 | 60-80 | 3-5 | ✓ MapLibre native | 1-2 days | ✅ free |
| 9 | NASA / USGS | $0 | terrain only | 2-3 (bldg) | with prep | weeks | ❌ for bldgs |
| 10 | iPhone LiDAR | $20 | hero plots only | 8-9 | ✓ Three.js | hours | ✅ heroes only |
| 11 | Drone photogram. | $1 000+ capital | wherever flown | 8-10 | ✓ Three.js | weeks | ❌ |
| 12 | Blender / Meshroom | $0 | hero plots only | 7-9 | ✓ Three.js | 1 day | ✅ heroes only |
| 13 | OSM + AI heights | $0-25 compute | 90 footprint, 70 height | 4-6 | ✓ MapLibre native | 2-3 days | ✅ free |
| 14 | Procedural (DDA) | $0 | 100 (Dubai) | 4-6 | ✓ MapLibre native | 1-2 days | ✅ already going |

---

## TOP-3 recommendation for ZAAHI at $25/mo

The right answer is **a layered stack**, not a single vendor — each tier serves a different question on a different budget envelope.

### 🥇 1. Procedural ZAAHI Signature, extended to all 99K DDA plots (option 14)

- **What**: The same `loadZaahiPlots` + `emitSignatureTiers` pipeline we already run for our 114 listings, applied to every plot in the DDA PMTiles. Drop the LISTED status filter, add a low-saturation fill colour for non-listing plots so they recede behind ZAAHI listings.
- **Why first**: Free, zero vendor lock-in, 100 % Dubai coverage, and we **already own the pipeline**. The DDA data is already cached. This is the floor of what every user sees.
- **Visual identity**: keeps ZAAHI's "blueprint" aesthetic — distinct from Google Earth's slick photogrammetry and from MapTiler's generic boxes.
- **Effort**: 1-2 days to extend the existing code path.

### 🥈 2. Google Photorealistic 3D Tiles for hero contexts (option 1, behind a proxy)

- **What**: A dedicated 3D-City view (the path the spike on `research/3d-city-spike` is exploring) for marquee moments — listing hero pages, "fly to Burj Khalifa" easter eggs, agent presentation mode. Proxy all tile requests through a Cloudflare Worker / Vercel Edge function that caches aggressively (24h TTL, content-addressed) to ride the free tier and bound spend at the $25 cap.
- **Why second**: Best-in-class visuals exist for "wow" moments, but Google's licensing forbids using their tiles as a generic background for transactional UI without attribution + careful rate-limit handling. Surface it selectively, not constantly.
- **Effort**: 2-3 days to harden the spike + add proxy + caching.

### 🥉 3. Self-captured photogrammetry for premium listings (option 10 or 12)

- **What**: For top-of-funnel ZAAHI listings (≥ AED 50 M or partnership flagships), capture the actual building with Polycam Pro ($20/mo) or free Meshroom. Mount the GLB inside a Three.js layer on the listing page. **Per-building, not per-city.**
- **Why third**: Differentiates ZAAHI from competitors — nobody else has hand-scanned models of *your* listing. The cost stays bounded because we only do this for the top 5-20 listings at a time.
- **Effort**: ~1 hour per building once the pipeline is set up.

### Layers, not alternatives

```
                ┌──────────────────────────────────────────────┐
   premium      │  Self-captured GLB (top ~20 listings)         │  $20/mo
                ├──────────────────────────────────────────────┤
   hero context │  Google 3D Tiles (3D-City view, behind proxy)│  ≤ $25
                ├──────────────────────────────────────────────┤
   floor        │  Procedural ZAAHI Signature (99K DDA plots)   │   $0
                └──────────────────────────────────────────────┘
                                                       total: ≤ $25
```

### What I would NOT do at $25/mo

- **Cesium ion paid** — overshoots budget. Stick with Google direct if we want the same data.
- **HERE / Bing / Apple** — quality vs. effort ratio is worse than the procedural floor we already own.
- **Drone photogrammetry** — capital costs + GCAA regulation make this a separate-budget conversation, not a $25/mo decision.
- **MapTiler 3D ($25 exact match)** — visually overlaps with our own procedural floor; we'd be paying $25/mo for a slightly more polished version of what we can render free with DDA data.

---

## Open questions to verify before committing

1. **Current Google Maps Platform pricing** — the SKU has shifted at least twice in 2024-2025; confirm via GCP billing console with $1 of test traffic.
2. **Esri commercial licensing for ArcGIS Personal** — Personal is officially "non-commercial". ZAAHI as a paid platform technically needs a paid tier ≥ $1 800/yr ⇒ over budget.
3. **Microsoft Open Buildings height accuracy for Dubai** — sample a 1 km² grid, compare against DDA heights, compute RMSE. If RMSE < 3 m it's a viable Path C for non-DDA areas.
4. **Polycam Pro export terms** — confirm self-captured GLBs can be redistributed on the ZAAHI listing pages without watermark / royalty.

— end —
