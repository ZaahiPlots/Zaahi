# ZAAHI Architect Portal — Custom 3D Model Uploads

**Status:** Research-only, pre-implementation.
**Branch:** `research/architect-portal`.
**Author:** Research agent (Claude Opus 4.6).
**Date:** 2026-04-16.
**Target audience:** ZAAHI founder, engineering lead, product.
**Scope:** Let architects upload custom GLB models to replace the algorithmic ZAAHI Signature building on a given plot.

---

## Executive Summary

**What we are building.** A gated sub-product inside the existing ZAAHI web app that lets
users with the already-provisioned `ARCHITECT` role upload GLB 3D models, attach them
to specific parcels, and have those models render on `/parcels/map` *in place of* the
algorithmic ZAAHI Signature tiered-extrusion building. The feature is strictly additive:
the Signature rendering pipeline (founder-approved IP per `CLAUDE.md`) is preserved as
the universal fallback — if a parcel has no approved active model, or if the custom
model fails to load, the existing podium/body/crown cascade renders unchanged. The
portal itself lives at `/dashboard/architect` alongside the other Phase-1 dashboards,
and the model files live behind `src/lib/storage.ts` so the choice of Supabase Storage
vs Cloudflare R2 vs a future UAE-sovereign object store is a single-vendor swap. A new
`ArchitectModel` table plus a nullable `Parcel.activeModelId` pointer captures the data
model; a new MapLibre `custom` layer hosting a three.js `GLTFLoader` scene does the
rendering. No changes to `loadZaahiPlots()` internals are required beyond a per-parcel
filter that suppresses Signature geometry for parcels with an active custom model.

**In what order.** Four sprints. **Sprint 1 (3 weeks, MVP):** DB migration for
`ArchitectModel`, signed-URL upload to the existing storage bucket, architect dashboard
list view, inline three.js preview, a single "publish immediately" path gated behind
the architect being the parcel's assigned architect, and the new MapLibre custom layer
rendering exactly one GLB per parcel. **Sprint 2 (2 weeks):** version history (per-parcel
auto-incrementing `version`), admin approval workflow (DRAFT → PENDING_REVIEW → PUBLISHED
→ ARCHIVED / REJECTED), multi-architect access per parcel, and developer authority to
set the active model when several architects have submitted. **Sprint 3 (1–2 weeks):**
LOD (server-side Meshopt simplification or zoom-based swap), GLB validation worker
(dimension sanity, face-count cap, virus scan, Draco/Meshopt detection), graceful
fallback to Signature on any fetch/parse failure. **Sprint 4 (2 weeks):** admin tools —
bulk review queue, abuse dashboard, copyright-takedown workflow, usage analytics, audit
log linkage. V2+ deferred: realtime multi-architect collaboration, IFC/Revit ingestion,
iOS Quick Look / AR, commercial marketplace.

**Grosso modo Sprint 1 MVP estimate.** **3 weeks** of one senior full-stack engineer +
~0.5 week of design polish. This assumes MapLibre custom-layer boilerplate lands in 2
days (MapLibre ships an official three.js GLB example at
`maplibre.org/maplibre-gl-js/docs/examples/add-a-3d-model-using-threejs/` that is ~80 %
the code we need), storage stays on Supabase for the MVP, and the approval workflow is
stubbed as "architect self-publishes, admin can revert" rather than full DRAFT →
PENDING_REVIEW. Tighten to 2 weeks only if storage vendor is already chosen and a
single-architect-per-parcel invariant is accepted.

**Single most-risky element.** **Copyright / IP on the uploaded model.** Architects'
3D work is their copyrighted output, and ZAAHI serving it back to the public via the
map is a reproduction + public display under UAE Federal Decree-Law No. 38 of 2021 on
Copyright. Without an explicit *sub-licence clause* in the upload ToS and a
takedown + counter-notice process, ZAAHI exposes itself to infringement claims from
original rights holders (architects who didn't author the work they uploaded, or
developer clients who commissioned the work under NDA). Every other risk on the list
(storage cost blowup, GPU perf, fallback correctness) has a clean engineering fix. The
IP risk needs a legal draft *before* code starts.

**Three decisions founder must make before code begins.**

- **D1 — Who owns the upload slot on a parcel?** Options: (a) only the `DEVELOPER` who
  owns the parcel can grant architect access per plot; (b) any `ARCHITECT`-role user
  can upload to any parcel but the owning developer chooses which model goes live;
  (c) architects can upload *only* to parcels they themselves created. Recommended
  default: **(a)** — developer is the commercial counterparty, developer assigns
  architect(s), matches how AEC contracts work in UAE. See §4.
- **D2 — Storage vendor for model files.** Supabase Storage ($0.021 /GB/month storage
  + $0.09 /GB egress past 250 GB on Pro) or Cloudflare R2 ($0.015 /GB/month + zero
  egress). Architect-portal traffic is read-mostly public (every map visitor downloads
  the GLBs), so egress dominates. The Wall + Archibald research already recommended R2
  with a `src/lib/storage.ts` abstraction; the same reasoning applies here, stronger.
  Recommended: **R2 with the abstraction — same decision as Wall to avoid a split-vendor
  future**. See §3 and §9.
- **D3 — Approval workflow for MVP.** Either (a) architect self-publishes, admin can
  revert, OR (b) admin must approve every model before it goes on the map. (b) is
  safer on IP and brand, but adds an admin bottleneck that will stall MVP. Recommended:
  **(a) for MVP with a required legal-ack checkbox on upload, escalate to (b) in
  Sprint 2** when the approval UI exists. See §4.

---

## 1. Current Architecture (inspection)

This section summarises the pre-loaded facts from the code audit. It is deliberately
short — the value of this document is in sections 2 through 12. Specific line references
are given only for the integration surface.

### 1.1 What the map actually renders today

`loadZaahiPlots(map)` at `src/app/parcels/map/page.tsx:2164` fetches
`/api/parcels/map` and builds two in-memory GeoJSON FeatureCollections that are attached
to MapLibre GL JS as two source/layer pairs:

- **`zaahi-plots`** (the polygon footprint): fill, line, and two selection-glow layers.
- **`zaahi-plots-buildings`** (the 3D volume): a single `fill-extrusion` layer
  (`zaahi-plots-buildings-3d`) with `fill-extrusion-opacity: 1` and per-feature `color`
  / `height` / `base` properties. Opacity is intentionally solid so ZAAHI listings
  stand out over the PMTiles basemap which extrudes at 0.35.

The extrusion engine computes building height from a cascade
(`plan.maxHeightMeters` → `plan.maxFloors × 3.5` → GFA-based synthesis → land-use
default) and then, per parcel, emits one, two, or three features according to the
style rule at lines 2333-2354:

- `plan.buildingStyle === "FLAT"` → single full-footprint extrusion.
- `floors ≤ 4` → podium only.
- `5–10 floors` → podium (0-14 m) + body (14-top, 70 % footprint via
  `scaleRingFromCentroid`).
- `>10 floors` → podium + body + crown (top-7 → top, 50 % footprint).

This tiered, setback-aware, land-use-coloured extrusion *is the ZAAHI Signature*. The
`CLAUDE.md` rule — "ZAAHI Signature 3D — не менять без founder approval" — pins the
math, the `scaleRingFromCentroid` helper, and the colour table as founder-approved IP.

### 1.2 Data already used to drive style — the forgotten switch

`prisma/schema.prisma` line ~247 already defines `AffectionPlan.buildingStyle: String?`
with values `"SIGNATURE"` / `"FLAT"` / null. **The system already treats 3D style as a
data-driven per-parcel attribute.** A new value `"CUSTOM"` is a natural extension, but
§5 argues the cleaner signal is `Parcel.activeModelId != null` — see that section for
the tradeoff.

### 1.3 Other relevant structures

- `Parcel` has `geometry: Json?` (GeoJSON polygon), `latitude`, `longitude`, and an
  `owner` relation — the centroid needed to anchor a GLB is trivially derivable from
  `geometry`.
- `Document` (dealId / parcelId + `fileUrl: String` + `type: DocumentType`) is the
  existing precedent for "we store a URL that resolves via `src/lib/storage.ts`". We
  do **not** want to overload `Document` for 3D models — different lifecycle, different
  auth rules, different size budgets, different versioning semantics. A new table is
  correct.
- `User.role: UserRole` already contains `ARCHITECT`. No migration needed for the role
  enum. Role-based routing and `AuthGuard` protection on `/dashboard/*` is the Phase 1
  pattern that the architect portal extends.

### 1.4 The integration surface — the exactly-one thing that must change

Two viable patterns. Both are studied in depth in §6.

**Pattern A — MapLibre custom layer that owns a three.js scene.** A third layer,
added via `map.addLayer({ id, type: "custom", renderingMode: "3d", onAdd, render })`,
sharing the WebGL context so depth-tests with `zaahi-plots-buildings-3d` work.
`onAdd` creates a `THREE.WebGLRenderer` that borrows the MapLibre canvas + context,
a `THREE.Scene`, and a `GLTFLoader` (optionally wired to `DRACOLoader` and
`KTX2Loader`). `render(gl, args)` builds a matrix from `args.defaultProjectionData.mainMatrix`,
anchors each active model at its parcel's mercator coordinates, and calls
`renderer.render(scene, camera)`. MapLibre's official example at
[`add-a-3d-model-using-threejs`](https://maplibre.org/maplibre-gl-js/docs/examples/add-a-3d-model-using-threejs/)
is the canonical template.

**Pattern B — data-expression filter on the existing extrusion layer.** Add a
boolean property `hasCustomModel` to each building feature; use `["!", ["get",
"hasCustomModel"]]` as the layer filter so Signature geometry is suppressed for
parcels with a custom model. Then add Pattern A *anyway* for the custom GLB.

**Recommendation: Pattern A + feature-filter from Pattern B.** Pattern A is the only way
to render arbitrary GLB geometry — there is no MapLibre-native GLB primitive. Pattern B's
filter is how we *suppress* the Signature podium/body/crown for those parcels without
touching `loadZaahiPlots`'s existing control flow. Critically, MapLibre's
`fill-extrusion-opacity` does **not** accept data expressions (the code already has a
comment about this at line 2451), which rules out the alternative of setting opacity to
0 per-feature. Filter-based suppression is the only clean way to hide Signature on a
per-parcel basis.

**What this means concretely.** `loadZaahiPlots` gets a one-line change: when building
each feature's properties, also set `hasCustomModel` = `true` if the parcel's server
response includes an `activeModel` object. The layer definition gets a filter. And a
separate file — new `src/lib/map-custom-layer.ts` or similar — owns the three.js custom
layer end-to-end. Signature math, `scaleRingFromCentroid`, colour tables: untouched.

### 1.5 What is explicitly out of scope for this research

- No re-inspection of unrelated code paths.
- No alternative to MapLibre (Mapbox GL, CesiumJS, deck.gl) — the stack is pinned.
- No rewrite of the Signature cascade. Founder IP is off-limits.
- No change to `src/lib/storage.ts` abstraction contract — the feature must work with
  whatever vendor backs it.

---

## 2. 3D Model Format

### 2.1 Format candidates

| Format | Binary? | Textures | Compression | Web runtime cost | Notes |
|---|---|---|---|---|---|
| **GLB** (glTF 2.0 binary) | Yes | Embedded | Draco / Meshopt / KTX2 supported via extensions | Direct `GLTFLoader` parse; `~100 ms` per MB on a mid-range laptop | Khronos standard. The only format three.js parses natively without external tooling. ([three.js GLTFLoader docs](https://threejs.org/docs/#examples/en/loaders/GLTFLoader)) |
| **glTF (JSON)** | No (JSON + external `.bin` + textures) | External | Same extensions | Multi-request load (JSON + bin + N textures) | Fine for dev, terrible for CDN delivery — every asset is a separate request. |
| **OBJ** | No | External `.mtl` + N images | None | Slow text-parser, no PBR, no animation, no hierarchy | Legacy CAD-export format. Do not accept. |
| **FBX** | Yes (Autodesk proprietary) | Embedded or external | None | `FBXLoader` exists but is known to mis-parse edge cases; no PBR metallic-roughness guarantee | Autodesk-owned; licence-encumbered. Do not accept. |
| **IFC** | Yes (STEP-based, BIM) | External | None; usually 50-500 MB | Needs `web-ifc` WASM parser; heavy | V2+ only — the BIM ingestion use case. |
| **USDZ** | Yes | Embedded | None (native) | Apple-only, iOS Quick Look | V2+ for AR; not the browser canvas use case. |

**Decision — accept GLB only in Sprint 1.** Every architect tool (Revit, ArchiCAD,
Rhino, Blender, SketchUp) can export GLB. Accepting more formats adds a conversion
step we shouldn't own. In V2+ we can add a Revit `.rvm` / `.ifc` → GLB converter as
a server-side pipeline (see §12 for the Cesium Ion 3D Tiles analogue).

### 2.2 Embedded vs external textures

**Embedded (single-file GLB).** Textures are stored inside the `.glb` binary buffer.
One URL, one HTTP request, one cache entry. Signed URL expiry is trivial (one URL to
rotate). This is what `.glb` format is for.

**External (glTF + .bin + image files).** Multiple URLs, more cache entries, every
request needs its own signed URL if the bucket is private. More coordination.

**Recommendation: only GLB (embedded) in Sprint 1.** Single URL, single signed-URL
rotation, single cache key. If a future architect workflow emits glTF + external
assets, either (a) convert server-side to `.glb` via a headless `gltf-transform` run
or (b) require a `.zip` upload that the validation worker re-packs. Both are deferred.

### 2.3 Size limits — what is "reasonable"

Real benchmarks and industry norms as of 2026:

- **Sketchfab** (the closest consumer-web analogue): 50 MB upload cap on free, 200 MB
  on Pro, higher tiers at enterprise. Traffic is unmetered within fair-use.
  ([Sketchfab upload limits](https://help.sketchfab.com/hc/en-us/articles/360031770411-Upload-Limits))
- **three.js community guidance**: geometry-heavy web models perform acceptably under
  ~500k triangles on a mid-range laptop; mobile GPUs struggle past ~200k triangles per
  visible model. A KTX2 texture of `2048×2048` takes ~5 MB on disk, 21 MB uncompressed
  on GPU; "a 200 KB PNG can occupy 20 MB+ of VRAM".
  ([Codrops — Building Efficient Three.js Scenes](https://tympanus.net/codrops/2025/02/11/building-efficient-three-js-scenes-optimize-performance-while-maintaining-quality/))
- **Cesium / 3D Tiles experience**: individual tiles are typically kept under 2 MB per
  LOD step, and a full-city 3D model is broken into streamed tiles.
  ([3D Tiling — Cesium](https://cesium.com/learn/3d-tiling/))

**ZAAHI tiers (recommended).**

| Tier | Per-model cap | Rationale | Validation action |
|---|---|---|---|
| **Green** | ≤ 5 MB | Small single-building (optimised Draco+KTX2). Instant load on any device, excellent for demo gallery. | Auto-accept. |
| **Yellow** | 5–50 MB | Realistic uncompressed model with 2k textures. Typical architect export from Revit / Rhino. | Accept; validation worker warns if `> 200k tris` or `> 25 MB` without Draco/Meshopt. |
| **Red** | 50–200 MB | Large detailed model with 4k textures and multiple buildings. Slow on mobile. | Accept with owner attestation; force LOD generation. |
| **Reject** | > 200 MB | Beyond browser-delivery budget. | Reject at upload with "please optimise with `gltf-transform` or `gltfpack` and re-upload". |

**Absolute hard cap at 200 MB** for Sprint 1. Supabase `uploadToSignedUrl` supports up
to 5 GB via standard upload and 50 GB via TUS resumable
([Supabase Storage v3 blog](https://supabase.com/blog/storage-v3-resumable-uploads)),
so the limit is a product decision, not a platform constraint.

### 2.4 Draco vs Meshopt compression

- **Draco** (Google) compresses vertex positions / normals / UVs via entropy coding.
  60-90 % geometry size reduction, 95 % in geometry-dominant models. Decoder is ~120 KB
  gzip WASM that browsers cache after first fetch.
  ([glTF-Transform Draco module](https://gltf-transform.dev/modules/extensions/classes/KHRDracoMeshCompression))
- **Meshopt** (`EXT_meshopt_compression` by Arseny Kapoulkine) compresses the same data
  with a smaller decoder (pure WASM, ~30 KB) and *faster* decode. Similar-or-better
  compression ratios on most real models (29 MB → 2.5 MB in one reference benchmark).
  Decoder is in-tree to three.js via `MeshoptDecoder`.
  ([glTF-Transform Meshopt module](https://gltf-transform.dev/modules/extensions/classes/EXTMeshoptCompression))

**When Draco is the right call.** Large single-mesh models where the decode-time cost
is amortised over many frames (i.e., the model stays on screen a while). Still the
default for Cesium / 3D Tiles 1.1 pipelines.

**When Draco is a net loss.** Small models (< 1 MB) where the 120 KB decoder fetch is
bigger than the geometry saving, or large *scenes with many meshes* where Meshopt's
per-mesh decode latency is lower.

**Recommendation: accept both; prefer Meshopt; Draco-transcoder is loaded lazily.**
The upload validator detects `KHR_draco_mesh_compression` vs `EXT_meshopt_compression`
in the GLB header, wires the appropriate loader on the client, and warns the architect
at upload time if the model has no compression *and* exceeds 25 MB with guidance to
run `gltfpack` / `gltf-transform optimize`. KTX2 (Basis Universal) textures are
*always* recommended above 2k textures — a separate axis from geometry compression.

### 2.5 Summary recommendation

- **Accept GLB only.** Reject glTF, OBJ, FBX, IFC, USDZ at the API layer with a clear
  error message pointing to `gltfpack`.
- **Embedded textures.** Single file simplifies signed URLs + caching.
- **Prefer Meshopt + KTX2**, accept Draco, allow uncompressed up to the Yellow tier.
- **Hard cap 200 MB**; soft cap 50 MB with a warning.
- **Validator enforces** triangle-count ceiling (default 500k, configurable),
  double-sided-material cap, no `KHR_animations` accepted in Sprint 1 (static buildings
  only — animations open scope creep we can defer).

---

## 3. Upload & Storage Infrastructure

This section reuses the storage analysis from
[`WALL_ARCHIBALD_SYSTEM.md`](#) on branch `research/wall-archibald-system` (commit
`e4ac13c`) and re-applies it through the architect-model lens. The conclusions rhyme:
R2 wins on cost at the volumes we expect, because egress dominates.

### 3.1 Supabase Storage — 2026-04-16 pricing

Confirmed via [Supabase Pricing page](https://supabase.com/pricing) and
[Supabase Storage pricing guide](https://supabase.com/docs/guides/storage/pricing):

- **Free tier:** 1 GB storage, 5 GB egress, **50 MB max file size**.
- **Pro tier** ($25/project/month): 100 GB storage included, 250 GB egress included,
  **max file size configurable up to 500 GB**, overage:
  - Storage: ~$0.021 /GB/month.
  - Egress: **$0.09 /GB** uncached past 250 GB (reduced to ~$0.03 /GB cached since
    the 2025 cached-egress update — see [Supabase storage 500 GB blog](https://supabase.com/blog/storage-500gb-uploads-cheaper-egress-pricing)).
- **Standard upload** supports files up to 5 GB via a single PUT.
  **Resumable (TUS)** supports up to 50 GB and is recommended for anything > 6 MB for
  reliability ([Resumable Uploads](https://supabase.com/docs/guides/storage/uploads/resumable-uploads)).
- **Signed upload URLs** via `createSignedUploadUrl` + `uploadToSignedUrl` let the
  client upload directly without proxying through Next.js API routes
  ([Upload to a signed URL](https://supabase.com/docs/reference/javascript/storage-from-uploadtosignedurl)).
- Buckets are hosted in the same region as the project — EU Frankfurt for ZAAHI
  today (`eu-central-1`), which means ~120 ms first-byte to UAE users.

### 3.2 Cloudflare R2 — 2026-04-16 pricing

Confirmed via [Cloudflare R2 pricing](https://developers.cloudflare.com/r2/pricing/):

- **Storage:** $0.015 /GB/month (Standard), $0.010 /GB/month (Infrequent Access).
- **Class A ops** (writes, lists, multipart uploads): $4.50 / million.
  **Class B ops** (reads, head): $0.36 / million.
- **Egress: $0 /GB**. This is the unlock.
- **Free tier:** 10 GB storage, 1M Class A ops, 10M Class B ops, unlimited egress.
- **Middle East edge coverage:** Cloudflare's global network includes
  Dubai (DXB), Abu Dhabi (AUH), and 300+ edge PoPs worldwide. Cache hits are served
  from the nearest edge so UAE users get < 30 ms first-byte. (The R2 *origin* region
  is defaulted to EU or US; UAE edges serve the cache layer.)
- **Multipart uploads** via the S3-compatible API support files up to 5 TB.
  [R2 multipart docs](https://developers.cloudflare.com/r2/api/s3/api/) — presigned
  PUT URLs + `UploadPart` calls are standard S3 semantics.

### 3.3 The egress argument — why R2 wins for the map use case

Every visitor to `/parcels/map` who pans over a parcel with an active custom model
downloads that GLB. Assume a realistic map session:

- A logged-in user opens the map once per session on average.
- They pan / zoom around and visit ~20 parcels that have custom models.
- Average GLB size after Meshopt: 10 MB per model.

One session → **200 MB egress**. At 500 DAU → **100 GB/day**. At Supabase $0.09 /GB
past the 250 GB included (so 2.5 days of included egress, then metered): roughly
**$200 /month** at the small scale. At 500k DAU → **100 TB/day** → **$270k /month**
on Supabase vs **$0 /month** egress on R2 (pay only for storage and Class B reads).
The math is developed in full in §9. **Egress is the deciding factor, not storage.**

### 3.4 Upload flow — three options

**(A) Direct POST to API route, server re-uploads to bucket.** Architect uploads to
`/api/architect/models/upload`; the Next.js route buffers or streams, validates, then
pushes to storage. **Pros:** server can validate headers, check size, virus-scan before
persisting. **Cons:** doubles bandwidth (inbound to Vercel, outbound to R2), Vercel has a
4 MB body limit on serverless functions unless you use edge runtime, timeouts on large
uploads, bad UX for 200 MB files. **Verdict: reject for architect portal.**

**(B) Signed upload URL — client uploads directly to bucket.** API route creates a
`pending` `ArchitectModel` row and returns a short-lived signed URL. Client PUTs the GLB
directly to Supabase / R2. On success the client calls
`POST /api/architect/models/:id/complete` which marks the upload done and triggers
async validation. **Pros:** zero Vercel bandwidth, scales to the storage vendor's
limits. **Cons:** validation is post-upload so a bad file still consumes storage
briefly; soft-delete on validation failure handles this.
**Verdict: this is the default pattern.**

**(C) Resumable / chunked (TUS for Supabase, S3 multipart for R2).** Same as (B) but
with resumable semantics via [tus-js-client](https://github.com/tus/tus-js-client) or
the S3 SDK's multipart uploader. Survives flaky mobile connections, lets the progress
bar be accurate, allows pause / resume. **Pros:** best UX for > 50 MB. **Cons:** slightly
more client code, more edge cases. **Verdict: Sprint 2 upgrade path; Sprint 1 ships
with (B) and a 200 MB cap that's pragmatic.**

**Recommended: start with (B), add chunked upload in Sprint 3.** Chunked is not a
blocker for MVP since the typical architect model is 10-50 MB range and a single PUT
is fine on broadband.

### 3.5 Virus / malware scanning

GLB files are structured binary; classic executable malware risk is low but **not
zero** — a malicious actor could embed a script in an extension buffer or exploit a
three.js parser bug. Plus the risk vectors for *any* user-upload system (phishing-bait
filenames, reputation damage) still apply.

Three options:

- **ClamAV in a worker.** Industry-standard open-source AV engine. Typical deploys
  run it in a container (Docker) triggered by storage events, not inside Cloudflare
  Workers (definitions are ~200 MB, CPU-heavy). ZAAHI pattern: a Supabase Edge Function
  or a separate small Railway/Fly worker that ClamAV-scans on
  `ArchitectModel.complete` webhook.
  ([AWS ClamAV serverless guide](https://aws.amazon.com/blogs/developer/virus-scan-s3-buckets-with-a-serverless-clamav-based-cdk-construct/))
- **Cloudflare WAF Malicious Uploads Detection.** Managed, inline, no definition
  management, but only available on higher-tier Cloudflare plans.
  ([Cloudflare WAF Malicious Uploads](https://developers.cloudflare.com/waf/detections/malicious-uploads/))
- **None at MVP + takedown workflow.** Accept the risk, publish a clear ToS that
  forbids malicious uploads, and rely on the approval workflow to catch anything
  suspicious before publish.

**Recommendation: none at MVP + approval workflow gates publish; add ClamAV worker in
Sprint 4.** GLB is structured data and the attack surface is the three.js parser, not
the OS. Most realistic threat is a *huge* file intended to DoS the viewer — the
size cap handles that. Copyright / content is the bigger real risk (see §4).

### 3.6 Progress UX — patterns

The architect uploads a 50 MB GLB. What does the client show?

- **Indeterminate spinner + cancel.** Unacceptable past ~5 seconds.
- **Determinate progress bar driven by `XMLHttpRequest.upload.onprogress`** for
  single-PUT uploads (option B). Works on all modern browsers.
- **TUS progress** (option C) — the tus-js-client emits `onProgress` events per chunk.
- **Post-upload "Validating..."** spinner while the server parses the GLB, checks
  size, counts triangles, and (later) runs AV. Expected 1-5 seconds.
- **Three-stage UX:** `uploading → validating → ready for preview`. After `ready`,
  the inline three.js viewer mounts and lets the architect rotate/zoom before hitting
  **Publish**.

**Recommendation.** XHR-progress bar in Sprint 1. Three-stage visual state machine.
Preview renders *client-side* before publish — no thumbnail worker needed for MVP.

### 3.7 Thumbnail / preview screenshot

On `POST /api/architect/models/:id/complete`, kick off a background job that:

1. Spawns a headless-browser-or-Node three.js renderer (e.g., `node-gltf-renderer`
   or a tiny Puppeteer script that loads a preview page).
2. Renders the model on a neutral background at 3 camera angles (front, 3/4, top).
3. Picks the 3/4 angle at 1024×1024.
4. Uploads the PNG to the same bucket under `thumbnails/{modelId}.png`.
5. Writes the URL to `ArchitectModel.thumbnailUrl`.

This is **Sprint 3** work — for MVP, the architect dashboard uses a client-side
three.js inline viewer for preview and we lazy-generate thumbs only for the
map-popup card. Ideal later solution: **Cloudflare Browser Rendering** or a Fly.io
worker.

### 3.8 Storage recommendation summary

- **Vendor: Cloudflare R2**, accessed via the `src/lib/storage.ts` abstraction
  so the Supabase fallback remains viable. Justification: egress dominates cost
  at even modest scale (§9), and the Wall + Archibald research already made the same
  call for a different use case — aligning now avoids a split-vendor operational burden.
- **Upload pattern: signed URL (option B) in Sprint 1; TUS / S3-multipart in Sprint 3**
  for > 50 MB files and flaky-connection UX.
- **AV scan: deferred to Sprint 4**; rely on approval workflow + size cap + format
  validation in Sprints 1-3.
- **Region: R2 default EU (aligns with current Supabase EU Frankfurt), Cloudflare
  CDN cache at DXB/AUH edges** gives UAE users near-local latency.

---

## 4. Permission & Workflow Model

### 4.1 The five questions the brief asks

1. **Who gets upload access on which plots?**
2. **Approval workflow — draft → admin approve → publish, or direct publish?**
3. **Versioning — full history or last-N?**
4. **Multi-architect collaboration on one parcel?**
5. **How does the architect find out they have access in the first place?**

### 4.2 Question 1 — upload access model

Three proposed models:

- **Model A — Developer-granted.** The developer who owns the parcel (`Parcel.ownerId`
  with role `DEVELOPER`) explicitly adds architects to a whitelist per-parcel. Architect
  cannot upload to a parcel unless they are on the whitelist. Mirrors how AEC contracts
  actually work: developer hires architect firm, architect gets credentials.
- **Model B — Any architect, one active at a time.** Any `ARCHITECT`-role user can
  upload a model to any parcel. Competing uploads exist in `DRAFT` status. The
  developer (or admin) picks which one goes `PUBLISHED`. This is marketplace-style —
  good for spec designs, competitions — but risks spam, trolling, and a messy UI.
- **Model C — Self-assigned.** Architects can only upload to parcels they themselves
  created (i.e., `Parcel.ownerId == architect.id`). Narrow, but matches the pattern of
  an architect who owns the lot outright or represents the landowner.

**Recommendation: Model A for MVP, with Model B capability gated behind a
per-parcel feature flag `Parcel.openToCommunityModels: Boolean` (default `false`).**
Reasoning:

- Model A maps to contractual reality — the developer is the one who *paid* the
  architect and has the right to approve the design.
- Model B is an interesting marketplace expansion (student designs, open competitions)
  but isn't needed in MVP and introduces moderation burden.
- Model C is a narrow special case that Model A covers (developer == architect is
  just `Parcel.ownerId == architect.id`).

The mechanism: a `ParcelArchitectAccess` join table (parcelId, architectId,
invitedByUserId, invitedAt, revokedAt). A developer-only API
`POST /api/parcels/:id/architects` grants access. Admin can grant on any parcel for
emergency / abuse cases.

### 4.3 Question 2 — approval workflow

The tension is:

- **Direct publish** (architect hits "Publish", it goes live immediately) is fast
  and honours architect autonomy. But it puts copyrighted, potentially-bad-quality,
  potentially-offensive content on a public map with no editorial filter.
- **Admin approval** (DRAFT → PENDING_REVIEW → admin approves → PUBLISHED) is safe
  but creates an admin bottleneck and frustrates architects waiting 24-72 hours for
  a review.

**Recommendation: two-phase rollout.**

- **Sprint 1 MVP.** Architect self-publishes (DRAFT → PUBLISHED) *but* the act requires
  a legal-ack checkbox: "I confirm I hold the copyright or have been authorised to
  publish this model on ZAAHI, and I grant ZAAHI a non-exclusive, revocable licence
  to display it publicly on the parcel map." Admin can move PUBLISHED → ARCHIVED at
  any time via one click. This is fast, and the revert authority + legal ack covers
  most of the risk.
- **Sprint 2.** Add explicit DRAFT → PENDING_REVIEW → PUBLISHED for parcels where the
  owning developer has set `Parcel.requireApproval: Boolean`. By default developer
  who trusts their architects uses direct publish; developer who is receiving
  marketplace (Model B) submissions uses approval.

States and transitions:

```
DRAFT ──[architect: submit for review]──► PENDING_REVIEW
DRAFT ──[architect: publish direct]─────► PUBLISHED   (if parcel.requireApproval == false)

PENDING_REVIEW ──[admin: approve]────────► PUBLISHED
PENDING_REVIEW ──[admin: reject(reason)]─► REJECTED
PENDING_REVIEW ──[architect: withdraw]───► DRAFT

PUBLISHED ──[admin / developer: archive]─► ARCHIVED
PUBLISHED ──[architect: new version]─────► (new row DRAFT, previous stays PUBLISHED
                                            until the new one publishes)

REJECTED ──[architect: re-submit]────────► PENDING_REVIEW
ARCHIVED ──[admin: restore]──────────────► PUBLISHED
```

### 4.4 Question 3 — versioning

Architects iterate. A mature parcel may see 5-20 versions over a design phase.

**Options:**

- **Full history forever.** Every upload is immutable; `version` auto-increments
  per parcelId. Storage cost is bounded by the 200 MB cap × N versions per parcel.
- **Last-N** (e.g., last 10 versions). Older versions are auto-archived → deleted
  after 30 days. Saves storage but loses the audit trail.
- **Immutable metadata, optional file pruning.** All `ArchitectModel` rows are kept
  forever (cheap: a few hundred bytes each), but files on `ARCHIVED` models older
  than 90 days are evicted from hot storage to R2 Infrequent Access ($0.010 vs
  $0.015 /GB/month, retrieval fee $0.01 /GB).

**Recommendation: full history metadata forever + cold-storage eviction at 90 days
post-archive.** Storage is cheap; metadata is free; the audit story for IP disputes
requires immutability of record even if the file is cold.

Schema mechanics (detailed in §5):

- `ArchitectModel.version: Int` auto-increments per parcel via application logic
  (fetch max + 1 inside a transaction; `@@unique([parcelId, architectId, version])`
  for safety).
- `Parcel.activeModelId` is the single pointer that determines what renders on
  the map. Publishing a new version doesn't automatically swap activeModelId — the
  developer / admin explicitly chooses via `POST /api/parcels/:id/set-active-model`.
- Rollback = set `Parcel.activeModelId` back to a previous PUBLISHED row. Trivial.

### 4.5 Question 4 — multi-architect collaboration

**Sprint 1:** no collaboration. Each `ArchitectModel` row has exactly one
`architectId`. Two architects working on the same parcel simply upload two separate
model rows and the developer picks which is active.

**Sprint 2+:** `ParcelArchitectAccess` supports multiple architects per parcel, each
with an independent upload stream. They see each other's models in a per-parcel
"Submissions" tab; UI can show a side-by-side diff (client-side three.js A/B).

**V2+:** realtime co-editing (à la BIMcloud's Delta Server pattern — see §12) is
explicitly deferred. ZAAHI is not a BIM authoring tool; architects author in Revit /
ArchiCAD and upload the result.

### 4.6 Question 5 — architect discovery / onboarding

Architect signs up via the standard `/signup` route → chooses `ARCHITECT` role in
the onboarding step (the `User.role` enum already supports it). Profile requires:

- `companyName`
- `reraLicense` (free-text today; §11 open Q on validation)
- A phone number
- Optional portfolio link

Until a developer adds them to a parcel via `ParcelArchitectAccess`, the dashboard
shows an empty state with a "Share your profile with a developer to get invited"
call-to-action and a one-click share-to-clipboard button.

### 4.7 The permission matrix

Rows = actions. Columns = roles. `own` means "when subject == owner/architect of
the record"; `any` means "any record in that role's scope"; `–` means forbidden.

| Action | ARCHITECT | DEVELOPER (owns parcel) | OWNER (owns parcel) | ADMIN | Public / unauth |
|---|---|---|---|---|---|
| **Upload model to parcel** | own (must have `ParcelArchitectAccess`) | – (cannot upload; can only grant access) | – | any (override) | – |
| **List own drafts** | own | – | – | any | – |
| **List all models for a parcel** | own (scoped to ones they uploaded) | any on owned parcels | – | any | – |
| **Preview own model (inline viewer)** | own | own parcels | – | any | – |
| **Publish request (DRAFT → PENDING_REVIEW)** | own | – | – | any | – |
| **Direct publish (DRAFT → PUBLISHED) if `!requireApproval`** | own | – | – | any | – |
| **Admin approve (PENDING_REVIEW → PUBLISHED)** | – | – | – | any | – |
| **Admin reject (PENDING_REVIEW → REJECTED)** | – | – | – | any | – |
| **Archive (soft-delete)** | own DRAFT only | any on owned parcels | – | any | – |
| **Version rollback / set-active-model** | – | own parcels (pick among PUBLISHED versions) | – | any | – |
| **View on map** (read PUBLISHED + activeModelId) | any | any | any | any | **any** |
| **View hidden / archived on map** | – | own parcels | – | any | – |
| **Grant architect access to parcel** | – | own parcels | – | any | – |
| **Revoke architect access** | – | own parcels | – | any | – |
| **Set `Parcel.requireApproval`** | – | own parcels | – | any | – |

Notes on the matrix:

- `OWNER` (individual human parcel owner, not DEVELOPER) is currently rare in ZAAHI
  data but the column is there for future-proofing; they have the same rights as
  DEVELOPER on parcels they own in the data model.
- Public / unauth users can only *view* published models on the map — same as they
  can already view the Signature buildings. No authentication change.
- Admin override is blanket — a founder / admin can do anything. This matches the
  `FOUNDER_EMAILS` pattern in `src/lib/auth.ts`.
- No row exists for `BUYER` / `INVESTOR` / `BROKER` — they are consumer roles for
  the architect portal (they just view published models on the map).

### 4.8 Audit trail

Every state transition writes to `ActivityLog` (the existing table) with kinds:

- `ARCHITECT_MODEL_UPLOADED`
- `ARCHITECT_MODEL_PUBLISHED`
- `ARCHITECT_MODEL_APPROVED`
- `ARCHITECT_MODEL_REJECTED`
- `ARCHITECT_MODEL_ARCHIVED`
- `ARCHITECT_MODEL_SET_ACTIVE`
- `ARCHITECT_ACCESS_GRANTED`
- `ARCHITECT_ACCESS_REVOKED`

Payload includes old + new status, actor userId, model id, parcel id. This is the
same `ActivityLog` pattern used by Phase 1 dashboards and the deal workflow.

---

## 5. Prisma Schema Proposal

**Illustrative, not a migration.** The snippet below is Prisma-schema language but
must be adapted, reviewed, and migrated by engineering. No `prisma migrate` command
is to be run against this document.

### 5.1 Design choices before the schema

**(1) Do we need a separate table?** Yes. `Document` has the wrong lifecycle
(no versioning, no status, no architect concept, no placement metadata) and
overloading it would create messy cross-cutting auth rules.

**(2) `CUSTOM` as an `AffectionPlan.buildingStyle` value?** No. The signal
"render custom model instead of Signature" is better derived from
`Parcel.activeModelId != null`. Reasons:
  - `buildingStyle` is populated by the DDA refresh worker; custom models are
    populated by user action. Mixing the two on one field creates race conditions
    (a DDA refresh could overwrite a manual `CUSTOM`).
  - Queries for "does this parcel have a custom model?" are already cheapest as an
    index on `Parcel.activeModelId`.
  - Keeping `AffectionPlan.buildingStyle` purely regulatory-origin (`SIGNATURE`,
    `FLAT`) preserves its historical append-only semantics.
**Decision: do not add `CUSTOM` to `buildingStyle`. Use `Parcel.activeModelId`.**

**(3) `placement` as a separate table vs embedded JSON?** Embedded JSON. Placement
is (yaw, pitch, roll, anchor offset, scale) — 5-8 floats, always read together,
never queried by. Storing as `Json?` on the model row avoids a join.

**(4) Version uniqueness.** Race: two simultaneous uploads to the same parcel from
the same architect could both compute `version = 3`. Guard with
`@@unique([parcelId, architectId, version])` + transactional `SELECT max(version)
FOR UPDATE` inside the API route.

**(5) Checksum.** SHA-256 of the uploaded GLB, computed client-side (for UX) and
server-side (for trust) on `complete`. Enables dedup — same file uploaded twice
returns the existing model row rather than duplicating storage.

**(6) Soft-delete vs hard-delete.** Soft (`status = ARCHIVED` + `archivedAt`) for
audit. Hard-delete only via admin CLI; IP disputes need the record.

### 5.2 The proposed schema (illustrative)

```prisma
// ========================================================================
// ARCHITECT PORTAL — ILLUSTRATIVE SCHEMA, NOT A MIGRATION
// Target branch: research/architect-portal
// For discussion only — engineering must review indexes, naming, FKs.
// ========================================================================

enum ArchitectModelStatus {
  DRAFT             // uploaded, not yet visible
  PENDING_REVIEW    // awaiting admin approval (only when Parcel.requireApproval)
  PUBLISHED         // approved / direct-published, eligible to be the active model
  ARCHIVED          // soft-deleted by owner or admin
  REJECTED          // admin rejected
}

enum ArchitectModelFormat {
  GLB
  // Reserved for V2+: GLTF, USDZ, IFC
}

model ArchitectModel {
  id                  String                @id @default(cuid())
  parcelId            String
  architectId         String                // the User.id who authored the model
  uploadedByUserId    String                // may differ when admin uploads on behalf
  fileUrl             String                // resolved through src/lib/storage.ts
  fileSize            BigInt                // bytes; BigInt matches Parcel.currentValuation precedent
  format              ArchitectModelFormat  @default(GLB)
  checksum            String                // SHA-256 hex of uploaded file
  version             Int                   // auto-incremented per parcelId
  status              ArchitectModelStatus  @default(DRAFT)

  // Display metadata
  name                String?               // architect-provided display name
  description         String?               @db.Text
  placement           Json?                 // { yaw, pitch, roll, anchorLatOffsetM, anchorLngOffsetM, scale }
  thumbnailUrl        String?               // auto-generated preview PNG, populated async

  // Audit
  uploadedAt          DateTime              @default(now())
  approvedByUserId    String?
  approvedAt          DateTime?
  rejectedReason      String?               @db.Text
  archivedAt          DateTime?

  // Stats
  viewCount           Int                   @default(0)

  // Relations
  parcel              Parcel                @relation(fields: [parcelId], references: [id], onDelete: Cascade)
  architect           User                  @relation("ArchitectModelsAuthored", fields: [architectId], references: [id])
  uploadedBy          User                  @relation("ArchitectModelsUploaded", fields: [uploadedByUserId], references: [id])
  approvedBy          User?                 @relation("ArchitectModelsApproved", fields: [approvedByUserId], references: [id])

  activeForParcel     Parcel?               @relation("ParcelActiveModel")

  @@unique([parcelId, architectId, version])
  @@index([parcelId, status])
  @@index([architectId])
  @@index([status])
  @@index([checksum])
}

model ParcelArchitectAccess {
  id                  String    @id @default(cuid())
  parcelId            String
  architectId         String
  invitedByUserId     String    // developer who granted access
  invitedAt           DateTime  @default(now())
  revokedAt           DateTime?
  revokedByUserId     String?

  parcel              Parcel    @relation(fields: [parcelId], references: [id], onDelete: Cascade)
  architect           User      @relation("ParcelArchitectAccess_Architect", fields: [architectId], references: [id])
  invitedBy           User      @relation("ParcelArchitectAccess_Inviter", fields: [invitedByUserId], references: [id])

  @@unique([parcelId, architectId])
  @@index([architectId])
  @@index([parcelId])
}

// Additions to existing Parcel model:
model Parcel {
  // ... existing fields unchanged ...

  activeModelId       String?       @unique                            // FK to ArchitectModel.id
  activeModelSetAt    DateTime?                                        // when the active model was set
  activeModelSetById  String?                                          // who set it
  requireApproval     Boolean       @default(false)                    // gate for DRAFT → PENDING_REVIEW
  openToCommunityModels Boolean     @default(false)                    // Model B of §4.2

  activeModel         ArchitectModel?  @relation("ParcelActiveModel", fields: [activeModelId], references: [id])
  architectModels     ArchitectModel[]                                 // back-reference
  architectAccess     ParcelArchitectAccess[]                          // back-reference
  activeModelSetBy    User?         @relation("ParcelActiveModelSetBy", fields: [activeModelSetById], references: [id])
}

// Additions to existing User model (all relations, no new scalar fields):
model User {
  // ... existing fields unchanged ...

  architectModelsAuthored   ArchitectModel[]          @relation("ArchitectModelsAuthored")
  architectModelsUploaded   ArchitectModel[]          @relation("ArchitectModelsUploaded")
  architectModelsApproved   ArchitectModel[]          @relation("ArchitectModelsApproved")
  architectAccessGranted    ParcelArchitectAccess[]   @relation("ParcelArchitectAccess_Architect")
  architectAccessInvited    ParcelArchitectAccess[]   @relation("ParcelArchitectAccess_Inviter")
  parcelsActivatedByMe      Parcel[]                  @relation("ParcelActiveModelSetBy")
}
```

### 5.3 Index rationale

- `@@unique([parcelId, architectId, version])` — prevents race on version bump, also
  gives fast lookup of "architect X's version N on parcel P".
- `@@index([parcelId, status])` — covers the most common query:
  "all PUBLISHED / PENDING_REVIEW models for this parcel".
- `@@index([architectId])` — "all models authored by architect X" (dashboard list).
- `@@index([status])` — admin review queue ("all PENDING_REVIEW across platform").
- `@@index([checksum])` — dedup check on upload.
- `Parcel.activeModelId @unique` — one-to-one reverse relation.

### 5.4 What we deliberately did NOT add

- **No `ArchitectFirm` table.** `User.companyName` is sufficient for MVP. Multi-user
  firm collaboration is V2+.
- **No `Comment` / `Review` on models.** Feedback flows via email / dashboard
  notification for MVP.
- **No `Price` / `Royalty` fields.** This is not a marketplace yet (V2+).
- **No `ModelTag` join.** Categorisation / search by style is a later concern; MVP
  filters by parcel, not by tag.
- **No `ModelLOD` table.** LOD variants (§6.6) are either stored as files in the
  same R2 bucket under convention (`{modelId}-lod{n}.glb`) or deferred to V2+.

---

## 6. Map Rendering Integration

### 6.1 MapLibre `custom` layer pattern

MapLibre GL JS exposes [`CustomLayerInterface`](https://maplibre.org/maplibre-gl-js/docs/API/interfaces/CustomLayerInterface/)
which lets a layer render via user-supplied GL code into the map's shared WebGL
context. The interface is:

- `id: string` — unique layer id.
- `type: "custom"`.
- `renderingMode: "3d"` — critical; enables depth-buffer sharing with
  `fill-extrusion` layers so the ZAAHI Signature buildings and custom GLBs occlude
  each other correctly.
- `onAdd(map, gl)` — called when the layer is added. Initialise three.js here.
- `render(gl, args)` — called every frame. `args.defaultProjectionData.mainMatrix`
  is a `Float32Array`-typed `mat4` representing world-to-clip transform.
- `onRemove(map, gl)` — teardown.
- `prerender` (optional) — pre-passes, shadow maps, etc.

MapLibre version: `5.23.0` is the current release per
[GitHub releases](https://github.com/maplibre/maplibre-gl-js/releases). The
`CustomRenderMethodInput.defaultProjectionData.mainMatrix` API stabilised in
5.x and is what we target.
([CustomRenderMethodInput docs](https://maplibre.org/maplibre-gl-js/docs/API/type-aliases/CustomRenderMethodInput/))

### 6.2 three.js integration boilerplate

The canonical pattern (see MapLibre's own example at
[`add-a-3d-model-using-threejs`](https://maplibre.org/maplibre-gl-js/docs/examples/add-a-3d-model-using-threejs/)):

- **In `onAdd`:** create `THREE.Camera` (no projection set — we'll stuff the
  full projection matrix in per-frame), `THREE.Scene`, directional + ambient
  lights, a `GLTFLoader` (optionally wired to `DRACOLoader` and `KTX2Loader`).
  Create `THREE.WebGLRenderer({ canvas: map.getCanvas(), context: gl,
  antialias: true })` — *reuse* the MapLibre canvas and GL context rather than
  creating a new one; this is what enables depth sharing.
- **In `render(gl, args)`:** read `args.defaultProjectionData.mainMatrix` into a
  `THREE.Matrix4`, multiply by the per-model world-space transform (Mercator
  translation × scale × rotation), set `camera.projectionMatrix` to the result,
  and call `renderer.render(scene, camera)`. Then `renderer.resetState()` so
  MapLibre's next layer draws correctly.

There are two non-obvious gotchas the MapLibre + three.js community documents:

- `renderer.autoClear = false` — otherwise three.js wipes the map underneath.
- `renderer.resetState()` *after* each render — three.js's WebGL state
  (scissor, viewport, blend mode) leaks into the next MapLibre draw call if
  not reset.

### 6.3 Coordinate transform — Mercator meters ↔ three.js scene units

MapLibre works in web-mercator. A `MercatorCoordinate` scales by a factor that
depends on latitude (the Mercator projection distorts more at the poles). The
pattern is:

- Convert the parcel's centroid (from `Parcel.latitude`, `Parcel.longitude`) to
  `MercatorCoordinate`: `maplibregl.MercatorCoordinate.fromLngLat([lng, lat],
  altitudeMeters)`.
- Get `coord.meterInMercatorCoordinateUnits()` — the scale factor.
- Compose the per-model matrix as `Translation(coord.x, coord.y, coord.z) ×
  Scale(scale, -scale, scale) × Rotation(yaw, pitch, roll)` — the negative-Y
  scale flips from three.js's Y-up to MapLibre's Y-down.
- Multiply the MapLibre modelViewProjectionMatrix by the per-model matrix to
  get the final camera matrix.

All this lives in a helper `mercatorMatrixForParcel(parcel, placement)` so the
render loop is a clean iteration over active models.

### 6.4 Why per-model `placement` matters

`ArchitectModel.placement: Json` stores:

```
{
  yaw:              number,  // rotation around Y (heading), radians
  pitch:            number,  // rotation around X (tilt)
  roll:             number,  // rotation around Z
  anchorLatOffsetM: number,  // offset from parcel centroid (north / south)
  anchorLngOffsetM: number,  // offset from parcel centroid (east / west)
  altitudeM:        number,  // base height above terrain
  scale:            number,  // uniform scale (architect-provided models are
                             // usually in meters at scale 1; override if not)
}
```

**Why we need this.** Architects authoring in Revit / Rhino don't necessarily set
the origin to the plot centroid. Some export with the building's base at (0,0,0),
others at the bounding box centre, others at an arbitrary reference point. A
placement override lets the architect nudge the model in the inline preview
viewer before publishing — drag to align, rotate to match street orientation,
adjust scale if the units turn out to be feet, not meters. Without this the
first upload has a 50 % chance of appearing sideways in the wrong place.

### 6.5 Performance — how many GLBs render simultaneously

Published three.js community guidance and the Codrops 2025 optimisation guide:

- **Apple M1/M2** handles ~20-40 published models at 500k tris each at 60 fps
  with PBR materials.
- **Mid-range Android (Snapdragon 7-series)** struggles past 8-10 models at
  200k tris each — drops to 30 fps.
- **Intel UHD integrated** (low-end Windows laptop) — ~5 models at 200k tris
  before frame-rate degrades.
  ([three.js performance tips](https://www.utsubo.com/blog/threejs-best-practices-100-tips),
  [Codrops optimisation guide](https://tympanus.net/codrops/2025/02/11/building-efficient-three-js-scenes-optimize-performance-while-maintaining-quality/))

**Implications for ZAAHI.** The map shows thousands of parcels. Only parcels in
the current viewport need their custom models loaded. MVP strategy:

- Only fetch / render custom GLBs for parcels that are in the viewport *and*
  at zoom level ≥ 16 (street level). At lower zoom, show the Signature
  extrusion as a proxy.
- Limit simultaneous rendered custom models to 20 (configurable). Beyond that,
  evict the farthest-from-centre LRU-style.
- Unload three.js geometry + textures on eviction: `geometry.dispose()`,
  `material.dispose()`, `texture.dispose()` to free GPU memory.

### 6.6 LOD strategy

Two realistic paths:

**(1) Server-side `gltfpack -si 0.5 -tc` / `gltf-transform simplify`** on upload.
Generates 3 LOD tiers (e.g., 100 %, 50 %, 20 % triangles) stored as
`{modelId}-lod0.glb`, `{modelId}-lod1.glb`, `{modelId}-lod2.glb`. Client picks
based on zoom / distance. Similar to how Cesium Ion produces 3D Tiles LOD
chains.
([3D Tiling pipeline](https://cesium.com/learn/3d-tiling/))

**(2) Meshopt's built-in LOD** — `EXT_mesh_gpu_instancing` and the
`meshoptimizer` LOD chain emitted at export time. Single file, smaller total
size, client renders the right LOD based on screen-space error.

**Recommendation.** Sprint 1: no LOD. Sprint 3: server-side `gltfpack` pipeline
generates LOD-1 and LOD-2 alongside LOD-0. Client loads LOD-0 when the parcel is
in focus (selected / hovered), LOD-1 for visible-in-viewport, LOD-2 for
skeleton. This is the same pattern Cesium / deck.gl use and does not require
Meshopt extension support on the authoring tool side — `gltfpack` is a
free command-line run on the server.

### 6.7 Fallback behaviour

Critical. Per the `CLAUDE.md` Signature preservation rule and UX common sense, a
custom model failing to load **must never leave the plot blank**. The fallback
ladder:

1. Fetch `/api/parcels/map` → response includes `activeModel: { url, placement,
   checksum }` per parcel with an active model.
2. For each parcel with `activeModel`, request the GLB via fetch.
3. On 200 OK: parse with GLTFLoader. On success, render in three.js custom layer
   *and* filter out that parcel from the Signature layer.
4. On 4xx / 5xx / CORS error / GLTFLoader parse error / checksum mismatch: log a
   telemetry event `ARCHITECT_MODEL_RENDER_FAILED` with parcelId, modelId,
   reason. Do **not** filter out the parcel from the Signature layer — let the
   algorithmic building render.
5. On GLTFLoader success but no geometry / empty scene: same fallback.

The map must never show an empty plot where a building should be.

### 6.8 Lighting and shadows

MapLibre does not expose a shared scene light. three.js layer brings its own.

**Recommendation:**

- `THREE.AmbientLight(0xffffff, 0.5)` for general fill.
- `THREE.DirectionalLight(0xffffff, 1.0)` positioned at Dubai solar noon
  elevation (~83° at equinox, higher summer, lower winter — hard-code to the
  90° simple case for MVP) with `castShadow: false` for perf.
- No shadows in MVP (shadow maps × N models is expensive; community guidance
  confirms this is a known cost).
- If MapLibre exposes a time-of-day ambient colour (it does via `sky` layer +
  light settings in recent versions), poll that value every ~60 frames and
  update the three.js `AmbientLight.color` to match. Otherwise fixed.

**Why this level matters.** The Signature extrusions are shaded only by
MapLibre's built-in `fill-extrusion` illumination (a single directional light
baked into the shader). A three.js-rendered GLB with wildly different lighting
looks visually disjoint from its neighbours. Matching ambient + direction
approximately is enough for visual cohesion.

### 6.9 Suppressing Signature geometry per parcel

As identified in §1.4, `fill-extrusion-opacity` is not a data-driven property in
MapLibre (the code comment at line 2451 confirms this). The clean solution is
**layer filter** on each of the three Signature feature-kinds (podium, body,
crown):

- When building features in `loadZaahiPlots`, each feature already has a
  `parcelId` property.
- The response from `/api/parcels/map` also includes `activeModel` per parcel.
- Add a boolean `hasActiveModel` to each building feature's properties at
  feature-construction time.
- Layer filter becomes `["!", ["get", "hasActiveModel"]]` — only render Signature
  features for parcels without an active model.

This is a one-line change to `loadZaahiPlots`: add the property. The math,
cascade, `scaleRingFromCentroid`, and everything else is untouched.

### 6.10 Summary of the integration work

- **Modify `loadZaahiPlots`** (`src/app/parcels/map/page.tsx:2164`) to set
  `hasActiveModel` property on each building feature based on the
  `activeModel` field in the `/api/parcels/map` response, and add a filter
  expression to the three Signature layers that excludes features where
  `hasActiveModel` is true.
- **New file** `src/lib/map-custom-model-layer.ts` exporting a factory
  `createCustomModelLayer(options)` returning a `CustomLayerInterface` with
  three.js scene ownership.
- **Modify `/api/parcels/map`** response shape to include `activeModel: {
  url, placement, checksum, format } | null` per parcel.
- **No change** to Signature extrusion logic, `scaleRingFromCentroid`,
  colour table, height cascade, or setback math.

---

## 7. Architect Portal UI

### 7.1 Route plan

Following the Phase 1 Dashboards convention (`USER_DASHBOARDS_RESEARCH.md` §3.6 —
Architect Dashboard, referenced from `CLAUDE.md`):

```
/dashboard/architect                  — landing, parcels I have access to
/dashboard/architect/parcels/:id      — per-parcel detail, model list, versions
/dashboard/architect/upload/:parcelId — dedicated upload flow (stepped)
/dashboard/architect/settings         — profile, RERA / BRN, preferences
/admin/architect-models               — admin review queue (ADMIN role only)
```

`AuthGuard` wraps each page and asserts `user.role === "ARCHITECT"` (plus
`ADMIN` on the admin routes). `apiFetch` helper attaches the Bearer token to all
internal calls. Same as Phase 1.

### 7.2 Dashboard landing — ASCII wireframe

```
┌────────────────────────────────────────────────────────────────────────────┐
│ ZAAHI                             Architect Portal              [ZZ]  ≡   │
├────────────────────────────────────────────────────────────────────────────┤
│                                                                            │
│   Welcome back, Layla Al Qasimi                                            │
│   Studio Qasimi  ·  RERA #L1234567  ·  UAE                                 │
│                                                                            │
│   ┌─────────────────────┐ ┌─────────────────────┐ ┌────────────────────┐  │
│   │ Parcels I can edit  │ │ Models uploaded     │ │ Live on map        │  │
│   │        12           │ │        38           │ │        7           │  │
│   └─────────────────────┘ └─────────────────────┘ └────────────────────┘  │
│                                                                            │
│   My assigned parcels                                          [ + Share  ]│
│   ┌────────────────────────────────────────────────────────────────────┐  │
│   │ Plot 217-44, Business Bay         · 2,100 sqft · PUBLISHED (v3)    │  │
│   │ [preview thumb]      Invited by Emaar · 2026-01-12                 │  │
│   │ [View on map]  [Upload new version]  [View history (3)]            │  │
│   ├────────────────────────────────────────────────────────────────────┤  │
│   │ Plot 312-17, Downtown             · 4,500 sqft · DRAFT v1          │  │
│   │ [preview thumb]      Invited by Damac · 2026-02-28                 │  │
│   │ [Preview]  [Publish]  [Delete draft]                               │  │
│   ├────────────────────────────────────────────────────────────────────┤  │
│   │ Plot 005-02, JBR                  · 1,200 sqft · (no model yet)    │  │
│   │                      Invited by Meraas · 2026-04-01                │  │
│   │ [ Upload first model ]                                             │  │
│   └────────────────────────────────────────────────────────────────────┘  │
│                                                                            │
│   Pending review                                                           │
│   ┌────────────────────────────────────────────────────────────────────┐  │
│   │ Plot 122-08, Meydan · v5 submitted 2026-04-14 · ⧗ admin review     │  │
│   └────────────────────────────────────────────────────────────────────┘  │
│                                                                            │
└────────────────────────────────────────────────────────────────────────────┘
```

Style guide: glass cards with gold accents (Georgia serif headings) per
`CLAUDE.md` ZAAHI UI Style Guide. No new UI patterns — reuse the cards and
list-row components built for the OWNER / BUYER dashboards in Phase 1.

### 7.3 Per-parcel detail view

```
┌────────────────────────────────────────────────────────────────────────────┐
│ ← Back     Plot 217-44, Business Bay  ·  2,100 sqft  ·  Emaar             │
├────────────────────────────────────────────────────────────────────────────┤
│                                                                            │
│   ┌────────────────────────────┐     Active model                          │
│   │                            │     v3 · Tower concept rev B             │
│   │     [3D preview viewer]    │     Published 2026-03-11                  │
│   │                            │     42.1 MB  ·  Meshopt + KTX2            │
│   │   orbit controls [⟳ ⇄ ⬒]  │     [View on map]  [Archive]              │
│   └────────────────────────────┘                                          │
│                                                                            │
│   Version history                                            [+ New upload]│
│   ┌────────────────────────────────────────────────────────────────────┐  │
│   │ v3  · PUBLISHED · Active  · 2026-03-11 · 42.1 MB · Meshopt         │  │
│   │ v2  · ARCHIVED            · 2026-02-09 · 38.4 MB · Draco           │  │
│   │ v1  · ARCHIVED            · 2026-01-28 · 64.8 MB · uncompressed    │  │
│   │ [Rollback to selected]                                             │  │
│   └────────────────────────────────────────────────────────────────────┘  │
│                                                                            │
│   Access                                                                   │
│   ┌────────────────────────────────────────────────────────────────────┐  │
│   │ Layla Al Qasimi (you) · Studio Qasimi · since 2026-01-12          │  │
│   │ Tariq Haddad · Haddad Architecture · since 2026-02-04             │  │
│   └────────────────────────────────────────────────────────────────────┘  │
│                                                                            │
└────────────────────────────────────────────────────────────────────────────┘
```

### 7.4 Upload flow — stepped wizard

Step 1: **Select file** — drag-and-drop or file picker, client-side format
check (`.glb` only), client-side size check (≤ 200 MB), SHA-256 compute.

Step 2: **Upload** — progress bar driven by `XHR.upload.onprogress`. "Uploading
42 / 78 MB (54%) at 8.2 MB/s". Cancel button.

Step 3: **Validate** — post-upload, server parses the GLB header, counts
triangles, extracts dimensions, checks `extensionsUsed` for Draco / Meshopt /
KTX2. Shows the stats to the architect: "312,440 triangles · 8 meshes · 4 MB
of textures · Meshopt compression ✓".

Step 4: **Preview and place** — inline three.js viewer. Architect sees the
model on a flat plane. Two controls:

- `Placement` panel: sliders for yaw (0-360°), scale (0.5-2×), altitude
  offset (-5 to +20 m). Save to `ArchitectModel.placement`.
- `Compare with Signature` toggle: flips between current Signature cascade (as
  a preview of the plot without the model) and the uploaded GLB, so the
  architect sees the switch.

Step 5: **Metadata + Legal ack** — name, description (optional), render-priority
label, **mandatory checkbox** "I confirm I hold the copyright or have the right
to publish this model on ZAAHI and grant ZAAHI a non-exclusive, revocable
licence to display it publicly on the parcel map. I understand ZAAHI may
remove the model at any time per the Terms of Service."

Step 6: **Publish** — either direct (if `Parcel.requireApproval == false`) or
`Submit for review` (if `true`). Confirmation toast; redirect to parcel detail.

### 7.5 Inline three.js viewer — component

A standalone React component `<ModelPreviewViewer url={...} placement={...}
editable />` used in both the upload flow and the parcel detail page. Uses
`@react-three/fiber` or a hand-rolled three.js setup on a `<canvas>`.
Features:

- Orbit controls (drag to rotate, scroll to zoom, shift-drag to pan).
- Axis helper + floor grid (50 × 50 m, 1 m divisions).
- Ambient + directional light matching the map layer (§6.8) so the preview
  looks like what the user will see on the map.
- If `editable`, renders the placement sliders and emits `onChange(placement)`.
- Perf: lazy-load three.js only when this route is visited (dynamic import
  via Next.js `dynamic()`); avoid adding ~500 KB of three.js to every dashboard
  page bundle.

### 7.6 Settings page

```
┌────────────────────────────────────────────────────────────────────────────┐
│ Profile                                                                    │
│ ┌────────────────────────────────────────────────────────────────────┐    │
│ │ Name                 [ Layla Al Qasimi                         ]   │    │
│ │ Company              [ Studio Qasimi                           ]   │    │
│ │ RERA licence #       [ L1234567             ] (verified 2026-03-02)│    │
│ │ BRN                  [ 12345                ]                      │    │
│ │ Portfolio URL        [ https://qasimi.studio                   ]   │    │
│ │ Phone                [ +971 50 123 4567                        ]   │    │
│ │ Bio                  [ 3 lines text ...                        ]   │    │
│ │ Avatar               [upload new]                                  │    │
│ └────────────────────────────────────────────────────────────────────┘    │
│ Notifications                                                              │
│ ┌────────────────────────────────────────────────────────────────────┐    │
│ │ [x] Email me when a developer grants me access to a parcel         │    │
│ │ [x] Email me when a model is approved / rejected                   │    │
│ │ [ ] Weekly digest of my portfolio activity                         │    │
│ └────────────────────────────────────────────────────────────────────┘    │
│ Data & privacy                                                             │
│ ┌────────────────────────────────────────────────────────────────────┐    │
│ │ [ Download my data ]  [ Delete my account ]                        │    │
│ └────────────────────────────────────────────────────────────────────┘    │
└────────────────────────────────────────────────────────────────────────────┘
```

### 7.7 Admin review queue — `/admin/architect-models`

Reuses the admin-dashboard component patterns from existing approval queues
(broker verification, ambassador applications). Rows are PENDING_REVIEW models
sorted oldest-first. Each row:

- Architect name + avatar.
- Parcel address + developer.
- `[Preview]` (opens a modal with `<ModelPreviewViewer>`).
- `[Approve]` + `[Reject with reason]` buttons.

Reject-with-reason captures the reason in `ArchitectModel.rejectedReason`,
emails the architect via the existing notification pipeline, logs to
`ActivityLog`.

### 7.8 Integration with existing Phase 1 dashboards

Cross-reference `USER_DASHBOARDS_RESEARCH.md` §3.6 — Architect Dashboard
already had these planned sections:

- `My Portfolio` (models authored) ← **this research adds the model rows**.
- `Assigned parcels` ← this research adds the `ParcelArchitectAccess`
  backing table.
- `Invitations pending` ← UX not yet implemented; added in Sprint 2.

What the ARCHITECT role sees that OWNER / BUYER / BROKER do NOT:

- The "Parcels I can edit" section (based on `ParcelArchitectAccess`).
- The "Models uploaded" and "Live on map" stat cards.
- The upload/preview/version flow.
- The RERA / BRN field on settings (also shown to BROKER — same field, different
  relevance).

The architect is NOT shown:

- Listing CRUD (that's BROKER / DEVELOPER).
- Deal management (that's BROKER / INVESTOR).
- Affection-plan editor (that's DEVELOPER / ADMIN).
- Commission tracking (ambassadors / BROKER).

### 7.9 Style guide compliance

Per `CLAUDE.md` ZAAHI UI Style Guide:

- Glassmorphic cards with gold accent borders (`#B89A4E` + `rgba(255,255,255,0.04)`
  backdrop).
- Headings: Georgia serif.
- Body: system font stack.
- Buttons: gold on dark, charcoal on light.
- No emojis in production UI.
- No new visual patterns invented for this feature — every component has a
  Phase 1 precedent.

---

## 8. API Routes Required

All routes follow existing ZAAHI conventions:

- **Auth**: `getApprovedUserId(req)` on every route except `GET /api/parcels/map`
  (already public-like).
- **Role check**: inline, throws 403 on mismatch.
- **Middleware allow-list**: none of these are added to `PUBLIC_API` in
  `src/middleware.ts`. Only the existing `/api/parcels/map` remains public-ish.
- **Conventions**: JSON bodies, ISO-8601 timestamps, snake_case in DB / camelCase
  in responses (matches current codebase).

### 8.1 `POST /api/architect/models`

**Auth:** ARCHITECT (or ADMIN on behalf via `uploadedByUserId`).
**Request body:**

- `parcelId` (string, required).
- `fileName` (string, required, ends `.glb`).
- `fileSize` (number, bytes, ≤ 200 MB cap enforced).
- `checksum` (string, SHA-256 hex, client-computed).

**Server side:**

1. Assert the calling architect has `ParcelArchitectAccess` on `parcelId` (or is
   admin).
2. Check for checksum collision — if an existing `PUBLISHED` model from *any*
   architect on this parcel has the same checksum, 409 with message.
3. Compute next `version` for `(parcelId, architectId)` inside a transaction.
4. Insert `ArchitectModel` row with `status = DRAFT`, `fileUrl = null` (to be
   filled on complete).
5. Ask `src/lib/storage.ts` for a **signed upload URL** at path
   `architect-models/{parcelId}/{modelId}.glb`, TTL 30 minutes.
6. Log `ARCHITECT_MODEL_UPLOAD_INITIATED` to `ActivityLog`.

**Response:**

- `modelId` (string).
- `uploadUrl` (string, signed, TTL 30 min).
- `uploadMethod` ("PUT" or "POST" depending on storage vendor).
- `uploadHeaders` (object, vendor-specific headers to include).

**Side effects:** one row in `ArchitectModel` at `DRAFT` status. If the client
never completes, a daily cron evicts drafts > 24 h old.

### 8.2 `POST /api/architect/models/:id/complete`

**Auth:** ARCHITECT (must be the `architectId` of the model, or ADMIN).
**Request body:** empty.

**Server side:**

1. Fetch model row, assert `status = DRAFT`, assert caller matches.
2. Verify file exists at the expected storage path; read size and
   recomputed checksum; reject if they don't match the pre-declared values.
3. Run GLB header validation (parse `glTF` JSON chunk, count triangles,
   detect extensions, enforce triangle cap 500k).
4. Update `ArchitectModel.fileUrl` to the canonical storage URL.
5. Log `ARCHITECT_MODEL_UPLOADED`.
6. Return model row.

**Response:** the full model row with `fileUrl` populated and validation
stats (`triCount`, `extensionsUsed`, `boundingBoxMeters`).

**Side effects:** row moves from `DRAFT` with empty URL to `DRAFT` with valid
URL + stats. Thumbnail generation is enqueued (Sprint 3).

### 8.3 `GET /api/architect/models`

**Auth:** ARCHITECT (returns only their own models) or ADMIN (returns
everything with optional filter).

**Query params:**

- `parcelId` (optional) — filter.
- `status` (optional) — filter.
- `limit` (default 20, max 100).
- `cursor` (opaque pagination token).

**Response:** `{ items: [...], nextCursor: string | null }`.

### 8.4 `GET /api/architect/models/:id`

**Auth:** ARCHITECT (only if they authored it or uploaded it) or ADMIN.
**Response:** full model row + parcel summary + version count.

### 8.5 `PATCH /api/architect/models/:id`

**Auth:** ARCHITECT (must author / upload), or ADMIN.
**Request body:** any of `name`, `description`, `placement`.
**Constraint:** only allowed while `status ∈ { DRAFT, REJECTED }`. Published
models are immutable (new version required to change).
**Response:** updated model row.

### 8.6 `POST /api/architect/models/:id/publish`

**Auth:** ARCHITECT (author).
**Request body:** `{ legalAck: true }` — required; reject if false.

**Server side:**

1. Assert `status = DRAFT`.
2. If the parcel has `requireApproval = true`, transition to `PENDING_REVIEW`
   and notify admins. Otherwise transition directly to `PUBLISHED`.
3. Log transition to `ActivityLog`.
4. If direct publish, also send a notification to the developer who owns the
   parcel ("Your architect published a new model; set as active?").

**Response:** updated model row.

**Side effects:** does **not** automatically update `Parcel.activeModelId`. That
is an explicit developer / admin action via §8.10.

### 8.7 `POST /api/admin/models/:id/approve`

**Auth:** ADMIN.
**Request body:** empty (optional `notes`).
**Server side:** `PENDING_REVIEW → PUBLISHED`, fill `approvedByUserId`,
`approvedAt`. Notify architect.
**Response:** updated model row.

### 8.8 `POST /api/admin/models/:id/reject`

**Auth:** ADMIN.
**Request body:** `{ reason: string (min 10 chars) }`.
**Server side:** `PENDING_REVIEW → REJECTED`, fill `rejectedReason`. Notify
architect with the reason in the email.
**Response:** updated model row.

### 8.9 `DELETE /api/architect/models/:id`

**Auth:** ARCHITECT (author) or ADMIN.
**Semantic:** soft delete. Sets `status = ARCHIVED`, `archivedAt = now()`. If
the model was active (`Parcel.activeModelId`), clears the activeModel pointer
and logs the parcel's fallback to Signature.
**Response:** `{ ok: true }`.

### 8.10 `POST /api/parcels/:id/set-active-model`

**Auth:** DEVELOPER (if `Parcel.ownerId == caller`), or ADMIN.
**Request body:** `{ modelId: string | null }` (null = revert to Signature).
**Server side:**

1. Assert the model is `PUBLISHED` and belongs to this parcel (if not null).
2. Update `Parcel.activeModelId`, `activeModelSetAt`, `activeModelSetById`.
3. Log `ARCHITECT_MODEL_SET_ACTIVE` (or `_UNSET`).

**Response:** `{ parcelId, activeModelId, activeModelSetAt }`.

**Side effects:** next `/api/parcels/map` request returns the new active
model. Map auto-refreshes via the existing poll / event.

### 8.11 `GET /api/parcels/:id/active-model`

**Auth:** public-like (same policy as `/api/parcels/map`).
**Response:**

- If `activeModelId` set and PUBLISHED: `{ url, placement, checksum, format,
  fileSize, modelId, version, architectName }`.
- Else: `{ activeModel: null, fallback: "SIGNATURE" }`.

**Cache:** `Cache-Control: public, max-age=60, stale-while-revalidate=300`.

### 8.12 `GET /api/parcels/map` — breaking change

Existing endpoint. Per-item response today includes `{ id, plotNumber, district,
emirate, status, area, geometry, currentValuation, plan }`.

**Proposed addition:** `activeModel: { url, placement, checksum, format } |
null`. Document the breaking change:

- Existing clients (the map page) MUST be updated in the same PR to handle the
  new field. They are the only consumer today.
- No external API consumers to notify.
- Include the new field only when a PUBLISHED `ArchitectModel` is pointed to
  by `Parcel.activeModelId` — missing / archived / rejected cases return `null`.

**Perf consideration:** joining `ArchitectModel` on every `/api/parcels/map`
call adds a LEFT JOIN. Given the parcel count (low thousands) and the
`activeModelId` index, this is negligible. If it ever becomes hot, cache at
the CDN edge (the map endpoint is already heavily cached).

### 8.13 `POST /api/parcels/:id/architects`

**Auth:** DEVELOPER (owns parcel) or ADMIN.
**Request body:** `{ architectUserId: string }`.
**Server side:** insert into `ParcelArchitectAccess`, notify architect by
email.
**Response:** `{ ok: true }`.

### 8.14 `DELETE /api/parcels/:id/architects/:architectId`

**Auth:** DEVELOPER (owns parcel) or ADMIN.
**Semantic:** sets `revokedAt` on the access row. Revocation does **not**
archive existing models — they remain in the architect's portfolio — but the
architect can no longer upload new versions to this parcel.

### 8.15 Rate limiting

Per CLAUDE.md patterns, new routes use the existing rate-limiting pattern if
implemented, or a simple per-route counter via ActivityLog otherwise.
Recommended:

- Upload initiate: 20 / hour per user.
- Upload complete: same.
- Publish: 10 / hour per user.
- Admin approve / reject: unlimited.
- Map / active-model read: CDN-cached, no app-layer limit.

### 8.16 Webhook / event hooks (V2+)

Deferred. If admin tooling needs to fire on status changes (Slack alert on
PENDING_REVIEW, etc.), use the existing notification infrastructure — do not
introduce a new webhook system in Sprint 1.

---

## 9. Cost Model

All pricing verified 2026-04-16 from the sources cited. UAE / UAE-dirham
conversion ignored — these are USD input prices because both vendors bill in USD.

### 9.1 Inputs

- **Supabase Pro** ($25/project/month base): 100 GB storage + 250 GB egress
  included. Overage storage $0.021 /GB/mo, overage egress **$0.09 /GB
  uncached** or ~$0.03 /GB cached (cached egress is discounted per 2025 update;
  we model conservatively at $0.09 for uncached map serving).
  ([Supabase pricing](https://supabase.com/pricing),
  [Supabase Storage 500 GB blog](https://supabase.com/blog/storage-500gb-uploads-cheaper-egress-pricing))
- **Cloudflare R2:** $0.015 /GB/mo storage, **$0 egress**, Class A ops (writes)
  $4.50 /million, Class B (reads) $0.36 /million. Free tier: 10 GB + 1 M class
  A + 10 M class B.
  ([R2 pricing](https://developers.cloudflare.com/r2/pricing/))

### 9.2 Scenario A — MVP launch: 100 architects, 10 models each, 20 MB average

- Storage: 100 × 10 × 20 MB = **20 GB**.
- Publishes per month: assume 100 × 1 = 100 uploads/month (10 % churn).
- Reads per month: 200 DAU × 30 days × 5 map visits × 10 custom-model views
  avg = **300,000 model-GET ops / month**. Each GET is ~20 MB = **6 TB egress /
  month**.

**On Supabase Pro:**

- Storage: 20 GB included in Pro, $0 overage.
- Egress: 6000 GB total, 250 GB included, 5750 GB overage × $0.09 = **$517.50**.
- Plus $25 base.
- **Total ≈ $542.50 /month.**

**On Cloudflare R2:**

- Storage: 20 GB × $0.015 = **$0.30**.
- Egress: **$0**.
- Class A (uploads + thumbnails + multipart): ~200/month × $4.50/M = negligible.
- Class B (map reads): 300,000 × $0.36/M = **$0.11**.
- **Total ≈ $0.41 /month.**

**R2 wins by ~$540 /month at this tiny scale.** Egress entirely dominates.

### 9.3 Scenario B — product-market fit: 500 DAU, 10 models per session, 20 MB

- Storage: same 20 GB.
- Egress: 500 DAU × 30 × 10 × 20 MB = **3000 GB / month = 3 TB**.

Wait — that's actually *lower* than Scenario A because I used a higher session
frequency there. Let me refit Scenario A more realistically:

**Scenario A (refit):** 100 architects, 20 GB storage, 3 TB/month egress.

- Supabase: 20 GB storage free + 2750 GB overage × $0.09 = $247.50 + $25 base
  = **$272.50 /month**.
- R2: $0.30 storage + $0 egress + negligible ops = **$0.50 /month**.

**Scenario B:** 500 DAU × 5 sessions/month × 10 model-views × 20 MB =
500 GB/month. (A more realistic cadence than daily.)

- Supabase: 500 GB egress, 250 included, 250 × $0.09 = $22.50 + $25 base =
  **$47.50 /month**. Cheap here because the scenario is small.
- R2: $0 egress + $0.30 storage = **$0.30 /month**.

Both are cheap. Egress hasn't bitten yet.

### 9.4 Scenario C — 1 year out: 1000 architects, 100k models, 500k DAU

- Storage: 1000 × 100 × 30 MB avg = **3 TB**.
- Egress: 500,000 DAU × 10 sessions/month × 15 model-views × 20 MB =
  **1,500 TB / month = 1.5 PB**.

**This is where the vendors diverge by orders of magnitude.**

**On Supabase Pro:**

- Storage: 3000 GB × $0.021 = **$63**.
- Egress: 1,500,000 GB × $0.09 = **$135,000 /month** (using the $0.09 worst-case;
  cached egress discounted rate of ~$0.03 would be **$45,000 /month** — still
  eye-watering).
- Plus $25 base.
- **Total ≈ $135,000 /month** worst-case, **$45,000 /month** if heavily cached.

**On Cloudflare R2:**

- Storage: 3000 × $0.015 = **$45**.
- Egress: **$0**.
- Class A (100k uploads + versioning + thumbnails): say 200k ops/month × $4.50/M
  = **$0.90**.
- Class B (1.5 PB ÷ 20 MB = 75 M reads): 75 M × $0.36/M = **$27**.
- **Total ≈ $73 /month.**

**R2 wins by $135,000 – $73 ≈ $134,927 /month at scale.** Or 1849× cheaper.
**This is the deciding factor for the feature's economics.**

### 9.5 Sensitivity — what if we're wrong

- Cut DAU by 10× → R2 still wins by $13,500.
- Double average model size → Supabase cost doubles, R2 cost adds $1 / month.
- Add a Cloudflare CDN in front of Supabase Storage → bandwidth
  cost becomes CF's $0 egress but the origin still pays per-miss — Supabase
  costs drop ~5-10× but complexity of dual-vendor increases. Marginal win vs
  just using R2 directly.
- Self-host MinIO on Hetzner → $6 / TB / month storage, egress free up to
  server bandwidth — wins on cost but loses redundancy, CDN, and ops simplicity.
  Defer to Abu Dhabi sovereignty-migration phase (per `CLAUDE.md` sovereignty
  rules the abstraction is already in place).

### 9.6 Full-stack cost at Scenario C

- R2 storage + egress: ~$75 /month.
- Supabase Pro (databases, auth, postgres): already paying, no delta.
- Vercel function invocations for upload init + admin approve: trivial.
- Compute for thumbnail generation (Sprint 3) via Cloudflare Browser Rendering:
  ~$0.002 per rendered thumbnail; 100k models × $0.002 = $200 one-time +
  $20/month for new uploads.
- ClamAV worker (Sprint 4): Fly.io shared-CPU 256MB VM = ~$3/month.
- LOD generation (Sprint 3): one-shot `gltfpack` per upload in a Node worker;
  negligible.
- Total new monthly spend for the feature end-state: **~$100 /month at 500k DAU**.

### 9.7 Recommendation

**Cloudflare R2 via `src/lib/storage.ts` abstraction from day one.** The
$135k/month delta at scale is the entire justification by itself. Even at MVP
scale ($540/month delta from Scenario A) the payback period for a single R2
integration sprint is measured in weeks. The storage abstraction is already in
the repo, so "just use Supabase Storage for MVP" saves no real engineering
time — the work is identical, just a different adapter.

---

## 10. Phased Rollout Plan

Each sprint is scoped to one dominant senior full-stack engineer + ~0.25-0.5
of a designer, consistent with ZAAHI's current team velocity per prior
Phase 1 dashboards rollout.

### Sprint 1 — MVP: one architect, one plot, one GLB on the map (3 weeks)

**Goal.** Prove the end-to-end mechanic: an ARCHITECT-role user can upload a
GLB and see it replace the Signature building on a specific plot, visible to
everyone on `/parcels/map`.

**Deliverables.**

- Prisma migration for `ArchitectModel`, `ParcelArchitectAccess`, `Parcel.activeModelId`.
- `src/lib/storage.ts` R2 adapter (if not already live from Wall/Archibald work).
- API routes from §8: 8.1, 8.2, 8.3, 8.4, 8.6 (direct-publish mode only),
  8.9, 8.10, 8.11, 8.12 breaking-change, 8.13. Routes 8.7, 8.8
  (admin approve/reject) stubbed with admin-only "revert" equivalent.
- Architect dashboard pages: landing list, per-parcel detail, upload wizard.
- Inline `<ModelPreviewViewer>` component.
- MapLibre custom layer (§6): new file `src/lib/map-custom-model-layer.ts`.
- `loadZaahiPlots` modification: one-line property add, filter add.
- Legal ack checkbox on publish, mandatory.
- Basic admin override: one button in `/admin/*` to `ARCHIVED` any model.

**Acceptance criteria.**

- An ARCHITECT can complete the full flow for a parcel where they have
  `ParcelArchitectAccess` and see their GLB render on `/parcels/map` within
  2 minutes of publish.
- The custom model occludes / is occluded by neighbouring Signature buildings
  correctly (depth buffer shared).
- Turning off `Parcel.activeModelId` reverts the parcel to Signature
  instantly on next map load.
- A failed GLB fetch (404, malformed file) falls back to Signature without
  blanking the plot.
- No regression in Signature rendering for parcels without an active model.

**Scope boundaries (deferred to Sprint 2+).**

- No DRAFT → PENDING_REVIEW flow.
- No version rollback UI (data model supports it, UI doesn't).
- No LOD, no thumbnails, no ClamAV, no chunked upload.
- No multi-architect collaboration UI (data model supports it).

**Estimate.** **3 weeks** of engineering + 0.5 week of design / QA. Risk
buffer of 0.5 week on the MapLibre custom layer integration — biggest unknown.

### Sprint 2 — Versioning + approval workflow + multi-architect (2 weeks)

**Goal.** Multiple versions per parcel, admin approval for parcels opted in,
multiple architects collaborating on one parcel.

**Deliverables.**

- Auto-version increment on upload (data model supports; UI completes).
- `POST /api/admin/models/:id/approve` + `/reject` fully wired.
- `Parcel.requireApproval` toggle in developer UI.
- Version history UI on the per-parcel detail page (rollback button).
- `ParcelArchitectAccess` management UI for developers.
- Notification emails on state transitions.
- Admin review queue page `/admin/architect-models`.

**Acceptance criteria.**

- A developer can toggle `requireApproval = true` on a parcel; architect
  uploads land in `PENDING_REVIEW`; admin approves; model goes live.
- A developer can grant two architects access to one parcel; both can upload
  independently; developer picks active via §8.10.
- Rollback to a previous PUBLISHED version on a parcel works in one click
  and propagates to the map within 60s.
- Architect receives email on approval / rejection within 5 min.

**Estimate.** **2 weeks**.

### Sprint 3 — Performance, LOD, fallbacks, thumbnails (1-2 weeks)

**Goal.** Production-grade rendering and perf across devices.

**Deliverables.**

- Server-side `gltfpack` LOD generation worker. Generates `-lod1.glb`
  (50 % tris) and `-lod2.glb` (20 % tris).
- Client LOD selection: zoom + distance based.
- Viewport culling + simultaneous-model limit (§6.5).
- Draco / Meshopt / KTX2 loader wiring (lazy-loaded transcoder WASM).
- Thumbnail generator (Cloudflare Browser Rendering or Fly.io Puppeteer worker).
- Chunked upload (TUS or S3-multipart) for > 50 MB files.
- Explicit fallback telemetry event on render failure.
- `ModelPreviewViewer` perf tuning: dispose-on-unmount, dynamic-import.

**Acceptance criteria.**

- A 150 MB GLB model renders acceptably (30+ fps) on a mid-range Android.
- 20 simultaneous parcels with custom models in viewport render without
  dropping below 30 fps on Apple M1.
- Every upload > 50 MB uses chunked upload and resumes after network
  interruption.
- Thumbnails auto-generate within 60s of publish.

**Estimate.** **1-2 weeks**, likely 2.

### Sprint 4 — Admin tools + abuse prevention (2 weeks)

**Goal.** Operational readiness.

**Deliverables.**

- ClamAV worker on new uploads (async post-complete).
- Copyright takedown workflow (admin-initiated ARCHIVED + reason).
- Abuse dashboard: flag model, anonymous reports, DMCA-style counter-notice.
- Audit log UI (read-only) for admin / legal — filters by parcel / architect /
  actor / date.
- Usage analytics: per-architect model views, per-parcel renders.
- Rate limits enforced on upload routes.
- Extended legal ToS text in upload flow.

**Acceptance criteria.**

- Takedown request → admin archives within one working day.
- Abuse report creates admin-review entry within 5 min.
- Rate limit of 20 uploads/hour per user is enforced and visible to the user.

**Estimate.** **2 weeks**.

### V2+ — explicitly deferred

These are **not** Sprint 4. They are V2 or later.

- **Realtime multi-architect editing** (BIMcloud Delta Server analogue — §12).
  ZAAHI is not a BIM authoring tool; do not build this.
- **IFC / Revit native ingestion** — server-side `.rvm` / `.ifc` → GLB
  conversion pipeline using `web-ifc` or Autodesk's Forge API. High cost,
  narrow audience.
- **3D Tiles / Cesium-style streamed LOD** — when ZAAHI has thousands of
  published models per map viewport, single-GLB-per-parcel won't scale; move
  to 3D Tiles 1.1 tile chains per district. See §12 Cesium Ion row.
- **iOS AR / Quick Look** — USDZ export of published models; SafariAR.
- **Architect marketplace** — commercial licensing of uploaded models to other
  developers; royalty tracking; Stripe Connect. Significant product expansion.
- **Realtime comments / feedback on models** — Wall-adjacent product hook.
- **Mobile app native viewer** — when the PWA feed from Wall/Archibald lands.

### Sprint summary table

| Sprint | Duration | Engineer-weeks | Designer-weeks | Key risks |
|---|---|---|---|---|
| 1 MVP | 3 weeks | 3 | 0.5 | MapLibre + three.js integration; R2 adapter; legal text sign-off |
| 2 Versioning + workflow | 2 weeks | 2 | 0.25 | Email throughput; admin UI capacity |
| 3 LOD + perf | 1-2 weeks | 2 | 0.1 | gltfpack quality; chunked upload edge cases |
| 4 Admin + abuse | 2 weeks | 2 | 0.25 | DMCA process legal review; ClamAV ops |
| V2+ | deferred | — | — | — |

**Total to full production readiness: ~9 engineer-weeks across 4 sprints.**

---

## 11. Risks + Open Questions

### 11.1 Top 5 technical risks

1. **MapLibre custom layer depth-buffer edge cases.** Shared depth buffer
   between `fill-extrusion` and three.js scenes is documented to work but
   corner cases exist (render order, transparent surfaces, anti-aliasing
   artefacts at surface intersections). **Mitigation:** start from MapLibre's
   official example verbatim, test on the 3 most-seen parcels in staging
   before launch. If depth sharing misbehaves, fall back to `renderingMode:
   "3d"` with explicit scene-level z-sorting.

2. **three.js WebGL state leakage.** `renderer.resetState()` is easy to forget
   on one code path and causes weird glitches (tile tears, wrong
   colours on subsequent draws). **Mitigation:** wrap the three.js render
   in a `renderSceneSafely()` helper that always calls `resetState`; unit-test
   with a visual diff snapshot.

3. **Mobile GPU perf cliff at 8-10 simultaneous models.** Per §6.5 guidance,
   mid-range Android fails past 8-10 models at 200k tris each.
   **Mitigation:** viewport-only rendering (§6.5), configurable limit with
   LRU eviction, LOD-2 at long distance, dispose geometry on unload.
   Telemetry event on FPS drop so we can auto-reduce the limit on bad clients.

4. **Breaking change on `/api/parcels/map`** for any undocumented consumer.
   **Mitigation:** grep the repo for the one caller (the map page); add
   new `activeModel` field as optional; keep old fields shape intact. Version
   the endpoint if ever needed (e.g., `v2`).

5. **Upload failure / race on `version` increment.** Two concurrent uploads
   from the same architect for the same parcel could both compute `version = 3`.
   **Mitigation:** `SELECT max(version) FOR UPDATE` inside a transaction;
   `@@unique([parcelId, architectId, version])` as a last-line-of-defence
   Postgres constraint. Gracefully retry on unique-constraint violation.

### 11.2 Top 5 product / business risks

1. **IP / copyright exposure.** Biggest single risk, called out in the
   Executive Summary. Architect uploads model, ZAAHI displays publicly, the
   *actual* copyright holder (the developer who commissioned it, or the
   architect's previous employer) files a claim. **Mitigation:** mandatory
   legal-ack checkbox on publish; ToS includes sub-licence + indemnity
   clauses; admin one-click archive on takedown notice; DMCA counter-notice
   process (Sprint 4). Legal review before Sprint 1 ships.

2. **Architect adoption — will they upload at all?** The feature assumes
   architects *want* to show their work on a real-estate platform. If
   incentive is unclear (no exposure metric, no commercial benefit, no
   portfolio integration), uptake will be low. **Mitigation:** launch with
   a "Featured architects" module on the homepage; show model-view counts
   in the architect dashboard; position as "portfolio on a live market map";
   invite 10-15 Dubai architects directly before public launch.

3. **Developer-architect tension on "who picks the active model".** A
   developer might publish a lower-quality concept the architect disagrees
   with, or vice versa. **Mitigation:** clear hierarchy — developer owns
   the parcel, developer picks active. Architect can archive their own
   model to prevent its use. Document this in the onboarding flow.

4. **Trust collapse if a bad model goes live on a major landmark plot.**
   A troll / competitor uploads a grossly inappropriate model to
   Burj-adjacent parcel, it goes live before admin notices, public
   embarrassment. **Mitigation:** `Parcel.requireApproval = true` default
   for any parcel with `currentValuation > AED 10M` (configurable threshold);
   24/7 admin on-call for first 6 months; fast takedown.

5. **R2 vendor lock-in risk for UAE sovereignty.** Cloudflare stores data
   globally; UAE sovereignty future may require local data residency.
   **Mitigation:** `src/lib/storage.ts` abstraction is already in place
   (per CLAUDE.md); phase-4 of Abu Dhabi migration can swap to local MinIO
   or a UAE-based S3-compatible provider. Architect-portal data is not
   PII-heavy (model files + architect name + company; model files are
   public), so sovereignty pressure is lower than for user-PII systems.

### 11.3 Top 5 open questions for the founder

Each is decision-shaped, not open-ended.

1. **Q1. Upload access — Model A (developer grants) or Model B (anyone can
   upload, developer picks)?** Recommendation: **A for MVP, B gated by
   `Parcel.openToCommunityModels` flag in Sprint 2+**. Founder to confirm
   this is acceptable; the alternative (B as default) changes the moderation
   shape significantly.

2. **Q2. Storage vendor — Cloudflare R2, Supabase Storage, or something
   else?** Recommendation: **R2** per §9 cost analysis. Founder to confirm
   this aligns with the Abu Dhabi sovereignty plan (short answer: yes, same
   abstraction).

3. **Q3. Approval workflow default — direct-publish with revert, or
   mandatory admin approval?** Recommendation: **direct-publish default;
   per-parcel `requireApproval` toggle for sensitive parcels**. Founder to
   decide the threshold for auto-enabling (e.g., `currentValuation > AED 10M`)
   or leave it as developer-set.

4. **Q4. RERA licence validation — free-text today vs hard-validate against
   DLD registry?** Today `User.reraLicense` is free-text and unchecked.
   Architect portal surfaces the field prominently; shall we gate publish
   on a verified RERA number (requires DLD API integration, not available
   today), or accept self-declaration? Recommendation: **self-declaration
   for MVP + manual admin verification for architects pushing to > AED 10M
   parcels + full validation in V2 once DLD API is available**. Founder
   decision: tolerate unverified architects on small parcels?

5. **Q5. Who gets `ARCHITECT` role in the first place?** Signup self-select
   or admin-invite-only? If self-select, what stops a broker from picking
   `ARCHITECT` to get upload rights? Recommendation: **admin-invite-only
   for first 50 architects (founder + ZAAHI team manually vet); open
   self-signup with an admin-verification queue in Sprint 2; rely on RERA
   licence check in Sprint 4**. Founder decision: launch with manual
   vetting (slower, safer) or open signup (faster, messier)?

---

## 12. Competitive Reference

### 12.1 Matterport

[matterport.com](https://matterport.com) is the dominant reality-capture
platform for the AEC industry. Workflow: professional operators (or increasingly,
iPhones with LiDAR) scan a space; the data uploads to Matterport Cloud; the
Cortex AI engine stitches scans into a unified 3D digital twin with automated
colour correction and HDR tone mapping
([Matterport workflow overview](https://matterport.com/blog/reality-capture-construction),
[Matterport Enterprise launch](https://www.prnewswire.com/news-releases/matterport-launches-enterprise-platform-to-scale-3d-model-integration-across-industries-300999269.html)).
Export paths include `.E57` point cloud, MatterPak for Revit, and `.OBJ`.
Matterport's APIs (beta) let partners build custom search, download meshes,
and feed Cortex.

**What to steal.** (1) The multi-angle auto-thumbnail on upload — every
Matterport scan has a "hero" image that's been tastefully framed, not a random
camera angle. (2) The "measurement mode" overlay on the 3D viewer. (3)
Clear owner / sharing permission model — inherited "dollhouse" visibility
defaults.

**What to avoid.** (1) Proprietary capture hardware requirement — not
applicable to ZAAHI (architects upload what they already have). (2) Pricing
opacity; we will publish clear tiers. (3) Heavy scanner-operator certification
friction.

### 12.2 Revit Cloud Worksharing (Autodesk)

Real-time multi-user Revit editing via Autodesk's cloud-hosted central model.
Part of the **BIM Collaborate Pro** bundle (formerly BIM 360). Pricing
starts at ~$705/year for BIM Collaborate and $1,625/user/year for Autodesk
Build as of 2026
([G2 Autodesk Construction Cloud pricing](https://www.g2.com/products/autodesk-construction-cloud/pricing),
[Autodesk Forma pricing](https://construction.autodesk.com/pricing/)).
Architect-oriented features: central-model "check-out / sync"; clash detection
via Navisworks; automatic version rollback.

**What to steal.** Central-model abstraction: exactly one "live" model per
project, but append-only sync log means any version is recoverable.
Conceptually aligned with our "PUBLISHED + versions" pattern in §4.4.

**What to avoid.** Heavyweight licensing model. Closed format (.rvt). Tight
coupling to Autodesk's desktop ecosystem. ZAAHI should remain format-neutral
(GLB at the API boundary) and explicitly *not* compete as a BIM authoring
tool.

### 12.3 ArchiCAD BIMcloud (Graphisoft)

Subscription real-time collaboration for Archicad users, priced at ~$225/month
as the Archicad Collaborate bundle
([Graphisoft Archicad Collaborate pricing](https://www.graphisoft.com/en-us/plans-and-products/archicad-collaborate/)).
The differentiating technology is **Delta Server** — only changed deltas sync,
so collaboration works over low-bandwidth UAE mobile links.
[BIMcloud features](https://help.graphisoft.com/AC/27/INT/_AC27_Help/080_Collaboration/080_Collaboration-4.htm).

**What to steal.** Delta-sync as a V2+ ambition if ZAAHI ever builds realtime
architectural co-editing (currently explicitly deferred).

**What to avoid.** Everything authoring-related. ZAAHI's architect portal
is a *publication* platform, not an authoring tool. Building even the smallest
realtime-edit feature collides with Graphisoft / Autodesk head-on.

### 12.4 Procore

Construction management platform that added 3D model support in 2024-2025.
Procore's Document Management tool now accepts **`.obj`, `.glb`, `.gltf`,
`.step`, `.stp`, `.rvm`, `.pts`, `.las`, `.laz`, `.dxf`, `.e57`, `.kof`** —
wide format support for contractor workflows
([Procore publish a model](https://support.procore.com/products/online/user-guide/project-level/documents/tutorials/publish-a-model-from-the-documents-tool)).
As of October 2025, you can also map 2D PDF drawings onto the 3D model
([What's New in Procore](https://www.procore.com/whats-new)).

**What to steal.** Liberal format acceptance is a user-experience win, but
we still accept only GLB at the API because every other format is a conversion
problem we don't want to own (§2.1). The "publish from documents" metaphor is
nice UX — architect's mental model is *documents*, not *database rows*.

**What to avoid.** General-contractor-centric workflow. Procore's model view
is flat in-document, no spatial/map integration. ZAAHI's differentiator is
*models on a plot on a map*, which Procore doesn't do.

### 12.5 Autodesk Construction Cloud (Forma)

The unified Autodesk platform consolidating BIM 360, PlanGrid, BuildingConnected.
Pricing: Autodesk Docs $500/year, BIM Collaborate $705/year, Autodesk Build
$1,625/user/year
([Forma pricing](https://construction.autodesk.com/pricing/)).
Positioning: cross-phase data flow (design → field → closeout) under one SSO.

**What to steal.** The unified model audit trail across roles — architect
uploads, engineer reviews, contractor builds — all see the same versioned
asset. Our `ActivityLog`-based audit in §4.8 is lightweight version of this.

**What to avoid.** Pricing complexity; ZAAHI should keep the portal on a
single flat pricing tier (free for architects, monetise through the broader
ZAAHI subscription if at all).

### 12.6 Sketchfab — closest consumer-web analogue

[Sketchfab.com](https://sketchfab.com) is the reference for "upload a 3D
model and it renders in a browser for the public". Free tier 50 MB upload,
Pro at $15/month with 200 MB
([Sketchfab plans](https://sketchfab.com/plans),
[Sketchfab upload limits](https://help.sketchfab.com/hc/en-us/articles/360031770411-Upload-Limits)).
Upload flow is drag-and-drop, server processes to a streamable format,
the public viewer is three.js-based with orbit controls, fullscreen, VR mode.

**What to steal — a lot.**

- The stepped upload wizard (file pick → name → tags → upload progress →
  ready). §7.4 mirrors this.
- The inline orbit viewer with consistent lighting → we do the same with
  the lighting-match from §6.8.
- The "this model is being viewed N times" engagement metric on the author
  dashboard. Add `ArchitectModel.viewCount` per §5.2.
- Public shareability via per-model URL — our `/parcels/:id` already is that
  URL, but consider `/m/:modelId` short URL too.

**What to avoid.** Sketchfab is a social platform — likes, comments, follow
graph. ZAAHI's architect portal is not social. Don't add social features
until V2+ (and only if founder-approved).

### 12.7 3D Tiles 1.1 / Cesium Ion

[Cesium Ion](https://cesium.com/platform/cesium-ion/) is the reference
implementation of streamed-tile 3D models at scale. **3D Tiles 1.1** (née
3D Tiles Next) is the open standard for tiling heterogeneous geospatial 3D
data with geometric-error-driven LOD
([3D Tiles GitHub](https://github.com/CesiumGS/3d-tiles),
[Cesium 3D Tiling docs](https://cesium.com/learn/3d-tiling/)). A single
3D Tiles dataset streams billboard → extruded footprint → model → textured
model progressively as the camera zooms.

**What to steal — in V2+.** When ZAAHI has 100k+ published models across
a map, single-GLB-per-parcel won't scale. The answer is: tile all published
models of a district into a single 3D Tiles tileset, streamed via Cesium
or a MapLibre 3D-Tiles plugin. Cesium Ion offers the 3D Tiling Pipeline as
a hosted service that ingests glTF / OBJ / FBX and produces tiles; self-host
is also possible via Cesium's tilers. **The ZAAHI LOD-on-GLB approach
from §6.6 is a Sprint 3 stopgap; 3D Tiles is the V2+ scale answer.**

**What to avoid in MVP.** Introducing 3D Tiles infrastructure now adds a
heavy streaming layer for a problem we won't have until year 2+. Defer.

### 12.8 Summary — closest analogue per ZAAHI feature

| ZAAHI feature | Closest external analogue | What we borrow |
|---|---|---|
| GLB upload + public viewer | **Sketchfab** | Stepped wizard, orbit viewer, view counters |
| Per-plot model lifecycle | **Procore** document-as-model metaphor | Publish-from-documents UX; format-agnostic backend |
| Version history + rollback | **Revit Cloud Worksharing** / Autodesk Build | Append-only sync log; central-model abstraction |
| Multi-architect on one parcel (Sprint 2) | **ArchiCAD BIMcloud** | Future: delta-sync (V2+); now: separate-row submissions |
| LOD streaming (Sprint 3 / V2) | **Cesium Ion 3D Tiles 1.1** | Geometric-error LOD; `gltfpack` tile equivalents |
| Approval / takedown workflow | **Sketchfab** admin + any content platform | Admin queue UI, DMCA counter-notice |
| High-fidelity scan capture (V2+) | **Matterport** | Hero thumbnail; measurement overlay |
| Unified audit across roles | **Autodesk Construction Cloud (Forma)** | `ActivityLog` per transition |

---

**End of document.**


---
