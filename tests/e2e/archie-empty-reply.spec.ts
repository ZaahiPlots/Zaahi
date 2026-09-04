// Founder backlog PART 5 — Archie must never answer with silence.
//
// Reported 2026-08-27: "long messages to Archie get a 200 from /api/archie but
// render no reply at all, so users think the message was lost."
//
// Two causes, one on each side:
//   server — `return NextResponse.json({ reply: choice.message.content ?? "" })`
//            gpt-5-nano is a reasoning model, so reasoning tokens are billed
//            against max_completion_tokens. A long prompt can spend the whole
//            budget thinking and come back finish_reason:"length" with empty
//            content. A real outcome; it just must not reach the user as nothing.
//   client — `const reply = data.reply || "…"` rendered a bare ellipsis, which
//            is indistinguishable from a message that never arrived.
//
// The server fix means an empty reply should no longer be sent. This exercises
// the CLIENT guard, by forcing the server response the old code produced — so
// the belt-and-braces half is proven rather than assumed.

import { test, expect } from "@playwright/test";
import { installHarness, gotoMap } from "./harness";

async function openChat(page: import("@playwright/test").Page) {
  await page
    .locator(".archibald-launcher, [aria-label*='Archie' i], [title*='Archie' i]")
    .first()
    .click();
  await page.waitForTimeout(600);
  await expect(page.locator(".archibald-window"), "chat window opened").toBeVisible();
}

async function send(page: import("@playwright/test").Page, text: string) {
  const input = page.locator(".archibald-input").first();
  await input.click();
  await input.fill(text);
  await input.press("Enter");
  await page.waitForTimeout(1500);
}

test.describe("Archie empty reply", () => {
  test("an empty reply renders a sentence, never a bare ellipsis", async ({ page }) => {
    await installHarness(page);

    // Reproduce exactly what the pre-fix server returned: HTTP 200, empty
    // reply string. installHarness already routes **/api/**, so this more
    // specific route is registered after it and wins for this one path.
    await page.route("**/api/archie", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ reply: "" }),
      }),
    );

    await gotoMap(page);
    await page.waitForTimeout(1500);
    await openChat(page);
    await send(page, "a long question that exhausts the reasoning budget");

    const win = page.locator(".archibald-window");
    const text = (await win.innerText()).trim();

    // The symptom: the assistant bubble was literally "…".
    expect(text, "no bare ellipsis bubble").not.toMatch(/(^|\n)\s*…\s*($|\n)/);

    // What must appear instead — a sentence that tells the user the message
    // was received and what to do next.
    expect(text, "a real sentence is rendered").toMatch(/didn't get an answer back|try sending it again/i);
  });

  test("a normal reply is untouched", async ({ page }) => {
    await installHarness(page);
    await page.route("**/api/archie", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ reply: "Plot 3261253 is in Business Bay." }),
      }),
    );

    await gotoMap(page);
    await page.waitForTimeout(1500);
    await openChat(page);
    await send(page, "where is plot 3261253");

    const text = await page.locator(".archibald-window").innerText();
    expect(text, "the model's answer is shown verbatim").toContain(
      "Plot 3261253 is in Business Bay.",
    );
    expect(text, "no fallback text when a real reply exists").not.toMatch(
      /didn't get an answer back/i,
    );
  });
});
