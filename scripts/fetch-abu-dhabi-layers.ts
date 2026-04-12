/**
 * Fetch Abu Dhabi boundary layers from MyLand/SMARTHUB ArcGIS REST.
 * Converts Esri JSON → GeoJSON, saves to data/layers/.
 *
 * Run: npx tsx scripts/fetch-abu-dhabi-layers.ts
 */
import { writeFileSync } from "node:fs";
import { join } from "node:path";

const BASE = "https://onwani.abudhabi.ae/arcgis/rest/services/MyLand/SMARTHUB/MapServer";
const ROOT = process.cwd();

interface EsriFeature {
  attributes: Record<string, unknown>;
  geometry: { rings?: number[][][]; paths?: number[][][] };
}

function esriToGeoJSON(
  features: EsriFeature[],
  attrs: string[],
): GeoJSON.FeatureCollection {
  const out: GeoJSON.Feature[] = [];
  for (const f of features) {
    const props: Record<string, unknown> = {};
    for (const a of attrs) props[a] = f.attributes[a] ?? null;

    let geom: GeoJSON.Geometry | null = null;
    if (f.geometry?.rings) {
      if (f.geometry.rings.length === 1) {
        geom = { type: "Polygon", coordinates: f.geometry.rings };
      } else {
        geom = { type: "MultiPolygon", coordinates: f.geometry.rings.map(r => [r]) };
      }
    }
    if (!geom) continue;

    out.push({ type: "Feature", geometry: geom, properties: props });
  }
  return { type: "FeatureCollection", features: out };
}

async function fetchLayer(
  layerId: number,
  label: string,
  maxRecords: number,
): Promise<EsriFeature[]> {
  const all: EsriFeature[] = [];
  let offset = 0;
  const batch = 2000;

  while (true) {
    const url =
      `${BASE}/${layerId}/query?where=1%3D1&outFields=*` +
      `&returnGeometry=true&outSR=4326&f=json` +
      `&resultRecordCount=${batch}&resultOffset=${offset}`;

    console.log(`  [${label}] fetching offset=${offset}...`);
    const r = await fetch(url);
    if (!r.ok) throw new Error(`HTTP ${r.status} for ${label} offset=${offset}`);
    const data = await r.json();

    if (!data.features || data.features.length === 0) break;
    all.push(...data.features);
    console.log(`  [${label}] got ${data.features.length} (total: ${all.length})`);

    if (data.features.length < batch) break;
    if (all.length >= maxRecords) break;
    offset += batch;

    // Pause 1s between pages
    await new Promise(r => setTimeout(r, 1000));
  }

  return all;
}

async function main() {
  console.log("=== Fetching Abu Dhabi layers from MyLand/SMARTHUB ===\n");

  // Layer 3: Municipalities (3 polygons)
  console.log("1/3 Municipalities...");
  const munFeatures = await fetchLayer(3, "Municipalities", 100);
  const munGJ = esriToGeoJSON(munFeatures, [
    "NAMEENGLISH", "NAMEARABIC", "OBJECTID",
  ]);
  const munPath = join(ROOT, "data", "layers", "abu-dhabi-municipalities.geojson");
  writeFileSync(munPath, JSON.stringify(munGJ));
  console.log(`  → ${munPath} (${munGJ.features.length} features)\n`);

  // Layer 1: Districts (216 polygons)
  console.log("2/3 Districts...");
  const distFeatures = await fetchLayer(1, "Districts", 500);
  const distGJ = esriToGeoJSON(distFeatures, [
    "NAMEENGLISH", "NAMEARABIC", "NAMEPOPULARENGLISH", "NAMEPOPULARARABIC",
    "DISTRICTID", "MUNICIPALITYNAME", "POPULATION", "OBJECTID",
  ]);
  const distPath = join(ROOT, "data", "layers", "abu-dhabi-districts.geojson");
  writeFileSync(distPath, JSON.stringify(distGJ));
  console.log(`  → ${distPath} (${distGJ.features.length} features)\n`);

  // Layer 2: Communities (1864 polygons — needs pagination)
  console.log("3/3 Communities...");
  const commFeatures = await fetchLayer(2, "Communities", 3000);
  const commGJ = esriToGeoJSON(commFeatures, [
    "COMMUNITYNAMEENG", "COMMUNITYNAMEARA", "COMMUNITYID",
    "DISTRICTID", "DISTRICTNAMEENG", "MUNICIPALITY", "OBJECTID",
  ]);
  const commPath = join(ROOT, "data", "layers", "abu-dhabi-communities.geojson");
  writeFileSync(commPath, JSON.stringify(commGJ));
  console.log(`  → ${commPath} (${commGJ.features.length} features)\n`);

  console.log("Done.");
  console.log(`  Municipalities: ${munGJ.features.length}`);
  console.log(`  Districts:      ${distGJ.features.length}`);
  console.log(`  Communities:    ${commGJ.features.length}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
