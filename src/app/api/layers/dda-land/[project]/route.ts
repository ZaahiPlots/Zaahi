import { NextResponse } from "next/server";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

// Public layer — no auth required (geographic reference data).
// Serves DDA plot-level GeoJSON for any project in data/layers/dda-plots/.

const DIR = join(process.cwd(), "data", "layers", "dda-plots");
const cache = new Map<string, GeoJSON.FeatureCollection>();

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ project: string }> },
) {
  const { project } = await params;

  // Sanitize: only allow alphanumeric, hyphens, underscores
  if (!/^[\w-]+$/.test(project)) {
    return NextResponse.json({ error: "invalid_slug" }, { status: 400 });
  }

  if (cache.has(project)) {
    return NextResponse.json(cache.get(project)!, {
      headers: { "cache-control": "public, max-age=3600" },
    });
  }

  const filePath = join(DIR, `${project}.geojson`);
  if (!existsSync(filePath)) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  try {
    const data: GeoJSON.FeatureCollection = JSON.parse(
      readFileSync(filePath, "utf8"),
    );
    cache.set(project, data);
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
