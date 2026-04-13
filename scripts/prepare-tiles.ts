#!/usr/bin/env npx tsx
/**
 * Enrich DDA + AD plot GeoJSON with ZAAHI Signature 3D tiers
 * (podium / body / crown) and output newline-delimited GeoJSON for tippecanoe.
 *
 * Each buildable plot produces:
 *   - 1 "flat" feature (height=0) for 2D fill/line/hover at all zooms
 *   - 1–3 "tier" features with height/base for fill-extrusion at zoom ≥ 14
 *
 * Usage:
 *   npx tsx scripts/prepare-tiles.ts
 *   tippecanoe -o public/tiles/dda-land.pmtiles ...
 */
import { readdirSync, readFileSync, createWriteStream } from "node:fs";
import { join } from "node:path";

const ZAAHI_LANDUSE_COLOR: Record<string, string> = {
  RESIDENTIAL: "#2D6A4F",
  COMMERCIAL: "#1B4965",
  MIXED_USE: "#6B4C9A",
  HOTEL: "#9B2226",
  HOSPITALITY: "#9B2226",
  INDUSTRIAL: "#495057",
  WAREHOUSE: "#495057",
  EDUCATIONAL: "#0077B6",
  EDUCATION: "#0077B6",
  HEALTHCARE: "#E63946",
  AGRICULTURAL: "#606C38",
  AGRICULTURE: "#606C38",
  FUTURE_DEVELOPMENT: "#C8A96E",
  "FUTURE DEVELOPMENT": "#C8A96E",
};
const DEFAULT_COLOR = "#888888";

// ── 3D tier constants (same as loadZaahiPlots in page.tsx) ──
const FLOOR_H = 3.5;
const PODIUM_TOP = 14;   // 4 floors
const CROWN_H = 7;       // top 2 floors

// ── Geometry helpers ──

function scaleRingFromCentroid(ring: number[][], scale: number): number[][] {
  const n = ring.length;
  if (n === 0) return ring;
  const cx = ring.reduce((s, p) => s + p[0], 0) / n;
  const cy = ring.reduce((s, p) => s + p[1], 0) / n;
  return ring.map(([lng, lat]) => [
    cx + (lng - cx) * scale,
    cy + (lat - cy) * scale,
  ]);
}

// ── Land use parsers ──

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

// ── Tier generation ──
// Emits 1 flat feature (for 2D fill/hover) + 1-3 tier features (for 3D extrusion)

interface TierFeature {
  type: "Feature";
  geometry: GeoJSON.Geometry;
  properties: Record<string, unknown>;
}

function emitTiers(
  out: NodeJS.WritableStream,
  ring: number[][],
  totalH: number,
  color: string,
  baseProps: Record<string, unknown>,
): number {
  let count = 0;

  // Always emit the flat 2D feature (height=0, base=0) for fill/line/hover
  const flat: TierFeature = {
    type: "Feature",
    geometry: { type: "Polygon", coordinates: [ring] },
    properties: { ...baseProps, color, height: 0, base: 0, tier: "flat" },
  };
  out.write(JSON.stringify(flat) + "\n");
  count++;

  if (totalH <= 0) return count;

  const floors = Math.max(1, Math.round(totalH / FLOOR_H));

  if (floors <= 4) {
    // Podium only — full footprint
    const f: TierFeature = {
      type: "Feature",
      geometry: { type: "Polygon", coordinates: [ring] },
      properties: { ...baseProps, color, height: Math.round(totalH), base: 0, tier: "podium" },
    };
    out.write(JSON.stringify(f) + "\n");
    count++;
  } else if (floors <= 10) {
    // Podium (0→14m) + Body (14→top, 70% footprint)
    out.write(JSON.stringify({
      type: "Feature",
      geometry: { type: "Polygon", coordinates: [ring] },
      properties: { ...baseProps, color, height: PODIUM_TOP, base: 0, tier: "podium" },
    }) + "\n");
    out.write(JSON.stringify({
      type: "Feature",
      geometry: { type: "Polygon", coordinates: [scaleRingFromCentroid(ring, 0.7)] },
      properties: { ...baseProps, color, height: Math.round(totalH), base: PODIUM_TOP, tier: "body" },
    }) + "\n");
    count += 2;
  } else {
    // Full ZAAHI Signature: Podium + Body + Crown
    const crownBase = Math.round(totalH - CROWN_H);
    out.write(JSON.stringify({
      type: "Feature",
      geometry: { type: "Polygon", coordinates: [ring] },
      properties: { ...baseProps, color, height: PODIUM_TOP, base: 0, tier: "podium" },
    }) + "\n");
    out.write(JSON.stringify({
      type: "Feature",
      geometry: { type: "Polygon", coordinates: [scaleRingFromCentroid(ring, 0.7)] },
      properties: { ...baseProps, color, height: crownBase, base: PODIUM_TOP, tier: "body" },
    }) + "\n");
    out.write(JSON.stringify({
      type: "Feature",
      geometry: { type: "Polygon", coordinates: [scaleRingFromCentroid(ring, 0.5)] },
      properties: { ...baseProps, color, height: Math.round(totalH), base: crownBase, tier: "crown" },
    }) + "\n");
    count += 3;
  }

  return count;
}

// ── Process directories ──

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

      let height = 0;
      if (hasLandUse && landUse !== "FUTURE_DEVELOPMENT") {
        const floors = parseDdaFloors(floorsRaw);
        height = floors > 0 ? floors * 3.5 : 0;
        if (height <= 0 && gfaSqm > 0 && areaSqm > 0) {
          height = Math.ceil(gfaSqm / (areaSqm * 0.6)) * 3.5;
        }
        if (height <= 0) height = defaultHeight(landUse);
      }

      const ring = (feat.geometry as GeoJSON.Polygon).coordinates[0];
      const baseProps = {
        plotNumber,
        mainLandUse,
        subLandUse,
        areaSqm: Math.round(areaSqm),
        areaSqft: Math.round(areaSqft),
        gfaSqm: Math.round(gfaSqm),
        status,
        landUse: landUse ?? "",
        hasLandUse,
        source: "dda",
      };

      count += emitTiers(out, ring, height, color, baseProps);
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

      const ring = (feat.geometry as GeoJSON.Polygon).coordinates[0];
      const baseProps = {
        plotNumber,
        district,
        community,
        areaSqm: Math.round(areaSqm),
        primaryUse,
        status,
        landUse: landUse ?? "",
        hasLandUse,
        source: "ad",
      };

      count += emitTiers(out, ring, height, color, baseProps);
    }
  }
  return count;
}

async function main() {
  const ddaDir = join(process.cwd(), "data", "layers", "dda-plots");
  const adDir = join(process.cwd(), "data", "layers", "ad-plots");
  const ddaOut = join(process.cwd(), "data", "tiles", "dda-plots.geojson.nl");
  const adOut = join(process.cwd(), "data", "tiles", "ad-plots.geojson.nl");

  console.log("Processing DDA plots (with podium/body/crown tiers)...");
  const ddaStream = createWriteStream(ddaOut);
  const ddaCount = processDdaDir(ddaDir, ddaStream);
  ddaStream.end();
  console.log(`  ${ddaCount.toLocaleString()} features → ${ddaOut}`);

  console.log("Processing AD plots (with podium/body/crown tiers)...");
  const adStream = createWriteStream(adOut);
  const adCount = processAdDir(adDir, adStream);
  adStream.end();
  console.log(`  ${adCount.toLocaleString()} features → ${adOut}`);

  console.log(`\nDone! Run tippecanoe next.`);
}

main().catch((e) => { console.error(e); process.exit(1); });
