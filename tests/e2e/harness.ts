// ZAAHI E2E harness — renders /parcels/map with no production credentials and
// no database access.
//
// TWO stubs, both entirely inside the browser context:
//
// 1. SESSION. AuthGuard (src/components/AuthGuard.tsx) gates the page on
//    supabaseBrowser.auth.getSession(), and supabase-js reads that session
//    from localStorage under `sb-<projectRef>-auth-token`. Rather than hard-code
//    a project ref (which would leak the real one into the repo and break if it
//    changes), we patch Storage.prototype.getItem so ANY key matching
//    /^sb-.+-auth-token$/ returns a synthetic approved session. Nothing is
//    written to real storage and no request ever reaches Supabase auth.
//
// 2. NETWORK. Every /api/** request is intercepted. Known endpoints get
//    fixtures; anything unexpected is failed loudly and recorded, so a route we
//    forgot shows up as a test failure instead of silently reaching production.
//    Because Playwright fulfils in the browser, the Next route handlers never
//    run and Prisma is never constructed.
//
// The synthetic JWT is a structurally valid unsigned token with an obviously
// fake payload. It is only ever read by client code in this harness; it is
// never presented to real auth (every /api call is intercepted before leaving
// the browser).

import type { Page, Route, Request } from "@playwright/test";
import { PARCELS, EMPTY_FC, MAP_CENTER, MAP_ZOOM } from "./fixtures";

const FAR_FUTURE = Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 365;

function b64url(o: unknown): string {
  return Buffer.from(JSON.stringify(o))
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

const FAKE_JWT = [
  b64url({ alg: "HS256", typ: "JWT" }),
  b64url({
    sub: "00000000-0000-4000-8000-000000000001",
    email: "e2e@harness.invalid",
    role: "authenticated",
    exp: FAR_FUTURE,
  }),
  "e2e-harness-not-a-real-signature",
].join(".");

const FAKE_SESSION = {
  access_token: FAKE_JWT,
  token_type: "bearer",
  expires_in: 60 * 60 * 24 * 365,
  expires_at: FAR_FUTURE,
  refresh_token: "e2e-harness-refresh",
  user: {
    id: "00000000-0000-4000-8000-000000000001",
    aud: "authenticated",
    role: "authenticated",
    email: "e2e@harness.invalid",
    app_metadata: { provider: "email" },
    // The only field AuthGuard actually gates on.
    user_metadata: { approved: true, nickname: "e2e" },
    created_at: "2026-01-01T00:00:00.000Z",
  },
};

export interface ApiLog {
  /** Every intercepted /api/** URL, in order, for request-count assertions. */
  calls: string[];
  /** Endpoints we had no fixture for — non-empty means the harness has a hole. */
  unexpected: string[];
}

/**
 * Installs both stubs. Call before page.goto().
 * Returns the live request log used by the (d) assertions.
 */
export async function installHarness(
  page: Page,
  opts: { layers?: Record<string, boolean> } = {},
): Promise<ApiLog> {
  const log: ApiLog = { calls: [], unexpected: [] };

  // ── 1. Session + pinned camera, before any app script runs ──────────────
  await page.addInitScript(
    ({ session, center, zoom, layers }) => {
      const raw = JSON.stringify(session);
      const realGet = Storage.prototype.getItem;
      const realSet = Storage.prototype.setItem;
      Storage.prototype.getItem = function (key: string) {
        if (/^sb-.+-auth-token$/.test(key)) return raw;
        return realGet.call(this, key);
      };
      Storage.prototype.setItem = function (key: string, value: string) {
        // Never let the app clobber the synthetic session.
        if (/^sb-.+-auth-token$/.test(key)) return;
        return realSet.call(this, key, value);
      };
      // Pin the camera so canvas-centre clicks land on a known fixture plot.
      realSet.call(
        window.localStorage,
        "zaahi-map-view",
        JSON.stringify({ center, zoom, bearing: 0, pitch: 0 }),
      );
      // Keep first-run modals out of the way of the checks. TermsAcceptModal
      // stores the literal string "true" (src/app/parcels/map/TermsAcceptModal.tsx),
      // not "1" — a truthy-looking "1" leaves the modal up and it then
      // intercepts every pointer event on the page.
      realSet.call(window.localStorage, "zaahi-terms-accepted", "true");
      realSet.call(window.localStorage, "zaahi-autorotate", "0");
      // Overlays are lazy and default-OFF (CLAUDE.md), so a default cold load
      // fetches none of them. Seeding the saved layer state lets a test turn
      // one ON and assert it is fetched exactly once.
      if (layers) {
        realSet.call(window.localStorage, "zaahi-map-layers", JSON.stringify(layers));
      }
    },
    { session: FAKE_SESSION, center: MAP_CENTER, zoom: MAP_ZOOM, layers: opts.layers ?? null },
  );

  // ── 2. Network ──────────────────────────────────────────────────────────
  const json = (route: Route, body: unknown, status = 200) =>
    route.fulfill({
      status,
      contentType: "application/json",
      body: JSON.stringify(body),
    });

  await page.route("**/api/**", async (route: Route, request: Request) => {
    const path = new URL(request.url()).pathname;
    log.calls.push(path);

    // Read-only harness: refuse anything that could mutate, loudly.
    if (request.method() !== "GET") {
      log.unexpected.push(`${request.method()} ${path}`);
      return route.abort("blockedbyclient");
    }

    if (path === "/api/parcels/map") return json(route, { items: PARCELS });
    if (path === "/api/buildings") return json(route, { items: [] });
    if (path === "/api/vault/shared-with-me/map") return json(route, { items: [] });
    if (path === "/api/vault/shared-with-me") return json(route, { items: [] });
    if (path.startsWith("/api/archie/")) return json(route, { ok: true, districts: [] });
    if (path === "/api/me") return json(route, { id: "e2e", nickname: "e2e" });
    if (path === "/api/admin/me") return json(route, { error: "forbidden" }, 403);
    if (path.startsWith("/api/layers/")) return json(route, EMPTY_FC);
    if (path.startsWith("/api/parcels/")) {
      // Parcel detail for the drawer.
      const id = path.split("/")[3];
      const p = PARCELS.find((x) => x.id === id);
      if (!p) return json(route, { error: "not found" }, 404);
      return json(route, { ...p, latitude: MAP_CENTER[1], longitude: MAP_CENTER[0], affectionPlans: p.plan ? [p.plan] : [] });
    }
    if (path.startsWith("/api/vault/entries/")) {
      return json(route, {
        id: "ve-1",
        parcel: PARCELS.find((p) => p.id === "p-vault-1"),
        askingPriceFils: "4100000000",
      });
    }

    log.unexpected.push(`GET ${path}`);
    return route.abort("blockedbyclient");
  });

  // Tiles and GLB assets are static files; let them through but keep the map
  // fast by short-circuiting the heavy PMTiles reads.
  await page.route("**/tiles/**", (route) => route.abort("blockedbyclient"));
  await page.route("**/glb/**", (route) => route.abort("blockedbyclient"));

  return log;
}

/** Waits for AuthGuard to release and the map chrome to mount. */
export async function gotoMap(page: Page): Promise<void> {
  await page.goto("/parcels/map", { waitUntil: "domcontentloaded" });
  // AuthGuard renders a full-screen "ZAAHI" splash until the session resolves.
  await page.locator("canvas.maplibregl-canvas").waitFor({ timeout: 30_000 });
}
