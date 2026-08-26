// ZAAHI — parcel creation lib (extracted from /api/parcels/submit on Day 4
// of Phase 2.1 to let the vault Promote-to-Public flow reuse the same
// logic). Pass-A: this file lives alongside the existing submit route
// without replacing its inline logic. Pass-B (gated on founder approval)
// will rewire submit to call into this lib so we have one source of
// truth — see docs/specs/phase-2/private-plot-vault/implementation-plan.md §5 Day 4.
//
// Spec for promote: docs/specs/phase-2/private-plot-vault/spec.md §6.5
//
// What this lib does:
//   1. (optional) Best-effort DDA enrichment for geometry / district / area
//      — skipped if `prefilled` is provided (vault entries already carry
//      these facts in their snapshot)
//   2. Parcel.upsert with status = PENDING_REVIEW
//   3. AffectionPlan.create with the submission payload (flow, docs, etc.)
//   4. PlotClaim.create — claim role = broker/owner, status = PENDING for
//      verifiable roles. Race-safe: P2002 on (parcelId, userId) returns
//      claimStatus: null and the caller continues.
//   5. logActivity LISTING_CREATED (user-centric dashboard surface)
//
// What this lib does NOT do:
//   • Auth gating (caller handles getApprovedUserId)
//   • Zod validation (caller hands fully-typed input)
//   • User-row upsert from Supabase auth (caller handles — see
//     ensureUserSyncedFromBearer below if needed)
//   • Vault-side bookkeeping (caller updates VaultEntry.publicParcelId
//     after this returns)

import { Prisma, ParcelStatus, UserRole, type ClaimStatus } from "@prisma/client";
import { prisma } from "./prisma";
import { logActivity } from "./activity";
import { supabase } from "./supabase";
import { claimStatusForRole } from "./plot-claim";
import { normalizeEmirate } from "./emirate";
import { debugWarn } from "@/lib/debug";

/** Best-effort DDA enrichment shape. */
interface PolyFeature {
  geometry: GeoJSON.Polygon;
  properties: Record<string, unknown>;
}

/** Document-upload entry, matching the schema in /api/parcels/submit. */
export interface UploadedDoc {
  kind: "title_deed" | "id_doc" | "rera_contract";
  path?: string;
  url?: string;
  name: string;
  size?: number;
  contentType?: string;
}

/**
 * Pre-known plot facts that skip the DDA enrichment fetch. Vault
 * Promote-to-Public passes these from the VaultEntry's stored snapshot
 * so we don't re-hit DDA for a plot we already know about.
 */
export interface PrefilledFacts {
  geometry?: GeoJSON.Polygon | null;
  district?: string;
  areaSqft?: number;
  latitude?: number | null;
  longitude?: number | null;
  emirate?: string;
}

export interface CreateParcelInput {
  callerId: string;
  plotNumber: string;
  /** AED, positive, max 1e13 — caller's responsibility to validate. */
  askingPriceAed: number;
  landUse?: string | null;
  description?: string | null;
  flow: "broker" | "owner";
  broker?: { reraPermit: string; contractRef?: string | null };
  owner?: {
    fullName: string;
    phone: string;
    email?: string;
    titleDeedNumber?: string | null;
  };
  documents?: UploadedDoc[];
  /** When set, DDA enrichment is skipped and these facts are used directly. */
  prefilled?: PrefilledFacts;
  /** When set, recorded in the AffectionPlan submission payload for audit. */
  fromVaultEntryId?: string;
}

export interface CreateParcelResult {
  parcelId: string;
  status: ParcelStatus;
  /** null if PlotClaim insert raced and lost (P2002). Parcel was still created/updated. */
  claimStatus: ClaimStatus | null;
}

export type CreateParcelError = "submit_failed";

/**
 * Create or update a public Parcel from a Broker or Owner submission.
 * Returns the new parcel id + status on success or an error code.
 */
export async function createParcelFromSubmission(
  input: CreateParcelInput,
): Promise<CreateParcelResult | { error: CreateParcelError }> {
  const { callerId, plotNumber, flow, askingPriceAed } = input;
  const priceFils = BigInt(Math.round(askingPriceAed)) * BigInt(100);

  // Resolve plot facts — prefer prefilled, else best-effort DDA.
  let geometry: GeoJSON.Polygon | null = input.prefilled?.geometry ?? null;
  let district = input.prefilled?.district ?? "UNKNOWN";
  let areaSqft = input.prefilled?.areaSqft ?? 0;
  let lng: number | null = input.prefilled?.longitude ?? null;
  let lat: number | null = input.prefilled?.latitude ?? null;
  // AD-1 hardcode fix (founder spec 2026-06-01, completes D11): the
  // historical `?? "Dubai"` default silently turned every vault →
  // listing promote of a non-Dubai entry into a Dubai parcel, even
  // when the vault entry's `entry.emirate` clearly said otherwise.
  // The only existing caller (promote/route.ts) always passes
  // prefilled.emirate (vault entries always have one), so an
  // explicit-required contract is safe today and prevents the
  // silent-Dubai trap if a future caller forgets to thread emirate
  // through.
  const rawEmirate = input.prefilled?.emirate;
  if (!rawEmirate || rawEmirate.trim() === "") {
    throw new Error(
      "createParcelFromSubmission: prefilled.emirate is required — caller must pass an explicit emirate to avoid the silent-Dubai default.",
    );
  }
  // Normalise SCREAMING_SNAKE / lowercase / mixed → title-case
  // ("ABU_DHABI" → "Abu Dhabi"). Shared helper, single source of truth.
  const emirate = normalizeEmirate(rawEmirate);

  if (!input.prefilled) {
    try {
      const polyUrl =
        "https://gis.dda.gov.ae/server/rest/services/DDA/BASIC_LAND_BASE/MapServer/2/query" +
        `?where=PLOT_NUMBER%3D%27${plotNumber}%27&outFields=*&returnGeometry=true&outSR=4326&f=geojson`;
      const r = await fetch(polyUrl, { cache: "no-store" });
      if (r.ok) {
        const j = (await r.json()) as { features?: PolyFeature[] };
        const feat = j.features?.[0];
        if (feat?.geometry) {
          geometry = feat.geometry;
          district = (feat.properties.PROJECT_NAME as string) ?? district;
          areaSqft =
            typeof feat.properties.AREA_SQFT === "number"
              ? feat.properties.AREA_SQFT
              : 0;
          const ring = feat.geometry.coordinates[0];
          lng = ring.reduce((s, p) => s + p[0], 0) / ring.length;
          lat = ring.reduce((s, p) => s + p[1], 0) / ring.length;
        }
      }
    } catch {
      /* enrichment is best-effort */
    }
  }

  try {
    const parcel = await prisma.parcel.upsert({
      where: {
        emirate_district_plotNumber: { emirate, district, plotNumber },
      },
      create: {
        plotNumber,
        ownerId: callerId,
        area: areaSqft,
        emirate,
        district,
        latitude: lat,
        longitude: lng,
        geometry:
          (geometry as unknown as Prisma.InputJsonValue) ?? Prisma.JsonNull,
        status: ParcelStatus.PENDING_REVIEW,
        currentValuation: priceFils,
      },
      // Bump price + status; never overwrite ownerId.
      update: {
        status: ParcelStatus.PENDING_REVIEW,
        currentValuation: priceFils,
      },
    });

    const submissionPayload = {
      flow,
      broker: input.broker ?? null,
      owner: input.owner ?? null,
      description: input.description ?? null,
      askingPriceAed,
      documents: input.documents ?? [],
      submittedAt: new Date().toISOString(),
      submittedBy: callerId,
      fromVaultEntryId: input.fromVaultEntryId ?? null,
    };

    await prisma.affectionPlan.create({
      data: {
        parcelId: parcel.id,
        source: input.fromVaultEntryId
          ? `vault-promote:${flow}`
          : `submission:${flow}`,
        plotNumber,
        community: district,
        plotAreaSqft: areaSqft || null,
        landUseMix: input.landUse
          ? ([
              { category: input.landUse, sub: input.landUse, areaSqm: null },
            ] as unknown as Prisma.InputJsonValue)
          : ([] as unknown as Prisma.InputJsonValue),
        notes: input.description ?? null,
        raw: submissionPayload as unknown as Prisma.InputJsonValue,
      },
    });

    const claimRole: UserRole =
      flow === "broker" ? UserRole.BROKER : UserRole.OWNER;
    const claimStatus: ClaimStatus = claimStatusForRole(claimRole);
    const claimDocs = (input.documents ?? []).map((d) => ({
      kind: d.kind,
      path: d.path ?? null,
      url: d.url ?? null,
      originalName: d.name,
      sizeBytes: d.size ?? null,
      contentType: d.contentType ?? null,
      uploadedAt: new Date().toISOString(),
    }));

    let resolvedClaimStatus: ClaimStatus | null = claimStatus;
    try {
      await prisma.plotClaim.create({
        data: {
          parcelId: parcel.id,
          userId: callerId,
          roleAtClaim: claimRole,
          priceAed: priceFils, // fils — column name preserved per schema §5.4
          status: claimStatus,
          documentsJson:
            claimDocs.length > 0
              ? (claimDocs as unknown as Prisma.InputJsonValue)
              : Prisma.JsonNull,
        },
      });
    } catch (e) {
      if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        e.code === "P2002"
      ) {
        // Race-loser; caller already has a claim on this parcel. The
        // parcel itself was successfully created/updated. Return null
        // claimStatus so the caller knows we didn't insert.
        debugWarn(
          "[parcel-create] plotclaim duplicate (race) — parcel:",
          parcel.id,
        );
        resolvedClaimStatus = null;
      } else {
        console.error("[parcel-create] plotclaim insert failed:", e);
        resolvedClaimStatus = null;
      }
    }

    void logActivity({
      userId: callerId,
      kind: "LISTING_CREATED",
      ref: parcel.id,
      payload: {
        flow,
        status: parcel.status,
        district,
        fromVaultEntryId: input.fromVaultEntryId ?? null,
      },
    });

    return {
      parcelId: parcel.id,
      status: parcel.status,
      claimStatus: resolvedClaimStatus,
    };
  } catch (e) {
    console.error("[parcel-create] failed:", e);
    return { error: "submit_failed" };
  }
}

/**
 * Optional helper for callers that need to sync a fresh Supabase user
 * into our Prisma User table before referencing them in a Parcel FK.
 *
 * Used by /api/parcels/submit (Pass-B refactor will route through here).
 * Vault promote DOES NOT need to call this — VaultEntry.ownerId is
 * already FK'd to a synced User row by construction.
 */
export async function ensureUserSyncedFromBearer(
  callerId: string,
  authToken: string,
  fallbackFlow: "broker" | "owner",
): Promise<{ ok: true } | { error: "no_email" | "user_sync_failed" }> {
  try {
    const authRes = await supabase.auth.getUser(authToken);
    const email = authRes.data.user?.email;
    if (!email) return { error: "no_email" };
    const metaRole = (
      authRes.data.user?.user_metadata?.role as string | undefined
    )?.toUpperCase();
    const role = (Object.values(UserRole) as string[]).includes(metaRole ?? "")
      ? (metaRole as UserRole)
      : fallbackFlow === "broker"
        ? UserRole.BROKER
        : UserRole.OWNER;
    const metaName =
      (authRes.data.user?.user_metadata?.name as string | undefined) ??
      email.split("@")[0];
    await prisma.user.upsert({
      where: { id: callerId },
      create: { id: callerId, email, role, name: metaName },
      update: {},
    });
    return { ok: true };
  } catch (e) {
    console.error("[parcel-create] ensureUserSyncedFromBearer failed:", e);
    return { error: "user_sync_failed" };
  }
}
