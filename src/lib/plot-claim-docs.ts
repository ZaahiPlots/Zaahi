// Helpers for surfacing PlotClaim.documentsJson to admin verification
// modals. Two storage shapes coexist (Step 11 PDPL audit will reconcile):
//
//   Path B (/api/parcels/submit + AddPlotModal Broker / Owner flows):
//     uploads to public bucket "documents". documentsJson item has a
//     ready-to-open `url` field already.
//
//   Path C (/api/parcels/[id]/claim, Step 9):
//     uploads to private bucket "registration-docs" under
//     <userId>/plot-claims/<parcelId>/. documentsJson item has a
//     `path` field; admin needs a signed URL (TTL 7d) to open it.
//
// signClaimDocuments takes a raw documentsJson value and returns a
// uniform array of { kind, originalName, signedUrl, expiresAt, ... }
// with whichever URL was usable. Caller (admin detail endpoints)
// passes the result straight to the JSON response.

import { signRegistrationDoc } from "./storage-signed-url";

export interface ClaimDocItemRaw {
  kind?: string;
  // Path C shape
  path?: string;
  // Path B shape
  url?: string;
  // Common metadata
  originalName?: string;
  name?: string; // Path B's older shape used `name`
  sizeBytes?: number;
  size?: number; // Path B
  contentType?: string;
  uploadedAt?: string;
}

export interface ClaimDocItemSigned {
  kind: string;
  originalName: string | null;
  sizeBytes: number | null;
  contentType: string | null;
  signedUrl: string | null;
  expiresAt: string | null;
  source: "registration-docs" | "documents";
}

export async function signClaimDocuments(
  raw: unknown,
): Promise<ClaimDocItemSigned[]> {
  if (!Array.isArray(raw)) return [];
  const items = raw as ClaimDocItemRaw[];
  const out: ClaimDocItemSigned[] = [];
  for (const it of items) {
    const kind = it.kind ?? "document";
    const originalName = it.originalName ?? it.name ?? null;
    const sizeBytes = (it.sizeBytes ?? it.size ?? null) as number | null;
    const contentType = it.contentType ?? null;
    if (typeof it.path === "string" && it.path.length > 0) {
      const signed = await signRegistrationDoc(it.path);
      out.push({
        kind,
        originalName,
        sizeBytes,
        contentType,
        signedUrl: signed?.signedUrl ?? null,
        expiresAt: signed?.expiresAt ?? null,
        source: "registration-docs",
      });
    } else if (typeof it.url === "string" && it.url.length > 0) {
      out.push({
        kind,
        originalName,
        sizeBytes,
        contentType,
        // Public bucket URL — already openable. No expiry.
        signedUrl: it.url,
        expiresAt: null,
        source: "documents",
      });
    } else {
      out.push({
        kind,
        originalName,
        sizeBytes,
        contentType,
        signedUrl: null,
        expiresAt: null,
        source: "documents",
      });
    }
  }
  return out;
}
