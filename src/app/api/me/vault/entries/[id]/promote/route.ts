// ZAAHI Vault — Promote a vault entry into a public Parcel listing.
//
// POST /api/me/vault/entries/[id]/promote  body: PromoteBody
// → 200 { vaultEntryId, parcelId, parcelStatus, claimStatus }
// → 409 already_promoted
// → 400 validation_failed
// → 404 entry not found / not owned
//
// Spec: docs/specs/phase-2/private-plot-vault/spec.md §5.3, §6.5.
//
// Bridges into the existing Listings flow — calls
// `createParcelFromSubmission` from src/lib/parcel-create.ts which is
// the same logic /api/parcels/submit uses (Pass-A: lib exists alongside
// inline submit logic; Pass-B will reconcile).
//
// Verification (Title Deed for owner, Contract for broker) lives in the
// existing Listings flow — the wizard UI on Day 10 hands the user back
// to that form for doc upload before they hit this endpoint. Admin
// verification continues through the existing PlotClaim queue.

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getApprovedUserId } from "@/lib/auth";
import {
  createParcelFromSubmission,
  type UploadedDoc,
} from "@/lib/parcel-create";
import { recordVaultEvent } from "@/lib/vault-activity";

export const runtime = "nodejs";

const UploadedDocSchema = z
  .object({
    kind: z.enum(["title_deed", "id_doc", "rera_contract"]),
    path: z.string().max(1024).optional(),
    url: z.string().url().max(1024).optional(),
    name: z.string().max(256),
    size: z.number().int().nonnegative().max(10 * 1024 * 1024).optional(),
    contentType: z.string().max(128).optional(),
  })
  .refine((d) => !!(d.path || d.url), {
    message: "document_must_have_path_or_url",
    path: ["path"],
  });

const PromoteBodySchema = z
  .object({
    askingPriceAed: z
      .number()
      .positive("asking_price_must_be_positive")
      .max(1e13, "asking_price_too_large"),
    flow: z.enum(["broker", "owner"]),
    landUse: z.string().trim().max(64).optional(),
    description: z.string().trim().max(2000).optional().nullable(),
    broker: z
      .object({
        reraPermit: z.string().trim().min(1).max(64),
        contractRef: z.string().trim().max(256).nullable().optional(),
      })
      .optional(),
    owner: z
      .object({
        fullName: z.string().trim().min(2).max(128),
        phone: z
          .string()
          .trim()
          .regex(/^\+?[0-9\s-]{7,20}$/, "invalid_phone"),
        email: z.string().trim().email("invalid_email").optional().or(z.literal("")),
        titleDeedNumber: z.string().trim().max(64).nullable().optional(),
      })
      .optional(),
    documents: z.array(UploadedDocSchema).max(10).optional(),
  })
  .refine((d) => d.flow !== "broker" || !!d.broker?.reraPermit, {
    message: "rera_permit_required",
    path: ["broker", "reraPermit"],
  })
  .refine((d) => d.flow !== "owner" || !!(d.owner?.fullName && d.owner?.phone), {
    message: "owner_contact_required",
    path: ["owner"],
  });

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const userId = await getApprovedUserId(req);
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { id } = await params;

  const raw = await req.json().catch(() => null);
  const parsed = PromoteBodySchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "validation_failed", issues: parsed.error.issues.slice(0, 10) },
      { status: 400 },
    );
  }
  const body = parsed.data;

  // Load the vault entry with the facts we'll pass through to
  // parcel-create as `prefilled` (skips DDA re-fetch).
  const entry = await prisma.vaultEntry.findUnique({
    where: { id },
    select: {
      id: true,
      ownerId: true,
      emirate: true,
      district: true,
      plotNumber: true,
      area: true,
      latitude: true,
      longitude: true,
      geometry: true,
      landUse: true,
      promotedAt: true,
      publicParcelId: true,
    },
  });
  if (!entry || entry.ownerId !== userId) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  if (entry.promotedAt !== null && entry.publicParcelId !== null) {
    return NextResponse.json(
      { error: "already_promoted", parcelId: entry.publicParcelId },
      { status: 409 },
    );
  }

  // Build the prefilled facts. Use the vault entry's snapshot — the
  // user has been working with this plot data and we trust it over a
  // fresh DDA fetch. parcel-create.ts skips DDA enrichment when
  // prefilled is provided.
  const result = await createParcelFromSubmission({
    callerId: userId,
    plotNumber: entry.plotNumber,
    askingPriceAed: body.askingPriceAed,
    landUse: body.landUse ?? entry.landUse,
    description: body.description ?? null,
    flow: body.flow,
    broker: body.broker,
    owner: body.owner,
    documents: (body.documents as UploadedDoc[]) ?? [],
    prefilled: {
      // VaultEntry.emirate uses Cohort uppercase ("DUBAI"), Parcel uses
      // Dubai title-case. parcel-create defaults to "Dubai" when not set.
      emirate: entry.emirate === "DUBAI" ? "Dubai" : entry.emirate,
      district: entry.district,
      areaSqft: entry.area ?? 0,
      latitude: entry.latitude,
      longitude: entry.longitude,
      geometry: (entry.geometry as unknown as GeoJSON.Polygon | null) ?? null,
    },
    fromVaultEntryId: entry.id,
  });

  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 500 });
  }

  // Link the vault entry back to the new public parcel + flip stage.
  await prisma.vaultEntry.update({
    where: { id },
    data: {
      promotedAt: new Date(),
      promotedParcelId: result.parcelId,
      publicParcelId: result.parcelId,
      stage: "PROMOTED",
    },
  });

  recordVaultEvent({
    vaultEntryId: id,
    actorUserId: userId,
    kind: "PROMOTED_TO_PUBLIC",
    payload: {
      parcelId: result.parcelId,
      parcelStatus: result.status,
      claimStatus: result.claimStatus,
      flow: body.flow,
    },
  });

  return NextResponse.json({
    vaultEntryId: id,
    parcelId: result.parcelId,
    parcelStatus: result.status,
    claimStatus: result.claimStatus,
  });
}
