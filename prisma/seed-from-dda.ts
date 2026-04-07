/**
 * Seed real Dubai parcels with cadastral polygons from
 * gis.dda.gov.ae (DDA/BASIC_LAND_BASE/MapServer, layer 2 = Plot).
 *
 * 14 plots: 4 Barsha Heights + 4 Business Bay + 4 Dubai Hills + 2 Palmarosa.
 * Geometry stored as GeoJSON Polygon in WGS84 (EPSG:4326).
 *
 * Run: pnpm seed:dda
 *
 * Replaces all parcels owned by the seed system user. Idempotent.
 */
import { config } from 'dotenv';
config({ path: '.env.local' });

import { PrismaClient, ParcelStatus, UserRole, Prisma } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { computeValuation } from '../src/lib/valuation';

const adapter = new PrismaPg({ connectionString: process.env.DIRECT_URL! });
const prisma = new PrismaClient({ adapter });

const SYSTEM_USER_ID = '00000000-0000-0000-0000-000000000001';

const DDA_BASE =
  'https://gis.dda.gov.ae/server/rest/services/DDA/BASIC_LAND_BASE/MapServer/2/query';

interface Source {
  projectName: string; // exact PROJECT_NAME in DDA
  district: string;    // label we store in DB
  count: number;
}

const SOURCES: Source[] = [
  { projectName: 'BARSHA HEIGHTS',          district: 'Barsha Heights', count: 4 },
  { projectName: 'BUSINESS BAY PHASE 1 & 2', district: 'Business Bay',  count: 4 },
  { projectName: 'DUBAI HILLS',             district: 'Dubai Hills',    count: 4 },
  { projectName: 'PALMAROSA',               district: 'Palmarosa',      count: 2 },
];

interface DdaFeature {
  type: 'Feature';
  geometry: { type: 'Polygon' | 'MultiPolygon'; coordinates: number[][][] | number[][][][] };
  properties: {
    PLOT_NUMBER: string;
    PROJECT_NAME: string;
    AREA_SQFT: number | null;
    AREA_SQM: number | null;
  };
}

async function fetchPlots(s: Source): Promise<DdaFeature[]> {
  const where = encodeURIComponent(`PROJECT_NAME='${s.projectName}' AND AREA_SQFT > 1000`);
  const url =
    `${DDA_BASE}?where=${where}` +
    `&outFields=PLOT_NUMBER,PROJECT_NAME,AREA_SQFT,AREA_SQM` +
    `&returnGeometry=true&outSR=4326` +
    `&orderByFields=AREA_SQFT DESC` +
    `&resultRecordCount=${s.count}&f=geojson`;
  const r = await fetch(url);
  if (!r.ok) throw new Error(`DDA ${s.projectName}: HTTP ${r.status}`);
  const j = (await r.json()) as { features: DdaFeature[] };
  if (!j.features?.length) throw new Error(`DDA ${s.projectName}: no features`);
  return j.features;
}

/** Centroid of the first ring of a Polygon (good enough for marker fallback). */
function polygonCentroid(geom: DdaFeature['geometry']): { lat: number; lng: number } {
  const ring =
    geom.type === 'Polygon'
      ? (geom.coordinates as number[][][])[0]
      : (geom.coordinates as number[][][][])[0][0];
  let sx = 0;
  let sy = 0;
  for (const [x, y] of ring) {
    sx += x;
    sy += y;
  }
  return { lng: sx / ring.length, lat: sy / ring.length };
}

async function main() {
  console.log('Seeding parcels from DDA…');

  await prisma.user.upsert({
    where: { id: SYSTEM_USER_ID },
    create: {
      id: SYSTEM_USER_ID,
      email: 'seed@zaahi.local',
      role: UserRole.ADMIN,
      name: 'ZAAHI System',
    },
    update: {},
  });

  // Wipe previous seed parcels (and their dependent rows) so re-runs are clean.
  await prisma.document.deleteMany({ where: { parcel: { ownerId: SYSTEM_USER_ID } } });
  await prisma.deal.deleteMany({ where: { parcel: { ownerId: SYSTEM_USER_ID } } });
  await prisma.parcel.deleteMany({ where: { ownerId: SYSTEM_USER_ID } });

  let total = 0;
  for (const src of SOURCES) {
    const features = await fetchPlots(src);
    console.log(`  ${src.projectName}: ${features.length} plots`);
    for (const f of features) {
      const areaSqft = f.properties.AREA_SQFT ?? 0;
      if (areaSqft <= 0) continue;

      const { lat, lng } = polygonCentroid(f.geometry);
      const valuation = computeValuation({
        areaSqft,
        emirate: 'Dubai',
        district: src.district,
      });

      await prisma.parcel.create({
        data: {
          plotNumber: f.properties.PLOT_NUMBER,
          emirate: 'Dubai',
          district: src.district,
          area: areaSqft,
          latitude: lat,
          longitude: lng,
          geometry: f.geometry as unknown as Prisma.InputJsonValue,
          ownerId: SYSTEM_USER_ID,
          status: ParcelStatus.VACANT,
          currentValuation: valuation.valuationFils,
        },
      });
      total++;
    }
  }

  console.log(`done: ${total} parcels with real DDA polygons`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
