// Regression test: hovering a plot highlights it (gold outline + ground fill),
// and the highlight is cleared on mouseleave, in 2D and 3D, on the ZAAHI
// listings layer and on the DDA PMTiles layer.
//
// Before the fix no plot layer had any hover highlight at all (the hover card
// was the only feedback; the only `feature-state hover` in the page is on the
// COMM_NUM community layer, and PMTiles plot sources carry no feature ids).
//
// The PMTiles case serves the real local /tiles/dda-land.pmtiles (the shared
// harness aborts /tiles/**) — it needs public/tiles/dda-land.pmtiles on disk
// and skips itself when it is absent.
//
// Run:  pnpm build && npx playwright test tests/e2e/hover-highlight.spec.ts

import { existsSync } from "node:fs";
import { test, expect, type Page } from "@playwright/test";
import type { Map as MLMap } from "maplibre-gl";
import { installHarness, gotoMap } from "./harness";
import { DDA_PMTILES, serveLocalPmtiles } from "./pmtiles";

type MapWindow = Window & { __zaahiMap?: MLMap };

const ZAAHI_HL = ["hover-hl-zaahi-plots-fill", "hover-hl-zaahi-plots-line"];
const DDA_HL = ["hover-hl-dda-land-tiles-fill", "hover-hl-dda-land-tiles-line"];
const DDA_FILL = "dda-land-tiles-fill";

/** Serialised filter of a layer, or "missing" when the layer does not exist. */
function filterOf(page: Page, layerId: string): Promise<string> {
  return page.evaluate((id) => {
    const m = (window as MapWindow).__zaahiMap!;
    if (!m.getLayer(id)) return "missing";
    return JSON.stringify(m.getFilter(id) ?? null);
  }, layerId);
}

const NONE = JSON.stringify(["==", ["id"], "__none__"]);

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

test.describe("plot hover highlight", () => {
  for (const view of ["2D", "3D"] as const) {
    test(`ZAAHI listing highlights on hover and clears on leave (${view})`, async ({
      page,
    }) => {
      await installHarness(page);
      await gotoMap(page);
      await mapReady(page);
      if (view === "3D") {
        await page.evaluate(() =>
          (window as MapWindow).__zaahiMap!.jumpTo({ pitch: 45 }),
        );
        await page.waitForTimeout(800);
      }

      const box = (await page.locator("canvas.maplibregl-canvas").boundingBox())!;
      const cx = box.x + box.width / 2;
      const cy = box.y + box.height / 2;

      for (const lid of ZAAHI_HL) expect(await filterOf(page, lid)).toBe(NONE);

      await page.mouse.move(cx - 5, cy - 5);
      await page.mouse.move(cx, cy, { steps: 4 });
      await expect
        .poll(() => filterOf(page, ZAAHI_HL[1]), { timeout: 5000 })
        .toContain("p-listed-1");
      expect(await filterOf(page, ZAAHI_HL[0])).toContain("p-listed-1");
      await page.waitForTimeout(400);
      await page.screenshot({
        path: `docs/research/map-ux-batch-1/issue4-hover-highlight-${view}.png`,
      });

      // Off the plot (far corner) → cleared.
      await page.mouse.move(box.x + 30, box.y + box.height - 30, { steps: 6 });
      await expect
        .poll(() => filterOf(page, ZAAHI_HL[1]), { timeout: 5000 })
        .toBe(NONE);
      expect(await filterOf(page, ZAAHI_HL[0])).toBe(NONE);
    });
  }

  test("DDA PMTiles plot highlights on hover and clears on leave", async ({
    page,
  }) => {
    test.skip(
      !existsSync(DDA_PMTILES),
      "local dda-land.pmtiles not present",
    );
    await installHarness(page, { layers: { ddaLandPlots: true } });
    // Registered after the harness → takes precedence over its /tiles abort.
    await serveLocalPmtiles(page);
    await gotoMap(page);
    await mapReady(page);

    // Find a rendered DDA plot away from the ZAAHI fixture square (centre) and
    // the header chrome, whose hit-test at its own centroid resolves to itself.
    const target = await page.waitForFunction(
      (fillId) => {
        const m = (window as MapWindow).__zaahiMap!;
        const c = m.getCanvas().getBoundingClientRect();
        const feats = m.queryRenderedFeatures(undefined, { layers: [fillId] });
        let best: { x: number; y: number; plotNumber: string; size: number } | null = null;
        for (const f of feats) {
          const g = f.geometry as GeoJSON.Geometry;
          const ring =
            g.type === "Polygon" ? g.coordinates[0] : g.type === "MultiPolygon" ? g.coordinates[0][0] : null;
          const pn = (f.properties as { plotNumber?: string }).plotNumber;
          if (!ring || !pn) continue;
          const lng = ring.reduce((s, q) => s + q[0], 0) / ring.length;
          const lat = ring.reduce((s, q) => s + q[1], 0) / ring.length;
          const pt = m.project([lng, lat]);
          if (pt.x < 80 || pt.x > c.width - 80 || pt.y < 120 || pt.y > c.height - 80) continue;
          if (Math.abs(pt.x - c.width / 2) < 160 && Math.abs(pt.y - c.height / 2) < 170) continue;
          const hit = m.queryRenderedFeatures([pt.x, pt.y], { layers: [fillId] });
          if ((hit[0]?.properties as { plotNumber?: string } | undefined)?.plotNumber !== pn) continue;
          // Prefer the biggest plot on screen so the highlight is easy to see.
          const px = ring.map((q) => m.project(q as [number, number]));
          const size =
            (Math.max(...px.map((q) => q.x)) - Math.min(...px.map((q) => q.x))) *
            (Math.max(...px.map((q) => q.y)) - Math.min(...px.map((q) => q.y)));
          if (!best || size > best.size) {
            best = { x: pt.x + c.left, y: pt.y + c.top, plotNumber: String(pn), size };
          }
        }
        return best;
      },
      DDA_FILL,
      { timeout: 60_000 },
    );
    const { x, y, plotNumber } = (await target.jsonValue()) as {
      x: number;
      y: number;
      plotNumber: string;
    };

    for (const lid of DDA_HL) expect(await filterOf(page, lid)).toBe(NONE);
    await page.mouse.move(x - 3, y - 3);
    await page.mouse.move(x, y, { steps: 4 });
    await expect
      .poll(() => filterOf(page, DDA_HL[1]), { timeout: 5000 })
      .toContain(plotNumber);
    await page.waitForTimeout(400);
    await page.screenshot({
      path: "docs/research/map-ux-batch-1/issue4-hover-highlight-pmtiles.png",
    });

    await page.mouse.move(30, 890, { steps: 6 });
    await expect
      .poll(() => filterOf(page, DDA_HL[1]), { timeout: 5000 })
      .toBe(NONE);
  });
});
