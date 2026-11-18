// Vault land-use classification + setback-leak cleanup. Pure tests (no browser/DB).
import { expect, test } from "@playwright/test";
import { deriveLandUse } from "../../src/app/parcels/map/land-use";
import { landUseStoredSchema, stripSetbackTail } from "../../src/lib/vault-land-use";

// Plot 3720253 (DDA layer: MAIN_LANDUSE "COMMERCIAL - HOSPITALITY - RESIDENTIAL" → MIXED_USE)
const MIXED =
  "COMMERCIAL : OFFICES, RETAIL / HOSPITALITY : HOTEL, HOTEL APARTMENT / RESIDENTIAL : APARTMENT, VILLA";
const POLLUTED = `${MIXED} Setbacks Side Building Podium Side 1 SEE NOTES SEE NOTES Side 2 SEE NOTES SEE NOTES`;

test("A: multi-category DDA string classifies as MIXED_USE (same as DDA layer)", () => {
  expect(deriveLandUse([{ category: MIXED }])).toBe("MIXED_USE");
  expect(deriveLandUse([{ category: "COMMERCIAL - HOSPITALITY - RESIDENTIAL", sub: "APARTMENT - VILLA - HOTEL" }])).toBe("MIXED_USE");
});

// Form stored in AffectionPlan.landUseMix (prod rows 3720253 etc.): no "/" between groups.
test("A: separator-less stored form classifies as MIXED_USE", () => {
  const stored = "COMMERCIAL : OFFICES, RETAIL HOSPITALITY : HOTEL, HOTEL APARTMENT RESIDENTIAL : APARTMENT, VILLA";
  expect(deriveLandUse([{ category: stored }])).toBe("MIXED_USE");
});

test("A: single-category strings are unchanged", () => {
  expect(deriveLandUse([{ category: "RESIDENTIAL : APARTMENT, VILLA" }])).toBe("RESIDENTIAL");
  expect(deriveLandUse([{ category: "HOSPITALITY : HOTEL, HOTEL APARTMENT" }])).toBe("HOTEL");
  expect(deriveLandUse([{ category: "COMMERCIAL" }])).toBe("COMMERCIAL");
});

test("B: setback table is stripped from land-use text", () => {
  expect(stripSetbackTail(POLLUTED)).toBe(MIXED);
  expect(stripSetbackTail(MIXED)).toBe(MIXED);
});

test("B: landUseSchema never stores setback text", () => {
  const r = landUseStoredSchema.safeParse(POLLUTED);
  expect(r.success).toBe(true);
  if (r.success) expect(r.data).toBe(MIXED);
});
