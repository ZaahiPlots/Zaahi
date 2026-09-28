// Regression test: typing in a Min/Max pair of the filter panel must never
// modify either field. Before the fix, DualRange re-parsed and committed both
// fields on every keystroke and swapped them when min > max, so typing "1"
// (first digit of 100000) into Max after Min = 16500 turned Min into 1 and
// Max into 16,500.
//
// Run:  pnpm build && npx playwright test tests/e2e/filter-range.spec.ts

import { test, expect, type Page } from "@playwright/test";
import { installHarness, gotoMap } from "./harness";

const PAIRS = ["Plot area", "GFA", "FAR", "Price"];

async function openFilters(page: Page) {
  await installHarness(page);
  await gotoMap(page);
  await page.getByRole("button", { name: "Toggle filter panel" }).click();
  await expect(page.getByLabel("Minimum")).toHaveCount(PAIRS.length);
}

const digits = (s: string) => s.replace(/[,\s]/g, "");

test.describe("filter range min/max", () => {
  for (const [i, name] of PAIRS.entries()) {
    test(`${name}: typing into max never touches min`, async ({ page }) => {
      await openFilters(page);
      const min = page.getByLabel("Minimum").nth(i);
      const max = page.getByLabel("Maximum").nth(i);

      await min.click();
      await min.pressSequentially("16500");
      await max.click();
      await max.pressSequentially("1");
      // Let the panel's 250 ms commit debounce elapse.
      await page.waitForTimeout(600);
      expect(digits(await min.inputValue())).toBe("16500");
      expect(digits(await max.inputValue())).toBe("1");

      await max.pressSequentially("00000");
      await max.blur();
      await page.waitForTimeout(600);
      expect(digits(await min.inputValue())).toBe("16500");
      expect(digits(await max.inputValue())).toBe("100000");
      await expect(min).not.toHaveAttribute("aria-invalid", "true");
      await expect(max).not.toHaveAttribute("aria-invalid", "true");
    });
  }

  test("committed min > max is flagged, not swapped, and not applied", async ({
    page,
  }) => {
    await openFilters(page);
    const min = page.getByLabel("Minimum").first();
    const max = page.getByLabel("Maximum").first();

    await min.click();
    await min.pressSequentially("500");
    await max.click();
    await max.pressSequentially("100");
    await max.press("Enter");
    await page.waitForTimeout(600);

    expect(digits(await min.inputValue())).toBe("500");
    expect(digits(await max.inputValue())).toBe("100");
    await expect(min).toHaveAttribute("aria-invalid", "true");
    await expect(max).toHaveAttribute("aria-invalid", "true");
    await expect(page.getByText("Min is greater than max")).toBeVisible();
    // Invalid range is not applied: no active-filter badge on the toolbar button.
    await expect(
      page.getByRole("button", { name: "Toggle filter panel" }),
    ).toHaveAttribute("title", "Close filters");

    // Correcting it clears the error and applies the range.
    await max.fill("900");
    await max.press("Enter");
    await expect(min).not.toHaveAttribute("aria-invalid", "true");
    await expect(page.getByText("Min is greater than max")).toHaveCount(0);
  });
});
