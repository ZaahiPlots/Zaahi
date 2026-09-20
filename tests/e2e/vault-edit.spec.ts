// /vault inline edit: stage, follow-up date, broker notes persist across reload.
//
// Same policy as admin-pause.spec.ts: shared session stub + in-browser API
// fixtures, no database. The fixture is a tiny in-memory store that honours
// PATCH, so "reload" proves the UI re-reads what it saved (GET list + GET [id]).
// Entry creation goes through the store seed, not the add-entry wizard.

import { expect, test } from "@playwright/test";
import { installSession } from "./harness";

const ID = "b0000000-0000-4000-8000-0000000000aa";

test("vault: stage, follow-up and broker notes persist after reload", async ({ page }) => {
  await installSession(page);

  const store: Record<string, unknown> = {
    id: ID, plotNumber: "6854566", emirate: "DUBAI", district: "Jumeirah",
    stage: "LEAD", askingPriceFils: null, source: null, nextFollowUpAt: null,
    shareCount: 0, conflictsWithOthers: false, addedByUserId: null, addedByNickname: null,
    createdAt: "2026-09-01T00:00:00.000Z", updatedAt: "2026-09-01T00:00:00.000Z",
    brokerNotes: null, ownerContact: null,
  };
  const json = (body: unknown, status = 200) => ({ status, contentType: "application/json", body: JSON.stringify(body) });

  await page.route("**/api/**", async (route, request) => {
    const path = new URL(request.url()).pathname;
    if (path === "/api/me/access-status") return route.fulfill(json({ status: "ACTIVE" }));
    if (path === "/api/me") return route.fulfill(json({ id: "00000000-0000-4000-8000-000000000001", email: "e2e@harness.invalid", role: "BROKER", name: "E2E", onboardingCompleted: true }));
    if (path === "/api/me/vault/entries") return route.fulfill(json({ items: [store], nextCursor: null }));
    if (path === `/api/me/vault/entries/${ID}`) {
      if (request.method() === "PATCH") {
        Object.assign(store, request.postDataJSON());
        return route.fulfill(json(store));
      }
      return route.fulfill(json({ ...store, priceHistory: [], shares: [], activity: [], affectionPlan: null }));
    }
    if (path.startsWith(`/api/me/vault/entries/${ID}/`)) return route.fulfill(json({ items: [], history: [] }));
    return route.fulfill(json({ items: [], count: 0, unreadCount: 0 }));
  });

  await page.goto("/vault");
  const row = page.getByText("6854566");
  await expect(row).toBeVisible();

  await page.getByTestId("stage-select").selectOption("NEGOTIATING");
  await page.getByTestId("followup-display").click();
  await page.getByTestId("followup-input").fill("2026-10-15");
  await page.getByRole("button", { name: "Show details" }).click();
  await page.getByTestId("broker-notes").fill("Owner wants 12M, flexible on terms");
  await page.getByTestId("broker-notes-save").click();
  await expect(page.getByText("Saved", { exact: true })).toBeVisible();

  await page.reload();
  await expect(page.getByTestId("stage-select")).toHaveValue("NEGOTIATING");
  await expect(page.getByTestId("followup-display")).not.toHaveText("—");
  await page.getByRole("button", { name: "Show details" }).click();
  await expect(page.getByTestId("broker-notes")).toHaveValue("Owner wants 12M, flexible on terms");
});
