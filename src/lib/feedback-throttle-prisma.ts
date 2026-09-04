// The Postgres binding for FeedbackThrottle.
//
// Deliberately thin. All of the decision-making lives in feedback-throttle.ts,
// which has no database in it and is exercised by scripts/feedback-throttle.test.ts;
// this file is the part that cannot be tested without a real Postgres, so
// there is as little of it as possible.
//
// One table, four operations, no query builder. See
// prisma/migrations/20260904120000_feedback_submission_throttle.

import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { ThrottleRow, ThrottleStore } from "@/lib/feedback-throttle";

/** Postgres unique-constraint violation. */
const UNIQUE_VIOLATION = "P2002";

export const prismaThrottleStore: ThrottleStore = {
  async countSince(userId: string, since: Date): Promise<number> {
    return prisma.feedbackSubmission.count({
      where: { userId, createdAt: { gte: since } },
    });
  },

  async hasText(userId: string, textHash: string, since: Date): Promise<boolean> {
    const hit = await prisma.feedbackSubmission.findFirst({
      where: { userId, textHash, createdAt: { gte: since } },
      select: { id: true },
    });
    return hit !== null;
  },

  async insert(row: Omit<ThrottleRow, "id" | "createdAt">): Promise<ThrottleRow | null> {
    try {
      const created = await prisma.feedbackSubmission.create({
        data: {
          userId: row.userId,
          submissionId: row.submissionId,
          textHash: row.textHash,
        },
        select: { id: true, userId: true, submissionId: true, textHash: true, createdAt: true },
      });
      return created;
    } catch (e) {
      // A unique violation on (userId, submissionId) IS the duplicate collapse.
      // Letting the database decide it means two lambdas racing the same
      // conversational turn cannot both win, which a check-then-insert cannot
      // promise. Any other error is a real failure and must propagate.
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === UNIQUE_VIOLATION) {
        return null;
      }
      throw e;
    }
  },

  async remove(id: string): Promise<void> {
    // deleteMany, not delete: a refund for a row that is already gone is a
    // no-op, not a crash. delete() throws P2025 on a missing row, and this is
    // called on the failure path — where throwing would replace one problem
    // with a worse one.
    await prisma.feedbackSubmission.deleteMany({ where: { id } });
  },

  async purgeBefore(cutoff: Date): Promise<number> {
    const { count } = await prisma.feedbackSubmission.deleteMany({
      where: { createdAt: { lt: cutoff } },
    });
    return count;
  },
};
