// Public layer — Abu Dhabi Communities (1864 polygons).
import { NextResponse } from 'next/server';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const PATH = join(process.cwd(), 'data', 'layers', 'abu-dhabi-communities.geojson');
let cached: GeoJSON.FeatureCollection | null = null;

export async function GET() {
  if (!cached) {
    try {
      cached = JSON.parse(readFileSync(PATH, 'utf8'));
    } catch (e) {
      return NextResponse.json({ error: 'failed', detail: (e as Error).message }, { status: 500 });
    }
  }
  return NextResponse.json(cached, { headers: { 'cache-control': 'public, max-age=3600' } });
}
