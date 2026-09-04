import { test, expect, type Page } from "@playwright/test";
import { installHarness } from "./harness";

// The founder's report, 2026-08-27, turned into a browser test:
//
//   "Mix Breakdown inputs have ZERO effect on headline numbers. On plot 5310367
//    I changed the use mix from 30/10/60 to 90/10/60 and then to 0/100/0 and Net
//    Profit stayed exactly AED 9,849,442, ROI 4.3%, IRR 6.1% every time."
//
// scripts/mixeduse-headline.test.ts proves the MODEL responds to the mix. It
// cannot prove the COMPONENT is wired to it — and the wiring was the entire
// bug: the model was computed, rendered in its own panel, and then ignored by
// the headline. So this drives the real calculator in a real browser.
//
// It runs against /preview/feasibility-v6, which mounts the same shared
// FeasibilityV6Calculator as production /parcels/[id]/feasibility but takes its
// parcel from static mock data — no database, no API. mock-003 (plot 6862011)
// is Mixed Use with three sub-uses, which is exactly the shape the report
// describes.

const MIXED_USE_PARCEL = "mock-003";
const SINGLE_USE_PARCEL = "mock-001";

async function openPreview(page: Page, parcelId: string) {
  await installHarness(page);
  await page.goto("/preview/feasibility-v6", { waitUntil: "domcontentloaded" });
  // AuthGuard shows a splash until the synthetic session resolves.
  const picker = page.locator("select").first();
  await picker.waitFor({ timeout: 30_000 });
  await picker.selectOption(parcelId);
  // The Mix breakdown panel exists only in sidepanel mode — the layout the
  // SidePanel on /parcels/map uses, and the one the founder was looking at.
  // The preview route defaults to fullscreen.
  await page.getByLabel("Layout mode").selectOption("sidepanel");
  await page.waitForTimeout(800);
}

/**
 * The headline Net Profit, read out of the rendered page text.
 *
 * Deliberately not a DOM-structure locator: the figure is rendered by a
 * generic ResultRow with no test id, and pinning this test to that markup
 * would make a layout tweak look like a model regression. What matters is
 * the number a human reads under "NET PROFIT".
 */
async function netProfit(page: Page): Promise<string> {
  const text = await page.evaluate(() => document.body.innerText);
  const m = text.match(/NET PROFIT\s*\n\s*(AED\s*-?[\d,]+)/i);
  if (!m) throw new Error("no NET PROFIT figure on the page");
  return m[1].replace(/\s+/g, " ").trim();
}

function mixPanel(page: Page) {
  return page
    .locator("div")
    .filter({ has: page.getByRole("button", { name: /Mix breakdown/i }) })
    .last();
}

test.describe("mixed-use headline", () => {
  /** Set all three share inputs, keeping the sum at 100 so the mix stays valid. */
  async function setMix(page: Page, a: number, b: number, c: number) {
    const inputs = mixPanel(page).locator("input");
    for (const [i, v] of [a, b, c].entries()) {
      const el = inputs.nth(i);
      await el.click();
      await el.fill(String(v));
      await el.blur();
    }
    await page.waitForTimeout(800);
  }

  test("changing a mix share moves the headline Net Profit", async ({ page }) => {
    await openPreview(page, MIXED_USE_PARCEL);

    const panel = mixPanel(page);
    await expect(panel).toBeVisible();
    await expect(panel.locator("input")).toHaveCount(3);

    // The panel must say it is driving the headline. Before this change it was
    // computed and displayed while the headline ignored it, and nothing on
    // screen told the user which of the two disagreeing models they were
    // looking at.
    await expect(page.getByText(/Driving the headline/i)).toBeVisible();

    // Three valid mixes, all summing to 100. Every one must produce a
    // different headline; the reported bug was that all of them produced
    // exactly the same one.
    await setMix(page, 60, 30, 10);
    const first = await netProfit(page);
    expect(first, "a Net Profit figure is rendered").toMatch(/AED/);

    await setMix(page, 20, 20, 60);
    const second = await netProfit(page);

    await setMix(page, 0, 100, 0);
    const third = await netProfit(page);

    // Still the mix driving it — none of these fell back.
    await expect(page.getByText(/Driving the headline/i)).toBeVisible();

    expect(
      new Set([first, second, third]).size,
      `three different valid mixes must give three different headlines, got ${first} / ${second} / ${third}`,
    ).toBe(3);
  });

  test("an unbalanced mix falls back and says so", async ({ page }) => {
    await openPreview(page, MIXED_USE_PARCEL);
    const panel = mixPanel(page);

    await setMix(page, 60, 30, 10);
    const valid = await netProfit(page);
    await expect(page.getByText(/Driving the headline/i)).toBeVisible();

    // Force the shares off 100 — the mix must stop driving the headline
    // rather than publishing a number derived from a broken split.
    const firstShare = panel.locator("input").first();
    await firstShare.click();
    await firstShare.fill("1");
    await firstShare.blur();
    await page.waitForTimeout(800);

    await expect(page.getByText(/Not driving the headline/i)).toBeVisible();
    await expect(panel.getByRole("alert")).toContainText(/must sum to 100/i);

    // ...and the headline must actually have moved off the mixed-use figure,
    // not merely relabelled itself.
    expect(await netProfit(page), "fell back to the single-engine model").not.toBe(valid);
  });

  test("a single-use plot shows no mix panel and is unaffected", async ({ page }) => {
    await openPreview(page, SINGLE_USE_PARCEL);

    await expect(page.getByRole("button", { name: /Mix breakdown/i })).toHaveCount(0);
    await expect(page.getByText(/Driving the headline/i)).toHaveCount(0);
    expect(await netProfit(page)).toMatch(/AED/);
  });
});
