// Vault plot-lookup local fallback — stored hit / stored miss / precedence.
//
//   npx tsx scripts/dda-stored-plot-lookup.test.ts
//
// /api/me/vault/plot-lookup/route.ts checks, in order: (1) Parcel table,
// (2) our own stored DDA data (this file's lookupStoredDdaPlot — no network
// call), (3) live DDA. Step (1) is a trivial unconditional early-return in
// the route before step (2) ever runs — "Parcel hit still wins" is enforced
// structurally there, not something this script can exercise without a live
// DB/auth session. What IS testable here, with no DB and no network, are the
// two functions the route actually calls for steps (2) and (3), in the same
// order, on real committed data:
//   - lookupStoredDdaPlot hit for a real plot (6489099, 6731157)
//   - lookupStoredDdaPlot miss falling through to a (mocked) live DDA call
//
// Fails on main — lookupStoredDdaPlot / data/dda-plot-index.json don't exist
// there. Passes here.

import { lookupStoredDdaPlot, STORED_DDA_SNAPSHOT_DATE } from "../src/lib/dda-stored-plot-lookup";
import { fetchDdaPlotByNumber } from "../src/lib/dda-plot-lookup";

let failures = 0;
function check(name: string, cond: boolean, detail = "") {
  if (cond) console.log(`  PASS  ${name}`);
  else { failures++; console.log(`  FAIL  ${name}${detail ? ` — ${detail}` : ""}`); }
}

function mockFetchOnce(body: unknown) {
  (global as unknown as { fetch: typeof fetch }).fetch = (async () =>
    ({ ok: true, status: 200, json: async () => body }) as Response) as typeof fetch;
}

async function main() {
  console.log("\nVault local-fallback: stored hit / stored miss -> live\n" + "=".repeat(60));

  // ── 1. Stored hit — the actual regression plot, 6489099 ─────────────────
  console.log("\n1. lookupStoredDdaPlot('6489099') -> hit, real data");
  const dlrc = lookupStoredDdaPlot("6489099");
  check("found", dlrc !== null);
  if (dlrc) {
    check("district is the project name", dlrc.district === "DUBAI LAND RESIDENCE COMPLEX", dlrc.district);
    check("area matches the stored snapshot", dlrc.area === 83762.8, String(dlrc.area));
    check("geometry is a polygon with a ring", dlrc.geometry.type === "Polygon" && dlrc.geometry.coordinates[0].length >= 3);
    check("snapshot date constant is set", typeof STORED_DDA_SNAPSHOT_DATE === "string" && STORED_DDA_SNAPSHOT_DATE.length > 0);
  }

  // ── 2. Stored hit — control plot, 6731157 (Arjan) ────────────────────────
  console.log("\n2. lookupStoredDdaPlot('6731157') -> hit, real data");
  const arjan = lookupStoredDdaPlot("6731157");
  check("found", arjan !== null);
  if (arjan) check("district is ARJAN", arjan.district === "ARJAN", arjan.district);

  // ── 3. Stored miss — falls through to live DDA (mocked) ─────────────────
  console.log("\n3. stored miss -> live DDA fallback runs next, same order as the route");
  const fakePlot = "9999998"; // 7 digits, not in the 99,126-plot index
  const storedMiss = lookupStoredDdaPlot(fakePlot);
  check("stored miss returns null", storedMiss === null);
  mockFetchOnce({ error: { code: 499, message: "Token Required" } });
  const live = await fetchDdaPlotByNumber(fakePlot);
  check("live DDA call after a stored miss reports unavailable, not not_found", live.status === "unavailable", JSON.stringify(live));

  console.log("\n" + "=".repeat(60));
  if (failures) { console.log(`\n${failures} failure(s)\n`); process.exit(1); }
  console.log("\nall assertions passed\n");
}

void main();
