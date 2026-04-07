import { NextResponse } from 'next/server';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';

const DDA_DIR = join(homedir(), 'zaahi', 'data', 'layers', 'dda');

/**
 * Cherry-picked DDA projects rendered as one map layer.
 * Add a slug to this list to include another DDA project on the map.
 * Each slug must match a file `<slug>.geojson` in ~/zaahi/data/layers/dda/.
 */
const ACTIVE_SLUGS: readonly string[] = [
  // First batch — 20 smallest projects (positions 188–207, 1 plot each).
  'lunaya',
  'dubai-holding-plots-at-al-safouh-first',
  'shamal-plots-at-muhaisnah-first',
  'zaa-beel-first-plot',
  '6456408-at-wadi-al-safa-3',
  'al-jalila-children-s-specialty-hospital',
  'dubai-land-b2-08',
  'meraas-plots-at-port-saeed',
  'meraas-plots-at-nadd-al-shiba-fourth',
  'meraas-plots-at-al-barsha-south-first',
  'meraas-plots-at-al-warqa-a-second',
  'meraas-plots-at-wadi-alamardi',
  'meraas-plots-at-le-hemaira',
  'dp-plots-at-al-qouz-ind-second',
  'meraas-plots-at-al-qusais-ind-second',
  'shamal-plots-at-al-qouz-third',
  'shamal-plots-at-umm-suqeim-third',
  'meraas-plots-at-al-jafiliya',
  'shamal-plots-at-al-barsha-south-first',
  'shamal-plots-at-al-nahda-first',
];

let cached: GeoJSON.FeatureCollection | null = null;

export async function GET() {
  if (cached) {
    return NextResponse.json(cached, { headers: { 'cache-control': 'public, max-age=3600' } });
  }

  const features: GeoJSON.Feature[] = [];
  const missing: string[] = [];
  for (const slug of ACTIVE_SLUGS) {
    const path = join(DDA_DIR, `${slug}.geojson`);
    if (!existsSync(path)) {
      missing.push(slug);
      continue;
    }
    try {
      const fc = JSON.parse(readFileSync(path, 'utf8')) as GeoJSON.FeatureCollection;
      for (const f of fc.features) features.push(f);
    } catch {
      missing.push(slug);
    }
  }

  cached = { type: 'FeatureCollection', features };
  return NextResponse.json(cached, {
    headers: {
      'cache-control': 'public, max-age=3600',
      'x-dda-slugs-loaded': String(ACTIVE_SLUGS.length - missing.length),
      'x-dda-slugs-missing': missing.join(',') || 'none',
    },
  });
}
