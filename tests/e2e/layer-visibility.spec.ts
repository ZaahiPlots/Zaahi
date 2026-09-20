// Regression test for the layer-visibility bug: on a cold load, a layer that
// the saved UI state has ON is left hidden on the map until the user touches
// a toggle.
//
// The failing case is the PMTiles land layers (DDA Land Plots / AD Land
// Plots). They are added inside map.on("load") by addLandTileSource() with a
// hardcoded `visibility: "none"`, and — unlike the two other call sites
// (basemap swap, WebGL context restore) — that cold-load site never follows
// with setLandTileVisibility(). The only other writer, the
// [layers.ddaLandPlots, layers.adLandPlots, mapStyleReady] effect, has
// already run by then: mapStyleReady flips at the TOP of the load handler,
// seconds before the handler's awaits reach the addLandTileSource calls.
// Runtime capture: docs/research/LAYER_VISIBILITY_RUNTIME.md
//
// Assertions read the live MapLibre style registry through the
// `window.__zaahiMap` handle rather than canvas pixels: the PMTiles bodies
// are ~350 MB of local assets and the symbol glyphs come from a remote CDN,
// so a pixel assertion would be testing the network, not the bug.
//
// Run:  pnpm build && npx playwright test tests/e2e/layer-visibility.spec.ts
// (playwright.config.ts starts `next start -p 3100` itself.)

import { test, expect, type Page } from "@playwright/test";
import type { Map as MLMap } from "maplibre-gl";
import { installHarness, gotoMap } from "./harness";

const DDA_LAND_FILL = "dda-land-tiles-fill";
const DDA_LAND_LINE = "dda-land-tiles-line";
const DDA_LAND_3D = "dda-land-tiles-3d";
const DISTRICT_NAMES_LAYER = "district-names-labels";

type MapWindow = Window & { __zaahiMap?: MLMap };

/** Resolves once the map exists, its style is loaded, and it has gone idle. */
async function waitForMapSettled(page: Page) {
  await page.waitForFunction(
    () => {
      const m = (window as MapWindow).__zaahiMap;
      return !!m && m.isStyleLoaded();
    },
    undefined,
    { timeout: 30_000 },
  );
  // One idle event after style load, then a grace window: every source and
  // layer the async load handler adds (attachOverlays, loadZaahiPlots,
  // addLandTileSource) has been applied by then, and any React effect it
  // queued has flushed.
  await page.evaluate(
    () =>
      new Promise<void>((resolve) => {
        const m = (window as MapWindow).__zaahiMap!;
        const done = () => resolve();
        m.once("idle", done);
        setTimeout(done, 10_000);
      }),
  );
  await page.waitForTimeout(2500);
}

function readVisibility(page: Page, ids: string[]) {
  return page.evaluate((layerIds) => {
    const m = (window as MapWindow).__zaahiMap!;
    const out: Record<string, string | null> = {};
    for (const id of layerIds) {
      out[id] = m.getLayer(id)
        ? ((m.getLayoutProperty(id, "visibility") as string | undefined) ?? "visible")
        : null;
    }
    return out;
  }, ids);
}

test.describe("map layer visibility on cold load", () => {
  test("DDA Land Plots saved ON is visible without touching a toggle", async ({
    page,
  }) => {
    const log = await installHarness(page, { layers: { ddaLandPlots: true } });
    await gotoMap(page);
    await waitForMapSettled(page);

    expect(log.unexpected, "harness saw an unfixtured request").toEqual([]);

    const uiWants = await page.evaluate(() => {
      try {
        const raw = window.localStorage.getItem("zaahi-map-layers");
        return raw ? !!JSON.parse(raw).ddaLandPlots : null;
      } catch {
        return null;
      }
    });
    expect(uiWants, "precondition: the saved layer state has DDA Land Plots ON").toBe(
      true,
    );

    const vis = await readVisibility(page, [DDA_LAND_FILL, DDA_LAND_LINE, DDA_LAND_3D]);

    expect(vis[DDA_LAND_FILL], `${DDA_LAND_FILL} missing from the style`).not.toBeNull();
    expect(
      vis,
      "UI state has DDA Land Plots ON but the PMTiles layers are hidden on the map",
    ).toEqual({
      [DDA_LAND_FILL]: "visible",
      [DDA_LAND_LINE]: "visible",
      [DDA_LAND_3D]: "visible",
    });
  });

  test("the PMTiles layers ARE added — only the visibility write is missing", async ({
    page,
  }) => {
    // Companion to the test above: it localises the failure. The layers and
    // their source exist, so nothing is being wiped by a later setStyle
    // (hypothesis H-A) and the source is not failing to attach (H-B) — it is
    // purely that no code path ever writes `visibility: visible` on the
    // cold-load path.
    //
    // This does NOT drive the Layers-panel checkbox: DDA Land Plots is
    // tier GOLD (LAYER_REGISTRY entry `ddaLandPlots`), so for a non-GOLD
    // user the row is a lock badge that navigates to /join#gold instead of
    // toggling.
    await installHarness(page, { layers: { ddaLandPlots: true } });
    await gotoMap(page);
    await waitForMapSettled(page);

    const present = await page.evaluate(
      ([fill, line, ext]) => {
        const m = (window as MapWindow).__zaahiMap!;
        return {
          source: !!m.getSource("dda-land-tiles"),
          fill: !!m.getLayer(fill),
          line: !!m.getLayer(line),
          ext: !!m.getLayer(ext),
          inStyle: (m.getStyle().layers ?? []).filter((l) =>
            l.id.startsWith("dda-land-tiles"),
          ).length,
        };
      },
      [DDA_LAND_FILL, DDA_LAND_LINE, DDA_LAND_3D],
    );

    expect(present).toEqual({
      source: true,
      fill: true,
      line: true,
      ext: true,
      inStyle: 3,
    });
  });

  test("District Names defaults ON and is visible (control — this one passes)", async ({
    page,
  }) => {
    // Kept as a control. District Names was the suspected case, but
    // ensureDistrictNamesLayer() births the layer with
    // `visibility: layersRef.current.districtNames ? "visible" : "none"`,
    // so the add path carries the UI state and the broken effect never
    // matters. A regression here would mean that add-time default was lost.
    await installHarness(page);
    await gotoMap(page);
    await waitForMapSettled(page);

    const vis = await readVisibility(page, [DISTRICT_NAMES_LAYER]);
    expect(vis[DISTRICT_NAMES_LAYER]).toBe("visible");
  });
});
