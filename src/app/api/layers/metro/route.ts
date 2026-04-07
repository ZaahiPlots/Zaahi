import { NextResponse } from 'next/server';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';

/**
 * Dubai Metro lines from OSM (Overpass API).
 * Pre-processed to GeoJSON FeatureCollection at:
 *   ~/zaahi/data/layers/dubai_metro.geojson
 *
 * The previous source (Dubai Pulse RAIL_ROUTES KML) had empty <LineString>
 * tags for the Red and Green main bodies — using OSM until DDA fixes the feed.
 */
const GEOJSON_PATH = join(homedir(), 'zaahi', 'data', 'layers', 'dubai_metro.geojson');

let cached: GeoJSON.FeatureCollection | null = null;

export async function GET() {
  if (!cached) {
    try {
      cached = JSON.parse(readFileSync(GEOJSON_PATH, 'utf8'));
    } catch (e) {
      return NextResponse.json(
        { error: 'failed_to_load_metro', detail: (e as Error).message },
        { status: 500 },
      );
    }
  }
  return NextResponse.json(cached, {
    headers: { 'cache-control': 'public, max-age=3600' },
  });
}
