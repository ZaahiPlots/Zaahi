// ZAAHI Vault — JSON serialisation + PII redaction by viewer role.
//
// Spec: docs/specs/phase-2/private-plot-vault/spec.md §3.1, §4, §6.4.
//
// Two viewer roles map to two output shapes:
//
//   "owner" → VaultEntryFull
//             every field, plain BigInt → string, plain Date → ISO
//
//   "share" → VaultEntryRecipientView
//             same as Full MINUS:
//               • brokerNotes
//               • nextFollowUpAt
//               • ownerContact.notes (other ownerContact fields preserved)
//               • conflictedFields (third-party userIds + values — see G8
//                 in diagnostic-day12.md §6.3; recipient still sees the
//                 boolean conflictsWithOthers, just not who/what)
//               • activity[] (kept empty — recipients see only their own SHARED row)
//             PLUS:
//               • sharedBy: { id, nickname }
//               • permission
//
// The "shared with me" map layer + recipient-side detail view both
// route through `serializeVaultEntryForRecipient`. The owner-side
// list, detail, and map all route through `serializeVaultEntryFull`.

import type { Prisma, VaultSharePermission } from "@prisma/client";

/** BigInt-safe JSON clone — same shape as src/lib/serialize.ts serialize(). */
function bigintToString<T>(value: T): T {
  return JSON.parse(
    JSON.stringify(value, (_, v) => (typeof v === "bigint" ? v.toString() : v)),
  );
}

/** The owner-view shape of a VaultEntry row. */
export interface VaultEntryFull {
  id: string;
  ownerId: string;
  addedByUserId: string | null;
  importedFromShareId: string | null;
  provenanceChain: unknown | null;
  emirate: string;
  district: string;
  plotNumber: string;
  publicParcelId: string | null;
  area: number | null;
  latitude: number | null;
  longitude: number | null;
  geometry: unknown | null;
  landUse: string | null;
  askingPriceFils: string | null;
  ownerContact: Record<string, unknown> | null;
  brokerNotes: string | null;
  stage: string;
  source: string | null;
  nextFollowUpAt: string | null;
  promotedAt: string | null;
  promotedParcelId: string | null;
  conflictsWithOthers: boolean;
  conflictedFields: unknown | null;
  /** Raw DDA snapshot when entry was sourced via live BASIC_LAND_BASE
   *  lookup (Path 1 fallback). Null for curated-Parcel-linked entries
   *  and manual non-DDA entries. See src/lib/dda-plot-lookup.ts. */
  ddaSnapshot: unknown | null;
  createdAt: string;
  updatedAt: string;
}

/** The share-recipient view — PII redacted server-side. */
export interface VaultEntryRecipientView
  extends Omit<
    VaultEntryFull,
    "brokerNotes" | "nextFollowUpAt" | "ownerContact" | "conflictedFields"
  > {
  ownerContact: Record<string, unknown> | null; // notes field stripped
  sharedBy: { id: string; nickname: string | null };
  permission: VaultSharePermission;
}

/** Owner serialisation — pass-through with BigInt + Date converted. */
export function serializeVaultEntryFull(
  row: Prisma.VaultEntryGetPayload<Record<string, never>>,
): VaultEntryFull {
  return bigintToString({
    id: row.id,
    ownerId: row.ownerId,
    addedByUserId: row.addedByUserId,
    importedFromShareId: row.importedFromShareId,
    provenanceChain: row.provenanceChain,
    emirate: row.emirate,
    district: row.district,
    plotNumber: row.plotNumber,
    publicParcelId: row.publicParcelId,
    area: row.area,
    latitude: row.latitude,
    longitude: row.longitude,
    geometry: row.geometry,
    landUse: row.landUse,
    askingPriceFils: row.askingPriceFils?.toString() ?? null,
    ownerContact: row.ownerContact as Record<string, unknown> | null,
    brokerNotes: row.brokerNotes,
    stage: row.stage,
    source: row.source,
    nextFollowUpAt: row.nextFollowUpAt?.toISOString() ?? null,
    promotedAt: row.promotedAt?.toISOString() ?? null,
    promotedParcelId: row.promotedParcelId,
    conflictsWithOthers: row.conflictsWithOthers,
    conflictedFields: row.conflictedFields,
    ddaSnapshot: row.ddaSnapshot,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  });
}

/** Share-recipient serialisation — PII fields stripped, share metadata added. */
export function serializeVaultEntryForRecipient(
  row: Prisma.VaultEntryGetPayload<Record<string, never>>,
  share: { permission: VaultSharePermission },
  sharedBy: { id: string; nickname: string | null },
): VaultEntryRecipientView {
  const full = serializeVaultEntryFull(row);
  return {
    id: full.id,
    ownerId: full.ownerId,
    addedByUserId: full.addedByUserId,
    importedFromShareId: full.importedFromShareId,
    provenanceChain: full.provenanceChain,
    emirate: full.emirate,
    district: full.district,
    plotNumber: full.plotNumber,
    publicParcelId: full.publicParcelId,
    area: full.area,
    latitude: full.latitude,
    longitude: full.longitude,
    geometry: full.geometry,
    landUse: full.landUse,
    askingPriceFils: full.askingPriceFils,
    ddaSnapshot: full.ddaSnapshot, // raw scrape facts — public-by-nature on prod portal
    ownerContact: redactOwnerContact(full.ownerContact),
    stage: full.stage,
    source: full.source,
    promotedAt: full.promotedAt,
    promotedParcelId: full.promotedParcelId,
    conflictsWithOthers: full.conflictsWithOthers,
    // conflictedFields INTENTIONALLY OMITTED for recipients — it carries
    // { userId, value } tuples for every participant on the plot, which
    // would expose third-party userIds + prices to a share recipient who
    // never authorised that visibility (diagnostic-day12.md §6.3 G8).
    // Recipient still sees the boolean conflictsWithOthers so the banner
    // renders; only the comparison data is gated.
    createdAt: full.createdAt,
    updatedAt: full.updatedAt,
    sharedBy,
    permission: share.permission,
  };
}

/**
 * Strip the `notes` field from ownerContact. Other fields (name, phone,
 * email, role) survive — recipient may need them to reach the owner.
 * Notes are the broker's private working memo and stay private.
 */
function redactOwnerContact(
  contact: Record<string, unknown> | null,
): Record<string, unknown> | null {
  if (!contact || typeof contact !== "object") return null;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { notes: _stripped, ...rest } = contact as { notes?: unknown } & Record<
    string,
    unknown
  >;
  return rest;
}
