// Sold plots layer — map behaviour (spec docs/specs/sold-plots-layer.md §7).
//
//   non-admin → no /api/sold-plots request, no sold layers, no Layers row
//   admin     → "Sold plots" row under Dubai › Founder research; saved ON loads the pins
//               into a clustered source (cluster: true, radius 40, maxZoom 13), singles
//               coloured by recency, approx pins ringed; hover shows "id · n sales · last";
//               click opens the SidePanel with a collapsible "Transaction history",
//               newest first, derived values labelled, project block.
//
// Runs on the smoke harness (session stub + API fixtures); the pins and the card are
// route fixtures, so nothing touches the data files or the database.
// Run:  npx playwright test tests/e2e/sold-plots-layer.spec.ts   (needs a built or dev server)

import { test, expect, type Page } from "@playwright/test";
import type { Map as MLMap } from "maplibre-gl";
import { installHarness, gotoMap } from "./harness";
import { MAP_CENTER } from "./fixtures";

type MapWindow = Window & { __zaahiMap?: MLMap };
const RECENT = { id: "6762788", lng: MAP_CENTER[0] + 0.008, lat: MAP_CENTER[1] };
const OLD = { id: "JVC10AAHRG001", lng: MAP_CENTER[0] + 0.008, lat: MAP_CENTER[1] + 0.003 };
const month = (back: number) => {
  const d = new Date(); d.setMonth(d.getMonth() - back);
  return d.toISOString().slice(0, 7);
};

const PINS = {
  type: "FeatureCollection",
  asof: { dxb: "2026-08-11", kit: "2024-08-30", registry: "2026-04-10", projects: "2025-10-02" },
  features: [
    { type: "Feature", geometry: { type: "Point", coordinates: [RECENT.lng, RECENT.lat] }, properties: { id: RECENT.id, src: "dda", approx: false, n: 2, last: month(3) } },
    { type: "Feature", geometry: { type: "Point", coordinates: [OLD.lng, OLD.lat] }, properties: { id: OLD.id, src: "geo", approx: true, n: 1, last: "2012-05" } },
  ],
};
const CARD = {
  asof: PINS.asof,
  card: {
    id: RECENT.id, pid: RECENT.id, comm: "Business Bay", area: "Business Bay", master: "E2E Towers", landUse: "Commercial", sqft: 21528,
    dldLand: "12", place: { src: "dda", approx: false },
    sales: [
      { d: `${month(3)}-14`, p: 5_000_000_000, psf: 232_000, w: "Developer", g: null, src: "dxb", proc: null },
      { d: "2019-02-03", p: 3_100_000_000, psf: 144_000, w: null, g: null, src: "kit", proc: "Sale" },
    ],
    mortgages: 2, gifts: 1, far: 4, gfaSqft: 86111, gfaSrc: "master plan",
    project: { state: "project", title: "E2E TOWER", status: "CONDITIONAL_ACTIVATING", pct: 24, cancel: "2022-07-26", dev: "E2E DEVELOPER LLC", escrow: "E2E BANK", start: null, end: null, asof: "2025-10-02" },
  },
};

async function fixtures(page: Page) {
  const calls: string[] = [];
  await page.route("**/api/sold-plots/**", (route) => {
    const path = new URL(route.request().url()).pathname;
    calls.push(path);
    const body = path.endsWith("/pins") ? PINS : path.endsWith(RECENT.id) ? CARD : { error: "not found" };
    return route.fulfill({ status: body === PINS || body === CARD ? 200 : 404, contentType: "application/json", body: JSON.stringify(body) });
  });
  return calls;
}
const settled = (page: Page) =>
  page.waitForFunction(() => { const m = (window as MapWindow).__zaahiMap; return !!m && m.isStyleLoaded(); }, undefined, { timeout: 30_000 });
const toPixel = (page: Page, lng: number, lat: number) =>
  page.evaluate(([x, y]) => { const m = (window as MapWindow).__zaahiMap!; const p = m.project([x, y]); const r = m.getCanvas().getBoundingClientRect(); return { x: r.left + p.x, y: r.top + p.y }; }, [lng, lat]);

test.describe("sold plots layer", () => {
  test("non-admin: nothing is requested, nothing is added", async ({ page }) => {
    const log = await installHarness(page, { layers: { soldPlots: true } });
    const calls = await fixtures(page);
    await gotoMap(page);
    await settled(page);
    await page.waitForTimeout(800);
    expect(log.unexpected).toEqual([]);
    expect(calls).toEqual([]);
    expect(await page.evaluate(() => !!(window as MapWindow).__zaahiMap!.getSource("sold-plots"))).toBe(false);
  });

  test("admin: clustered source, recency colours, approx ring, hover, click → history", async ({ page }) => {
    const log = await installHarness(page, { layers: { soldPlots: true }, admin: true });
    const calls = await fixtures(page);
    await gotoMap(page);
    await settled(page);
    await page.waitForFunction(() => !!(window as MapWindow).__zaahiMap!.getLayer("sold-plots-singles"), undefined, { timeout: 20_000 });
    expect(log.unexpected).toEqual([]);
    expect(calls).toEqual(["/api/sold-plots/pins"]);

    const style = await page.evaluate(() => {
      const m = (window as MapWindow).__zaahiMap!;
      const src = m.getStyle().sources["sold-plots"] as unknown as { cluster: boolean; clusterRadius: number; clusterMaxZoom: number };
      const colour = m.getPaintProperty("sold-plots-singles", "circle-color");
      return { cluster: src.cluster, radius: src.clusterRadius, maxZoom: src.clusterMaxZoom, colour, vis: m.getLayoutProperty("sold-plots-singles", "visibility"), approx: !!m.getLayer("sold-plots-approx"), clusters: !!m.getLayer("sold-plots-clusters") };
    });
    expect(style).toMatchObject({ cluster: true, radius: 40, maxZoom: 13, vis: "visible", approx: true, clusters: true });
    expect(JSON.stringify(style.colour)).toContain("#C8A96E");

    // hover → "id · n sales · last YYYY-MM"
    await page.evaluate(() => new Promise<void>((res) => { const m = (window as MapWindow).__zaahiMap!; m.once("idle", () => res()); m.triggerRepaint(); }));
    const pt = await toPixel(page, RECENT.lng, RECENT.lat);
    const hit = await page.evaluate(([x, y]) => { const m = (window as MapWindow).__zaahiMap!; const r = m.getCanvas().getBoundingClientRect(); return m.queryRenderedFeatures([x - r.left, y - r.top], { layers: ["sold-plots-singles"] }).length; }, [pt.x, pt.y]);
    expect(hit, "the single pin is rendered under the pointer").toBe(1);
    await page.mouse.move(pt.x - 8, pt.y - 8);
    await page.mouse.move(pt.x, pt.y, { steps: 6 });
    await expect(page.getByText(`${RECENT.id}`).first()).toBeVisible();
    await expect(page.getByText(new RegExp(`2 sales · last ${month(3)}`))).toBeVisible();

    // click → card → SidePanel with Transaction history, newest first
    await page.mouse.click(pt.x, pt.y);
    await expect(page.getByText("Last sale", { exact: false }).first()).toBeVisible();
    const hist = page.getByRole("button", { name: /Transaction history · 2/ });
    await expect(hist).toBeVisible();
    const text = await page.locator("aside").last().innerText();
    expect(text.indexOf(`${month(3)}-14`)).toBeGreaterThan(-1);
    expect(text.indexOf(`${month(3)}-14`)).toBeLessThan(text.indexOf("2019-02-03"));
    expect(text).toContain("derived");
    expect(text).toContain("+ 2 mortgages, 1 gift");
    expect(text).toContain("Conditionally active");
    expect(text).toContain("E2E DEVELOPER LLC");
    expect(text).not.toContain("Download Site Plan");

    // collapsible
    await hist.click();
    await expect(hist).toHaveAttribute("aria-expanded", "false");
  });

  test("toggle off hides the layers and keeps the saved state", async ({ page }) => {
    await installHarness(page, { layers: { soldPlots: true }, admin: true });
    await fixtures(page);
    await gotoMap(page);
    await page.waitForFunction(() => !!(window as MapWindow).__zaahiMap?.getLayer("sold-plots-singles"), undefined, { timeout: 30_000 });
    await page.evaluate(() => { localStorage.setItem("zaahi-map-layers", JSON.stringify({ soldPlots: false })); });
    await page.reload({ waitUntil: "domcontentloaded" });
    await page.locator("canvas.maplibregl-canvas").waitFor();
    await settled(page);
    await page.waitForTimeout(800);
    expect(await page.evaluate(() => !!(window as MapWindow).__zaahiMap!.getLayer("sold-plots-singles"))).toBe(false);
  });
});
