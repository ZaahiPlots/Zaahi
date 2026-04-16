// POST /api/me/favorites/:parcelId — save
// DELETE /api/me/favorites/:parcelId — unsave
// Both idempotent. POST is an upsert; DELETE is a soft no-op if row
// doesn't exist.

import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getApprovedUserId } from "@/lib/auth";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ parcelId: string }> };

export async function POST(req: NextRequest, { params }: Ctx) {
  const userId = await getApprovedUserId(req);
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { parcelId } = await params;
  if (!parcelId) return NextResponse.json({ error: "missing_parcel_id" }, { status: 400 });

  // Verify parcel exists so we don't accumulate zombies.
  const parcel = await prisma.parcel.findUnique({
    where: { id: parcelId },
    select: { id: true },
  });
  if (!parcel) return NextResponse.json({ error: "parcel_not_found" }, { status: 404 });

  try {
    const row = await prisma.savedParcel.create({
      data: { userId, parcelId },
      select: { id: true, createdAt: true },
    });
    return NextResponse.json({ saved: true, ...row });
  } catch (e: unknown) {
    const err = e as { code?: string };
    if (err?.code === "P2002") {
      // Already saved — idempotent success.
      return NextResponse.json({ saved: true, already: true });
    }
    throw e;
  }
}

export async function DELETE(req: NextRequest, { params }: Ctx) {
  const userId = await getApprovedUserId(req);
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { parcelId } = await params;
  if (!parcelId) return NextResponse.json({ error: "missing_parcel_id" }, { status: 400 });

  await prisma.savedParcel.deleteMany({
    where: { userId, parcelId },
  } as Prisma.SavedParcelDeleteManyArgs);

  return NextResponse.json({ saved: false });
}
