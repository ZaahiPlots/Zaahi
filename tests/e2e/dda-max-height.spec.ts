// DDA PMTiles hover card: "Max Height" row from the baked `maxHeightFloors`
// code ("G+17", "UNLIMITED" → "Unlimited"). Hidden when the plot has none —
// no "Not published", no N/A, no metres estimate. Old tiles (no property at
// all) hit the same hidden path.
//
// Needs the rebuilt public/tiles/dda-land.pmtiles (see scripts/prepare-tiles.ts,
// DDA_ONLY=1). Against an old tile the "shows" test skips itself.
//
// Run:  pnpm build && npx playwright test tests/e2e/dda-max-height.spec.ts

import { existsSync } from "node:fs";
import { test, expect, type Page } from "@playwright/test";
import type { Map as MLMap } from "maplibre-gl";
import { installHarness, gotoMap } from "./harness";
import { DDA_PMTILES, serveLocalPmtiles } from "./pmtiles";
import { formatDdaMaxHeight } from "../../src/lib/dda-height";

type MapWindow = Window & { __zaahiMap?: MLMap };
type Target = { x: number; y: number; plotNumber: string; code: string | null };

test("formatDdaMaxHeight: code as-is, Unlimited, hidden otherwise", () => {
  expect(formatDdaMaxHeight("G+17")).toBe("G+17");
  expect(formatDdaMaxHeight("G+2P+8")).toBe("G+2P+8");
  expect(formatDdaMaxHeight(" G+2 ")).toBe("G+2");
  expect(formatDdaMaxHeight("UNLIMITED")).toBe("Unlimited");
  expect(formatDdaMaxHeight("Unlimited")).toBe("Unlimited");
  for (const v of [undefined, null, "", "   ", 0, 17, {}]) {
    expect(formatDdaMaxHeight(v)).toBe("");
  }
});

async function openMapWithDdaTiles(page: Page) {
  await installHarness(page, { layers: { ddaLandPlots: true } });
  await serveLocalPmtiles(page);
  await gotoMap(page);
  await page.waitForFunction(
    () => {
      const m = (window as MapWindow).__zaahiMap;
      return !!m && m.isStyleLoaded() && !!m.getLayer("dda-land-tiles-fill");
    },
    undefined,
    { timeout: 30_000 },
  );
  await page.waitForTimeout(1500);
}

/** A rendered DDA plot with (withCode) or without a maxHeightFloors property. */
async function findPlot(page: Page, withCode: boolean): Promise<Target> {
  const handle = await page.waitForFunction(
    (want) => {
      const m = (window as MapWindow).__zaahiMap!;
      const c = m.getCanvas().getBoundingClientRect();
      for (const f of m.queryRenderedFeatures(undefined, { layers: ["dda-land-tiles-fill"] })) {
        const p = f.properties as { plotNumber?: string; maxHeightFloors?: string };
        const g = f.geometry as GeoJSON.Geometry;
        const ring =
          g.type === "Polygon" ? g.coordinates[0] : g.type === "MultiPolygon" ? g.coordinates[0][0] : null;
        if (!ring || !p.plotNumber) continue;
        if (want ? !/^G\+\d+$/.test(p.maxHeightFloors ?? "") : !!p.maxHeightFloors) continue;
        const lng = ring.reduce((s, q) => s + q[0], 0) / ring.length;
        const lat = ring.reduce((s, q) => s + q[1], 0) / ring.length;
        const pt = m.project([lng, lat]);
        // Leave room for the card (drawn right/below the cursor) so the
        // screenshot shows every row.
        if (pt.x < 80 || pt.x > c.width - 320 || pt.y < 120 || pt.y > c.height - 330) continue;
        if (Math.abs(pt.x - c.width / 2) < 160 && Math.abs(pt.y - c.height / 2) < 170) continue;
        const hit = m.queryRenderedFeatures([pt.x, pt.y], { layers: ["dda-land-tiles-fill"] });
        if ((hit[0]?.properties as { plotNumber?: string } | undefined)?.plotNumber !== p.plotNumber) continue;
        return {
          x: pt.x + c.left,
          y: pt.y + c.top,
          plotNumber: p.plotNumber,
          code: p.maxHeightFloors ?? null,
        };
      }
      return null;
    },
    withCode,
    { timeout: 60_000 },
  );
  return (await handle.jsonValue()) as Target;
}

async function hoverAt(page: Page, t: Target) {
  await page.mouse.move(t.x - 3, t.y - 3);
  await page.mouse.move(t.x, t.y, { steps: 4 });
  // Card is up once the plot number is rendered.
  await expect(page.getByText(t.plotNumber, { exact: true }).first()).toBeVisible();
}

test.describe("DDA card Max Height", () => {
  test.skip(!existsSync(DDA_PMTILES), "local dda-land.pmtiles not present");

  test("shows the code when the tile has maxHeightFloors", async ({ page }) => {
    await openMapWithDdaTiles(page);
    let t: Target;
    try {
      t = await findPlot(page, true);
    } catch {
      test.skip(true, "local dda-land.pmtiles predates maxHeightFloors — rebuild tiles");
      return;
    }
    await hoverAt(page, t);
    const row = page.getByText("Max Height", { exact: true });
    await expect(row).toBeVisible();
    await expect(row.locator("xpath=following-sibling::span")).toHaveText(t.code!);
    await page.screenshot({ path: "docs/research/dda-height-tiles/max-height-card.png" });
  });

  test("hides the row when the plot has no maxHeightFloors", async ({ page }) => {
    await openMapWithDdaTiles(page);
    const t = await findPlot(page, false);
    await hoverAt(page, t);
    await expect(page.getByText("Max Height", { exact: true })).toHaveCount(0);
    await expect(page.getByText(/not published|n\/a/i)).toHaveCount(0);
    await page.screenshot({ path: "docs/research/dda-height-tiles/max-height-card-hidden.png" });
  });
});
