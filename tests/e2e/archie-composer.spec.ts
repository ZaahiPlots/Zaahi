// Issue #24 — the Archie composer must be reachable on a short viewport.
//
// Reported: at a ~704px-tall window the "Ask Archie..." input and SEND button
// are clipped off the bottom of the panel and cannot be reached without
// resizing the window. That is the worst kind of UI bug in this product: a user
// who cannot reach the composer cannot report anything, including this.
//
// Two causes, both in the CSS:
//   1. .archibald-window has a fixed height:520px with no viewport clamp, and
//      sits at bottom:76px — so below ~600px of viewport the panel simply
//      extends past the bottom edge.
//   2. .archibald-scroll is flex:1 without min-height:0, so in a flex column it
//      refuses to shrink below its content and pushes the composer out of the
//      window's overflow:hidden box.
//
// This asserts the outcome a user cares about: the input is on screen and
// clickable. Written to FAIL on the pre-fix tree.

import { test, expect } from "@playwright/test";
import { installHarness, gotoMap } from "./harness";

const SHORT = { width: 1440, height: 704 }; // the height in the report

test("(#24) Archie composer stays on screen and reachable at a short viewport", async ({ page }) => {
  await page.setViewportSize(SHORT);

  // The reported case is "a short window WITH A REPOSITIONED LAUNCHER". That
  // matters: the launcher is draggable and the window anchors to whichever
  // quadrant it sits in. Left at its default bottom-right the panel is anchored
  // by its BOTTOM, so on a short viewport it overflows the top and the composer
  // still happens to be reachable. Dragged into the upper half it anchors by its
  // TOP instead, and a fixed 520px height then runs straight off the bottom edge,
  // taking the composer with it. Seed that position the way a drag would.
  await page.addInitScript(() => {
    try {
      window.localStorage.setItem(
        "zaahi-archie-launcher-pos",
        JSON.stringify({ x: 1200, y: 200 }),
      );
    } catch { /* ignore */ }
  });

  await installHarness(page);
  await gotoMap(page);
  await page.waitForTimeout(2000);

  // Open the assistant.
  await page.locator(".archibald-launcher, [aria-label*='Archie' i], [title*='Archie' i]").first().click();
  await page.waitForTimeout(800);

  const win = page.locator(".archibald-window");
  await expect(win, "chat window opened").toBeVisible();

  const geom = await page.evaluate(() => {
    const w = document.querySelector(".archibald-window") as HTMLElement | null;
    const row = document.querySelector(".archibald-input-row") as HTMLElement | null;
    const input = document.querySelector(".archibald-input") as HTMLElement | null;
    if (!w || !row || !input) return null;
    const wr = w.getBoundingClientRect();
    const rr = row.getBoundingClientRect();
    const ir = input.getBoundingClientRect();
    return {
      winTop: Math.round(wr.top), winBottom: Math.round(wr.bottom), winH: Math.round(wr.height),
      rowTop: Math.round(rr.top), rowBottom: Math.round(rr.bottom),
      inputBottom: Math.round(ir.bottom), inputTop: Math.round(ir.top),
      vh: window.innerHeight,
      // What the user would actually hit when clicking the input's centre.
      hitTag: (document.elementFromPoint(Math.round(ir.left + ir.width / 2),
                                         Math.round(ir.top + ir.height / 2)) as HTMLElement | null)?.tagName ?? "NONE",
    };
  });
  expect(geom, "found window, input row and input").not.toBeNull();

  // 1. The panel must not run off the bottom of the viewport.
  expect(
    geom!.winBottom,
    `chat window bottom ${geom!.winBottom} exceeds viewport ${geom!.vh} — panel is off-screen`,
  ).toBeLessThanOrEqual(geom!.vh);

  // 2. The composer must be fully inside the viewport.
  expect(
    geom!.inputBottom,
    `composer bottom ${geom!.inputBottom} is below the viewport ${geom!.vh} — the input cannot be reached`,
  ).toBeLessThanOrEqual(geom!.vh);

  // 3. The composer must be inside the panel it belongs to (not clipped by
  //    the window's overflow:hidden).
  expect(
    geom!.rowBottom,
    `composer bottom ${geom!.rowBottom} is past the panel bottom ${geom!.winBottom} — clipped by overflow:hidden`,
  ).toBeLessThanOrEqual(geom!.winBottom + 1);

  // 4. And it must actually be the thing under the cursor, not covered.
  expect(geom!.hitTag, "the input is the element at its own centre").toBe("INPUT");

  // 5. Finally, the real user action: type into it.
  await page.locator(".archibald-input").fill("reachability check");
  await expect(page.locator(".archibald-input")).toHaveValue("reachability check");
});
