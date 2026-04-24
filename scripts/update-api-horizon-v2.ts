// One-shot migration of the Api Horizon Pointe Building row to the V2
// glTF delivery (2026-04-24). Swaps the V1 candidate-sample.glb pipeline
// (cm source · scaleFactor 0.01 · trimesh-processed) for the artist's
// native-metre 6110279_lod3.glb (355 KB · 8821 verts · 5806 tris · 5
// PBR materials: FRAME · GREEY · GREY · KUNING · PATTERN-black).
//
// Idempotent: safe to re-run — exits cleanly if already at V2.
// Append-only in spirit: the prior V1 provenance is preserved by
// prepending a new entry to `sources[]`, not by deleting any field
// history.
//
// Run:  pnpm dlx tsx scripts/update-api-horizon-v2.ts

import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { config } from "dotenv";

config({ path: ".env.local" });

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter, log: ["warn", "error"] });

const NAME = "API Horizon Pointe";
const V2_MODEL_PATH = "models/6110279_lod3.glb";
const V2_SCALE_FACTOR = 1.0;
const V2_MODEL_PROVIDER = "Artist V2 delivery · 2026-04-24";
const V2_SOURCE_ENTRY = {
  label: "Artist V2 glTF delivery (2026-04-24)",
  url: "local: public/models/6110279_lod3.glb",
  fetchedAt: "2026-04-24",
  notes:
    "Native-metre glTF 2.0 binary · 355 KB · 1 merged mesh · 8821 vertices · 5806 triangles · 5 PBR materials (FRAME 77 %-grey · GREEY 70 %-grey · GREY 89 %-grey · KUNING warm tan · PATTERN black by artist choice). Dimensions 40m × 49m × 107m (26–30 floor residential tower). Supersedes V1 (models/candidate-sample.glb · trimesh-processed from 3ds Max OBJ · cm units · scaleFactor 0.01). V1 file retained in public/models/ for the standalone /parcels/candidate-sample-poc diagnostic route.",
};

async function main() {
  const row = await prisma.building.findFirst({ where: { name: NAME } });
  if (!row) {
    console.error(`Building "${NAME}" not found — aborting.`);
    process.exit(1);
  }

  if (
    row.modelPath === V2_MODEL_PATH &&
    row.scaleFactor === V2_SCALE_FACTOR &&
    row.modelProvider === V2_MODEL_PROVIDER
  ) {
    console.log(`Building "${NAME}" already at V2 — no-op.`);
    await prisma.$disconnect();
    return;
  }

  // Preserve existing sources[] and prepend the V2 entry so the card
  // shows the latest provenance first.
  const priorSources = Array.isArray(row.sources) ? (row.sources as unknown[]) : [];
  const nextSources = [V2_SOURCE_ENTRY, ...priorSources];

  console.log("Before:");
  console.log("  modelPath     :", row.modelPath);
  console.log("  scaleFactor   :", row.scaleFactor);
  console.log("  modelProvider :", row.modelProvider);
  console.log("  sources count :", priorSources.length);

  const updated = await prisma.building.update({
    where: { id: row.id },
    data: {
      modelPath: V2_MODEL_PATH,
      scaleFactor: V2_SCALE_FACTOR,
      modelProvider: V2_MODEL_PROVIDER,
      sources: nextSources,
    },
  });

  console.log("\nAfter:");
  console.log("  modelPath     :", updated.modelPath);
  console.log("  scaleFactor   :", updated.scaleFactor);
  console.log("  modelProvider :", updated.modelProvider);
  console.log("  sources count :", (updated.sources as unknown[]).length);

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error("FATAL:", e);
  process.exit(1);
});
