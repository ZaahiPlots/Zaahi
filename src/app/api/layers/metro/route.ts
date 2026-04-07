import { NextResponse } from 'next/server';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';
import { parseKml } from '@/lib/kml-parser';

const KML_PATH = join(homedir(), 'zaahi', 'data', 'layers', 'Metro_Lines_Gis_2026-01-31_00-00-00.kml');

// Map RAIL_ROUTE_ID → human line label + canonical color/style.
// 2029508 = Red Line  (Rashidiya → JAFZA, 29 stations)
// 2029509 = Green Line (Al Qusais → Al Jaddaf, 20 stations)
// 0 / other = Route 2020 / planned extension (purple, dashed)
function classify(routeId: string | null) {
  switch (routeId) {
    case '2029508':
      return { line: 'Red Line', color: '#EA1D25', dashed: false };
    case '2029509':
      return { line: 'Green Line', color: '#00A651', dashed: false };
    default:
      return { line: 'Route 2020 / Future', color: '#9333EA', dashed: true };
  }
}

let cached: GeoJSON.FeatureCollection | null = null;

export async function GET() {
  if (!cached) {
    try {
      const text = readFileSync(KML_PATH, 'utf8');
      const fc = parseKml(text, {
        attrs: ['RAIL_ROUTE_ID', 'NUM_OF_STATIONS', 'SERVICE_AREA', 'OBJECTID'],
        idAttr: 'OBJECTID',
      });
      // Enrich properties with line label / colour / dash so the map paint
      // expressions can read them directly.
      fc.features = fc.features.map((f) => {
        const meta = classify(f.properties?.RAIL_ROUTE_ID as string | null);
        return {
          ...f,
          properties: {
            ...(f.properties ?? {}),
            line: meta.line,
            color: meta.color,
            dashed: meta.dashed,
          },
        };
      });
      cached = fc;
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
