#!/usr/bin/env npx tsx
/**
 * Fetch all ~94,640 Oman (Muscat — Seeb) plots from Muscat Municipality
 * geoportal. Saves GeoJSON files grouped by WILAYATNAME_E into
 * data/layers/oman-plots/.
 *
 * Source already returns WGS84 when `f=geojson` (server reprojects from
 * UTM Zone 40N). No proj4 needed client-side.
 *
 * Usage:  npx tsx scripts/fetch-oman-plots.ts
 */
import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";

const BASE_URL =
  "https://geoportal.mm.gov.om/server/rest/services/SeebContract_MIL1/MapServer/11/query";
const OUT_DIR = join(process.cwd(), "data", "layers", "oman-plots");
const BATCH_SIZE = 2000;
const OUT_FIELDS = [
  "PLOTUID",
  "PLOTNO",
  "NEWPLOTNO",
  "PLOTAREA",
  "PLOTUSAGECD",
  "WILAYATNAME_E",
  "WILAYATNAME_A",
  "NEWHOUSINGAREANAME_E",
  "NEWPHASESNAME_E",
  "FLAG",
  "PERMITNO",
  "PERMITYEAR",
  "PERMITTYPE",
  "SOURCECD",
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

  // 1. Total count
  console.log("Fetching plot count...");
  const countData = (await fetchJson(
    `${BASE_URL}?where=1%3D1&returnGeometry=false&returnCountOnly=true&f=json`,
  )) as { count: number };
  const total = countData.count;
  const pages = Math.ceil(total / BATCH_SIZE);
  console.log(
    `Total: ${total.toLocaleString()} plots  |  ${pages} pages × ${BATCH_SIZE}\n`,
  );

  // 2. Fetch all pages
  const allFeatures: GeoJSON.Feature[] = [];
  for (let page = 0; page < pages; page++) {
    const offset = page * BATCH_SIZE;
    process.stdout.write(`  page ${page + 1}/${pages}  (offset ${offset}) ... `);
    const params = new URLSearchParams({
      where: "1=1",
      outFields: OUT_FIELDS,
      returnGeometry: "true",
      f: "geojson",
      resultRecordCount: String(BATCH_SIZE),
      resultOffset: String(offset),
      orderByFields: "PLOTUID ASC",
    });
    try {
      const data = (await fetchJson(`${BASE_URL}?${params}`)) as GeoJSON.FeatureCollection;
      const features = data.features ?? [];
      allFeatures.push(...features);
      console.log(`${features.length} records (total: ${allFeatures.length.toLocaleString()})`);
    } catch (e) {
      console.error(`\n  ERROR: ${(e as Error).message}`);
      // Retry once after a pause
      await sleep(2000);
      try {
        const data = (await fetchJson(`${BASE_URL}?${params}`)) as GeoJSON.FeatureCollection;
        const features = data.features ?? [];
        allFeatures.push(...features);
        console.log(`retry ok: ${features.length}`);
      } catch {
        console.error("  retry failed, skipping");
      }
    }
    if (page < pages - 1) await sleep(150);
  }

  console.log(`\nFetched ${allFeatures.length.toLocaleString()} plots total.\n`);

  // 3. Group by SLUG of WILAYATNAME_E. The raw names are inconsistent
  //    ("al Seeb" vs "al seeb" vs "AL SEEB") so we group by slug to
  //    avoid file-name collisions that would overwrite each other.
  const bySlug = new Map<string, GeoJSON.Feature[]>();
  let noWilayat = 0;
  for (const f of allFeatures) {
    const rawName = (f.properties?.WILAYATNAME_E as string) || "";
    const slug = rawName ? slugify(rawName) : "_unknown";
    if (!rawName) noWilayat++;
    if (!bySlug.has(slug)) bySlug.set(slug, []);
    bySlug.get(slug)!.push(f);
  }

  console.log(
    `Wilayats: ${bySlug.size}  (${noWilayat.toLocaleString()} plots without wilayat name)\n`,
  );

  // 4. Save each wilayat-slug as a GeoJSON file.
  let saved = 0;
  for (const [slug, features] of bySlug) {
    const filePath = join(OUT_DIR, `${slug || "_empty"}.geojson`);
    const fc: GeoJSON.FeatureCollection = {
      type: "FeatureCollection",
      features,
    };
    writeFileSync(filePath, JSON.stringify(fc));
    saved++;
    console.log(`  ${(slug || "_empty").padEnd(40)} ${features.length.toLocaleString().padStart(8)} plots`);
  }

  console.log(`\nDone! ${saved} files saved to ${OUT_DIR}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
