// Vault create/update/promote must accept long DDA mixed-use land-use strings.
// Pure schema test (no browser, no DB): the routes validate landUse with the
// shared landUseSchema; previously each route capped it at 64 chars.

import { expect, test } from "@playwright/test";
import { landUseSchema } from "../../src/lib/vault-land-use";

const DDA_LAND_USE =
  "COMMERCIAL : OFFICES, RETAIL HOSPITALITY : HOTEL RESIDENTIAL : APARTMENT"; // plot 3260962

test("vault: 75-char DDA land-use string is accepted untruncated", () => {
  expect(DDA_LAND_USE.length).toBeGreaterThan(64);
  const parsed = landUseSchema.safeParse(DDA_LAND_USE);
  expect(parsed.success).toBe(true);
  if (parsed.success) expect(parsed.data).toBe(DDA_LAND_USE);
});

test("vault: absurdly long land-use is still rejected", () => {
  expect(landUseSchema.safeParse("x".repeat(513)).success).toBe(false);
});
