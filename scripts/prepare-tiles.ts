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
import { readdirSync, readFileSync, createWriteStream, existsSync } from "node:fs";
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

// Map Oman Muscat Municipality PLOTUSAGECD (integer 0-11) to ZAAHI
// canonical land use categories. Codes verified from the Muscat
// geoportal; mapping to the 9 canonical categories follows the same
// scheme as DDA and AD (GIS.OM → RESIDENTIAL/COMMERCIAL/etc.).
//
//   0  = Undefined
//   1  = Commercial
//   2  = Residential
//   3  = Industrial
//   4  = Mixed Use (Commercial-Residential)
//   5  = Agricultural
//   6  = Government / Public / Utilities
//   7  = Educational
//   8  = Healthcare
//   9  = Tourism / Hotel / Recreational
//   10 = Infrastructure / Open space
//   11 = Religious / Mosque
function parseOmanLandUse(code: number | null | undefined): string | null {
  if (code == null) return null;
  switch (code) {
    case 1: return "COMMERCIAL";
    case 2: return "RESIDENTIAL";
    case 3: return "INDUSTRIAL";
    case 4: return "MIXED_USE";
    case 5: return "AGRICULTURAL";
    case 7: return "EDUCATIONAL";
    case 8: return "HEALTHCARE";
    case 9: return "HOTEL";
    default: return null; // 0/6/10/11 = utilities/government/open/religious → no 3D
  }
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

/**
 * Emit one flat 2D feature + 1-3 tier extrusion features for a plot.
 *
 * Setback (inset) is applied ONLY to tier features (podium/body/crown)
 * via the optional `insetRing` parameter. The flat feature always uses
 * the original plot polygon so the 2D plot footprint at zoom 10-13
 * stays at full plot boundary. When `insetRing` is missing (e.g. tiny
 * plot dropped during shapely buffer, or the inset directory wasn't
 * pre-built), tier features fall back to the original ring — same
 * "small-plot bypass" semantics as ZAAHI Signature in loadZaahiPlots.
 */
function emitTiers(
  out: NodeJS.WritableStream,
  ring: number[][],
  insetRing: number[][] | undefined,
  totalH: number,
  color: string,
  baseProps: Record<string, unknown>,
): number {
  let count = 0;

  // Always emit the flat 2D feature (height=0, base=0) using the FULL
  // plot polygon — at zoom 10-13 plot footprints should match real
  // cadastral boundaries.
  const flat: TierFeature = {
    type: "Feature",
    geometry: { type: "Polygon", coordinates: [ring] },
    properties: { ...baseProps, color, height: 0, base: 0, tier: "flat" },
  };
  out.write(JSON.stringify(flat) + "\n");
  count++;

  if (totalH <= 0) return count;

  // Tier features use the pre-baked inset (3m perpendicular buffer
  // produced by scripts/inset-geojson.py). Fallback to the original
  // ring keeps the pipeline robust if the inset prepass wasn't run.
  const baseRing = insetRing ?? ring;

  const floors = Math.max(1, Math.round(totalH / FLOOR_H));

  if (floors <= 4) {
    // Podium only — full inset footprint
    const f: TierFeature = {
      type: "Feature",
      geometry: { type: "Polygon", coordinates: [baseRing] },
      properties: { ...baseProps, color, height: Math.round(totalH), base: 0, tier: "podium" },
    };
    out.write(JSON.stringify(f) + "\n");
    count++;
  } else if (floors <= 10) {
    // Podium (0→14m) + Body (14→top, 70% footprint)
    out.write(JSON.stringify({
      type: "Feature",
      geometry: { type: "Polygon", coordinates: [baseRing] },
      properties: { ...baseProps, color, height: PODIUM_TOP, base: 0, tier: "podium" },
    }) + "\n");
    out.write(JSON.stringify({
      type: "Feature",
      geometry: { type: "Polygon", coordinates: [scaleRingFromCentroid(baseRing, 0.7)] },
      properties: { ...baseProps, color, height: Math.round(totalH), base: PODIUM_TOP, tier: "body" },
    }) + "\n");
    count += 2;
  } else {
    // Full ZAAHI Signature: Podium + Body + Crown
    const crownBase = Math.round(totalH - CROWN_H);
    out.write(JSON.stringify({
      type: "Feature",
      geometry: { type: "Polygon", coordinates: [baseRing] },
      properties: { ...baseProps, color, height: PODIUM_TOP, base: 0, tier: "podium" },
    }) + "\n");
    out.write(JSON.stringify({
      type: "Feature",
      geometry: { type: "Polygon", coordinates: [scaleRingFromCentroid(baseRing, 0.7)] },
      properties: { ...baseProps, color, height: crownBase, base: PODIUM_TOP, tier: "body" },
    }) + "\n");
    out.write(JSON.stringify({
      type: "Feature",
      geometry: { type: "Polygon", coordinates: [scaleRingFromCentroid(baseRing, 0.5)] },
      properties: { ...baseProps, color, height: Math.round(totalH), base: crownBase, tier: "crown" },
    }) + "\n");
    count += 3;
  }

  return count;
}

/**
 * Build an in-memory lookup: composite-key → inset polygon ring.
 *
 * Reads every *.geojson file in `dir` (produced by
 * scripts/inset-geojson.py) and indexes the first ring of each
 * Polygon feature by `keyFn(properties)`. Returns an empty Map if
 * `dir` doesn't exist (graceful — the rest of the pipeline still
 * works without insets, just without setback).
 *
 * Key-builder pattern: DDA's PLOT_NUMBER is globally unique
 * (7-digit DDA id) so `String(p.PLOT_NUMBER)` works. AD's PLOTNUMBER
 * is sequential within a community (each community has plots 1,2,3…)
 * so a composite "DISTRICT|COMMUNITY|PLOTNUMBER" key is needed.
 * Oman uses NEWPLOTNO (string-unique).
 *
 * Memory: ~200 MB for 433K plots × ~30 vertices, fine on a build box.
 */
function loadInsetIndex(
  dir: string,
  keyFn: (props: Record<string, unknown>) => string,
): Map<string, number[][]> {
  const idx = new Map<string, number[][]>();
  if (!existsSync(dir)) return idx;
  for (const file of readdirSync(dir).filter((f) => f.endsWith(".geojson"))) {
    const fc = JSON.parse(readFileSync(join(dir, file), "utf8")) as GeoJSON.FeatureCollection;
    for (const feat of fc.features) {
      if (!feat.geometry || feat.geometry.type !== "Polygon") continue;
      const key = keyFn(feat.properties as Record<string, unknown>);
      if (!key) continue;
      idx.set(key, (feat.geometry as GeoJSON.Polygon).coordinates[0]);
    }
  }
  return idx;
}

// Per-dataset key builders. Used both at index time (loadInsetIndex)
// and at lookup time (processXDir) so they MUST stay in sync.
const ddaKey = (p: Record<string, unknown>) => String(p.PLOT_NUMBER ?? "");
const adKey = (p: Record<string, unknown>) =>
  `${p.DISTRICTENG ?? ""}|${p.COMMUNITYENG ?? ""}|${p.PLOTNUMBER ?? ""}`;
const omanKey = (p: Record<string, unknown>) =>
  String(p.NEWPLOTNO ?? p.PLOTNO ?? "");

// ── Process directories ──

function processDdaDir(
  dir: string,
  insetIndex: Map<string, number[][]>,
  out: NodeJS.WritableStream,
): number {
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

      count += emitTiers(out, ring, insetIndex.get(ddaKey(p)), height, color, baseProps);
    }
  }
  return count;
}

function processAdDir(
  dir: string,
  insetIndex: Map<string, number[][]>,
  admOut: NodeJS.WritableStream,
  otherOut: NodeJS.WritableStream,
): { admCount: number; otherCount: number } {
  const files = readdirSync(dir).filter(f => f.endsWith(".geojson"));
  let admCount = 0;
  let otherCount = 0;
  for (const file of files) {
    const fc = JSON.parse(readFileSync(join(dir, file), "utf8")) as GeoJSON.FeatureCollection;
    for (const feat of fc.features) {
      if (!feat.geometry || feat.geometry.type !== "Polygon") continue;
      const p = feat.properties as Record<string, unknown>;
      const plotNumber = (p.PLOTNUMBER as string) ?? "";
      const district = (p.DISTRICTENG as string) ?? "";
      const community = (p.COMMUNITYENG as string) ?? "";
      const municipality = (p.MUNICIPALITYENG as string) ?? "";
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
        // PRIMARY: GFA-derived per-plot (mirrors Dubai fallback). Works on ADM
        // mainland where DevCode_MaxGFA + CALCULATEDAREA are populated (~82%).
        if (maxGfa > 0 && areaSqm > 0) {
          height = Math.ceil(maxGfa / (areaSqm * 0.6)) * 3.5;
        }
        // FALLBACK: land-use defaults (shared helper). Catches Saadiyat / Reem /
        // Al Ain / Western Region where DevCode_MaxGFA is missing.
        if (height <= 0) height = defaultHeight(landUse);
        // CEILING: MAXALLOWABLEHEIGHTS is the regulatory zoning cap, not the
        // target. Clamp unrealistically tall GFA-derived heights to it.
        const maxAllowableM = parseFloat(maxHeightStr);
        if (!isNaN(maxAllowableM) && maxAllowableM > 0 && maxAllowableM < 500 && height > maxAllowableM) {
          height = maxAllowableM;
        }
        if (height > 300) height = 300;
      }

      const ring = (feat.geometry as GeoJSON.Polygon).coordinates[0];
      const baseProps = {
        plotNumber,
        district,
        community,
        municipality,
        areaSqm: Math.round(areaSqm),
        primaryUse,
        status,
        landUse: landUse ?? "",
        hasLandUse,
        source: "ad",
      };

      // Split by municipality to keep each PMTiles < 100MB:
      //   ADM (Abu Dhabi Municipality) → ad-plots-adm.geojson.nl
      //   AAM (Al Ain) + WRM (Western Region) + other → ad-plots-other.geojson.nl
      const insetRing = insetIndex.get(adKey(p));
      if (municipality === "ADM") {
        emitTiers(admOut, ring, insetRing, height, color, baseProps);
        admCount++;
      } else {
        emitTiers(otherOut, ring, insetRing, height, color, baseProps);
        otherCount++;
      }
    }
  }
  return { admCount, otherCount };
}

// ── Oman (Muscat Municipality — Seeb contract) ─────────────────────
// Source: https://geoportal.mm.gov.om/.../MUSCAT.Plots (MapServer/11).
// 94,640 plots, already returned as WGS84 GeoJSON by the server.
// Oman insetting isn't wired yet — pass an empty index until the
// shapely prepass runs against the Oman dir.
function processOmanDir(
  dir: string,
  insetIndex: Map<string, number[][]>,
  out: NodeJS.WritableStream,
): number {
  const files = readdirSync(dir).filter(f => f.endsWith(".geojson"));
  let count = 0;
  for (const file of files) {
    const fc = JSON.parse(readFileSync(join(dir, file), "utf8")) as GeoJSON.FeatureCollection;
    for (const feat of fc.features) {
      if (!feat.geometry || feat.geometry.type !== "Polygon") continue;
      const p = feat.properties as Record<string, unknown>;
      const plotNumber = String((p.NEWPLOTNO as string | number | null) ?? (p.PLOTNO as string | number | null) ?? "");
      const plotUid = String((p.PLOTUID as string | number | null) ?? "");
      const wilayat = (p.WILAYATNAME_E as string) ?? "";
      const community = (p.NEWHOUSINGAREANAME_E as string) ?? "";
      const phase = (p.NEWPHASESNAME_E as string) ?? "";
      const areaSqm = Number((p.PLOTAREA as number) ?? 0);
      const usageCode = (p.PLOTUSAGECD as number) ?? null;
      const flag = (p.FLAG as string) ?? "";
      const permitType = (p.PERMITTYPE as string) ?? "";
      const permitYear = (p.PERMITYEAR as number) ?? null;

      const landUse = parseOmanLandUse(usageCode);
      const hasLandUse = landUse != null;
      const color = hasLandUse ? (ZAAHI_LANDUSE_COLOR[landUse] ?? DEFAULT_COLOR) : DEFAULT_COLOR;

      // Height — Oman's dataset has no maxHeight/floors. Use land-use
      // defaults. Residential in Muscat is mostly villas (G+1 ~ 8m).
      let height = 0;
      if (hasLandUse && landUse !== "FUTURE_DEVELOPMENT") {
        switch (landUse) {
          case "RESIDENTIAL": height = 8; break;  // typical Muscat villa G+1
          case "COMMERCIAL": height = 20; break;
          case "MIXED_USE": height = 28; break;
          case "HOTEL": height = 30; break;
          case "INDUSTRIAL": height = 12; break;
          case "EDUCATIONAL": height = 12; break;
          case "HEALTHCARE": height = 18; break;
          case "AGRICULTURAL": height = 6; break;
          default: height = 10;
        }
      }

      // Human-readable label for the hover popup. Falls back to
      // "Plot use {code}" when the canonical map didn't recognise the code.
      const mainLandUse = landUse
        ? landUse.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase())
        : usageCode != null ? `Use code ${usageCode}` : "";
      const status = permitType
        ? `${permitType}${permitYear ? ` permit ${permitYear}` : ""}`
        : "";

      const ring = (feat.geometry as GeoJSON.Polygon).coordinates[0];
      const baseProps = {
        plotNumber,
        plotUid,
        wilayat,
        community,
        phase,
        areaSqm: Math.round(areaSqm),
        usageCode: usageCode ?? -1,
        flag,
        permitType,
        permitYear: permitYear ?? 0,
        landUse: landUse ?? "",
        hasLandUse,
        source: "oman",
        // Compatibility fields for the shared hover popup
        // (mainLandUse, gfaSqm, status — same shape as DDA/AD).
        mainLandUse,
        gfaSqm: 0,
        status,
      };

      count += emitTiers(out, ring, insetIndex.get(omanKey(p)), height, color, baseProps);
    }
  }
  return count;
}

async function main() {
  const ddaDir = join(process.cwd(), "data", "layers", "dda-plots");
  const adDir = join(process.cwd(), "data", "layers", "ad-plots");
  const omanDir = join(process.cwd(), "data", "layers", "oman-plots");
  const ddaOut = join(process.cwd(), "data", "tiles", "dda-plots.geojson.nl");
  const adAdmOut = join(process.cwd(), "data", "tiles", "ad-plots-adm.geojson.nl");
  const adOtherOut = join(process.cwd(), "data", "tiles", "ad-plots-other.geojson.nl");
  const omanOut = join(process.cwd(), "data", "tiles", "oman-plots.geojson.nl");

  // Inset polygon directories — produced by scripts/inset-geojson.py.
  // If missing the pipeline still works; tier features fall back to
  // the full plot polygon (= no setback for that plot).
  const ddaInsetDir = join(process.cwd(), "data", "layers-inset", "dda-plots");
  const adInsetDir = join(process.cwd(), "data", "layers-inset", "ad-plots");
  const omanInsetDir = join(process.cwd(), "data", "layers-inset", "oman-plots");

  console.log("Loading inset polygon indices...");
  const ddaInset = loadInsetIndex(ddaInsetDir, ddaKey);
  const adInset = loadInsetIndex(adInsetDir, adKey);
  const omanInset = loadInsetIndex(omanInsetDir, omanKey);
  console.log(`  DDA inset: ${ddaInset.size.toLocaleString()} plots`);
  console.log(`  AD inset:  ${adInset.size.toLocaleString()} plots`);
  console.log(`  Oman inset: ${omanInset.size.toLocaleString()} plots`);

  console.log("Processing DDA plots (with podium/body/crown tiers)...");
  const ddaStream = createWriteStream(ddaOut);
  const ddaCount = processDdaDir(ddaDir, ddaInset, ddaStream);
  ddaStream.end();
  console.log(`  ${ddaCount.toLocaleString()} features → ${ddaOut}`);

  console.log("Processing AD plots (split by municipality for <100MB PMTiles)...");
  const adAdmStream = createWriteStream(adAdmOut);
  const adOtherStream = createWriteStream(adOtherOut);
  const { admCount, otherCount } = processAdDir(adDir, adInset, adAdmStream, adOtherStream);
  adAdmStream.end();
  adOtherStream.end();
  console.log(`  ADM (Abu Dhabi Municipality): ${admCount.toLocaleString()} plots → ${adAdmOut}`);
  console.log(`  AAM+WRM (Al Ain + Western):   ${otherCount.toLocaleString()} plots → ${adOtherOut}`);

  console.log("Processing Oman plots (Muscat — Seeb contract, all wilayats)...");
  const omanStream = createWriteStream(omanOut);
  const omanCount = processOmanDir(omanDir, omanInset, omanStream);
  omanStream.end();
  console.log(`  ${omanCount.toLocaleString()} features → ${omanOut}`);

  console.log(`\nDone! Run tippecanoe next.`);
}

main().catch((e) => { console.error(e); process.exit(1); });
