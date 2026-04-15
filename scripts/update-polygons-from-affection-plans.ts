/**
 * Replace two plot polygons with shapes extracted from their affection plans.
 *
 *   1. Al Furjan plot 5912323 — rectangle from `Al Furjan Affection Plan.pdf`
 *      (labeled 53.00 × 34.92 m, area 1850.74 m² vs official 1850.64 m²).
 *   2. Bu Kadra  plot 6117209 — pentagon from `Affection Pan 611-7209 Bukadra.pdf`
 *      (5 corners W/N/NE/E/S). Raw extracted area 4062.56 m² → scaled around
 *      the polygon centroid to EXACTLY 3907.97 m² (the official plot area).
 *
 * Uses the same EPSG:3997 projection as `fix-polygon-sizes.ts`. Only the
 * `geometry` field is updated. Idempotent.
 *
 * Run: npx tsx -r dotenv/config scripts/update-polygons-from-affection-plans.ts dotenv_config_path=.env.local
 */
import proj4 from 'proj4';
import { Prisma } from '@prisma/client';
import { prisma } from '../src/lib/prisma';

proj4.defs(
  'EPSG:3997',
  '+proj=tmerc +lat_0=0 +lon_0=55.33333333333334 +k=1 +x_0=500000 +y_0=0 +ellps=WGS84 +units=m +no_defs',
);
const dubaiToWgs = proj4('EPSG:3997', 'EPSG:4326');

function dubaiToLngLat([e, n]: [number, number]): [number, number] {
  const [lng, lat] = dubaiToWgs.forward([e, n]);
  return [lng, lat];
}

function shoelaceArea(pts: Array<[number, number]>): number {
  let s = 0;
  for (let i = 0; i < pts.length; i++) {
    const [x1, y1] = pts[i];
    const [x2, y2] = pts[(i + 1) % pts.length];
    s += x1 * y2 - x2 * y1;
  }
  return Math.abs(s) / 2;
}

function polygonCentroid(pts: Array<[number, number]>): [number, number] {
  let a = 0, cx = 0, cy = 0;
  for (let i = 0; i < pts.length; i++) {
    const [x1, y1] = pts[i];
    const [x2, y2] = pts[(i + 1) % pts.length];
    const cross = x1 * y2 - x2 * y1;
    a += cross;
    cx += (x1 + x2) * cross;
    cy += (y1 + y2) * cross;
  }
  a /= 2;
  return [cx / (6 * a), cy / (6 * a)];
}

// ── Al Furjan 5912323: rectangle from affection plan (WGS84 directly). ─────
const AL_FURJAN_WGS84_RING: Array<[number, number]> = [
  [55.1387217, 25.0200506],
  [55.1392468, 25.0200513],
  [55.1392473, 25.0197360],
  [55.1387222, 25.0197353],
  [55.1387217, 25.0200506], // close
];

// ── Bu Kadra 6117209: pentagon in EPSG:3997, to be scaled to 3907.97 m². ──
const BU_KADRA_EPSG3997_OPEN: Array<[number, number]> = [
  [498780.69, 2786078.77], // W
  [498823.37, 2786099.79], // N
  [498841.13, 2786094.51], // NE
  [498868.75, 2786045.79], // E
  [498815.11, 2786018.78], // S
];
const BU_KADRA_TARGET_AREA = 3907.97;

function buildBuKadraRing(): Array<[number, number]> {
  const rawArea = shoelaceArea(BU_KADRA_EPSG3997_OPEN);
  const [cx, cy] = polygonCentroid(BU_KADRA_EPSG3997_OPEN);
  const k = Math.sqrt(BU_KADRA_TARGET_AREA / rawArea);
  console.log(
    `  Bu Kadra raw area ${rawArea.toFixed(2)} m², target ${BU_KADRA_TARGET_AREA} m²` +
      ` → scale k=${k.toFixed(6)} around centroid (${cx.toFixed(2)}, ${cy.toFixed(2)})`,
  );
  const scaled = BU_KADRA_EPSG3997_OPEN.map(([x, y]): [number, number] => [
    cx + (x - cx) * k,
    cy + (y - cy) * k,
  ]);
  const scaledArea = shoelaceArea(scaled);
  console.log(`  Bu Kadra scaled area ${scaledArea.toFixed(4)} m² (target ${BU_KADRA_TARGET_AREA})`);
  const wgs: Array<[number, number]> = scaled.map(dubaiToLngLat);
  wgs.push([wgs[0][0], wgs[0][1]]); // close
  return wgs;
}

function ringBBox(ring: Array<[number, number]>) {
  const lngs = ring.map((p) => p[0]);
  const lats = ring.map((p) => p[1]);
  return {
    minLng: Math.min(...lngs),
    maxLng: Math.max(...lngs),
    minLat: Math.min(...lats),
    maxLat: Math.max(...lats),
  };
}

async function writePolygon(
  emirate: string,
  district: string,
  plotNumber: string,
  label: string,
  ring: Array<[number, number]>,
) {
  console.log(`\n── plot ${plotNumber} — ${label} ──`);
  const existing = await prisma.parcel.findUnique({
    where: {
      emirate_district_plotNumber: { emirate, district, plotNumber },
    },
    select: { id: true, geometry: true, area: true, status: true, currentValuation: true },
  });
  if (!existing) {
    console.error(`  ERROR: parcel not found — skipping`);
    return;
  }

  const oldGeom = existing.geometry as { coordinates?: number[][][] } | null;
  if (oldGeom?.coordinates?.[0]) {
    const b = ringBBox(oldGeom.coordinates[0] as Array<[number, number]>);
    console.log(
      `  BEFORE bbox: lng[${b.minLng.toFixed(6)}..${b.maxLng.toFixed(6)}] ` +
        `lat[${b.minLat.toFixed(6)}..${b.maxLat.toFixed(6)}] (${oldGeom.coordinates[0].length} pts)`,
    );
  }

  const b = ringBBox(ring);
  console.log(
    `  AFTER  bbox: lng[${b.minLng.toFixed(6)}..${b.maxLng.toFixed(6)}] ` +
      `lat[${b.minLat.toFixed(6)}..${b.maxLat.toFixed(6)}] (${ring.length} pts)`,
  );

  const polygon = {
    type: 'Polygon',
    coordinates: [ring],
  };

  await prisma.parcel.update({
    where: { id: existing.id },
    data: {
      geometry: polygon as unknown as Prisma.InputJsonValue,
    },
  });
  console.log(`  UPDATED parcel ${existing.id} (geometry only)`);
  console.log(
    `  untouched: status=${existing.status}, area=${existing.area}, val=${existing.currentValuation?.toString()}`,
  );
}

async function main() {
  await writePolygon(
    'Dubai',
    'AL FURJAN',
    '5912323',
    'Al Furjan — AFMU048A (rectangle from affection plan)',
    AL_FURJAN_WGS84_RING,
  );

  const buKadraRing = buildBuKadraRing();
  await writePolygon(
    'Dubai',
    'BU KADRA',
    '6117209',
    'Bu Kadra RC2/36 (pentagon from affection plan, scaled to 3907.97 m²)',
    buKadraRing,
  );
  console.log('\nDone.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
