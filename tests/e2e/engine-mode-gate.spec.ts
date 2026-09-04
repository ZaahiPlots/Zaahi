import { test, expect, type Page } from "@playwright/test";
import { installHarness } from "./harness";

// The founder's report, 2026-08-27, turned into a browser test:
//
//   "Selecting the Hospitality engine while in Build-to-Rent zeroes every KPI
//    — Yield 0.0%, Payback 0.0 yr, Monthly AED 0 — and leaks raw text
//    'NO IRR (CASHFLOWS DO NOT STRADDLE ZERO)'; the unsupported-mode notice
//    is hidden in an explainer instead of blocking the mode."
//
// Hospitality is `modes: ['bts']` in engines.ts — it has no rental model at
// all. A "Mode not supported" panel already existed, but it sat BELOW the KPI
// hero, so the first thing on screen was a confident set of zeros. Zeros are a
// number: nothing distinguished "this engine has no rental model" from "this
// asset yields nothing", and only one of those is a reason not to buy a plot.
//
// Runs against /preview/feasibility-v6 in sidepanel mode — the layout the
// production SidePanel uses, and the one the report describes.

async function openCalculator(page: Page, parcelId: string) {
  await installHarness(page);
  await page.goto("/preview/feasibility-v6", { waitUntil: "domcontentloaded" });
  await page.locator("select").first().waitFor({ timeout: 30_000 });
  await page.locator("select").first().selectOption(parcelId);
  await page.getByLabel("Layout mode").selectOption("sidepanel");
  await page.waitForTimeout(800);
}

/**
 * The engine dropdown. In sidepanel mode it lives behind a disclosure
 * ("Engine <label> ▸ change", founder 2026-06-08) so only power users open
 * the picker — the test has to open it the same way a user would.
 */
async function selectEngine(page: Page, engineId: string) {
  const picker = page.locator('select:has(option[value="hospitality"])').first();
  if (!(await picker.isVisible().catch(() => false))) {
    await page.getByRole("button", { name: /▸ change/ }).click();
    await page.waitForTimeout(300);
  }
  await picker.selectOption(engineId);
}

async function bodyText(page: Page): Promise<string> {
  return page.evaluate(() => document.body.innerText);
}

test.describe("engine / mode gating", () => {
  test("Hospitality on Build-to-Rent shows no zeroed KPIs and no raw verdict text", async ({ page }) => {
    await openCalculator(page, "mock-001");

    await page.getByRole("button", { name: /build to rent/i }).click();
    await page.waitForTimeout(500);
    await selectEngine(page, "hospitality");
    await page.waitForTimeout(1200);

    const t = await bodyText(page);

    // 1. The hero must say the mode is not modelled.
    expect(t, "the hero states the mode is not modelled").toMatch(/not modelled/i);

    // 2. The specific zeros from the report must be gone. These are the
    //    figures that made a missing model look like a bad investment.
    expect(t, "no zeroed Yield").not.toMatch(/Yield\s*\n?\s*0\.0\s*%/i);
    expect(t, "no zeroed Payback").not.toMatch(/Payback\s*0\.0\s*yr/i);
    expect(t, "no zeroed Monthly").not.toMatch(/Monthly\s*AED\s*0\b/i);

    // 3. The raw verdict string must not reach the user. It is an internal
    //    label from verdict.ts, not a sentence written for a reader.
    expect(t, "no raw IRR verdict string").not.toMatch(/cashflows do not straddle zero/i);

    // 4. Investment cost is still legitimate and must survive — the engine
    //    models land and construction perfectly well, it just has no rental
    //    revenue. The Detail panel is collapsed by default in sidepanel mode,
    //    so the always-visible proof is its header metric.
    expect(t, "investment still surfaced in the Detail header").toMatch(/Total inv\s+AED/i);

    // ...and the row itself is there once the panel is opened.
    await page.getByRole("button", { name: /Detail/i }).click();
    await page.waitForTimeout(400);
    const opened = await bodyText(page);
    expect(opened, "Total Investment row present").toMatch(/Total Investment/i);
    // Opening it must not smuggle the zeroed revenue rows back in.
    expect(opened, "no zeroed rental rows in the detail").not.toMatch(/Gross Annual/i);
  });

  test("a supported mode is untouched", async ({ page }) => {
    await openCalculator(page, "mock-001");

    // Residential supports both modes — nothing should be gated.
    await selectEngine(page, "residential");
    await page.getByRole("button", { name: /build to rent/i }).click();
    await page.waitForTimeout(1200);

    const t = await bodyText(page);
    expect(t, "no spurious not-modelled notice").not.toMatch(/not modelled/i);
    expect(t, "the BtR hero renders").toMatch(/Yield/i);
    expect(t, "payback renders").toMatch(/Payback/i);
  });

  test("switching back to a supported mode restores the KPIs", async ({ page }) => {
    await openCalculator(page, "mock-001");

    await page.getByRole("button", { name: /build to rent/i }).click();
    await selectEngine(page, "hospitality");
    await page.waitForTimeout(1000);
    expect(await bodyText(page), "gated on BtR").toMatch(/not modelled/i);

    // Hospitality is BtS-only, so Build to Sell must come back fully.
    await page.getByRole("button", { name: /build to sell/i }).click();
    await page.waitForTimeout(1200);

    const t = await bodyText(page);
    expect(t, "no notice on the supported mode").not.toMatch(/not modelled/i);
    expect(t, "the BtS hero is back").toMatch(/NET PROFIT/i);
  });
});
