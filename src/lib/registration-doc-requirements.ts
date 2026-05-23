// Per-role document requirements for the public /register flow.
// Mirrors spec-05 §6.3.

import type { UserRole } from "@prisma/client";

export type DocKind =
  | "emirates_id"
  | "passport"
  | "title_deed"
  | "rera_card"
  | "agency_licence"
  | "trade_licence"
  | "dld_developer_registration"
  | "architect_licence"
  | "poa_document";

export const DOC_KIND_LABELS: Record<DocKind, string> = {
  emirates_id: "Emirates ID",
  passport: "Passport",
  title_deed: "Title Deed",
  rera_card: "RERA card",
  agency_licence: "Agency licence",
  trade_licence: "Trade licence",
  dld_developer_registration: "DLD developer registration",
  architect_licence: "Architect licence",
  poa_document: "POA document",
};

export const DOC_KIND_HINTS: Record<DocKind, string> = {
  emirates_id: "Both sides accepted (front + back as separate files).",
  passport: "Bio-data page (the one with the photo).",
  title_deed: "DLD-issued title deed PDF or photo.",
  rera_card: "RERA brokerage card — front side.",
  agency_licence: "Trade-licence-equivalent brokerage authorisation.",
  trade_licence: "Issued by the relevant emirate's economic department.",
  dld_developer_registration: "DLD developer registration certificate.",
  architect_licence: "Issued by Dubai Municipality / equivalent.",
  poa_document: "Notarised power-of-attorney document.",
};

export type RequirementMode = "AND" | "OR";

export interface DocRequirement {
  mode: RequirementMode;
  kinds: DocKind[];
}

// Map UserRole → DocRequirement. Source-of-truth for both client UX
// (which drop-zones to render) and server validation (whether the
// submitted documentsJson satisfies the role).
//
// `ADMIN` and `INVESTOR` are technically members of the UserRole enum
// but never valid as cohort applicants (see spec §5.1). They map to
// an empty requirement only for type completeness; the validation in
// /api/registration/submit rejects them at the role enum check before
// we ever look up doc requirements.
export const REGISTRATION_DOC_REQUIREMENTS: Record<UserRole, DocRequirement> = {
  OWNER: { mode: "AND", kinds: ["emirates_id", "title_deed"] },
  BROKER: { mode: "AND", kinds: ["emirates_id", "rera_card", "agency_licence"] },
  // PROJECT_MANAGER: ID-only baseline (same as BUYER / INTERMEDIARY).
  // Founder may tighten to a project-management cert via a new DocKind
  // in Phase 2.2.
  PROJECT_MANAGER: { mode: "OR", kinds: ["emirates_id", "passport"] },
  DEVELOPER: { mode: "AND", kinds: ["trade_licence", "dld_developer_registration"] },
  ARCHITECT: { mode: "AND", kinds: ["emirates_id", "architect_licence"] },
  POA: { mode: "AND", kinds: ["emirates_id", "poa_document"] },
  BUYER: { mode: "OR", kinds: ["emirates_id", "passport"] },
  INTERMEDIARY: { mode: "OR", kinds: ["emirates_id", "passport"] },
  RELATIVE: { mode: "OR", kinds: ["emirates_id", "passport"] },
  REFERRAL: { mode: "OR", kinds: ["emirates_id", "passport"] },
  OTHER: { mode: "OR", kinds: ["emirates_id", "passport"] },
  ADMIN: { mode: "AND", kinds: [] },
  INVESTOR: { mode: "AND", kinds: [] },
};

export type DocValidation =
  | { ok: true }
  | { ok: false; mode: RequirementMode; required: DocKind[]; missing: DocKind[] };

/**
 * Check whether a set of provided doc kinds satisfies the per-role
 * requirement. The set should contain a kind once if at least one
 * file of that kind has been uploaded.
 *
 *   AND mode: every required kind must be present.
 *   OR mode:  at least one of the kinds must be present.
 */
export function validateDocs(role: UserRole, provided: Set<DocKind>): DocValidation {
  const req = REGISTRATION_DOC_REQUIREMENTS[role];
  if (!req || req.kinds.length === 0) return { ok: true };
  if (req.mode === "AND") {
    const missing = req.kinds.filter((k) => !provided.has(k));
    if (missing.length === 0) return { ok: true };
    return { ok: false, mode: "AND", required: req.kinds, missing };
  }
  // OR: any one suffices
  const has = req.kinds.some((k) => provided.has(k));
  if (has) return { ok: true };
  return { ok: false, mode: "OR", required: req.kinds, missing: req.kinds };
}

// File constraints per spec §6.3 (mirrors AddPlotModal client-side checks).
export const MAX_FILE_BYTES = 10 * 1024 * 1024; // 10 MiB
export const ALLOWED_MIME = new Set<string>([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
]);
