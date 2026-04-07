/**
 * Single-pass downloader of ALL DDA plot polygons (~99k features, 207 projects).
 * Paginates layer 2, groups by PROJECT_NAME in memory, writes:
 *   data/layers/dda/<slug>.geojson    (one per project)
 *   data/layers/dda_all_plots.geojson (concatenated, for the map layer)
 *   data/layers/dda/index.json        ([{slug, name, plot_count, file}])
 *
 * Run: npx tsx scripts/build-dda-all.ts
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';

const QUERY_URL = 'https://gis.dda.gov.ae/server/rest/services/DDA/BASIC_LAND_BASE/MapServer/2/query';
const PAGE = 2000;
const PAUSE_MS = 500;

const LAYERS_DIR = join(homedir(), 'zaahi', 'data', 'layers');
const DDA_DIR = join(LAYERS_DIR, 'dda');
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

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

async function fetchPage(offset: number): Promise<EsriPage> {
  const params = new URLSearchParams({
    where: "PROJECT_NAME IS NOT NULL AND PROJECT_NAME <> ''",
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

function toGeoJSONFeature(f: EsriPolyFeature): GeoJSON.Feature | null {
  const rings = f.geometry?.rings;
  if (!rings || rings.length === 0) return null;
  const cleaned: number[][][] = rings
    .map((r) => r.filter(([x, y]) => Number.isFinite(x) && Number.isFinite(y)))
    .filter((r) => r.length >= 4);
  if (cleaned.length === 0) return null;
  return {
    type: 'Feature',
    id: f.attributes.PLOT_NUMBER ?? undefined,
    geometry:
      cleaned.length === 1
        ? { type: 'Polygon', coordinates: cleaned }
        : { type: 'MultiPolygon', coordinates: cleaned.map((r) => [r]) },
    properties: {
      PLOT_NUMBER: f.attributes.PLOT_NUMBER ?? null,
      PROJECT_NAME: f.attributes.PROJECT_NAME ?? null,
      AREA_SQFT: f.attributes.AREA_SQFT ?? null,
    },
  };
}

async function main() {
  const groups = new Map<string, GeoJSON.Feature[]>();
  const allFeatures: GeoJSON.Feature[] = [];
  let offset = 0;
  let page = 0;
  const start = Date.now();

  for (;;) {
    page++;
    const data = await fetchPage(offset);
    const n = data.features.length;
    let added = 0;
    for (const f of data.features) {
      const gj = toGeoJSONFeature(f);
      if (!gj) continue;
      const name = (gj.properties?.PROJECT_NAME as string | null) ?? '';
      if (!name) continue;
      let arr = groups.get(name);
      if (!arr) groups.set(name, (arr = []));
      arr.push(gj);
      allFeatures.push(gj);
      added++;
    }
    const elapsed = ((Date.now() - start) / 1000).toFixed(1);
    console.log(`page ${String(page).padStart(2, '0')} offset ${String(offset).padStart(6, '0')} → ${n} feats (+${added})  groups=${groups.size}  total=${allFeatures.length}  ${elapsed}s`);
    if (!data.exceededTransferLimit || n === 0) break;
    offset += n;
    await sleep(PAUSE_MS);
  }

  console.log(`\nFetched ${allFeatures.length} features in ${groups.size} projects.\nWriting files…`);

  // Write per-project files
  const index: Array<{ slug: string; name: string; plot_count: number; file: string }> = [];
  for (const [name, feats] of groups.entries()) {
    const slug = slugify(name);
    const fc: GeoJSON.FeatureCollection = { type: 'FeatureCollection', features: feats };
    writeFileSync(join(DDA_DIR, `${slug}.geojson`), JSON.stringify(fc));
    index.push({ slug, name, plot_count: feats.length, file: `${slug}.geojson` });
  }
  index.sort((a, b) => b.plot_count - a.plot_count);
  writeFileSync(join(DDA_DIR, 'index.json'), JSON.stringify(index, null, 2));

  // Write the concatenated all-plots file
  writeFileSync(
    join(LAYERS_DIR, 'dda_all_plots.geojson'),
    JSON.stringify({ type: 'FeatureCollection', features: allFeatures }),
  );

  console.log(`\n✓ ${groups.size} per-project files`);
  console.log(`✓ index.json (sorted by plot_count)`);
  console.log(`✓ dda_all_plots.geojson (${(allFeatures.length).toLocaleString()} features)`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
