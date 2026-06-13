// Standalone de-risk: mount the REAL archetype CustomLayer on a live MapLibre
// instance (background-only style, no auth/DB) and frame one category. Proves
// the production layer renders + orients correctly on a map before deploy.
import maplibregl from "maplibre-gl";
import { installArchetypeLayer, type ArchetypeBuildingInput } from "../src/lib/archetypes/archetype-layer";

const COLORS: Record<string, string> = {
  RESIDENTIAL: "#FFD700", COMMERCIAL: "#4A90D9", MIXED_USE: "#9B59B6",
  HOTEL: "#E67E22", INDUSTRIAL: "#708090", EDUCATIONAL: "#1ABC9C",
  HEALTHCARE: "#E74C3C", AGRICULTURAL: "#6B8E23", FUTURE_DEVELOPMENT: "#84CC16",
  INVESTMENT: "#14B8A6",
};

const cat = new URLSearchParams(location.search).get("cat") || "HOTEL";

const map = new maplibregl.Map({
  container: "map",
  style: { version: 8, sources: {}, layers: [
    { id: "bg", type: "background", paint: { "background-color": "#0A1628" } },
  ] },
  center: [55.27, 25.2], zoom: 17, pitch: 55, bearing: 20,
  canvasContextAttributes: { antialias: true } as never,
});

map.on("load", async () => {
  const foots = await (await fetch("/docs/research/archetype-shots/footprints.json")).json();
  const f = foots[cat];
  if (!f) { document.getElementById("status")!.textContent = "no footprint for " + cat; return; }
  const ring = f.geometry.coordinates[0] as number[][];
  const clng = ring.reduce((s, p) => s + p[0], 0) / ring.length;
  const clat = ring.reduce((s, p) => s + p[1], 0) / ring.length;
  const totalH = (f.maxHeightMeters && f.maxHeightMeters > 0)
    ? f.maxHeightMeters : Math.max(1, f.floors) * 3.5;
  const inputs: ArchetypeBuildingInput[] = [{
    parcelId: f.plot, footprint: ring, landUse: cat,
    colorHex: COLORS[cat] || "#C8A96E", totalH, isVault: false, status: "LISTED",
  }];
  // Draw the footprint ring as a gold outline so the screenshot proves the
  // massing stays inside the plot polygon (founder within-bounds check).
  map.addSource("footprint", { type: "geojson", data: {
    type: "Feature", properties: {}, geometry: { type: "Polygon", coordinates: [ring] },
  } });
  map.addLayer({ id: "footprint-line", type: "line", source: "footprint",
    paint: { "line-color": "#C8A96E", "line-width": 2.5 } });
  const ctrl = installArchetypeLayer(map);
  ctrl.setBuildings(inputs);
  ctrl.setEnabled(true);
  // Frame to fit: pull back for tall towers so the whole massing shows.
  const params2 = new URLSearchParams(location.search);
  const z = totalH > 120 ? 15.6 : totalH > 50 ? 16.4 : 17.2;
  const zoom = Number(params2.get("zoom") ?? z);
  const pitch = Number(params2.get("pitch") ?? 52);
  map.jumpTo({ center: [clng, clat], zoom, pitch, bearing: 20 });
  document.getElementById("status")!.textContent = `${cat} · plot ${f.plot} · ${Math.round(totalH)}m`;
  setTimeout(() => { (document.getElementById("ready") as HTMLElement).textContent = "ready"; }, 1200);
});
