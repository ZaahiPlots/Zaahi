/**
 * Seed ZAAHI listing — Plot 9235849, Al Yalayis 3, Dubailand, Dubai.
 * Master developer: DUBAI LAND (L.L.C). Land use: FUTURE DEVELOPMENT.
 * No price provided (founder-deferred). No GFA / height / setbacks yet
 * (master plan pending per DDA affection plan).
 *
 * Source hierarchy tried in order:
 *   A. Existing DDA GeoJSON corpus   — HIT
 *      `data/layers/dda/dubai_land.geojson` contains feature id "9235849"
 *      with properties {PLOT_NUMBER, PROJECT_NAME: "DUBAI LAND",
 *      AREA_SQFT: 5214744.2} and a 40-point WGS84 polygon ring.
 *   B. DDA live GIS API              — NOT ATTEMPTED (A succeeded)
 *   C. Edge-length reconstruction    — NOT ATTEMPTED (A succeeded)
 *
 * The PDF (`data/affection-plans/9235849.pdf`) describes a 13-vertex
 * polygon with edge-length labels but no coordinate table — we trust
 * the pre-existing GeoJSON ring because (a) its plotNumber + AREA_SQFT
 * match the PDF exactly, and (b) 0.43 % area diff vs declared is well
 * inside tolerance.
 *
 * Idempotent: upserts Parcel on (emirate, district, plotNumber) and
 * appends a fresh AffectionPlan row.
 *
 * Price rule — null (founder did NOT provide a price). Never auto-
 * calculated per CLAUDE.md "Цена участка — ТОЛЬКО ВРУЧНУЮ".
 *
 * Rendering rule — per CLAUDE.md "FUTURE DEVELOPMENT (земля без
 * зданий) — только fill polygon, без 3D extrusion." Also confirmed
 * in `src/app/parcels/map/page.tsx:2237` where landUse ===
 * "FUTURE_DEVELOPMENT" short-circuits the 3D extrusion path.
 *
 * Run: npx tsx -r dotenv/config scripts/seed-9235849-al-yalayis-3.ts dotenv_config_path=.env.local
 */
import { promises as fs } from "node:fs";
import path from "node:path";
import { UserRole, ParcelStatus, Prisma } from "@prisma/client";
import { prisma } from "../src/lib/prisma";

const SYSTEM_USER_ID = "00000000-0000-0000-0000-00000000zaah";
const SYSTEM_EMAIL = "system@zaahi.ae";

// ── Plot attributes (from founder-provided DDA affection plan PDF) ───────
const PLOT_NUMBER = "9235849";
const EMIRATE = "Dubai";
const DISTRICT = "AL YALAYIS 3";
const COMMUNITY = "AL YALAYIS 3";
const PROJECT_NAME = "DUBAI LAND";
const MASTER_DEVELOPER = "DUBAI LAND (L.L.C)";

const LANDUSE_DESCRIPTION = "FUTURE DEVELOPMENT";
// Canonical ZAAHI 9-category label. deriveLandUse in map/page.tsx
// matches `/future\s*development/` → "FUTURE_DEVELOPMENT".
const CANONICAL_LAND_USE = "FUTURE_DEVELOPMENT";

const PLOT_AREA_SQM = 484_465.59;
const PLOT_AREA_SQFT = 5_214_744.20;

// Pre-master-plan · no firm values in PDF:
const MAX_HEIGHT_CODE: string | null = null;
const MAX_FLOORS: number | null = null;
const MAX_HEIGHT_METERS: number | null = null;
const FAR: number | null = null;
const MAX_GFA_SQM: number | null = null;
const MAX_GFA_SQFT: number | null = null;

const GENERAL_NOTES =
  "APPROVED MASTER PLAN IS REQUIRED PRIOR TO ANY SUBMITTALS. " +
  "MASTER DEVELOPER MUST COMPLY WITH REQUIREMENTS, APPLICABLE " +
  "GUIDELINES AND TECHNICAL CONDITIONS STIPULATED IN THE DUBAI 2040 " +
  "PLAN AND RELEVANT PLANNING AND SERVICE AUTHORITIES PRIOR TO " +
  "MASTER PLAN APPROVAL.";

// ── Geometry source — extract feature 9235849 from DDA GeoJSON corpus. ───
const DDA_CORPUS_PATH = "data/layers/dda/dubai_land.geojson";

async function loadGeometryFromDdaCorpus(): Promise<GeoJSON.Polygon> {
  const text = await fs.readFile(path.join(process.cwd(), DDA_CORPUS_PATH), "utf8");
  const coll = JSON.parse(text) as GeoJSON.FeatureCollection;
  const feat = coll.features.find(
    (f) => (f as unknown as { id?: string }).id === PLOT_NUMBER,
  );
  if (!feat) {
    throw new Error(
      `Plot ${PLOT_NUMBER} not found in ${DDA_CORPUS_PATH}. Aborting — do not commit placeholder geometry.`,
    );
  }
  if (feat.geometry.type !== "Polygon") {
    throw new Error(
      `Plot ${PLOT_NUMBER} has unexpected geometry type '${feat.geometry.type}'.`,
    );
  }
  return feat.geometry as GeoJSON.Polygon;
}

function centroidOf(ring: number[][]): { lng: number; lat: number } {
  const pts = ring[0] === ring[ring.length - 1] ? ring.slice(0, -1) : ring;
  const lng = pts.reduce((s, p) => s + p[0], 0) / pts.length;
  const lat = pts.reduce((s, p) => s + p[1], 0) / pts.length;
  return { lng, lat };
}

function bboxOf(ring: number[][]) {
  const lngs = ring.map((p) => p[0]);
  const lats = ring.map((p) => p[1]);
  return {
    minLng: Math.min(...lngs),
    maxLng: Math.max(...lngs),
    minLat: Math.min(...lats),
    maxLat: Math.max(...lats),
  };
}

/** Equirectangular approximation for polygon area in m² (WGS84 ring). */
function polygonAreaSqm(ring: number[][]): number {
  if (ring.length < 4) return 0;
  const latMid = ring.reduce((s, p) => s + p[1], 0) / ring.length;
  const mPerDegLat = 111_320;
  const mPerDegLng = 111_320 * Math.cos((latMid * Math.PI) / 180);
  let a = 0;
  for (let i = 0; i < ring.length - 1; i++) {
    const [x1, y1] = ring[i];
    const [x2, y2] = ring[i + 1];
    a += x1 * mPerDegLng * (y2 * mPerDegLat) - x2 * mPerDegLng * (y1 * mPerDegLat);
  }
  return Math.abs(a / 2);
}

async function ensureSystemUser() {
  await prisma.user.upsert({
    where: { id: SYSTEM_USER_ID },
    create: {
      id: SYSTEM_USER_ID,
      email: SYSTEM_EMAIL,
      role: UserRole.ADMIN,
      name: "ZAAHI System",
    },
    update: {},
  });
}

async function main() {
  await ensureSystemUser();

  console.log(`\n── Seeding plot ${PLOT_NUMBER} · ${COMMUNITY} ──`);

  // Pre-flight duplicate check.
  const preDups = await prisma.parcel.findMany({
    where: { plotNumber: PLOT_NUMBER },
    select: {
      id: true,
      plotNumber: true,
      emirate: true,
      district: true,
      status: true,
      currentValuation: true,
    },
  });
  if (preDups.length === 0) {
    console.log(`Pre-flight: plot ${PLOT_NUMBER} not in DB — will CREATE.`);
  } else {
    console.log("Pre-flight — existing row(s):");
    for (const d of preDups) {
      console.log(
        `  ${d.plotNumber}: id=${d.id}  ${d.emirate}/${d.district}  status=${d.status}  price=${d.currentValuation?.toString() ?? "null"}`,
      );
    }
    console.log("Will UPDATE in-place (keeps existing price/status).");
  }

  // Load geometry from existing DDA corpus.
  const geometry = await loadGeometryFromDdaCorpus();
  const ring = geometry.coordinates[0];
  const c = centroidOf(ring);
  const bb = bboxOf(ring);
  const polyArea = polygonAreaSqm(ring);
  const pctDiff = ((polyArea - PLOT_AREA_SQM) / PLOT_AREA_SQM) * 100;

  console.log(
    `Geometry (from ${DDA_CORPUS_PATH}):\n` +
      `  vertices: ${ring.length}\n` +
      `  centroid: lng=${c.lng.toFixed(6)}, lat=${c.lat.toFixed(6)}\n` +
      `  bbox: [${bb.minLng.toFixed(6)},${bb.minLat.toFixed(6)} .. ${bb.maxLng.toFixed(6)},${bb.maxLat.toFixed(6)}]\n` +
      `  area: ${polyArea.toFixed(2)} m² (declared ${PLOT_AREA_SQM} m², diff ${pctDiff.toFixed(2)}%)`,
  );

  // Sanity — centroid must be in Dubailand (roughly 25.0°N, 55.33°E) with tolerance.
  if (c.lat < 24.9 || c.lat > 25.1 || c.lng < 55.25 || c.lng > 55.45) {
    throw new Error(
      `Centroid (${c.lng.toFixed(6)}, ${c.lat.toFixed(6)}) is outside Dubailand — aborting.`,
    );
  }
  if (Math.abs(pctDiff) > 5) {
    throw new Error(
      `Polygon area (${polyArea.toFixed(2)} m²) differs from declared (${PLOT_AREA_SQM} m²) by ${pctDiff.toFixed(1)}% > 5% — aborting.`,
    );
  }

  // Upsert Parcel.
  const existing = await prisma.parcel.findUnique({
    where: {
      emirate_district_plotNumber: {
        emirate: EMIRATE,
        district: DISTRICT,
        plotNumber: PLOT_NUMBER,
      },
    },
  });

  const parcel = await prisma.parcel.upsert({
    where: {
      emirate_district_plotNumber: {
        emirate: EMIRATE,
        district: DISTRICT,
        plotNumber: PLOT_NUMBER,
      },
    },
    create: {
      plotNumber: PLOT_NUMBER,
      ownerId: SYSTEM_USER_ID,
      area: PLOT_AREA_SQFT,
      emirate: EMIRATE,
      district: DISTRICT,
      latitude: c.lat,
      longitude: c.lng,
      geometry: geometry as unknown as Prisma.InputJsonValue,
      status: ParcelStatus.LISTED,
      currentValuation: null, // founder did NOT provide a price — honest null
    },
    update: {
      area: PLOT_AREA_SQFT,
      latitude: c.lat,
      longitude: c.lng,
      geometry: geometry as unknown as Prisma.InputJsonValue,
      // Never touch price/status on re-run.
    },
  });

  console.log(
    existing
      ? `Parcel: updated ${parcel.id} (status=${parcel.status}, kept price=${parcel.currentValuation?.toString() ?? "null"})`
      : `Parcel: created ${parcel.id} (LISTED, price=null — to be set by founder)`,
  );

  // AffectionPlan — pre-master-plan, all regulation fields null.
  const landUseMixJson = [
    {
      category: "FUTURE DEVELOPMENT",
      sub: "Pre-Master-Plan Land",
      areaSqm: PLOT_AREA_SQM,
      note: "Master plan approval required prior to any submittals",
    },
  ];

  const plan = await prisma.affectionPlan.create({
    data: {
      parcelId: parcel.id,
      source:
        "Founder-provided DDA affection plan PDF (9235849 - Plot Details.pdf). " +
        "Geometry sourced from data/layers/dda/dubai_land.geojson (DDA corpus · feature id 9235849). " +
        "PDF stored at data/affection-plans/9235849.pdf.",
      plotNumber: PLOT_NUMBER,
      oldNumber: null, // 9235849 IS the DDA plot number — no secondary reference
      projectName: PROJECT_NAME,
      community: COMMUNITY,
      masterDeveloper: MASTER_DEVELOPER,

      plotAreaSqm: PLOT_AREA_SQM,
      plotAreaSqft: PLOT_AREA_SQFT,
      maxGfaSqm: MAX_GFA_SQM, // null — pending master plan
      maxGfaSqft: MAX_GFA_SQFT, // null — pending master plan

      maxHeightCode: MAX_HEIGHT_CODE, // null
      maxFloors: MAX_FLOORS, // null
      maxHeightMeters: MAX_HEIGHT_METERS, // null
      far: FAR, // null — pending master plan

      setbacks: Prisma.JsonNull, // pending master plan
      landUseMix: landUseMixJson as unknown as Prisma.InputJsonValue,

      sitePlanIssue: null,
      sitePlanExpiry: null,

      buildingLimitGeometry: Prisma.JsonNull, // no 3D extrusion for FUTURE_DEVELOPMENT
      buildingStyle: null, // default · renderer will short-circuit on landUse check

      notes:
        `Plot ${PLOT_NUMBER} · ${COMMUNITY} · ${LANDUSE_DESCRIPTION}. ` +
        `Area: ${PLOT_AREA_SQM} m² (${PLOT_AREA_SQFT} ft²). ` +
        `Master developer: ${MASTER_DEVELOPER}. Project: ${PROJECT_NAME}. ` +
        `NO firm GFA / FAR / height / setbacks — master plan pending. ` +
        GENERAL_NOTES,

      raw: {
        source: {
          pdf: "9235849 - Plot Details.pdf",
          localPath: "data/affection-plans/9235849.pdf",
          originalPath: "/home/zaahi/Загрузки/9235849 - Plot Details.pdf",
          geometrySource: DDA_CORPUS_PATH,
          geometryFeatureId: "9235849",
          ddaGisUrl: "https://gis.dda.gov.ae/dis/?PlotNumber=9235849",
        },
        landUse: {
          canonical: CANONICAL_LAND_USE,
          description: LANDUSE_DESCRIPTION,
          pdfRaw: "FUTURE DEVELOPMENT",
        },
        geometry: {
          source: "Existing DDA corpus (Option B) · Option A not attempted because B was a clean hit",
          projection: "WGS84 (EPSG:4326) — already reprojected in corpus",
          vertexCount: ring.length,
          computedAreaSqm: Math.round(polyArea * 100) / 100,
          declaredAreaSqm: PLOT_AREA_SQM,
          declaredAreaSqft: PLOT_AREA_SQFT,
          areaDiffPct: Math.round(pctDiff * 100) / 100,
          pdfSaidVertices: 13,
          actualVertices: ring.length,
          vertexMismatchNote:
            "PDF shows 13 dimensioned edges; GeoJSON has 40 vertices. " +
            "Trusted GeoJSON because AREA_SQFT in its properties matches PDF exactly " +
            "and 0.43% polygon-area diff is within 5% tolerance.",
        },
        masterPlan: {
          status: "PENDING",
          gfa: null,
          height: null,
          setbacks: null,
          coverage: null,
          parking: null,
          utilities: null,
        },
        generalNotes: GENERAL_NOTES,
        price: null, // founder-deferred
      } as unknown as Prisma.InputJsonValue,
    },
  });

  console.log(
    `AffectionPlan: created ${plan.id}  ` +
      `landUse=${CANONICAL_LAND_USE}  area=${PLOT_AREA_SQM} m²  price=null  gfa=null (pre-master-plan)`,
  );

  // Verification.
  console.log("\n── Verification ──");
  const verify = await prisma.parcel.findUnique({
    where: { id: parcel.id },
    select: {
      id: true,
      plotNumber: true,
      emirate: true,
      district: true,
      status: true,
      area: true,
      currentValuation: true,
      latitude: true,
      longitude: true,
      geometry: true,
      affectionPlans: {
        orderBy: { fetchedAt: "desc" },
        take: 1,
        select: {
          id: true,
          far: true,
          maxFloors: true,
          landUseMix: true,
          masterDeveloper: true,
          projectName: true,
        },
      },
    },
  });
  if (verify && verify.geometry) {
    const g = verify.geometry as unknown as GeoJSON.Polygon;
    const ring2 = g.coordinates[0];
    const bb2 = bboxOf(ring2);
    const a2 = polygonAreaSqm(ring2);
    console.log(
      `  id=${verify.id}\n` +
        `  ${verify.emirate}/${verify.district}  plot=${verify.plotNumber}  status=${verify.status}\n` +
        `  areaSqft=${verify.area}  price=${verify.currentValuation?.toString() ?? "null"}\n` +
        `  centroid=${verify.longitude?.toFixed(6)},${verify.latitude?.toFixed(6)}\n` +
        `  polygon bbox=[${bb2.minLng.toFixed(6)},${bb2.minLat.toFixed(6)} .. ${bb2.maxLng.toFixed(6)},${bb2.maxLat.toFixed(6)}]\n` +
        `  polygon vertices=${ring2.length}  area=${a2.toFixed(2)} m²`,
    );
    console.log(
      `  latest AffectionPlan: ${verify.affectionPlans[0]?.id}  ` +
        `project=${verify.affectionPlans[0]?.projectName}  ` +
        `developer=${verify.affectionPlans[0]?.masterDeveloper}  ` +
        `far=${verify.affectionPlans[0]?.far ?? "null"}`,
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
