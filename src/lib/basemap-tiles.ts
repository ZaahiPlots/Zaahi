// ZAAHI — every third-party basemap tile URL the product uses, in one place.
//
// Why this file exists
// --------------------
// On 2026-08-28 the Dark basemap was moved off CARTO (73c0751) because CARTO
// had begun stamping keyless raster tiles with "API KEY REQUIRED —
// carto.com/basemaps/apikey". That fix was correct and incomplete: the tile
// URLs were duplicated across five places, and it changed one of them.
//
//   src/app/parcels/map/page.tsx      dark fixed, light left on CARTO
//   src/app/page.tsx                  login screen, still CARTO
//   src/app/parcels/[id]/MapPreview   still CARTO
//   src/app/parcels/map/MiniMap.tsx   still CARTO (dead component, BUG-029)
//   src/lib/basemaps.ts               still CARTO, imported by nothing
//
// Six days later the default basemap was still serving watermarked tiles in
// production to every signed-in user, and the stale copy in src/lib/basemaps.ts
// was the file a reader would naturally fix, to no effect. See
// docs/HEALTH_2026-08-28.md §1.1.
//
// The lesson is not "write the URL more carefully". It is "have one URL".
// Every live basemap surface now imports from here, so a provider change is a
// single edit, and tests/e2e/smoke.spec.ts check (h) asserts that no CARTO tile
// request leaves /parcels/map on either basemap.
//
// About the provider
// ------------------
// Esri's Canvas services are keyless and need no account.
//
// MAXZOOM — CORRECTED 2026-09-04 after a production regression.
//
// On 2026-09-03 I read `tileInfo.lods` from each service's metadata, saw
// maxLOD 23, and wrote "no maxzoom clamp is needed". That was wrong, and it
// broke the map: at z16.15 in 3D every Canvas tile came back as Esri's
// "Map data not yet available" placeholder.
//
// tileInfo.lods describes the TILING SCHEME — which levels the pyramid
// defines — not which levels actually contain data. Esri answers a request
// above its coverage with HTTP 200 and a placeholder image, so nothing about
// the response signals the problem except the pixels.
//
// The only way to know is to fetch tiles and look. Probed over Dubai and Abu
// Dhabi, six label-dense spots per level, on 2026-09-04:
//
//   Light Gray Base       real -> z16   placeholder from z17 (2,521 B, identical everywhere)
//   Light Gray Reference  real -> z16   placeholder from z17 (875 B, transparent variant)
//   Dark Gray Base        real -> z16   placeholder from z17
//   Dark Gray Reference   real -> z16   placeholder from z17
//   World Imagery         real -> z19   placeholder from z20
//
// Declaring maxzoom makes MapLibre stop requesting past coverage and overzoom
// the deepest real tile instead — blurrier at z17-18, which is the honest
// result, rather than a grey "not available" sheet.
//
// A single pair of tiles is NOT enough to detect this on the label layers: an
// empty label tile is legitimate, so two empty tiles look identical for
// perfectly good reasons. The six-spot probe is what separates "no labels
// here" from "no data at all" — my first pass got Reference wrong by one level
// for exactly that reason.

/** Deepest level with real Canvas data over the UAE. Verified by probe. */
export const ESRI_CANVAS_MAXZOOM = 16;
/** Deepest level with real World Imagery over the UAE. Verified by probe. */
export const ESRI_IMAGERY_MAXZOOM = 19;
//
// Esri splits what CARTO's *_all tiles bundled together: Base carries the
// geometry, Reference carries the labels. Both are needed to match the previous
// look — MiniMap's own comment called them "label-bearing Positron tiles".
//
// KNOWN RISK, not addressed here: server.arcgisonline.com is a *legacy* Esri
// endpoint in "mature status" — no longer updated, and Esri's guidance is that
// applications should have moved to the authenticated ArcGIS basemap services
// by 2022-04-30. No shutdown date is announced. We have swapped one keyless
// provider for another that has required a key on paper since 2022. Filed in
// docs/BACKLOG.md; do not treat this address as permanent.

const ESRI = "https://server.arcgisonline.com/ArcGIS/rest/services";

/** Light Gray Canvas — geometry. Replaces CARTO Positron `light_all`. */
export const ESRI_LIGHT_BASE = `${ESRI}/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}`;
/** Light Gray Canvas — labels. */
export const ESRI_LIGHT_LABELS = `${ESRI}/Canvas/World_Light_Gray_Reference/MapServer/tile/{z}/{y}/{x}`;
/** Dark Gray Canvas — geometry. Landed 2026-08-28 by 73c0751. */
export const ESRI_DARK_BASE = `${ESRI}/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}`;
/** Dark Gray Canvas — labels. */
export const ESRI_DARK_LABELS = `${ESRI}/Canvas/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}`;
/** World Imagery — the satellite basemap. Keyless, same ArcGIS family. */
export const ESRI_IMAGERY = `${ESRI}/World_Imagery/MapServer/tile/{z}/{y}/{x}`;

/**
 * Esri's own `copyrightText` for both Canvas services, read from the service
 * metadata rather than written from memory.
 */
export const ESRI_CANVAS_ATTRIBUTION =
  "© Esri, HERE, Garmin, © OpenStreetMap contributors";
