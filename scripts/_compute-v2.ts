// Build v2 archetype massing for each representative real footprint and write
// docs/research/archetype-shots-v2/massing.json for the render harness.
import { readFileSync, writeFileSync } from "node:fs";
import {
  computeSetbackMeters, insetRingByMeters, resolveTotalHeightMeters,
} from "../src/lib/zaahi-3d-tiers";
import { buildArchetype, obbOf } from "./archetype-builders";

type Foot = {
  landUse: string; plot: string; district?: string; project?: string;
  floors: number; maxHeightMeters: number | null; areaSqft: number | null;
  setbacks: unknown; buildingStyle: string | null;
  buildingLimitGeometry: GeoJSON.Polygon | null; geometry: GeoJSON.Polygon;
};

const foots: Record<string, Foot> = JSON.parse(
  readFileSync("docs/research/archetype-shots/footprints.json", "utf8"),
);

function squarePlot(lng: number, lat: number, sideM: number): GeoJSON.Polygon {
  const dLat = sideM / 2 / 111320;
  const dLng = sideM / 2 / (111320 * Math.cos((lat * Math.PI) / 180));
  return { type: "Polygon", coordinates: [[
    [lng - dLng, lat - dLat], [lng + dLng, lat - dLat],
    [lng + dLng, lat + dLat], [lng - dLng, lat + dLat], [lng - dLng, lat - dLat],
  ]] };
}
// AGRICULTURAL has no curated parcel → synthetic farm so the barn reads in field.
foots.AGRICULTURAL ??= {
  landUse: "AGRICULTURAL", plot: "(synthetic farm)", floors: 2, maxHeightMeters: 6,
  areaSqft: 520000, setbacks: null, buildingStyle: null, buildingLimitGeometry: null,
  geometry: squarePlot(55.32, 25.09, 220),
};
// FUTURE_DEVELOPMENT: flat land, clean representative square.
foots.FUTURE_DEVELOPMENT = {
  landUse: "FUTURE_DEVELOPMENT", plot: "(representative — flat land)", floors: 0,
  maxHeightMeters: 2, areaSqft: 200000, setbacks: null, buildingStyle: null,
  buildingLimitGeometry: null, geometry: squarePlot(55.32, 25.10, 140),
};
delete (foots as Record<string, unknown>).INVESTMENT; // covered by COMMERCIAL morphology

const out: Record<string, unknown> = {};
for (const [cat, f] of Object.entries(foots)) {
  const plotRing = f.geometry.coordinates[0];
  const clng = plotRing.reduce((s, p) => s + p[0], 0) / plotRing.length;
  const clat = plotRing.reduce((s, p) => s + p[1], 0) / plotRing.length;
  const cosLat = Math.cos((clat * Math.PI) / 180);
  const toM = (r: number[][]) =>
    r.map(([lng, lat]) => [(lng - clng) * 111320 * cosLat, (lat - clat) * 111320]);

  // Real footprint: DDA building-limit if present, else plot inset by setback.
  let footRingDeg: number[][];
  if (f.buildingLimitGeometry?.type === "Polygon") {
    footRingDeg = f.buildingLimitGeometry.coordinates[0];
  } else {
    const sb = computeSetbackMeters(f.areaSqft, cat, (f.setbacks as never) ?? null, null);
    footRingDeg = insetRingByMeters(plotRing, sb);
  }
  const footM = toM(footRingDeg);
  const plotM = toM(plotRing);
  const H = resolveTotalHeightMeters({
    plotPolygon: f.geometry, landUse: cat, maxHeightMeters: f.maxHeightMeters,
    maxFloors: f.floors || null,
  });
  const obb = obbOf(footM);
  const built = buildArchetype(cat, footM, obb, H);

  out[cat] = {
    plot: f.plot, district: f.district ?? "", floors: f.floors, totalH: H,
    plotRingM: plotM, footprintRingM: footM, obb,
    solids: built.solids, floorLines: built.floorLines,
  };
  console.log(`${cat.padEnd(20)} plot=${f.plot} solids=${built.solids.length} H=${Math.round(H)}m obb=${Math.round(obb.hl*2)}x${Math.round(obb.hw*2)}m`);
}

writeFileSync("docs/research/archetype-shots-v2/massing.json", JSON.stringify(out));
console.log("\nWrote docs/research/archetype-shots-v2/massing.json");
