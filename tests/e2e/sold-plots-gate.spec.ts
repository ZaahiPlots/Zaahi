// Sold plots layer — server gate (spec docs/specs/sold-plots-layer.md §4, §8 step 2).
//
//   no Bearer token                 → 401 (middleware, runs before any handler)
//   approved FREE cohort user       → 403 on /api/sold-plots/*  (getAdminUserId → null)
//   founder fixture                 → 200 with the data
//   /api/me/access                  → { isAdmin } for FREE / founder
//
// No browser, no Supabase, no database. The real middleware and the real route
// handlers run in-process; the only stub is src/lib/auth (the module that talks to
// Supabase + Prisma), replaced through require.cache with a token → admin map:
// "Bearer founder" is a founder, "Bearer free" is an approved FREE user.

import { expect, test } from "@playwright/test";
import { NextRequest } from "next/server";

const authPath = require.resolve("../../src/lib/auth");
const FOUNDER_ID = "00000000-0000-0000-0000-00000000f001";
require.cache[authPath] = {
  id: authPath,
  filename: authPath,
  loaded: true,
  children: [],
  paths: [],
  exports: {
    getAdminUserId: async (req?: NextRequest) =>
      req?.headers.get("authorization") === "Bearer founder" ? FOUNDER_ID : null,
  },
} as unknown as NodeJS.Module;

/* eslint-disable @typescript-eslint/no-require-imports */
const { middleware } = require("../../src/middleware");
const pinsRoute = require("../../src/app/api/sold-plots/pins/route");
const cardRoute = require("../../src/app/api/sold-plots/[id]/route");
const accessRoute = require("../../src/app/api/me/access/route");

const req = (pathname: string, token?: string) =>
  new NextRequest(`http://localhost${pathname}`, { headers: token ? { authorization: `Bearer ${token}` } : {} });
const card = (r: NextRequest, id: string) => cardRoute.GET(r, { params: Promise.resolve({ id }) });

test.describe("sold plots gate", () => {
  test("no token → 401 from middleware on all three routes", async () => {
    for (const p of ["/api/sold-plots/pins", "/api/sold-plots/6762788", "/api/me/access"]) {
      const res = middleware(req(p));
      expect(res.status, p).toBe(401);
    }
    expect(middleware(req("/api/sold-plots/pins", "x")).status).toBe(200); // passes through to the handler
  });

  test("approved FREE fixture → 403, no body leak", async () => {
    const pins = await pinsRoute.GET(req("/api/sold-plots/pins", "free"));
    const one = await card(req("/api/sold-plots/6762788", "free"), "6762788");
    for (const res of [pins, one]) {
      expect(res.status).toBe(403);
      expect(res.headers.get("cache-control")).toContain("private");
      expect(await res.json()).toEqual({ error: "forbidden" });
    }
  });

  test("founder fixture → 200 pins (GeoJSON, no price) and card", async () => {
    const res = await pinsRoute.GET(req("/api/sold-plots/pins", "founder"));
    expect(res.status).toBe(200);
    expect(res.headers.get("cache-control")).toContain("private");
    const fc = await res.json();
    expect(fc.type).toBe("FeatureCollection");
    expect(fc.features.length).toBeGreaterThan(1000);
    const f = fc.features[0];
    expect(Object.keys(f.properties).sort()).toEqual(["approx", "id", "last", "n", "src"]);

    const id = f.properties.id;
    const c = await card(req(`/api/sold-plots/${id}`, "founder"), id);
    expect(c.status).toBe(200);
    const body = await c.json();
    expect(body.card.id).toBe(id);
    expect(body.card.sales.length).toBe(f.properties.n);
    expect(Number.isInteger(body.card.sales[0].p)).toBe(true);
  });

  test("card route validates ids and 404s unknown ones", async () => {
    expect((await card(req("/api/sold-plots/x", "founder"), "../etc/passwd")).status).toBe(400);
    expect((await card(req("/api/sold-plots/x", "founder"), "__proto__")).status).toBe(404);
    expect((await card(req("/api/sold-plots/x", "founder"), "0000000")).status).toBe(404);
  });

  test("/api/me/access reports isAdmin", async () => {
    expect(await (await accessRoute.GET(req("/api/me/access", "founder"))).json()).toEqual({ isAdmin: true });
    expect(await (await accessRoute.GET(req("/api/me/access", "free"))).json()).toEqual({ isAdmin: false });
  });
});
