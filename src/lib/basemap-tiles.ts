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
// Esri's Canvas services are keyless and need no account. Verified against the
// live service metadata on 2026-09-03: all three go to LOD 23, past this map's
// maxZoom of 18, so no maxzoom clamp is needed, and tileSize is 256.
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
