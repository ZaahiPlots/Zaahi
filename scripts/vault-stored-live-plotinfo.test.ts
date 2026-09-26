// Vault plot-lookup — enrich a stored hit with live PlotInfo + BuildingLimit.
//
//   npx tsx scripts/vault-stored-live-plotinfo.test.ts
//
// enrichStoredHit (src/lib/dda-stored-plot-lookup.ts) is the merge logic
// /api/me/vault/plot-lookup calls on a "zaahi_stored" hit. It takes
// injectable PlotInfo/BuildingLimit fetchers so this exercises the merge
// rule with no network call and no DIS token flow:
//   - polygon/area always stay from stored data (checked in the route,
//     not here — enrichStoredHit doesn't see them)
//   - land use / floors / FAR / height / setbacks / buildingLimit come from
//     PlotInfo/BuildingLimit when present, otherwise stored (land use only)
//   - a PlotInfo or BuildingLimit failure degrades to null, never throws
//
// Fails on main — enrichStoredHit doesn't exist there. Passes here.

import {
  enrichStoredHit,
  type StoredHitEnrichment,
} from "../src/lib/dda-stored-plot-lookup";
import type { AffectionPlan } from "../src/lib/dda";

let failures = 0;
function check(name: string, cond: boolean, detail = "") {
  if (cond) console.log(`  PASS  ${name}`);
  else { failures++; console.log(`  FAIL  ${name}${detail ? ` — ${detail}` : ""}`); }
}

function fakePlan(overrides: Partial<AffectionPlan> = {}): AffectionPlan {
  return {
    plotNumber: "6489099",
    oldNumber: null,
    projectName: "DUBAI LAND RESIDENCE COMPLEX",
    community: null,
    masterDeveloper: null,
    plotAreaSqm: 7782.0,
    plotAreaSqft: 83762.8,
    maxGfaSqm: 15564.0,
    maxGfaSqft: 167525.6,
    maxHeightCode: "G+9",
    maxFloors: 10,
    maxHeightMeters: 40,
    far: 2.0,
    setbacks: [{ side: 1, building: 6, podium: null }],
    landUseMix: [{ category: "HOSPITALITY", sub: "HOTEL", areaSqm: 7782.0 }],
    sitePlanIssue: null,
    sitePlanExpiry: null,
    notes: null,
    ...overrides,
  };
}

const FAKE_LIMIT: GeoJSON.Polygon = {
  type: "Polygon",
  coordinates: [[[55.1, 25.0], [55.11, 25.0], [55.11, 25.01], [55.1, 25.0]]],
};

async function main() {
  console.log("\nVault stored-hit live PlotInfo enrichment\n" + "=".repeat(60));

  // ── 1. PlotInfo ok -> live land use wins over the stale stored value ────
  console.log("\n1. stored hit + PlotInfo ok -> live land use wins");
  const r1: StoredHitEnrichment = await enrichStoredHit(
    "6489099",
    { landUse: "COMMERCIAL" }, // stale April snapshot
    {
      fetchPlotInfoHtml: async () => "<html>fake</html>",
      parseAffectionPlan: () => fakePlan(),
      fetchBuildingLimit: async () => FAKE_LIMIT,
    },
  );
  check("land use is the live category, not the stale stored one", r1.landUse === "HOSPITALITY", r1.landUse ?? "null");
  check("plan is populated", r1.plan !== null);
  check("buildingLimit is populated", r1.buildingLimit !== null);
  check("fieldSources.landUse is live_dda", r1.fieldSources.landUse === "live_dda");
  check("fieldSources.floors is live_dda", r1.fieldSources.floors === "live_dda");
  check("fieldSources.far is live_dda", r1.fieldSources.far === "live_dda");
  check("fieldSources.height is live_dda", r1.fieldSources.height === "live_dda");
  check("fieldSources.setbacks is live_dda", r1.fieldSources.setbacks === "live_dda");
  check("fieldSources.buildingLimit is live_dda", r1.fieldSources.buildingLimit === "live_dda");

  // ── 2. PlotInfo throws -> falls back to stored values, never throws ─────
  console.log("\n2. stored hit + PlotInfo throws -> stored values, no error");
  let threw = false;
  let r2: StoredHitEnrichment | null = null;
  try {
    r2 = await enrichStoredHit(
      "6489099",
      { landUse: "COMMERCIAL" },
      {
        fetchPlotInfoHtml: async () => { throw new Error("HTTP 503"); },
        parseAffectionPlan: () => fakePlan(), // unreachable — fetchPlotInfoHtml throws first
        fetchBuildingLimit: async () => FAKE_LIMIT,
      },
    );
  } catch {
    threw = true;
  }
  check("enrichStoredHit does not throw", !threw);
  if (r2) {
    check("land use falls back to the stored value", r2.landUse === "COMMERCIAL", r2.landUse ?? "null");
    check("plan is null", r2.plan === null);
    check("fieldSources.landUse is stored", r2.fieldSources.landUse === "stored");
    check("fieldSources.floors is stored", r2.fieldSources.floors === "stored");
    // BuildingLimit fetch is independent of PlotInfo — still live here.
    check("buildingLimit is unaffected by the PlotInfo failure", r2.buildingLimit !== null);
  }

  // ── 3. BuildingLimit null -> result still returned ───────────────────────
  console.log("\n3. stored hit + BuildingLimit null -> result still returned");
  const r3 = await enrichStoredHit(
    "6489099",
    { landUse: "COMMERCIAL" },
    {
      fetchPlotInfoHtml: async () => "<html>fake</html>",
      parseAffectionPlan: () => fakePlan(),
      fetchBuildingLimit: async () => null,
    },
  );
  check("result is returned (not blocked by a missing building limit)", r3 !== null && r3 !== undefined);
  check("plan is still populated", r3.plan !== null);
  check("buildingLimit is null", r3.buildingLimit === null);
  check("fieldSources.buildingLimit is stored", r3.fieldSources.buildingLimit === "stored");
  check("land use is still the live value", r3.landUse === "HOSPITALITY", r3.landUse ?? "null");

  // Same check, but BuildingLimit *throws* rather than resolving null —
  // the other best-effort failure shape it can take.
  const r3b = await enrichStoredHit(
    "6489099",
    { landUse: "COMMERCIAL" },
    {
      fetchPlotInfoHtml: async () => "<html>fake</html>",
      parseAffectionPlan: () => fakePlan(),
      fetchBuildingLimit: async () => { throw new Error("HTTP 500"); },
    },
  );
  check("BuildingLimit throwing also degrades to null, not an unhandled rejection", r3b.buildingLimit === null);

  console.log("\n" + "=".repeat(60));
  if (failures) { console.log(`\n${failures} failure(s)\n`); process.exit(1); }
  console.log("\nall assertions passed\n");
}

void main();
