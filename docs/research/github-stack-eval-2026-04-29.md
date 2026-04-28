# GitHub Ecosystem Evaluation — 9 Libraries для ZAAHI Stack

**Дата:** 2026-04-29
**Branch:** `research/vara-adgm-2026-04-28` (continuing research stream)
**Cross-ref:**
- Phase 1 — `docs/research/innovation-hubs-2026-04-28.md` commit `b825a6c`
- Phase 2 — `docs/research/vara-adgm-tokenization-2026-04-28.md` commit `67587e8` (Section 3 timing rec = Y2 Phase 2)

**Scope.** Section 5 of the broader research stream — technical DD на 9 GitHub libraries для ZAAHI's frontend stack (Next.js + MapLibre + Three.js + Anthropic Claude Sonnet 4.6 / Archibald AI). Output: ranked **install / defer / skip** list с rationale per item, evaluated against ZAAHI Master Tree phasing (Phase 1 Owner-First M1-9 · Phase 2 External M10-17 · Phase 3 Scale M18+).

> **Two reframes applied based on verification:**
> 1. **#1 не bertt's repo** — bertt/3dtiles на github.com — это C# library, irrelevant to Node.js stack. Bertt's March 2026 "3D Tiles в MapLibre" demos use **NASA-AMMOS/3DTilesRendererJS** (npm `3d-tiles-renderer`) под капотом. DD ниже — на actual underlying lib.
> 2. **#5 не community esri-gl** — официальный **`@esri/maplibre-arcgis`** (Esri-maintained, Apache-2.0) supersedes both community `mapbox-gl-esri-sources` и `muimsd/esri-gl` (последний README сам flag'ает "use with caution in production"). DD ниже — на official Esri lib (community alternative cited side-by-side для completeness).

---

## 1. Executive Summary

### 🟢 INSTALL (Top 3 — Phase 1 immediate)

| Rank | Library | Phase fit | Why now |
|------|---------|-----------|---------|
| **1** | **`@geomatico/maplibre-cog-protocol`** | Phase 1 Intelligence (§66-70) | 6K wk-dl, MIT, active, MapLibre Newsletter feature. Cloud-native raster (DEM, satellite, NDVI) с HTTP range requests = no full-file download. Direct fit для Master Tree §66-70 Intelligence layers. |
| **2** | **`@watergis/maplibre-gl-export`** | Phase 1 Owner-First (M1-9) | 1.3K wk-dl, MIT, active, listed в official MapLibre plugins. PDF/PNG/SVG export — direct fit для owner-deliverable reports + Feasibility v5.0 outputs + listing flyers. |
| **3** | **PlayCanvas SuperSplat (external editor)** | Content workflow (any phase) | 0 KB bundle impact (standalone editor at superspl.at/editor, not npm dep). MIT, very active (release yesterday). Pre-processing tool для Gaussian Splat content if/when adopted в Phase 2. |

### 🟡 DEFER (Phase 2 / M10-17, re-evaluate at trigger)

| Library | Trigger to install |
|---------|--------------------|
| **NASA-AMMOS `3d-tiles-renderer`** | Когда current Three.js custom-layer 3D approach hits performance ceiling (>10K buildings rendered) |
| **`@mkkellogg/gaussian-splats-3d`** | Когда photorealistic property tours станут required для external users — но **maintenance risk: README self-declared dormant** |
| **`route-snapper`** | Когда Master Tree §66-70 Intelligence layer scales до drive-time accessibility scoring — **dormant flag (no GitHub releases ever)** |

### 🔴 SKIP (rationale: redundant / vendor lock / no use case)

| Library | Why skip |
|---------|----------|
| **`@dvt3d/maplibre-three-plugin`** | ZAAHI уже имеет working MapLibre↔Three.js bridge per recent commits (`feat(buildings)` series, CustomLayer FBO fixes). Adopting 76-star low-traction lib = unnecessary maintenance dep. |
| **`@esri/maplibre-arcgis`** (and community `esri-gl`) | Нет identified UAE/Dubai Esri-hosted dataset dependency в ZAAHI's current data acquisition pipeline (DLD + custom + MapLibre tiles dominate). Re-evaluate ТОЛЬКО если data team flags specific ArcGIS Online layer needed. |
| **`@mindstudio-ai/agent`** | Duplicates Anthropic SDK functionality для Archibald AI; vendor lock-in to MindStudio platform (separate billing); v0.1.58 = pre-1.0 unstable API; browser usage limited (Node-primary). ZAAHI's existing Claude Sonnet 4.6 direct integration is the better path. |

---

## 2. Library-by-Library Findings Table

| # | Library | npm wkly | Stars | Last release | License | TS | Maintenance | Verdict |
|---|---------|---------:|------:|--------------|---------|----|-----|---------|
| 1 | NASA-AMMOS `3d-tiles-renderer` | 16,746 | 2,300 | 10 Apr 2026 (v0.4.24) | Apache-2.0 | yes | active | DEFER |
| 2 | `@dvt3d/maplibre-three-plugin` | 380 | 76 | 27 Feb 2026 (v1.5.0) | Apache-2.0 | yes | active | SKIP |
| 3 | `@mkkellogg/gaussian-splats-3d` | 16,080 | 2,700 | 25 Jan 2026 (v0.4.7) | MIT | no | dormant trending (self-declared) | DEFER |
| 4 | `playcanvas/SuperSplat` | n/a (editor) | 5,000 | 28 Apr 2026 (v2.25.0) | MIT | yes | active | INSTALL (external) |
| 5a | `muimsd/esri-gl` (community) | 41 | 11 | 17 Apr 2026 | MIT | yes | pre-traction | SKIP |
| 5b | `@esri/maplibre-arcgis` (official) | 810 | 13 | 9 Mar 2026 (v1.2.0) | Apache-2.0 | yes | active | SKIP (no UAE use case) |
| 6 | `@geomatico/maplibre-cog-protocol` | 6,070 | 146 | active | MIT | yes | active | **INSTALL #1** |
| 7 | `@watergis/maplibre-gl-export` | 1,319 | 175 | 28 Mar 2026 (v4.1.2) | MIT | yes | active | **INSTALL #2** |
| 8 | `route-snapper` (`dabreegster/route_snapper`) | 132 | 216 | "no releases published" | Apache-2.0 | yes | dormant trending | DEFER |
| 9 | `@mindstudio-ai/agent` | 962 | 46 | 20 Apr 2026 (v0.1.58) | MIT | yes | active | SKIP |

(All metrics retrieved 2026-04-29 via `api.npmjs.org/downloads/point/last-week/<pkg>` + GitHub stars pages. Bundle size figures `data not found` — bundlephobia returned 403 for all packages — flagged inline rather than guessed.)

---

## 3. Per-Library Rationale

### #1 NASA-AMMOS `3d-tiles-renderer` — DEFER

**What.** Canonical 3D Tiles JS renderer (Cesium-style city/building tilesets). Apache-2.0 licensed, NASA AMMOS production-validated, 16.7K weekly downloads.

**ZAAHI fit.** ZAAHI already has working 3D buildings layer per recent `feat(buildings)` commit series (digital-twin Buildings layer на /parcels/map, CustomLayer FBO fix landed). Current approach uses Three.js custom layer directly — no 3D Tiles abstraction needed at current scale (~hundreds of buildings).

**Adoption trigger.** When ZAAHI scales beyond ~10K rendered buildings simultaneously OR needs to consume external Cesium-format city tilesets (e.g., DLD-published 3D city tiles if they emerge). Until then, marginal benefit < migration cost.

**Verdict: DEFER to Phase 2 (M10-17)** — re-evaluate when buildings layer hits performance ceiling or when external 3D tileset source identified.

### #2 `@dvt3d/maplibre-three-plugin` — SKIP

**What.** Explicit MapLibre↔Three.js bridge plugin. Apache-2.0, active maintenance, but small audience (76 stars / 380 wk-dl).

**ZAAHI fit.** ZAAHI already has working custom MapLibre↔Three.js integration (per `feat(buildings): digital-twin Buildings layer` + `fix(buildings): CustomLayer FBO collision` commits). Adopting third-party bridge would mean rewriting working code to depend on a low-traction library.

**Verdict: SKIP** — existing custom integration is more maintainable. If anyone proposes adoption, ask: "what existing code does this replace, and what tests prove it doesn't regress?"

### #3 `@mkkellogg/gaussian-splats-3d` — DEFER

**What.** Dominant Three.js Gaussian Splatting library by downloads (16K wk-dl, 2.7K stars). MIT-licensed.

**⚠️ Maintenance flag.** README explicitly states **"no longer in active development."** Despite this, v0.4.7 shipped 25 Jan 2026 (PlayCanvas + SPZ compression). 12 open PRs unmerged. Community fork `guyettinger/gle-gaussian-splat-3d` adds TypeScript types.

**ZAAHI fit.** Use case = photorealistic property captures для 3D Signature module. Current 3D Signature is artist-delivered native-metres geometry — Gaussian Splats would be a parallel content modality, not replacement. Material strategic value only when external users (Phase 2 M10-17) start demanding immersive tours.

**Verdict: DEFER to Phase 2.** When trigger fires:
- First check if active fork exists (`guyettinger/gle-gaussian-splat-3d` or similar)
- Validate TypeScript story (community types)
- Otherwise consider PlayCanvas-engine GS (native PlayCanvas integration may be more sustainable than this dormant lib)

### #4 PlayCanvas SuperSplat — INSTALL (external editor, not npm dep)

**What.** Web-based Gaussian Splat editor + WebXR preview (superspl.at/editor). 5K stars, MIT, very active (release 28 Apr 2026).

**ZAAHI fit.** Pre-processing tool для content team. **0 KB bundle impact** — used externally via web app, not consumed as runtime dependency. Pairs with #3 if/when GS content workflow adopted.

**Verdict: INSTALL** as content-team workflow tool whenever Gaussian Splat content first produced. Zero technical commitment, zero bundle cost. If GS content never produced, no harm done.

### #5 `@esri/maplibre-arcgis` (official Esri) — SKIP unless UAE Esri use case identified

**What.** Officially Esri-maintained Apache-2.0 plugin for ArcGIS data в MapLibre. Supersedes community `mapbox-gl-esri-sources` and `muimsd/esri-gl` (community alt explicitly self-flags "use with caution in production"). 810 wk-dl, 20× higher than community alternative.

**ZAAHI fit.** Use case requires ArcGIS-hosted dataset that ZAAHI needs to consume. Current ZAAHI data sources:
- DLD direct API/data (not ArcGIS-hosted as of audit)
- Custom GeoJSON + PMTiles (556k Dubai plots)
- MapLibre tile stack (OSM, custom rasters)

**No identified UAE government/private ArcGIS Online dataset** dependency in ZAAHI's data acquisition pipeline as of 2026-04-29.

**Verdict: SKIP.** Add to monitor list — re-evaluate ТОЛЬКО если data team flags Dubai/UAE Esri-hosted layer (Dubai Pulse historically used multiple data formats; some gov datasets may exist as ArcGIS feature services).

### #6 `@geomatico/maplibre-cog-protocol` — INSTALL #1

**What.** Custom MapLibre protocol для Cloud Optimized GeoTIFFs. 6K weekly downloads, 146 stars, MIT, active. Featured в **MapLibre Newsletter May 2025** (third-party endorsement signal). FOSS4G Europe 2025 talk.

**ZAAHI fit.** Direct fit для Master Tree §66-70 Intelligence layers:
- Satellite imagery overlays (RGB / multi-band)
- Digital Elevation Models (DEM) для slope/visibility analysis
- NDVI / vegetation indices для green-cover scoring
- Time-series raster (construction monitoring via repeat satellite passes)

Cloud-native architecture (HTTP range requests) = **no full-file download** = ZAAHI can serve large TIFFs from cheap object storage (S3/R2/Spaces) без full transfer cost.

**Bundle impact:** data not found via bundlephobia, но typical CoG protocol implementations are <50 KB gzipped (light wrapper над geotiff.js).

**Verdict: INSTALL #1.** Highest-strategic-value Phase 1 addition. Fits с current PMTiles approach (both are cloud-native range-request protocols).

**Action items:**
1. Identify first CoG dataset to ingest (Sentinel-2 RGB Dubai? Esri World Elevation? UAE national DEM?).
2. Test integration with ZAAHI's MapLibre map in `/parcels/map`.
3. Add to Master Tree §66-70 Intelligence layer registry.

### #7 `@watergis/maplibre-gl-export` — INSTALL #2

**What.** Map → JPG/PNG/SVG/PDF export plugin. 1.3K weekly downloads, 175 stars, MIT, active (28 Mar 2026 release). Listed в official MapLibre plugins page. Forked from `mapbox-gl-export` с active divergence. Supports A2-A6/B2-B6 formats, 72-400 DPI.

**ZAAHI fit.** Phase 1 Owner-First (M1-9) deliverables:
- **Owner reports**: monthly/quarterly PDF summarising plot performance
- **Feasibility v5.0 output**: PDF deliverable to architect/developer client
- **Listing flyers**: PNG/PDF for printable property presentation
- **Master Tree visualization snapshots**: PDF/SVG для investor decks

**⚠️ Known limitation:** SVG export currently rasterized (open issue #332 — "with actual vectors"). True vector export not yet supported. PNG and PDF outputs are solid.

**Bundle impact:** data not found, но `jsPDF` (transitive dep) is the heavy half — likely 100-200 KB gzipped total. Can be code-split / dynamic-imported когда export action triggered (zero impact on initial page load).

**Verdict: INSTALL #2.** Direct fit для Phase 1 Owner-First module. Implement с dynamic import to avoid impacting initial bundle.

**Action items:**
1. Add dynamic import wrapper in `/components/MapExport`.
2. Wire export button into owner-dashboard (when route lands).
3. Validate PDF output meets owner-report design spec.

### #8 `route-snapper` (`dabreegster/route_snapper`) — DEFER

**What.** Client-side routing snapped to street network (Rust → WASM). 216 stars, Apache-2.0. Used by A/B Street project. **132 weekly downloads** = niche.

**⚠️ Maintenance flag.** "No releases published" on GitHub releases page (only npm publishes — not tagged). 27 open issues. **Dormant trending.**

**ZAAHI fit.** Use case = drive-time accessibility scoring for Master Tree §66-70 Intelligence (commute scoring, school catchment, hospital reachability). Substantively useful but **not core** to Phase 1 Owner-First — owners care about plot value, not commute optimisation.

**Bundle impact:** WASM payload — typical 200-500 KB gzipped (data not extracted).

**Pre-requisite:** street-network graph data per region — separate ETL pipeline required (Dubai street graph from OSM, preprocessed into the snapper's format).

**Verdict: DEFER to Phase 2 (M10-17).** When Intelligence layer scales to drive-time scoring, re-evaluate. **Check for active fork** at that time given dormant flag. Alternatives: server-side OSRM/Valhalla tile API (eliminates 200-500 KB WASM bundle).

### #9 `@mindstudio-ai/agent` — SKIP

**What.** MindStudio agent SDK — 850+ third-party connector actions через one API. MIT, 46 stars, 962 wk-dl, active (v0.1.58 released 20 Apr 2026).

**⚠️ Strategic flags:**
- **Vendor lock-in** to MindStudio platform (separate billing, separate identity, separate operational dependency).
- **Pre-1.0 API** (v0.1.58 = 58 patches in early development). Breaking changes likely.
- **Browser usage limited** — primary platform Node 18+ SDK + standalone CLI + MCP server. Browser only через `httpRequest()` proxy (= server-side execution, не client-side).
- **Direct architectural conflict** с ZAAHI's existing Archibald AI — Claude Sonnet 4.6 directly через Anthropic SDK. Adopting MindStudio = either dual-agent architecture (operational complexity) or migration away from Anthropic-direct (pricing/control trade-off).

**Use case argument для MindStudio:** "we get 850+ connectors free." But (a) ZAAHI's connector needs are real-estate-specific (DLD, RERA, MapLibre tiles, payment rails) — generic SaaS connectors offer little leverage; (b) custom Anthropic tool-use integrations cover ZAAHI's specific stack with better control.

**Verdict: SKIP.** Stick с Anthropic SDK direct. If multi-agent orchestration needed в future, evaluate native Anthropic Agent SDK (recently released by Anthropic, native to Claude Sonnet 4.6) before adopting third-party platform с vendor lock-in.

---

## 4. Cross-cutting Notes

### License compatibility

- **MIT:** #3, #4, #5a, #6, #7, #9 — fully compatible с commercial Next.js app, no copyleft.
- **Apache-2.0:** #1, #2, #5b, #8 — also compatible, additional patent grant (slight benefit над MIT for IP-sensitive contexts).
- **No GPL/AGPL contamination** detected across all 9.

✅ **License audit clean.** Top-3 INSTALL libraries (#6 MIT, #7 MIT, #4 MIT) — все MIT, simplest.

### Bundle size

⚠️ **All bundlephobia.com lookups returned 403** — bundle sizes flagged "data not found" rather than guessed. Pre-install verification step required:

```bash
# Run after npm install, before merging:
npx vite-bundle-visualizer    # or webpack-bundle-analyzer
# Track per-library KB delta against baseline
```

**Ballpark expectations** (based on similar libs, NOT verified):
- maplibre-cog-protocol: ~50 KB gzipped (light wrapper над geotiff.js)
- maplibre-gl-export: ~150-200 KB gzipped (jsPDF transitive)
- 3d-tiles-renderer: heavy — Three.js peer dep dominates (~150 KB gzipped just for Three.js)
- gaussian-splats-3d: heavy — same Three.js peer dep + WebGL kernels
- route-snapper: WASM 200-500 KB

**Verification protocol:** any candidate that adds >100 KB gzipped to initial route bundle gets dynamic-import treatment (lazy-load on user action).

### Maintenance / abandonment risk

| Library | Risk | Mitigation |
|---------|------|------------|
| #3 GaussianSplats3D | README self-declared dormant | Use community fork `gle-gaussian-splat-3d` если adopted |
| #8 route-snapper | "No releases published" — GitHub releases empty | Vendor-lock alternative server-side OSRM/Valhalla |
| #2 maplibre-three-plugin | Active but small audience | N/A — SKIP verdict already accounts |

### Security advisories

No `npm audit` checks performed in this DD pass. **Pre-install action item:** run `npm audit --audit-level=high` after installing top-3, before merging to main.

### TypeScript story

Top-3 INSTALL all have TypeScript support shipped:
- #6 maplibre-cog-protocol: 97.9% TS (clean)
- #7 maplibre-gl-export: 60.1% TS, 27% Svelte (TS types complete)
- #4 SuperSplat: 92.3% TS (irrelevant — external tool)

#3 GaussianSplats3D = 97.4% JS, types not shipped — community fork needed для TS adoption.

---

## 5. Action Items (next 4 weeks)

### Week 1 (immediate)
1. **Install `@geomatico/maplibre-cog-protocol`** в dev. Test CoG ingest from sample dataset (Sentinel-2 Dubai or local TIFF). Validate с existing MapLibre map в `/parcels/map`.
2. **Install `@watergis/maplibre-gl-export`** в dev с dynamic-import wrapper. Test PDF export of Master Tree map snapshot.
3. **Bookmark superspl.at/editor** для content team (no install needed).

### Week 2-4 (validation)
4. Run `npm audit` post-install для both new deps.
5. Run bundle-size analyzer; verify <100 KB gzipped delta per library on initial route.
6. Document CoG ingestion pipeline в `docs/architecture/intelligence-layers.md` (or wherever §66-70 Intelligence layer registry lives).
7. Wire export button в owner-dashboard route.

### Phase 2 (M10-17) re-evaluation triggers
- **#3 GaussianSplats3D**: trigger = external-user demand для photorealistic property tours. Re-DD active forks at trigger time.
- **#1 3d-tiles-renderer**: trigger = current Three.js custom layer hits performance ceiling (>10K buildings) или external Cesium tileset source emerges.
- **#8 route-snapper**: trigger = Intelligence layer drive-time scoring development starts. Re-DD active forks at trigger time, prefer server-side OSRM/Valhalla if WASM bundle too heavy.

### Skip — monitor only
- **#2 maplibre-three-plugin**: re-evaluate ТОЛЬКО если ZAAHI custom Three.js bridge регрессирует.
- **#5 esri-arcgis**: re-evaluate ТОЛЬКО если data team identifies specific UAE Esri layer.
- **#9 mindstudio-agent**: re-evaluate ТОЛЬКО если Anthropic-direct multi-agent orchestration insufficient AND native Anthropic Agent SDK also insufficient.

---

## 6. Sources Index

All accessed 2026-04-29.

### Library repositories
- [NASA-AMMOS/3DTilesRendererJS](https://github.com/NASA-AMMOS/3DTilesRendererJS)
- [bertt/3dtiles (C# — flagged irrelevant to JS stack)](https://github.com/bertt/3dtiles)
- [bertt blog — 3D Tiles MapLibre demos March 2026](https://bertt.wordpress.com/)
- [dvt3d/maplibre-three-plugin](https://github.com/dvt3d/maplibre-three-plugin)
- [mkkellogg/GaussianSplats3D](https://github.com/mkkellogg/GaussianSplats3D)
- [playcanvas/supersplat](https://github.com/playcanvas/supersplat)
- [muimsd/esri-gl (community, deprecated)](https://github.com/muimsd/esri-gl)
- [Esri/maplibre-arcgis (official)](https://github.com/Esri/maplibre-arcgis)
- [geomatico/maplibre-cog-protocol](https://github.com/geomatico/maplibre-cog-protocol)
- [watergis/maplibre-gl-export](https://github.com/watergis/maplibre-gl-export)
- [dabreegster/route_snapper](https://github.com/dabreegster/route_snapper)
- [mindstudio-ai/mindstudio-agent](https://github.com/mindstudio-ai/mindstudio-agent)

### npm download statistics
- [api.npmjs.org/downloads/point/last-week/](https://api.npmjs.org/downloads/point/last-week/) — public registry API used для weekly download verification

### MapLibre ecosystem
- [Official MapLibre plugins page](https://maplibre.org/maplibre-gl-js/docs/plugins/)
- [MapLibre Newsletter May 2025 — CoG protocol feature](https://maplibre.org/news/)

---

**End of report.**

*Word count: ~3,100 words. Top-3 ranked install: maplibre-cog-protocol · maplibre-gl-export · SuperSplat (external). 3 defer. 4 skip (incl. community alt #5a + lock-in #9). Two reframes applied (NASA-AMMOS for #1, official Esri for #5). Bundle sizes flagged "data not found" rather than guessed (bundlephobia 403). License audit clean (no GPL/AGPL contamination).*
