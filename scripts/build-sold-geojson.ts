/**
 * Build sold-plots.geojson from DLD transactions CSV + community KML.
 * Each land sale → point at community polygon centroid (±100m jitter).
 * Only includes sales that match a community in the KML.
 *
 * Run: npx tsx scripts/build-sold-geojson.ts
 */
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();

// ── CSV parser (handles quoted fields) ─────────────────────────────
function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') { inQuotes = !inQuotes; continue; }
    if (ch === "," && !inQuotes) { result.push(current.trim()); current = ""; continue; }
    current += ch;
  }
  result.push(current.trim());
  return result;
}

// ── Parse community polygons from KML ──────────────────────────────
// KML uses <SimpleData name="CNAME_E"> for community name and
// <coordinates> blocks for polygon rings.
function parseCommunityPolygons(kml: string): Map<string, [number, number]> {
  const centroids = new Map<string, [number, number]>();

  // Split by Placemark
  const placemarks = kml.split(/<Placemark[\s>]/i).slice(1);
  for (const pm of placemarks) {
    // Extract CNAME_E
    const nameM = pm.match(/<SimpleData name="CNAME_E">([^<]+)<\/SimpleData>/i);
    if (!nameM) continue;
    const name = nameM[1].trim().toUpperCase().replace(/\s+/g, " ");

    // Extract all coordinate blocks
    const coordsBlocks = pm.match(/<coordinates>([^<]+)<\/coordinates>/gi);
    if (!coordsBlocks) continue;

    // Compute centroid from all coordinate points
    let sumLng = 0, sumLat = 0, count = 0;
    for (const block of coordsBlocks) {
      const inner = block.replace(/<\/?coordinates>/gi, "").trim();
      for (const pair of inner.split(/\s+/)) {
        const parts = pair.split(",");
        const lng = parseFloat(parts[0]);
        const lat = parseFloat(parts[1]);
        if (isFinite(lng) && isFinite(lat)) {
          sumLng += lng;
          sumLat += lat;
          count++;
        }
      }
    }
    if (count > 0) {
      centroids.set(name, [sumLng / count, sumLat / count]);
    }
  }
  return centroids;
}

// CSV AREA_EN → KML CNAME_E aliases (different naming conventions)
const ALIASES: Record<string, string> = {
  "AL YELAYISS 5": "AL YALAYIS 5",
  "AL YELAYISS 1": "AL YALAYIS 1",
  "NAD AL SHIBA FIRST": "NADD AL SHIBA FIRST",
  "NAD AL SHIBA THIRD": "NADD AL SHIBA THIRD",
  "NAD AL HAMAR": "NADD AL HAMAR",
  "PALM JABAL ALI": "NAKHLAT JABAL ALI",
  "PALM JUMEIRAH": "NAKHLAT JUMEIRA",
  "PALM DEIRA": "NAKHLAT DEIRA",
  "DAMAC HILLS": "AL HEBIAH THIRD",
  "JABEL ALI HILLS": "JABAL ALI FIRST",
  "ARABIAN RANCHES I": "WADI AL SAFA 5",
  "ARABIAN RANCHES II": "WADI AL SAFA 5",
  "JUMEIRAH PARK": "AL THANYAH THIRD",
  "AL FURJAN": "AL THANYAH FOURTH",
  "JUMEIRAH VILLAGE TRIANGLE": "AL BARSHA SOUTH FOURTH",
  "JUMEIRAH VILLAGE CIRCLE": "AL BARSHA SOUTH FIFTH",
  "DUBAI HILLS": "AL HEBIAH FOURTH",
  "MUDON": "AL HEBIAH FIFTH",
  "EMIRATE LIVING": "AL THANYAH FOURTH",
  "JUMEIRAH GOLF": "AL THANYAH THIRD",
  "THE VILLA": "WADI AL SAFA 5",
  "DUBAI INDUSTRIAL CITY": "JABAL ALI INDUSTRIAL THIRD",
  "JUMEIRAH ISLANDS": "AL THANYAH FIFTH",
  "UM SUQAIM FIRST": "UMM SUQEIM FIRST",
  "INTERNATIONAL CITY PH 2 & 3": "WARSAN SECOND",
  "INTERNATIONAL CITY PH 1": "WARSAN SECOND",
  "DUBAI SPORTS CITY": "AL HEBIAH THIRD",
  "NAD AL SHEBA GARDENS": "NADD AL SHIBA SECOND",
  "LIVING LEGENDS": "WADI AL SAFA 5",
  "AL BARARI": "AL BARSHA SOUTH FIRST",
  "SILICON OASIS": "AL ROWAIYAH FIRST",
  "SAMA AL JADAF": "AL JADAF",
  "DUBAI PRODUCTION CITY": "AL THANYAH FIFTH",
  "AL WAHA": "AL MERKADH",
  "AL MAMZER": "AL MAMZAR",
  "MBR DISTRICT 1": "NADD AL SHIBA FIRST",
  "MAJAN": "AL HEBIAH FIFTH",
  "SUFOUH GARDENS": "AL BARSHA SOUTH FIRST",
  "THE LAKES": "AL THANYAH THIRD",
  "DUBAI SCIENCE PARK": "AL BARSHA SOUTH FOURTH",
  "LA MER": "JUMEIRA SECOND",
  "SOBHA HEARTLAND": "NADD AL SHIBA FIRST",
  "AL KHAWANEEJ FIRST": "AL HEBIAH FIRST",
  "FALCON CITY OF WONDERS": "WADI AL SAFA 5",
  "HORIZON": "AL HEBIAH FIFTH",
  "LIWAN 2": "AL HEBIAH FIFTH",
  "PEARL JUMEIRA": "JUMEIRA FIRST",
  "EMAAR SOUTH": "JABAL ALI THIRD",
  "AL WARSAN SECOND": "WARSAN SECOND",
  "DISCOVERY GARDENS": "AL THANYAH FIRST",
  "TILAL AL GHAF": "AL HEBIAH FIFTH",
  "BUKADRA": "RAS AL KHOR",
  "DOWN TOWN JABAL ALI": "JABAL ALI FIRST",
  "POLO TOWNHOUSES IGO": "WADI AL SAFA 5",
  "DUBAI HEALTHCARE CITY - PHASE 1": "UMM HURAIR SECOND",
  "LIWAN": "AL HEBIAH FIFTH",
  "DUBAI SOUTH": "JABAL ALI THIRD",
  "BARSHA HEIGHTS": "AL BARSHA SOUTH FIRST",
  "JUMEIRAH LAKES TOWERS": "AL THANYAH FIFTH",
  "ARJAN": "AL BARSHA SOUTH FOURTH",
  "DUBAI STUDIO CITY": "AL HEBIAH THIRD",
  "ARABIAN RANCHES POLO CLUB": "WADI AL SAFA 5",
  "MILLENNIUM": "AL HEBIAH FIFTH",
  "AL QUSAIS INDUSTRIAL FIFTH": "AL QUSAIS IND. FIFTH",
  "JADDAF WATERFRONT": "AL JADAF",
  "AL QUSAIS INDUSTRIAL FOURTH": "AL QUSAIS IND. FOURTH",
  "VILLANOVA": "WADI AL SAFA 5",
  "DUBAI WATER FRONT": "JABAL ALI SECOND",
  "AL GOZE THIRD": "AL BARSHA FIRST",
  "GRAND VIEWS": "AL HEBIAH FIFTH",
  "MEDYAN RACE COURSE VILLAS": "NADD AL SHIBA FIRST",
  "JUMEIRAH FIRST": "JUMEIRA FIRST",
  "DUBAI GOLF CITY": "AL HEBIAH FOURTH",
  "GARDEN VIEW": "AL HEBIAH FIFTH",
  "DUBAI LAND RESIDENCE COMPLEX": "WADI AL SAFA 3",
};

// ±100m jitter (~0.001°)
function jitter(): number {
  return (Math.random() - 0.5) * 0.002;
}

async function main() {
  // Parse KML communities
  const kmlPath = join(ROOT, "data", "layers", "Community__1_.kml");
  const kml = readFileSync(kmlPath, "utf8");
  const communityCoords = parseCommunityPolygons(kml);
  console.log(`Parsed ${communityCoords.size} communities from KML`);

  // Parse transactions CSV
  const csvRaw = readFileSync(join(ROOT, "data", "dld-transactions.csv"), "utf8")
    .replace(/^\uFEFF/, "");
  const lines = csvRaw.split("\n").filter(l => l.trim());
  const headers = parseCsvLine(lines[0]);

  // Build name→index lookup
  const col: Record<string, number> = {};
  headers.forEach((h, i) => { col[h] = i; });

  const features: GeoJSON.Feature[] = [];
  let matched = 0, unmatched = 0;
  const unmatchedAreas = new Map<string, number>();

  for (let i = 1; i < lines.length; i++) {
    const vals = parseCsvLine(lines[i]);
    const propType = vals[col.PROP_TYPE_EN] || "";
    const group = vals[col.GROUP_EN] || "";

    // Only land sales
    if (propType !== "Land" || group !== "Sales") continue;

    const areaName = (vals[col.AREA_EN] || "").trim().toUpperCase();

    // Match to KML community — exact match, then alias lookup
    const coords = communityCoords.get(areaName) ?? communityCoords.get(ALIASES[areaName] ?? "");
    if (!coords) {
      unmatched++;
      unmatchedAreas.set(areaName, (unmatchedAreas.get(areaName) || 0) + 1);
      continue;
    }

    matched++;
    const [lng, lat] = coords;
    const transValue = parseFloat(vals[col.TRANS_VALUE]) || 0;
    const actualArea = parseFloat(vals[col.ACTUAL_AREA]) || 0;
    const pricePerSqm = actualArea > 0 ? Math.round(transValue / actualArea) : 0;
    const pricePerSqft = actualArea > 0 ? Math.round(transValue / (actualArea * 10.764)) : 0;

    features.push({
      type: "Feature",
      geometry: {
        type: "Point",
        coordinates: [lng + jitter(), lat + jitter()],
      },
      properties: {
        transactionNumber: vals[col.TRANSACTION_NUMBER] || "",
        date: (vals[col.INSTANCE_DATE] || "").slice(0, 10),
        community: vals[col.AREA_EN] || "",
        usage: vals[col.USAGE_EN] || "",
        areaSqm: actualArea,
        areaSqft: Math.round(actualArea * 10.764),
        priceAed: transValue,
        pricePerSqm,
        pricePerSqft,
        freehold: vals[col.IS_FREE_HOLD_EN] === "Free Hold",
        masterProject: vals[col.MASTER_PROJECT_EN] || "",
        project: vals[col.PROJECT_EN] || "",
      },
    });
  }

  const fc: GeoJSON.FeatureCollection = { type: "FeatureCollection", features };
  const outPath = join(ROOT, "data", "sold-plots.geojson");
  writeFileSync(outPath, JSON.stringify(fc));

  console.log(`\nGenerated ${outPath}`);
  console.log(`  Matched: ${matched} land sales (aligned to KML communities)`);
  console.log(`  Skipped: ${unmatched} (community not in KML)`);
  if (unmatchedAreas.size > 0) {
    const sorted = [...unmatchedAreas.entries()].sort((a, b) => b[1] - a[1]);
    console.log(`  Unmatched communities (${unmatchedAreas.size}):`);
    for (const [name, count] of sorted) {
      console.log(`    ${count.toString().padStart(4)} × ${name}`);
    }
  }
}

main().catch(console.error);
