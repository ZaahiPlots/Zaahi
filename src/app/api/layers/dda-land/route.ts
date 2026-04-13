import { NextResponse } from "next/server";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

// Public layer index — no auth required.
// Returns the list of available DDA land plot projects with feature counts.

const DIR = join(process.cwd(), "data", "layers", "dda-plots");

let cached: Array<{ slug: string; name: string; count: number }> | null = null;

export async function GET() {
  if (!cached) {
    try {
      const files = readdirSync(DIR).filter((f) => f.endsWith(".geojson")).sort();
      cached = files.map((f) => {
        const slug = f.replace(/\.geojson$/, "");
        const raw = JSON.parse(readFileSync(join(DIR, f), "utf8"));
        const features = raw.features ?? [];
        const projName =
          features[0]?.properties?.PROJECT_NAME ?? slug.replace(/-/g, " ");
        return {
          slug,
          name: projName
            .split(" ")
            .map((w: string) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
            .join(" "),
          count: features.length,
        };
      });
    } catch (e) {
      return NextResponse.json(
        { error: "failed_to_list", detail: (e as Error).message },
        { status: 500 },
      );
    }
  }
  return NextResponse.json(cached, {
    headers: { "cache-control": "public, max-age=3600" },
  });
}
