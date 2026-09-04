// ZAAHI smoke checks (a)–(g) for the 2026-08-26 integration.
// See docs/SMOKE_2026-08-26.md for results and for what each check defends.
//
// Read-only by construction: every /api call is fulfilled from fixtures inside
// the browser, so no Next route handler runs and the production database is
// never contacted. Non-GET requests are aborted and recorded as failures.

import { test, expect, type ConsoleMessage, type Page } from "@playwright/test";
import { installHarness, gotoMap } from "./harness";
import { PARCELS, PLOT_FOUND, PLOT_NO_GEOMETRY, PLOT_MISSING } from "./fixtures";
import {
  ESRI_LIGHT_BASE,
  ESRI_LIGHT_LABELS,
  ESRI_DARK_BASE,
  ESRI_DARK_LABELS,
  ESRI_IMAGERY,
  ESRI_CANVAS_MAXZOOM,
  ESRI_IMAGERY_MAXZOOM,
} from "@/lib/basemap-tiles";

// ── watermark detection ───────────────────────────────────────────────────
//
// A tile provider that wants an API key does not necessarily stop serving. It
// serves HTTP 200 and stamps "API KEY REQUIRED" across the image. That is
// exactly what CARTO did in late August 2026, and it is why the default
// basemap shipped defaced for six days while every gate stayed green: (h)
// only ever asserted status codes and request origins.
//
// docs/BACKLOG.md R-1 records that the same thing can happen to us again —
// every basemap now serves from Esri's LEGACY arcgisonline endpoint, which
// Esri lists in "mature status" and whose own guidance says applications
// should have moved to keyed services by 2022-04-30.
//
// How this detects it, without OCR and without knowing the provider:
//
//   A key-required overlay is the SAME artwork on every tile, whatever the
//   tile shows. Real map content is not. So: fetch the same zoom level over
//   three continents, and count pixels that are (a) identical across all
//   three AND (b) not that tile's own background colour. For genuine
//   cartography that is essentially zero — roads and coastlines differ by
//   location. For an overlay it is the overlay itself.
//
// Measured on the three CALIBRATED_PROBE_TILES at z12:
//
//   CARTO light_all (watermarked)   0.43%
//   CARTO dark_all  (watermarked)   1.38%
//   Esri Light Gray (clean)         0.02%
//   Esri Dark Gray  (clean)         0.00%
//   Esri World Imagery (clean)      0.00%
//
// IMPORTANT — the metric is NOT zoom- or location-invariant, and the earlier
// claim of a "20x-70x separation" only holds for these tiles. Re-measured
// 2026-09-04 on dense city centres:
//
//   Esri Light Gray (clean)  z12 0.47%   z14 1.30%   z16 0.58%
//
// A clean tile over a city scores 0.47%, which is ABOVE the watermarked CARTO
// figure of 0.43%. Dense cartography shares enough exact colours between
// cities to look like a fixed overlay. So this check stays pinned to the
// calibrated tiles at z12 and must not be pointed anywhere else without
// re-deriving the threshold. Coverage at other zooms is the placeholder
// check's job, which is exact rather than statistical.
//
// Single-tile statistics were tried first and rejected: the CLEAN Esri Light
// Gray tile is flatter (top colour 90.5%, entropy 0.59) than the WATERMARKED
// CARTO tile (61.7%, 1.97), so uniformity and entropy both point the wrong
// way. Only the cross-tile invariant separates them.
//
// Known limit: a fully translucent watermark blended over varying content
// would lower the score. This catches the opaque-text kind that CARTO ships.

const WATERMARK_THRESHOLD = 0.0015; // 0.15% — see the measurements above

/** The map's own cap — src/app/parcels/map/page.tsx, `maxZoom: 18`. */
const MAP_MAX_ZOOM = 18;

const tileX = (lon: number, z: number) => Math.floor(((lon + 180) / 360) * 2 ** z);
const tileY = (lat: number, z: number) => {
  const r = (lat * Math.PI) / 180;
  return Math.floor(((1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2) * 2 ** z);
};

/**
 * The tiles the watermark metric is CALIBRATED on. Fixed coordinates at z12,
 * not derived — moving them invalidates the threshold. See WATERMARK_THRESHOLD.
 *
 * Antalya (36.88, 31.38) · London (51.51, -0.09) · Tokyo (35.68, 139.66).
 *
 * The comment here used to say "Dubai, London and Tokyo". Two of the three
 * were right; the first is southern Turkey, carried over from the CARTO probe
 * — the Turkish place names are visible in the watermarked sample that
 * originally demonstrated this check. Corrected 2026-09-04.
 */
const CALIBRATED_PROBE_TILES = [
  { z: 12, x: 2405, y: 1596 },
  { z: 12, x: 2047, y: 1362 },
  { z: 12, x: 3637, y: 1613 },
] as const;

/**
 * Label-dense spots inside ONE city. Used for the placeholder check, which
 * asks "does this level contain data at all" — a question that needs several
 * populated tiles close together, because a single empty label tile is
 * perfectly legitimate and two of them look identical for good reasons.
 * Getting that wrong is what put Reference one level off on the first pass.
 */
function localTiles(z: number) {
  return [
    [25.1972, 55.2744], [25.0764, 55.1394], [25.2048, 55.2708],
    [25.1124, 55.139], [24.4539, 54.3773], [25.2532, 55.3657],
  ].map(([lat, lon]) => ({ z, x: tileX(lon, z), y: tileY(lat, z) }));
}

const fillTemplate = (t: string, tile: { z: number; x: number; y: number }) =>
  t.replace("{z}", String(tile.z)).replace("{x}", String(tile.x)).replace("{y}", String(tile.y));

/**
 * Fraction of pixels that are identical across all probe tiles AND are not
 * the tile's own background colour. Effectively "how much fixed artwork is
 * painted on every tile regardless of location".
 */
async function overlayFraction(page: Page, template: string): Promise<number> {
  const urls = CALIBRATED_PROBE_TILES.map((t) => fillTemplate(template, t));
  return page.evaluate(async (tileUrls: string[]) => {
    const load = async (u: string) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      await new Promise((res, rej) => {
        img.onload = res;
        img.onerror = () => rej(new Error(`tile failed to load: ${u}`));
        img.src = u;
      });
      const c = document.createElement("canvas");
      c.width = img.width;
      c.height = img.height;
      const ctx = c.getContext("2d")!;
      ctx.drawImage(img, 0, 0);
      return ctx.getImageData(0, 0, c.width, c.height).data;
    };
    const tiles = await Promise.all(tileUrls.map(load));
    // Quantise to 5 bits per channel so JPEG ringing does not read as signal
    // (Esri serves the Canvas base layers as JPEG).
    const q = (d: Uint8ClampedArray, i: number) =>
      ((d[i] >> 3) << 10) | ((d[i + 1] >> 3) << 5) | (d[i + 2] >> 3);
    const modal = tiles.map((d) => {
      const m = new Map<number, number>();
      for (let i = 0; i < d.length; i += 4) {
        const k = q(d, i);
        m.set(k, (m.get(k) ?? 0) + 1);
      }
      let bestK = 0;
      let bestV = -1;
      for (const [k, v] of m) if (v > bestV) { bestV = v; bestK = k; }
      return bestK;
    });
    const n = tiles[0].length / 4;
    let sameNonBg = 0;
    for (let px = 0; px < n; px++) {
      const i = px * 4;
      const k0 = q(tiles[0], i);
      let equal = true;
      for (let t = 1; t < tiles.length; t++) if (q(tiles[t], i) !== k0) { equal = false; break; }
      if (!equal) continue;
      let isBackground = false;
      for (let t = 0; t < tiles.length; t++) if (k0 === modal[t]) { isBackground = true; break; }
      if (!isBackground) sameNonBg++;
    }
    return sameNonBg / n;
  }, urls);
}

/**
 * True when every sampled tile at this zoom is byte-identical — the signature
 * of a provider answering past its coverage with a filler image rather than a
 * 404.
 *
 * This is the regression of 2026-09-04. Esri's Canvas layers carry real data
 * over the UAE only to z16; above that they return HTTP 200 with a
 * "Map data not yet available" placeholder. The map allowed z18, so at z16.15
 * in 3D every basemap tile on production was that placeholder. Nothing in the
 * status code, the content type or the byte length says so — only the fact
 * that the same image comes back for every coordinate.
 *
 * Sampled inside one city, not across continents: the question here is "does
 * this level have data", and a single empty label tile is legitimate.
 */
async function allTilesIdentical(page: Page, template: string, z: number): Promise<boolean> {
  const urls = localTiles(z).map((t) => fillTemplate(template, t));
  return page.evaluate(async (tileUrls: string[]) => {
    const digests = await Promise.all(
      tileUrls.map(async (u) => {
        const buf = await (await fetch(u, { cache: "no-store" })).arrayBuffer();
        const hash = await crypto.subtle.digest("SHA-256", buf);
        return [...new Uint8Array(hash)].map((b) => b.toString(16).padStart(2, "0")).join("");
      }),
    );
    return new Set(digests).size === 1;
  }, urls);
}

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

  // ── (h) dark basemap is keyless ───────────────────────────────────────
  test("(h) no CARTO tile request leaves the page, on either basemap", async ({ page }) => {
    // History this guards, in two parts.
    //
    // 2026-08-27: Dark rendered CARTO tiles stamped "API KEY REQUIRED". It could
    // not be reproduced at the time and was read as a CARTO quota tripping under
    // real-user load, so only Dark was moved to Esri and the original version of
    // this check only ever looked at dark_all.
    //
    // 2026-09-03: the real cause was CARTO rolling out a blanket API-key
    // requirement for raster basemaps. Light — the DEFAULT basemap — had been
    // serving watermarked tiles to every signed-in user for six days, and the
    // narrow assertion below was green throughout, because it only watched the
    // one basemap that had already been fixed.
    //
    // So this no longer greps for a variant. ANY request to cartocdn.com fails
    // it, on the default basemap and after switching, and each Esri canvas must
    // actually serve. It fails on the pre-fix tree at the first assertion,
    // before a single click, because light_all is requested on load.
    const carto: string[] = [];
    const esriLight: { status: number }[] = [];
    const esriDark: { status: number }[] = [];
    page.on("request", (r) => {
      if (/cartocdn\.com/.test(r.url())) carto.push(r.url());
    });
    page.on("response", (r) => {
      if (/World_Light_Gray/.test(r.url())) esriLight.push({ status: r.status() });
      if (/World_Dark_Gray/.test(r.url())) esriDark.push({ status: r.status() });
    });

    await installHarness(page);
    await gotoMap(page);
    await page.waitForTimeout(6000);

    // Default basemap is "light" — this is the assertion that was missing.
    expect(
      carto,
      `default (light) basemap must not request CARTO tiles: ${carto.slice(0, 2)}`,
    ).toEqual([]);
    expect(esriLight.length, "Esri light canvas tiles were requested on load").toBeGreaterThan(0);
    expect(
      esriLight.filter((t) => t.status !== 200),
      "all Esri light tiles return 200",
    ).toEqual([]);

    await page.getByRole("button", { name: /dark basemap/i }).click();
    await page.waitForTimeout(6000);

    expect(esriDark.length, "Esri dark canvas tiles were requested").toBeGreaterThan(0);
    expect(
      esriDark.filter((t) => t.status !== 200),
      "all Esri dark tiles return 200",
    ).toEqual([]);

    // Switch back — the original report also said returning to Light did not
    // clear the broken tiles without a reload.
    await page.getByRole("button", { name: /light basemap/i }).click();
    await page.waitForTimeout(4000);

    expect(
      carto,
      `no CARTO tile may be requested on any basemap: ${carto.slice(0, 2)}`,
    ).toEqual([]);
  });

  // ── (h2) the tiles we DO serve must be real ───────────────────────────
  //
  // (h) proves we ask the right provider. It cannot prove the provider is
  // giving us usable tiles, and there are two distinct ways it can fail to.
  // They need different detectors, and conflating them is how the second one
  // reached production.
  //
  //   WATERMARK   — CARTO, Aug 2026. HTTP 200, real cartography, "API KEY
  //                 REQUIRED" stamped over it. Tiles still differ from each
  //                 other, so only a statistical test finds it.
  //   PLACEHOLDER — Esri, found in production 2026-09-04. HTTP 200 with a
  //                 "Map data not yet available" filler because the request
  //                 was deeper than the layer's coverage. Every tile is the
  //                 SAME image, so an exact test finds it — and an exact test
  //                 is what this needed.
  test("(h2) no basemap serves a placeholder at any zoom we request", async ({ page }) => {
    // The regression this exists for: Esri Canvas carries real data over the
    // UAE only to z16, the map allowed z18, and at z16.15 in 3D every basemap
    // tile on production was the placeholder. The old (h2) probed z12 only —
    // where every layer has data — so it stayed green throughout. A basemap
    // check that looks at one zoom cannot see a coverage cliff.
    //
    // Each source is probed at z16 and at the deepest level the map will
    // actually request it: min(map maxZoom, the source's declared maxzoom).
    // That second value is the real subject — it asserts the maxzoom we
    // declare is not deeper than the data behind it.
    await installHarness(page);
    await gotoMap(page);

    const surfaces: Array<[string, string, number]> = [
      ["Light base", ESRI_LIGHT_BASE, ESRI_CANVAS_MAXZOOM],
      ["Light labels", ESRI_LIGHT_LABELS, ESRI_CANVAS_MAXZOOM],
      ["Dark base", ESRI_DARK_BASE, ESRI_CANVAS_MAXZOOM],
      ["Dark labels", ESRI_DARK_LABELS, ESRI_CANVAS_MAXZOOM],
      ["Satellite", ESRI_IMAGERY, ESRI_IMAGERY_MAXZOOM],
    ];

    for (const [label, template, declaredMax] of surfaces) {
      const deepest = Math.min(MAP_MAX_ZOOM, declaredMax);
      for (const z of Array.from(new Set([16, deepest]))) {
        expect(
          await allTilesIdentical(page, template, z),
          `${label} serves a placeholder at z${z} — every sampled tile is byte-identical. ` +
            `Either the layer has no data at this level, or its declared maxzoom ` +
            `(${declaredMax}) is deeper than its coverage.`,
        ).toBe(false);
      }
    }
  });

  // ── (h3) and it must not be watermarked ───────────────────────────────
  test("(h3) no basemap serves a watermarked tile", async ({ page }) => {
    // Pinned to CALIBRATED_PROBE_TILES at z12. This metric is statistical and
    // neither zoom- nor location-invariant — a clean tile over a dense city
    // scores 0.47%, above CARTO's watermarked 0.43% — so it must not be moved
    // without re-deriving the threshold. See the note above WATERMARK_THRESHOLD.
    await installHarness(page);
    await gotoMap(page);

    const surfaces: Array<[string, string]> = [
      ["Light base", ESRI_LIGHT_BASE],
      ["Dark base", ESRI_DARK_BASE],
      ["Satellite", ESRI_IMAGERY],
    ];

    for (const [label, template] of surfaces) {
      const fraction = await overlayFraction(page, template);
      expect(
        fraction,
        `${label} looks watermarked: ${(fraction * 100).toFixed(2)}% of pixels are identical ` +
          `across the three calibrated tiles and are not background, against a ` +
          `${(WATERMARK_THRESHOLD * 100).toFixed(2)}% threshold. Clean scores ~0.00-0.02%; ` +
          `CARTO's keyless tiles scored 0.43-1.38%.`,
      ).toBeLessThan(WATERMARK_THRESHOLD);
    }
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
