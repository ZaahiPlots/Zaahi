import { NextResponse } from "next/server";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

// Public layer — no auth required (geographic reference data).
// Serves Abu Dhabi plot-level GeoJSON for any district in data/layers/ad-plots/.

const DIR = join(process.cwd(), "data", "layers", "ad-plots");
const cache = new Map<string, GeoJSON.FeatureCollection>();

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ district: string }> },
) {
  const { district } = await params;

  // Sanitize: only allow alphanumeric, hyphens, underscores
  if (!/^[\w-]+$/.test(district)) {
    return NextResponse.json({ error: "invalid_slug" }, { status: 400 });
  }

  if (cache.has(district)) {
    return NextResponse.json(cache.get(district)!, {
      headers: { "cache-control": "public, max-age=3600" },
    });
  }

  const filePath = join(DIR, `${district}.geojson`);
  if (!existsSync(filePath)) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  try {
    const data: GeoJSON.FeatureCollection = JSON.parse(
      readFileSync(filePath, "utf8"),
    );
    cache.set(district, data);
    return NextResponse.json(data, {
      headers: { "cache-control": "public, max-age=3600" },
    });
  } catch (e) {
    return NextResponse.json(
      { error: "failed_to_load", detail: (e as Error).message },
      { status: 500 },
    );
  }
}
