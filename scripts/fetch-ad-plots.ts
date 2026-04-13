#!/usr/bin/env npx tsx
/**
 * Fetch all ~410K Abu Dhabi plots from MyLand ArcGIS.
 * Saves one GeoJSON file per DISTRICTENG into data/layers/ad-plots/.
 *
 * Usage:  npx tsx scripts/fetch-ad-plots.ts
 */
import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";

const BASE_URL =
  "https://onwani.abudhabi.ae/arcgis/rest/services/MyLand/SMARTHUB/MapServer/0/query";
const OUT_DIR = join(process.cwd(), "data", "layers", "ad-plots");
const BATCH_SIZE = 2000;
const OUT_FIELDS = [
  "PLOTNUMBER",
  "DISTRICTENG",
  "COMMUNITYENG",
  "MUNICIPALITYENG",
  "CALCULATEDAREA",
  "PRIMARYUSEENGDESC",
  "Construction_Status",
  "MAXALLOWABLEHEIGHTS",
  "DevCode_FAR",
  "DevCode_MaxGFA",
  "DevCode_Category",
  "OWNERSHIPTYPE",
].join(",");

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

async function fetchJson(url: string): Promise<unknown> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

async function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function main() {
  mkdirSync(OUT_DIR, { recursive: true });

  // 1. Get list of districts with counts
  console.log("Fetching district list...");
  const statsUrl =
    `${BASE_URL}?where=1%3D1&returnGeometry=false` +
    `&groupByFieldsForStatistics=DISTRICTENG` +
    `&outStatistics=${encodeURIComponent(JSON.stringify([{ statisticType: "count", onStatisticField: "OBJECTID", outStatisticFieldName: "cnt" }]))}` +
    `&orderByFields=${encodeURIComponent("cnt DESC")}&f=json`;
  const statsData = (await fetchJson(statsUrl)) as {
    features?: Array<{ attributes: { DISTRICTENG: string; cnt: number } }>;
  };
  if (!statsData.features) {
    console.error("Failed to fetch district stats:", JSON.stringify(statsData).slice(0, 300));
    process.exit(1);
  }
  const districts = statsData.features.map((f) => ({
    name: f.attributes.DISTRICTENG,
    count: f.attributes.cnt,
  }));
  const totalPlots = districts.reduce((s, d) => s + d.count, 0);
  console.log(
    `Found ${districts.length} districts, ${totalPlots.toLocaleString()} total plots\n`,
  );

  // 2. Fetch each district
  let savedCount = 0;
  let totalFetched = 0;

  for (let di = 0; di < districts.length; di++) {
    const { name, count } = districts[di];
    const pages = Math.ceil(count / BATCH_SIZE);
    const slug = slugify(name);
    process.stdout.write(
      `District ${di + 1}/${districts.length} (${name}) — ${count} plots — ${pages} page(s) ... `,
    );

    const allFeatures: GeoJSON.Feature[] = [];
    let failed = false;

    for (let page = 0; page < pages; page++) {
      const offset = page * BATCH_SIZE;
      const params = new URLSearchParams({
        where: `DISTRICTENG='${name.replace(/'/g, "''")}'`,
        outFields: OUT_FIELDS,
        returnGeometry: "true",
        f: "geojson",
        resultRecordCount: String(BATCH_SIZE),
        resultOffset: String(offset),
        orderByFields: "OBJECTID ASC",
      });

      try {
        const data = (await fetchJson(`${BASE_URL}?${params}`)) as GeoJSON.FeatureCollection;
        if (data.features) {
          allFeatures.push(...data.features);
        }
      } catch (e) {
        console.error(`\n  ERROR on page ${page + 1}: ${(e as Error).message}`);
        failed = true;
        break;
      }

      // Be polite — 200ms between requests
      if (page < pages - 1) await sleep(200);
    }

    if (failed) {
      console.log("SKIPPED (error)");
      continue;
    }

    // Save
    const fc: GeoJSON.FeatureCollection = {
      type: "FeatureCollection",
      features: allFeatures,
    };
    const filePath = join(OUT_DIR, `${slug}.geojson`);
    writeFileSync(filePath, JSON.stringify(fc));
    savedCount++;
    totalFetched += allFeatures.length;
    console.log(`OK (${allFeatures.length} saved)`);

    // Small delay between districts
    if (di < districts.length - 1) await sleep(100);
  }

  console.log(
    `\nDone! ${savedCount}/${districts.length} districts, ${totalFetched.toLocaleString()} plots saved to ${OUT_DIR}`,
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
