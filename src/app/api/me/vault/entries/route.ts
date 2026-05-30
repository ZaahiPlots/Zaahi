// ZAAHI Vault — list + create.
//
// GET  /api/me/vault/entries  ?stage&search&conflict&cursor&limit
// POST /api/me/vault/entries  body: VaultEntryCreate
//
// Spec: docs/specs/phase-2/private-plot-vault/spec.md §5.1.
// Auth: getApprovedUserId. Caller's own entries only.

import { NextRequest, NextResponse } from "next/server";
import { Prisma, VaultStage, ParcelStatus } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getApprovedUserId } from "@/lib/auth";
import { recordVaultEvent } from "@/lib/vault-activity";
import { recomputeConflictsForPlot } from "@/lib/vault-conflict";
import { fetchFullDdaData } from "@/lib/dda-plot-lookup";
import {
  writeAffectionPlan,
  maybeAppendAffectionPlan,
} from "@/lib/vault-affection-plan";
import type { AffectionPlan } from "@/lib/dda";

export const runtime = "nodejs";

const EMIRATES = [
  "DUBAI",
  "ABU_DHABI",
  "SHARJAH",
  "AJMAN",
  "UAQ",
  "RAK",
  "FUJAIRAH",
] as const;

const OwnerContactSchema = z
  .object({
    name: z.string().trim().max(120).optional(),
    phone: z.string().trim().regex(/^\+?[0-9\s-]{7,20}$/).optional(),
    email: z.string().email().optional(),
    role: z.string().trim().max(40).optional(),
    notes: z.string().max(2000).optional(),
  })
  .strict();

const VaultEntryCreateSchema = z.object({
  emirate: z.enum(EMIRATES),
  district: z.string().trim().min(1).max(120),
  plotNumber: z.string().trim().regex(/^\d{5,10}$/, "plotNumber must be 5-10 digits"),
  area: z.number().positive().max(1e9).optional(),
  latitude: z.number().min(22).max(27).optional(),
  longitude: z.number().min(51).max(57).optional(),
  geometry: z.unknown().optional(), // GeoJSON Polygon — server-side stored as-is; only set for DDA hits in MVP
  ddaSnapshot: z.unknown().optional(), // raw DDA BASIC_LAND_BASE feature when sourced via live lookup
  // Phase 2 of vault refactor (founder spec 2026-05-30): wizard passes
  // through the affection plan + building limit it received from
  // /api/me/vault/plot-lookup so the server can persist a real
  // AffectionPlan row without a second DDA round-trip. Server falls
  // back to fetchFullDdaData when these are absent but ddaSnapshot is
  // present.
  plan: z.unknown().optional(),
  buildingLimit: z.unknown().optional(),
  landUse: z.string().trim().max(64).optional(),
  askingPriceFils: z
    .string()
    .regex(/^\d{1,16}$/, "askingPriceFils must be a non-negative integer string")
    .optional(),
  ownerContact: OwnerContactSchema.optional(),
  brokerNotes: z.string().max(8000).optional(),
  stage: z.nativeEnum(VaultStage).default("LEAD"),
  source: z.string().trim().max(40).optional(),
  nextFollowUpAt: z.string().datetime().optional(),
});

interface VaultEntrySummary {
  id: string;
  plotNumber: string;
  emirate: string;
  district: string;
  stage: VaultStage;
  askingPriceFils: string | null;
  source: string | null;
  nextFollowUpAt: string | null;
  shareCount: number;
  conflictsWithOthers: boolean;
  addedByUserId: string | null;
  addedByNickname: string | null;
  createdAt: string;
  updatedAt: string;
}

/** GET /api/me/vault/entries — list caller's entries with filters + cursor pagination. */
export async function GET(req: NextRequest) {
  const userId = await getApprovedUserId(req);
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const stagesRaw = url.searchParams.getAll("stage");
  const search = url.searchParams.get("search")?.trim() || null;
  const conflictParam = url.searchParams.get("conflict");
  const cursor = url.searchParams.get("cursor") || null;
  const limitRaw = Number(url.searchParams.get("limit") ?? "50");
  const limit = Math.max(1, Math.min(100, Number.isFinite(limitRaw) ? limitRaw : 50));

  // Validate stage filter values
  const stages: VaultStage[] = [];
  for (const s of stagesRaw) {
    if (Object.values(VaultStage).includes(s as VaultStage)) {
      stages.push(s as VaultStage);
    }
  }

  const where: Prisma.VaultEntryWhereInput = { ownerId: userId };
  if (stages.length > 0) where.stage = { in: stages };
  if (conflictParam === "true") where.conflictsWithOthers = true;
  if (conflictParam === "false") where.conflictsWithOthers = false;
  if (search) {
    where.OR = [
      { plotNumber: { contains: search, mode: "insensitive" } },
      { district: { contains: search, mode: "insensitive" } },
    ];
  }

  // Fetch limit+1 to detect "more" cleanly without a second count query.
  const rowsRaw = await prisma.vaultEntry.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: limit + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    select: {
      id: true,
      plotNumber: true,
      emirate: true,
      district: true,
      stage: true,
      askingPriceFils: true,
      source: true,
      nextFollowUpAt: true,
      conflictsWithOthers: true,
      addedByUserId: true,
      addedBy: { select: { nickname: true } },
      createdAt: true,
      updatedAt: true,
      _count: { select: { shares: { where: { revokedAt: null } } } },
    },
  });

  const hasMore = rowsRaw.length > limit;
  const rows = hasMore ? rowsRaw.slice(0, limit) : rowsRaw;
  const nextCursor = hasMore ? rows[rows.length - 1].id : null;

  const items: VaultEntrySummary[] = rows.map((r) => ({
    id: r.id,
    plotNumber: r.plotNumber,
    emirate: r.emirate,
    district: r.district,
    stage: r.stage,
    askingPriceFils: r.askingPriceFils?.toString() ?? null,
    source: r.source,
    nextFollowUpAt: r.nextFollowUpAt?.toISOString() ?? null,
    shareCount: r._count.shares,
    conflictsWithOthers: r.conflictsWithOthers,
    addedByUserId: r.addedByUserId,
    addedByNickname: r.addedBy?.nickname ?? null,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
  }));

  // Total count — separate query but cheap with the (ownerId) index.
  // Skip when filtered (caller doesn't care about filtered total in MVP).
  const total =
    stages.length === 0 && !search && conflictParam === null
      ? await prisma.vaultEntry.count({ where: { ownerId: userId } })
      : items.length + (hasMore ? 1 : 0); // approximation when filtered

  return NextResponse.json({ items, nextCursor, total });
}

/** POST /api/me/vault/entries — create a new vault entry. */
export async function POST(req: NextRequest) {
  const userId = await getApprovedUserId(req);
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const raw = await req.json().catch(() => null);
  const parsed = VaultEntryCreateSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "validation_failed", issues: parsed.error.issues.slice(0, 10) },
      { status: 400 },
    );
  }
  const body = parsed.data;

  // Build the row. addedByUserId = self for direct uploads.
  const askingPriceFils = body.askingPriceFils ? BigInt(body.askingPriceFils) : null;

  // Phase 2 of vault refactor: persist a Parcel(VAULT_PRIVATE) +
  // AffectionPlan when the entry is DDA-sourced (ddaSnapshot present)
  // so vault rendering can flow through the same listing data path in
  // Phase 3. Best-effort — failures fall through to the legacy
  // denormalised VaultEntry-only flow.
  let publicParcelId: string | null = null;
  if (body.ddaSnapshot != null && body.emirate === "DUBAI") {
    try {
      publicParcelId = await ensureVaultPrivateParcel({
        ownerId: userId,
        plotNumber: body.plotNumber,
        district: body.district,
        area: body.area ?? null,
        latitude: body.latitude ?? null,
        longitude: body.longitude ?? null,
        geometry: (body.geometry as GeoJSON.Polygon | null | undefined) ?? null,
        clientPlan: (body.plan as AffectionPlan | null | undefined) ?? null,
        clientBuildingLimit: (body.buildingLimit as GeoJSON.Polygon | null | undefined) ?? null,
      });
    } catch (e) {
      console.error("[vault POST] Parcel/AffectionPlan upsert failed:", e);
      // continue without publicParcelId — VaultEntry create still proceeds
    }
  }

  let created;
  try {
    created = await prisma.vaultEntry.create({
      data: {
        ownerId: userId,
        addedByUserId: userId,
        emirate: body.emirate,
        district: body.district,
        plotNumber: body.plotNumber,
        area: body.area ?? null,
        latitude: body.latitude ?? null,
        longitude: body.longitude ?? null,
        geometry: (body.geometry as Prisma.InputJsonValue | undefined) ?? Prisma.DbNull,
        ddaSnapshot: (body.ddaSnapshot as Prisma.InputJsonValue | undefined) ?? Prisma.DbNull,
        landUse: body.landUse ?? null,
        publicParcelId,
        askingPriceFils,
        ownerContact: body.ownerContact
          ? (body.ownerContact as Prisma.InputJsonValue)
          : Prisma.DbNull,
        brokerNotes: body.brokerNotes ?? null,
        stage: body.stage,
        source: body.source ?? null,
        nextFollowUpAt: body.nextFollowUpAt ? new Date(body.nextFollowUpAt) : null,
      },
      select: {
        id: true,
        plotNumber: true,
        emirate: true,
        district: true,
        stage: true,
        askingPriceFils: true,
        source: true,
        nextFollowUpAt: true,
        conflictsWithOthers: true,
        addedByUserId: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  } catch (err) {
    // P2002 = unique constraint violation. The user already has an entry
    // for this plot — return the existing id so the client can navigate.
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2002"
    ) {
      const existing = await prisma.vaultEntry.findUnique({
        where: {
          ownerId_emirate_district_plotNumber: {
            ownerId: userId,
            emirate: body.emirate,
            district: body.district,
            plotNumber: body.plotNumber,
          },
        },
        select: { id: true },
      });
      return NextResponse.json(
        { error: "duplicate", existingId: existing?.id ?? null },
        { status: 409 },
      );
    }
    // P2003 — FK violation. Most commonly: public.User row missing for an
    // approved Supabase auth user (legacy account that bypassed
    // /api/users/sync). Should be auto-handled by getApprovedUserId's
    // upsert as of feat/vault-mvp-hotfix; keep this branch as a
    // diagnosable surface in case the upsert itself failed.
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2003"
    ) {
      console.error("[vault] FK violation on create:", err.meta);
      return NextResponse.json(
        {
          error: "user_not_synced",
          hint: "Your account profile didn't sync. Sign out and sign in again.",
        },
        { status: 500 },
      );
    }
    console.error("[vault] create failed:", err);
    return NextResponse.json({ error: "db_failure" }, { status: 500 });
  }

  // Write initial price-history row when an asking price is provided on
  // create — so the price-history timeline isn't empty in the UI.
  if (askingPriceFils !== null) {
    await prisma.vaultPriceHistory.create({
      data: {
        vaultEntryId: created.id,
        priceFils: askingPriceFils,
        setByUserId: userId,
        source: "manual",
        note: "Initial asking price",
      },
    });
  }

  // Activity + ActivityLog shadow row (fire-and-forget).
  recordVaultEvent({
    vaultEntryId: created.id,
    actorUserId: userId,
    kind: "CREATED",
    payload: {
      stage: created.stage,
      hasOwnerContact: !!body.ownerContact,
      hasGeometry: !!body.geometry,
    },
  });

  // Conflict recompute — fire-and-forget. Another user may already have
  // this plot in their vault with different data; the banner needs to
  // surface on both sides after this create.
  void recomputeConflictsForPlot(body.emirate, body.district, body.plotNumber);

  const summary: VaultEntrySummary = {
    id: created.id,
    plotNumber: created.plotNumber,
    emirate: created.emirate,
    district: created.district,
    stage: created.stage,
    askingPriceFils: created.askingPriceFils?.toString() ?? null,
    source: created.source,
    nextFollowUpAt: created.nextFollowUpAt?.toISOString() ?? null,
    shareCount: 0,
    conflictsWithOthers: created.conflictsWithOthers,
    addedByUserId: created.addedByUserId,
    addedByNickname: null, // fresh row — no need to round-trip to fetch own nickname
    createdAt: created.createdAt.toISOString(),
    updatedAt: created.updatedAt.toISOString(),
  };

  return NextResponse.json(summary, { status: 201 });
}

/**
 * Phase 2 of vault refactor — ensure a Parcel(VAULT_PRIVATE) +
 * AffectionPlan row exists for the plot so the vault entry can link
 * to it via VaultEntry.publicParcelId. Returns the parcel id, or null
 * when the plot has no usable geometry / DDA data.
 *
 * Reuses an existing Parcel row when one already exists for
 * (Dubai, plotNumber) — that may be a public listing, another user's
 * VAULT_PRIVATE entry, or a system-seeded curated parcel. Same-row
 * sharing is intentional: AffectionPlan + geometry are
 * cross-user-shareable; per-user broker data lives on VaultEntry
 * regardless. LOCK-8 invariant (Parcel.ownerId immutable) is
 * preserved — we never rewrite the owner of an existing row.
 *
 * Best-effort: PlotInfo / BuildingLimit failures don't block create,
 * the AffectionPlan row simply omits the missing fields.
 */
async function ensureVaultPrivateParcel(args: {
  ownerId: string;
  plotNumber: string;
  district: string;
  area: number | null;
  latitude: number | null;
  longitude: number | null;
  geometry: GeoJSON.Polygon | null;
  clientPlan: AffectionPlan | null;
  clientBuildingLimit: GeoJSON.Polygon | null;
}): Promise<string | null> {
  // 1) Existing Parcel for this plot — reuse, do not mutate.
  //    Phase 3.5 (2026-05-30): when the parcel pre-exists (curated
  //    listing, prior vault user, earlier seed) we used to short-
  //    circuit here without writing AffectionPlan. That meant a fresh
  //    add with full DDA plan + building-limit data couldn't repair
  //    an incomplete prior plan — the 3D building ended up flat.
  //    Now we delegate to maybeAppendAffectionPlan, which is a no-op
  //    when the latest plan already has the fields we'd bring (so
  //    safe for repeated re-adds of curated listings).
  //    LOCK-8 holds — we never touch Parcel.ownerId.
  const existing = await prisma.parcel.findFirst({
    where: { emirate: "Dubai", plotNumber: args.plotNumber },
    select: { id: true },
  });
  if (existing) {
    await maybeAppendAffectionPlan(existing.id, {
      plotNumber: args.plotNumber,
      clientPlan: args.clientPlan,
      clientBuildingLimit: args.clientBuildingLimit,
    });
    return existing.id;
  }

  // 2) Geometry is required to create a Parcel — bail if absent.
  if (!args.geometry) return null;

  // 3) Plan: prefer the client-passed one (from plot-lookup), else
  //    re-fetch from DDA. Either may stay null and we'll still create
  //    Parcel without an AffectionPlan row.
  let plan = args.clientPlan;
  let buildingLimit = args.clientBuildingLimit;
  if (!plan) {
    const live = await fetchFullDdaData(args.plotNumber);
    if (live) {
      plan = live.plan;
      buildingLimit = buildingLimit ?? live.buildingLimit;
    }
  }

  // 4) Centroid for lat/lng fallback.
  const ring = args.geometry.coordinates[0];
  const ringCount = Array.isArray(ring) ? ring.length : 0;
  let cLng = args.longitude;
  let cLat = args.latitude;
  if ((cLng == null || cLat == null) && ringCount > 0) {
    let sumLng = 0, sumLat = 0;
    for (const p of ring) {
      if (Array.isArray(p) && p.length >= 2) {
        sumLng += p[0];
        sumLat += p[1];
      }
    }
    cLng = cLng ?? sumLng / ringCount;
    cLat = cLat ?? sumLat / ringCount;
  }

  // 5) Create Parcel(VAULT_PRIVATE). Race-safe via P2002 catch: if a
  //    concurrent vault-add lost the race, return the now-existing
  //    parcel id.
  let parcelId: string;
  try {
    const parcel = await prisma.parcel.create({
      data: {
        plotNumber: args.plotNumber,
        ownerId: args.ownerId,
        area: args.area ?? plan?.plotAreaSqft ?? 0,
        emirate: "Dubai",
        district: args.district,
        latitude: cLat,
        longitude: cLng,
        geometry: args.geometry as unknown as Prisma.InputJsonValue,
        status: ParcelStatus.VAULT_PRIVATE,
      },
      select: { id: true },
    });
    parcelId = parcel.id;
  } catch (err) {
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2002"
    ) {
      const racer = await prisma.parcel.findFirst({
        where: { emirate: "Dubai", plotNumber: args.plotNumber },
        select: { id: true },
      });
      if (racer) return racer.id;
    }
    throw err;
  }

  // 6) AffectionPlan when we have plan data. Skip silently otherwise —
  //    the Parcel still renders a flat block, identical to vault's
  //    pre-Phase-2 fallback.
  if (plan) {
    await writeAffectionPlan(parcelId, args.plotNumber, plan, buildingLimit);
  }

  return parcelId;
}
