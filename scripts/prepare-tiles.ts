#!/usr/bin/env npx tsx
/**
 * Enrich DDA + AD plot GeoJSON with 3D properties (color, height, base)
 * and output newline-delimited GeoJSON for tippecanoe.
 *
 * Usage:
 *   npx tsx scripts/prepare-tiles.ts
 *   tippecanoe -o public/tiles/dda-land.pmtiles ...
 */
import { readdirSync, readFileSync, createWriteStream } from "node:fs";
import { join } from "node:path";

const ZAAHI_LANDUSE_COLOR: Record<string, string> = {
  RESIDENTIAL: "#FFD700",
  COMMERCIAL: "#4A90D9",
  MIXED_USE: "#9B59B6",
  HOTEL: "#E67E22",
  HOSPITALITY: "#E67E22",
  INDUSTRIAL: "#708090",
  WAREHOUSE: "#708090",
  EDUCATIONAL: "#1ABC9C",
  EDUCATION: "#1ABC9C",
  HEALTHCARE: "#E74C3C",
  AGRICULTURAL: "#6B8E23",
  AGRICULTURE: "#6B8E23",
  FUTURE_DEVELOPMENT: "#84CC16",
  "FUTURE DEVELOPMENT": "#84CC16",
};
const DEFAULT_COLOR = "#C8A96E";

// ── DDA land use parser ──
function parseDdaLandUse(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const parts = raw.split(/\s*-\s*/);
  const cats = new Set<string>();
  for (const p of parts) {
    const l = p.trim().toLowerCase();
    if (/residential|villa|townhouse|apartment/.test(l)) cats.add("RESIDENTIAL");
    else if (/commercial|office|retail|showroom/.test(l)) cats.add("COMMERCIAL");
    else if (/hotel|hospitality|resort/.test(l)) cats.add("HOTEL");
    else if (/industrial|warehouse|factory|logistics/.test(l)) cats.add("INDUSTRIAL");
    else if (/educat|school|university/.test(l)) cats.add("EDUCATIONAL");
    else if (/health|hospital|clinic|medical/.test(l)) cats.add("HEALTHCARE");
    else if (/agricult|farm/.test(l)) cats.add("AGRICULTURAL");
    else if (/future.*development/.test(l)) cats.add("FUTURE_DEVELOPMENT");
  }
  if (cats.size > 1) return "MIXED_USE";
  if (cats.size === 1) return [...cats][0];
  return null;
}

// ── AD land use parser ──
function parseAdLandUse(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const l = raw.toLowerCase();
  if (/residential|villa|townhouse|apartment/.test(l)) return "RESIDENTIAL";
  if (/commercial|office|retail|showroom/.test(l)) return "COMMERCIAL";
  if (/mixed/.test(l)) return "MIXED_USE";
  if (/hotel|hospitality|resort/.test(l)) return "HOTEL";
  if (/industrial|warehouse|factory|logistics/.test(l)) return "INDUSTRIAL";
  if (/educat|school|university/.test(l)) return "EDUCATIONAL";
  if (/health|hospital|clinic|medical/.test(l)) return "HEALTHCARE";
  if (/agricult|farm/.test(l)) return "AGRICULTURAL";
  if (/future.*development/.test(l)) return "FUTURE_DEVELOPMENT";
  return null;
}

function parseDdaFloors(raw: string | null | undefined): number {
  if (!raw) return 0;
  const m = raw.match(/\+(\d+)\s*$/);
  return m ? parseInt(m[1], 10) : 0;
}

function defaultHeight(landUse: string): number {
  switch (landUse) {
    case "RESIDENTIAL": return 15;
    case "COMMERCIAL": return 30;
    case "MIXED_USE": return 40;
    case "HOTEL": case "HOSPITALITY": return 50;
    case "INDUSTRIAL": case "WAREHOUSE": return 12;
    case "EDUCATIONAL": case "EDUCATION": return 12;
    case "HEALTHCARE": return 18;
    case "AGRICULTURAL": case "AGRICULTURE": return 6;
    default: return 20;
  }
}

interface Feature {
  type: "Feature";
  geometry: GeoJSON.Geometry;
  properties: Record<string, unknown>;
}

function processDdaDir(dir: string, out: NodeJS.WritableStream): number {
  const files = readdirSync(dir).filter(f => f.endsWith(".geojson"));
  let count = 0;
  for (const file of files) {
    const fc = JSON.parse(readFileSync(join(dir, file), "utf8")) as GeoJSON.FeatureCollection;
    for (const feat of fc.features) {
      if (!feat.geometry || feat.geometry.type !== "Polygon") continue;
      const p = feat.properties as Record<string, unknown>;
      const plotNumber = (p.PLOT_NUMBER as string) ?? "";
      const mainLandUse = (p.MAIN_LANDUSE as string) ?? "";
      const subLandUse = (p.SUB_LANDUSE as string) ?? "";
      const areaSqm = (p.AREA_SQM as number) ?? 0;
      const areaSqft = (p.AREA_SQFT as number) ?? 0;
      const gfaSqm = (p.GFA_SQM as number) ?? 0;
      const status = (p.CONSTRUCTION_STATUS as string) ?? "";
      const floorsRaw = (p.MAX_HEIGHT_FLOORS as string) ?? "";

      const landUse = parseDdaLandUse(mainLandUse);
      const hasLandUse = landUse != null;
      const color = hasLandUse ? (ZAAHI_LANDUSE_COLOR[landUse] ?? DEFAULT_COLOR) : DEFAULT_COLOR;

      // Height
      let height = 0;
      if (hasLandUse && landUse !== "FUTURE_DEVELOPMENT") {
        const floors = parseDdaFloors(floorsRaw);
        height = floors > 0 ? floors * 3.5 : 0;
        if (height <= 0 && gfaSqm > 0 && areaSqm > 0) {
          height = Math.ceil(gfaSqm / (areaSqm * 0.6)) * 3.5;
        }
        if (height <= 0) height = defaultHeight(landUse);
      }

      const enriched: Feature = {
        type: "Feature",
        geometry: feat.geometry,
        properties: {
          plotNumber,
          mainLandUse,
          subLandUse,
          areaSqm: Math.round(areaSqm),
          areaSqft: Math.round(areaSqft),
          gfaSqm: Math.round(gfaSqm),
          status,
          landUse: landUse ?? "",
          color,
          height: Math.round(height),
          hasLandUse,
          source: "dda",
        },
      };
      out.write(JSON.stringify(enriched) + "\n");
      count++;
    }
  }
  return count;
}

function processAdDir(dir: string, out: NodeJS.WritableStream): number {
  const files = readdirSync(dir).filter(f => f.endsWith(".geojson"));
  let count = 0;
  for (const file of files) {
    const fc = JSON.parse(readFileSync(join(dir, file), "utf8")) as GeoJSON.FeatureCollection;
    for (const feat of fc.features) {
      if (!feat.geometry || feat.geometry.type !== "Polygon") continue;
      const p = feat.properties as Record<string, unknown>;
      const plotNumber = (p.PLOTNUMBER as string) ?? "";
      const district = (p.DISTRICTENG as string) ?? "";
      const community = (p.COMMUNITYENG as string) ?? "";
      const areaSqm = (p.CALCULATEDAREA as number) ?? 0;
      const primaryUse = (p.PRIMARYUSEENGDESC as string) ?? "";
      const devCategory = (p.DevCode_Category as string) ?? "";
      const status = (p.Construction_Status as string) ?? "";
      const maxHeightStr = (p.MAXALLOWABLEHEIGHTS as string) ?? "";
      const maxGfa = (p.DevCode_MaxGFA as number) ?? 0;

      const landUse = parseAdLandUse(primaryUse) ?? parseAdLandUse(devCategory);
      const hasLandUse = landUse != null;
      const color = hasLandUse ? (ZAAHI_LANDUSE_COLOR[landUse] ?? DEFAULT_COLOR) : DEFAULT_COLOR;

      let height = 0;
      if (hasLandUse && landUse !== "FUTURE_DEVELOPMENT") {
        const heightM = parseFloat(maxHeightStr);
        height = !isNaN(heightM) && heightM > 0 && heightM < 500 ? heightM : 0;
        if (height <= 0 && maxGfa > 0 && areaSqm > 0) {
          height = Math.ceil(maxGfa / (areaSqm * 0.6)) * 3.5;
        }
        if (height <= 0) height = defaultHeight(landUse);
        if (height > 300) height = 300;
      }

      const enriched: Feature = {
        type: "Feature",
        geometry: feat.geometry,
        properties: {
          plotNumber,
          district,
          community,
          areaSqm: Math.round(areaSqm),
          primaryUse,
          status,
          landUse: landUse ?? "",
          color,
          height: Math.round(height),
          hasLandUse,
          source: "ad",
        },
      };
      out.write(JSON.stringify(enriched) + "\n");
      count++;
    }
  }
  return count;
}

async function main() {
  const ddaDir = join(process.cwd(), "data", "layers", "dda-plots");
  const adDir = join(process.cwd(), "data", "layers", "ad-plots");
  const ddaOut = join(process.cwd(), "data", "tiles", "dda-plots.geojson.nl");
  const adOut = join(process.cwd(), "data", "tiles", "ad-plots.geojson.nl");

  console.log("Processing DDA plots...");
  const ddaStream = createWriteStream(ddaOut);
  const ddaCount = processDdaDir(ddaDir, ddaStream);
  ddaStream.end();
  console.log(`  ${ddaCount.toLocaleString()} features → ${ddaOut}`);

  console.log("Processing AD plots...");
  const adStream = createWriteStream(adOut);
  const adCount = processAdDir(adDir, adStream);
  adStream.end();
  console.log(`  ${adCount.toLocaleString()} features → ${adOut}`);

  console.log(`\nDone! Run tippecanoe next.`);
}

main().catch((e) => { console.error(e); process.exit(1); });
