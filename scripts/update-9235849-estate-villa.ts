/**
 * Follow-up correction to plot 9235849 — replace 10-villa intent with a
 * single-estate-villa intent (founder visual rejection 2026-04-23 of the
 * previous render).
 *
 * Supersedes AffectionPlan cmobrsi6e0000ntewd5ckm3v8 (commit f711da8)
 * without deleting it — append-only rule.
 *
 * Changes:
 *   raw.developmentIntent = "villa_community"      (unchanged)
 *   raw.villaCount        = 10 → 1                 (single estate villa)
 *   raw.typicalFloors     = 2 → 3                  (low-rise estate)
 *   raw.estateStyle       = true                   (new flag)
 *   raw.footprintPct      = 0.15                   (15% of plot area)
 *   raw.aspectRatio       = 1.4                    (villa shape)
 *   buildingStyle         = "VILLA_COMMUNITY"      (unchanged)
 *
 * Price is UNCHANGED (AED 615,339,815.60 · commit f711da8).
 *
 * Run: npx tsx -r dotenv/config scripts/update-9235849-estate-villa.ts dotenv_config_path=.env.local
 */
import { Prisma } from "@prisma/client";
import { prisma } from "../src/lib/prisma";

const PARCEL_ID = "cmobobn4x0000tdewb8muy2j6";

async function main() {
  console.log(`\n── Estate-villa correction for ${PARCEL_ID} ──`);

  const prev = await prisma.affectionPlan.findFirst({
    where: { parcelId: PARCEL_ID },
    orderBy: { fetchedAt: "desc" },
  });
  if (!prev) {
    throw new Error(`No prior AffectionPlan for ${PARCEL_ID}.`);
  }
  console.log(`Prior AffectionPlan: ${prev.id}  buildingStyle=${prev.buildingStyle}`);

  const priorRaw = (prev.raw as Record<string, unknown> | null) ?? {};
  const newRaw: Record<string, unknown> = {
    ...priorRaw,
    developmentIntent: "villa_community",
    villaCount: 1, // was 10
    typicalFloors: 3, // was 2
    estateStyle: true, // new flag — single large villa with estate setbacks
    footprintPct: 0.15,
    aspectRatio: 1.4,
    buildingStyleReason:
      "Single estate villa centered on plot with large setbacks representing " +
      "surrounding estate grounds (pool, garden, driveway, servant quarters). " +
      "Replaces prior 10-villa grid which founder 2026-04-23 visually rejected " +
      "(\"doesn't look like houses\"). Renderer: generateEstateVillaFeatures() " +
      "in src/app/parcels/map/page.tsx.",
    priorRenderIntent: {
      deprecated: true,
      deprecatedAt: "2026-04-23",
      reason: "Founder visual rejection — 10 small boxes on 48ha plot",
      previousVillaCount: 10,
      previousFloors: 2,
      supersededBy: "single estate villa at 15% footprint",
    },
  };

  const plan = await prisma.affectionPlan.create({
    data: {
      parcelId: PARCEL_ID,
      source:
        "Founder visual correction 2026-04-23 — estate-villa intent replaces " +
        "10-villa grid. Supersedes AffectionPlan " +
        `${prev.id} (append-only · prior row preserved).`,
      plotNumber: prev.plotNumber,
      oldNumber: prev.oldNumber,
      projectName: prev.projectName,
      community: prev.community,
      masterDeveloper: prev.masterDeveloper,

      plotAreaSqm: prev.plotAreaSqm,
      plotAreaSqft: prev.plotAreaSqft,
      maxGfaSqm: prev.maxGfaSqm,
      maxGfaSqft: prev.maxGfaSqft,

      maxHeightCode: prev.maxHeightCode,
      maxFloors: prev.maxFloors,
      maxHeightMeters: prev.maxHeightMeters,
      far: prev.far,

      setbacks: (prev.setbacks as Prisma.InputJsonValue) ?? Prisma.JsonNull,
      landUseMix: (prev.landUseMix as Prisma.InputJsonValue) ?? Prisma.JsonNull,

      sitePlanIssue: prev.sitePlanIssue,
      sitePlanExpiry: prev.sitePlanExpiry,

      buildingLimitGeometry:
        (prev.buildingLimitGeometry as Prisma.InputJsonValue) ?? Prisma.JsonNull,

      buildingStyle: "VILLA_COMMUNITY",

      notes:
        `${prev.notes ?? ""}\n\n` +
        `[2026-04-23 estate-villa correction] Single villa render replaces ` +
        `10-villa grid. villaCount=1, typicalFloors=3, estateStyle=true, ` +
        `footprintPct=0.15. Represents estate compound (villa + pool + garage + ` +
        `garden) with surrounding grounds visible as setbacks.`,

      raw: newRaw as unknown as Prisma.InputJsonValue,
    },
  });

  console.log(`Appended: ${plan.id}  buildingStyle=${plan.buildingStyle}`);

  // Show the append-only history.
  const history = await prisma.affectionPlan.findMany({
    where: { parcelId: PARCEL_ID },
    orderBy: { fetchedAt: "desc" },
    select: { id: true, buildingStyle: true, fetchedAt: true },
  });
  console.log("\n── AffectionPlan append-only history ──");
  for (const h of history) {
    console.log(
      `  ${h.id}  buildingStyle=${h.buildingStyle ?? "null"}  fetched=${h.fetchedAt.toISOString()}`,
    );
  }

  // Double-check Parcel price untouched.
  const parcel = await prisma.parcel.findUnique({
    where: { id: PARCEL_ID },
    select: { currentValuation: true, area: true, status: true },
  });
  if (parcel) {
    const aed = parcel.currentValuation ? Number(parcel.currentValuation) / 100 : null;
    console.log(
      `\nParcel check (should be unchanged from f711da8):\n` +
        `  price=${parcel.currentValuation?.toString()} fils (${aed?.toLocaleString("en-US")} AED)\n` +
        `  area=${parcel.area} sqft  status=${parcel.status}`,
    );
  }

  console.log("\nDone.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
