// Public layer — DEWA Green Charger EV stations.
// No auth required (same as communities, roads, DDA districts).
import { NextResponse } from "next/server";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const GEOJSON_PATH = join(
  process.cwd(),
  "data",
  "layers",
  "amenities",
  "ev-chargers.geojson",
);

let cached: GeoJSON.FeatureCollection | null = null;

export async function GET() {
  if (!cached) {
    try {
      cached = JSON.parse(readFileSync(GEOJSON_PATH, "utf8")) as GeoJSON.FeatureCollection;
    } catch (e) {
      return NextResponse.json(
        { error: "failed_to_load_geojson", detail: (e as Error).message },
        { status: 500 },
      );
    }
  }
  return NextResponse.json(cached, {
    headers: { "cache-control": "public, max-age=3600" },
  });
}
