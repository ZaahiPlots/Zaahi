// Public layer — Riyadh Zones Masterplan (39 polygons, zones 1-14).
// This KML uses <name> tags (Google Earth Pro export) instead of
// SimpleData, so we parse zone numbers from <name> directly.
import { NextResponse } from 'next/server';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const KML_PATH = join(process.cwd(), 'data', 'layers', 'zones_masterplan.kml');

const PLACEMARK_RE = /<Placemark[\s\S]*?<\/Placemark>/g;
const NAME_RE = /<name>([^<]*)<\/name>/;
const POLYGON_RE = /<Polygon[\s\S]*?<\/Polygon>/g;
const COORDS_RE = /<coordinates>\s*([\s\S]*?)\s*<\/coordinates>/;

function parseRing(text: string): GeoJSON.Position[] {
  const out: GeoJSON.Position[] = [];
  for (const triple of text.trim().split(/\s+/)) {
    const [lngStr, latStr] = triple.split(',');
    const lng = parseFloat(lngStr);
    const lat = parseFloat(latStr);
    if (Number.isFinite(lng) && Number.isFinite(lat)) out.push([lng, lat]);
  }
  return out;
}

let cached: GeoJSON.FeatureCollection | null = null;

export async function GET() {
  if (!cached) {
    try {
      const kml = readFileSync(KML_PATH, 'utf8');
      const features: GeoJSON.Feature[] = [];
      const placemarks = kml.match(PLACEMARK_RE) ?? [];

      for (const pm of placemarks) {
        const nameM = pm.match(NAME_RE);
        const zone = nameM?.[1]?.trim() ?? '';
        if (!zone || !/^\d+$/.test(zone)) continue;

        const polyBlocks = pm.match(POLYGON_RE) ?? [];
        const polys: GeoJSON.Position[][][] = [];
        for (const block of polyBlocks) {
          const cm = block.match(COORDS_RE);
          if (!cm) continue;
          const ring = parseRing(cm[1]);
          if (ring.length >= 4) polys.push([ring]);
        }

        let geom: GeoJSON.Geometry | null = null;
        if (polys.length === 1) geom = { type: 'Polygon', coordinates: polys[0] };
        else if (polys.length > 1) geom = { type: 'MultiPolygon', coordinates: polys };
        if (!geom) continue;

        features.push({
          type: 'Feature',
          geometry: geom,
          properties: { zone },
        });
      }

      cached = { type: 'FeatureCollection', features };
    } catch (e) {
      return NextResponse.json(
        { error: 'failed_to_load_kml', detail: (e as Error).message },
        { status: 500 },
      );
    }
  }
  return NextResponse.json(cached, {
    headers: { 'cache-control': 'public, max-age=3600' },
  });
}
