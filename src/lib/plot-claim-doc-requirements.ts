// Per-role document requirements for a PlotClaim — spec-05 §8.3 + §8.4.
//
// Mirrors `registration-doc-requirements.ts` in shape, but the kinds and
// requirements are claim-specific (proving role-on-this-plot, not
// proving identity). The two requirement sets diverge intentionally:
// /register validates the user *as a person*; /api/parcels/[id]/claim
// validates them *for this plot*.
//
// Path A (seed-dda) and the existing Path B (submit) accept zero or
// permissive uploads because the modal collects them through their own
// UX. Path C uses these requirements to gate the new claim form.

import type { UserRole } from "@prisma/client";

export type ClaimDocKind =
  | "title_deed"
  | "rera_form"
  | "developer_registration"
  | "architect_proof"
  | "poa_document";

export const CLAIM_DOC_KIND_LABELS: Record<ClaimDocKind, string> = {
  title_deed: "Title Deed",
  rera_form: "RERA Form A or B for this plot",
  developer_registration: "DLD developer registration for this project",
  architect_proof: "Architect licence + proof of work",
  poa_document: "POA document",
};

export const CLAIM_DOC_KIND_HINTS: Record<ClaimDocKind, string> = {
  title_deed: "DLD-issued title deed PDF or photo for this plot.",
  rera_form: "Signed RERA Form A or B specifying this plot.",
  developer_registration: "DLD developer registration certificate for this project.",
  architect_proof: "Architect licence + signed-off drawings or appointment letter.",
  poa_document: "Notarised power-of-attorney for this plot.",
};

export interface ClaimDocRequirement {
  required: boolean;
  kinds: ClaimDocKind[];
}

// roleAtClaim → required uploads. Verifiable roles need exactly the
// document that lets an admin confirm the role for this plot:
//   OWNER → title deed; BROKER → RERA form; etc.
// Non-verifiable roles upload nothing — they're SELF_DECLARED on insert.
export const PLOT_CLAIM_DOC_REQUIREMENTS: Record<UserRole, ClaimDocRequirement> = {
  OWNER: { required: true, kinds: ["title_deed"] },
  BROKER: { required: true, kinds: ["rera_form"] },
  DEVELOPER: { required: true, kinds: ["developer_registration"] },
  ARCHITECT: { required: true, kinds: ["architect_proof"] },
  POA: { required: true, kinds: ["poa_document"] },
  BUYER: { required: false, kinds: [] },
  INTERMEDIARY: { required: false, kinds: [] },
  RELATIVE: { required: false, kinds: [] },
  REFERRAL: { required: false, kinds: [] },
  OTHER: { required: false, kinds: [] },
  // System / deprecated — never reachable from the UI form path; included
  // here for type completeness.
  ADMIN: { required: false, kinds: [] },
  INVESTOR: { required: false, kinds: [] },
};

export type ClaimDocValidation =
  | { ok: true }
  | { ok: false; required: ClaimDocKind[]; missing: ClaimDocKind[] };

// Verifiable-role roleAtClaim values are the only ones with non-empty
// requirements; for those, every listed kind must be present at least
// once in the provided set.
export function validateClaimDocs(
  role: UserRole,
  provided: Set<ClaimDocKind>,
): ClaimDocValidation {
  const req = PLOT_CLAIM_DOC_REQUIREMENTS[role];
  if (!req || !req.required || req.kinds.length === 0) return { ok: true };
  const missing = req.kinds.filter((k) => !provided.has(k));
  if (missing.length === 0) return { ok: true };
  return { ok: false, required: req.kinds, missing };
}

// Mirror of /register MIME / size constraints so the user gets the same
// error story across surfaces.
export const CLAIM_MAX_FILE_BYTES = 10 * 1024 * 1024; // 10 MiB
export const CLAIM_ALLOWED_MIME = new Set<string>([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
]);
