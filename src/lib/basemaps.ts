import type { StyleSpecification } from "maplibre-gl";

export type BasemapId = "dark" | "light" | "satellite" | "hybrid";

const ESRI_IMAGERY = "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}";
const ESRI_LABELS = "https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}";

function carto(variant: "dark_all" | "light_all"): string[] {
  return ["a", "b", "c", "d"].map((s) => `https://${s}.basemaps.cartocdn.com/${variant}/{z}/{x}/{y}.png`);
}

function rasterStyle(layers: { id: string; tiles: string[]; attribution: string }[]): StyleSpecification {
  return {
    version: 8,
    sources: Object.fromEntries(
      layers.map((l) => [
        l.id,
        { type: "raster", tiles: l.tiles, tileSize: 256, attribution: l.attribution },
      ]),
    ),
    layers: layers.map((l) => ({ id: l.id, type: "raster", source: l.id })),
  } as StyleSpecification;
}

export const BASEMAPS: Record<BasemapId, { label: string; style: StyleSpecification }> = {
  dark: {
    label: "Dark",
    style: rasterStyle([{ id: "carto-dark", tiles: carto("dark_all"), attribution: "© CARTO © OSM contributors" }]),
  },
  light: {
    label: "Light",
    style: rasterStyle([{ id: "carto-light", tiles: carto("light_all"), attribution: "© CARTO © OSM contributors" }]),
  },
  satellite: {
    label: "Satellite",
    style: rasterStyle([{ id: "esri-imagery", tiles: [ESRI_IMAGERY], attribution: "© Esri, Maxar, Earthstar Geographics" }]),
  },
  hybrid: {
    label: "Hybrid",
    style: rasterStyle([
      { id: "esri-imagery", tiles: [ESRI_IMAGERY], attribution: "© Esri, Maxar, Earthstar Geographics" },
      { id: "esri-labels", tiles: [ESRI_LABELS], attribution: "© Esri" },
    ]),
  },
};

export const BASEMAP_ORDER: BasemapId[] = ["dark", "light", "satellite", "hybrid"];
