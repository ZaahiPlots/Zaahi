import { test, expect, type Page } from "@playwright/test";
import { installHarness } from "./harness";

/**
 * Feasibility v6.1 — the "no confident wrong answer" gates
 * (docs/audits/FEASIBILITY_AUDIT_2026-11-20.md, findings B1 / B5 / B6 / B10).
 *
 * Each gate is checked in BOTH layouts. B1 shipped because the unpriced-land
 * guard was wired into the fullscreen layout and not the side panel; the two
 * layouts now render the same blocks, and this spec pins that.
 *
 * Replaces engine-mode-gate.spec.ts (which asserted that hotels cannot be
 * built to rent — they now can) and mixeduse-headline.spec.ts.
 */

type Layout = "sidepanel" | "fullscreen";
const LAYOUTS: Layout[] = ["sidepanel", "fullscreen"];

async function open(page: Page, parcelId: string, layout: Layout) {
  await installHarness(page);
  await page.goto("/preview/feasibility-v6", { waitUntil: "domcontentloaded" });
  const picker = page.locator("select").first();
  await picker.waitFor({ timeout: 30_000 });
  await picker.selectOption(parcelId);
  await page.getByLabel("Layout mode").selectOption(layout);
  await page.waitForTimeout(800);
}

const hero = (page: Page) => page.getByTestId("feasibility-hero");
const heroText = async (page: Page) => (await hero(page).innerText()).replace(/\s+/g, " ");

async function selectEngine(page: Page, engineId: string) {
  const picker = page.locator('select:has(option[value="hospitality"])').first();
  if (!(await picker.isVisible().catch(() => false))) {
    await page.getByRole("button", { name: /▸ change/ }).click();
    await page.waitForTimeout(300);
  }
  await picker.selectOption(engineId);
  await page.waitForTimeout(800);
}

async function fill(page: Page, label: string | RegExp, value: string) {
  const el = page.getByLabel(label).first();
  await el.click();
  await el.fill(value);
  await el.blur();
  await page.waitForTimeout(900);
}

/** Nothing on the page may read as a result. */
async function expectNoResult(page: Page) {
  const t = await heroText(page);
  expect(t, "hero says there is no result").toMatch(/NO RESULT/i);
  expect(t, "no profit figure").not.toMatch(/NET PROFIT/i);
  expect(t, "no yield figure").not.toMatch(/YIELD ON COST/i);
  expect(t, "no IRR figure").not.toMatch(/\bIRR\s+-?\d/);
  const body = await page.evaluate(() => document.body.innerText);
  expect(body, "no verdict band anywhere").not.toMatch(/Strong — institutional|Moderate — above|Weak — positive|Below — /i);
  expect(body, "no returns table").not.toMatch(/ROI on total investment/i);
  await expect(page.getByRole("button", { name: /export pdf/i }), "PDF export is off").toBeDisabled();
}

for (const layout of LAYOUTS) {
  test.describe(`feasibility gates — ${layout}`, () => {
    test("B1: a plot with no price shows no result until a land cost is entered", async ({ page }) => {
      await open(page, "mock-006", layout);
      await expectNoResult(page);
      expect(await heroText(page)).toMatch(/Land price needed/i);

      await fill(page, "Land cost", "150000000");
      const t = await heroText(page);
      expect(t, "the result appears once the user supplies a price").toMatch(/NET PROFIT/i);
      expect(t).toMatch(/AED\s*-?[\d,]+/);
    });

    test("B6: a plot with no FAR asks for it instead of assuming 2.5", async ({ page }) => {
      await open(page, "mock-007", layout);
      await expectNoResult(page);
      expect(await heroText(page)).toMatch(/FAR unknown/i);
      const body = await page.evaluate(() => document.body.innerText);
      expect(body, "no invented FAR is printed").not.toMatch(/FAR 2\.50?\b/);

      await fill(page, /FAR — enter it/i, "3");
      expect(await heroText(page), "a result once the FAR is known").toMatch(/NET PROFIT/i);
    });

    test("B5: open space is not development land", async ({ page }) => {
      await open(page, "mock-008", layout);
      await expectNoResult(page);
      expect(await heroText(page)).toMatch(/Not a development plot/i);
    });

    test("B10: an engine with no sale model shows no Build-to-Sell or JV result", async ({ page }) => {
      await open(page, "mock-001", layout);
      await selectEngine(page, "senior");
      await expectNoResult(page);
      expect(await heroText(page)).toMatch(/not modelled/i);

      await page.getByRole("button", { name: /^build to rent$/i }).click();
      await page.waitForTimeout(900);
      expect(await heroText(page), "the supported mode still works").toMatch(/YIELD ON COST/i);
    });

    test("hotels can be built to rent, and switching modes keeps the result", async ({ page }) => {
      await open(page, "mock-009", layout);
      expect(await heroText(page)).toMatch(/NET PROFIT/i);
      const body = await page.evaluate(() => document.body.innerText);
      expect(body, "M10: the plan's Max GFA is used, not plot x FAR").toMatch(/150,000/);

      await page.getByRole("button", { name: /^build to rent$/i }).click();
      await page.waitForTimeout(900);
      const t = await heroText(page);
      expect(t).toMatch(/YIELD ON COST/i);
      expect(t).not.toMatch(/not modelled/i);
    });

    test("B4/B8: a mixed-use share drives the headline, and every use earns", async ({ page }) => {
      await open(page, "mock-003", layout);
      const profit = async () => {
        const m = (await heroText(page)).match(/NET PROFIT\s*(AED\s*-?[\d,]+)/i);
        if (!m) throw new Error("no NET PROFIT figure in the hero");
        return m[1];
      };
      const first = await profit();

      const shares = page.locator('[data-testid^="mix-share-"] input');
      await expect(shares).toHaveCount(3);
      const set = async (i: number, v: number) => {
        const el = shares.nth(i);
        await el.click();
        await el.fill(String(v));
        await el.blur();
      };
      await set(0, 20);
      await set(1, 20);
      await set(2, 60);
      await page.waitForTimeout(900);
      expect(await profit(), "the headline follows the mix").not.toBe(first);

      // A mix that does not total 100% is not a result.
      await set(2, 30);
      await page.waitForTimeout(900);
      expect(await heroText(page)).toMatch(/must total 100%/i);
    });
  });
}
