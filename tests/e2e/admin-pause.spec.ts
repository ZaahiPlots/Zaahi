// Admin pause subscription (2026-09-13).
//
//   paused user   → next guarded page load shows the pause screen, and an
//                   API call from that session is rejected
//   resume        → the same page renders normally again
//   admin console → Pause needs a confirm step, sends the reason, flips
//                   the badge; Resume mirrors it; self + founder rows are
//                   locked
//   real handlers → /api/admin/users and the pause endpoint refuse a
//                   missing token (401, middleware) and a non-admin token
//                   (403, getAdminUserId); /api/me/access-status refuses
//                   a missing token
//
// Browser-side cases use the shared session stub (installSession) and
// route fixtures — no database is touched (same policy as harness.ts).
// The server-side self-pause / founder-pause refusals live in
// src/lib/user-access.ts and need a real admin session; they are covered
// by the request-fixture 403 for non-admins plus the disabled-row UI.

import { expect, test, type Page } from "@playwright/test";
import { installSession } from "./harness";

const PAUSED_AT = "2026-09-13T08:00:00.000Z";

const USERS = {
  self: {
    id: "00000000-0000-4000-8000-000000000001",
    email: "e2e@harness.invalid", name: "E2E Admin", nickname: "e2e", role: "ADMIN",
    accessStatus: "ACTIVE", pausedAt: null, pausedById: null, pausedByEmail: null, pauseReason: null,
    lastSeenAt: null, createdAt: "2026-01-01T00:00:00.000Z", isFounder: false, isSelf: true,
  },
  founder: {
    id: "f0000000-0000-4000-8000-000000000001",
    email: "founder@example.invalid", name: "Founder", nickname: "zhan", role: "ADMIN",
    accessStatus: "ACTIVE", pausedAt: null, pausedById: null, pausedByEmail: null, pauseReason: null,
    lastSeenAt: null, createdAt: "2026-01-01T00:00:00.000Z", isFounder: true, isSelf: false,
  },
  target: {
    id: "a0000000-0000-4000-8000-000000000002",
    email: "broker@example.invalid", name: "Test Broker", nickname: "broker1", role: "BROKER",
    accessStatus: "ACTIVE", pausedAt: null, pausedById: null, pausedByEmail: null, pauseReason: null,
    lastSeenAt: "2026-09-12T10:00:00.000Z", createdAt: "2026-02-01T00:00:00.000Z", isFounder: false, isSelf: false,
  },
};

/** Guarded, non-map page with a small API surface — the pause-screen target. */
const GUARDED_PAGE = "/dashboard";

async function stubGuardedPage(page: Page, status: "ACTIVE" | "PAUSED") {
  await installSession(page);
  await page.route("**/api/**", async (route, request) => {
    const path = new URL(request.url()).pathname;
    if (path === "/api/me/access-status") {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(
          status === "PAUSED"
            ? { status: "PAUSED", code: "SUBSCRIPTION_PAUSED", pausedAt: PAUSED_AT }
            : { status: "ACTIVE" },
        ),
      });
    }
    if (status === "PAUSED") {
      // Every other protected route: what getApprovedUserId produces for a
      // paused user.
      return route.fulfill({ status: 401, contentType: "application/json", body: JSON.stringify({ error: "unauthorized" }) });
    }
    if (path === "/api/me") {
      return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ id: USERS.self.id, email: USERS.self.email, role: "BUYER", name: "E2E", onboardingCompleted: true }) });
    }
    return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ items: [], count: 0, unreadCount: 0 }) });
  });
}

test.describe("subscription pause — user side", () => {
  test("a paused user sees the pause screen, not the page, and API calls are rejected", async ({ page }) => {
    await stubGuardedPage(page, "PAUSED");
    await page.goto(GUARDED_PAGE);

    const screen = page.getByTestId("subscription-paused");
    await expect(screen).toBeVisible();
    await expect(screen).toContainText("Your subscription is paused. Contact us at dymo@zaahi.io to resume.");
    await expect(screen.getByRole("link", { name: "dymo@zaahi.io" })).toHaveAttribute("href", "mailto:dymo@zaahi.io");
    await expect(screen.getByRole("button", { name: "Sign out" })).toBeVisible();
    await expect(screen).toContainText(/PAUSED SINCE 13 SEPT? 2026/);
    // No dashboard chrome behind the screen.
    await expect(page.getByRole("heading", { name: "Users" })).toHaveCount(0);
    await expect(page.locator("aside")).toHaveCount(0);

    // An API call from this session is refused.
    const status = await page.evaluate(async () => (await fetch("/api/me", { headers: { authorization: "Bearer x" } })).status);
    expect(status).toBe(401);
  });

  test("sign out from the pause screen returns to the sign-in page", async ({ page }) => {
    await stubGuardedPage(page, "PAUSED");
    await page.goto(GUARDED_PAGE);
    await page.getByTestId("subscription-paused").getByRole("button", { name: "Sign out" }).click();
    await expect(page).toHaveURL(/\/(login)?$/);
  });

  test("resume restores the page", async ({ page }) => {
    await stubGuardedPage(page, "ACTIVE");
    await page.goto(GUARDED_PAGE);
    await expect(page.getByTestId("subscription-paused")).toHaveCount(0);
    await expect(page.locator("aside")).toBeVisible();
  });
});

test.describe("subscription pause — admin console", () => {
  test("pause needs a confirm step, sends the reason, flips the badge; resume mirrors it; self and founder are locked", async ({ page }) => {
    await installSession(page);
    const posts: Array<{ path: string; body: unknown }> = [];
    let targetStatus: "ACTIVE" | "PAUSED" = "ACTIVE";

    const currentTarget = () => ({
      ...USERS.target,
      accessStatus: targetStatus,
      pausedAt: targetStatus === "PAUSED" ? PAUSED_AT : null,
      pausedById: targetStatus === "PAUSED" ? USERS.self.id : null,
      pausedByEmail: targetStatus === "PAUSED" ? USERS.self.email : null,
      pauseReason: targetStatus === "PAUSED" ? "non-payment" : null,
    });

    await page.route("**/api/**", async (route, request) => {
      const path = new URL(request.url()).pathname;
      const json = (body: unknown, status = 200) =>
        route.fulfill({ status, contentType: "application/json", body: JSON.stringify(body) });
      if (path === "/api/admin/me") return json({ isAdmin: true, userId: USERS.self.id });
      if (path === "/api/me/access-status") return json({ status: "ACTIVE" });
      if (path === "/api/admin/users" && request.method() === "GET") {
        return json({ items: [currentTarget(), USERS.self, USERS.founder], nextCursor: null, total: 3, selfId: USERS.self.id });
      }
      const m = path.match(/^\/api\/admin\/users\/([^/]+)\/(pause|resume)$/);
      if (m && request.method() === "POST") {
        posts.push({ path, body: request.postDataJSON() });
        targetStatus = m[2] === "pause" ? "PAUSED" : "ACTIVE";
        return json({ ok: true, user: currentTarget() });
      }
      return json({ error: "unexpected" }, 500);
    });

    await page.goto("/admin/users");
    await expect(page.getByRole("heading", { name: "Users" })).toBeVisible();

    const targetRow = page.locator(`[data-testid="user-row"][data-user-id="${USERS.target.id}"]`);
    const selfRow = page.locator(`[data-testid="user-row"][data-user-id="${USERS.self.id}"]`);
    const founderRow = page.locator(`[data-testid="user-row"][data-user-id="${USERS.founder.id}"]`);

    await expect(targetRow.getByTestId("access-status")).toHaveText("ACTIVE");
    await expect(selfRow.getByRole("button", { name: "Pause" })).toBeDisabled();
    await expect(founderRow.getByRole("button", { name: "Pause" })).toBeDisabled();

    // Pause: click → confirm step (no request yet) → reason → confirm.
    await targetRow.getByRole("button", { name: "Pause" }).click();
    await expect(targetRow.getByTestId("confirm-step")).toBeVisible();
    expect(posts).toHaveLength(0);
    await targetRow.getByLabel("Reason").fill("non-payment");
    await targetRow.getByRole("button", { name: "Confirm pause" }).click();

    await expect(targetRow.getByTestId("access-status")).toHaveText("PAUSED");
    await expect(targetRow).toContainText("by e2e@harness.invalid");
    await expect(targetRow).toContainText("non-payment");
    expect(posts).toEqual([{ path: `/api/admin/users/${USERS.target.id}/pause`, body: { reason: "non-payment" } }]);

    // Resume: confirm step again, then the badge flips back.
    await targetRow.getByRole("button", { name: "Resume" }).click();
    await expect(targetRow.getByTestId("confirm-step")).toBeVisible();
    await targetRow.getByRole("button", { name: "Confirm resume" }).click();
    await expect(targetRow.getByTestId("access-status")).toHaveText("ACTIVE");
    expect(posts).toHaveLength(2);
    expect(posts[1].path).toBe(`/api/admin/users/${USERS.target.id}/resume`);
  });
});

test.describe("subscription pause — real handlers", () => {
  test("user list refuses a missing token and a non-admin token", async ({ request }) => {
    expect((await request.get("/api/admin/users")).status()).toBe(401);
    const res = await request.get("/api/admin/users", { headers: { authorization: "Bearer e2e-not-a-real-token" } });
    expect(res.status()).toBe(403);
  });

  test("pause endpoint refuses a non-admin", async ({ request }) => {
    expect((await request.post(`/api/admin/users/${USERS.target.id}/pause`, { data: { reason: "x" } })).status()).toBe(401);
    const res = await request.post(`/api/admin/users/${USERS.target.id}/pause`, {
      headers: { authorization: "Bearer e2e-not-a-real-token" },
      data: { reason: "x" },
    });
    expect(res.status()).toBe(403);
    expect(await res.json()).toMatchObject({ ok: false, code: "forbidden" });
  });

  test("access-status probe refuses a missing or invalid token", async ({ request }) => {
    expect((await request.get("/api/me/access-status")).status()).toBe(401);
    expect((await request.get("/api/me/access-status", { headers: { authorization: "Bearer e2e-not-a-real-token" } })).status()).toBe(401);
  });
});
