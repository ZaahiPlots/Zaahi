/**
 * Build data/dda-plot-index.json — a plotNumber -> {file, projectName,
 * areaSqft, landUse} index over the 206 files already in data/layers/dda/
 * (99,126 plots, the same data /api/layers/dda/* already serves publicly).
 *
 * Why an index instead of scanning at request time: the 206 files are
 *54 MB total and there is no way to know which file holds a given plot
 * number without reading all of them. This index is ~10 MB of scalars
 * (no geometry) so a lookup is a single JSON.parse + object access; the
 * matching district file is then read once, on a hit, to pull the polygon.
 *
 * land_type_en enrichment comes from docs/research/data-dubai/raw/
 * land_registry.json (joined on parcel_id == our plotNumber) — that raw
 * dump is gitignored (docs/research/data-dubai/ — see .gitignore), so this
 * script bakes the couple of scalar fields we need into the committed
 * index rather than shipping the 233 MB dump. If that file isn't present
 * on this box, the index still builds — landUse just stays null for every
 * plot, which the map already treats as "outline only, no 3D" (a known,
 * handled state, not a broken one).
 *
 * Run: npx tsx scripts/build-dda-plot-index.ts
 */
import { readFileSync, readdirSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const DDA_DIR = join(process.cwd(), "data", "layers", "dda");
const LAND_REGISTRY_PATH = join(
  process.cwd(),
  "docs", "research", "data-dubai", "raw", "land_registry.json",
);
const OUT_PATH = join(process.cwd(), "data", "dda-plot-index.json");

interface IndexEntry {
  file: string; // basename without .geojson, e.g. "dlrc"
  projectName: string;
  areaSqft: number | null;
  landUse: string | null;
}

function buildLandUseByPlot(): Map<string, string> {
  const byPlot = new Map<string, string>();
  if (!existsSync(LAND_REGISTRY_PATH)) {
    console.log(`[build-dda-plot-index] land_registry.json not found at ${LAND_REGISTRY_PATH} — landUse will be null for every plot.`);
    return byPlot;
  }
  const rows = JSON.parse(readFileSync(LAND_REGISTRY_PATH, "utf8")) as Array<{
    parcel_id?: string | number | null;
    land_type_en?: string | null;
  }>;
  for (const row of rows) {
    if (!row.parcel_id || !row.land_type_en) continue;
    const plotNumber = String(row.parcel_id).split(".")[0];
    if (!/^\d{7}$/.test(plotNumber)) continue;
    byPlot.set(plotNumber, row.land_type_en.toUpperCase());
  }
  console.log(`[build-dda-plot-index] land_registry.json: ${byPlot.size} plots with a land use.`);
  return byPlot;
}

function main() {
  const landUseByPlot = buildLandUseByPlot();
  const index: Record<string, IndexEntry> = {};
  const files = readdirSync(DDA_DIR).filter((f) => f.endsWith(".geojson"));

  let plotCount = 0;
  let dupCount = 0;
  for (const filename of files) {
    const file = filename.replace(/\.geojson$/, "");
    const fc = JSON.parse(readFileSync(join(DDA_DIR, filename), "utf8")) as {
      features?: Array<{ properties?: Record<string, unknown> }>;
    };
    for (const feat of fc.features ?? []) {
      const props = feat.properties ?? {};
      const plotNumber = String(props.PLOT_NUMBER ?? "").trim();
      if (!/^\d{5,10}$/.test(plotNumber)) continue;
      if (index[plotNumber]) { dupCount++; continue; } // first file wins, same as Parcel's "never duplicate" spirit
      index[plotNumber] = {
        file,
        projectName: typeof props.PROJECT_NAME === "string" ? props.PROJECT_NAME : "",
        areaSqft: typeof props.AREA_SQFT === "number" ? props.AREA_SQFT : null,
        landUse: landUseByPlot.get(plotNumber) ?? null,
      };
      plotCount++;
    }
  }

  writeFileSync(OUT_PATH, JSON.stringify(index));
  console.log(`[build-dda-plot-index] ${plotCount} plots indexed (${dupCount} duplicate plot numbers across files, skipped) -> ${OUT_PATH}`);
}

main();
