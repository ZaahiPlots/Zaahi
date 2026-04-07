/**
 * Seed Meydan Horizon plots from the DCR PDF.
 *
 * Source: ~/zaahi/data/meydan/Meydan_Horizon_DCR-1.pdf
 *   Page 24: Land Use Map (plot numbers as vector text over raster aerial)
 *   Page 35: Building Heights Distribution Map (height codes — same layout)
 *
 * Both maps share an identical coordinate system, so we match plot numbers
 * to height codes by Euclidean proximity in PDF page coordinates, then
 * georeference into a fixed bounding box around Meydan Horizon
 * (placeholder polygons — to be replaced with real cadastral data later).
 *
 * Run: pnpm seed:meydan
 */
import 'dotenv/config';
import { config } from 'dotenv';
config({ path: '.env.local' });

import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { PrismaClient, ParcelStatus, UserRole, Prisma } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { parseHeightCode } from '../src/lib/heights';
import { computeValuation } from '../src/lib/valuation';

const PDF = `${process.env.HOME}/zaahi/data/meydan/Meydan_Horizon_DCR-1.pdf`;
const SYSTEM_USER_ID = '00000000-0000-0000-0000-000000000001';

// User-confirmed approximate bbox for Meydan Horizon district
// (~89 ha, elongated WNW-ESE, centred ~25.175°N 55.300°E)
const GEO_BBOX = {
  minLng: 55.2926,
  maxLng: 55.3074,
  minLat: 25.1723,
  maxLat: 25.1777,
};

// First batch — user said "Начни с первых 10".
const BATCH_LIMIT = 10;

interface BBox { x1: number; y1: number; x2: number; y2: number; w: string }

function pdftotextBbox(pdfPath: string, page: number): BBox[] {
  const out = join(tmpdir(), `meydan_p${page}.html`);
  execFileSync('pdftotext', ['-bbox-layout', '-f', String(page), '-l', String(page), pdfPath, out], {
    stdio: 'pipe',
  });
  const html = readFileSync(out, 'utf8');
  const re = /<word xMin="([\d.]+)" yMin="([\d.]+)" xMax="([\d.]+)" yMax="([\d.]+)">([^<]+)<\/word>/g;
  const out2: BBox[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) {
    out2.push({ x1: +m[1], y1: +m[2], x2: +m[3], y2: +m[4], w: m[5] });
  }
  return out2;
}

interface PlotPos { plotNumber: string; cx: number; cy: number }
interface HeightToken { code: string; cx: number; cy: number }

function extractPlots(words: BBox[]): PlotPos[] {
  return words
    .filter((w) => /^6\d{6}$/.test(w.w))
    .map((w) => ({
      plotNumber: w.w,
      cx: (w.x1 + w.x2) / 2,
      cy: (w.y1 + w.y2) / 2,
    }));
}

function extractHeights(words: BBox[]): HeightToken[] {
  // First, gather any token that contains G or +N. Sort by y then x.
  const candidates = words
    .filter((w) => /G/.test(w.w) || /^\+\d/.test(w.w))
    .map((w) => ({
      ...w,
      cx: (w.x1 + w.x2) / 2,
      cy: (w.y1 + w.y2) / 2,
    }));

  // Merge tokens that are clearly two halves of one wrapped code:
  // same x (within 4pt), adjacent y (within 9pt), where the upper one
  // ends without a tower digit and the lower one starts with "+".
  const used = new Set<number>();
  const merged: HeightToken[] = [];
  for (let i = 0; i < candidates.length; i++) {
    if (used.has(i)) continue;
    const a = candidates[i];
    let code = a.w;
    let cx = a.cx;
    let cy = a.cy;
    for (let j = 0; j < candidates.length; j++) {
      if (i === j || used.has(j)) continue;
      const b = candidates[j];
      if (Math.abs(b.cx - a.cx) < 6 && b.cy > a.cy && b.cy - a.cy < 11 && /^\+\d+$/.test(b.w)) {
        code = a.w + b.w;
        cy = (a.cy + b.cy) / 2;
        used.add(j);
        break;
      }
    }
    used.add(i);
    // Keep only well-formed height codes.
    if (parseHeightCode(code)) merged.push({ code, cx, cy });
  }
  return merged;
}

function nearestHeight(plot: PlotPos, heights: HeightToken[]): HeightToken | null {
  let best: HeightToken | null = null;
  let bestD = Infinity;
  for (const h of heights) {
    const d = Math.hypot(h.cx - plot.cx, h.cy - plot.cy);
    if (d < bestD) {
      bestD = d;
      best = h;
    }
  }
  return best && bestD < 100 ? best : null;
}

function buildAffine(plots: PlotPos[]) {
  // Page-coord bbox of all plot labels — use as the page extent of the district.
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (const p of plots) {
    if (p.cx < minX) minX = p.cx;
    if (p.cx > maxX) maxX = p.cx;
    if (p.cy < minY) minY = p.cy;
    if (p.cy > maxY) maxY = p.cy;
  }
  // Add 5% margin so plots aren't glued to district edges
  const padX = (maxX - minX) * 0.05;
  const padY = (maxY - minY) * 0.05;
  minX -= padX; maxX += padX; minY -= padY; maxY += padY;

  return (x: number, y: number) => {
    const tx = (x - minX) / (maxX - minX);
    const ty = (y - minY) / (maxY - minY);
    const lng = GEO_BBOX.minLng + tx * (GEO_BBOX.maxLng - GEO_BBOX.minLng);
    // Y axis is inverted in PDF (top is y=0), but in this PDF y grows downward
    // and our north (maxLat) should be at the TOP of the page → flip ty.
    const lat = GEO_BBOX.maxLat - ty * (GEO_BBOX.maxLat - GEO_BBOX.minLat);
    return { lng, lat };
  };
}

function placeholderPolygon(lng: number, lat: number, halfMeters = 18): GeoJSON.Polygon {
  // Convert ±halfMeters to deg around (lat, lng)
  const dLat = halfMeters / 111320;
  const dLng = halfMeters / (111320 * Math.cos((lat * Math.PI) / 180));
  return {
    type: 'Polygon',
    coordinates: [[
      [lng - dLng, lat - dLat],
      [lng + dLng, lat - dLat],
      [lng + dLng, lat + dLat],
      [lng - dLng, lat + dLat],
      [lng - dLng, lat - dLat],
    ]],
  };
}

async function main() {
  console.log('Extracting plot numbers from page 24...');
  const w24 = pdftotextBbox(PDF, 24);
  const plots = extractPlots(w24);
  console.log(`  ${plots.length} plot tokens`);

  console.log('Extracting heights from page 35...');
  const w35 = pdftotextBbox(PDF, 35);
  const heights = extractHeights(w35);
  console.log(`  ${heights.length} height tokens (after merging wrapped lines)`);

  const project = (await import('../src/lib/projection')).polygonCentroid; // noop import to validate path
  void project;

  const adapter = new PrismaPg({ connectionString: process.env.DIRECT_URL! });
  const prisma = new PrismaClient({ adapter });

  // Wipe previous Meydan parcels (system-owned, district label "Meydan Horizon")
  await prisma.affectionPlan.deleteMany({
    where: { parcel: { ownerId: SYSTEM_USER_ID, district: 'Meydan Horizon' } },
  });
  await prisma.parcel.deleteMany({
    where: { ownerId: SYSTEM_USER_ID, district: 'Meydan Horizon' },
  });

  await prisma.user.upsert({
    where: { id: SYSTEM_USER_ID },
    create: { id: SYSTEM_USER_ID, email: 'seed@zaahi.local', role: UserRole.ADMIN, name: 'ZAAHI System' },
    update: {},
  });

  const project2geo = buildAffine(plots);

  // Take first BATCH_LIMIT plots in document order
  const batch = plots.slice(0, BATCH_LIMIT);
  let saved = 0;

  for (const p of batch) {
    const h = nearestHeight(p, heights);
    if (!h) {
      console.log(`  ${p.plotNumber}: no height match — skip`);
      continue;
    }
    const parsed = parseHeightCode(h.code);
    if (!parsed) {
      console.log(`  ${p.plotNumber}: bad code "${h.code}" — skip`);
      continue;
    }

    const { lng, lat } = project2geo(p.cx, p.cy);
    const geom = placeholderPolygon(lng, lat);
    // For now Building Limit == plot polygon (placeholder).
    const buildingLimit = geom;

    // Approximate area = (36 m)² = 1296 m² → 13 950 sqft.
    const areaSqft = 13_950;
    const valuation = computeValuation({
      areaSqft,
      emirate: 'Dubai',
      district: 'Meydan Horizon',
    });

    const parcel = await prisma.parcel.create({
      data: {
        plotNumber: p.plotNumber,
        emirate: 'Dubai',
        district: 'Meydan Horizon',
        area: areaSqft,
        latitude: lat,
        longitude: lng,
        geometry: geom as unknown as Prisma.InputJsonValue,
        ownerId: SYSTEM_USER_ID,
        status: ParcelStatus.VACANT,
        currentValuation: valuation.valuationFils,
      },
    });

    await prisma.affectionPlan.create({
      data: {
        parcelId: parcel.id,
        source: 'Meydan DCR PDF (p24+p35)',
        plotNumber: p.plotNumber,
        projectName: 'Meydan Horizon',
        community: 'Meydan Horizon & Eastern Extension Phase 1',
        masterDeveloper: 'Meydan City Corporation',
        plotAreaSqft: areaSqft,
        plotAreaSqm: areaSqft * 0.092903,
        maxHeightCode: h.code,
        maxFloors: parsed.aboveGroundFloors,
        maxHeightMeters: parsed.heightMeters,
        buildingLimitGeometry: buildingLimit as unknown as Prisma.InputJsonValue,
        raw: parsed as unknown as Prisma.InputJsonValue,
      },
    });
    saved++;
    console.log(`  ${p.plotNumber}: ${h.code} → ${parsed.aboveGroundFloors}f / ${parsed.heightMeters}m`);
  }

  console.log(`done: saved ${saved} parcels`);
  await prisma.$disconnect();

  // Diagnostic dump for next iteration
  writeFileSync(
    '/tmp/meydan-extraction.json',
    JSON.stringify({ plots: plots.length, heights: heights.length, samplePlots: plots.slice(0, 5), sampleHeights: heights.slice(0, 5) }, null, 2),
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
