import { NextResponse } from 'next/server';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';
import { parseKml } from '@/lib/kml-parser';

const KML_PATH = join(
  homedir(),
  'zaahi',
  'data',
  'layers',
  '07_International_City_Phase_2_3.kml',
);

let cached: GeoJSON.FeatureCollection | null = null;

export async function GET() {
  if (!cached) {
    try {
      const text = readFileSync(KML_PATH, 'utf8');
      cached = parseKml(text, {
        attrs: ['Layer', 'fid', 'EntityHandle'],
        idAttr: 'fid',
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
