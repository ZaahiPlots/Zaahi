import { NextResponse } from 'next/server';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseKml } from '@/lib/kml-parser';

const KML_PATH = join(process.cwd(), 'data', 'layers', 'Башни.kml');

let cached: GeoJSON.FeatureCollection | null = null;

export async function GET() {
  if (!cached) {
    try {
      const text = readFileSync(KML_PATH, 'utf8');
      cached = parseKml(text, {
        attrs: ['Layer', 'fid', 'EntityHandle', 'name'],
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
