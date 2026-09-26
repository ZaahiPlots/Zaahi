// Regression test — DDA "Token Required" must never read as "plot not in DDA".
//
//   npx tsx scripts/dda-plot-lookup-error-handling.test.ts
//
// 2026-09-26: BASIC_LAND_BASE started answering every query with HTTP 200 +
// {"error":{"code":499,"message":"Token Required"}}. fetchDdaPlotByNumber only
// checked res.ok (true — the error body IS a 200), then saw an empty features[]
// and returned null — every caller read that as "not_found", and the vault
// wizard told the founder plot 6489099 "isn't in DDA" when DDA was simply down.
//
// This fails on main (fetchDdaPlotByNumber returns DdaPlotResult | null, with
// no way to tell a 499 apart from a real miss) and passes on the fix branch
// (fetchDdaPlotByNumber returns a discriminated hit / not_found / unavailable).
// See docs/agent-log/2026-09-26-dda-token-restore.md for the full trace.

import { fetchDdaPlotByNumber } from "../src/lib/dda-plot-lookup";

let failures = 0;
function check(name: string, cond: boolean, detail = "") {
  if (cond) console.log(`  PASS  ${name}`);
  else { failures++; console.log(`  FAIL  ${name}${detail ? ` — ${detail}` : ""}`); }
}

function mockFetchOnce(response: { ok: boolean; status?: number; body: unknown }) {
  (global as unknown as { fetch: typeof fetch }).fetch = (async () =>
    ({
      ok: response.ok,
      status: response.status ?? (response.ok ? 200 : 500),
      json: async () => response.body,
    }) as Response) as typeof fetch;
}

const VALID_GEOJSON_FEATURE = {
  features: [
    {
      geometry: { type: "Polygon", coordinates: [[[55.1, 25.1], [55.2, 25.1], [55.2, 25.2], [55.1, 25.1]]] },
      properties: { PROJECT_NAME: "ARJAN", AREA_SQFT: 12345, LANDUSE_CATEGORY: "RESIDENTIAL" },
    },
  ],
};

async function main() {
  console.log("\nDDA plot lookup — 499 vs not_found vs hit\n" + "=".repeat(60));

  // ── 1. ArcGIS error body (the actual 2026-09-26 regression) ─────────────
  console.log("\n1. HTTP 200 + ArcGIS error body -> unavailable, never not_found");
  mockFetchOnce({ ok: true, status: 200, body: { error: { code: 499, message: "Token Required" } } });
  const tokenWalled = await fetchDdaPlotByNumber("6489099");
  check("status is unavailable", tokenWalled.status === "unavailable", JSON.stringify(tokenWalled));

  // ── 2. Genuine miss — clean response, empty features ────────────────────
  console.log("\n2. empty features[] -> not_found");
  mockFetchOnce({ ok: true, status: 200, body: { features: [] } });
  const miss = await fetchDdaPlotByNumber("9999999");
  check("status is not_found", miss.status === "not_found", JSON.stringify(miss));

  // ── 3. Hit — valid feature parses through ───────────────────────────────
  console.log("\n3. valid feature -> hit");
  mockFetchOnce({ ok: true, status: 200, body: VALID_GEOJSON_FEATURE });
  const hit = await fetchDdaPlotByNumber("6731157");
  check("status is hit", hit.status === "hit", JSON.stringify(hit));
  if (hit.status === "hit") {
    check("district parsed", hit.data.district === "ARJAN");
    check("area parsed", hit.data.area === 12345);
  }

  // ── 4. Plain HTTP failure also unavailable, not not_found ───────────────
  console.log("\n4. HTTP 500 -> unavailable");
  mockFetchOnce({ ok: false, status: 500, body: {} });
  const httpFail = await fetchDdaPlotByNumber("6489099");
  check("status is unavailable", httpFail.status === "unavailable", JSON.stringify(httpFail));

  console.log("\n" + "=".repeat(60));
  if (failures) { console.log(`\n${failures} failure(s)\n`); process.exit(1); }
  console.log("\nall assertions passed\n");
}

void main();
