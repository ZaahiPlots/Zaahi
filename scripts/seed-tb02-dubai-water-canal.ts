/**
 * Seed ZAAHI listing — Plot TB02 (internal DLD ref 3435332), Dubai Water Canal,
 * Business Bay waterfront, Dubai. Mixed Use High Rise (Furnished Apartments)
 * with retail podium. AED 1.2 billion. Founder-provided affection plan PDF.
 *
 * Source: founder-provided DLD affection plan PDF
 * (`/home/zaahi/Загрузки/TB02.pdf`, also copied to
 * `data/affection-plans/tb02.pdf` for shipping).
 *
 * Coordinates — 5 vertices provided in Dubai Local TM (EPSG:3997 · NOT true
 * UTM 40N; the easting range ~491,700–491,950 is characteristic of Dubai TM
 * with its false-east at 500,000 m @ 55°20′ central meridian).
 *
 * Traversal order — discovered by brute-forcing all 5-vertex permutations
 * against the declared 17,219 m² plot area:
 *   order [P0, P1, P4, P3, P2]  →  17,139.9 m²  (-0.46 %)  simple polygon ✓
 * All other simple orderings give >13 % area error.
 *
 * Idempotent: upserts Parcel on (emirate, district, plotNumber) and appends
 * a fresh AffectionPlan row (never deletes prior rows, per CLAUDE.md).
 *
 * Price rule — per CLAUDE.md "Цена участка — ТОЛЬКО ВРУЧНУЮ":
 *   1,200,000,000 AED → 120,000,000,000 fils. Set on CREATE only.
 *   On re-run currentValuation is left exactly as-is.
 *
 * Run: npx tsx -r dotenv/config scripts/seed-tb02-dubai-water-canal.ts dotenv_config_path=.env.local
 */
import proj4 from "proj4";
import { UserRole, ParcelStatus, Prisma } from "@prisma/client";
import { prisma } from "../src/lib/prisma";

// EPSG:3997 — Dubai Local TM (central meridian 55°20′)
proj4.defs(
  "EPSG:3997",
  "+proj=tmerc +lat_0=0 +lon_0=55.33333333333334 +k=1 +x_0=500000 +y_0=0 +ellps=WGS84 +units=m +no_defs",
);

const SYSTEM_USER_ID = "00000000-0000-0000-0000-00000000zaah";
const SYSTEM_EMAIL = "system@zaahi.ae";

// ── Plot attributes (from founder-provided affection plan PDF) ─────────────
const PLOT_NUMBER = "TB02";
const INTERNAL_DLD_REF = "3435332";
const EMIRATE = "Dubai";
const DISTRICT = "DUBAI WATER CANAL";
const COMMUNITY = "Dubai Water Canal";
const AUTHORITY = "Dubai Municipality · Dubai Water Canal";
const LANDUSE_DESCRIPTION = "Mixed Use High Rise (Furnished Apt.)";
const CANONICAL_LAND_USE = "MIXED_USE"; // per CLAUDE.md 9 canonical categories

const PLOT_AREA_SQM = 17_219;
const PLOT_AREA_SQFT = 185_344;
const GFA_SQM = 86_433;
const GFA_SQFT = 930_357;
const FAR = 5.02;
const MAX_HEIGHT_CODE = "G+5P+Unlimited";
const MAX_HEIGHT_METERS = 189; // default tall-tower interpretation of "Unlimited" (54 residential floors
                               // visible in PDF illustrative section ≈ 54×3.5m)
const MAX_FLOORS = 54; // 1 Ground + 5 Podium + 48 Mixed-Use Tower per PDF illustrative section
const PARKING = "DM Standards";
const SETBACKS_TEXT = "Front 1.2 m · others per DM Standard";

// Utility demands (declared on the PDF; ZAAHI schema has no dedicated fields,
// stored in AffectionPlan.raw + surfaced in notes for operator visibility).
const ELEC_LOAD_KW = 28_178;
const WATER_DEMAND_M3_DAY = 921.60;
const SEWAGE_FLOW_M3_DAY = 737.28;

// ── Price (ONLY MANUAL — 1.2 BN AED) ─────────────────────────────────────
const PRICE_AED = 1_200_000_000;
const PRICE_FILS = 120_000_000_000n;

// ── Geometry (EPSG:3997, traversal P0→P1→P4→P3→P2 per area-solve) ─────────
// Point labels match the 5 E/N blocks in the PDF (layout-preserving extraction).
const P0 = [491851.003, 2786613.612]; // top-left (A in PDF)
const P1 = [491945.574, 2786609.432]; // top-right
const P2 = [491731.722, 2786472.118]; // west (middle)
const P3 = [491761.716, 2786412.748]; // south-middle
const P4 = [491778.148, 2786410.828]; // south-east

const UTM_RING_3997: [number, number][] = [
  P0 as [number, number],
  P1 as [number, number],
  P4 as [number, number],
  P3 as [number, number],
  P2 as [number, number],
  P0 as [number, number], // close
];

function reprojectRing(ring: [number, number][]): number[][] {
  return ring.map(([x, y]) => proj4("EPSG:3997", "EPSG:4326", [x, y]));
}

function centroidOf(ring: number[][]): { lng: number; lat: number } {
  const pts = ring.slice(0, -1);
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

  console.log(`\n── Seeding TB02 · Dubai Water Canal ──`);

  // Pre-flight duplicate check (by plotNumber alone, per CLAUDE.md).
  const preDups = await prisma.parcel.findMany({
    where: {
      OR: [{ plotNumber: PLOT_NUMBER }, { plotNumber: INTERNAL_DLD_REF }],
    },
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
    console.log(`Pre-flight: no plot matching ${PLOT_NUMBER} or ${INTERNAL_DLD_REF} — will CREATE.`);
  } else {
    console.log("Pre-flight — existing row(s):");
    for (const d of preDups) {
      console.log(
        `  ${d.plotNumber}: id=${d.id}  ${d.emirate}/${d.district}  ` +
          `status=${d.status}  price=${d.currentValuation?.toString() ?? "null"} fils`,
      );
    }
    console.log("Will UPDATE in-place (keeps existing currentValuation + status).");
  }

  // Reproject geometry to WGS84 and sanity-check.
  const ring = reprojectRing(UTM_RING_3997);
  const geometry: GeoJSON.Polygon = { type: "Polygon", coordinates: [ring] };
  const c = centroidOf(ring);
  const bb = bboxOf(ring);
  const polyArea = polygonAreaSqm(ring);
  const pctDiff = ((polyArea - PLOT_AREA_SQM) / PLOT_AREA_SQM) * 100;

  console.log(
    `Geometry (founder-PDF EPSG:3997 → EPSG:4326):\n` +
      `  centroid: lng=${c.lng.toFixed(6)}, lat=${c.lat.toFixed(6)}\n` +
      `  bbox: [${bb.minLng.toFixed(6)},${bb.minLat.toFixed(6)} .. ${bb.maxLng.toFixed(6)},${bb.maxLat.toFixed(6)}]\n` +
      `  area: ${polyArea.toFixed(2)} m² (declared ${PLOT_AREA_SQM} m², diff ${pctDiff.toFixed(2)}%)`,
  );

  // Sanity — centroid must be in Dubai Water Canal / Business Bay area
  // (roughly lng 55.25, lat 25.18, but allow some tolerance).
  if (c.lat < 25.15 || c.lat > 25.22 || c.lng < 55.23 || c.lng > 55.28) {
    throw new Error(
      `Centroid (${c.lng.toFixed(6)}, ${c.lat.toFixed(6)}) is outside Dubai Water Canal — aborting.`,
    );
  }
  if (Math.abs(pctDiff) > 5) {
    throw new Error(
      `Polygon area (${polyArea.toFixed(2)} m²) differs from declared (${PLOT_AREA_SQM} m²) by ${pctDiff.toFixed(1)}% > 5% — aborting.`,
    );
  }

  // Upsert Parcel on (emirate, district, plotNumber).
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
      currentValuation: PRICE_FILS,
    },
    update: {
      // Refresh geometry + area on re-run; never touch price/status.
      area: PLOT_AREA_SQFT,
      latitude: c.lat,
      longitude: c.lng,
      geometry: geometry as unknown as Prisma.InputJsonValue,
    },
  });

  console.log(
    existing
      ? `Parcel: updated ${parcel.id} (status=${parcel.status}, kept price=${parcel.currentValuation?.toString() ?? "null"} fils)`
      : `Parcel: created ${parcel.id} (LISTED, ${PRICE_AED.toLocaleString("en-US")} AED = ${PRICE_FILS} fils)`,
  );

  // AffectionPlan — always append (never deleteMany, per CLAUDE.md).
  //
  // landUseMix — split Mixed-Use-High-Rise into its component uses so
  // deriveLandUse collapses to MIXED_USE (requires ≥2 distinct mapped
  // categories). Residential (furnished apartments, primary) + Commercial
  // (retail podium) is the standard interpretation of Dubai Mixed-Use
  // High-Rise zoning. The PDF's "(Furnished Apt.)" sub-label drives the
  // Residential entry; retail podium is inferred from the 5-level podium
  // in the PDF illustrative section.
  const landUseMixJson = [
    {
      category: "MIXED_USE",
      sub: "Residential · Furnished Apartments",
      areaSqm: null,
      note: "Primary use per PDF land-use declaration",
    },
    {
      category: "MIXED_USE",
      sub: "Commercial · Retail Podium",
      areaSqm: null,
      note: "Inferred from 5-level podium in illustrative section",
    },
  ];

  const setbacksJson = [
    {
      side: 0,
      description: "Front (per PDF): 1.2 m",
      building: 1.2,
      podium: 1.2,
    },
    {
      side: 1,
      description: "Other sides: DM Standard (4 m assumed for Mixed Use per CLAUDE.md default)",
      building: 4,
      podium: 4,
    },
  ];

  const plan = await prisma.affectionPlan.create({
    data: {
      parcelId: parcel.id,
      source:
        "Founder-provided affection plan PDF (TB02.pdf · Dubai Water Canal · Plot Development Regulations). " +
        "Stored at data/affection-plans/tb02.pdf.",
      plotNumber: PLOT_NUMBER,
      oldNumber: INTERNAL_DLD_REF, // 3435332 — internal DLD reference
      projectName: "Dubai Water Canal Plot TB02",
      community: COMMUNITY,
      masterDeveloper: null, // not specified in PDF

      plotAreaSqm: PLOT_AREA_SQM,
      plotAreaSqft: PLOT_AREA_SQFT,
      maxGfaSqm: GFA_SQM,
      maxGfaSqft: GFA_SQFT,

      maxHeightCode: MAX_HEIGHT_CODE,
      maxFloors: MAX_FLOORS,
      maxHeightMeters: MAX_HEIGHT_METERS,
      far: FAR,

      setbacks: setbacksJson as unknown as Prisma.InputJsonValue,
      landUseMix: landUseMixJson as unknown as Prisma.InputJsonValue,

      sitePlanIssue: null, // PDF has no issue date field
      sitePlanExpiry: null,

      buildingLimitGeometry: Prisma.JsonNull, // use setback-derived footprint (ZAAHI Signature default)
      buildingStyle: "SIGNATURE",

      notes:
        `TB02 · Dubai Water Canal · ${LANDUSE_DESCRIPTION}. ` +
        `Height: ${MAX_HEIGHT_CODE} (rendered at ${MAX_HEIGHT_METERS}m / ${MAX_FLOORS} floors — ` +
        `per PDF illustrative section showing 54 mixed-use floors). ` +
        `GFA=${GFA_SQM} m² (${GFA_SQFT} ft²), FAR=${FAR}. ` +
        `Setbacks: ${SETBACKS_TEXT}. Parking: ${PARKING}. ` +
        `Utilities: Electricity ${ELEC_LOAD_KW} kW, ` +
        `Water ${WATER_DEMAND_M3_DAY} m³/day, ` +
        `Sewage ${SEWAGE_FLOW_M3_DAY} m³/day. ` +
        `Authority: ${AUTHORITY}. Internal DLD ref: ${INTERNAL_DLD_REF}.`,

      raw: {
        source: {
          pdf: "TB02.pdf",
          localPath: "data/affection-plans/tb02.pdf",
          originalPath: "/home/zaahi/Загрузки/TB02.pdf",
          authority: AUTHORITY,
          internalDldRef: INTERNAL_DLD_REF,
        },
        landUse: {
          canonical: CANONICAL_LAND_USE,
          description: LANDUSE_DESCRIPTION,
          pdfRaw: "Mixed Use High Rise (Furnished Apt.)",
        },
        geometry: {
          source: "Founder-provided PDF · layout-preserved pdftotext extraction",
          projection: "EPSG:3997 (Dubai Local TM)",
          utmRing: UTM_RING_3997,
          traversalOrder: "P0→P1→P4→P3→P2 (discovered by area-brute-force ±0.46%)",
          computedAreaSqm: Math.round(polyArea * 100) / 100,
          declaredAreaSqm: PLOT_AREA_SQM,
          declaredAreaSqft: PLOT_AREA_SQFT,
          areaDiffPct: Math.round(pctDiff * 100) / 100,
        },
        height: {
          code: MAX_HEIGHT_CODE,
          renderedMeters: MAX_HEIGHT_METERS,
          renderedFloors: MAX_FLOORS,
          note: "Unlimited height code; illustrative section shows G + 5P + 48 mixed-use floors = 54 floors total.",
        },
        utilities: {
          electricityLoadKw: ELEC_LOAD_KW,
          waterDemandM3PerDay: WATER_DEMAND_M3_DAY,
          sewageFlowM3PerDay: SEWAGE_FLOW_M3_DAY,
        },
        parking: PARKING,
        setbacksText: SETBACKS_TEXT,
        priceAed: PRICE_AED,
        priceFils: PRICE_FILS.toString(),
      } as unknown as Prisma.InputJsonValue,
    },
  });

  console.log(
    `AffectionPlan: created ${plan.id}  ` +
      `height=${MAX_HEIGHT_METERS}m  floors=${MAX_FLOORS}  FAR=${FAR}  ` +
      `landUse=${CANONICAL_LAND_USE}  gfa=${GFA_SQM} m²`,
  );

  // Verification
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
        select: { id: true, far: true, maxFloors: true, maxHeightMeters: true, landUseMix: true },
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
        `  areaSqft=${verify.area}  currentValuation=${verify.currentValuation?.toString() ?? "null"} fils\n` +
        `  centroid=${verify.longitude?.toFixed(6)},${verify.latitude?.toFixed(6)}\n` +
        `  polygon bbox=[${bb2.minLng.toFixed(6)},${bb2.minLat.toFixed(6)} .. ${bb2.maxLng.toFixed(6)},${bb2.maxLat.toFixed(6)}]\n` +
        `  computed polygon area=${a2.toFixed(2)} m² (expected ${PLOT_AREA_SQM} m²)`,
    );
    console.log(
      `  latest AffectionPlan: ${verify.affectionPlans[0]?.id}  ` +
        `far=${verify.affectionPlans[0]?.far}  ` +
        `floors=${verify.affectionPlans[0]?.maxFloors}`,
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
