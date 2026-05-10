// Per-plot claim helpers — spec-05 §5.4 + §8.
//
// Source-of-truth for which UserRoles produce a verifiable PlotClaim
// (PENDING → admin verifies → VERIFIED) vs a self-declared claim
// (SELF_DECLARED on insert, displayed with "Self-declared, not verified"
// pill). Used by Path A (seed-dda), Path B (submit) and Path C
// ([id]/claim) on insert; used by the admin queue's verification tabs
// on read.

import { ClaimStatus, UserRole } from "@prisma/client";

// Spec §5.4 verifiable-vs-self-declared table.
//   OWNER, BROKER, DEVELOPER, ARCHITECT, POA → PENDING (admin verifies)
//   BUYER, INTERMEDIARY, RELATIVE, REFERRAL, OTHER → SELF_DECLARED
//   ADMIN → system-only; surfaced as VERIFIED (mirrors backfill behaviour
//           when an admin user adds inventory through the modal)
//   INVESTOR → deprecated; auto-treated as BUYER for claim purposes
const VERIFIABLE: ReadonlySet<UserRole> = new Set([
  UserRole.OWNER,
  UserRole.BROKER,
  UserRole.DEVELOPER,
  UserRole.ARCHITECT,
  UserRole.POA,
]);

export function isVerifiableRole(role: UserRole): boolean {
  return VERIFIABLE.has(role);
}

export function claimStatusForRole(role: UserRole): ClaimStatus {
  if (role === UserRole.ADMIN) return ClaimStatus.VERIFIED;
  if (role === UserRole.INVESTOR) return ClaimStatus.SELF_DECLARED;
  return VERIFIABLE.has(role) ? ClaimStatus.PENDING : ClaimStatus.SELF_DECLARED;
}

// Public-display label per spec §5.4 + §8.4 — distinguishes verified
// claims from self-declared and from system-seed inventory.
export function claimDisplayLabel(status: ClaimStatus): string {
  switch (status) {
    case ClaimStatus.VERIFIED:
      return "Verified";
    case ClaimStatus.SELF_DECLARED:
      return "Self-declared, not verified";
    case ClaimStatus.PENDING:
      return "Pending verification";
    case ClaimStatus.REJECTED:
      return "Rejected";
  }
}
