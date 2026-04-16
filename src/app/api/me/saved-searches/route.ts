// GET  /api/me/saved-searches — list user's saved searches
// POST /api/me/saved-searches — create new one (max 10 per user)
//
// filters JSON is an open map — we validate top-level shape (each known
// key matches its expected type) but don't require every key. Unknown
// keys are dropped.

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getApprovedUserId } from "@/lib/auth";

export const runtime = "nodejs";

const MAX_PER_USER = 10;

// Filter shape — keep permissive, extend as new filter types land.
const FiltersSchema = z.object({
  emirate: z.string().trim().max(60).optional(),
  district: z.string().trim().max(120).optional(),
  landUse: z.string().trim().max(60).optional(),
  minPriceAed: z.number().int().nonnegative().optional(),
  maxPriceAed: z.number().int().nonnegative().optional(),
  minArea: z.number().nonnegative().optional(),
  maxArea: z.number().nonnegative().optional(),
  status: z.enum(["LISTED", "IN_DEAL", "SOLD"]).optional(),
}).strict();

const BoundsSchema = z.object({
  minLng: z.number(), minLat: z.number(),
  maxLng: z.number(), maxLat: z.number(),
}).strict();

const CreateSchema = z.object({
  name: z.string().trim().min(1).max(80),
  filters: FiltersSchema,
  locationBounds: BoundsSchema.nullable().optional(),
}).strict();

export async function GET(req: NextRequest) {
  const userId = await getApprovedUserId(req);
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const rows = await prisma.savedSearch.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ items: rows, count: rows.length });
}

export async function POST(req: NextRequest) {
  const userId = await getApprovedUserId(req);
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }
  const parsed = CreateSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "validation_failed", issues: parsed.error.issues.slice(0, 5) },
      { status: 400 },
    );
  }

  const existingCount = await prisma.savedSearch.count({ where: { userId } });
  if (existingCount >= MAX_PER_USER) {
    return NextResponse.json(
      { error: "limit_reached", max: MAX_PER_USER },
      { status: 409 },
    );
  }

  const created = await prisma.savedSearch.create({
    data: {
      userId,
      name: parsed.data.name,
      filters: parsed.data.filters,
      locationBounds: parsed.data.locationBounds ?? undefined,
    },
  });
  return NextResponse.json(created, { status: 201 });
}
