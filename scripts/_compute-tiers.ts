// Compute archetype + legacy tiers for each representative footprint using the
// REAL emitSignatureTiers from src/lib/zaahi-3d-tiers.ts (fidelity guaranteed).
// Projects lng/lat → local metres and writes docs/research/archetype-shots/tiers.json.
import { readFileSync, writeFileSync } from "node:fs";
import { emitSignatureTiers } from "../src/lib/zaahi-3d-tiers";

type Foot = {
  landUse: string; plot: string; district?: string; project?: string;
  floors: number; maxHeightMeters: number | null; areaSqft: number | null;
  setbacks: unknown; buildingStyle: string | null;
  buildingLimitGeometry: GeoJSON.Polygon | null; geometry: GeoJSON.Polygon;
};

const foots: Record<string, Foot> = JSON.parse(
  readFileSync("docs/research/archetype-shots/footprints.json", "utf8"),
);

// Synthesize square plots for archetypes with no curated example.
function squarePlot(centreLng: number, centreLat: number, sideM: number): GeoJSON.Polygon {
  const dLat = sideM / 2 / 111320;
  const dLng = sideM / 2 / (111320 * Math.cos((centreLat * Math.PI) / 180));
  return {
    type: "Polygon",
    coordinates: [[
      [centreLng - dLng, centreLat - dLat], [centreLng + dLng, centreLat - dLat],
      [centreLng + dLng, centreLat + dLat], [centreLng - dLng, centreLat + dLat],
      [centreLng - dLng, centreLat - dLat],
    ]],
  };
}
foots.AGRICULTURAL ??= {
  landUse: "AGRICULTURAL", plot: "(synthetic farm)", floors: 2, maxHeightMeters: 6,
  areaSqft: 520000, setbacks: null, buildingStyle: null,
  buildingLimitGeometry: null, geometry: squarePlot(55.32, 25.09, 220),
};
// FUTURE_DEVELOPMENT has no 3D massing by rule (flat fill only). The tallest
// real future-dev plot (6464982) is a 95-pt ring that breaks extrusion, so use
// a clean representative square to demonstrate the flat-land read.
foots.FUTURE_DEVELOPMENT = {
  landUse: "FUTURE_DEVELOPMENT", plot: "(representative — flat land)", floors: 0,
  maxHeightMeters: 2, areaSqft: 200000, setbacks: null, buildingStyle: null,
  buildingLimitGeometry: null, geometry: squarePlot(55.32, 25.10, 140),
};
foots.INVESTMENT ??= {
  landUse: "INVESTMENT", plot: "(synthetic, AD off-plan)", floors: 28,
  maxHeightMeters: 98, areaSqft: 45000, setbacks: null, buildingStyle: null,
  buildingLimitGeometry: null, geometry: squarePlot(54.42, 24.49, 60),
};

const out: Record<string, unknown> = {};
for (const [cat, f] of Object.entries(foots)) {
  const ring = f.geometry.coordinates[0];
  const clng = ring.reduce((s, p) => s + p[0], 0) / ring.length;
  const clat = ring.reduce((s, p) => s + p[1], 0) / ring.length;
  const cosLat = Math.cos((clat * Math.PI) / 180);
  const toM = (r: number[][]) =>
    r.map(([lng, lat]) => [(lng - clng) * 111320 * cosLat, (lat - clat) * 111320]);

  const common = {
    plotPolygon: f.geometry,
    landUse: cat,
    areaSqft: f.areaSqft,
    buildingLimitGeometry: f.buildingLimitGeometry,
    setbacks: (f.setbacks as never) ?? null,
    maxHeightMeters: f.maxHeightMeters,
    maxFloors: f.floors || null,
    landUseSub: null,
    buildingStyle: f.buildingStyle,
  };
  const archetype = emitSignatureTiers({ ...common, archetype: true });
  const legacy = emitSignatureTiers({ ...common, archetype: false });

  out[cat] = {
    plot: f.plot, district: f.district ?? "", project: f.project ?? "",
    floors: f.floors, totalH: archetype.reduce((m, t) => Math.max(m, t.topMeters), 0),
    plotRingM: toM(ring),
    archetype: archetype.map((t) => ({ ring: toM(t.ring), base: t.baseMeters, top: t.topMeters })),
    legacy: legacy.map((t) => ({ ring: toM(t.ring), base: t.baseMeters, top: t.topMeters })),
  };
  console.log(`${cat.padEnd(20)} plot=${f.plot} archetypeTiers=${archetype.length} legacyTiers=${legacy.length} H=${Math.round(archetype.reduce((m,t)=>Math.max(m,t.topMeters),0))}m`);
}

writeFileSync("docs/research/archetype-shots/tiers.json", JSON.stringify(out, null, 1));
console.log("\nWrote docs/research/archetype-shots/tiers.json");
