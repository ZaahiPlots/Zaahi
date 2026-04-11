import { NextResponse } from 'next/server';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
const PATH = join(process.cwd(), 'data', 'layers', 'dda', 'meraas_wadi_alshabak.geojson');

let cached: GeoJSON.FeatureCollection | null = null;

export async function GET() {
  if (!cached) {
    try {
      cached = JSON.parse(readFileSync(PATH, 'utf8'));
    } catch (e) {
      return NextResponse.json(
        { error: 'failed_to_load', detail: (e as Error).message },
        { status: 500 },
      );
    }
  }
  return NextResponse.json(cached, {
    headers: { 'cache-control': 'public, max-age=3600' },
  });
}
