/**
 * Read-only audit script for the 2026-04-28 bugs batch.
 *
 * Pulls everything needed for Bugs 1, 2, 3, 6 in one DB round-trip:
 *   • all parcels in Majan / Liwan / Wadi Al Safa area (Bug 3)
 *   • Plot 3260899 with current affection plan (Bug 2)
 *   • The 4 problematic placement plots: 6241067, 1010469, 6117231, 6817016 (Bug 6 Phase 1)
 *   • All 114 listings: plotNumber, district, status, geometry-summary, latest affection plan (Bug 1, Bug 6 Phase 2)
 *
 * Output: docs/audits/bugs-batch-2026-04-28.audit.json (gitignored optional, but committed for traceability).
 *
 * Run: npx tsx -r dotenv/config scripts/audit-bugs-batch-2026-04-28.ts dotenv_config_path=.env.local
 */
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { prisma } from '../src/lib/prisma';

interface RingPoint {
  lng: number;
  lat: number;
}

function ringSummary(geometry: unknown): {
  vertices: number;
  centroid: { lng: number; lat: number } | null;
  bbox: [number, number, number, number] | null;
  type: string | null;
} {
  if (!geometry || typeof geometry !== 'object') {
    return { vertices: 0, centroid: null, bbox: null, type: null };
  }
  const g = geometry as { type?: string; coordinates?: unknown };
  if (!g.type) return { vertices: 0, centroid: null, bbox: null, type: null };
  let ring: number[][] | null = null;
  if (g.type === 'Polygon' && Array.isArray(g.coordinates)) {
    ring = (g.coordinates as number[][][])[0] ?? null;
  } else if (g.type === 'MultiPolygon' && Array.isArray(g.coordinates)) {
    ring = (g.coordinates as number[][][][])[0]?.[0] ?? null;
  }
  if (!ring || ring.length === 0) {
    return { vertices: 0, centroid: null, bbox: null, type: g.type };
  }
  const points: RingPoint[] = ring
    .filter((p) => Array.isArray(p) && p.length >= 2 && Number.isFinite(p[0]) && Number.isFinite(p[1]))
    .map((p) => ({ lng: p[0], lat: p[1] }));
  if (points.length === 0) {
    return { vertices: 0, centroid: null, bbox: null, type: g.type };
  }
  const cLng = points.reduce((s, p) => s + p.lng, 0) / points.length;
  const cLat = points.reduce((s, p) => s + p.lat, 0) / points.length;
  const minLng = Math.min(...points.map((p) => p.lng));
  const maxLng = Math.max(...points.map((p) => p.lng));
  const minLat = Math.min(...points.map((p) => p.lat));
  const maxLat = Math.max(...points.map((p) => p.lat));
  return {
    vertices: points.length,
    centroid: { lng: cLng, lat: cLat },
    bbox: [minLng, minLat, maxLng, maxLat],
    type: g.type,
  };
}

async function main() {
  // 1. Bug 3 — Majan / Liwan / Wadi Al Safa area
  const majanArea = await prisma.parcel.findMany({
    where: {
      OR: [
        { district: { contains: 'majan', mode: 'insensitive' } },
        { district: { contains: 'liwan', mode: 'insensitive' } },
        { district: { contains: 'wadi al safa', mode: 'insensitive' } },
        { district: { contains: 'wadi alsafa', mode: 'insensitive' } },
      ],
    },
    select: {
      id: true,
      plotNumber: true,
      district: true,
      emirate: true,
      status: true,
      currentValuation: true,
      area: true,
      latitude: true,
      longitude: true,
      geometry: true,
      createdAt: true,
      updatedAt: true,
      affectionPlans: {
        orderBy: { fetchedAt: 'desc' },
        take: 1,
        select: {
          maxFloors: true,
          maxHeightMeters: true,
          maxHeightCode: true,
          plotAreaSqft: true,
          plotAreaSqm: true,
          maxGfaSqft: true,
          maxGfaSqm: true,
          far: true,
          landUseMix: true,
          buildingLimitGeometry: true,
          buildingStyle: true,
          fetchedAt: true,
        },
      },
    },
  });

  // 2. Bug 2 — Plot 3260899 Jaddaf Waterfront
  const plot3260899 = await prisma.parcel.findFirst({
    where: { plotNumber: '3260899' },
    include: { affectionPlans: { orderBy: { fetchedAt: 'desc' } } },
  });

  // 3. Bug 6 Phase 1 — 4 problematic plots
  const placementFour = await prisma.parcel.findMany({
    where: { plotNumber: { in: ['6241067', '1010469', '6117231', '6817016'] } },
    include: { affectionPlans: { orderBy: { fetchedAt: 'desc' }, take: 1 } },
  });

  // 4. Bug 1 + Bug 6 Phase 2 — all listings
  const allParcels = await prisma.parcel.findMany({
    select: {
      id: true,
      plotNumber: true,
      district: true,
      emirate: true,
      status: true,
      currentValuation: true,
      area: true,
      latitude: true,
      longitude: true,
      geometry: true,
      createdAt: true,
      affectionPlans: {
        orderBy: { fetchedAt: 'desc' },
        take: 1,
        select: {
          maxFloors: true,
          maxHeightMeters: true,
          maxHeightCode: true,
          plotAreaSqft: true,
          plotAreaSqm: true,
          far: true,
          buildingLimitGeometry: true,
          buildingStyle: true,
        },
      },
    },
    orderBy: [{ emirate: 'asc' }, { district: 'asc' }, { plotNumber: 'asc' }],
  });

  // Geometry summaries for the placement-bug 4 (centroid vs latitude/longitude)
  const placementSummaries = placementFour.map((p) => {
    const geo = ringSummary(p.geometry);
    const ap = p.affectionPlans[0];
    const buildingLimit = ap?.buildingLimitGeometry
      ? ringSummary(ap.buildingLimitGeometry)
      : null;
    const dbCentroidDelta =
      geo.centroid && p.latitude && p.longitude
        ? {
            dLng: geo.centroid.lng - p.longitude,
            dLat: geo.centroid.lat - p.latitude,
            // Rough metres at lat ~25° (Dubai): 1° lat ≈ 110.6 km, 1° lng ≈ 100.6 km
            metresLng: (geo.centroid.lng - p.longitude) * 100_600,
            metresLat: (geo.centroid.lat - p.latitude) * 110_600,
          }
        : null;
    return {
      plotNumber: p.plotNumber,
      district: p.district,
      status: p.status,
      stored_lat: p.latitude,
      stored_lng: p.longitude,
      geometry_centroid: geo.centroid,
      geometry_vertices: geo.vertices,
      geometry_bbox: geo.bbox,
      geometry_type: geo.type,
      geometry_vs_stored_centroid_offset: dbCentroidDelta,
      building_limit_centroid: buildingLimit?.centroid ?? null,
      building_limit_vertices: buildingLimit?.vertices ?? null,
      affection: ap
        ? {
            maxFloors: ap.maxFloors,
            maxHeightMeters: ap.maxHeightMeters,
            maxHeightCode: ap.maxHeightCode,
            plotAreaSqft: ap.plotAreaSqft,
            far: ap.far,
            buildingStyle: ap.buildingStyle,
          }
        : null,
    };
  });

  // All-parcels height-vs-floors mismatch detection (Bug 1)
  const FLOOR_H = 3.5;
  const heightAudit = allParcels.map((p) => {
    const ap = p.affectionPlans[0];
    if (!ap) {
      return {
        plotNumber: p.plotNumber,
        district: p.district,
        status: p.status,
        emirate: p.emirate,
        flag: 'NO_AFFECTION_PLAN',
      };
    }
    const floors = ap.maxFloors ?? null;
    const heightM = ap.maxHeightMeters ?? null;
    const expectedFromFloors = floors ? floors * FLOOR_H : null;
    let flag: string | null = null;
    if (floors && heightM) {
      const delta = Math.abs(expectedFromFloors! - heightM);
      const tolerance = Math.max(7, expectedFromFloors! * 0.15); // 15% or 7m, whichever larger
      if (delta > tolerance) flag = 'HEIGHT_VS_FLOORS_MISMATCH';
    } else if (!floors && !heightM) {
      flag = 'NO_HEIGHT_NO_FLOORS';
    } else if (!floors) {
      flag = 'NO_FLOORS_ONLY_HEIGHT';
    } else if (!heightM) {
      flag = 'NO_HEIGHT_ONLY_FLOORS';
    }
    return {
      plotNumber: p.plotNumber,
      district: p.district,
      status: p.status,
      emirate: p.emirate,
      maxFloors: floors,
      maxHeightMeters: heightM,
      maxHeightCode: ap.maxHeightCode,
      expectedFromFloors: expectedFromFloors ? Math.round(expectedFromFloors) : null,
      flag,
    };
  });

  // Geometry placement audit (Bug 6 Phase 2): compare stored lat/lng vs geometry centroid
  const placementAudit = allParcels
    .map((p) => {
      const geo = ringSummary(p.geometry);
      if (!geo.centroid || p.latitude === null || p.longitude === null) {
        return {
          plotNumber: p.plotNumber,
          district: p.district,
          flag: 'NO_GEOMETRY_OR_LATLNG',
          delta_m: null,
        };
      }
      const metresLng = (geo.centroid.lng - p.longitude) * 100_600;
      const metresLat = (geo.centroid.lat - p.latitude) * 110_600;
      const delta_m = Math.sqrt(metresLng ** 2 + metresLat ** 2);
      return {
        plotNumber: p.plotNumber,
        district: p.district,
        emirate: p.emirate,
        delta_m: Math.round(delta_m),
        vertices: geo.vertices,
        flag: delta_m > 50 ? 'GEOMETRY_CENTROID_OFFSET' : null,
      };
    })
    .filter((row) => row.flag !== null);

  // Categorise area / status / source totals
  const totals = {
    parcelsTotal: allParcels.length,
    byEmirate: allParcels.reduce<Record<string, number>>((acc, p) => {
      acc[p.emirate] = (acc[p.emirate] ?? 0) + 1;
      return acc;
    }, {}),
    byStatus: allParcels.reduce<Record<string, number>>((acc, p) => {
      acc[p.status] = (acc[p.status] ?? 0) + 1;
      return acc;
    }, {}),
    withoutAffection: allParcels.filter((p) => !p.affectionPlans[0]).length,
    withoutGeometry: allParcels.filter((p) => !p.geometry).length,
  };

  const heightFlags = heightAudit.filter((h) => h.flag !== null);

  const out = {
    generatedAt: new Date().toISOString(),
    totals,
    bug3_majan_area: majanArea.map((p) => ({
      id: p.id,
      plotNumber: p.plotNumber,
      district: p.district,
      emirate: p.emirate,
      status: p.status,
      currentValuationAED: p.currentValuation
        ? Number(p.currentValuation) / 100
        : null,
      areaSqft: p.area,
      latitude: p.latitude,
      longitude: p.longitude,
      hasGeometry: Boolean(p.geometry),
      createdAt: p.createdAt,
      affection: p.affectionPlans[0] ?? null,
    })),
    bug2_plot3260899: plot3260899
      ? {
          id: plot3260899.id,
          plotNumber: plot3260899.plotNumber,
          district: plot3260899.district,
          emirate: plot3260899.emirate,
          status: plot3260899.status,
          area: plot3260899.area,
          latitude: plot3260899.latitude,
          longitude: plot3260899.longitude,
          hasGeometry: Boolean(plot3260899.geometry),
          affectionPlans: plot3260899.affectionPlans.map((ap) => ({
            id: ap.id,
            createdAt: ap.createdAt,
            source: ap.source,
            plotNumber: ap.plotNumber,
            oldNumber: ap.oldNumber,
            projectName: ap.projectName,
            community: ap.community,
            masterDeveloper: ap.masterDeveloper,
            plotAreaSqm: ap.plotAreaSqm,
            plotAreaSqft: ap.plotAreaSqft,
            maxGfaSqm: ap.maxGfaSqm,
            maxGfaSqft: ap.maxGfaSqft,
            maxHeightCode: ap.maxHeightCode,
            maxFloors: ap.maxFloors,
            maxHeightMeters: ap.maxHeightMeters,
            far: ap.far,
            setbacks: ap.setbacks,
            landUseMix: ap.landUseMix,
            sitePlanIssue: ap.sitePlanIssue,
            sitePlanExpiry: ap.sitePlanExpiry,
            notes: ap.notes,
          })),
        }
      : null,
    bug6_phase1_placementSummaries: placementSummaries,
    bug1_heightAudit_flagged: heightFlags,
    bug6_phase2_placementAudit_flagged: placementAudit,
  };

  const outPath = join(process.cwd(), 'docs/audits/bugs-batch-2026-04-28.audit.json');
  writeFileSync(outPath, JSON.stringify(out, null, 2));

  console.log(`✓ Wrote ${outPath}`);
  console.log(`  Totals: ${JSON.stringify(totals)}`);
  console.log(`  Bug 3 (Majan area): ${majanArea.length} parcels`);
  console.log(`  Bug 2 (Plot 3260899): ${plot3260899 ? 'found' : 'NOT FOUND'}`);
  console.log(`  Bug 6 Phase 1 (4 plots): ${placementFour.length}/4 found`);
  console.log(`  Bug 1 height flags: ${heightFlags.length}`);
  console.log(`  Bug 6 Phase 2 placement flags (>50m offset): ${placementAudit.length}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
