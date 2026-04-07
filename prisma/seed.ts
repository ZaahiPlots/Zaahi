/**
 * Seed: a sentinel system user + a handful of real-ish Dubai land plots
 * with coordinates so /parcels/map has something to render.
 *
 * Run: pnpm seed
 *
 * Idempotent — uses upsert on (emirate, district, plotNumber).
 */
import { config } from 'dotenv';
config({ path: '.env.local' });

import { PrismaClient, ParcelStatus, UserRole } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { computeValuation } from '../src/lib/valuation';

const adapter = new PrismaPg({ connectionString: process.env.DIRECT_URL! });
const prisma = new PrismaClient({ adapter });

const SYSTEM_USER_ID = '00000000-0000-0000-0000-000000000001';

interface SeedParcel {
  plotNumber: string;
  emirate: string;
  district: string;
  area: number;        // sqft
  latitude: number;
  longitude: number;
  status?: ParcelStatus;
}

const PARCELS: SeedParcel[] = [
  // Dubai
  { plotNumber: 'PJ-001', emirate: 'Dubai', district: 'Palm Jumeirah',     area: 12000, latitude: 25.1124, longitude: 55.1390 },
  { plotNumber: 'PJ-002', emirate: 'Dubai', district: 'Palm Jumeirah',     area:  9500, latitude: 25.1170, longitude: 55.1310 },
  { plotNumber: 'DT-001', emirate: 'Dubai', district: 'Downtown Dubai',    area:  8000, latitude: 25.1972, longitude: 55.2744 },
  { plotNumber: 'DT-002', emirate: 'Dubai', district: 'Downtown Dubai',    area:  6500, latitude: 25.1985, longitude: 55.2790 },
  { plotNumber: 'MR-001', emirate: 'Dubai', district: 'Dubai Marina',      area:  7800, latitude: 25.0805, longitude: 55.1403 },
  { plotNumber: 'MR-002', emirate: 'Dubai', district: 'Dubai Marina',      area:  5200, latitude: 25.0772, longitude: 55.1380 },
  { plotNumber: 'BB-001', emirate: 'Dubai', district: 'Business Bay',      area: 11000, latitude: 25.1857, longitude: 55.2750 },
  { plotNumber: 'JV-001', emirate: 'Dubai', district: 'Jumeirah Village Circle', area: 4500, latitude: 25.0590, longitude: 55.2080 },
  { plotNumber: 'DH-001', emirate: 'Dubai', district: 'Dubai Hills Estate', area: 15000, latitude: 25.1086, longitude: 55.2484 },
  { plotNumber: 'EH-001', emirate: 'Dubai', district: 'Emirates Hills',    area: 22000, latitude: 25.0700, longitude: 55.1740 },
  { plotNumber: 'AB-001', emirate: 'Dubai', district: 'Al Barsha',         area:  9000, latitude: 25.1107, longitude: 55.2068 },
  // Abu Dhabi
  { plotNumber: 'SI-001', emirate: 'Abu Dhabi', district: 'Saadiyat Island', area: 18000, latitude: 24.5392, longitude: 54.4385 },
  { plotNumber: 'YI-001', emirate: 'Abu Dhabi', district: 'Yas Island',     area: 14000, latitude: 24.4670, longitude: 54.6066 },
  { plotNumber: 'RI-001', emirate: 'Abu Dhabi', district: 'Al Reem Island', area:  9500, latitude: 24.4980, longitude: 54.4061 },
];

async function main() {
  console.log('seeding…');

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

  let created = 0;
  let updated = 0;
  for (const p of PARCELS) {
    const valuation = computeValuation({ areaSqft: p.area, emirate: p.emirate, district: p.district });
    const result = await prisma.parcel.upsert({
      where: {
        emirate_district_plotNumber: {
          emirate: p.emirate,
          district: p.district,
          plotNumber: p.plotNumber,
        },
      },
      create: {
        plotNumber: p.plotNumber,
        emirate: p.emirate,
        district: p.district,
        area: p.area,
        latitude: p.latitude,
        longitude: p.longitude,
        ownerId: SYSTEM_USER_ID,
        status: p.status ?? ParcelStatus.VACANT,
        currentValuation: valuation.valuationFils,
      },
      update: {
        currentValuation: valuation.valuationFils,
        latitude: p.latitude,
        longitude: p.longitude,
      },
    });
    if (result.createdAt.getTime() === result.updatedAt.getTime()) created++;
    else updated++;
  }

  console.log(`done: ${created} created, ${updated} updated, ${PARCELS.length} total`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
