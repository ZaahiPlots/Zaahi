// Display-side formatter for ParcelStatus enum values.
//
// CLAUDE.md flagged the platform's status-rendering inconsistency
// (LISTED / VERIFIED / IN_DEAL as ALL_CAPS_SNAKE next to "Pending
// Review" Title Case in the same surface). This helper translates
// the wire / DB enum to the human label used in UI. Founder spec
// 2026-05-31 Phase B Q1.
//
// IMPORTANT: this is a display-only mapping. The Prisma ParcelStatus
// enum stays exactly as it is — anything that reads/writes the
// database, queries by status, or includes status in API responses
// keeps using LISTED / VERIFIED / IN_DEAL / VACANT / etc verbatim.
// Only use formatParcelStatus when about to render the value as
// user-visible text.

const PARCEL_STATUS_DISPLAY: Record<string, string> = {
  LISTED: "Listed",
  VERIFIED: "Verified",
  IN_DEAL: "In Deal",
  VACANT: "Vacant",
  SOLD: "Sold",
  DISPUTED: "Disputed",
  PENDING_REVIEW: "Pending Review",
  REJECTED: "Rejected",
  FROZEN: "Frozen",
  VAULT_PRIVATE: "Vault Private",
};

export function formatParcelStatus(raw: string): string {
  return PARCEL_STATUS_DISPLAY[raw] ?? raw;
}
