import { test, expect, type Page, type Route } from "@playwright/test";
import { installHarness, gotoMap } from "./harness";

// PART 24 (#25) — one user message must produce one feedback submission.
//
// Reported 2026-08-27:
//
//   "A single message from me, sent once with no retry and no rate-limit
//    error, produced TWO separate POST calls to /api/archie/feedback, both
//    returning 200, from one conversational turn. The chat rendered one user
//    bubble and one assistant turn, so nothing in the UI indicated that the
//    report had been filed twice — the duplication is invisible from inside
//    the product and only shows up in devtools."
//
// The mechanism: the dispatch loop in ArchibaldChat re-queries /api/archie
// after each tool batch, so the model can emit submit_feedback again on a
// later iteration of the SAME turn. The server's only guard was an exact-text
// 24h dedup, and the model rarely rewords itself identically — a re-worded
// duplicate is still a duplicate.
//
// This drives the real client and scripts the server side to emit exactly that
// sequence: tool call, tool call again, then a text reply. Written to FAIL on
// the pre-fix tree, where it produces two POSTs.

interface Recorded {
  count: number;
  bodies: Array<Record<string, unknown>>;
}

function toolCall(id: string, text: string) {
  const args = JSON.stringify({ category: "BUG", text });
  return {
    tool_calls: [{ id, name: "submit_feedback", arguments: args }],
    assistant_message: {
      role: "assistant",
      content: null,
      tool_calls: [{ id, type: "function", function: { name: "submit_feedback", arguments: args } }],
    },
  };
}

/**
 * Scripts /api/archie to emit submit_feedback twice in one turn, then finish.
 * The two texts differ, exactly as a model rewording itself would — which is
 * what defeated the old text-based dedup.
 */
async function scriptDoubleSubmit(page: Page, rec: Recorded) {
  let turn = 0;
  await page.route("**/api/archie/feedback", async (route: Route) => {
    rec.count += 1;
    try {
      rec.bodies.push(JSON.parse(route.request().postData() ?? "{}"));
    } catch {
      rec.bodies.push({});
    }
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ ok: true, delivered: 1, category: "BUG", message: "Sent." }),
    });
  });
  await page.route("**/api/archie", async (route: Route) => {
    turn += 1;
    const body =
      turn === 1
        ? toolCall("call_1", "the map does not paint on first load")
        : turn === 2
          ? toolCall("call_2", "map fails to render when the page is opened cold")
          : { reply: "Sent that to the team." };
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(body),
    });
  });
}

async function openChatAndSend(page: Page, text: string) {
  await page
    .locator(".archibald-launcher, [aria-label*='Archie' i], [title*='Archie' i]")
    .first()
    .click();
  await page.waitForTimeout(600);
  await expect(page.locator(".archibald-window")).toBeVisible();
  const input = page.locator(".archibald-input").first();
  await input.click();
  await input.fill(text);
  await input.press("Enter");
  await page.waitForTimeout(2500);
}

test.describe("feedback idempotency (#25 / PART 24)", () => {
  test("two submit_feedback calls in one turn produce ONE POST", async ({ page }) => {
    const rec: Recorded = { count: 0, bodies: [] };
    await installHarness(page);
    await scriptDoubleSubmit(page, rec);
    await gotoMap(page);
    await page.waitForTimeout(1500);

    await openChatAndSend(page, "the map is broken, please tell the founders");

    expect(
      rec.count,
      `exactly one feedback POST per user message (got ${rec.count})`,
    ).toBe(1);
  });

  test("the POST carries an idempotency key the server can collapse on", async ({ page }) => {
    const rec: Recorded = { count: 0, bodies: [] };
    await installHarness(page);
    await scriptDoubleSubmit(page, rec);
    await gotoMap(page);
    await page.waitForTimeout(1500);

    await openChatAndSend(page, "please report this to the team");

    expect(rec.bodies.length, "one body recorded").toBeGreaterThan(0);
    const submissionId = rec.bodies[0]?.submissionId;
    expect(typeof submissionId, "submissionId is a string").toBe("string");
    expect(
      String(submissionId).length,
      "long enough for the server's min(8) schema",
    ).toBeGreaterThanOrEqual(8);
  });

  test("a second user message gets its own key — the cap is per turn, not per session", async ({ page }) => {
    const rec: Recorded = { count: 0, bodies: [] };
    await installHarness(page);

    // One tool call per turn this time: the point is that turn 2 is allowed.
    let seen = 0;
    await page.route("**/api/archie/feedback", async (route: Route) => {
      rec.count += 1;
      rec.bodies.push(JSON.parse(route.request().postData() ?? "{}"));
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ ok: true, delivered: 1, message: "Sent." }),
      });
    });
    await page.route("**/api/archie", async (route: Route) => {
      seen += 1;
      // Odd calls open a tool turn, even calls close it with a reply.
      const body =
        seen % 2 === 1
          ? toolCall(`call_${seen}`, `report number ${seen}`)
          : { reply: "Sent." };
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(body),
      });
    });

    await gotoMap(page);
    await page.waitForTimeout(1500);
    await openChatAndSend(page, "first report");

    const input = page.locator(".archibald-input").first();
    await input.click();
    await input.fill("second, unrelated report");
    await input.press("Enter");
    await page.waitForTimeout(2500);

    expect(rec.count, "each user message may file its own report").toBe(2);
    const ids = rec.bodies.map((b) => b.submissionId);
    expect(ids[0], "first turn has a key").toBeTruthy();
    expect(ids[1], "second turn has a key").toBeTruthy();
    expect(ids[0], "the two turns must NOT share a key").not.toBe(ids[1]);
  });
});
