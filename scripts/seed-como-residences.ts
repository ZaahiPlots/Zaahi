// Seed: Como Residences (Nakheel) as a Building row on ZAAHI's
// digital-twin layer. Status = UNDER_CONSTRUCTION (handover Q2 2028).
//
// Run:  ALLOW_PROD_WRITE=1 pnpm dlx tsx scripts/seed-como-residences.ts
//
// Notes:
//   - photos: [] per the same convention used for Burj Khalifa / Burj
//     Crown — the BuildingCard hides the photo block when empty.
//   - modelPath: null — the hero deck.gl ScenegraphLayer in
//     heroBuildingsRegistry.ts already renders Como Residences visually
//     (id "como-residences"). The footprint polygon below is the
//     clickable hitbox that opens BuildingCard.
//   - footprintPolygon: synthetic 50m × 35m rectangle around the OSM
//     centroid (25.1111743, 55.1454260). OSM does not have a permanent
//     footprint for the tower yet — building is still under construction
//     (ALEC awarded $490m contract, Q2 2028 handover).
//   - sources: Nakheel official Como Residences site, Como by Nakheel
//     marketing site, Property Finder UAE, ALEC press release.
//
// Idempotency: skips if a row with name="Como Residences" already exists.

import { PrismaClient, BuildingStatus } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { config } from "dotenv";
import { assertProdWriteAllowed } from "./_guard";

assertProdWriteAllowed();

config({ path: ".env.local" });

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter, log: ["warn", "error"] });

const NAME = "Como Residences";

// Centroid from OSM Nominatim (Q1: "Como Residences, نخلة جميرا, دبي")
const CENTROID_LAT = 25.1111743;
const CENTROID_LNG = 55.1454260;

// Synthetic rectangle footprint, ~50m (N-S) × 35m (E-W).
// 1° latitude ≈ 111 000m; 1° longitude ≈ 100 600m at Dubai's latitude.
// Half-sizes: lat ± 0.000225  /  lng ± 0.000174.
const FOOTPRINT_POLYGON = {
  type: "Polygon",
  coordinates: [[
    [55.1452520, 25.1109493],
    [55.1456000, 25.1109493],
    [55.1456000, 25.1113993],
    [55.1452520, 25.1113993],
    [55.1452520, 25.1109493],
  ]],
};

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
      status: BuildingStatus.UNDER_CONSTRUCTION,

      community: "PALM JUMEIRAH",
      masterPlan: "PALM JUMEIRAH",
      plotNumber: null,
      emirate: "Dubai",
      centroidLat: CENTROID_LAT,
      centroidLng: CENTROID_LNG,
      footprintPolygon: FOOTPRINT_POLYGON,

      developer: "Nakheel Properties (via subsidiary The Palm Jumeirah Company)",
      architect: null,
      completionYear: null,
      expectedCompletion: 2028,
      constructionStarted: null,

      floors: 71,
      heightM: 300.0,
      totalUnits: 76,
      buildingType: "residential",
      // expectedCompletion is an Int (year); completionYear stays null
      // until the building actually completes. Marketing materials cite
      // "Q2 2028" — the quarter detail lives in the description body.

      description:
        "Como Residences is a 71-storey luxury residential tower under construction on the trunk of Palm Jumeirah, expected to be the tallest building on the island at approximately 300 metres. Designed to resemble an organic seashell, the slender curving tower will hold an estimated 76 ultra-luxury apartments — a mix of two-, three-, four-, five- and six-bedroom layouts together with penthouses and duplexes. The 71st-floor rooftop features a 360° viewing platform and a large infinity pool. The project is developed by Nakheel Properties through its subsidiary The Palm Jumeirah Company, with ALEC Engineering & Contracting awarded a $490m construction contract; handover is scheduled for Q2 2028.",
      amenities: [],
      photos: [],

      modelPath: null,
      rotationDeg: 0,
      scaleFactor: 1,
      modelProvider: null,

      propsearchUrl: null,
      sources: [
        {
          label: "Como by Nakheel — official site",
          url: "https://www.comobynakheel.com/",
          fetchedAt: "2026-05-27",
          notes: "Official Nakheel Como Residences microsite.",
        },
        {
          label: "Como Residences — Nakheel project page",
          url: "https://como-residences.ae/",
          fetchedAt: "2026-05-27",
          notes: "Dedicated developer micro-site with renders and floorplans.",
        },
        {
          label: "Property Finder UAE — Como Residences",
          url: "https://www.propertyfinder.ae/en/new-projects/nakheel/como-residences",
          fetchedAt: "2026-05-27",
          notes: "71-storey, 300m height, 76 units, Q2 2028 handover, 2-6BR + penthouses + duplexes.",
        },
        {
          label: "Off Plan Bazaar — Como Residences",
          url: "https://offplanbazaar.ae/property/como-residences-by-nakheel-in-palm-jumeirah/",
          fetchedAt: "2026-05-27",
          notes: "Seashell architectural design, rooftop pool at 71st floor, 360° viewing platform.",
        },
        {
          label: "OSM Nominatim — Como Residences",
          url: "https://nominatim.openstreetmap.org/search?q=Como+Residences+Palm+Jumeirah&format=json",
          fetchedAt: "2026-05-27",
          notes: "Centroid 25.1111743, 55.1454260. No OSM way footprint yet — building under construction.",
        },
      ],
      confidenceLevel: "medium",

      workflowStatus: "live",
      linkedParcelId: null,
    },
  });

  console.log(`Created Building id=${row.id} name="${row.name}"`);
  console.log(
    `  centroid: ${row.centroidLat}, ${row.centroidLng}  community: ${row.community}  status: ${row.status}  floors: ${row.floors}  height: ${row.heightM}m`,
  );
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error("FATAL:", e);
  process.exit(1);
});
