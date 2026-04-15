// Public layer — UAE Districts (gadm41 level-3 administrative boundaries).
// 530 polygons covering all 7 emirates. Source: GADM 4.1 (via "Red Line
// Districts" kadastr export).
import { NextResponse } from 'next/server';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseKml } from '@/lib/kml-parser';

const KML_PATH = join(process.cwd(), 'data', 'layers', 'uae-districts.kml');

let cached: GeoJSON.FeatureCollection | null = null;

export async function GET() {
  if (!cached) {
    try {
      const text = readFileSync(KML_PATH, 'utf8');
      cached = parseKml(text, {
        attrs: ['NAME_2', 'NL_NAME_1', 'COUNTRY', 'VARNAME_3'],
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
