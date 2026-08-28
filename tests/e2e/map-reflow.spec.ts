// Issues #10 and #26 — the map must fill its container, and a failure must be
// visible.
//
// Reproduced on production 2026-08-28 (Firefox, www.zaahi.io/parcels/map). The
// console carried, in order:
//   "WebGL context was lost"
//   "WebGL warning: drawElementsInstanced: Drawing to a destination rect
//    smaller than the viewport rect"
// and on screen the map area showed page content instead of tiles, full width,
// with every control live and nothing indicating a failure.
//
// Two distinct defects, so two checks:
//   (i)  the canvas is measured before layout settles and never re-measured
//   (ii) the context is lost after load and the app presents it as healthy
//
// Both are written to FAIL on the tree before the fix. (i) fails because
// nothing calls map.resize(); (ii) fails because although a webglcontextlost
// handler is deployed, it does not surface anything a user can see — verified
// against production, where the handler is present in the shipped bundle and
// the reporter still saw no failure state.

import { test, expect } from "@playwright/test";
import { installHarness, gotoMap } from "./harness";

/** The MapLibre canvas and its container, as the browser measures them. */
async function canvasVsContainer(page: import("@playwright/test").Page) {
  return page.evaluate(() => {
    const canvas = document.querySelector("canvas.maplibregl-canvas") as HTMLCanvasElement | null;
    if (!canvas) return null;
    const container = canvas.closest(".maplibregl-map")?.parentElement ?? canvas.parentElement;
    const c = canvas.getBoundingClientRect();
    const p = (container as HTMLElement).getBoundingClientRect();
    return {
      canvasW: Math.round(c.width), canvasH: Math.round(c.height),
      contW: Math.round(p.width), contH: Math.round(p.height),
      viewportW: window.innerWidth, viewportH: window.innerHeight,
    };
  });
}

test.describe("map reflow + failure visibility", () => {
  // ── (i) #10 — layout settling AFTER mount ────────────────────────────────
  test("(i) canvas re-fits when the container resizes after mount", async ({ page }) => {
    // Force the exact condition the report describes: the container has no
    // usable height when MapLibre first measures it, and only settles later.
    // Without a ResizeObserver the canvas keeps its first measurement forever,
    // which is the "813px canvas in an 828px viewport" dead strip and, in the
    // worst case, the small rotated rectangle on a white page.
    // MapLibre 5.22 ships its own ResizeObserver (trackResize defaults true), so
    // it already handles a container that CHANGES size. The case it cannot catch
    // is a container that measured wrong at construction and whose size never
    // changes afterwards — the observer only fires on change. The map container
    // here is `position:absolute; inset:0`, so once the page shell settles the
    // container's own box is stable forever and no observer callback ever runs.
    // Reproduce that: give the shell no height while the map is constructed,
    // then let it settle.
    await page.addInitScript(() => {
      const style = document.createElement("style");
      style.id = "reflow-probe";
      style.textContent = `body > div, #__next, main { max-height: 0px !important; overflow: hidden !important; }`;
      document.documentElement.appendChild(style);
    });

    await installHarness(page);
    await gotoMap(page);
    await page.waitForTimeout(2500);

    const collapsed = await canvasVsContainer(page);
    expect(collapsed, "canvas exists while collapsed").not.toBeNull();

    // Layout settles — the flex parent resolves, the panel closes, the window
    // finishes its first paint. No window 'resize' event fires for this.
    await page.evaluate(() => document.getElementById("reflow-probe")?.remove());
    await page.waitForTimeout(2000);

    const settled = await canvasVsContainer(page);
    expect(settled).not.toBeNull();

    // The canvas must now match its container. A tolerance of 4px absorbs
    // device-pixel rounding; the reported defect was 15px and the worst case
    // was most of the viewport.
    const drift = Math.abs(settled!.canvasH - settled!.contH);
    expect(
      drift,
      `canvas ${settled!.canvasW}x${settled!.canvasH} vs container ` +
        `${settled!.contW}x${settled!.contH} (viewport ${settled!.viewportW}x${settled!.viewportH}) — ` +
        `drift ${drift}px means the canvas never re-measured`,
    ).toBeLessThanOrEqual(4);
  });

  // ── (ii) #26 — a lost context must be visible ────────────────────────────
  test("(ii) a lost WebGL context surfaces a visible failure and a retry", async ({ page }) => {
    await installHarness(page);
    await gotoMap(page);
    await page.waitForTimeout(2500);

    // Kill the context the way the driver would. WEBGL_lose_context fires a
    // real webglcontextlost event on the same canvas MapLibre draws to.
    const killed = await page.evaluate(() => {
      const canvas = document.querySelector("canvas.maplibregl-canvas") as HTMLCanvasElement | null;
      if (!canvas) return "no canvas";
      const gl =
        (canvas.getContext("webgl2") as WebGL2RenderingContext | null) ??
        (canvas.getContext("webgl") as WebGLRenderingContext | null);
      if (!gl) return "no gl context";
      const ext = gl.getExtension("WEBGL_lose_context");
      if (!ext) return "no WEBGL_lose_context extension";
      ext.loseContext();
      return "lost";
    });
    expect(killed, "context loss could be triggered").toBe("lost");

    await page.waitForTimeout(2000);

    // The user must be told. A blank or stale map with live controls and no
    // message is the failure being reported — the app presenting a broken
    // state as a healthy one.
    const surfaced = await page.evaluate(() => {
      const text = document.body.innerText ?? "";
      return {
        hasNotice: /map interrupted|map failed|could not load the map|reload the map/i.test(text),
        hasRetry: Array.from(document.querySelectorAll("button, a")).some((el) =>
          /retry|reload|try again/i.test((el as HTMLElement).innerText ?? ""),
        ),
        alerts: document.querySelectorAll('[role="alert"], [role="status"]').length,
      };
    });

    expect(surfaced.hasNotice, "a visible failure notice must appear").toBe(true);
    expect(surfaced.hasRetry, "a retry affordance must be offered").toBe(true);
  });
});
