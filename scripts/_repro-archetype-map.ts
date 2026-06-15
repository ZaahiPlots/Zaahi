// Standalone de-risk: mount the REAL archetype CustomLayer on a live MapLibre
// instance (background-only style, no auth/DB) and frame one category. Proves
// the production layer renders + orients correctly on a map before deploy.
import maplibregl from "maplibre-gl";
import { installArchetypeLayer, type ArchetypeBuildingInput } from "../src/lib/archetypes/archetype-layer";

// Live ZAAHI_LANDUSE_COLOR values (page.tsx) so repro shots match the app.
const COLORS: Record<string, string> = {
  RESIDENTIAL: "#2D6A4F", COMMERCIAL: "#1B3A5C", MIXED_USE: "#6B4C9A",
  HOTEL: "#7B1E2B", INDUSTRIAL: "#495057", EDUCATIONAL: "#0077B6",
  HEALTHCARE: "#E63946", AGRICULTURAL: "#606C38", FUTURE_DEVELOPMENT: "#A8926E",
  INVESTMENT: "#14B8A6",
};

const cat = new URLSearchParams(location.search).get("cat") || "HOTEL";

const map = new maplibregl.Map({
  container: "map",
  // Satellite raster basemap so the archetype is reviewed ON THE MAP (real
  // context), not on a blank background (founder 2026-06-14).
  style: { version: 8,
    sources: {
      sat: {
        type: "raster", tileSize: 256,
        tiles: ["https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"],
        attribution: "Esri",
      },
    },
    layers: [
      { id: "bg", type: "background", paint: { "background-color": "#0A1628" } },
      { id: "sat", type: "raster", source: "sat" },
    ],
  },
  center: [55.27, 25.2], zoom: 17, pitch: 55, bearing: 20,
  canvasContextAttributes: { antialias: true } as never,
});

const plotParam = new URLSearchParams(location.search).get("plot");

map.on("load", async () => {
  let ring: number[][]; let plotRing: number[][] | undefined; let totalH: number; let label: string;
  let verifyCat = "RESIDENTIAL";
  if (plotParam) {
    // Verify a specific real plot (plot ring + app footprint) — proves the
    // plot-boundary clamp keeps the massing inside even on concave plots.
    const vp = (await (await fetch("/docs/research/archetype-shots-v2/verify-plots.json")).json())[plotParam];
    if (!vp) { document.getElementById("status")!.textContent = "no verify plot " + plotParam; return; }
    ring = vp.footRing; plotRing = vp.plotRing; totalH = vp.totalH;
    verifyCat = vp.cat || "RESIDENTIAL"; label = `${verifyCat} · plot ${plotParam}`;
  } else {
    const foots = await (await fetch("/docs/research/archetype-shots/footprints.json")).json();
    const f = foots[cat];
    if (!f) { document.getElementById("status")!.textContent = "no footprint for " + cat; return; }
    ring = f.geometry.coordinates[0]; totalH = (f.maxHeightMeters && f.maxHeightMeters > 0) ? f.maxHeightMeters : Math.max(1, f.floors) * 3.5;
    label = `${cat} · plot ${f.plot} · ${Math.round(totalH)}m`;
  }
  const clng = ring.reduce((s, p) => s + p[0], 0) / ring.length;
  const clat = ring.reduce((s, p) => s + p[1], 0) / ring.length;
  const useCat = plotParam ? verifyCat : cat;
  const inputs: ArchetypeBuildingInput[] = [{
    parcelId: plotParam || (cat), footprint: ring, plot: plotRing, landUse: useCat,
    colorHex: COLORS[useCat] || "#C8A96E", totalH, isVault: false, status: "LISTED",
  }];
  // Plot polygon = RED outline (hard boundary the founder checks); footprint =
  // gold. The massing must stay inside the RED plot line.
  if (plotRing) {
    map.addSource("plot", { type: "geojson", data: { type: "Feature", properties: {}, geometry: { type: "Polygon", coordinates: [plotRing] } } });
    map.addLayer({ id: "plot-line", type: "line", source: "plot", paint: { "line-color": "#E63946", "line-width": 3 } });
  }
  map.addSource("footprint", { type: "geojson", data: {
    type: "Feature", properties: {}, geometry: { type: "Polygon", coordinates: [ring] },
  } });
  map.addLayer({ id: "footprint-line", type: "line", source: "footprint",
    paint: { "line-color": "#C8A96E", "line-width": 2 } });
  document.getElementById("status")!.textContent = label;
  const ctrl = installArchetypeLayer(map);
  ctrl.setBuildings(inputs);
  ctrl.setEnabled(true);
  // Frame to fit: pull back for tall towers so the whole massing shows.
  const params2 = new URLSearchParams(location.search);
  const z = totalH > 120 ? 15.6 : totalH > 50 ? 16.4 : 17.2;
  const zoom = Number(params2.get("zoom") ?? z);
  const pitch = Number(params2.get("pitch") ?? 52);
  map.jumpTo({ center: [clng, clat], zoom, pitch, bearing: 20 });
  setTimeout(() => { (document.getElementById("ready") as HTMLElement).textContent = "ready"; }, 1200);
});
