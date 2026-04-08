/**
 * Download all SHAMAL PLOTS AT AL QOUZ IND.FIRST plot polygons from DDA layer 2
 * Run: npx tsx scripts/build-shamal-quoz-1.ts
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';

const QUERY_URL = 'https://gis.dda.gov.ae/server/rest/services/DDA/BASIC_LAND_BASE/MapServer/2/query';
const PROJECT_NAME = 'SHAMAL PLOTS AT AL QOUZ IND.FIRST';
const PAGE = 2000;
const PAUSE_MS = 500;

const DDA_DIR = join(homedir(), 'zaahi', 'data', 'layers', 'dda');
const OUT_PATH = join(DDA_DIR, 'shamal_quoz_1.geojson');
mkdirSync(DDA_DIR, { recursive: true });

interface EsriPolyFeature {
  attributes: { PROJECT_NAME?: string; PLOT_NUMBER?: string; AREA_SQFT?: number };
  geometry?: { rings: number[][][] };
}
interface EsriPage {
  features: EsriPolyFeature[];
  exceededTransferLimit?: boolean;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function fetchPage(offset: number): Promise<EsriPage> {
  const params = new URLSearchParams({
    where: `PROJECT_NAME='${PROJECT_NAME}'`,
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
  const features: GeoJSON.Feature[] = [];
  let offset = 0;
  let page = 0;
  const start = Date.now();
  for (;;) {
    page++;
    const data = await fetchPage(offset);
    const n = data.features.length;
    let added = 0;
    for (const f of data.features) {
      const rings = f.geometry?.rings;
      if (!rings || rings.length === 0) continue;
      const cleaned: GeoJSON.Position[][] = rings
        .map((r) => r.filter(([x, y]) => Number.isFinite(x) && Number.isFinite(y)) as GeoJSON.Position[])
        .filter((r) => r.length >= 4);
      if (cleaned.length === 0) continue;
      features.push({
        type: 'Feature',
        id: f.attributes.PLOT_NUMBER,
        geometry:
          cleaned.length === 1
            ? { type: 'Polygon', coordinates: cleaned }
            : { type: 'MultiPolygon', coordinates: cleaned.map((r) => [r]) },
        properties: {
          PLOT_NUMBER: f.attributes.PLOT_NUMBER ?? null,
          PROJECT_NAME: f.attributes.PROJECT_NAME ?? PROJECT_NAME,
          AREA_SQFT: f.attributes.AREA_SQFT ?? null,
        },
      });
      added++;
    }
    const elapsed = ((Date.now() - start) / 1000).toFixed(1);
    console.log(`page ${String(page).padStart(2, '0')} offset ${String(offset).padStart(6, '0')} → ${n} (+${added})  total=${features.length}  ${elapsed}s`);
    if (!data.exceededTransferLimit || n === 0) break;
    offset += n;
    await sleep(PAUSE_MS);
  }

  const fc: GeoJSON.FeatureCollection = { type: 'FeatureCollection', features };
  writeFileSync(OUT_PATH, JSON.stringify(fc));
  console.log(`\nWrote ${features.length} features → ${OUT_PATH}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
