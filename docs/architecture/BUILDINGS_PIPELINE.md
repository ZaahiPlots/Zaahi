# Buildings pipeline — digital twin layer

Status: v1.0 · 2026-04-24 · first building shipped (API Horizon Pointe)

## What this is

A second, independent data plane on `/parcels/map` for **real physical
towers** (completed · under construction · planned). Separate from the
`Parcel` pipeline (which models tradable land) — a `Building` row is
context: silhouette on the map, SEO surface, future-tenant prospecting,
digital-twin coverage.

Three independent layers, each toggleable:

| Layer | Source of truth | Rendering |
|---|---|---|
| LISTED PLOTS (existing) | `Parcel` + `AffectionPlan` | ZAAHI Signature / INDUSTRIAL / FUTURE_DEV / outline |
| **COMPLETED BUILDINGS** (new) | `Building` where `status = COMPLETED` | `modelPath` → glTF via CustomLayer + pin · else pin-only |
| **UNDER CONSTRUCTION** (new) | `Building` where `status = UNDER_CONSTRUCTION` | same rendering; pin colour amber |

## Data model

One Prisma model — `Building` — plus the `BuildingStatus` enum. See
`prisma/schema.prisma`. Append-only by convention.

Key fields and their purpose:

- `name`, `status`, `community`, `masterPlan`, `emirate` — identity
- `plotNumber` — **nullable**. Many buildings are not in DDA's plot
  catalogue (DDA only publishes parcels with active developments). Leave
  null; the future DDA-sync job will populate `linkedParcelId` when it
  finds a match
- `centroidLat` / `centroidLng` — **required**. Where the building lives
- `modelPath` — e.g. `models/candidate-sample.glb`. Served from `/public`.
  If null, the map shows a pin only
- `scaleFactor` — **0.01 for cm-sourced artist models** (OBJ from 3ds Max
  exporter is cm by default). `1.0` for m-native glTFs
- `rotationDeg` — yaw around vertical (glTF / artist convention: +X east,
  +Z south); adjust if the model's north doesn't line up with true north
- `workflowStatus` — `draft | pending_review | live | archived`. Only
  `live` rows are returned by the public `/api/buildings` endpoint, so
  drafts never leak onto the map

## Adding a new building (recipe)

For every new building — whether artist supplies a `.glb` or not — do the
research first, then seed the row, then (optionally) wire the model.

### 1. Research (15 min per building)

Cross-reference at least three sources:

1. **OpenStreetMap Nominatim** — the most reliable way to pin exact
   coordinates, assuming the building is mapped (most completed Dubai
   towers are). Query:
   ```
   https://nominatim.openstreetmap.org/search?q=BUILDING_NAME+DISTRICT+Dubai&format=json&limit=5
   ```
   Take the first `apartments` / `office` / `yes` result. The `lat`/`lon`
   is the footprint centroid.
2. **propsearch.ae** — the best-curated Dubai tower catalogue.
   URL pattern: `https://propsearch.ae/dubai/<building-slug>`.
   Good for: developer, storey count, status, primary photo.
3. **bayut.com** — cross-check floors and unit count.
   URL pattern: `https://www.bayut.com/buildings/<slug>-<community>/`.
4. **Developer portfolio** — if the developer has their own site, that's
   the highest-confidence source for units, amenities, description.

Record every source URL + what you pulled from it in the `sources` JSON
field so provenance is preserved.

For DDA plot verification:
```
https://gis.dda.gov.ae/server/rest/services/DDA/BASIC_LAND_BASE/MapServer/2/query?where=PLOT_NUMBER%3D'<plot>'&outFields=*&returnGeometry=true&outSR=4326&f=json
```
Returns the plot geometry + `MAIN_LANDUSE` + `PROJECT_NAME` when the plot
is in DDA. `"Failed to execute query."` (HTTP 400) usually means the
`LIKE` filter syntax needs simpler encoding — fall back to exact
`=` matches.

### 2. Seed script

Copy `scripts/seed-api-horizon-pointe.ts`, change:

- `NAME` constant
- All the fields inside `prisma.building.create({ data: … })`
- The `sources` array (update URLs + notes)

Then run:
```bash
pnpm dlx tsx scripts/seed-<name>.ts
```

Idempotency is built in — the script exits cleanly if a `Building` with
the same `name` already exists. **Never `delete` a Building row** — if a
row is wrong, mark `workflowStatus = "archived"` and seed a replacement.

### 3. 3D model (optional)

If the artist supplies a `.glb`:

1. Place the file under `public/models/<building-slug>.glb`. Keep the
   files small — 200–500 KB per building is the current budget. For
   anything much larger, compress with `gltfpack -c` (draco) before
   committing.
2. Set the row's `modelPath = "models/<building-slug>.glb"` (no leading
   slash — the client normalises it).
3. Set `scaleFactor`:
   - 0.01 for cm-native (3ds Max / OBJ exporter default · measured range
     in 100s−1000s with a plausible 50–150 m building dimension)
   - 1.0 for m-native (glTF / Blender default)
4. Set `rotationDeg` = 0 initially. If the rendered building faces the
   wrong way, rotate in 90° increments until the façade aligns with the
   real building's satellite view.

If no `.glb` yet: leave `modelPath = null`. The map still renders a pin
and the card still works — the 3D placeholder can land in a later commit.

### 4. Verify locally

```bash
pnpm dev
```

Open `http://localhost:3000/parcels/map`. Zoom to the building's
community. You should see:

- A gold pin (COMPLETED) or amber pin (UNDER_CONSTRUCTION) at the
  centroid
- If `modelPath` is set: the glTF rendered at real-world scale next to
  the pin
- Click the pin → the `BuildingCard` opens on the right
- The "Completed" / "Under constr." chips in the top-left toggle the
  layer on/off

### 5. Ship

Commit the seed script + any new `.glb` + the schema reference if you
added one. Cherry-pick the commits onto `main` (Vercel auto-deploys).

## Known limits / edge cases

- **glTF loader bottleneck** — each building with a `modelPath` creates
  its own Three.js `WebGLRenderer`. At ~100 buildings this will become
  expensive. Fix: extract a shared CustomLayer that holds all buildings
  in one scene with per-building root groups anchored via their own
  MercatorCoordinate offsets. Defer until we have the scaling pressure.
- **DDA filter syntax** — the REST endpoint rejects most `LIKE '%..%'`
  filters. Use exact `=` matches with escaped quotes for attribute
  lookups.
- **External photo CDNs** — the `BuildingCard` uses plain `<img>` tags
  because the CDNs (propsearch.ae · apidubai.ae · developer sites)
  aren't in `next.config.ts → images.domains`. Acceptable tradeoff for
  a read-only card; promote to `next/image` if we start doing lazy
  optimisation at scale.
- **Selection raycasting** — clicks hit the MapLibre pin feature, not
  the Three.js mesh directly. A user who clicks the tower's roof far
  from the pin won't select anything. Acceptable for V1; a transparent
  polygon footprint on top of the pin would fix this when needed.
- **Rotation** — `rotationDeg` rotates around the footprint centre. If
  an artist delivers a model with an off-centre bounding box, the rotation
  pivot will be wrong. Re-centre the model in Blender before export.

## Suggested next buildings (Bu Kadra / Meydan Horizon area)

Starter set to build out the digital twin in Bukadra before expanding
further:

1. **Azizi Riviera** (Meydan One) — large completed residential
   community; multiple towers, good candidate for multi-building seed
2. **The Residences at District One** (MBR City) — completed villas +
   towers; developer Meydan Sobha
3. **Meydan Heights** — adjacent community with completed townhouses;
   under-construction phase still active

Any of these can follow the recipe above. The seed script template +
OSM/propsearch lookup takes ~20 minutes per building.

## File map

- `prisma/migrations/20260424120000_add_building_table/` — the migration
- `scripts/seed-api-horizon-pointe.ts` — first seed, copy for the next
- `src/app/api/buildings/route.ts` — public-ish list endpoint
- `src/app/api/buildings/[id]/route.ts` — single-row detail
- `src/app/parcels/map/buildings/` — client module
  - `types.ts` — DTO shared between client + API
  - `BuildingGlbLayer.ts` — one MapLibre CustomLayer per building
  - `useBuildingsLayer.ts` — React hook: fetch + layer lifecycle + pin + click
  - `BuildingCard.tsx` — detail card (both COMPLETED and UNDER_CONSTRUCTION variants)
- `src/app/parcels/map/page.tsx` — integration (~30 lines added; no
  existing code removed or restructured)
