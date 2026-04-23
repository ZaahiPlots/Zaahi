/**
 * Clean up plot 9235849 AffectionPlan notes after the 2026-04-23 systemic
 * FUTURE_DEVELOPMENT render decision.
 *
 * Changes in this appended AffectionPlan row:
 *   - buildingStyle       VILLA_COMMUNITY → null
 *                          (reflects new rule: landUse alone drives render,
 *                           no per-plot opt-in flag meaningful anymore)
 *   - notes                rewritten in the TB02 factsheet style — one
 *                          dense paragraph · client-facing · no dev
 *                          markers · no price duplication (price lives
 *                          in Parcel.currentValuation only)
 *   - raw.developmentIntent / villaCount / estateStyle etc. carried
 *     forward as history but marked deprecated = true with a pointer to
 *     the new systemic rule
 *
 * Append-only — all 3 prior AffectionPlan rows remain untouched.
 * Parcel.currentValuation UNCHANGED (61,533,981,560 fils = AED 615,339,815.60).
 *
 * Run: npx tsx -r dotenv/config scripts/update-9235849-standardize-notes.ts dotenv_config_path=.env.local
 */
import { Prisma } from "@prisma/client";
import { prisma } from "../src/lib/prisma";

const PARCEL_ID = "cmobobn4x0000tdewb8muy2j6";

// Client-facing notes — matches TB02 single-paragraph factsheet pattern.
// No dev markers, no timestamped correction comments, no price duplication.
const NEW_NOTES =
  "Plot 9235849 · Al Yalayis 3 · Dubailand, Dubai. " +
  "Land Use: FUTURE DEVELOPMENT. " +
  "Master developer: DUBAI LAND (L.L.C). Project: DUBAI LAND. " +
  "Plot area: 484,465.59 m² (5,214,744.20 ft²). " +
  "Maximum GFA, height, setbacks and coverage parameters to be finalised on master plan approval. " +
  "Per DDA affection plan: approved master plan is required prior to any submittals; " +
  "master developer must comply with requirements, applicable guidelines and technical " +
  "conditions stipulated in the Dubai 2040 Urban Master Plan and relevant planning and " +
  "service authorities.";

async function main() {
  console.log(`\n── Standardize 9235849 notes (systemic FUTURE_DEV render rule) ──`);

  const prev = await prisma.affectionPlan.findFirst({
    where: { parcelId: PARCEL_ID },
    orderBy: { fetchedAt: "desc" },
  });
  if (!prev) throw new Error(`No prior AffectionPlan for ${PARCEL_ID}.`);
  console.log(
    `Prior row: ${prev.id}  buildingStyle=${prev.buildingStyle}\n` +
      `  notes length: ${prev.notes?.length ?? 0} chars`,
  );

  // Mark the old per-plot render metadata as deprecated in the `raw` JSON —
  // preserves audit history without misleading future readers.
  const priorRaw = (prev.raw as Record<string, unknown> | null) ?? {};
  const newRaw: Record<string, unknown> = {
    ...priorRaw,
    deprecatedPerPlotRenderIntent: {
      note:
        "As of 2026-04-23, FUTURE_DEVELOPMENT render is systemic — every " +
        "such plot auto-renders via generateFutureDevelopmentBuilding() in " +
        "src/app/parcels/map/page.tsx. Prior buildingStyle=VILLA_COMMUNITY, " +
        "villaCount, typicalFloors, estateStyle, footprintPct, aspectRatio " +
        "flags on this parcel are NO LONGER CONSULTED by the renderer. " +
        "Kept in history for audit trail only.",
      deprecatedFields: [
        "buildingStyle (was: VILLA_COMMUNITY)",
        "developmentIntent (was: villa_community)",
        "villaCount (was: 1)",
        "typicalFloors (was: 3)",
        "estateStyle (was: true)",
        "footprintPct (was: 0.15)",
        "aspectRatio (was: 1.4)",
      ],
    },
  };

  const plan = await prisma.affectionPlan.create({
    data: {
      parcelId: PARCEL_ID,
      source:
        "Standardize notes + clear buildingStyle 2026-04-23 · systemic " +
        "FUTURE_DEVELOPMENT render decision · supersedes per-plot " +
        `opt-in on prior AffectionPlan ${prev.id}.`,
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

      // ── Key changes ──
      buildingStyle: null, // no longer drives render
      notes: NEW_NOTES, // client-facing factsheet, TB02 pattern

      raw: newRaw as unknown as Prisma.InputJsonValue,
    },
  });

  console.log(
    `Appended: ${plan.id}  buildingStyle=null  notes=${NEW_NOTES.length} chars`,
  );

  // History
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

  // Price untouched check
  const parcel = await prisma.parcel.findUnique({
    where: { id: PARCEL_ID },
    select: { currentValuation: true, area: true },
  });
  if (parcel) {
    const aed = parcel.currentValuation ? Number(parcel.currentValuation) / 100 : null;
    console.log(
      `\nParcel check (unchanged):  price=${parcel.currentValuation?.toString()} fils (${aed?.toLocaleString("en-US")} AED)  area=${parcel.area} sqft`,
    );
  }

  console.log("\n── Final client-facing notes for SidePanel ──");
  console.log(NEW_NOTES);

  console.log("\nDone.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
