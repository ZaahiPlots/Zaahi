// Seed: Burj Khalifa as a Building row on ZAAHI's digital-twin layer.
//
// Run:  pnpm dlx tsx scripts/seed-burj-khalifa-building.ts
//
// Notes:
//   - photos: [] per founder spec ("no photos") — card just hides the
//     photo block when the array is empty (BuildingCard.tsx).
//   - modelPath: null — the hero deck.gl ScenegraphLayer already
//     renders Burj Khalifa visually (HERO_GLB_URL_KHALIFA). Setting a
//     modelPath here would cause a duplicate three.js render in the
//     Buildings layer. The footprint polygon below is still the
//     clickable hitbox that opens BuildingCard.
//   - footprintPolygon: real OSM way 446646206 (49 nodes), fetched
//     via Overpass `[out:json];way["building"](around:80,25.197204,55.274123);`.
//     OSM centroid (25.197192, 55.274154) is 1.4m from founder-locked
//     hero coords — effectively the same point.
//   - sources include the official Emaar property page + Burj Khalifa
//     micro-site so the card's source list links readers to the
//     developer's own description.
//
// Idempotency: skips if a row with name="Burj Khalifa" already exists.

import { PrismaClient, BuildingStatus } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { config } from "dotenv";

config({ path: ".env.local" });

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter, log: ["warn", "error"] });

const NAME = "Burj Khalifa";

// OSM way 446646206 — Burj Khalifa footprint (tri-podal Y-plan).
// Fetched 2026-05-26 via Overpass API.
const FOOTPRINT_POLYGON = {
  type: "Polygon",
  coordinates: [[
    [55.2739803, 25.1970529], [55.2739625, 25.1965874], [55.2740688, 25.1963681],
    [55.2741076, 25.1964218], [55.2742125, 25.1965671], [55.2742866, 25.1970353],
    [55.274295, 25.1970319], [55.2743095, 25.1969443], [55.2743524, 25.1969537],
    [55.2743922, 25.1969709], [55.2744273, 25.1969951], [55.2744562, 25.1970253],
    [55.2744776, 25.1970602], [55.2744908, 25.1970984], [55.274495, 25.1971381],
    [55.2744901, 25.1971778], [55.2743974, 25.1971596], [55.2743936, 25.1971665],
    [55.2748283, 25.1973479], [55.2749989, 25.1975308], [55.2747383, 25.19756],
    [55.2742704, 25.1974222], [55.2742687, 25.1974305], [55.2743406, 25.1974857],
    [55.274304, 25.1975165], [55.2742609, 25.1975393], [55.2742133, 25.1975531],
    [55.2741635, 25.1975571], [55.2741139, 25.1975512], [55.274067, 25.1975357],
    [55.2740249, 25.1975113], [55.2740938, 25.1974426], [55.2740902, 25.1974351],
    [55.2736892, 25.1976683], [55.2734274, 25.1977023], [55.2735383, 25.1974869],
    [55.2739087, 25.1972036], [55.2739002, 25.1971968], [55.2738159, 25.1972311],
    [55.2738023, 25.1971919], [55.2737985, 25.1971509], [55.2738046, 25.1971102],
    [55.2738208, 25.1970718], [55.2738415, 25.1970359], [55.2738704, 25.1970049],
    [55.2739061, 25.1969804], [55.2739468, 25.1969636], [55.27397, 25.1970478],
    [55.2739803, 25.1970529],
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
      centroidLat: 25.197192,
      centroidLng: 55.274154,
      footprintPolygon: FOOTPRINT_POLYGON,

      developer: "Emaar Properties",
      architect: "Skidmore, Owings & Merrill (Adrian Smith)",
      completionYear: 2010,
      expectedCompletion: null,
      constructionStarted: 2004,

      floors: 163,
      heightM: 828.0,
      totalUnits: null,
      buildingType: "mixed_use",

      description:
        "At 828 metres tall and 163 floors, Burj Khalifa is the world's tallest building. Designed by Chicago-based architectural firm Skidmore, Owings & Merrill LLP (SOM) with consulting design partner Adrian Smith, the tower's tripartite floor plan and buttressed core draw on Islamic architectural geometry. The structure houses 1.85 million square feet of residential space, 300,000 square feet of office space, the Armani Hotel Dubai and Armani Residences. Completed in 2010, Burj Khalifa is the centrepiece of Emaar's Downtown Dubai master development.",
      amenities: [],
      photos: [],

      modelPath: null,
      rotationDeg: 0,
      scaleFactor: 1,
      modelProvider: null,

      propsearchUrl: null,
      sources: [
        {
          label: "Emaar — Burj Khalifa (official)",
          url: "https://www.emaar.com/en/other-emaar-businesses/burj-khalifa",
          fetchedAt: "2026-05-26",
          notes: "Official Emaar property page. Height 828m, 163 floors, SOM/Adrian Smith architect.",
        },
        {
          label: "Burj Khalifa — official site (bk.emaar.com)",
          url: "https://bk.emaar.com/en/the-tower/design-construction/",
          fetchedAt: "2026-05-26",
          notes: "Design & construction page. Tripartite plan, buttressed core, Islamic architectural geometry.",
        },
        {
          label: "Armani Hotel Dubai (Emaar)",
          url: "https://properties.emaar.com/en/armani-hotel-dubai/",
          fetchedAt: "2026-05-26",
          notes: "Hotel inside Burj Khalifa.",
        },
        {
          label: "OpenStreetMap way 446646206",
          url: "https://www.openstreetmap.org/way/446646206",
          fetchedAt: "2026-05-26",
          notes: "Footprint polygon (49 nodes, Y-shaped tripodal plan). Tagged برج خليفة.",
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
