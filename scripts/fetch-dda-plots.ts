#!/usr/bin/env npx tsx
/**
 * Fetch all 99,235 DDA plots from the public BASIC_LAND_BASE MapServer Layer 2.
 * Saves one GeoJSON file per PROJECT_NAME into data/layers/dda-plots/.
 *
 * Usage:  npx tsx scripts/fetch-dda-plots.ts
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

const BASE_URL =
  'https://gis.dda.gov.ae/server/rest/services/DDA/BASIC_LAND_BASE/MapServer/2/query';
const OUT_DIR = join(process.cwd(), 'data', 'layers', 'dda-plots');
const BATCH_SIZE = 2000;
const OUT_FIELDS = [
  'OBJECTID',
  'PLOT_NUMBER',
  'PROJECT_NAME',
  'ENTITY_NAME',
  'DEVELOPER_NAME',
  'AREA_SQM',
  'AREA_SQFT',
  'GFA_SQM',
  'GFA_SQFT',
  'MAX_HEIGHT_FLOORS',
  'MAIN_LANDUSE',
  'SUB_LANDUSE',
  'CONSTRUCTION_STATUS',
  'IS_FROZEN',
  'BUILDING_SETBACK_SIDE1',
  'BUILDING_SETBACK_SIDE2',
  'BUILDING_SETBACK_SIDE3',
  'BUILDING_SETBACK_SIDE4',
  'PODIUM_SETBACK_SIDE1',
  'PODIUM_SETBACK_SIDE2',
  'PODIUM_SETBACK_SIDE3',
  'PODIUM_SETBACK_SIDE4',
].join(',');

interface EsriFeature {
  attributes: Record<string, unknown>;
  geometry?: { rings: number[][][] };
}
interface EsriResponse {
  features?: EsriFeature[];
  exceededTransferLimit?: boolean;
  error?: { message: string };
}

async function fetchBatch(offset: number): Promise<EsriResponse> {
  const params = new URLSearchParams({
    where: '1=1',
    outFields: OUT_FIELDS,
    outSR: '4326',
    f: 'json',
    resultRecordCount: String(BATCH_SIZE),
    resultOffset: String(offset),
    orderByFields: 'OBJECTID ASC',
  });
  const url = `${BASE_URL}?${params}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} at offset ${offset}`);
  return res.json() as Promise<EsriResponse>;
}

function toGeoJSON(features: EsriFeature[]): GeoJSON.FeatureCollection {
  return {
    type: 'FeatureCollection',
    features: features
      .filter((f) => f.geometry?.rings)
      .map((f, i) => ({
        type: 'Feature' as const,
        id: i,
        properties: f.attributes,
        geometry: {
          type: 'Polygon' as const,
          coordinates: f.geometry!.rings,
        },
      })),
  };
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

async function main() {
  mkdirSync(OUT_DIR, { recursive: true });

  // 1. Get total count
  const countParams = new URLSearchParams({
    where: '1=1',
    returnCountOnly: 'true',
    f: 'json',
  });
  const countRes = await fetch(`${BASE_URL}?${countParams}`);
  const countData = (await countRes.json()) as { count: number };
  const total = countData.count;
  const batches = Math.ceil(total / BATCH_SIZE);
  console.log(`Total plots: ${total}  |  Batches: ${batches}  |  Batch size: ${BATCH_SIZE}\n`);

  // 2. Fetch all batches
  const allFeatures: EsriFeature[] = [];
  for (let i = 0; i < batches; i++) {
    const offset = i * BATCH_SIZE;
    process.stdout.write(`  batch ${i + 1}/${batches}  (offset ${offset}) ... `);
    const data = await fetchBatch(offset);
    if (data.error) {
      console.error(`ERROR: ${data.error.message}`);
      process.exit(1);
    }
    const count = data.features?.length ?? 0;
    allFeatures.push(...(data.features ?? []));
    console.log(`${count} records  (total: ${allFeatures.length})`);

    // Small delay to be polite to the server
    if (i < batches - 1) await new Promise((r) => setTimeout(r, 300));
  }

  console.log(`\nFetched ${allFeatures.length} plots total.\n`);

  // 3. Group by PROJECT_NAME
  const byProject = new Map<string, EsriFeature[]>();
  let noProject = 0;
  for (const f of allFeatures) {
    const name = (f.attributes.PROJECT_NAME as string) || '_unknown';
    if (name === '_unknown') noProject++;
    if (!byProject.has(name)) byProject.set(name, []);
    byProject.get(name)!.push(f);
  }

  console.log(`Projects: ${byProject.size}  (${noProject} plots with no project name)\n`);

  // 4. Save each project as a separate GeoJSON file
  let saved = 0;
  for (const [name, features] of byProject) {
    const slug = slugify(name);
    const filePath = join(OUT_DIR, `${slug}.geojson`);
    const fc = toGeoJSON(features);
    writeFileSync(filePath, JSON.stringify(fc));
    saved++;
    if (saved % 20 === 0 || saved === byProject.size) {
      console.log(`  saved ${saved}/${byProject.size} project files`);
    }
  }

  console.log(`\nDone! ${saved} GeoJSON files saved to ${OUT_DIR}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
