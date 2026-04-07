import { NextRequest, NextResponse } from 'next/server';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';

const LAYERS_DIR = join(homedir(), 'zaahi', 'data', 'layers');
const DDA_DIR = join(LAYERS_DIR, 'dda');
const ALL_PATH = join(LAYERS_DIR, 'dda_all_plots.geojson');
const INDEX_PATH = join(DDA_DIR, 'index.json');

// In-memory caches.
let cachedAll: GeoJSON.FeatureCollection | null = null;
let cachedIndex: unknown = null;
const cachedProjects = new Map<string, GeoJSON.FeatureCollection>();

/**
 * GET /api/layers/masterplans/dda
 *   ?list=1            → returns index.json (slugs + plot counts)
 *   ?all=1             → returns concatenated FeatureCollection of all 99k plots (~54 MB)
 *   ?project=<slug>    → returns plots of one project
 */
export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;

  if (sp.get('list')) {
    if (!cachedIndex) {
      try {
        cachedIndex = JSON.parse(readFileSync(INDEX_PATH, 'utf8'));
      } catch (e) {
        return NextResponse.json({ error: 'failed_to_load_index', detail: (e as Error).message }, { status: 500 });
      }
    }
    return NextResponse.json(cachedIndex, { headers: { 'cache-control': 'public, max-age=3600' } });
  }

  if (sp.get('all')) {
    if (!cachedAll) {
      try {
        cachedAll = JSON.parse(readFileSync(ALL_PATH, 'utf8'));
      } catch (e) {
        return NextResponse.json({ error: 'failed_to_load_all', detail: (e as Error).message }, { status: 500 });
      }
    }
    return NextResponse.json(cachedAll, { headers: { 'cache-control': 'public, max-age=86400' } });
  }

  const slug = sp.get('project') ?? '';
  if (!/^[a-z0-9-]+$/.test(slug)) {
    return NextResponse.json({ error: 'invalid_project_slug' }, { status: 400 });
  }
  const cached = cachedProjects.get(slug);
  if (cached) {
    return NextResponse.json(cached, { headers: { 'cache-control': 'public, max-age=3600' } });
  }
  const path = join(DDA_DIR, `${slug}.geojson`);
  if (!existsSync(path)) {
    return NextResponse.json({ error: 'project_not_found' }, { status: 404 });
  }
  try {
    const fc = JSON.parse(readFileSync(path, 'utf8')) as GeoJSON.FeatureCollection;
    cachedProjects.set(slug, fc);
    return NextResponse.json(fc, { headers: { 'cache-control': 'public, max-age=3600' } });
  } catch (e) {
    return NextResponse.json({ error: 'failed_to_load', detail: (e as Error).message }, { status: 500 });
  }
}
