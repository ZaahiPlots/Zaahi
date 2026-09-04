import { test, expect } from "@playwright/test";
import { installHarness, gotoMap } from "./harness";

// Founder backlog PART 4 — layout & polish, the items that are testable.
//
// Two of the seven are not covered here and the reasons are recorded in
// docs/BACKLOG.md §2f: item 1 (canvas re-fit) was already addressed by
// 92a94cc and has its own spec in map-reflow.spec.ts, and item 2 (the Archie
// orb over the "REAL ESTATE OS" wordmark) could not be reproduced — that
// wordmark exists only on the login page, where the orb does not render.

test.describe("PART 4 layout polish", () => {
  // ── item 5 ──────────────────────────────────────────────────────────
  test("the parcels header count follows the filter", async ({ page }) => {
    await installHarness(page);
    await gotoMap(page);
    await page.getByRole("button", { name: /parcels list/i }).click();
    await page.waitForTimeout(800);

    const header = page.getByText(/^Parcels \(/);
    const unfiltered = (await header.innerText()).trim();
    const total = Number(unfiltered.match(/\((\d+)\)/)?.[1] ?? 0);
    expect(total, "a plain count with no search").toBeGreaterThan(1);

    // Narrow to a single row. The header used to keep the full count.
    const search = page.getByPlaceholder(/search/i).first();
    await search.click();
    await search.fill("3261253");
    await page.waitForTimeout(600);

    const rows = await page.locator('[data-testid="portal-card"]').count();
    const filteredHeader = (await header.innerText()).trim();

    expect(
      filteredHeader,
      `header must not still read the unfiltered total (${unfiltered})`,
    ).not.toBe(unfiltered);
    expect(filteredHeader, "header shows shown-of-total").toMatch(
      new RegExp(`${rows} of ${total}`),
    );
  });

  // ── item 6 ──────────────────────────────────────────────────────────
  test("a single listing is not called '1 listings'", async ({ page }) => {
    await installHarness(page);
    await gotoMap(page);
    await page.waitForTimeout(1500);
    const body = await page.evaluate(() => document.body.innerText);
    expect(body, "no unpluralised count anywhere on the page").not.toMatch(/\b1 listings\b/);
  });

  // ── item 4 ──────────────────────────────────────────────────────────
  test("the active basemap button is legible, not gold on gold", async ({ page }) => {
    await installHarness(page);
    await gotoMap(page);
    await page.waitForTimeout(1500);

    // Light is the default basemap, so its button is the active one.
    const btn = page.getByRole("button", { name: /light basemap/i });
    const style = await btn.evaluate((el) => {
      const s = getComputedStyle(el as HTMLElement);
      return { color: s.color, background: s.backgroundColor };
    });

    const parse = (c: string) => (c.match(/[\d.]+/g) ?? []).map(Number);
    const lum = (rgb: number[]) => {
      const f = rgb.slice(0, 3).map((v) => {
        const n = v / 255;
        return n <= 0.03928 ? n / 12.92 : Math.pow((n + 0.055) / 1.055, 2.4);
      });
      return 0.2126 * f[0] + 0.7152 * f[1] + 0.0722 * f[2];
    };
    const fg = parse(style.color);
    const bg = parse(style.background);

    // The background must be opaque — the whole point is that legibility can
    // no longer depend on what the map is showing underneath.
    expect(bg[3] === undefined || bg[3] >= 0.99, `active background is opaque (${style.background})`).toBe(true);

    const l1 = lum(fg), l2 = lum(bg);
    const contrast = (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
    expect(
      contrast,
      `active glyph contrast ${contrast.toFixed(2)} on ${style.background} — was 1.71 over the light basemap`,
    ).toBeGreaterThan(4.5);
  });

  // ── item 7 ──────────────────────────────────────────────────────────
  test("/parcels/check-plot has a way back to the map", async ({ page }) => {
    await installHarness(page);
    await page.goto("/parcels/check-plot", { waitUntil: "domcontentloaded" });

    const back = page.getByRole("link", { name: /back to map/i });
    await expect(back, "a visible way back").toBeVisible();
    await expect(back).toHaveAttribute("href", "/parcels/map");

    await back.click();
    await page.waitForURL("**/parcels/map", { timeout: 30_000 });
    expect(page.url(), "it actually navigates").toContain("/parcels/map");
  });
});
