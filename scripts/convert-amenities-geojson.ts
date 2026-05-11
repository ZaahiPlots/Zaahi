/**
 * One-off converter: data.dubai raw JSON dumps → GeoJSON FeatureCollection
 * files served by /api/layers/amenities/*.
 *
 * Run locally (raw dumps are gitignored and live in
 * docs/research/data-dubai/raw/). The output GeoJSONs are committed to
 * data/layers/amenities/ so Vercel can read them at runtime.
 *
 * Usage: npx tsx scripts/convert-amenities-geojson.ts
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join, resolve } from "node:path";

type Feature = GeoJSON.Feature<GeoJSON.Point, Record<string, unknown>>;
type FC = GeoJSON.FeatureCollection<GeoJSON.Point, Record<string, unknown>>;

const ROOT = resolve(__dirname, "..");
const RAW = join(ROOT, "docs", "research", "data-dubai", "raw");
const OUT = join(ROOT, "data", "layers", "amenities");

const DUBAI_BBOX = { minLng: 54.0, maxLng: 56.5, minLat: 24.0, maxLat: 26.0 };

function num(v: unknown): number | null {
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  if (typeof v === "string" && v.trim()) {
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function insideBbox(lng: number, lat: number): boolean {
  return (
    lng >= DUBAI_BBOX.minLng &&
    lng <= DUBAI_BBOX.maxLng &&
    lat >= DUBAI_BBOX.minLat &&
    lat <= DUBAI_BBOX.maxLat
  );
}

function pick<T extends Record<string, unknown>>(o: T, keys: (keyof T)[]): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const k of keys) {
    if (o[k] != null) out[k as string] = o[k];
  }
  return out;
}

function build(
  inputName: string,
  outputName: string,
  lngField: string,
  latField: string,
  propKeys: string[],
  idField: string,
): { written: number; rejected: number } {
  const inPath = join(RAW, inputName);
  if (!existsSync(inPath)) {
    throw new Error(`missing raw file: ${inPath}`);
  }
  const rows = JSON.parse(readFileSync(inPath, "utf8")) as Record<string, unknown>[];
  const features: Feature[] = [];
  let rejected = 0;
  for (const row of rows) {
    const lng = num(row[lngField]);
    const lat = num(row[latField]);
    if (lng == null || lat == null || !insideBbox(lng, lat)) {
      rejected += 1;
      continue;
    }
    features.push({
      type: "Feature",
      id: row[idField] as string | number | undefined,
      geometry: { type: "Point", coordinates: [lng, lat] },
      properties: pick(row, propKeys as (keyof typeof row)[]),
    });
  }
  const fc: FC = { type: "FeatureCollection", features };
  const outPath = join(OUT, outputName);
  writeFileSync(outPath, JSON.stringify(fc));
  return { written: features.length, rejected };
}

function main() {
  console.log("Converting data.dubai amenities → GeoJSON");
  console.log("RAW:", RAW);
  console.log("OUT:", OUT);
  console.log();

  const jobs = [
    {
      label: "EV chargers (DEWA)",
      input: "ev_green_charger.json",
      output: "ev-chargers.geojson",
      lngField: "longitude",
      latField: "latitude",
      idField: "devicedb_id",
      propKeys: [
        "devicedb_id",
        "location_name",
        "location_address",
        "totalnbofconnectors",
        "connectortype",
      ],
    },
    {
      label: "Metro stations (RTA)",
      input: "metro_stations.json",
      output: "metro-stations.geojson",
      lngField: "station_location_longitude",
      latField: "station_location_latitude",
      idField: "location_id",
      propKeys: [
        "location_id",
        "location_name_english",
        "line_name",
        "station_opening_date",
        "zone_id",
      ],
    },
    {
      label: "Tram stations (RTA)",
      input: "tram_stations.json",
      output: "tram-stations.geojson",
      lngField: "station_location_longitude",
      latField: "station_location_latitude",
      idField: "location_id",
      propKeys: [
        "location_id",
        "location_name_english",
        "line_name",
        "station_opening_date",
        "zone_id",
      ],
    },
    {
      label: "Marine stations (RTA)",
      input: "marine_stations.json",
      output: "marine-stations.geojson",
      // Source ships these with a typo: longitiude / latitiude (extra "i")
      lngField: "station_location_longitiude",
      latField: "station_location_latitiude",
      idField: "station_id",
      propKeys: [
        "station_id",
        "station_name",
        "route_name",
        "valid_from",
        "valid_until",
      ],
    },
  ];

  for (const j of jobs) {
    const r = build(j.input, j.output, j.lngField, j.latField, j.propKeys, j.idField);
    console.log(
      `  ${j.label.padEnd(28)} → ${j.output.padEnd(26)} written=${r.written}, rejected=${r.rejected}`,
    );
  }
  console.log();
  console.log("Done.");
}

main();
