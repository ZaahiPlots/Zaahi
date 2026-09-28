// Hover card fields: land-use SUBTYPE, affection-plan ISSUE and EXPIRY dates.
// Each row shows only when the plot has the value — no placeholders, and the
// affection-plan issue row no longer falls back to the plan's download date.
//
// Height is not asserted here: it is not in the DDA/AD PMTiles properties
// (needs a tile rebuild — see docs/research/hover-card-fields.md); the ZAAHI
// and vault cards already show it from the affection plan.
//
// Run:  pnpm build && npx playwright test tests/e2e/hover-card-fields.spec.ts

import { existsSync } from "node:fs";
import { test, expect, type Page } from "@playwright/test";
import type { Map as MLMap } from "maplibre-gl";
import { installHarness, gotoMap } from "./harness";
import { PARCELS } from "./fixtures";
import { DDA_PMTILES, serveLocalPmtiles } from "./pmtiles";

type MapWindow = Window & { __zaahiMap?: MLMap };

async function mapReady(page: Page) {
  await page.waitForFunction(
    () => {
      const m = (window as MapWindow).__zaahiMap;
      return !!m && m.isStyleLoaded() && !!m.getLayer("zaahi-plots-fill");
    },
    undefined,
    { timeout: 30_000 },
  );
  await page.waitForTimeout(1500);
}

/** Overrides the listings payload with a tweaked plan on the centre parcel. */
async function withPlan(page: Page, patch: Record<string, unknown>) {
  await page.route("**/api/parcels/map", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        items: PARCELS.map((p, i) =>
          i === 0 && p.plan ? { ...p, plan: { ...p.plan, ...patch } } : p,
        ),
      }),
    }),
  );
}

async function hoverCentre(page: Page) {
  const box = (await page.locator("canvas.maplibregl-canvas").boundingBox())!;
  await page.mouse.move(box.x + box.width / 2 - 5, box.y + box.height / 2 - 5);
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, { steps: 4 });
}

test.describe("hover card fields", () => {
  test("ZAAHI card shows subtype, issue and expiry dates", async ({ page }) => {
    await installHarness(page);
    await withPlan(page, {
      sitePlanExpiry: "2027-03-12T00:00:00.000Z",
      landUseMix: [{ category: "RESIDENTIAL", sub: "Apartments" }],
    });
    await gotoMap(page);
    await mapReady(page);
    await hoverCentre(page);

    await expect(page.getByText("RESIDENTIAL · APARTMENTS")).toBeVisible();
    await expect(page.getByText("Plan Issued")).toBeVisible();
    await expect(page.getByText("01 Feb 2024")).toBeVisible();
    await expect(page.getByText("Plan Expires")).toBeVisible();
    await expect(page.getByText("12 Mar 2027")).toBeVisible();
    await page.screenshot({
      path: "docs/research/map-ux-batch-1/issue3-card-zaahi-full.png",
    });
  });

  test("ZAAHI card hides rows the plot does not have", async ({ page }) => {
    await installHarness(page);
    // No expiry, no subtype, no issue date — only the download date is set.
    await withPlan(page, {
      sitePlanIssue: null,
      sitePlanExpiry: null,
      landUseMix: [{ category: "RESIDENTIAL", sub: null }],
    });
    await gotoMap(page);
    await mapReady(page);
    await hoverCentre(page);

    await expect(page.getByText("Plot Area")).toBeVisible();
    await expect(page.getByText("Plan Issued")).toHaveCount(0);
    await expect(page.getByText("Plan Expires")).toHaveCount(0);
    await expect(page.getByText("RESIDENTIAL", { exact: true })).toBeVisible();
    await expect(page.getByText(/RESIDENTIAL ·/)).toHaveCount(0);
    await expect(page.getByText("Aug 2026")).toHaveCount(0); // fetchedAt must not leak in
    await page.screenshot({
      path: "docs/research/map-ux-batch-1/issue3-card-zaahi-missing.png",
    });
  });

  test("DDA PMTiles card shows the subtype from tile properties", async ({
    page,
  }) => {
    test.skip(!existsSync(DDA_PMTILES), "local dda-land.pmtiles not present");
    await installHarness(page, { layers: { ddaLandPlots: true } });
    await serveLocalPmtiles(page);
    await gotoMap(page);
    await mapReady(page);

    const target = await page.waitForFunction(
      () => {
        const m = (window as MapWindow).__zaahiMap!;
        const c = m.getCanvas().getBoundingClientRect();
        for (const f of m.queryRenderedFeatures(undefined, { layers: ["dda-land-tiles-fill"] })) {
          const p = f.properties as { plotNumber?: string; mainLandUse?: string; subLandUse?: string };
          const g = f.geometry as GeoJSON.Geometry;
          const ring =
            g.type === "Polygon" ? g.coordinates[0] : g.type === "MultiPolygon" ? g.coordinates[0][0] : null;
          if (!ring || !p.plotNumber || !p.mainLandUse || !p.subLandUse) continue;
          if (p.subLandUse.toUpperCase() === p.mainLandUse.toUpperCase()) continue;
          const lng = ring.reduce((s, q) => s + q[0], 0) / ring.length;
          const lat = ring.reduce((s, q) => s + q[1], 0) / ring.length;
          const pt = m.project([lng, lat]);
          if (pt.x < 80 || pt.x > c.width - 80 || pt.y < 120 || pt.y > c.height - 80) continue;
          if (Math.abs(pt.x - c.width / 2) < 160 && Math.abs(pt.y - c.height / 2) < 170) continue;
          const hit = m.queryRenderedFeatures([pt.x, pt.y], { layers: ["dda-land-tiles-fill"] });
          if ((hit[0]?.properties as { plotNumber?: string } | undefined)?.plotNumber !== p.plotNumber) continue;
          return {
            x: pt.x + c.left,
            y: pt.y + c.top,
            line: `${p.mainLandUse.replace(/_/g, " ").toUpperCase()} · ${p.subLandUse.replace(/_/g, " ").toUpperCase()}`,
          };
        }
        return null;
      },
      undefined,
      { timeout: 60_000 },
    );
    const { x, y, line } = (await target.jsonValue()) as { x: number; y: number; line: string };
    await page.mouse.move(x - 3, y - 3);
    await page.mouse.move(x, y, { steps: 4 });
    await expect(page.getByText(line, { exact: true })).toBeVisible();
    await page.screenshot({
      path: "docs/research/map-ux-batch-1/issue3-card-pmtiles-subtype.png",
    });
  });
});
