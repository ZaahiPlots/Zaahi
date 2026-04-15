/**
 * Shrink two plot polygons that currently cover the entire zone/block rect
 * instead of the actual plot footprint.
 *
 *   1. Al Furjan plot 5912323 — 1850.64 m² (currently ~70×90m zone rect)
 *   2. Bu Kadra   plot 6117209 — 3907.97 m² (currently ~110×100m zone rect)
 *
 * Re-uses the EXACT projection from `seed-new-listings.ts`: EPSG:3997
 * (WGS 84 / Dubai Local TM, central meridian 55°20'). This is what the
 * founder-supplied rectangles are actually in — NOT true UTM 40N. Projecting
 * via EPSG:32640 would land the plots ~150 km east in the Gulf of Oman and
 * contradict the already-seeded centroids.
 *
 * Only the `geometry` field is updated — no touching currentValuation,
 * status, buildingStyle, area, etc. Idempotent.
 *
 * Run: npx tsx -r dotenv/config scripts/fix-polygon-sizes.ts dotenv_config_path=.env.local
 */
import proj4 from 'proj4';
import { Prisma } from '@prisma/client';
import { prisma } from '../src/lib/prisma';

// Dubai Local TM — identical definition to seed-new-listings.ts.
proj4.defs(
  'EPSG:3997',
  '+proj=tmerc +lat_0=0 +lon_0=55.33333333333334 +k=1 +x_0=500000 +y_0=0 +ellps=WGS84 +units=m +no_defs',
);
const dubaiToWgs = proj4('EPSG:3997', 'EPSG:4326');

function dubaiToLngLat([e, n]: [number, number]): [number, number] {
  const [lng, lat] = dubaiToWgs.forward([e, n]);
  return [lng, lat];
}

interface FixSpec {
  plotNumber: string;
  emirate: string;
  district: string;
  label: string;
  expectedAreaSqm: number;
  // Shrunken rectangle in EPSG:3997 (Dubai Local TM) — TL, TR, BR, BL.
  corners: Array<[number, number]>;
  // Expected WGS84 centroid (sanity check — ±0.001°).
  expectedLng: number;
  expectedLat: number;
}

const FIXES: FixSpec[] = [
  {
    plotNumber: '5912323',
    emirate: 'Dubai',
    district: 'AL FURJAN',
    label: 'Al Furjan — AFMU048A',
    expectedAreaSqm: 1850.64,
    corners: [
      [480367.5, 2768301.5], // TL
      [480402.5, 2768301.5], // TR
      [480402.5, 2768248.5], // BR
      [480367.5, 2768248.5], // BL
    ],
    expectedLng: 55.139,
    expectedLat: 25.020,
  },
  {
    plotNumber: '6117209',
    emirate: 'Dubai',
    district: 'BU KADRA',
    label: 'Bu Kadra RC2/36',
    expectedAreaSqm: 3907.97,
    corners: [
      [498799.5, 2786098.5], // TL
      [498850.5, 2786098.5], // TR
      [498850.5, 2786021.5], // BR
      [498799.5, 2786021.5], // BL
    ],
    expectedLng: 55.322,
    expectedLat: 25.181,
  },
];

function ringStats(ring: number[][]) {
  const lngs = ring.map((p) => p[0]);
  const lats = ring.map((p) => p[1]);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const latMid = (minLat + maxLat) / 2;
  const widthM = (maxLng - minLng) * 111320 * Math.cos((latMid * Math.PI) / 180);
  const heightM = (maxLat - minLat) * 111320;
  // Drop closing duplicate for centroid
  const pts = ring.slice(0, -1);
  const cLng = pts.reduce((s, p) => s + p[0], 0) / pts.length;
  const cLat = pts.reduce((s, p) => s + p[1], 0) / pts.length;
  return { minLng, maxLng, minLat, maxLat, widthM, heightM, cLng, cLat };
}

function fmtStats(s: ReturnType<typeof ringStats>) {
  return (
    `  bbox lng: ${s.minLng.toFixed(6)} → ${s.maxLng.toFixed(6)}\n` +
    `  bbox lat: ${s.minLat.toFixed(6)} → ${s.maxLat.toFixed(6)}\n` +
    `  size: ${s.widthM.toFixed(1)}m × ${s.heightM.toFixed(1)}m\n` +
    `  centroid: ${s.cLng.toFixed(6)}, ${s.cLat.toFixed(6)}`
  );
}

async function fixPlot(spec: FixSpec) {
  console.log(`\n── plot ${spec.plotNumber} — ${spec.label} ──`);

  const existing = await prisma.parcel.findUnique({
    where: {
      emirate_district_plotNumber: {
        emirate: spec.emirate,
        district: spec.district,
        plotNumber: spec.plotNumber,
      },
    },
    select: { id: true, geometry: true, latitude: true, longitude: true, area: true, status: true, currentValuation: true },
  });
  if (!existing) {
    console.error(`  ERROR: parcel not found — skipping`);
    return;
  }

  // BEFORE
  const oldGeom = existing.geometry as { type: string; coordinates: number[][][] } | null;
  if (oldGeom?.coordinates?.[0]) {
    console.log('  BEFORE:');
    console.log(fmtStats(ringStats(oldGeom.coordinates[0])));
  } else {
    console.log('  BEFORE: (no geometry)');
  }

  // Project 4 corners + closing point.
  const projected: number[][] = spec.corners.map((c) => {
    const [lng, lat] = dubaiToLngLat(c);
    return [lng, lat];
  });
  // Close ring.
  projected.push([projected[0][0], projected[0][1]]);

  const statsNew = ringStats(projected);
  console.log('  AFTER:');
  console.log(fmtStats(statsNew));

  // Sanity check: centroid within 0.001° of expected.
  const dLng = Math.abs(statsNew.cLng - spec.expectedLng);
  const dLat = Math.abs(statsNew.cLat - spec.expectedLat);
  const tol = 0.001;
  if (dLng > tol || dLat > tol) {
    throw new Error(
      `Centroid ${statsNew.cLng.toFixed(6)},${statsNew.cLat.toFixed(6)} is >` +
        `${tol}° from expected ${spec.expectedLng},${spec.expectedLat} ` +
        `— refusing to write polygon for plot ${spec.plotNumber}`,
    );
  }

  // Build GeoJSON identical in structure to existing records (2D coords,
  // closed 5-point ring, {type:"Polygon", coordinates:[[[lng,lat],...]]}).
  const polygon = {
    type: 'Polygon',
    coordinates: [projected],
  } as const;

  await prisma.parcel.update({
    where: { id: existing.id },
    data: {
      // ONLY geometry. No other field.
      geometry: polygon as unknown as Prisma.InputJsonValue,
    },
  });
  console.log(`  UPDATED parcel ${existing.id} (geometry only)`);
  console.log(
    `  untouched: status=${existing.status}, area=${existing.area}, val=${existing.currentValuation?.toString()}`,
  );
}

async function verify(spec: FixSpec) {
  const p = await prisma.parcel.findUnique({
    where: {
      emirate_district_plotNumber: {
        emirate: spec.emirate,
        district: spec.district,
        plotNumber: spec.plotNumber,
      },
    },
    select: { geometry: true },
  });
  if (!p?.geometry) return;
  const g = p.geometry as { type: string; coordinates: number[][][] };
  const s = ringStats(g.coordinates[0]);
  console.log(`\n  verify ${spec.plotNumber}: size ${s.widthM.toFixed(1)}×${s.heightM.toFixed(1)}m, centroid ${s.cLng.toFixed(6)},${s.cLat.toFixed(6)}`);
}

async function main() {
  for (const spec of FIXES) {
    await fixPlot(spec);
  }
  console.log('\n── verification (re-read) ──');
  for (const spec of FIXES) {
    await verify(spec);
  }
  console.log('\nDone.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
