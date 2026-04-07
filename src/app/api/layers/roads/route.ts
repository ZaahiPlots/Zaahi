import { NextResponse } from 'next/server';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';
import { parseKml } from '@/lib/kml-parser';

const KML_PATH = join(homedir(), 'zaahi', 'data', 'layers', 'Major_Roads.kml');

let cached: GeoJSON.FeatureCollection | null = null;

export async function GET() {
  if (!cached) {
    try {
      const text = readFileSync(KML_PATH, 'utf8');
      cached = parseKml(text, {
        attrs: ['ROAD_NAME', 'ROAD_NAME_ARABIC', 'ROUTE_ID', 'FUNCTIONAL_CLASS_ID', 'NUMBER_OF_LANES', 'OBJECTID'],
        idAttr: 'OBJECTID',
      });
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
