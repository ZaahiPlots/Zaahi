/**
 * Founder corrections to plot 9235849 (Al Yalayis 3, Dubai Land) —
 * 2026-04-23 follow-up to commit 45331b9.
 *
 * Correction 1 — price (manual):
 *   AED 118/sqft × 5,214,744.20 sqft = AED 615,339,815.60
 *   → currentValuation 61,533,981,560 fils.
 *   (Per CLAUDE.md manual-only rule; one-time founder directive for this plot.)
 *
 * Correction 2 — buildingStyle (new value "VILLA_COMMUNITY"):
 *   Signals to the 3D renderer that this plot should render as a
 *   cottage-village of 10 small villas, NOT a ZAAHI Signature tower.
 *   Interpreted in src/app/parcels/map/page.tsx at the FUTURE_DEVELOPMENT
 *   branch via the module-level `generateVillaFeatures` helper.
 *   No schema change — `buildingStyle` is `String?` and already accepts
 *   arbitrary values ("SIGNATURE", "FLAT", now "VILLA_COMMUNITY").
 *
 * Correction 3 — development intent flag:
 *   Structured metadata stored in `AffectionPlan.raw.developmentIntent`.
 *   Future consumers (feasibility calc, broker UI, dashboards) can key
 *   off this without needing a new schema column.
 *
 * Verification 4 (feasibility target-use) — handled as a one-line edit
 * in FeasibilityCalculator.tsx (NOT in this script).
 *
 * Append-only per CLAUDE.md — creates a fresh AffectionPlan row, never
 * deletes the pre-existing one from commit 45331b9.
 *
 * Run: npx tsx -r dotenv/config scripts/update-9235849-villa-community.ts dotenv_config_path=.env.local
 */
import { Prisma } from "@prisma/client";
import { prisma } from "../src/lib/prisma";

const PARCEL_ID = "cmobobn4x0000tdewb8muy2j6";
const PLOT_NUMBER = "9235849";

// Founder directive — literal AED value, not re-derived from per-sqft.
const PRICE_AED = 615_339_815.60;
const PRICE_FILS = 61_533_981_560n; // AED × 100 = fils (BigInt)

const DEVELOPMENT_INTENT = "villa_community";
const VILLA_COUNT = 10;
const TYPICAL_FLOORS = 2;

async function main() {
  console.log(`\n── Applying founder corrections to ${PARCEL_ID} / plot ${PLOT_NUMBER} ──`);

  const before = await prisma.parcel.findUnique({
    where: { id: PARCEL_ID },
    select: {
      id: true,
      plotNumber: true,
      district: true,
      emirate: true,
      status: true,
      currentValuation: true,
      area: true,
      affectionPlans: {
        orderBy: { fetchedAt: "desc" },
        take: 1,
        select: { id: true, buildingStyle: true, far: true },
      },
    },
  });
  if (!before) {
    throw new Error(
      `Parcel ${PARCEL_ID} not found. Did commit 45331b9 land? Run the seed script first.`,
    );
  }
  console.log(
    `Before:\n` +
      `  id=${before.id}\n` +
      `  plot=${before.plotNumber} ${before.emirate}/${before.district}\n` +
      `  status=${before.status}\n` +
      `  area=${before.area} sqft\n` +
      `  price=${before.currentValuation?.toString() ?? "null"} fils\n` +
      `  latest AffectionPlan: ${before.affectionPlans[0]?.id} ` +
      `buildingStyle=${before.affectionPlans[0]?.buildingStyle ?? "null"}`,
  );

  // Update Parcel price only — every other field left as the seed wrote it.
  const updated = await prisma.parcel.update({
    where: { id: PARCEL_ID },
    data: { currentValuation: PRICE_FILS },
    select: { id: true, currentValuation: true },
  });
  console.log(
    `Parcel: price updated to ${updated.currentValuation?.toString()} fils (${PRICE_AED.toLocaleString("en-US")} AED)`,
  );

  // Append new AffectionPlan row — never delete prior one.
  // Copies the regulatory fields from the previous row (all null for
  // pre-master-plan) and adds buildingStyle + developmentIntent.
  const prev = await prisma.affectionPlan.findFirst({
    where: { parcelId: PARCEL_ID },
    orderBy: { fetchedAt: "desc" },
  });
  if (!prev) {
    throw new Error(
      `No prior AffectionPlan for ${PARCEL_ID}. Seed script must run first.`,
    );
  }

  // Merge the prior `raw` JSON with the new intent flag (preserves
  // source references from the original seed).
  const priorRaw = (prev.raw as Record<string, unknown> | null) ?? {};
  const newRaw: Record<string, unknown> = {
    ...priorRaw,
    developmentIntent: DEVELOPMENT_INTENT,
    villaCount: VILLA_COUNT,
    typicalFloors: TYPICAL_FLOORS,
    price: {
      aed: PRICE_AED,
      fils: PRICE_FILS.toString(),
      source: "founder-manual 2026-04-23 · AED 118/sqft × 5,214,744.20 sqft",
    },
    buildingStyleReason:
      "Cottage-village intent per founder 2026-04-23. Renderer reads " +
      "AffectionPlan.buildingStyle and routes to generateVillaFeatures " +
      "in src/app/parcels/map/page.tsx.",
  };

  const plan = await prisma.affectionPlan.create({
    data: {
      parcelId: PARCEL_ID,
      source:
        "Founder corrections 2026-04-23 (price manual · buildingStyle " +
        "VILLA_COMMUNITY · developmentIntent villa_community). " +
        "Supersedes previous AffectionPlan " +
        `${prev.id} (append-only · per CLAUDE.md).`,
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

      // ── THE KEY CHANGE ──
      buildingStyle: "VILLA_COMMUNITY",

      notes:
        `${prev.notes ?? ""}\n\n` +
        `[2026-04-23 founder correction] buildingStyle = VILLA_COMMUNITY. ` +
        `Render as ${VILLA_COUNT} low-rise villas (${TYPICAL_FLOORS} floors typical, ` +
        `~20m² footprint each) distributed across polygon. ` +
        `Price: AED ${PRICE_AED.toLocaleString("en-US")} (manual, 118/sqft plot basis).`,

      raw: newRaw as unknown as Prisma.InputJsonValue,
    },
  });

  console.log(
    `AffectionPlan: appended ${plan.id}  ` +
      `buildingStyle=${plan.buildingStyle}  ` +
      `prior=${prev.id} (kept)`,
  );

  // Verify.
  console.log("\n── Verification ──");
  const after = await prisma.parcel.findUnique({
    where: { id: PARCEL_ID },
    select: {
      id: true,
      currentValuation: true,
      area: true,
      affectionPlans: {
        orderBy: { fetchedAt: "desc" },
        take: 2,
        select: { id: true, buildingStyle: true, fetchedAt: true },
      },
    },
  });
  if (after) {
    const aed = after.currentValuation ? Number(after.currentValuation) / 100 : null;
    const pricePerSqft = aed && after.area ? aed / after.area : null;
    console.log(
      `  currentValuation=${after.currentValuation?.toString()} fils (${aed?.toLocaleString("en-US")} AED)`,
    );
    console.log(
      `  derived price-per-sqft = ${pricePerSqft?.toFixed(2)} AED  (expected 118.00)`,
    );
    console.log(`  AffectionPlans (most recent 2):`);
    for (const p of after.affectionPlans) {
      console.log(
        `    ${p.id}  buildingStyle=${p.buildingStyle ?? "null"}  fetched=${p.fetchedAt.toISOString()}`,
      );
    }
  }

  console.log("\nDone.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
