// Seed: Burj Crown (Emaar) as a Building row on ZAAHI's digital-twin layer.
//
// Run:  pnpm dlx tsx scripts/seed-burj-crown-building.ts
//
// Notes:
//   - photos: [] per founder spec ("no photos") — card hides the photo
//     block when the array is empty (BuildingCard.tsx).
//   - modelPath: null — the hero deck.gl ScenegraphLayer already
//     renders Burj Crown visually (HERO_GLB_URL). The footprint polygon
//     below is the clickable hitbox that opens BuildingCard.
//   - footprintPolygon: OSM way 1092759183 (7-node polygon) selected
//     as the closest unnamed building to founder-locked hero coords
//     (25.193982, 55.268824). OSM centroid offset = 56m. OSM does not
//     yet name the Burj Crown footprint — flagged in sources notes.
//   - sources: official Emaar property page (properties.emaar.com) +
//     dedicated burjcrown.ae micro-site + architect LWK Partners.
//
// Idempotency: skips if a row with name="Burj Crown" already exists.

import { PrismaClient, BuildingStatus } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { config } from "dotenv";

config({ path: ".env.local" });

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter, log: ["warn", "error"] });

const NAME = "Burj Crown";

// OSM way 1092759183 — unnamed building closest to founder-locked
// hero coordinates (56m offset). Fetched 2026-05-26 via Overpass.
const FOOTPRINT_POLYGON = {
  type: "Polygon",
  coordinates: [[
    [55.2681063, 25.1938676],
    [55.2684257, 25.1939672],
    [55.2684457, 25.1939149],
    [55.2683544, 25.1938864],
    [55.2683625, 25.1938652],
    [55.2681343, 25.193794],
    [55.2681063, 25.1938676],
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
      status: BuildingStatus.COMPLETED,

      community: "DOWNTOWN DUBAI",
      masterPlan: "DOWNTOWN",
      plotNumber: null,
      emirate: "Dubai",
      centroidLat: 25.193883,
      centroidLng: 55.268305,
      footprintPolygon: FOOTPRINT_POLYGON,

      developer: "Emaar Properties",
      architect: "LWK + Partners",
      completionYear: 2023,
      expectedCompletion: null,
      constructionStarted: null,

      floors: 44,
      heightM: 203.0,
      totalUnits: 440,
      buildingType: "residential",

      description:
        "Burj Crown is a 44-storey luxury residential tower in Downtown Dubai's Opera District, rising on Sheikh Mohammed bin Rashid Boulevard with direct views of Dubai Opera, Burj Khalifa, the Dubai Fountains and Burj Park. Designed by Hong Kong-based LWK + Partners, the tower offers 440 one-, two- and three-bedroom apartments. Completed in 2023, Burj Crown is part of Emaar's Downtown Dubai master development and is within walking distance of the Dubai Mall.",
      amenities: [],
      photos: [],

      modelPath: null,
      rotationDeg: 0,
      scaleFactor: 1,
      modelProvider: null,

      propsearchUrl: null,
      sources: [
        {
          label: "Emaar — Burj Crown (official property page)",
          url: "https://properties.emaar.com/en/properties/burj-crown/",
          fetchedAt: "2026-05-26",
          notes: "Official Emaar property page. 44 storeys, 440 units, 1-3BR apartments, Opera District.",
        },
        {
          label: "Burj Crown — official micro-site",
          url: "https://burjcrown.ae/",
          fetchedAt: "2026-05-26",
          notes: "Dedicated developer micro-site for Burj Crown.",
        },
        {
          label: "Emaar Press Release — Burj Crown launch",
          url: "https://properties.emaar.com/en/press-release-listing/burj-crown/",
          fetchedAt: "2026-05-26",
          notes: "Project launch announcement.",
        },
        {
          label: "LWK + Partners — Burj Crown project page",
          url: "https://www.lwkp.com/project/burj-crown/",
          fetchedAt: "2026-05-26",
          notes: "Architect's own project page.",
        },
        {
          label: "OpenStreetMap way 1092759183",
          url: "https://www.openstreetmap.org/way/1092759183",
          fetchedAt: "2026-05-26",
          notes: "Unnamed building footprint (7 nodes), selected as closest match (56m offset) to founder-locked hero coordinates. OSM has not yet tagged this way with the Burj Crown name.",
        },
      ],
      confidenceLevel: "high",

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
