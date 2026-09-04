import { test, expect, type Page } from "@playwright/test";
import { installHarness, gotoMap } from "./harness";

// Founder backlog PART 4, item 2 — the Archie orb must not cover the header.
//
// Reported 2026-08-27: "The Archie orb overlaps the 'REAL ESTATE OS'
// wordmark." It could: the orb is draggable, its position persists in
// localStorage, and the only constraint was the viewport edge.
//
// I dismissed this item on 2026-09-04 as "not reproducible — that wordmark
// exists only on the login page". That was wrong. It is rendered by the map's
// own HeaderBar (src/app/parcels/map/page.tsx), and the conclusion came from a
// grep whose output was truncated by `head`, with every `useState` in the file
// matching "estate" ahead of the real hit. These tests exist so the item is
// closed by evidence rather than by assertion.
//
// The exclusion covers the WHOLE header bar, not just the wordmark: it is
// full-width and also carries the search inputs and right-hand controls.

const LAUNCHER = ".archibald-launcher";

async function rects(page: Page) {
  return page.evaluate((sel) => {
    const orb = document.querySelector(sel)?.getBoundingClientRect();
    const header = document.querySelector("header")?.getBoundingClientRect();
    const brand = [...document.querySelectorAll("div")]
      .find((d) => d.children.length === 0 && d.textContent?.trim() === "ZAAHI")
      ?.getBoundingClientRect();
    const box = (r?: DOMRect) =>
      r ? { top: r.top, bottom: r.bottom, left: r.left, right: r.right } : null;
    return { orb: box(orb), header: box(header), brand: box(brand) };
  }, LAUNCHER);
}

function intersects(
  a: { top: number; bottom: number; left: number; right: number },
  b: { top: number; bottom: number; left: number; right: number },
) {
  return a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
}

test.describe("Archie orb vs the header (PART 4 item 2)", () => {
  test("the wordmark really is on the map — the premise of the report", async ({ page }) => {
    await installHarness(page);
    await gotoMap(page);
    await page.waitForTimeout(1500);
    const { brand, header } = await rects(page);
    expect(brand, "the ZAAHI wordmark is rendered on /parcels/map").not.toBeNull();
    expect(header, "a header bar exists").not.toBeNull();
    expect(brand!.top, "and it sits inside the header").toBeGreaterThanOrEqual(header!.top - 1);
    expect(brand!.bottom).toBeLessThanOrEqual(header!.bottom + 1);
  });

  test("a persisted position over the wordmark is migrated on load", async ({ page }) => {
    // Exactly the state a founder who dragged the orb there is carrying.
    await page.addInitScript(() => {
      try {
        window.localStorage.setItem(
          "zaahi-archie-launcher-pos",
          JSON.stringify({ x: 20, y: 6 }),
        );
      } catch { /* ignore */ }
    });
    await installHarness(page);
    await gotoMap(page);
    await page.waitForTimeout(2000);

    const { orb, header, brand } = await rects(page);
    expect(orb, "launcher rendered").not.toBeNull();
    expect(
      intersects(orb!, header!),
      `orb ${JSON.stringify(orb)} still overlaps header ${JSON.stringify(header)}`,
    ).toBe(false);
    expect(intersects(orb!, brand!), "and specifically not the wordmark").toBe(false);
    expect(orb!.top, "it sits below the header").toBeGreaterThanOrEqual(header!.bottom);
  });

  test("dragging into the header lands below it", async ({ page }) => {
    await installHarness(page);
    await gotoMap(page);
    await page.waitForTimeout(2000);

    const launcher = page.locator(LAUNCHER).first();
    const start = await launcher.boundingBox();
    expect(start, "launcher has a box").not.toBeNull();

    // Drag hard into the top-left corner, straight at the wordmark.
    await page.mouse.move(start!.x + start!.width / 2, start!.y + start!.height / 2);
    await page.mouse.down();
    await page.mouse.move(300, 300, { steps: 8 });
    await page.mouse.move(40, 4, { steps: 12 });
    await page.mouse.up();
    await page.waitForTimeout(600);

    const { orb, header, brand } = await rects(page);
    expect(intersects(orb!, header!), "drag cannot park the orb on the header").toBe(false);
    expect(intersects(orb!, brand!), "nor on the wordmark").toBe(false);

    // And the clamped position is what gets persisted, so a reload is stable.
    const stored = await page.evaluate(() =>
      window.localStorage.getItem("zaahi-archie-launcher-pos"),
    );
    expect(stored, "position persisted").toBeTruthy();
    const parsed = JSON.parse(stored!) as { y: number };
    expect(parsed.y, "the stored y is already below the header").toBeGreaterThanOrEqual(
      header!.bottom,
    );
  });

  test("the orb stays reachable on a short viewport", async ({ page }) => {
    // The clamp must not push the orb off the bottom to satisfy the header
    // rule — an unreachable orb is worse than an untidy one.
    await page.setViewportSize({ width: 1280, height: 420 });
    await installHarness(page);
    await gotoMap(page);
    await page.waitForTimeout(2000);

    const { orb } = await rects(page);
    const vh = await page.evaluate(() => window.innerHeight);
    expect(orb!.bottom, "orb is within the viewport").toBeLessThanOrEqual(vh + 1);
    expect(orb!.top, "and not above it").toBeGreaterThanOrEqual(0);
  });
});
