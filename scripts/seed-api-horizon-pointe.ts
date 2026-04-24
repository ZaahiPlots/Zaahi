// Seed: API Horizon Pointe — the first Building row on ZAAHI's digital-
// twin layer. Residential tower completed in Bu Kadra (Meydan Horizon),
// developed by API (Al Ali Property Investment). This script is
// append-only with an idempotency guard: it exits cleanly if a Building
// with the same name already exists.
//
// Run:  pnpm dlx tsx scripts/seed-api-horizon-pointe.ts
//
// Research provenance (2026-04-24):
//   • OSM way 699267153 → centroid 25.1821676, 55.3225533 (high conf.)
//   • apidubai.ae/portfolio/api-horizon-pointe — official developer page
//     → 120 residential units + 2 retail, amenities, developer identity
//   • bayut.com/buildings/api-horizon-point-bukadra — 26 floors (G+25),
//     building type, photo
//   • propsearch.ae/dubai/api-horizon-point — 27 storeys (minor conflict
//     with bayut's 26; we store 26 as the conservative cross-source
//     value and note the discrepancy in sources[])
//   • DDA REST query PLOT_NUMBER=6110279 returned 0 features — plot
//     number is not in DDA so we seed plotNumber=null per the task's
//     honesty gate ("seed with plotNumber=null · flag · не block").
//
// The 3D model is the candidate artist's converted GLB (public/models/
// candidate-sample.glb — 207 KB · 5,331 verts · units=cm → scaleFactor
// 0.01 converts to metres). modelProvider flagged as the candidate so
// provenance is preserved in the UI credit footer.

import { PrismaClient, BuildingStatus } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { config } from "dotenv";

config({ path: ".env.local" });

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter, log: ["warn", "error"] });

const NAME = "API Horizon Pointe";

// OSM way 699267153 footprint polygon — fetched 2026-04-24. Small
// rectangle around the lat/lng centroid; exact ring from Overpass is
// preferred but not required for V1 (the CustomLayer uses centroid).
const FOOTPRINT_SOURCE =
  "https://nominatim.openstreetmap.org/search?q=API+Horizon+Pointe+Bukadra+Dubai";

async function main() {
  const existing = await prisma.building.findFirst({ where: { name: NAME } });
  if (existing) {
    console.log(`Building "${NAME}" already exists (id=${existing.id}) — no-op.`);
    await prisma.$disconnect();
    return;
  }

  const row = await prisma.building.create({
    data: {
      name: NAME,
      status: BuildingStatus.COMPLETED,

      community: "BU KADRA",
      masterPlan: "MEYDAN HORIZON",
      plotNumber: null,
      emirate: "Dubai",
      centroidLat: 25.1821676,
      centroidLng: 55.3225533,
      footprintPolygon: null,

      developer: "API (Al Ali Property Investment)",
      architect: null,
      completionYear: null,
      expectedCompletion: null,
      constructionStarted: null,

      floors: 26,
      heightM: null,
      totalUnits: 120,
      buildingType: "residential",

      description:
        "Residential high-rise tower in Bu Kadra · part of the Meydan Horizon master community, Mohammed Bin Rashid City. 120 apartments across 2-bedroom and 3-bedroom layouts with 2 ground-floor retail spaces. Contemporary design, views over Ras Al Khor Wildlife Sanctuary, Downtown Skyline and Dubai Creek.",
      amenities: [
        "Swimming pool",
        "Kids' plunge pool",
        "Equipped gymnasium",
        "Party / function area",
        "Four-tier covered parking",
        "24-hour concierge",
        "24-hour security with CCTV",
        "High-speed elevators",
      ],
      photos: [
        {
          url: "https://static.propsearch.ae/dubai-locations/api-horizon-point_Tkuog_xl.jpg",
          credit: "propsearch.ae",
          alt: "API Horizon Pointe — propsearch listing photo",
        },
        {
          url: "https://apidubai.ae/storage/2039/API-Horizon-Pointe-(convert.io).webp",
          credit: "apidubai.ae (developer)",
          alt: "API Horizon Pointe — developer portfolio photo",
        },
      ],

      modelPath: "models/candidate-sample.glb",
      rotationDeg: 0,
      scaleFactor: 0.01,
      modelProvider: "external candidate submission (3D artist evaluation)",

      propsearchUrl: "https://propsearch.ae/dubai/api-horizon-point",
      sources: [
        {
          label: "apidubai.ae — developer portfolio",
          url: "https://www.apidubai.ae/portfolio/api-horizon-pointe",
          fetchedAt: "2026-04-24",
          notes: "Developer identity (API / Al Ali Property Investment), 120 units, amenities, description.",
        },
        {
          label: "bayut.com building guide",
          url: "https://www.bayut.com/buildings/api-horizon-point-bukadra/",
          fetchedAt: "2026-04-24",
          notes: "Floor count 26 (G+25), residential high-rise classification, photo.",
        },
        {
          label: "propsearch.ae project page",
          url: "https://propsearch.ae/dubai/api-horizon-point",
          fetchedAt: "2026-04-24",
          notes:
            "Storey count listed as 27 — minor discrepancy with bayut's 26; seeded 26 conservatively. Status: Complete.",
        },
        {
          label: "OpenStreetMap Nominatim (way 699267153)",
          url: FOOTPRINT_SOURCE,
          fetchedAt: "2026-04-24",
          notes: "Centroid 25.1821676, 55.3225533 — single-match building polygon.",
        },
        {
          label: "DDA plot lookup",
          url: "https://gis.dda.gov.ae/server/rest/services/DDA/BASIC_LAND_BASE/MapServer/2/query?where=PLOT_NUMBER%3D%276110279%27",
          fetchedAt: "2026-04-24",
          notes: "PLOT_NUMBER=6110279 → 0 features. Plot is not in DDA; plotNumber left null.",
        },
      ],
      confidenceLevel: "medium",

      workflowStatus: "live",
      linkedParcelId: null,
    },
  });

  console.log(`Created Building id=${row.id} name="${row.name}"`);
  console.log(
    `  centroid: ${row.centroidLat}, ${row.centroidLng}  community: ${row.community}  status: ${row.status}`,
  );
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error("FATAL:", e);
  process.exit(1);
});
