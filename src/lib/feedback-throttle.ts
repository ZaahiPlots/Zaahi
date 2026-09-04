// Shared throttle state for /api/archie/feedback.
//
// docs/BACKLOG.md §8. Until now the rate limit, the 24h text dedup and the
// per-message idempotency key all lived in module-scope Maps. The route's own
// header admitted they "reset on cold start". On Vercel that is worse than it
// sounds: every guard was also invisible to every OTHER concurrent lambda, so
// none of the three actually held. The 429s seen during QA were instance
// affinity, not policy.
//
// The policy now talks to a ThrottleStore rather than to a Map. Production
// binds it to one Postgres table through the existing Prisma client — no new
// provider, per founder instruction. Tests bind it to a shared in-memory store
// and drive TWO independent policy objects against it, which is what proves
// the guards are no longer per-instance.
//
// Semantics are unchanged from the in-memory version, deliberately:
//   • the idempotency key is per user MESSAGE, not per tool call
//   • a collapsed duplicate never consumes quota — it returns at the insert,
//     before the rate limit is ever evaluated (see admit() for the ordering
//     and why it is what it is)
//   • a submission that reached nobody is refunded — it consumes neither quota
//     nor a dedup slot, or the user's retry is answered with "already sent"

import { createHash } from "crypto";

export const RATE_LIMIT_PER_HOUR = 3;
export const HOUR_MS = 60 * 60 * 1000;
export const DAY_MS = 24 * HOUR_MS;
/** Rows older than this are swept; nothing reads them. */
export const RETENTION_MS = 2 * DAY_MS;

/** Normalise then hash. Same normalisation the Map version used. */
export function hashText(text: string): string {
  const norm = text.trim().toLowerCase().replace(/\s+/g, " ");
  return createHash("sha256").update(norm).digest("hex");
}

export interface ThrottleRow {
  id: string;
  userId: string;
  submissionId: string | null;
  textHash: string;
  createdAt: Date;
}

/**
 * The storage port.
 *
 * Deliberately narrow: four operations, no query builder, nothing
 * Prisma-shaped. That is what lets the policy be exercised without a database
 * — and it is also why the Postgres adapter is small enough to read in one
 * sitting.
 */
export interface ThrottleStore {
  /** Accepted submissions for this user at or after `since`. */
  countSince(userId: string, since: Date): Promise<number>;
  /** Has this user sent this exact text at or after `since`? */
  hasText(userId: string, textHash: string, since: Date): Promise<boolean>;
  /**
   * Record an accepted submission.
   *
   * Returns `null` when a row with the same (userId, submissionId) already
   * exists — that is the duplicate collapse, decided by a unique constraint
   * rather than by a read followed by a write, so two lambdas racing the same
   * conversational turn cannot both win.
   */
  insert(row: Omit<ThrottleRow, "id" | "createdAt">): Promise<ThrottleRow | null>;
  /** Undo an insert, after delivery failed. */
  remove(id: string): Promise<void>;
  /** Drop rows older than `cutoff`. Returns how many went. */
  purgeBefore(cutoff: Date): Promise<number>;
}

export type Decision =
  | { kind: "collapsed"; reason: "submissionId" }
  | { kind: "deduped"; reason: "text" }
  | { kind: "rateLimited"; retryAfterMs: number }
  | { kind: "accepted"; rowId: string };

export class FeedbackThrottle {
  constructor(
    private readonly store: ThrottleStore,
    /** Injectable so fixtures can move time without sleeping. */
    private readonly now: () => number = () => Date.now(),
  ) {}

  /**
   * Decide whether this submission may be sent, recording it if so.
   *
   * Order matters and matches the in-memory version it replaces:
   *
   *   1. TEXT DEDUP — before the insert, so the check cannot match the row we
   *      are about to write. The first draft did this after the insert and
   *      every single submission came back "deduped" against itself; the
   *      fixtures caught it immediately, which is the argument for the store
   *      port in the first place.
   *   2. INSERT — the idempotency key is enforced here, by the unique
   *      constraint, not by a preceding read. A read-then-write leaves a
   *      window two concurrent lambdas can both pass; letting the database
   *      decide closes it.
   *   3. RATE LIMIT — after the insert, so it must discount our own new row.
   *      Rejecting rolls that row back: a submission that was refused must not
   *      hold an idempotency key it never used, or the user's retry would be
   *      answered with "already sent".
   *
   * The key is checked before quota in effect, because a collapsed duplicate
   * returns at step 2 and never reaches step 3.
   */
  async admit(args: {
    userId: string;
    text: string;
    submissionId?: string | null;
  }): Promise<Decision> {
    const t = this.now();
    const textHash = hashText(args.text);
    const submissionId = args.submissionId?.trim() || null;

    if (await this.store.hasText(args.userId, textHash, new Date(t - DAY_MS))) {
      return { kind: "deduped", reason: "text" };
    }

    const row = await this.store.insert({ userId: args.userId, submissionId, textHash });
    // Only reachable with a submissionId — a NULL key cannot violate the
    // unique constraint, which is exactly why Postgres allows many of them.
    if (row === null) return { kind: "collapsed", reason: "submissionId" };

    const count = await this.store.countSince(args.userId, new Date(t - HOUR_MS));
    if (count - 1 >= RATE_LIMIT_PER_HOUR) {
      await this.store.remove(row.id);
      return { kind: "rateLimited", retryAfterMs: HOUR_MS };
    }

    return { kind: "accepted", rowId: row.id };
  }

  /**
   * Give back everything this submission consumed, because it reached nobody.
   *
   * Without this the user's retry is answered with "I already sent this one
   * earlier — the team has it", which is the false confirmation twice over.
   */
  async refund(rowId: string): Promise<void> {
    await this.store.remove(rowId);
  }

  /**
   * Drop rows past retention.
   *
   * Nothing reads a row older than the 24h dedup window, so this is pure
   * housekeeping. Called opportunistically from the route rather than on a
   * schedule — there is no cron in this deployment, and a table that only
   * grows is a slow leak.
   */
  async sweep(): Promise<number> {
    return this.store.purgeBefore(new Date(this.now() - RETENTION_MS));
  }
}

/**
 * Shared in-memory store.
 *
 * NOT for production — it has exactly the failure mode this work removes. It
 * exists so fixtures can point two independent FeedbackThrottle instances at
 * ONE store and prove they see each other's writes, which is the property the
 * Maps did not have.
 */
export class InMemoryThrottleStore implements ThrottleStore {
  private rows: ThrottleRow[] = [];
  private seq = 0;
  constructor(private readonly now: () => number = () => Date.now()) {}

  async countSince(userId: string, since: Date): Promise<number> {
    return this.rows.filter((r) => r.userId === userId && r.createdAt >= since).length;
  }
  async hasText(userId: string, textHash: string, since: Date): Promise<boolean> {
    return this.rows.some(
      (r) => r.userId === userId && r.textHash === textHash && r.createdAt >= since,
    );
  }
  async insert(row: Omit<ThrottleRow, "id" | "createdAt">): Promise<ThrottleRow | null> {
    if (
      row.submissionId !== null &&
      this.rows.some((r) => r.userId === row.userId && r.submissionId === row.submissionId)
    ) {
      return null; // stands in for the unique-constraint violation
    }
    const created: ThrottleRow = { ...row, id: `row-${++this.seq}`, createdAt: new Date(this.now()) };
    this.rows.push(created);
    return created;
  }
  async remove(id: string): Promise<void> {
    this.rows = this.rows.filter((r) => r.id !== id);
  }
  async purgeBefore(cutoff: Date): Promise<number> {
    const before = this.rows.length;
    this.rows = this.rows.filter((r) => r.createdAt >= cutoff);
    return before - this.rows.length;
  }
  /** Test helper. */
  get size(): number {
    return this.rows.length;
  }
}
