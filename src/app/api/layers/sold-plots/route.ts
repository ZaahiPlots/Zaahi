// Public layer — DLD land sale transactions as point features.
// No auth required (same as communities, roads, DDA districts).
import { NextResponse } from 'next/server';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const GEOJSON_PATH = join(process.cwd(), 'data', 'sold-plots.geojson');

let cached: GeoJSON.FeatureCollection | null = null;

export async function GET() {
  if (!cached) {
    try {
      const text = readFileSync(GEOJSON_PATH, 'utf8');
      cached = JSON.parse(text) as GeoJSON.FeatureCollection;
    } catch (e) {
      return NextResponse.json(
        { error: 'failed_to_load_geojson', detail: (e as Error).message },
        { status: 500 },
      );
    }
  }
  return NextResponse.json(cached, {
    headers: { 'cache-control': 'public, max-age=3600' },
  });
}
