// Admin nav (2026-09-13): the map's Admin button deep-links to
// /admin/queue, so the /admin landing with the Users card was never
// reached. The admin layout now renders a Queue / Users nav on every
// /admin/* page.
//
//   signed-in admin (mocked) on /admin/queue → a "Users" link pointing to
//   /admin/users, Queue marked current; on /admin/users the roles swap.
//
// Session = shared stub (installSession); every /api call is fulfilled
// from fixtures — no database is touched.

import { expect, test, type Page } from "@playwright/test";
import { installSession } from "./harness";

async function stubAdmin(page: Page) {
  await installSession(page);
  await page.route("**/api/**", async (route, request) => {
    const path = new URL(request.url()).pathname;
    const json = (body: unknown, status = 200) =>
      route.fulfill({ status, contentType: "application/json", body: JSON.stringify(body) });
    if (path === "/api/admin/me") return json({ isAdmin: true, userId: "00000000-0000-4000-8000-000000000001" });
    if (path === "/api/me/access-status") return json({ status: "ACTIVE" });
    if (path === "/api/admin/registration/cap-counts") return json({ counts: {}, capPerRole: 10 });
    if (path === "/api/admin/users") return json({ items: [], nextCursor: null, total: 0, selfId: "00000000-0000-4000-8000-000000000001" });
    // Queue lists (registration / title-deeds / plot-claims) — empty pages.
    return json({ items: [], nextCursor: null, total: 0 });
  });
}

test.describe("admin nav", () => {
  test("/admin/queue shows a Users link to /admin/users, with Queue current", async ({ page }) => {
    await stubAdmin(page);
    await page.goto("/admin/queue");

    const nav = page.getByRole("navigation", { name: "Admin" });
    await expect(nav).toBeVisible();
    const users = nav.getByRole("link", { name: "Users" });
    await expect(users).toHaveAttribute("href", "/admin/users");
    await expect(nav.getByRole("link", { name: "Queue" })).toHaveAttribute("aria-current", "page");
    await expect(users).not.toHaveAttribute("aria-current", "page");

    await users.click();
    await expect(page).toHaveURL(/\/admin\/users$/);
    await expect(page.getByRole("heading", { name: "Users" })).toBeVisible();
    await expect(nav.getByRole("link", { name: "Users" })).toHaveAttribute("aria-current", "page");
    await expect(nav.getByRole("link", { name: "Queue" })).toHaveAttribute("href", "/admin/queue");
  });
});
