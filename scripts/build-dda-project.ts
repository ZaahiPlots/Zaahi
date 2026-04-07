/**
 * Download all real plot polygons of one DDA project from
 *   gis.dda.gov.ae/server/rest/services/DDA/BASIC_LAND_BASE/MapServer/2
 * and save as ~/zaahi/data/layers/dda_<slug>.geojson.
 *
 * Usage:
 *   npx tsx scripts/build-dda-project.ts "DUBAI HILLS"          → dda_dubai-hills.geojson
 *   npx tsx scripts/build-dda-project.ts "BUSINESS BAY PHASE 1 & 2" --slug business-bay
 */
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';

const QUERY_URL = 'https://gis.dda.gov.ae/server/rest/services/DDA/BASIC_LAND_BASE/MapServer/2/query';
const PAGE = 2000;
const PAUSE_MS = 500;

interface EsriPolyFeature {
  attributes: { PROJECT_NAME?: string; PLOT_NUMBER?: string; AREA_SQFT?: number };
  geometry?: { rings: number[][][] };
}
interface EsriPage {
  features: EsriPolyFeature[];
  exceededTransferLimit?: boolean;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

async function fetchPage(projectName: string, offset: number): Promise<EsriPage> {
  const params = new URLSearchParams({
    where: `PROJECT_NAME='${projectName.replace(/'/g, "''")}'`,
    outFields: 'PROJECT_NAME,PLOT_NUMBER,AREA_SQFT',
    returnGeometry: 'true',
    outSR: '4326',
    resultOffset: String(offset),
    resultRecordCount: String(PAGE),
    orderByFields: 'OBJECTID',
    f: 'json',
  });
  const r = await fetch(`${QUERY_URL}?${params}`);
  if (!r.ok) throw new Error(`HTTP ${r.status} at offset ${offset}`);
  return (await r.json()) as EsriPage;
}

async function main() {
  const args = process.argv.slice(2);
  if (args.length < 1) {
    console.error('usage: tsx scripts/build-dda-project.ts "PROJECT NAME" [--slug custom]');
    process.exit(1);
  }
  const projectName = args[0];
  const slugIdx = args.indexOf('--slug');
  const slug = slugIdx >= 0 ? args[slugIdx + 1] : slugify(projectName);
  const outPath = join(homedir(), 'zaahi', 'data', 'layers', `dda_${slug}.geojson`);

  console.log(`project: ${projectName}`);
  console.log(`slug:    ${slug}`);
  console.log(`output:  ${outPath}\n`);

  const features: GeoJSON.Feature[] = [];
  let offset = 0;
  let page = 0;
  for (;;) {
    page++;
    const data = await fetchPage(projectName, offset);
    const n = data.features.length;
    let added = 0;
    for (const f of data.features) {
      const rings = f.geometry?.rings;
      if (!rings || rings.length === 0) continue;
      // Filter degenerate rings
      const cleanedRings: number[][][] = rings
        .map((r) => r.filter(([x, y]) => Number.isFinite(x) && Number.isFinite(y)))
        .filter((r) => r.length >= 4);
      if (cleanedRings.length === 0) continue;
      features.push({
        type: 'Feature',
        id: f.attributes.PLOT_NUMBER,
        geometry:
          cleanedRings.length === 1
            ? { type: 'Polygon', coordinates: cleanedRings }
            : { type: 'MultiPolygon', coordinates: cleanedRings.map((r) => [r]) },
        properties: {
          PLOT_NUMBER: f.attributes.PLOT_NUMBER ?? null,
          PROJECT_NAME: f.attributes.PROJECT_NAME ?? projectName,
          AREA_SQFT: f.attributes.AREA_SQFT ?? null,
        },
      });
      added++;
    }
    console.log(`  page ${page} offset ${offset} → ${n} features (+${added})`);
    if (!data.exceededTransferLimit || n === 0) break;
    offset += n;
    await sleep(PAUSE_MS);
  }

  const fc: GeoJSON.FeatureCollection = { type: 'FeatureCollection', features };
  writeFileSync(outPath, JSON.stringify(fc));
  console.log(`\nWrote ${features.length} features → ${outPath}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
