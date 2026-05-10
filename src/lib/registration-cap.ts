// Cap-counter for /register submit (spec §5.3 / §6.4 step 4).
//
// Each cohort role has a soft cap: when 10+ APPROVED autoMigrated=false
// applications exist for a role, new submissions land in WAITLIST status
// instead of PENDING_REVIEW. autoMigrated rows (Жан + Dymo seeds) are
// excluded from the count.

import type { Prisma, UserRole } from "@prisma/client";

export const CAP_PER_ROLE = 10;

export type PrismaTxLike = Pick<
  Prisma.TransactionClient,
  "registrationApplication"
> & { registrationApplication: { count: (...args: any[]) => Promise<number> } };

export async function countApprovedForRole(
  tx: PrismaTxLike | { registrationApplication: { count: (...a: any[]) => Promise<number> } },
  role: UserRole,
): Promise<number> {
  return tx.registrationApplication.count({
    where: {
      roleApplied: role,
      status: "APPROVED",
      autoMigrated: false,
    },
  });
}

export function statusForCount(count: number): "PENDING_REVIEW" | "WAITLIST" {
  return count >= CAP_PER_ROLE ? "WAITLIST" : "PENDING_REVIEW";
}
