/**
 * Phase 2.0 — pick one Dubai parcel with non-null geometry. Save to /tmp/parcel.json.
 * READ-ONLY. No mutation, no fallbacks.
 */
import { Prisma } from "@prisma/client";
import { prisma } from "../src/lib/prisma";
import { writeFileSync } from "fs";

async function main() {
  const p = await prisma.parcel.findFirst({
    where: {
      emirate: "Dubai",
      geometry: { not: Prisma.JsonNull },
      latitude: { not: null },
      longitude: { not: null },
    },
    select: {
      id: true,
      plotNumber: true,
      district: true,
      emirate: true,
      area: true,
      latitude: true,
      longitude: true,
      geometry: true,
    },
  });
  if (!p) {
    console.error("NO_PARCEL");
    process.exit(2);
  }
  writeFileSync("/tmp/parcel.json", JSON.stringify(p, null, 2));
  const g = p.geometry as { type?: string; coordinates?: unknown[] } | null;
  console.log(`OK plot=${p.plotNumber} district="${p.district}" area=${p.area} geomType=${g?.type ?? "?"}`);
}

main().finally(() => prisma.$disconnect());
