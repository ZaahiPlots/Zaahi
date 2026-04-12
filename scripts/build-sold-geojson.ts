/**
 * Build sold-plots.geojson from DLD transactions CSV + community KML.
 * Each land sale becomes a point feature at its community centroid,
 * jittered slightly so overlapping sales spread out.
 *
 * Run: npx tsx scripts/build-sold-geojson.ts
 */
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();

// ── Parse communities KML for centroids ────────────────────────────

function parseCommunityNames(kml: string): Map<string, [number, number]> {
  const map = new Map<string, [number, number]>();
  // Extract each Placemark name + coordinates
  const placemarks = kml.split(/<Placemark>/i).slice(1);
  for (const pm of placemarks) {
    const nameM = pm.match(/<name>([^<]+)<\/name>/i);
    if (!nameM) continue;
    const name = nameM[1].trim().toUpperCase();
    // Find all coordinate strings
    const coordsM = pm.match(/<coordinates>([^<]+)<\/coordinates>/gi);
    if (!coordsM) continue;
    // Compute centroid from all coordinate points
    let sumLng = 0, sumLat = 0, count = 0;
    for (const cm of coordsM) {
      const inner = cm.replace(/<\/?coordinates>/gi, "").trim();
      for (const pair of inner.split(/\s+/)) {
        const [lng, lat] = pair.split(",").map(Number);
        if (isFinite(lng) && isFinite(lat)) {
          sumLng += lng;
          sumLat += lat;
          count++;
        }
      }
    }
    if (count > 0) {
      map.set(name, [sumLng / count, sumLat / count]);
    }
  }
  return map;
}

// Known Dubai community coordinates for areas not in KML
const FALLBACK_COORDS: Record<string, [number, number]> = {
  "AL YELAYISS 5": [55.15, 24.95],
  "AL YELAYISS 1": [55.16, 24.96],
  "MADINAT HIND 4": [55.32, 25.18],
  "ME'AISEM SECOND": [55.20, 25.02],
  "ME'AISEM FIRST": [55.19, 25.03],
  "AL HEBIAH FIFTH": [55.16, 24.99],
  "AL HEBIAH THIRD": [55.15, 25.00],
  "AL HEBIAH FOURTH": [55.14, 24.99],
  "MADINAT AL MATAAR": [55.35, 25.24],
  "HADAEQ SHEIKH MOHAMMED BIN RASHID": [55.32, 25.21],
  "WARSAN FOURTH": [55.42, 25.15],
  "WADI AL SAFA 5": [55.27, 25.07],
  "WADI AL SAFA 3": [55.25, 25.08],
  "NAD AL SHIBA FIRST": [55.32, 25.15],
  "NAD AL SHIBA THIRD": [55.30, 25.14],
  "AL YUFRAH 1": [55.17, 24.97],
  "AL YUFRAH 2": [55.18, 24.96],
  "PALM JABAL ALI": [55.01, 25.01],
  "JABAL ALI FIRST": [55.02, 25.03],
  "DUBAI INVESTMENT PARK SECOND": [55.15, 25.01],
  "DUBAI INVESTMENT PARK FIRST": [55.16, 25.02],
  "DAMAC HILLS": [55.23, 25.03],
  "DUBAI HILLS": [55.24, 25.10],
  "ARABIAN RANCHES I": [55.27, 25.06],
  "ARABIAN RANCHES II": [55.28, 25.05],
  "ARABIAN RANCHES III": [55.29, 25.04],
  "JUMEIRAH PARK": [55.16, 25.08],
  "JUMEIRAH GOLF": [55.18, 25.07],
  "JUMEIRAH VILLAGE TRIANGLE": [55.20, 25.06],
  "JUMEIRAH VILLAGE CIRCLE": [55.21, 25.06],
  "MUDON": [55.27, 25.04],
  "EMIRATE LIVING": [55.16, 25.06],
  "AL FURJAN": [55.14, 25.06],
  "THE VILLA": [55.28, 25.06],
  "JABEL ALI HILLS": [55.10, 25.04],
  "DUBAI SPORTS CITY": [55.22, 25.04],
  "SOBHA HEARTLAND": [55.30, 25.09],
  "SILICON OASIS": [55.38, 25.12],
  "TOWN SQUARE": [55.27, 25.03],
  "TILAL AL GHAF": [55.24, 25.04],
  "LIVING LEGENDS": [55.26, 25.06],
  "RUKAN": [55.27, 25.02],
  "THE VALLEY": [55.35, 25.05],
  "VILLANOVA": [55.28, 25.03],
  "MOTOR CITY": [55.23, 25.05],
  "SUSTAINABLE CITY": [55.29, 25.07],
  "AL BARSHA SOUTH FOURTH": [55.21, 25.09],
  "MEYDAN": [55.31, 25.16],
  "BUSINESS BAY": [55.27, 25.18],
  "DOWNTOWN DUBAI": [55.28, 25.20],
  "DUBAI MARINA": [55.14, 25.08],
  "PALM JUMEIRAH": [55.14, 25.12],
  "CITY WALK": [55.26, 25.21],
  "LA MER": [55.26, 25.23],
  "DUBAI CREEK HARBOUR": [55.35, 25.20],
  "MBR CITY": [55.32, 25.14],
  "DUBAI SOUTH": [55.17, 24.89],
  "SERENA": [55.27, 25.02],
  "CHERRYWOODS": [55.29, 25.04],
  "AL KHAWANEEJ FIRST": [55.43, 25.27],
  "AL KHAWANEEJ SECOND": [55.46, 25.26],
  "AL BARARI": [55.31, 25.12],
  "AL GOZE THIRD": [55.22, 25.14],
  "AL MAMZER": [55.34, 25.28],
  "AL MERKADH": [55.28, 25.06],
  "AL QUSAIS INDUSTRIAL FIFTH": [55.40, 25.26],
  "AL QUSAIS INDUSTRIAL FOURTH": [55.39, 25.26],
  "AL ROWAIYAH FIRST": [55.40, 25.15],
  "AL SATWA": [55.27, 25.22],
  "AL THANYAH FIFTH": [55.18, 25.10],
  "AL WAHA": [55.25, 25.05],
  "AL WARSAN SECOND": [55.41, 25.16],
  "ARABIAN RANCHES POLO CLUB": [55.28, 25.07],
  "ARJAN": [55.24, 25.06],
  "BARSHA HEIGHTS": [55.18, 25.11],
  "BUKADRA": [55.36, 25.17],
  "DISCOVERY GARDENS": [55.13, 25.06],
  "DOWN TOWN JABAL ALI": [55.02, 25.05],
  "DUBAI GOLF CITY": [55.26, 25.11],
  "DUBAI HEALTHCARE CITY - PHASE 1": [55.32, 25.22],
  "DUBAI INDUSTRIAL CITY": [55.15, 24.91],
  "DUBAI LAND RESIDENCE COMPLEX": [55.28, 25.07],
  "DUBAI PRODUCTION CITY": [55.17, 25.04],
  "DUBAI SCIENCE PARK": [55.22, 25.05],
  "DUBAI STUDIO CITY": [55.23, 25.03],
  "DUBAI WATER FRONT": [55.11, 25.01],
  "EMAAR SOUTH": [55.17, 24.88],
  "FALCON CITY OF WONDERS": [55.30, 25.11],
  "GARDEN VIEW": [55.16, 25.07],
  "GHADEER AL TAIR": [55.25, 25.03],
  "GRAND VIEWS": [55.28, 25.04],
  "HORIZON": [55.30, 25.13],
  "INTERNATIONAL CITY PH 1": [55.40, 25.16],
  "INTERNATIONAL CITY PH 2 & 3": [55.41, 25.17],
  "JABAL ALI INDUSTRIAL FIRST": [55.04, 25.04],
  "JADDAF WATERFRONT": [55.34, 25.20],
  "JUMEIRA BAY": [55.24, 25.21],
  "JUMEIRAH FIRST": [55.22, 25.22],
  "JUMEIRAH ISLANDS": [55.16, 25.07],
  "JUMEIRAH LAKES TOWERS": [55.15, 25.07],
  "LIWAN": [55.27, 25.05],
  "LIWAN 2": [55.28, 25.05],
  "MAJAN": [55.25, 25.04],
  "MBR DISTRICT 1": [55.31, 25.15],
  "MEDYAN RACE COURSE VILLAS": [55.31, 25.15],
  "MILLENNIUM": [55.30, 25.09],
  "MIRDIF": [55.42, 25.24],
  "NAD AL HAMAR": [55.37, 25.18],
  "NAD AL SHEBA GARDENS": [55.33, 25.14],
  "PALM DEIRA": [55.34, 25.29],
  "PEARL JUMEIRA": [55.20, 25.22],
  "POLO TOWNHOUSES IGO": [55.28, 25.07],
  "SAIH SHUAIB 1": [55.14, 24.93],
  "SAIH SHUAIB 2": [55.13, 24.92],
  "SAIH SHUAIB 4": [55.12, 24.91],
  "SAMA AL JADAF": [55.34, 25.20],
  "SUFOUH GARDENS": [55.17, 25.11],
  "THE LAKES": [55.17, 25.07],
  "UM SUQAIM FIRST": [55.20, 25.18],
  "WADI AL SAFA 2": [55.24, 25.09],
  "WADI AL SAFA 7": [55.28, 25.06],
  "WARSAN FIRST": [55.40, 25.16],
};

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

function jitter(): number {
  return (Math.random() - 0.5) * 0.005; // ~500m spread
}

async function main() {
  // Load communities KML
  const kmlPath = join(ROOT, "data", "layers", "Community__1_.kml");
  let communityCoords = new Map<string, [number, number]>();
  try {
    const kml = readFileSync(kmlPath, "utf8");
    communityCoords = parseCommunityNames(kml);
    console.log(`Loaded ${communityCoords.size} communities from KML`);
  } catch {
    console.log("KML not found, using fallback coordinates only");
  }

  // Merge fallback coords
  for (const [k, v] of Object.entries(FALLBACK_COORDS)) {
    if (!communityCoords.has(k)) communityCoords.set(k, v);
  }

  // Parse CSV (simple parser — handles quoted fields)
  const csvRaw = readFileSync(join(ROOT, "data", "dld-transactions.csv"), "utf8")
    .replace(/^\uFEFF/, ""); // strip BOM
  const lines = csvRaw.split("\n").filter(l => l.trim());
  const headers = parseCsvLine(lines[0]);
  const rows: Record<string, string>[] = [];
  for (let i = 1; i < lines.length; i++) {
    const vals = parseCsvLine(lines[i]);
    const row: Record<string, string> = {};
    for (let j = 0; j < headers.length; j++) row[headers[j]] = vals[j] || "";
    rows.push(row);
  }

  const features: GeoJSON.Feature[] = [];
  let matched = 0, unmatched = 0;
  const unmatchedAreas = new Set<string>();

  for (const row of rows) {
    // Only land sales
    if (row.PROP_TYPE_EN !== "Land") continue;
    if (row.GROUP_EN !== "Sales") continue;

    const area = (row.AREA_EN || "").trim().toUpperCase();
    const coords = communityCoords.get(area);
    if (!coords) {
      unmatched++;
      unmatchedAreas.add(area);
      continue;
    }

    matched++;
    const [lng, lat] = coords;
    const transValue = parseFloat(row.TRANS_VALUE) || 0;
    const actualArea = parseFloat(row.ACTUAL_AREA) || 0;
    const pricePerSqm = actualArea > 0 ? Math.round(transValue / actualArea) : 0;
    const pricePerSqft = actualArea > 0 ? Math.round(transValue / (actualArea * 10.764)) : 0;

    features.push({
      type: "Feature",
      geometry: {
        type: "Point",
        coordinates: [lng + jitter(), lat + jitter()],
      },
      properties: {
        transactionNumber: row.TRANSACTION_NUMBER || "",
        date: (row.INSTANCE_DATE || "").slice(0, 10),
        community: row.AREA_EN || "",
        usage: row.USAGE_EN || "",
        areaSqm: actualArea,
        areaSqft: Math.round(actualArea * 10.764),
        priceAed: transValue,
        pricePerSqm,
        pricePerSqft,
        freehold: row.IS_FREE_HOLD_EN === "Free Hold",
        masterProject: row.MASTER_PROJECT_EN || "",
        project: row.PROJECT_EN || "",
      },
    });
  }

  const fc: GeoJSON.FeatureCollection = {
    type: "FeatureCollection",
    features,
  };

  const outPath = join(ROOT, "data", "sold-plots.geojson");
  writeFileSync(outPath, JSON.stringify(fc));
  console.log(`\nGenerated ${outPath}`);
  console.log(`  Matched: ${matched} land sales`);
  console.log(`  Unmatched: ${unmatched} (no coordinates for community)`);
  if (unmatchedAreas.size > 0) {
    console.log(`  Unmatched communities (${unmatchedAreas.size}):`);
    for (const a of [...unmatchedAreas].sort()) console.log(`    - ${a}`);
  }
}

main().catch(console.error);
