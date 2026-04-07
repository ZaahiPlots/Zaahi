/**
 * Build ~/zaahi/data/layers/dda_districts.geojson by:
 *   1) paginating through DDA layer 2 (Plot, ~99k features)
 *   2) reducing each polygon to its outer-ring centroid
 *   3) grouping centroids by PROJECT_NAME
 *   4) computing a 2D convex hull per project (Andrew's monotone chain)
 *
 * Run once: npx tsx scripts/build-dda-districts.ts
 *
 * No DB writes, no app deps — just emits a static file the API endpoint serves.
 */
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';

const QUERY_URL = 'https://gis.dda.gov.ae/server/rest/services/DDA/BASIC_LAND_BASE/MapServer/2/query';
const PAGE = 2000;
const PAUSE_MS = 500;
const OUT_PATH = join(homedir(), 'zaahi', 'data', 'layers', 'dda_districts.geojson');

interface EsriPolyFeature {
  attributes: { PROJECT_NAME?: string; PLOT_NUMBER?: string };
  geometry?: { rings: number[][][] };
}
interface EsriPage {
  features: EsriPolyFeature[];
  exceededTransferLimit?: boolean;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function fetchPage(offset: number): Promise<EsriPage> {
  const params = new URLSearchParams({
    where: "PROJECT_NAME IS NOT NULL AND PROJECT_NAME <> ''",
    outFields: 'PROJECT_NAME,PLOT_NUMBER',
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

function ringCentroid(ring: number[][]): [number, number] | null {
  let sx = 0;
  let sy = 0;
  let n = 0;
  for (const [x, y] of ring) {
    if (Number.isFinite(x) && Number.isFinite(y)) {
      sx += x;
      sy += y;
      n++;
    }
  }
  return n > 0 ? [sx / n, sy / n] : null;
}

/** Andrew's monotone chain — O(n log n) 2D convex hull. */
function convexHull(points: [number, number][]): [number, number][] {
  if (points.length < 3) return points.slice();
  const pts = points.slice().sort((a, b) => (a[0] === b[0] ? a[1] - b[1] : a[0] - b[0]));
  const cross = (o: [number, number], a: [number, number], b: [number, number]) =>
    (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lower: [number, number][] = [];
  for (const p of pts) {
    while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], p) <= 0) lower.pop();
    lower.push(p);
  }
  const upper: [number, number][] = [];
  for (let i = pts.length - 1; i >= 0; i--) {
    const p = pts[i];
    while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], p) <= 0) upper.pop();
    upper.push(p);
  }
  lower.pop();
  upper.pop();
  return lower.concat(upper);
}

/** Tiny square polygon ~30 m around a point — fallback for projects with <3 plots. */
function pointBox([lng, lat]: [number, number]): [number, number][] {
  const dLat = 15 / 111320;
  const dLng = 15 / (111320 * Math.cos((lat * Math.PI) / 180));
  return [
    [lng - dLng, lat - dLat],
    [lng + dLng, lat - dLat],
    [lng + dLng, lat + dLat],
    [lng - dLng, lat + dLat],
    [lng - dLng, lat - dLat],
  ];
}

async function main() {
  const groups = new Map<string, [number, number][]>();
  let offset = 0;
  let page = 0;
  for (;;) {
    page++;
    const data = await fetchPage(offset);
    const n = data.features.length;
    let groupedHere = 0;
    for (const f of data.features) {
      const name = f.attributes.PROJECT_NAME?.trim();
      const ring = f.geometry?.rings?.[0];
      if (!name || !ring) continue;
      const c = ringCentroid(ring);
      if (!c) continue;
      let arr = groups.get(name);
      if (!arr) groups.set(name, (arr = []));
      arr.push(c);
      groupedHere++;
    }
    console.log(`page ${page} offset ${offset} → ${n} features (+${groupedHere}) | total groups so far: ${groups.size}`);
    if (!data.exceededTransferLimit || n === 0) break;
    offset += n;
    await sleep(PAUSE_MS);
  }

  console.log(`\nDone fetching. ${groups.size} distinct PROJECT_NAMEs.`);
  console.log('Computing hulls…');

  const features: GeoJSON.Feature[] = [];
  for (const [name, pts] of groups.entries()) {
    let ring: [number, number][];
    if (pts.length >= 3) {
      const hull = convexHull(pts);
      if (hull.length < 3) {
        ring = pointBox(pts[0]);
      } else {
        // close the ring
        ring = hull.concat([hull[0]]);
      }
    } else {
      ring = pointBox(pts[0]);
    }
    features.push({
      type: 'Feature',
      id: name,
      geometry: { type: 'Polygon', coordinates: [ring] },
      properties: { PROJECT_NAME: name, plot_count: pts.length },
    });
  }

  const fc: GeoJSON.FeatureCollection = { type: 'FeatureCollection', features };
  writeFileSync(OUT_PATH, JSON.stringify(fc));
  console.log(`Wrote ${features.length} features → ${OUT_PATH}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
