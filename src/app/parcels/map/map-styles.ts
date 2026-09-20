import { StyleSpecification } from "maplibre-gl";
import { ESRI_LIGHT_BASE, ESRI_LIGHT_LABELS, ESRI_DARK_BASE, ESRI_DARK_LABELS, ESRI_IMAGERY, ESRI_CANVAS_ATTRIBUTION, ESRI_CANVAS_MAXZOOM, ESRI_IMAGERY_MAXZOOM } from "@/lib/basemap-tiles";

export type Theme = "light" | "dark";
export type BaseMap = "light" | "dark" | "satellite";

export const STYLES: Record<BaseMap, StyleSpecification> = {
  satellite: {
    version: 8,
    sources: {
      esri: {
        type: "raster",
        tiles: [ESRI_IMAGERY],
        tileSize: 256,
        maxzoom: ESRI_IMAGERY_MAXZOOM,
        // NOTE: World_Imagery's own credit line is "Esri, Maxar, Earthstar
        // Geographics". Left as-is here deliberately — correcting it is a
        // separate item (health report C-4), not part of the Light move.
        attribution: "© Esri World Imagery",
      },
    },
    glyphs: "https://fonts.openmaptiles.org/{fontstack}/{range}.pbf",
    layers: [{ id: "esri", type: "raster", source: "esri" }],
  },
  // Light moved off CARTO 2026-09-03, for the reason Dark moved on 2026-08-28
  // and Light did not: CARTO now requires an API key for its raster basemaps
  // and stamps every keyless tile with "API KEY REQUIRED".
  //
  // On 28 Aug this could not be reproduced — direct fetches, fetches carrying a
  // zaahi.io Referer, and a real Chromium all came back clean — and it was read
  // as a CARTO quota tripping under real-user load. That reading was wrong. On
  // 2026-09-03 it reproduces every time, on light_all and dark_all alike, and a
  // request carrying a production Referer returns a byte-identical watermarked
  // tile (same md5) to one carrying none. CARTO's rollout simply completed
  // after the 28th. Light is the DEFAULT basemap, so every signed-in user was
  // looking at a competitor's nag screen. See docs/HEALTH_2026-08-28.md §1.1.
  //
  // Same shape as dark below: Base carries the geometry, Reference carries the
  // labels, because Esri splits what CARTO's light_all bundled.
  light: {
    version: 8,
    sources: {
      esriLight: {
        type: "raster",
        tiles: [ESRI_LIGHT_BASE],
        tileSize: 256,
        maxzoom: ESRI_CANVAS_MAXZOOM,
        attribution: ESRI_CANVAS_ATTRIBUTION,
      },
      esriLightLabels: {
        type: "raster",
        tiles: [ESRI_LIGHT_LABELS],
        tileSize: 256,
        maxzoom: ESRI_CANVAS_MAXZOOM,
      },
    },
    glyphs: "https://fonts.openmaptiles.org/{fontstack}/{range}.pbf",
    layers: [
      { id: "esriLight", type: "raster", source: "esriLight" },
      { id: "esriLightLabels", type: "raster", source: "esriLightLabels" },
    ],
  },
  // Dark moved off CARTO 2026-08-28, for the reason given above. Reported: the
  // dark basemap rendered CARTO tiles stamped "API KEY REQUIRED -
  // carto.com/basemaps/apikey" across the whole map.
  //
  // CORRECTION 2026-09-03: this comment used to record that the failure "could
  // not be reproduced from here" and blame a CARTO free-tier quota tripping
  // under real-user load. That was an honest reading of what the evidence showed
  // on the 28th and it was wrong — CARTO was mid-rollout of a blanket API-key
  // requirement. The wrong diagnosis had a cost: it framed the problem as
  // per-referrer quota rather than per-provider policy, so only the reported
  // basemap was moved and the default one was left behind for six days.
  //
  // Two sources, matching CARTO's dark_all: Base carries the geometry, Reference
  // carries the labels.
  //
  // CORRECTED 2026-09-04: this said "both go to level 23 ... no maxzoom clamp
  // is needed (verified against the service metadata)". The metadata describes
  // the tiling scheme, not coverage — real Canvas data over the UAE stops at
  // z16 and Esri answers deeper requests with a "Map data not yet available"
  // placeholder at HTTP 200. Both sources are now clamped; see
  // src/lib/basemap-tiles.ts.
  dark: {
    version: 8,
    sources: {
      esriDark: {
        type: "raster",
        tiles: [ESRI_DARK_BASE],
        tileSize: 256,
        maxzoom: ESRI_CANVAS_MAXZOOM,
        attribution: ESRI_CANVAS_ATTRIBUTION,
      },
      esriDarkLabels: {
        type: "raster",
        tiles: [ESRI_DARK_LABELS],
        tileSize: 256,
        maxzoom: ESRI_CANVAS_MAXZOOM,
      },
    },
    glyphs: "https://fonts.openmaptiles.org/{fontstack}/{range}.pbf",
    layers: [
      { id: "esriDark", type: "raster", source: "esriDark" },
      { id: "esriDarkLabels", type: "raster", source: "esriDarkLabels" },
    ],
  },
};

export const PALETTE: Record<Theme, {
  bg: string;
  text: string;
  textDim: string;
  border: string;
  borderSubtle: string;
  headerShadow: string;
}> = {
  light: {
    bg: "#FFFFFF",
    text: "#1A1A2E",
    textDim: "#8892a0",
    border: "#E5E5E5",
    borderSubtle: "#F0F0F0",
    headerShadow: "0 2px 12px rgba(0,0,0,0.08)",
  },
  dark: {
    bg: "#0A1628",
    text: "#E8E0D0",
    textDim: "#7a8a9c",
    border: "#1E3A5F",
    borderSubtle: "#152840",
    headerShadow: "0 2px 12px rgba(0,0,0,0.6)",
  },
};
