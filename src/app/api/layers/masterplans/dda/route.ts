import { NextRequest, NextResponse } from 'next/server';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';

const LAYERS_DIR = join(homedir(), 'zaahi', 'data', 'layers');

// In-memory cache keyed by slug — pre-built static files don't change at runtime.
const cache = new Map<string, GeoJSON.FeatureCollection>();

// GET /api/layers/masterplans/dda?project=dubai-hills
export async function GET(req: NextRequest) {
  const slug = req.nextUrl.searchParams.get('project') ?? '';
  if (!/^[a-z0-9-]+$/.test(slug)) {
    return NextResponse.json({ error: 'invalid_project_slug' }, { status: 400 });
  }

  const cached = cache.get(slug);
  if (cached) {
    return NextResponse.json(cached, { headers: { 'cache-control': 'public, max-age=3600' } });
  }

  const path = join(LAYERS_DIR, `dda_${slug}.geojson`);
  if (!existsSync(path)) {
    return NextResponse.json(
      { error: 'project_not_built', detail: `dda_${slug}.geojson not found — run scripts/build-dda-project.ts` },
      { status: 404 },
    );
  }

  try {
    const fc = JSON.parse(readFileSync(path, 'utf8')) as GeoJSON.FeatureCollection;
    cache.set(slug, fc);
    return NextResponse.json(fc, { headers: { 'cache-control': 'public, max-age=3600' } });
  } catch (e) {
    return NextResponse.json(
      { error: 'failed_to_load', detail: (e as Error).message },
      { status: 500 },
    );
  }
}
