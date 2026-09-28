// The sun-time slider and its right-rail dock button were removed (founder
// decision: it only recoloured 3D extrusions; parked until real heights and
// shadows exist). The map light must stay at the old default so first-load 3D
// colours are unchanged.
//
// Run:  pnpm build && npx playwright test tests/e2e/sun-slider-removed.spec.ts

import { test, expect } from "@playwright/test";
import type { Map as MLMap } from "maplibre-gl";
import { installHarness, gotoMap } from "./harness";

type MapWindow = Window & { __zaahiMap?: MLMap };

test("no sun-time slider UI; map light stays at the 08:15 default", async ({
  page,
}) => {
  await installHarness(page);
  await gotoMap(page);
  await page.waitForFunction(() => {
    const m = (window as MapWindow).__zaahiMap;
    return !!m && m.isStyleLoaded();
  });
  await page.waitForTimeout(2500);

  await expect(page.getByTitle(/sun-time slider/i)).toHaveCount(0);
  await expect(page.locator('input[type="range"]')).toHaveCount(0);

  const light = await page.evaluate(() => {
    const m = (window as MapWindow).__zaahiMap!;
    return m.getLight() as unknown as {
      position: [number, number, number];
      anchor: string;
    };
  });
  // 08:15 in Dubai: sun in the east, low — azimuth 60–120°, polar > 45°.
  expect(light.position[1]).toBeGreaterThan(60);
  expect(light.position[1]).toBeLessThan(120);
  expect(light.position[2]).toBeGreaterThan(45);

  await page.screenshot({
    path: "docs/research/map-ux-batch-1/issue2-no-sun-slider.png",
  });
});
