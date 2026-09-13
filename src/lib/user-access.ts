// Admin pause / resume of a user's subscription (2026-09-13).
//
// One function for both directions so the two route handlers share the
// guards and the audit write. Server-side rules (not only UI):
//   - target must exist
//   - the acting admin cannot pause / resume themselves
//   - founder accounts are never pausable
//   - PAUSE on a PAUSED user / RESUME on an ACTIVE user → 409
// The state flip and the append-only UserAccessEvent row are written in
// one transaction. No email / SMS (notifications are known-broken).

import { AccessAction, AccessStatus, Prisma } from "@prisma/client";
import { prisma } from "./prisma";
import { isFounderEmail } from "./auth";

export const PAUSE_REASON_MAX = 500;

export type AccessChangeError = {
  ok: false;
  status: 400 | 403 | 404 | 409;
  code: "self" | "founder_protected" | "not_found" | "already_paused" | "not_paused" | "bad_reason";
  message: string;
};

export type AccessChangeOk = {
  ok: true;
  user: UserAccessRow;
};

/** Shape the admin list and the pause/resume responses share. */
export const USER_ACCESS_SELECT = {
  id: true,
  email: true,
  name: true,
  nickname: true,
  role: true,
  accessStatus: true,
  pausedAt: true,
  pausedById: true,
  pauseReason: true,
  lastSeenAt: true,
  createdAt: true,
} satisfies Prisma.UserSelect;

export type UserAccessRow = Prisma.UserGetPayload<{ select: typeof USER_ACCESS_SELECT }>;

export async function setUserAccess(input: {
  targetId: string;
  actorId: string;
  action: AccessAction;
  reason?: string | null;
}): Promise<AccessChangeOk | AccessChangeError> {
  const { targetId, actorId, action } = input;
  const reason = (input.reason ?? "").trim();
  if (reason.length > PAUSE_REASON_MAX) {
    return { ok: false, status: 400, code: "bad_reason", message: `Reason must be ≤ ${PAUSE_REASON_MAX} characters.` };
  }
  if (targetId === actorId) {
    return { ok: false, status: 403, code: "self", message: "You cannot change your own access." };
  }

  const target = await prisma.user.findUnique({
    where: { id: targetId },
    select: { id: true, email: true, accessStatus: true },
  });
  if (!target) {
    return { ok: false, status: 404, code: "not_found", message: "User not found." };
  }
  if (isFounderEmail(target.email)) {
    return { ok: false, status: 403, code: "founder_protected", message: "Founder accounts cannot be paused." };
  }
  if (action === AccessAction.PAUSE && target.accessStatus === AccessStatus.PAUSED) {
    return { ok: false, status: 409, code: "already_paused", message: "User is already paused." };
  }
  if (action === AccessAction.RESUME && target.accessStatus === AccessStatus.ACTIVE) {
    return { ok: false, status: 409, code: "not_paused", message: "User is not paused." };
  }

  const now = new Date();
  const user = await prisma.$transaction(async (tx) => {
    const updated = await tx.user.update({
      where: { id: targetId },
      data:
        action === AccessAction.PAUSE
          ? { accessStatus: AccessStatus.PAUSED, pausedAt: now, pausedById: actorId, pauseReason: reason || null }
          : { accessStatus: AccessStatus.ACTIVE, pausedAt: null, pausedById: null, pauseReason: null },
      select: USER_ACCESS_SELECT,
    });
    await tx.userAccessEvent.create({
      data: { userId: targetId, actorId, action, reason: reason || null, createdAt: now },
    });
    return updated;
  });

  return { ok: true, user };
}
