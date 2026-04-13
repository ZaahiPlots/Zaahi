import { NextResponse } from "next/server";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

// Public layer index — no auth required.
// Returns the list of available Abu Dhabi land plot districts with feature counts.

const DIR = join(process.cwd(), "data", "layers", "ad-plots");

let cached: Array<{ slug: string; name: string; count: number }> | null = null;

export async function GET() {
  if (!cached) {
    try {
      const files = readdirSync(DIR).filter((f) => f.endsWith(".geojson")).sort();
      cached = files.map((f) => {
        const slug = f.replace(/\.geojson$/, "");
        const raw = JSON.parse(readFileSync(join(DIR, f), "utf8"));
        const features = raw.features ?? [];
        // Derive display name from DISTRICTENG of first feature
        const distName =
          features[0]?.properties?.DISTRICTENG ?? slug.replace(/-/g, " ");
        const name = distName
          .split(" ")
          .map((w: string) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
          .join(" ");
        return { slug, name, count: features.length };
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
