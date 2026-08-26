// ZAAHI smoke checks (a)–(g) for the 2026-08-26 integration.
// See docs/SMOKE_2026-08-26.md for results and for what each check defends.
//
// Read-only by construction: every /api call is fulfilled from fixtures inside
// the browser, so no Next route handler runs and the production database is
// never contacted. Non-GET requests are aborted and recorded as failures.

import { test, expect, type ConsoleMessage } from "@playwright/test";
import { installHarness, gotoMap } from "./harness";
import { PARCELS, PLOT_FOUND, PLOT_NO_GEOMETRY, PLOT_MISSING } from "./fixtures";

/** Collects console output so (f) can assert the production console is clean. */
function captureConsole(page: import("@playwright/test").Page) {
  const msgs: { type: string; text: string }[] = [];
  page.on("console", (m: ConsoleMessage) => msgs.push({ type: m.type(), text: m.text() }));
  return msgs;
}

test.describe("ZAAHI /parcels/map smoke", () => {
  // ── (d) load-time request counts ──────────────────────────────────────
  test("(d) one parcels/map fetch from the map loader, metro once, single style build", async ({ page }) => {
    // Metro is default-OFF (CLAUDE.md: every overlay except ZAAHI Plots is
    // lazy), so a default cold load fetches it zero times and "loaded once"
    // would be vacuously true. Turn it on so the count is meaningful — this is
    // the check that would catch attachOverlays running twice.
    const log = await installHarness(page, { layers: { metro: true } });
    await gotoMap(page);
    // Let the deferred loaders settle.
    await page.waitForTimeout(4000);

    const parcelsMap = log.calls.filter((c) => c === "/api/parcels/map");
    const metro = log.calls.filter((c) => c === "/api/layers/metro");
    // Printed so the report can quote real numbers rather than just the bound.
    console.log(`[smoke d] /api/parcels/map=${parcelsMap.length} /api/layers/metro=${metro.length} totalApi=${log.calls.length}`);

    // The map's own loader fires once; ParcelsNav keeps a documented separate
    // fetch (see docs/MERGE_REPORT_2026-08-26.md). Pre-mount-guard this was 3.
    expect(parcelsMap.length, `parcels/map calls: ${parcelsMap.length}`).toBeLessThanOrEqual(2);
    expect(metro.length, `metro calls: ${metro.length}`).toBe(1);
    expect(log.unexpected, `un-fixtured/mutating: ${JSON.stringify(log.unexpected)}`).toEqual([]);
  });

  test("(d3) basemap swap re-attaches overlays (guards the reattach flag)", async ({ page }) => {
    // attachOverlays only forgets a loaded layer when opts.reattach is set.
    // If that flag were ever dropped from the basemap-swap call site, the
    // style registry would be wiped without the layer being re-fetched and
    // the overlay would silently vanish on every theme change. Swapping the
    // basemap must therefore produce a SECOND metro fetch.
    const log = await installHarness(page, { layers: { metro: true } });
    await gotoMap(page);
    await page.waitForTimeout(4000);
    const before = log.calls.filter((c) => c === "/api/layers/metro").length;
    expect(before, "metro fetched once on cold load").toBe(1);

    await page.getByRole("button", { name: /dark basemap/i }).click();
    await page.waitForTimeout(6000);
    const after = log.calls.filter((c) => c === "/api/layers/metro").length;
    expect(after, `metro must be re-fetched after a basemap swap (got ${after})`).toBe(2);
  });

  test("(d2) no forced style rebuild on first paint", async ({ page }) => {
    const msgs = captureConsole(page);
    await installHarness(page);
    await gotoMap(page);
    await page.waitForTimeout(4000);
    const diffWarn = msgs.filter((m) => /Unable to perform style diff/i.test(m.text));
    expect(diffWarn, "the duplicate setStyle would reintroduce this warning").toEqual([]);
  });

  // ── (a) parcels list ──────────────────────────────────────────────────
  test("(a) list row count equals header count, incl. VAULT_PRIVATE", async ({ page }) => {
    await installHarness(page);
    await gotoMap(page);

    await page.getByRole("button", { name: /parcels list/i }).click();
    const header = page.getByText(/^Parcels \(\d+\)$/);
    await expect(header).toBeVisible();

    const headerCount = Number((await header.textContent())!.match(/\((\d+)\)/)![1]);
    expect(headerCount).toBe(PARCELS.length);

    // Rows are the clickable parcel cards inside the panel.
    const rows = page.locator('[data-testid="portal-card"]');
    await expect(rows).toHaveCount(headerCount);

    // The exact row the pre-fix whitelist dropped.
    await expect(page.getByText("3261256")).toBeVisible();
    await expect(page.getByText(/Vault Private/i).first()).toBeVisible();
  });

  test("(a2) search filters, and the two empty states are distinct", async ({ page }) => {
    await installHarness(page);
    await gotoMap(page);
    await page.getByRole("button", { name: /parcels list/i }).click();

    const search = page.getByPlaceholder(/Search plot, district, project/i);
    await search.fill("3261256");
    await expect(page.locator('[data-testid="portal-card"]')).toHaveCount(1);

    await search.fill("zzz-no-such-parcel");
    await expect(page.getByText(/No parcels match/i)).toBeVisible();

    await search.fill("");
    await expect(page.locator('[data-testid="portal-card"]')).toHaveCount(PARCELS.length);
  });

  // ── (b) Find plot ─────────────────────────────────────────────────────
  async function openFind(page: import("@playwright/test").Page) {
    await page.getByRole("button", { name: /^find plot$/i }).click();
    return page.getByPlaceholder(/Plot number/i);
  }

  test("(b) found / not-found / geometryless / untrimmed", async ({ page }) => {
    await installHarness(page);
    await gotoMap(page);

    // not found -> explicit message naming the input
    let input = await openFind(page);
    await input.fill(PLOT_MISSING);
    await input.press("Enter");
    await expect(page.getByText(new RegExp(`No plot found for .*${PLOT_MISSING}`, "i"))).toBeVisible();

    // geometryless -> distinct message, not "not found"
    await input.fill(PLOT_NO_GEOMETRY);
    await input.press("Enter");
    await expect(page.getByText(/has no mapped boundary/i)).toBeVisible();

    // untrimmed input still resolves
    await input.fill(`  ${PLOT_FOUND}  `);
    await input.press("Enter");
    await expect(page.getByText(/No plot found|has no mapped boundary/i)).toHaveCount(0);

    // found -> drawer opens (after the 2s flyTo settle)
    await page.waitForTimeout(3500);
    const shown = await page.evaluate(() =>
      [...document.querySelectorAll("aside")].filter((el) => {
        const r = el.getBoundingClientRect();
        const midX = r.left + r.width / 2;
        return r.width > 0 && midX > 0 && midX < window.innerWidth;
      }).length,
    );
    expect(shown, "found plot opens exactly one drawer").toBe(1);
  });

  // ── (c) exactly one drawer ────────────────────────────────────────────
  test("(c) one drawer at a time across list, carousel and vault paths", async ({ page }) => {
    await installHarness(page);
    await gotoMap(page);

    // SidePanel is mounted unconditionally and parked off-canvas with a
    // translate, so counting <aside> nodes always yields >= 1. What the P0 1.1
    // defect actually produced was two drawers *on screen* tiling across the
    // viewport, so count asides whose horizontal midpoint is inside it.
    const onScreenDrawers = () =>
      page.evaluate(() =>
        [...document.querySelectorAll("aside")].filter((el) => {
          const r = el.getBoundingClientRect();
          const midX = r.left + r.width / 2;
          return r.width > 0 && r.height > 0 && midX > 0 && midX < window.innerWidth;
        }).length,
      );

    expect(await onScreenDrawers(), "no drawer on screen at rest").toBe(0);

    // Order matters: the right-edge drawer covers the top-right toolbar once
    // open, so the vault-view toggle is flipped first, while nothing overlaps
    // it. Every later interaction uses a surface the drawer cannot cover —
    // the carousel (bottom centre) and the parcels list (left).
    await page.getByRole("button", { name: /toggle vault view/i }).click();
    await page.waitForTimeout(600);

    // 1. carousel -> vault drawer (reaches openVaultPanel)
    await page.getByRole("button", { name: /next parcel/i }).click();
    await page.waitForTimeout(2500);
    expect(await onScreenDrawers(), "vault drawer only").toBe(1);

    // 2. THE P0 1.1 CASE — cross-path. A listing is now opened from the
    //    parcels list while the vault drawer is still up. selectedParcelId and
    //    selectedVaultEntry are independent atoms rendering two right-edge
    //    <aside>s at the same width; pre-fix both stayed on screen, tiled
    //    across ~85% of the viewport, and closing one left the other eating
    //    every pointer event over the map.
    await page.getByRole("button", { name: /parcels list/i }).click();
    await page.locator('[data-testid="portal-card"]').first().click();
    await page.waitForTimeout(2500);
    expect(await onScreenDrawers(), "listing drawer replaced the vault drawer").toBe(1);

    // 3. close -> zero drawers, and the map is hit-testable again
    await page.getByRole("button", { name: /close parcel panel/i }).click();
    await page.waitForTimeout(800);
    const tagUnderRight = await page.evaluate(() => {
      const el = document.elementFromPoint(window.innerWidth - 60, Math.floor(window.innerHeight / 2));
      return el?.tagName ?? "NONE";
    });
    expect(tagUnderRight, "right edge must be the map canvas, not a stale aside").toBe("CANVAS");
  });

  // ── (e) cursor readout ────────────────────────────────────────────────
  test("(e) cursor readout updates without re-rendering the page", async ({ page }) => {
    await installHarness(page);
    await gotoMap(page);
    await page.waitForTimeout(2500);

    const canvas = page.locator("canvas.maplibregl-canvas");
    const box = (await canvas.boundingBox())!;

    // Count DOM mutations outside the readout while the pointer moves. A
    // parent re-render that changed anything would show up here.
    await page.evaluate(() => {
      (window as unknown as { __mut: number }).__mut = 0;
      const o = new MutationObserver((recs) => {
        (window as unknown as { __mut: number }).__mut += recs.length;
      });
      o.observe(document.body, { childList: true, subtree: true, attributes: true });
    });

    const readout = page.locator("text=/^-?\\d+\\.\\d{5}, -?\\d+\\.\\d{5}$/").first();
    const before = await readout.textContent();

    for (let i = 0; i < 40; i++) {
      await page.mouse.move(box.x + 200 + i * 5, box.y + 200 + (i % 7) * 3);
    }
    await page.waitForTimeout(600);

    const after = await readout.textContent();
    expect(after, "readout must track the pointer").not.toBe(before);

    const mutations = await page.evaluate(() => (window as unknown as { __mut: number }).__mut);
    // The readout itself mutates one text node per frame; a full-page re-render
    // would push this far higher. Generous ceiling — we assert order of
    // magnitude, not an exact figure.
    expect(mutations, `DOM mutations during 40 mousemoves: ${mutations}`).toBeLessThan(400);
  });

  // ── (f) / (g) console ─────────────────────────────────────────────────
  test("(f) production console has no log/warn", async ({ page }) => {
    const msgs = captureConsole(page);
    await installHarness(page);
    await gotoMap(page);
    await page.waitForTimeout(4000);

    // Exercise the surfaces the audit checked.
    await page.getByRole("button", { name: /parcels list/i }).click();
    await page.waitForTimeout(500);
    await page.getByRole("button", { name: /parcels list/i }).click();
    await page.mouse.move(700, 450);
    await page.waitForTimeout(1000);

    const noisy = msgs.filter(
      (m) =>
        (m.type === "log" || m.type === "warning") &&
        // MapLibre/WebGL/browser chatter is not ours to silence.
        // Vendor/browser chatter that is not ours to silence. Speed Insights
        // only logs because /_vercel/speed-insights/script.js exists on Vercel
        // and not on a local `next start` — it is silent in real production.
        !/maplibre|webgl|swiftshader|deprecat|Download the React DevTools|Vercel Speed Insights/i.test(m.text),
    );
    expect(noisy.map((m) => `${m.type}: ${m.text}`), "app must be silent in production").toEqual([]);
  });

  test("(g) ?debug=1 re-enables the gated trace", async ({ page }) => {
    const msgs = captureConsole(page);
    await installHarness(page);
    await page.goto("/parcels/map?debug=1", { waitUntil: "domcontentloaded" });
    await page.locator("canvas.maplibregl-canvas").waitFor({ timeout: 30_000 });
    await page.waitForTimeout(4000);

    const gated = msgs.filter((m) => /\[ZAAHI\]|\[BUILDINGS\]|\[GLB\]/.test(m.text));
    expect(gated.length, "debug flag must restore the trace").toBeGreaterThan(0);
  });
});
